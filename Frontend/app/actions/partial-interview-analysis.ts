'use server';

import { streamText } from 'ai';

export interface PartialAnalysisInput {
  candidateId: string;
  githubAuditSummary: string;
  interviewTranscript: string;
  existingRedFlags: string[];
}

export interface PartialAnalysisOutput {
  redFlags: string[];
  reasoningSummary: string;
}

function parseRedFlags(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean);
    }
  } catch {
    // Fall through to lightweight line parsing.
  }

  return trimmed
    .split('\n')
    .map((line) => line.replace(/^\s*[-*\d.)]+\s*/, '').trim())
    .filter(Boolean);
}

export async function runPartialInterviewAnalysis(input: PartialAnalysisInput): Promise<PartialAnalysisOutput> {
  const result = streamText({
    model: 'openai:gpt-4o-mini',
    system: [
      'You are an interview risk auditor.',
      'Compare the latest interview transcript against the previous GitHub audit findings.',
      'Return only new or intensified red flags.',
      'Output must be a JSON array of strings and nothing else.',
    ].join(' '),
    prompt: [
      `Candidate: ${input.candidateId}`,
      'GitHub audit summary:',
      input.githubAuditSummary,
      'Previously detected red flags:',
      input.existingRedFlags.join('\n') || 'None',
      'Interview transcript:',
      input.interviewTranscript,
    ].join('\n\n'),
    maxRetries: 1,
  });

  const modelText = await result.text;
  const redFlags = parseRedFlags(modelText);

  return {
    redFlags,
    reasoningSummary: redFlags.length > 0
      ? `Detected ${redFlags.length} potential new red flag(s) from transcript delta.`
      : 'No new red flags detected in this partial analysis window.',
  };
}
