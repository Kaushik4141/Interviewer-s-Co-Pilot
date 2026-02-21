"""
GitHub Spider — Deep-crawl a GitHub repository and produce an Architectural Blueprint.

Uses Crawl4AI's AsyncWebCrawler with JsonCssExtractionStrategy to extract
folder structures, file names, and the content of key files.

Usage:
    python github_spider.py <repo_url>

Example:
    python github_spider.py https://github.com/vercel/next.js
"""

import asyncio
import json
import re
import sys
from typing import Any
from urllib.parse import urljoin

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from crawl4ai.extraction_strategy import JsonCssExtractionStrategy

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Directories we want to deep-crawl for architectural insight
TARGET_DIRS = {"src", "app", "lib"}

# Files always worth capturing regardless of directory
KEY_FILES = {"package.json", "readme.md", "tsconfig.json", "next.config.js",
             "next.config.ts", "next.config.mjs", ".env.example",
             "docker-compose.yml", "dockerfile"}

# Filename keywords that signal architectural importance
KEY_KEYWORDS = {"auth", "middleware", "controller", "route", "service",
                "provider", "guard", "interceptor", "module", "config"}

# Maximum recursion depth for directory traversal
MAX_DEPTH = 6

# Maximum concurrent crawl tasks
CONCURRENCY_LIMIT = 5

# ---------------------------------------------------------------------------
# Extraction schemas (JsonCssExtractionStrategy)
# ---------------------------------------------------------------------------

FILE_TREE_SCHEMA = {
    "name": "github_file_tree",
    "baseSelector": "table[aria-labelledby] tbody tr.react-directory-row",
    "fields": [
        {
            "name": "item_type",
            "selector": "svg.icon-directory, svg.octicon-file-directory-fill",
            "type": "attribute",
            "attribute": "aria-label",
            "default": "file",
        },
        {
            "name": "name",
            "selector": "td.react-directory-row-name-cell-large-screen a, "
                        "td.react-directory-row-name-cell-large-screen .Link--primary",
            "type": "text",
        },
        {
            "name": "link",
            "selector": "td.react-directory-row-name-cell-large-screen a, "
                        "td.react-directory-row-name-cell-large-screen .Link--primary",
            "type": "attribute",
            "attribute": "href",
            "default": "",
        },
    ],
}

# Fallback schema for when GitHub uses a different markup variant
FILE_TREE_SCHEMA_ALT = {
    "name": "github_file_tree_alt",
    "baseSelector": "div[role='grid'] div[role='row'].Box-row",
    "fields": [
        {
            "name": "item_type",
            "selector": "svg.octicon-file-directory-fill, svg.octicon-file-directory-open-fill",
            "type": "attribute",
            "attribute": "aria-label",
            "default": "file",
        },
        {
            "name": "name",
            "selector": "a.Link--primary, a.js-navigation-open",
            "type": "text",
        },
        {
            "name": "link",
            "selector": "a.Link--primary, a.js-navigation-open",
            "type": "attribute",
            "attribute": "href",
            "default": "",
        },
    ],
}

RAW_CONTENT_SCHEMA = {
    "name": "raw_file_content",
    "baseSelector": "table.highlight tbody, div[data-paste-markdown-skip], "
                    "section[data-targets] div[itemprop='text'], pre",
    "fields": [
        {
            "name": "content",
            "selector": "*",
            "type": "text",
        },
    ],
}


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _normalise_repo_url(url: str) -> str:
    """Ensure the URL points to a GitHub repo root (no trailing slash)."""
    url = url.strip().rstrip("/")
    # Remove /tree/main etc. if someone pastes a branch URL
    url = re.sub(r"/tree/[^/]+.*$", "", url)
    return url


def _is_key_file(filename: str) -> bool:
    """Check whether *filename* is architecturally important."""
    lower = filename.lower()
    if lower in KEY_FILES:
        return True
    return any(kw in lower for kw in KEY_KEYWORDS)


def _raw_url(repo_url: str, branch: str, filepath: str) -> str:
    """Build a raw.githubusercontent.com URL for direct file content."""
    # repo_url: https://github.com/owner/repo
    parts = repo_url.rstrip("/").split("/")
    owner, repo = parts[-2], parts[-1]
    return f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{filepath}"


def _resolve_link(base_url: str, href: str) -> str:
    """Resolve a possibly-relative GitHub href into an absolute URL."""
    if href.startswith("http"):
        return href
    return urljoin("https://github.com/", href.lstrip("/"))


# ---------------------------------------------------------------------------
# Core crawler class
# ---------------------------------------------------------------------------

