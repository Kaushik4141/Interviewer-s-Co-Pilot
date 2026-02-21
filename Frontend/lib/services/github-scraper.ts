import { Crawl4AI } from 'crawl4ai';

/**
 * Uses Crawl4AI to fetch a codebase, bypassing basic anti-bot measures using a 'Session'.
 * Crawls the top-level directory and /src or /app folders.
 * Uses MapContentStrategy to extract only relevant code snippets and file structures.
 * 
 * @param githubUrl The URL of the GitHub repository to crawl
 * @returns Clean Markdown string representing the extracted code structures
 */
export async function fetchRepoStructure(githubUrl: string): Promise<string> {
  let crawler;
  
  try {
    // Assuming backend endpoint is configured or local instance is running for Crawl4AI
    // The exact initialization depends on the environment setup for Crawl4AI
    crawler = new Crawl4AI({ baseUrl: process.env.CRAWL4AI_URL || 'http://localhost:11235' });
  } catch (e) {
    console.error('Ensure Crawl4AI is properly configured.', e);
    throw new Error('Failed to initialize Crawl4AI client.');
  }

  // Use a unique session ID to bypass basic anti-bot measures by maintaining cookies/state
  const sessionId = `github_session_${Date.now()}`;

  // Usually, GitHub default branches are 'main' or 'master'
  const urlsToCrawl = [
    githubUrl, // Top-level
    `${githubUrl}/tree/main/src`, // Typical React/Node src directory
    `${githubUrl}/tree/main/app`, // Typical Next.js app directory
    `${githubUrl}/tree/master/src`, // Fallback for master branch
    `${githubUrl}/tree/master/app`, // Fallback for master branch
  ];

  let rawMarkdownOutput = '';

  for (const url of urlsToCrawl) {
    try {
      // Execute the crawl using the specified map content strategy
      const result = await crawler.crawl({
        urls: [url],
        session_id: sessionId,
        // We use MapContentStrategy to target specific code snippets and file tree structures 
        // avoiding heavy assets or irrelevant boilerplate to save on LLM token costs.
        // @ts-expect-error MapContentStrategy isn't in official types but works in backend
        extraction_strategy: {
          type: 'MapContentStrategy',
        },
        response_format: 'markdown'
      });

      const resultData = result?.[0];
      const markdown = resultData?.markdown;
      if (markdown) {
        // markdown can be a string or a MarkdownGenerationResult object based on SDK types
        const text = typeof markdown === 'string' ? markdown : markdown.raw_markdown;
        rawMarkdownOutput += `\n## Scraped from ${url}\n\n${text}\n`;
      }
    } catch (error) {
      // It's expected that not all repositories will have both /src and /app folders
      // or they might use a different default branch name.
      console.warn(`Warning: Could not fetch or extract data from ${url}. It may not exist.`);
    }
  }

  // Clean the output (strip extra whitespace if needed) and return
  return rawMarkdownOutput.trim();
}
