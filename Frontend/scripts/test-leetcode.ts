/**
 * Test script for the LeetCode scraper endpoint.
 *
 * Usage:  npx tsx scripts/test-leetcode.ts [username]
 * Default username: neal_wu
 */

const USERNAME = process.argv[2] || 'neal_wu';
const API_URL = process.env.SCRAPER_URL || 'http://localhost:8000';

async function main() {
    console.log(`\n🧪 LeetCode Scraper Test Suite`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📌 Target: ${API_URL}/leetcode`);
    console.log(`👤 Username: ${USERNAME}\n`);

    let passed = 0;
    let failed = 0;

    function assert(label: string, condition: boolean, detail?: string) {
        if (condition) {
            console.log(`  ✅  ${label}`);
            passed++;
        } else {
            console.log(`  ❌  ${label}${detail ? ` — ${detail}` : ''}`);
            failed++;
        }
    }

    // ── Test 1: Endpoint responds ────────────────────────────────────
    console.log(`\n[Test 1] POST /leetcode with username="${USERNAME}"`);
    let data: any;
    try {
        const res = await fetch(`${API_URL}/leetcode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: USERNAME }),
        });

        assert('Response status is 200', res.status === 200, `got ${res.status}`);
        data = await res.json();
        assert('Response is valid JSON', typeof data === 'object');
    } catch (err: any) {
        console.log(`  ❌  Request failed: ${err.message}`);
        console.log(`\n⚠️  Is the scraper running? Start it with: uvicorn main:app --port 8000`);
        process.exit(1);
    }

    // ── Test 2: Profile fields ───────────────────────────────────────
    console.log(`\n[Test 2] Profile structure`);
    assert('Has "username" field', data.username === USERNAME);
    assert('Has "source" field', ['crawl4ai', 'graphql_fallback'].includes(data.source), `got "${data.source}"`);
    assert('Has "stats" object', typeof data.stats === 'object');
    assert('Has "languages" array', Array.isArray(data.languages));
    assert('Has "recent_solved" array', Array.isArray(data.recent_solved));
    assert('Has "markdown_summary" string', typeof data.markdown_summary === 'string' && data.markdown_summary.length > 0);

    // ── Test 3: Stats shape ──────────────────────────────────────────
    console.log(`\n[Test 3] Stats shape`);
    const { stats } = data;
    assert('stats.easy is a number', typeof stats.easy === 'number');
    assert('stats.medium is a number', typeof stats.medium === 'number');
    assert('stats.hard is a number', typeof stats.hard === 'number');
    assert('stats.total is a number', typeof stats.total === 'number');
    assert('stats.total >= 0', stats.total >= 0, `got ${stats.total}`);
    console.log(`   📊 Easy: ${stats.easy} | Medium: ${stats.medium} | Hard: ${stats.hard} | Total: ${stats.total}`);

    // ── Test 4: Languages ────────────────────────────────────────────
    console.log(`\n[Test 4] Languages`);
    if (data.languages.length > 0) {
        assert('First language has "name"', typeof data.languages[0].name === 'string');
        assert('First language has "count"', typeof data.languages[0].count === 'number');
        console.log(`   🗣️  Top language: ${data.languages[0].name} (${data.languages[0].count} problems)`);
    } else {
        console.log(`   ⚠️  No languages returned (profile may be private)`);
    }

    // ── Test 5: Recent solved ────────────────────────────────────────
    console.log(`\n[Test 5] Recent solved problems`);
    assert('recent_solved has <= 5 entries', data.recent_solved.length <= 5);
    if (data.recent_solved.length > 0) {
        assert('First problem has "title"', typeof data.recent_solved[0].title === 'string');
        assert('First problem has "slug"', typeof data.recent_solved[0].slug === 'string');
        console.log(`   📝 Last solved: "${data.recent_solved[0].title}"`);
    } else {
        console.log(`   ⚠️  No recent solved problems (profile may be private)`);
    }

    // ── Test 6: AI-Generated Similar Problem ────────────────────────
    console.log(`\n[Test 6] AI-Generated Similar Problem`);
    const problem = data.generated_problem;
    assert('Has "generated_problem" object', typeof problem === 'object' && problem !== null);
    if (problem) {
        assert('Problem has "title"', typeof problem.title === 'string' && problem.title.length > 0);
        assert('Problem has "difficulty"', ['Easy', 'Medium', 'Hard'].includes(problem.difficulty));
        assert('Problem has "description"', typeof problem.description === 'string' && problem.description.length > 0);
        assert('Problem has "topicTags" array', Array.isArray(problem.topicTags));
        assert('Problem has "hints" array', Array.isArray(problem.hints));
        assert('Problem has "starterCode"', typeof problem.starterCode === 'object' && problem.starterCode !== null);
        assert('Problem has "_source" field', typeof problem._source === 'string');
        assert('Problem has "_based_on" field', Array.isArray(problem._based_on));

        if (problem.examples && problem.examples.length > 0) {
            assert('First example has "input"', typeof problem.examples[0].input === 'string');
            assert('First example has "output"', typeof problem.examples[0].output === 'string');
        }

        console.log(`   🧩 Title: "${problem.title}"`);
        console.log(`   📈 Difficulty: ${problem.difficulty}`);
        console.log(`   🏷️  Tags: ${problem.topicTags?.join(', ') || 'none'}`);
        console.log(`   💻 Starter: ${problem.starterCode?.language || 'N/A'}`);
        console.log(`   🤖 Source: ${problem._source}`);
        console.log(`   📚 Based on: ${problem._based_on?.join(', ') || 'none'}`);
        console.log(`\n   📝 Description preview:`);
        console.log(`   ${problem.description?.substring(0, 200)}...`);
        if (problem.starterCode?.code) {
            console.log(`\n   💻 Starter code:`);
            console.log(`   ${problem.starterCode.code.split('\n').join('\n   ')}`);
        }
    }

    // ── Test 7: Markdown summary format ──────────────────────────────
    console.log(`\n[Test 7] Markdown summary`);
    const md = data.markdown_summary || '';
    assert('Markdown contains heading', md.includes('# LeetCode Profile'));
    assert('Markdown contains stats table', md.includes('Easy') && md.includes('Medium') && md.includes('Hard'));

    // ── Test 8: Invalid username ─────────────────────────────────────
    console.log(`\n[Test 8] Invalid username handling`);
    try {
        const badRes = await fetch(`${API_URL}/leetcode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'thisuserdoesnotexist_xyz_999' }),
        });
        const badData = await badRes.json();
        assert('Returns 200 even for missing user (graceful)', badRes.status === 200);
        assert('Stats total is 0 for missing user', badData.stats?.total === 0, `got ${badData.stats?.total}`);
    } catch {
        console.log(`   ⚠️  Skipped (request failed)`);
    }

    // ── Summary ──────────────────────────────────────────────────────
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error('❌ Unhandled error:', err);
    process.exit(1);
});
