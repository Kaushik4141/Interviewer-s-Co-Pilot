import { NextRequest, NextResponse } from 'next/server';

import { parseResume } from '../../../lib/services/resume-parser';
import { auditCandidate } from '../../actions/audit';
import { setLatestCandidateContext } from '../../../lib/state/candidate-context-store';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let resumeFile: File | null = null;
    let githubUrl: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      resumeFile = formData.get('resume') as File | null;
      githubUrl = formData.get('githubUrl') as string | null;
    } else {
      const json = await req.json();
      // If triggered from useChat, it sends { messages: [...] }
      // We will extract data from the last message or body.data
      const lastMessage = json.messages?.[json.messages.length - 1];
      githubUrl = json.data?.githubUrl || "https://github.com/kaushik4141/mock-repo";

      // Mock resume parsing if JSON is used (for Quick Audit drop)
      const mockResume = "Resume Content Mock"; // In real scenario, we'd base64 encode or send file separately
    }

    if (!githubUrl) {
      return NextResponse.json({ error: 'Missing GitHub URL' }, { status: 400 });
    }

    let parsedResume: any;
    if (resumeFile) {
      const buffer = Buffer.from(await resumeFile.arrayBuffer());
      parsedResume = await parseResume(buffer);
    } else {
      // Mock for Quick Audit stream testing
      parsedResume = {
        skills: ["React", "Node.js", "Security Best Practices", "AWS"],
        experience: [],
        education: []
      };
    }

    console.log(`Starting audit for: ${githubUrl}`);
    const result = await auditCandidate(
      parsedResume,
      githubUrl,
      "# Mock Markdown\n\n- React\n- Node.js\n- Insecure API found", // markdown
      "Software Engineer" // job description
    );

    // setLatestCandidateContext(githubUrl, Object.assign({}, parsedResume, { githubUrl }));

    return result; // auditCandidate already returns a Response containing the stream
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Audit API Error:', error);
    return NextResponse.json(
      { error: 'Audit failed', details: errorMessage },
      { status: 500 },
    );
  }
}