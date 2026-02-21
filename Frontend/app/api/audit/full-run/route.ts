import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import { generateObject } from 'ai';
import { z } from 'zod';
import { model } from '@/lib/ai-orchestrator';
import { auditCandidate } from '@/app/actions/audit-candidate';
import { fetchRepoStructure } from '@/lib/services/github-scraper';

const resumeParseSchema = z.object({
    skills: z.array(z.string()).describe("List of technical and soft skills"),
    experience: z.array(z.object({
        role: z.string(),
        company: z.string(),
        duration: z.string().optional(),
        description: z.string().optional()
    })),
    education: z.array(z.object({
        degree: z.string(),
        institution: z.string(),
        year: z.string().optional()
    }))
});

// Helper function for timeouts
const withTimeout = <T>(promise: Promise<T>, timeoutMs = 30000, errorMsg = 'Operation timed out'): Promise<T> => {
    let timeoutHandle: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutHandle));
};

/**
 * SSE helper: sends a named event + JSON data chunk to the stream.
 * Frontend reads these via EventSource or fetch + getReader().
 */
function sseEvent(type: string, data: unknown): string {
    return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
    const formData = await req.formData();
    const resumeFile = formData.get('resume') as File | null;
    const githubUrl = formData.get('githubUrl') as string | null;
    const jobDescription = formData.get('jobDescription') as string | null;

    if (!resumeFile || !githubUrl || !jobDescription) {
        return NextResponse.json(
            { error: 'Missing required fields: resume (File), githubUrl (string), jobDescription (string)' },
            { status: 400 }
        );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (type: string, payload: unknown) => {
                controller.enqueue(encoder.encode(sseEvent(type, payload)));
            };

            try {
                // Step A.1: Extract raw text from uploaded PDF
                send('status', 'Parsing resume PDF...');
                let rawResumeText = '';
                try {
                    const arrayBuffer = await resumeFile.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const pdfData = await withTimeout(pdfParse(buffer), 15000, "PDF Parsing Timed Out");
                    rawResumeText = pdfData.text;
                } catch (err: any) {
                    send('error', 'Could not parse PDF. Please upload a valid resume.');
                    controller.close();
                    return;
                }

                // Step A.2: LLM extraction
                send('status', 'Extracting structured resume data...');
                let resumeContext;
                try {
                    const { object } = await withTimeout(generateObject({
                        model: model,
                        schema: resumeParseSchema,
                        prompt: `Extract structured resume details from the following raw PDF text:\n\n${rawResumeText}`
                    }), 30000, "Resume LLM Extraction Timed Out");
                    resumeContext = object;
                } catch (err: any) {
                    send('error', 'LLM Resume extraction failed.');
                    controller.close();
                    return;
                }

                // Step B: Scrape repo
                send('status', 'Scout is auditing repository structure...');
                let githubMarkdownContent = '';
                try {
                    githubMarkdownContent = await withTimeout(fetchRepoStructure(githubUrl), 30000, "Scraper bridge timed out.");
                } catch (err: any) {
                    githubMarkdownContent = `Technical audit failed: Scraper offline. Proceed with Resume only. Error: ${err.message}`;
                }

                // Step C: Full audit (passes `send` so auditCandidate can emit its own status events)
                let result;
                try {
                    result = await withTimeout(
                        auditCandidate(resumeContext, githubUrl, jobDescription, githubMarkdownContent, send),
                        40000,
                        "Audit Orchestrator Timed Out"
                    );
                } catch (err: any) {
                    send('error', err.message);
                    controller.close();
                    return;
                }

                // Final payload
                send('result', {
                    success: true,
                    data: {
                        actualApproach: result.actualApproach,
                        jdMatchScore: result.jdMatchScore,
                        contradictionScore: result.contradictionScore,
                        savageVerdict: result.savageVerdict,
                        discrepancies: result.discrepancies,
                        interviewQuestions: result.interviewQuestions,
                    }
                });

                send('status', 'Completed');
                controller.close();

            } catch (error: any) {
                send('error', error.message || 'Internal Server Error');
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
