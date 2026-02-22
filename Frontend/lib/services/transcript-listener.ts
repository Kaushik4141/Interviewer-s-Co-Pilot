import connectToDatabase from '../db/mongodb';
import InterviewTranscript from '../models/InterviewTranscript';
import { verifyLiveClaim } from './ai-auditor';

export async function startTranscriptListener() {
    console.log('[Transcript Listener] In-memory SQLite mode active. MongoDB Change Streams disabled.');
}
