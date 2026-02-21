export interface InterviewTranscriptChunk {
  speaker: string;
  text: string;
  timestamp?: string;
}

export interface ReasoningTraceEntry {
  at: string;
  stage: 'partial-analysis';
  summary: string;
}

export interface CandidateInterviewState {
  candidateId: string;
  interviewTranscript: string;
  transcriptChunks: InterviewTranscriptChunk[];
  githubAuditSummary: string;
  redFlags: string[];
  reasoningTrace: ReasoningTraceEntry[];
  lastPartialAnalysisAt: string | null;
  updatedAt: string;
}

const PARTIAL_ANALYSIS_INTERVAL_MS = 5 * 60 * 1000;
const interviewStore = new Map<string, CandidateInterviewState>();

function getNowIso(): string {
  return new Date().toISOString();
}

function formatChunk(chunk: InterviewTranscriptChunk): string {
  return `[${chunk.speaker}] ${chunk.text}`;
}

function mergeUniqueFlags(existing: string[], incoming: string[]): string[] {
  const keyToValue = new Map<string, string>();

  for (const flag of [...existing, ...incoming]) {
    const normalized = flag.trim();
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (!keyToValue.has(key)) {
      keyToValue.set(key, normalized);
    }
  }

  return Array.from(keyToValue.values());
}

export function getInterviewState(candidateId: string): CandidateInterviewState {
  const existing = interviewStore.get(candidateId);
  if (existing) {
    return existing;
  }

  const initial: CandidateInterviewState = {
    candidateId,
    interviewTranscript: '',
    transcriptChunks: [],
    githubAuditSummary: '',
    redFlags: [],
    reasoningTrace: [],
    lastPartialAnalysisAt: null,
    updatedAt: getNowIso(),
  };

  interviewStore.set(candidateId, initial);
  return initial;
}

export function appendTranscriptChunks(
  candidateId: string,
  chunks: InterviewTranscriptChunk[],
  githubAuditSummary?: string,
): CandidateInterviewState {
  const state = getInterviewState(candidateId);
  const nowIso = getNowIso();

  if (githubAuditSummary && githubAuditSummary.trim().length > 0) {
    state.githubAuditSummary = githubAuditSummary.trim();
  }

  if (chunks.length === 0) {
    state.updatedAt = nowIso;
    return state;
  }

  const lines = chunks.map(formatChunk).join('\n');
  state.interviewTranscript = state.interviewTranscript
    ? `${state.interviewTranscript}\n${lines}`
    : lines;
  state.transcriptChunks.push(...chunks);
  state.updatedAt = nowIso;

  return state;
}

export function shouldRunPartialAnalysis(state: CandidateInterviewState, nowMs: number = Date.now()): boolean {
  if (!state.lastPartialAnalysisAt) {
    return true;
  }

  const lastMs = Date.parse(state.lastPartialAnalysisAt);
  if (Number.isNaN(lastMs)) {
    return true;
  }

  return nowMs - lastMs >= PARTIAL_ANALYSIS_INTERVAL_MS;
}

export function savePartialAnalysisResult(
  candidateId: string,
  redFlags: string[],
  reasoningSummary: string,
): CandidateInterviewState {
  const state = getInterviewState(candidateId);
  const nowIso = getNowIso();

  state.redFlags = mergeUniqueFlags(state.redFlags, redFlags);
  state.lastPartialAnalysisAt = nowIso;
  state.updatedAt = nowIso;
  state.reasoningTrace.push({
    at: nowIso,
    stage: 'partial-analysis',
    summary: reasoningSummary,
  });

  return state;
}

