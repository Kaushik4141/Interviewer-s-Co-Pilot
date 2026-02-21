'use server';

import { generateObject } from 'ai';
import { z } from 'zod';
import { model, CandidateContext, getInitialContext } from '../../lib/ai-orchestrator';
import { analyzeCodebase, SCOUT_PROMPT } from '../../lib/tools/github-analyzer';

const auditResponseSchema = z.object({
  discrepancies: z.array(z.string()).describe('List of gaps, lies, or contradictions found.'),
  interviewQuestions: z.array(z.string()).describe('List of 5-7 specific, deep technical questions to pressure-test the candidate on their architecture choices and identified gaps.'),
});

export async function auditCandidate(
  resumeContext: CandidateContext['resume'],
  githubUrl: string
): Promise<CandidateContext & { interviewQuestions: string[] }> {
  
  // 1. Manually run the Sub-Agent Tool since generateObject doesn't support maxSteps
  const toolResult = await analyzeCodebase.execute!({
    repoUrl: githubUrl,
    resumeClaims: resumeContext.skills,
  }, { toolCallId: 'manual', messages: [] }); // Note: second arg varies by version, passing dummy for execute

  const systemPrompt = `
    ${SCOUT_PROMPT}

    You are an expert technical interviewer and Senior Staff Software Engineer. 
    Your goal is to compare the provided Resume with the findings from the Sub-Agent's Codebase Analysis tool.
    
    Instructions:
    1. Identify gaps: If the resume says "Expert" but the code is "Basic", flag it.
    2. Identify contradictions: If the resume claims a skill not found in any project, mark it as a "Validation Required" topic.
    3. Generate 5-7 HIGHLY SPECIFIC, deep technical interview questions based on the "Engineering DNA" and technical stack found in the code.
       - Ask "WHY" they chose specific tools (e.g., "Why did you choose JWT over sessions?", "Why use Docker here?", "What are the trade-offs of using TanStack Query in this specific architecture?").
       - Ask about their state management and architectural patterns (e.g., "I see you used implicit React Context for state instead of Redux. Can you explain the trade-offs you considered?").
       - Do NOT ask generic definition questions. Base every question on their actual codebase implementation.
    
    Return your findings perfectly matching the JSON schema.
    OUTPUT ONLY VALID JSON. Do not include markdown formatting, backticks, or conversational text. Start directly with {
    Example JSON:
    {
      "discrepancies": ["Claimed React Expert but found legacy class components without proper lifecycle unmounting."],
      "interviewQuestions": [
        "Why did you choose to use JWT for authentication in this project, and how do you handle token expiration and refresh securely?",
        "I noticed you are using Docker. Can you walk me through your multi-stage build process and why containerization was necessary here?",
        "You implemented implicit React Context for state management instead of a tool like Zustand or Redux. What trade-offs did you consider in terms of re-renders?",
        "What led to your decision to use TanStack Query for data fetching, and how did you approach cache invalidation?",
        "Can you explain your approach to the separation of concerns between your Node.js backend controllers and data access layers?"
      ]
    }
  `;

  const userPrompt = `
    Candidate Resume:
    ${JSON.stringify(resumeContext, null, 2)}
    
    GitHub Repository URL: ${githubUrl}
    
    Sub-Agent Code Analysis Findings:
    ${JSON.stringify(toolResult, null, 2)}
    
    Please compare the resume with the findings and generate the discrepancies and questions.
  `;

  // 2. Generate structured output
  const { object } = await generateObject({
    model: model,
    system: systemPrompt,
    prompt: userPrompt,
    schema: auditResponseSchema,
  });

  // 3. Construct and return final context
  const context = getInitialContext();
  context.resume = resumeContext;
  
  if (toolResult) {
    context.githubData.push(toolResult as any);
  }

  context.discrepancies = object.discrepancies.length > 0 
    ? object.discrepancies 
    : ['Model analysis complete. No major discrepancies found.'];

  return {
    ...context,
    interviewQuestions: object.interviewQuestions.length > 0 
      ? object.interviewQuestions 
      : ['Could not generate specific questions. Ask the candidate to walk through their codebase.']
  };
}
