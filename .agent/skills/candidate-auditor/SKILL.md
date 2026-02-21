---
name: CandidateAuditor
description: Scans GitHub repos using Crawl4AI and performs a technical audit vs a Resume.
triggers: ["Analyze GitHub", "Check for lies", "Audit candidate"]
---

# Candidate Auditor

This skill provides the ability to automatically audit a candidate's technical skills by scraping their GitHub repositories and comparing the implementation details against their resume claims.

## Capabilities

- **Automated Scraping**: Uses Crawl4AI to navigate and extract meaningful code structures from GitHub repositories.
- **Architectural Analysis**: Identifies tech stacks, design patterns, and complexity scores using the `analyzeCodebase` tool.
- **Resume Verification**: Identifies discrepancies between resume claims and actual project implementations.
- **Smart Interviewing**: Generates targeted technical questions to probe areas of potential weakness or contradiction.

## Related Files

- Service: [github-scraper.ts](file:///c:/Users/kaush/OneDrive/Documents/GitHub/Interviewer-s-Co-Pilot/Frontend/lib/services/github-scraper.ts)
- Tool: [github-analyzer.ts](file:///c:/Users/kaush/OneDrive/Documents/GitHub/Interviewer-s-Co-Pilot/Frontend/lib/tools/github-analyzer.ts)
- Action: [audit-candidate.ts](file:///c:/Users/kaush/OneDrive/Documents/GitHub/Interviewer-s-Co-Pilot/Frontend/app/actions/audit-candidate.ts)
