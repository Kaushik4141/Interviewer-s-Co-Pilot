import { NextResponse } from 'next/server';
import { z } from 'zod';

import { runPartialInterviewAnalysis } from '@/app/actions/partial-interview-analysis';
import {
  appendTranscriptChunks,
  getInterviewState,
  savePartialAnalysisResult,
  shouldRunPartialAnalysis,
  type InterviewTranscriptChunk,
} from '@/lib/state/interview-state';

const transcriptChunkSchema = z.object({
  speaker: z.string().trim().min(1),
  text: z.string().trim().min(1),
  timestamp: z.string().optional(),
});

const interviewWebhookSchema = z.object({
  candidateId: z.string().trim().min(1),
  chunk: transcriptChunkSchema.optional(),
  chunks: z.array(transcriptChunkSchema).optional(),
  githubAuditSummary: z.string().optional(),
}).superRefine((value, ctx) => {
  if (!value.chunk && (!value.chunks || value.chunks.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Either chunk or chunks must be provided.',
      path: ['chunk'],
    });
  }
});

function toChunks(payload: z.infer<typeof interviewWebhookSchema>): InterviewTranscriptChunk[] {
  if (payload.chunk) {
    return [payload.chunk];
  }
  return payload.chunks ?? [];
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const parsed = interviewWebhookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid InterviewSync payload.', issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const chunks = toChunks(payload);
    const previousState = getInterviewState(payload.candidateId);

    const stateAfterAppend = appendTranscriptChunks(
      payload.candidateId,
      chunks,
      payload.githubAuditSummary,
    );

    let analysisTriggered = false;
    let newlyDetectedRedFlags: string[] = [];
    let finalState = stateAfterAppend;

    if (
      shouldRunPartialAnalysis(stateAfterAppend) &&
      stateAfterAppend.interviewTranscript.trim().length > 0 &&
      stateAfterAppend.githubAuditSummary.trim().length > 0
    ) {
      analysisTriggered = true;

      const analysis = await runPartialInterviewAnalysis({
        candidateId: payload.candidateId,
        githubAuditSummary: stateAfterAppend.githubAuditSummary,
        interviewTranscript: stateAfterAppend.interviewTranscript,
        existingRedFlags: stateAfterAppend.redFlags,
      });

      const previousFlagKeys = new Set(previousState.redFlags.map((flag) => flag.toLowerCase()));
      newlyDetectedRedFlags = analysis.redFlags.filter(
        (flag) => !previousFlagKeys.has(flag.toLowerCase()),
      );

      finalState = savePartialAnalysisResult(
        payload.candidateId,
        analysis.redFlags,
        analysis.reasoningSummary,
      );
    }

    return NextResponse.json({
      ok: true,
      candidateId: payload.candidateId,
      chunksAppended: chunks.length,
      analysisTriggered,
      newRedFlags: newlyDetectedRedFlags,
      redFlags: finalState.redFlags,
      interviewTranscript: finalState.interviewTranscript,
      lastPartialAnalysisAt: finalState.lastPartialAnalysisAt,
      reasoningTrace: finalState.reasoningTrace,
    });
  } catch (error) {
    console.error('Interview webhook failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error while handling InterviewSync webhook.' },
      { status: 500 },
    );
  }
}

