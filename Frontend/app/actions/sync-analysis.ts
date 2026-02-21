'use server';

import { generateObject } from 'ai';
import { z } from 'zod';

import { model } from '../../lib/ai-orchestrator';

const syncAnalysisSchema = z.object({
  alert: z.string().nullable(),
  followUpQuestion: z.string().min(1),
});

export type SyncAnalysisResult = z.infer<typeof syncAnalysisSchema>;

export async function syncAnalysis(
  currentTranscriptSnippet: string,
  githubAuditContext: unknown,
): Promise<SyncAnalysisResult> {
  const { object } = await generateObject({
    model,
    schema: syncAnalysisSchema,
    system:
      'You are a Shadow Interviewer. You have the GitHub Audit. The candidate just said: [Transcript]. If they contradict their code, return a red-flag alert. If they are vague, generate a "Drill-Down" question to trap them in their own logic.',
    prompt: [
      'GitHub Audit Context:',
      JSON.stringify(githubAuditContext, null, 2),
      '',
      'Transcript:',
      currentTranscriptSnippet,
      '',
      'Return JSON with exactly: { alert: string | null, followUpQuestion: string }',
    ].join('\n'),
  });

  return object;
}

