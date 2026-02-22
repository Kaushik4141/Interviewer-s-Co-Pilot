import connectToDatabase from '../db/mongodb';
import InterviewTranscript from '../models/InterviewTranscript';
import { verifyLiveClaim } from './ai-auditor';

export async function startTranscriptListener() {
    try {
        const db = await connectToDatabase();
        console.log('[Transcript Listener] Connected to Database. Starting change stream watch...');

        // Watch the InterviewTranscript collection for changes
        // We only care about new inserts where the candidate is speaking.
        const changeStream = InterviewTranscript.watch([
            {
                $match: {
                    operationType: 'insert',
                    'fullDocument.speaker': 'candidate',
                }
            }
        ]);

        changeStream.on('change', async (change) => {
            if (change.operationType !== 'insert') return;

            const fullDocument = change.fullDocument;
            if (!fullDocument) return;

            console.log(`[Transcript Listener] New candidate text detected: "${fullDocument.text}"`);

            try {
                // Send the new text to Member 1's verifyLiveClaim function
                const aiResult = await verifyLiveClaim(fullDocument.text);

                // If the AI detects a contradiction, update that specific MongoDB document
                if (aiResult.contradiction) {
                    console.log(`[Transcript Listener] Contradiction detected for document ${fullDocument._id}!`);

                    await InterviewTranscript.updateOne(
                        { _id: fullDocument._id },
                        {
                            $set: {
                                'metadata.flagged': true,
                                'metadata.suggestedFollowUp': aiResult.suggestedFollowUp || 'Can you elaborate on your experience with that?',
                            }
                        }
                    );
                    console.log(`[Transcript Listener] Document ${fullDocument._id} successfully updated with flag and follow-up.`);
                }
            } catch (error) {
                console.error('[Transcript Listener] Error processing verifyLiveClaim:', error);
            }
        });

        changeStream.on('error', (error) => {
            console.error('[Transcript Listener] Change Stream Error:', error);
        });

    } catch (err) {
        console.error('[Transcript Listener] Failed to start:', err);
    }
}
