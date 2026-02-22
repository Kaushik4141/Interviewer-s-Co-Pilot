/**
 * data-mapper.ts
 *
 * Transforms raw crawl JSON from github_spider.py into a clean, LLM-friendly
 * context object.  Filters noise (node_modules, lock files, SVGs, etc.),
 * summarises long code files to imports + exported signatures + comments, and
 * extracts the dependency list from package.json.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of the JSON produced by github_spider.py */
export interface RawCrawlData {
    repo: string;
    url: string;
    branch: string;
    directories: Record<string, unknown>;
    key_files: Record<string, { path: string; content: string }>;
    stats?: {
        total_key_files_found: number;
        total_key_files_with_content: number;
        directories_crawled: number;
    };
}

/** Clean context object ready for LLM consumption */
export interface CleanContext {
    /** Flat list of all meaningful file paths */
    fileTree: string[];
    /** Map of file path → summarised code (imports + signatures + comments) */
    coreLogicSnippets: Map<string, string>;
    /** Merged dependency names from package.json (deps + devDeps) */
    dependencies: string[];
}

// ---------------------------------------------------------------------------
// Noise filters
// ---------------------------------------------------------------------------

/** Directories that should be stripped from the file tree entirely */
const NOISE_DIRS = new Set([
    "node_modules",
    ".git",
    ".next",
    ".turbo",
    ".vercel",
    ".cache",
    ".husky",
    "dist",
    "build",
    "out",
    "coverage",
    "__pycache__",
    ".pytest_cache",
    ".vscode",
    ".idea",
]);

/** File extensions that carry no architectural value */
const NOISE_EXTENSIONS = new Set([
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".map",
    ".lock",
    ".log",
    ".tsbuildinfo",
]);

/** Exact filenames to always exclude */
const NOISE_FILES = new Set([
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "bun.lockb",
    ".DS_Store",
    "thumbs.db",
    ".eslintcache",
    ".prettierignore",
    ".gitattributes",
]);

/**
 * Returns `true` if the path should be discarded as noise.
 */
function isNoise(path: string): boolean {
    const lower = path.toLowerCase();
    const segments = lower.split("/");

    // Any segment that matches a noise directory → skip
    if (segments.some((seg) => NOISE_DIRS.has(seg.replace(/\/$/, "")))) {
        return true;
    }

    const basename = segments[segments.length - 1].replace(/\/$/, "");

    // Exact filename match
    if (NOISE_FILES.has(basename)) return true;

    // Extension match
    const dotIdx = basename.lastIndexOf(".");
    if (dotIdx !== -1) {
        const ext = basename.slice(dotIdx);
        if (NOISE_EXTENSIONS.has(ext)) return true;
    }

    return false;
}

// ---------------------------------------------------------------------------
// Code summariser — keeps imports, exports, signatures & comments
// ---------------------------------------------------------------------------

/**
 * Given a full source file as a string, produce a condensed summary that
 * preserves the "shape" of the code:
 *   • import / require statements
 *   • exported function / class / const / type signatures (without body)
 *   • JSDoc / block comments
 *   • single-line comments that look architectural (TODO, FIXME, NOTE, etc.)
 *
 * Implementation bodies are replaced with `// … implementation …`
 */
