import { NextRequest, NextResponse } from 'next/server';

import { parseResume } from '../../../lib/services/resume-parser';
import { auditCandidate } from '../../actions/audit-candidate';
import { setLatestCandidateContext } from '../../../lib/state/candidate-context-store';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const resumeFile = formData.get('resume') as File | null;
    const githubUrl = formData.get('githubUrl') as string | null;

    if (!resumeFile) {
      return NextResponse.json({ error: 'Missing resume file' }, { status: 400 });
    }

    if (!githubUrl) {
      return NextResponse.json({ error: 'Missing GitHub URL' }, { status: 400 });
    }

    const buffer = Buffer.from(await resumeFile.arrayBuffer());
    const parsedResume = await parseResume(buffer);

    console.log(`Starting audit for: ${githubUrl}`);
    const result = await auditCandidate(parsedResume, githubUrl);

    setLatestCandidateContext(githubUrl, result);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Audit API Error:', error);
    return NextResponse.json(
      { error: 'Audit failed', details: errorMessage },
      { status: 500 },
    );
  }
}
