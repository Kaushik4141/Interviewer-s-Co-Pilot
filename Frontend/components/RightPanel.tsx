/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import VideoStack from "./VideoStack";
import type { ConnectionState } from "@/hooks/useWebRTC";

interface RightPanelProps {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  connectionState: ConnectionState;
  isCameraOn: boolean;
  candidateName: string;
}

export default function RightPanel({
  localVideoRef,
  remoteVideoRef,
  connectionState,
  isCameraOn,
  candidateName,
}: RightPanelProps) {
  return (
    <aside className="h-full">
      <VideoStack
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        connectionState={connectionState}
        isCameraOn={isCameraOn}
        candidateName={candidateName}
      />
    </aside>
  );
}