class GitHubSpider:
    """Async spider that deep-crawls a GitHub repository."""

    def __init__(self, repo_url: str, branch: str = "main"):
        self.repo_url = _normalise_repo_url(repo_url)
        self.branch = branch
        self._semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)

        # Result accumulators
        self.directory_tree: dict[str, Any] = {}
        self.key_files: dict[str, dict[str, str]] = {}
        self._visited: set[str] = set()

    # ----- browser & run configs -----

    @staticmethod
    def _browser_config() -> BrowserConfig:
        return BrowserConfig(
            headless=True,
            text_mode=True,
            viewport_width=1280,
            viewport_height=900,
        )

    @staticmethod
    def _run_config(strategy: JsonCssExtractionStrategy | None = None) -> CrawlerRunConfig:
        cfg = CrawlerRunConfig(
            cache_mode=CacheMode.ENABLED,
            wait_until="networkidle",
            page_timeout=30000,
            exclude_external_links=True,
            excluded_tags=["script", "style", "footer", "nav"],
        )
        if strategy:
            cfg.extraction_strategy = strategy
        return cfg

    # ----- directory listing extraction -----

    async def _extract_listing(
        self, crawler: AsyncWebCrawler, url: str
    ) -> list[dict]:
        """Crawl a GitHub directory URL and return a list of entries."""
        if url in self._visited:
            return []
        self._visited.add(url)

        strategy = JsonCssExtractionStrategy(FILE_TREE_SCHEMA)
        cfg = self._run_config(strategy)
        cfg.wait_for = "css:table[aria-labelledby], css:div[role='grid']"

        async with self._semaphore:
            result = await crawler.arun(url=url, config=cfg)

        entries: list[dict] = []
        if result.success and result.extracted_content:
            try:
                data = json.loads(result.extracted_content)
                if isinstance(data, list) and len(data) > 0:
                    entries = data if isinstance(data[0], dict) else data[0] if isinstance(data[0], list) else []
            except (json.JSONDecodeError, IndexError, TypeError):
                pass

        # Fallback: try alternate schema
        if not entries:
            strategy_alt = JsonCssExtractionStrategy(FILE_TREE_SCHEMA_ALT)
            cfg_alt = self._run_config(strategy_alt)
            async with self._semaphore:
                result_alt = await crawler.arun(url=url, config=cfg_alt)
            if result_alt.success and result_alt.extracted_content:
                try:
                    data = json.loads(result_alt.extracted_content)
                    if isinstance(data, list) and len(data) > 0:
                        entries = data if isinstance(data[0], dict) else data[0] if isinstance(data[0], list) else []
                except (json.JSONDecodeError, IndexError, TypeError):
                    pass

        # Ultimate fallback: parse markdown output for file names
        if not entries and result.success and result.markdown:
            entries = self._parse_markdown_listing(result.markdown, url)

        return entries

    def _parse_markdown_listing(self, md: str, base_url: str) -> list[dict]:
        """Best-effort extraction from crawler markdown when CSS extraction fails."""
        entries = []
        # Look for markdown links that look like file/folder entries
        for match in re.finditer(r'\[([^\]]+)\]\(([^)]+)\)', md):
            name, href = match.group(1).strip(), match.group(2).strip()
            if not name or name.startswith("#") or "github.com" not in href and not href.startswith("/"):
                continue
            is_dir = "/tree/" in href
            entries.append({
                "name": name,
                "link": href,
                "item_type": "Directory" if is_dir else "file",
            })
        return entries

    # ----- recursive directory walk -----

    async def _walk_directory(
        self,
        crawler: AsyncWebCrawler,
        url: str,
        path_prefix: str,
        depth: int = 0,
    ) -> dict:
        """Recursively walk a directory and return a nested tree + collect key files."""
        if depth > MAX_DEPTH:
            return {"__truncated__": True}

        entries = await self._extract_listing(crawler, url)
        tree: dict[str, Any] = {}

        tasks = []
        for entry in entries:
            name = entry.get("name", "").strip()
            link = entry.get("link", "")
            item_type = entry.get("item_type", "file")

            if not name or not link:
                continue

            abs_link = _resolve_link(self.repo_url, link)
            full_path = f"{path_prefix}/{name}".lstrip("/")
            is_directory = (
                "directory" in str(item_type).lower()
                or "/tree/" in link
            )

            if is_directory:
                tree[name + "/"] = {}  # placeholder
                tasks.append((name, abs_link, full_path, depth))
            else:
                tree[name] = full_path
                if _is_key_file(name):
                    self.key_files[full_path] = {
                        "path": full_path,
                        "content": "",  # filled later
                    }

        # Recurse into subdirectories concurrently
        if tasks:
            sub_results = await asyncio.gather(
                *(
                    self._walk_directory(crawler, lnk, fp, depth + 1)
                    for _, lnk, fp, _ in tasks
                ),
                return_exceptions=True,
            )
            for (name, *_), sub in zip(tasks, sub_results):
                if isinstance(sub, dict):
                    tree[name + "/"] = sub

        return tree

    # ----- raw file content fetching -----

    async def _fetch_file_content(
        self, crawler: AsyncWebCrawler, filepath: str
    ) -> str:
        """Fetch raw file content from raw.githubusercontent.com."""
        raw = _raw_url(self.repo_url, self.branch, filepath)
        cfg = self._run_config()
        async with self._semaphore:
            result = await crawler.arun(url=raw, config=cfg)

        if result.success:
            # Raw pages are plain text; markdown output is usually clean
            content = result.markdown or result.cleaned_html or ""
            # Trim to reasonable size (first 8 KB)
            return content[:8192]
        return ""

    # ----- main orchestration -----

    async def crawl(self) -> dict:
        """Execute the full crawl and return the architectural blueprint."""
        print(f"[spider] Starting crawl of {self.repo_url}", file=sys.stderr)

        async with AsyncWebCrawler(config=self._browser_config()) as crawler:
            # Phase 1 — root listing
            print("[spider] Phase 1: Extracting root file tree …", file=sys.stderr)
            root_entries = await self._extract_listing(
                crawler, f"{self.repo_url}/tree/{self.branch}"
            )

            # Identify target directories & root-level key files
            target_dirs_found: list[tuple[str, str]] = []
            root_tree: dict[str, Any] = {}

            for entry in root_entries:
                name = entry.get("name", "").strip()
                link = entry.get("link", "")
                item_type = entry.get("item_type", "file")
                is_dir = "directory" in str(item_type).lower() or "/tree/" in link

                if not name:
                    continue

                if is_dir:
                    root_tree[name + "/"] = {}
                    if name.lower() in TARGET_DIRS:
                        abs_link = _resolve_link(self.repo_url, link)
                        target_dirs_found.append((name, abs_link))
                else:
                    root_tree[name] = name
                    if _is_key_file(name):
                        self.key_files[name] = {"path": name, "content": ""}

            self.directory_tree["root"] = root_tree

            # Phase 2 — deep-crawl target directories
            if target_dirs_found:
                print(
                    f"[spider] Phase 2: Deep-crawling {[n for n, _ in target_dirs_found]} …",
                    file=sys.stderr,
                )
                dir_results = await asyncio.gather(
                    *(
                        self._walk_directory(crawler, link, name, depth=1)
                        for name, link in target_dirs_found
                    ),
                    return_exceptions=True,
                )
                for (name, _), sub in zip(target_dirs_found, dir_results):
                    if isinstance(sub, dict):
                        self.directory_tree[name] = sub
            else:
                print("[spider] Phase 2: No target dirs (src/app/lib) found, "
                      "crawling all top-level dirs …", file=sys.stderr)
                # Fallback: crawl every top-level directory (shallow)
                all_dirs = [
                    (entry.get("name", "").strip(),
                     _resolve_link(self.repo_url, entry.get("link", "")))
                    for entry in root_entries
                    if "directory" in str(entry.get("item_type", "")).lower()
                    or "/tree/" in entry.get("link", "")
                ]
                dir_results = await asyncio.gather(
                    *(
                        self._walk_directory(crawler, lnk, nm, depth=1)
                        for nm, lnk in all_dirs[:10]  # cap to avoid huge crawls
                    ),
                    return_exceptions=True,
                )
                for (nm, _), sub in zip(all_dirs[:10], dir_results):
                    if isinstance(sub, dict):
                        self.directory_tree[nm] = sub

            # Phase 3 — fetch content of key files
            if self.key_files:
                print(
                    f"[spider] Phase 3: Fetching {len(self.key_files)} key file(s) …",
                    file=sys.stderr,
                )
                paths = list(self.key_files.keys())
                contents = await asyncio.gather(
                    *(self._fetch_file_content(crawler, p) for p in paths),
                    return_exceptions=True,
                )
                for path, content in zip(paths, contents):
                    if isinstance(content, str):
                        self.key_files[path]["content"] = content

        return self._build_blueprint()

    # ----- output formatting -----

    def _build_blueprint(self) -> dict:
        """Assemble the final Architectural Blueprint JSON."""
        parts = self.repo_url.rstrip("/").split("/")
        owner_repo = f"{parts[-2]}/{parts[-1]}" if len(parts) >= 2 else self.repo_url

        blueprint: dict[str, Any] = {
            "repo": owner_repo,
            "url": self.repo_url,
            "branch": self.branch,
            "directories": self.directory_tree,
            "key_files": {
                path: {
                    "path": info["path"],
                    "content": info["content"][:4096],  # keep payload tight
                }
                for path, info in self.key_files.items()
                if info.get("content")
            },
            "stats": {
                "total_key_files_found": len(self.key_files),
                "total_key_files_with_content": sum(
                    1 for v in self.key_files.values() if v.get("content")
                ),
                "directories_crawled": len(self._visited),
            },
        }
        return blueprint


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def crawl_github_repo(repo_url: str, branch: str = "main") -> dict:
    """
    Deep-crawl a GitHub repository and return an Architectural Blueprint.

    Args:
        repo_url: Full GitHub URL (e.g. "https://github.com/vercel/next.js").
        branch:   Branch to crawl (default "main").

    Returns:
        A dict containing repo metadata, directory tree, and key file contents.
    """
    spider = GitHubSpider(repo_url, branch=branch)
    return await spider.crawl()


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python github_spider.py <repo_url> [branch]", file=sys.stderr)
        sys.exit(1)

    repo_url = sys.argv[1]
    branch = sys.argv[2] if len(sys.argv) > 2 else "main"

    blueprint = asyncio.run(crawl_github_repo(repo_url, branch))

    # Output minified JSON to stdout
    print(json.dumps(blueprint, separators=(",", ":"), ensure_ascii=False))


if __name__ == "__main__":
    main()
