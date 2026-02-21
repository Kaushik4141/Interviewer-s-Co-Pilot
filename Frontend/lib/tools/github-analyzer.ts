import { tool } from 'ai';
import { z } from 'zod';

export const SCOUT_PROMPT = `You are a Senior Architect Reviewer.
Focus on evaluating the codebase for true modularity, security, and robust architectural design patterns rather than relying on simple keyword matching.
Validate the structural integrity and technical depth of the candidate's code.`;

export const analyzeCodebase = tool({
  description: 'Analyze a codebase from a GitHub repository to extract architectural patterns, tech stack, and complexity score.',
  parameters: z.object({
    repoUrl: z.string().describe('The URL of the GitHub repository.'),
    markdownContent: z.string().describe('The repository content in markdown format, typically obtained from Crawl4AI.'),
  }),
  execute: async ({ repoUrl, markdownContent }) => {
    const techStack: string[] = [];
    const notablePatterns: string[] = [];
    let complexityScore = 0;
    let architectureStyle = 'Monolith';

    const content = markdownContent.toLowerCase();

    // Parse for Authentication (JWT/OAuth)
    if (content.includes('jwt')) {
      notablePatterns.push('Authentication (JWT)');
      techStack.push('JWT');
      complexityScore += 2;
    } else if (content.includes('oauth')) {
      notablePatterns.push('Authentication (OAuth)');
      techStack.push('OAuth');
      complexityScore += 3;
    } else if (content.includes('authentication') || content.includes('auth')) {
      notablePatterns.push('Authentication');
      complexityScore += 1;
    }

    // Parse for State Management (Zustand/Redux)
    if (content.includes('zustand') || content.includes('redux') || content.includes('state management')) {
      notablePatterns.push('State Management');
      if (content.includes('zustand')) techStack.push('Zustand');
      if (content.includes('redux')) techStack.push('Redux');
      complexityScore += 2;
    }

    // Parse for Database interactions
    if (content.includes('database') || content.includes('sql') || content.includes('prisma') || content.includes('mongoose') || content.includes('orm')) {
      notablePatterns.push('Database Interactions');
      if (content.includes('prisma')) techStack.push('Prisma');
      if (content.includes('mongoose')) techStack.push('Mongoose');
      if (content.includes('postgres') || content.includes('postgresql')) techStack.push('PostgreSQL');
      if (content.includes('mongo') || content.includes('mongodb')) techStack.push('MongoDB');
      complexityScore += 2;
    }

    // Add score based on codebase size approximation
    complexityScore += Math.floor(markdownContent.length / 5000);
    
    // Normalize complexity score to be out of 10 maximum limit
    complexityScore = Math.min(10, Math.max(1, complexityScore));

    // Guess architecture style based on found patterns
    if (notablePatterns.length >= 3 && complexityScore >= 6) {
      architectureStyle = 'Microservices / Modular Monolith';
    } else {
      architectureStyle = 'Standard Monolith';
    }

    return {
      techStack,
      architectureStyle,
      complexityScore,
      notablePatterns
    };
  },
});
