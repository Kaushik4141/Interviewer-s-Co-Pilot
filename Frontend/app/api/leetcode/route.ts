import { NextResponse } from 'next/server';

/**
 * POST /api/leetcode
 *
 * Proxies to the Python scraper's /leetcode endpoint.
 * Accepts { username: string } and returns the full profile + generated problem.
 */
export async function POST(req: Request) {
    try {
        const { username } = await req.json();

        if (!username) {
            return NextResponse.json(
                { error: 'Missing required field: username' },
                { status: 400 }
            );
        }

        const scraperUrl = process.env.SCRAPER_URL || 'http://localhost:8000';

        const response = await fetch(`${scraperUrl}/leetcode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username }),
        });

        if (!response.ok) {
            const detail = await response.text();
            return NextResponse.json(
                { error: 'Scraper returned an error', detail },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('[/api/leetcode] Error:', error.message);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
