'use client';

import { useEffect } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createInterviewRoom } from '@/app/actions/create-interview-room';

export default function InterviewerPage() {
  const router = useRouter();
  const [interviewerName, setInterviewerName] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [role, setRole] = useState('');
  const [jdText, setJdText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [meetingId, setMeetingId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const queryCandidateName = query.get('name');
    const queryRole = query.get('role');
    const queryRoom = query.get('room');
    if (queryCandidateName) {
      setCandidateName(queryCandidateName);
    }
    if (queryRole) {
      setRole(queryRole);
    }
    if (queryRoom) {
      setMeetingId(queryRoom);
    }

    try {
      const raw = localStorage.getItem('candidate-session');
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as {
        candidateName?: string;
        targetRole?: string;
      };
      if (parsed.candidateName) {
        setCandidateName(parsed.candidateName);
      }
      if (parsed.targetRole) {
        setRole(parsed.targetRole);
      }
    } catch {
      // ignore storage parse issues
    }
  }, []);

  const handleGenerateMeeting = async (): Promise<void> => {
    if (!jdText.trim()) {
      setError('Upload or paste JD before starting meeting.');
      return;
    }

    setError(null);
    setIsGenerating(true);
    try {
      const { url } = await createInterviewRoom();
      const room = (url || '').trim();
      if (!room) {
        throw new Error('Unable to generate meeting ID.');
      }
      setMeetingId(room);
      localStorage.setItem(
        'interviewer-session',
        JSON.stringify({
          interviewerName: interviewerName || 'Interviewer',
          candidateName: candidateName || 'Candidate',
          role: role || 'Software Engineer',
          jdText,
          room,
          createdAt: Date.now(),
        }),
      );
    } catch (meetingError) {
      const message = meetingError instanceof Error ? meetingError.message : 'Failed to generate meeting ID.';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartInterview = (): void => {
    if (!meetingId) {
      setError('Generate meeting ID first.');
      return;
    }
    const params = new URLSearchParams({
      name: candidateName || 'Candidate',
      role: role || 'Software Engineer',
    });
    router.push(`/interview/${encodeURIComponent(meetingId)}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-3xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Interviewer Login</p>
        <h1 className="text-2xl font-bold mt-2">Prepare Interview Session</h1>
        <p className="text-sm text-zinc-400 mt-1">JD is mandatory before generating meeting ID.</p>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={interviewerName}
            onChange={(e) => setInterviewerName(e.target.value)}
            placeholder="Interviewer name"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <input
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            placeholder="Candidate name"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role (from JD)"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm md:col-span-2"
          />
        </div>

        <div className="mt-4">
          <label className="text-[10px] uppercase tracking-widest text-zinc-400">Job Description</label>
          <input
            type="file"
            accept=".txt,.md,.text"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }
              try {
                const text = await file.text();
                setJdText(text);
              } catch {
                setError('Could not read JD file. Paste JD manually.');
              }
            }}
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-zinc-200"
          />
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={8}
            placeholder="Paste JD here before generating meeting ID..."
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleGenerateMeeting()}
            disabled={isGenerating}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate Meeting ID'}
          </button>
          <button
            type="button"
            onClick={handleStartInterview}
            disabled={!meetingId}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-zinc-950 disabled:opacity-50"
          >
            Start Interview
          </button>
        </div>

        {meetingId && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <p className="text-[10px] uppercase tracking-widest text-emerald-300">Share This ID With Candidate</p>
            <p className="font-mono mt-1 text-white break-all">{meetingId}</p>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