function summariseCode(content: string, filePath: string): string {
    // For JSON / config files keep as-is (they're already dense)
    if (/\.(json|ya?ml|toml|env)$/i.test(filePath)) {
        return content.slice(0, 2048); // cap size
    }

    const lines = content.split("\n");
    const kept: string[] = [];
    let insideBlockComment = false;
    let braceDepth = 0;
    let skipping = false;

    for (const raw of lines) {
        const line = raw.trimEnd();
        const trimmed = line.trim();

        // ---- block comments ----
        if (insideBlockComment) {
            kept.push(line);
            if (trimmed.includes("*/")) insideBlockComment = false;
            continue;
        }
        if (trimmed.startsWith("/*")) {
            insideBlockComment = !trimmed.includes("*/");
            kept.push(line);
            continue;
        }

        // ---- import / require ----
        if (
            /^import\s/.test(trimmed) ||
            /^from\s/.test(trimmed) ||
            /require\(/.test(trimmed)
        ) {
            kept.push(line);
            continue;
        }

        // ---- export declarations (function, class, const, type, interface) ----
        if (
            /^export\s/.test(trimmed) ||
            /^export\s+default\s/.test(trimmed) ||
            /^module\.exports/.test(trimmed)
        ) {
            kept.push(line);

            // If the line opens a block, skip until the matching close
            if (trimmed.includes("{") && !trimmed.includes("}")) {
                braceDepth = countBraces(trimmed);
                if (braceDepth > 0) {
                    skipping = true;
                    kept.push("  // … implementation …");
                }
            }
            continue;
        }

        // ---- skipping implementation bodies ----
        if (skipping) {
            braceDepth += countBraces(trimmed);
            if (braceDepth <= 0) {
                kept.push(line); // closing brace
                skipping = false;
                braceDepth = 0;
            }
            continue;
        }

        // ---- standalone function / class declarations ----
        if (
            /^(async\s+)?function\s/.test(trimmed) ||
            /^class\s/.test(trimmed) ||
            /^(const|let|var)\s+\w+\s*[:=]\s*(async\s+)?\(/.test(trimmed)
        ) {
            kept.push(line);
            if (trimmed.includes("{") && !trimmed.includes("}")) {
                braceDepth = countBraces(trimmed);
                if (braceDepth > 0) {
                    skipping = true;
                    kept.push("  // … implementation …");
                }
            }
            continue;
        }

        // ---- architectural comments ----
        if (
            /^\/\//.test(trimmed) &&
            /TODO|FIXME|NOTE|HACK|IMPORTANT|@/i.test(trimmed)
        ) {
            kept.push(line);
            continue;
        }

        // ---- decorator lines (@Controller, @Injectable, etc.) ----
        if (/^@\w+/.test(trimmed)) {
            kept.push(line);
            continue;
        }

        // ---- type / interface declarations ----
        if (/^(type|interface)\s/.test(trimmed)) {
            kept.push(line);
            if (trimmed.includes("{") && !trimmed.includes("}")) {
                braceDepth = countBraces(trimmed);
                if (braceDepth > 0) {
                    skipping = true;
                    kept.push("  // … type body …");
                }
            }
            continue;
        }
    }

    const summary = kept.join("\n").trim();
    // Cap at 3 KB per file to stay token-efficient
    return summary.slice(0, 3072);
}

/** Count net brace depth change in a single line. */
function countBraces(line: string): number {
    let depth = 0;
    for (const ch of line) {
        if (ch === "{") depth++;
        if (ch === "}") depth--;
    }
    return depth;
}

// ---------------------------------------------------------------------------
// Directory tree flattener
// ---------------------------------------------------------------------------

/**
 * Recursively flatten the nested directory object from the crawler into a
 * simple string[] of paths, filtering noise along the way.
 */
function flattenTree(
    node: unknown,
    prefix: string = ""
): string[] {
    const paths: string[] = [];

    if (node === null || node === undefined) return paths;

    if (typeof node === "string") {
        // Leaf — it's a file path
        const full = prefix ? `${prefix}/${node}` : node;
        if (!isNoise(full)) paths.push(full);
        return paths;
    }

    if (typeof node === "object" && !Array.isArray(node)) {
        for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
            if (key === "__truncated__") continue;
            const cleanKey = key.replace(/\/$/, "");
            const nextPrefix = prefix ? `${prefix}/${cleanKey}` : cleanKey;

            if (isNoise(nextPrefix)) continue;

            if (
                typeof value === "object" &&
                value !== null &&
                !Array.isArray(value)
            ) {
                // It's a sub-directory
                paths.push(nextPrefix + "/");
                paths.push(...flattenTree(value, nextPrefix));
            } else if (typeof value === "string") {
                if (!isNoise(value)) paths.push(value);
            }
        }
    }

    return paths;
}

// ---------------------------------------------------------------------------
// Dependency extractor
// ---------------------------------------------------------------------------

function extractDependencies(
    keyFiles: Record<string, { path: string; content: string }>
): string[] {
    const deps = new Set<string>();

    for (const [key, file] of Object.entries(keyFiles)) {
        if (!key.toLowerCase().includes("package.json")) continue;
        try {
            const pkg = JSON.parse(file.content);
            if (pkg.dependencies) {
                Object.keys(pkg.dependencies).forEach((d) => deps.add(d));
            }
            if (pkg.devDependencies) {
                Object.keys(pkg.devDependencies).forEach((d) => deps.add(d));
            }
            if (pkg.peerDependencies) {
                Object.keys(pkg.peerDependencies).forEach((d) => deps.add(d));
            }
        } catch {
            // Content might be markdown-wrapped; try to extract JSON substring
            const jsonMatch = file.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const pkg = JSON.parse(jsonMatch[0]);
                    if (pkg.dependencies)
                        Object.keys(pkg.dependencies).forEach((d) => deps.add(d));
                    if (pkg.devDependencies)
                        Object.keys(pkg.devDependencies).forEach((d) => deps.add(d));
                } catch {
                    /* best effort */
                }
            }
        }
    }

    return Array.from(deps).sort();
}

// ---------------------------------------------------------------------------
// Main public API
// ---------------------------------------------------------------------------

/**
 * Transform raw crawl JSON from the Python scraper into a clean, token-
 * efficient context object suitable for LLM agents.
 *
 * @param rawJson - The `RawCrawlData` object (or a JSON string of it)
 * @returns A `CleanContext` ready for agent consumption
 */
export function mapCrawlDataToContext(
    rawJson: RawCrawlData | string
): CleanContext {
    const data: RawCrawlData =
        typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;

    // 1. Flatten & filter the directory tree
    const fileTree = flattenTree(data.directories);

    // 2. Build core logic snippets — summarise each key file
    const coreLogicSnippets = new Map<string, string>();

    if (data.key_files) {
        for (const [key, file] of Object.entries(data.key_files)) {
            if (isNoise(file.path)) continue;
            if (!file.content || file.content.trim().length === 0) continue;

            const summary = summariseCode(file.content, file.path);
            if (summary.length > 0) {
                coreLogicSnippets.set(file.path, summary);
            }
        }
    }

    // 3. Extract dependencies
    const dependencies = extractDependencies(data.key_files ?? {});

    return { fileTree, coreLogicSnippets, dependencies };
}

/**
 * Serialise a CleanContext to a plain JSON-safe object (Maps → objects).
 * Useful for sending over HTTP or storing.
 */
export function serializeContext(
    ctx: CleanContext
): Record<string, unknown> {
    return {
        fileTree: ctx.fileTree,
        coreLogicSnippets: Object.fromEntries(ctx.coreLogicSnippets),
        dependencies: ctx.dependencies,
    };
}
