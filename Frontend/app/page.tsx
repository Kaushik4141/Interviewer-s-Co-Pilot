'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Lobby from "@/components/Lobby";
import LandingPage from "@/components/LandingPage";

export default function Home() {
  const router = useRouter();
  const [showLobby, setShowLobby] = useState(false);

  const handleStartSession = (candidateName: string, role: string, meetingId: string) => {
    const params = new URLSearchParams({ name: candidateName, role, room: meetingId });
    router.push(`/interviewer?${params.toString()}`);
  };

  const handleJoinSession = (code: string) => {
    router.push(`/candidate?room=${encodeURIComponent(code)}`);
  };

  if (!showLobby) {
    return <LandingPage onEnter={() => setShowLobby(true)} />;
  }

  return (
    <div className="w-full h-screen">
      <Lobby
        onStartSession={handleStartSession}
        onJoinSession={handleJoinSession}
      />
    </div>
  );
}
