'use client';

import { useRouter } from "next/navigation";
import Lobby from "@/components/Lobby";

export default function Home() {
  const router = useRouter();

  const handleStartSession = (candidateName: string, role: string, meetingId: string) => {
    const params = new URLSearchParams({ name: candidateName, role, room: meetingId });
    router.push(`/interviewer?${params.toString()}`);
  };

  const handleJoinSession = (code: string) => {
    router.push(`/candidate?room=${encodeURIComponent(code)}`);
  };

  return (
    <div className="w-full h-screen">
      <Lobby
        onStartSession={handleStartSession}
        onJoinSession={handleJoinSession}
      />
    </div>
  );
}
