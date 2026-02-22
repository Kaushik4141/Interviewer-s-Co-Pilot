import { generateObject } from 'ai';
import { z } from 'zod';
import { model } from '../ai-orchestrator';
import type { FullCandidateContext } from './consensus-judge';

export const behavioralCloserSchema = z.object({
    behavioralQuestion: z.string().describe('The high-impact situational question seeded with real code gaps.'),
    whatToWatchFor: z.string().describe('A "Cheat Sheet" for the interviewer to judge the response (defensiveness vs honesty).'),
    theme: z.enum(['The Conflict', 'The Failure', 'The Growth']).describe('The thematic pivot chosen for this question.'),
});

export type BehavioralCloser = z.infer<typeof behavioralCloserSchema>;

export async function generateBehavioralCloser(
    context: FullCandidateContext,
): Promise<BehavioralCloser> {
    const { object } = await generateObject({
        model: model,
        schema: behavioralCloserSchema,
        system: `
      You are an expert Executive Recruiter and Psychoanalyst. Your goal is to generate a single, high-impact situational question for the final 10 minutes of a technical interview.
      
      PURPOSE:
      Instead of asking about code, pivot to Accountability, Logic, and Grit.
      
      INPUT ANALYSIS (Forensic Audit Data):
      - Look at 'discrepancies' and 'actualApproach' found in the earlier audit.
      - Identify a specific Gap (X), a trade-off/decision (Y), or a Skill Inflation (Z).
      
      STRICT THEMATIC TEMPLATES (Choose ONE at random):
      1. THE CONFLICT:
         - Blueprint: "I noticed [Gap X] in your repo. If a Senior Dev told you this was a production-blocker, but you disagreed, how would you handle that conversation?"
      2. THE FAILURE:
         - Blueprint: "Your implementation of [Feature Y] suggests a trade-off in security/speed. Tell me about a time a trade-off you made backfired, and how you owned the mistake."
      3. THE GROWTH:
         - Blueprint: "You claim [Skill Z] on your resume, but your repo uses a different pattern. If we hired you today and asked you to switch to [Skill Z] immediately, what is the first thing you would admit you need to learn?"
      
      OUTPUT REQUIREMENTS:
      - 'behavioralQuestion': Must be customized using the specific technical evidence from the audit.
      - 'whatToWatchFor': A "Cheat Sheet" for the interviewer. What indicates a 'Hire' vs 'Reject' response? (e.g., admitting fault vs deflection).
    `,
        prompt: [
            'Generate a behavioral closer based on this forensic context:',
            JSON.stringify({
                discrepancies: (context as any).discrepancies || [],
                actualApproach: (context as any).actualApproach || [],
                resumeSkills: context.resume?.skills || [],
                redFlags: context.redFlags || [],
            }, null, 2),
        ].join('\n'),
    });

    return object;
}
