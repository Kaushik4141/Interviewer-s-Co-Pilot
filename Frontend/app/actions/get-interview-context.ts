'use server';

import type { CandidateContext } from '../../lib/ai-orchestrator';
import { getInitialContext } from '../../lib/ai-orchestrator';
import { getLatestCandidateContext } from '../../lib/state/candidate-context-store';

export interface InterviewPrimeContext {
  githubUrl: string | null;
  candidateContext: CandidateContext;
  githubFindings: CandidateContext['githubData'];
  resumeGaps: string[];
  updatedAt: number | null;
}

export async function getInterviewContext(): Promise<InterviewPrimeContext> {
  const latest = getLatestCandidateContext();

  if (!latest) {
    const empty = getInitialContext();
    return {
      githubUrl: null,
      candidateContext: empty,
      githubFindings: empty.githubData,
      resumeGaps: empty.discrepancies,
      updatedAt: null,
    };
  }

  return {
    githubUrl: latest.githubUrl,
    candidateContext: latest.context,
    githubFindings: latest.context.githubData,
    resumeGaps: latest.context.discrepancies,
    updatedAt: latest.updatedAt,
  };
}

