/**
 * LeetCode service — fetches a candidate's profile + generated problem
 * from the Python scraper via /api/leetcode.
 */

export interface LeetCodeStats {
    easy: number;
    medium: number;
    hard: number;
    total: number;
}

export interface LeetCodeLanguage {
    name: string;
    count: number;
}

export interface LeetCodeProblem {
    titleSlug: string;
    content: string;
    topicTags: string[];
    hints: string[];
    sampleTestCase: string;
    codeSnippets: Array<{
        lang: string;
        langSlug: string;
        code: string;
    }>;
}

export interface LeetCodeProfile {
    username: string;
    source: 'crawl4ai' | 'graphql_fallback';
    stats: LeetCodeStats;
    languages: LeetCodeLanguage[];
    recent_solved: Array<{ title: string; slug: string }>;
    markdown_summary: string;
    generated_problem: LeetCodeProblem;
}

/**
 * Fetch a candidate's LeetCode profile + a generated coding problem.
 */
export async function fetchLeetCodeProfile(username: string): Promise<LeetCodeProfile> {
    const res = await fetch('/api/leetcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `Failed to fetch LeetCode profile (${res.status})`);
    }

    return res.json();
}
