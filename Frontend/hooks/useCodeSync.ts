/**
 * useCodeSync — Real-time code mirroring via BroadcastChannel API.
 * Candidate tab sends; interviewer tab receives.
 */

"use client";

import { useEffect, useCallback, useRef } from "react";
import type { SupportedLanguage } from "@/components/MonacoEditor";

type MessageType = "code-change" | "language-change";

interface SyncMessage {
    type: MessageType;
    payload: string;
    timestamp: number;
}

const CHANNEL_NAME = "code-mirror-channel";

export function useCodeSender() {
    const channelRef = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        channelRef.current = new BroadcastChannel(CHANNEL_NAME);
        return () => { channelRef.current?.close(); };
    }, []);

    const broadcastCode = useCallback((code: string) => {
        channelRef.current?.postMessage({
            type: "code-change",
            payload: code,
            timestamp: Date.now(),
        } satisfies SyncMessage);
    }, []);

    const broadcastLanguage = useCallback((language: string) => {
        channelRef.current?.postMessage({
            type: "language-change",
            payload: language,
            timestamp: Date.now(),
        } satisfies SyncMessage);
    }, []);

    return { broadcastCode, broadcastLanguage };
}

export function useCodeReceiver(callbacks: {
    onCodeChange?: (code: string) => void;
    onLanguageChange?: (language: SupportedLanguage) => void;
}) {
    const callbacksRef = useRef(callbacks);
    callbacksRef.current = callbacks;

    useEffect(() => {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = (event: MessageEvent<SyncMessage>) => {
            const { type, payload } = event.data;
            if (type === "code-change") {
                callbacksRef.current.onCodeChange?.(payload);
            } else if (type === "language-change") {
                callbacksRef.current.onLanguageChange?.(payload as SupportedLanguage);
            }
        };
        return () => channel.close();
    }, []);
}
