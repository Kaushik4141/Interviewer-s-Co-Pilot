"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import {
    Shield,
    Users,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Upload,
    FileText,
    Activity,
    TrendingUp,
    Zap,
    BarChart3,
    Eye,
    Fingerprint,
    Skull,
} from "lucide-react";
import Link from "next/link";

/* ================================================================== */
/*  INITIAL DATA & TYPES                                               */
/* ================================================================== */

type VerdictType = "pass" | "fail" | "pending";

const INITIAL_PIPELINE_STATS = [
    { label: "Total Audits", value: 284, suffix: "", icon: <Users className="w-4 h-4" /> },
    { label: "Integrity Rate", value: 100, suffix: "%", icon: <Shield className="w-4 h-4" /> }, // Starts at 100%
    { label: "Time Saved", value: 142, suffix: "hrs", icon: <Clock className="w-4 h-4" /> },
];

const RECENT_AUDITS = [
    { name: "Sarah Chen", role: "Sr. Frontend Engineer", dnaMatch: 94, verdict: "pass" as VerdictType },
    { name: "Javier Morales", role: "Backend Developer", dnaMatch: 87, verdict: "pass" as VerdictType },
    { name: "Priya Sharma", role: "Full-Stack Engineer", dnaMatch: 42, verdict: "fail" as VerdictType },
];

const INITIAL_RADAR_DATA = [
    { axis: "Frontend", value: 0 },
    { axis: "Backend", value: 0 },
    { axis: "DevOps", value: 0 },
    { axis: "Security", value: 0 },
    { axis: "Testing", value: 0 },
    { axis: "Architecture", value: 0 },
];

// Helper to calculate time ago
function timeAgo(date: Date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
}

type Contradiction = { id: number; text: string; severity: "high" | "medium" | "low"; time: string; timestamp: Date };

/* ================================================================== */
/*  UTILITY: Count-Up Hook                                             */
/* ================================================================== */

function useCountUp(target: number, duration: number = 2) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const obj = { val: 0 };
        gsap.to(obj, {
            val: target,
            duration,
            ease: "power2.out",
            onUpdate: () => setCount(Math.round(obj.val)),
        });
    }, [target, duration]);

    return { count, ref };
}

/* ================================================================== */
/*  UTILITY: 3D Tilt Effect                                            */
/* ================================================================== */

function useTilt() {
    const ref = useRef<HTMLDivElement>(null);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(el, {
            rotateY: x * 8,
            rotateX: -y * 8,
            duration: 0.3,
            ease: "power2.out",
            transformPerspective: 1000,
        });
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (ref.current) {
            gsap.to(ref.current, {
                rotateX: 0,
                rotateY: 0,
                duration: 0.5,
                ease: "power3.out",
            });
        }
    }, []);

    return { ref, handleMouseMove, handleMouseLeave };
}

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export default function RecruitmentControlCenter() {
    const gridRef = useRef<HTMLDivElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [radarData, setRadarData] = useState(INITIAL_RADAR_DATA);
    const [contradictions, setContradictions] = useState<Contradiction[]>([]);
    const [integrityRate, setIntegrityRate] = useState(100);
    const [recentAudits, setRecentAudits] = useState(RECENT_AUDITS);
    const [sessionData, setSessionData] = useState<{ name: string, role: string } | null>(null);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('interviewer-session');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed) {
                    const cName = parsed.candidateName || "Candidate";
                    const cRole = parsed.role || "Pending Role";
                    setSessionData({ name: cName, role: cRole });

                    // Prepend it to the dashboard table immediately
                    setRecentAudits(prev => {
                        // Prevent duplicates if component remounts
                        if (prev.some(a => a.name === cName && a.verdict === 'pending')) return prev;
                        return [{ name: cName, role: cRole, dnaMatch: 0, verdict: "pending" as VerdictType }, ...prev];
                    });
                }
            }
        } catch (e) {
            console.error("Failed to parse session", e);
        }
    }, []);

    const { messages, sendMessage } = useChat({
        transport: new DefaultChatTransport({ api: '/api/audit' }),
        onFinish: (message) => {
            setIsScanning(false);
            console.log("Audit finished:", message);
        },
        onToolCall: ({ toolCall }) => {
            console.log("Tool Called:", toolCall);
            if (toolCall.toolName === 'analyzeCodebase') {
                setIsScanning(true);
            }
        },
    });

    // Helper to safely parse tool results
    const parseResult = (result: any) => {
        if (typeof result === 'string') {
            try { return JSON.parse(result); } catch (e) { return null; }
        }
        return result;
    };

    // Watch for tool results to update radar and feed
    useEffect(() => {
        if (!messages.length) return;

        const latestMessage = messages[messages.length - 1];
        if (latestMessage.parts) {
            latestMessage.parts.forEach((part: any) => {
                const toolName = part.toolName || (part.type.startsWith('tool-') ? part.type.replace('tool-', '') : undefined);
                if (toolName === 'analyzeCodebase' && part.output) {
                    const res = parseResult(part.output);
                    if (res) {
                        // 1. Update Radar Data based on findings/gaps
                        // (Mocking mapping logic here based on standard criteria)
                        const scoreMap = {
                            Frontend: res.techStack.includes('React') || res.techStack.includes('Next.js') ? 85 : 30,
                            Backend: res.techStack.includes('Node.js') || res.techStack.includes('Express') ? 80 : 40,
                            DevOps: 50, // Default if unknown
                            Security: 60,
                            Testing: 45,
                            Architecture: res.complexityScore * 10,
                        };

                        setRadarData(prev => prev.map(axis => ({
                            ...axis,
                            value: scoreMap[axis.axis as keyof typeof scoreMap] || axis.value
                        })));

                        // 2. Update Contradiction Feed
                        if (res.gaps && res.gaps.length > 0) {
                            const newContradictions = res.gaps.map((gap: string, idx: number) => {
                                const isHigh = gap.toLowerCase().includes('vulnerability') || gap.toLowerCase().includes('anti-pattern');
                                return {
                                    id: Date.now() + idx,
                                    text: gap,
                                    severity: isHigh ? "high" : "medium",
                                    time: "Just now",
                                    timestamp: new Date()
                                };
                            });

                            setContradictions(prev => [...newContradictions, ...prev]);

                            // 3. Adjust Integrity Rate
                            setIntegrityRate(prev => Math.max(0, prev - (res.contradictionScore || 10)));
                        }
                    }
                }
            });
        }
    }, [messages]);

    // Update timestamps continuously
    useEffect(() => {
        const interval = setInterval(() => {
            setContradictions(prev => prev.map(c => ({ ...c, time: timeAgo(c.timestamp) })));
        }, 60000); // update every minute
        return () => clearInterval(interval);
    }, []);

    const startAudit = async (file: File, githubUrl: string = "https://github.com/kaushik4141/mock-repo") => {
        setIsScanning(true);
        // Reset state
        setRadarData(INITIAL_RADAR_DATA);
        setContradictions([]);
        setIntegrityRate(100);

        // The row is already added by the useEffect on mount.
        // We just ensure we trigger the AI with the right URL/File.

        // Trigger the backend API, though normally useChat handles its own text.
        // For files, we need a custom form data approach if we want to send it to /api/audit,
        // but useChat expects text messages. We will mock the trigger using a text message containing the data.
        // In a real scenario, you might upload first, then trigger chat with the File ID.

        sendMessage({
            text: `Start audit for ${githubUrl}. (Simulated file drop: ${file.name})`
        });
    };

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from(".bento-block", {
                y: 30,
                opacity: 0,
                duration: 0.6,
                stagger: 0.08,
                ease: "power3.out",
            });
        }, gridRef);
        return () => ctx.revert();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-6 font-sans">
            {/* Header */}
            <div className="max-w-[1400px] mx-auto mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shadow-md shadow-indigo-200">
                            <Fingerprint className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-slate-900">Recruitment Control Center</h1>
                            <p className="text-[11px] text-slate-500 font-medium">Hiring Forensics · Live Pipeline</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[11px] text-emerald-600 font-semibold">System Live</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bento Grid */}
            <div ref={gridRef} className="max-w-[1400px] mx-auto grid grid-cols-4 grid-rows-[auto_1fr_auto] gap-4">
                {/* ─── Row 1: Pipeline Stats (3 cards + "mini" 4th slot) ─── */}
                <StatCard stat={INITIAL_PIPELINE_STATS[0]} delay={0} />
                <StatCard stat={{ ...INITIAL_PIPELINE_STATS[1], value: integrityRate }} delay={0.15} />
                <StatCard stat={INITIAL_PIPELINE_STATS[2]} delay={0.3} />
                <MiniActivityCard isScanning={isScanning} />

                {/* ─── Row 2: Recent Audits (2 cols) + Radar (2 cols) ─── */}
                <div className="col-span-2 row-span-1">
                    <RecentAuditsCard audits={recentAudits} />
                </div>
                <div className="col-span-2 row-span-1">
                    <TalentDNACard radarData={radarData} />
                </div>

                {/* ─── Row 3: Contradiction Feed (3 cols) + Quick Start (1 col) ─── */}
                <div className="col-span-3">
                    <ContradictionFeed contradictions={contradictions} />
                </div>
                <div className="col-span-1">
                    <QuickStartCard onDrop={startAudit} isScanning={isScanning} />
                </div>
            </div>
        </div>
    );
}

/* ================================================================== */
/*  STAT CARD                                                          */
/* ================================================================== */

function StatCard({ stat, delay }: { stat: { label: string; value: number; suffix: string; icon: React.ReactNode }; delay: number }) {
    const { count } = useCountUp(stat.value, 2 + delay);
    const tilt = useTilt();

    return (
        <div
            ref={tilt.ref}
            onMouseMove={tilt.handleMouseMove}
            onMouseLeave={tilt.handleMouseLeave}
            className="bento-block rounded-xl bg-white border border-slate-200/60 p-5 cursor-default hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 group"
            style={{ transformStyle: "preserve-3d" }}
        >
            <div className="flex items-center justify-between mb-4">
                <span className="text-slate-400 group-hover:text-indigo-500 transition-colors">{stat.icon}</span>
                <TrendingUp className="w-3 h-3 text-emerald-500" />
            </div>
            <p className="text-3xl font-black tracking-tight font-mono text-slate-800 mb-1">
                {count}{stat.suffix}
            </p>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{stat.label}</p>
        </div>
    );
}

/* ================================================================== */
/*  MINI ACTIVITY CARD (4th slot in top row)                           */
/* ================================================================== */

function MiniActivityCard({ isScanning }: { isScanning: boolean }) {
    const tilt = useTilt();
    return (
        <div
            ref={tilt.ref}
            onMouseMove={tilt.handleMouseMove}
            onMouseLeave={tilt.handleMouseLeave}
            className={`bento-block rounded-xl bg-white border ${isScanning ? 'border-indigo-400 shadow-lg shadow-indigo-500/10' : 'border-slate-200/60'} p-5 cursor-default hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500 flex flex-col justify-between`}
            style={{ transformStyle: "preserve-3d" }}
        >
            <div className="flex items-center justify-between mb-3">
                <Activity className={`w-4 h-4 ${isScanning ? 'text-indigo-500 animate-pulse' : 'text-slate-400'}`} />
                <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1.5">
                    {isScanning && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block animate-ping" />}
                    {isScanning ? 'SCANNING' : 'IDLE'}
                </span>
            </div>
            {/* Mini sparkline bars */}
            <div className="flex items-end gap-[3px] h-8">
                {[35, 55, 40, 70, 50, 85, 60, 90, 45, 75, 65, 80].map((h, i) => (
                    <div
                        key={i}
                        className={`flex-1 rounded-sm ${isScanning ? 'bg-indigo-400' : 'bg-slate-200'} transition-all duration-300`}
                        style={{ height: `${isScanning ? Math.random() * 100 : h}%` }}
                    />
                ))}
            </div>
            <p className="text-[10px] text-slate-500 font-semibold mt-2">Activity Stream</p>
        </div>
    );
}

/* ================================================================== */
/*  RECENT FORENSIC AUDITS                                             */
/* ================================================================== */

function RecentAuditsCard({ audits }: { audits: typeof RECENT_AUDITS }) {
    const tilt = useTilt();

    // Sort candidates by DNA match (highest first) to establish ranks
    const rankedCandidates = [...audits].sort((a, b) => b.dnaMatch - a.dnaMatch);

    return (
        <div
            ref={tilt.ref}
            onMouseMove={tilt.handleMouseMove}
            onMouseLeave={tilt.handleMouseLeave}
            className="bento-block rounded-xl bg-white border border-slate-200/60 p-5 h-full hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300"
            style={{ transformStyle: "preserve-3d" }}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Forensic Ledger</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-full">{rankedCandidates.length} evaluated</span>
            </div>

            <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                {rankedCandidates.map((candidate, i) => {
                    const matchColor =
                        candidate.dnaMatch >= 80 ? { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200/50" } :
                            candidate.dnaMatch >= 60 ? { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200/50" } :
                                candidate.verdict === "pending" ? { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200/50" } :
                                    { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200/50" };

                    const rank = i + 1;
                    const rankColor = candidate.verdict === "pending" ? "text-indigo-400" : rank === 1 ? "text-amber-500" : rank === 2 ? "text-slate-400" : rank === 3 ? "text-amber-700" : "text-slate-300";

                    return (
                        <Link
                            key={i}
                            href={`/forensic?name=${encodeURIComponent(candidate.name)}&role=${encodeURIComponent(candidate.role)}`}
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50/80 hover:shadow-sm border border-transparent hover:border-slate-200/60 transition-all cursor-pointer group"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                {/* Rank */}
                                <div className={`w-4 text-center text-[11px] font-black font-mono flex-shrink-0 ${rankColor}`}>
                                    {candidate.verdict === "pending" ? "-" : `#${rank}`}
                                </div>
                                <div className={`w-8 h-8 rounded-lg ${candidate.verdict === "pass" ? "bg-emerald-50 border-emerald-100" : candidate.verdict === "pending" ? "bg-indigo-50 border-indigo-100 animate-pulse" : "bg-rose-50 border-rose-100"} border flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                                    <span className={`text-[11px] font-bold ${candidate.verdict === "pass" ? "text-emerald-700" : candidate.verdict === "pending" ? "text-indigo-700" : "text-rose-700"}`}>
                                        {candidate.name.split(" ").map(n => n[0]).join("")}
                                    </span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[12px] font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{candidate.name}</p>
                                    <p className="text-[10px] text-slate-500 font-medium truncate">{candidate.role}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 flex-shrink-0">
                                {/* DNA Match Pill */}
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${matchColor.bg} ${matchColor.text} border ${matchColor.border} font-mono shadow-sm`}>
                                    {candidate.verdict === "pending" ? "SCAN..." : `${candidate.dnaMatch}%`}
                                </span>
                                {/* Verdict Icon */}
                                {candidate.verdict === "pass" ? (
                                    <CheckCircle className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                                ) : candidate.verdict === "pending" ? (
                                    <Activity className="w-4 h-4 text-indigo-500 animate-spin-slow group-hover:scale-110 transition-transform" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

/* ================================================================== */
/*  TALENT DNA INSIGHTS (Radar Chart)                                  */
/* ================================================================== */

function TalentDNACard({ radarData }: { radarData: { axis: string, value: number }[] }) {
    const tilt = useTilt();
    const radarRef = useRef<SVGPolygonElement>(null);
    const size = 220;
    const cx = size / 2;
    const cy = size / 2;
    const maxR = 85;
    const levels = 4;

    // Compute polygon points for the radar data
    const dataPoints = radarData.map((d, i) => {
        const angle = (Math.PI * 2 * i) / radarData.length - Math.PI / 2;
        const r = (d.value / 100) * maxR;
        return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });
    const dataPoly = dataPoints.map(p => `${p.x},${p.y}`).join(" ");

    // Axis endpoints
    const axisPoints = radarData.map((d, i) => {
        const angle = (Math.PI * 2 * i) / radarData.length - Math.PI / 2;
        return {
            x: cx + maxR * Math.cos(angle),
            y: cy + maxR * Math.sin(angle),
            labelX: cx + (maxR + 22) * Math.cos(angle),
            labelY: cy + (maxR + 22) * Math.sin(angle),
            label: d.axis,
            value: d.value,
        };
    });

    useEffect(() => {
        // Animate radar shape changes
        if (radarRef.current) {
            gsap.to(radarRef.current, {
                attr: { points: dataPoly },
                duration: 1.5,
                ease: "elastic.out(1, 0.5)",
            });
        }
    }, [dataPoly]);

    return (
        <div
            ref={tilt.ref}
            onMouseMove={tilt.handleMouseMove}
            onMouseLeave={tilt.handleMouseLeave}
            className="bento-block rounded-xl bg-white border border-slate-200/60 p-5 h-full hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col items-center"
            style={{ transformStyle: "preserve-3d" }}
        >
            <div className="flex items-center justify-between mb-3 w-full">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">DNA Print</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-full">Live Scan</span>
            </div>

            <div className="flex-1 flex items-center justify-center relative w-full mt-2">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
                    {/* Background glows */}
                    <defs>
                        <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="rgba(99,102,241,0.15)" />
                            <stop offset="100%" stopColor="rgba(99,102,241,0)" />
                        </radialGradient>
                    </defs>
                    <circle cx={cx} cy={cy} r={maxR} fill="url(#radarGlow)" />

                    {/* Grid levels */}
                    {Array.from({ length: levels }).map((_, i) => {
                        const r = (maxR * (i + 1)) / levels;
                        const pts = radarData.map((_, j) => {
                            const angle = (Math.PI * 2 * j) / radarData.length - Math.PI / 2;
                            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
                        }).join(" ");
                        return (
                            <polygon
                                key={i}
                                points={pts}
                                fill="none"
                                stroke="rgba(148,163,184,0.15)"
                                strokeWidth="1"
                                className="transition-all duration-1000"
                            />
                        );
                    })}

                    {/* Axis lines */}
                    {axisPoints.map((a, i) => (
                        <line key={i} x1={cx} y1={cy} x2={a.x} y2={a.y} stroke="rgba(148,163,184,0.2)" strokeWidth="1" strokeDasharray="4 4" />
                    ))}

                    {/* Data polygon (filled) - Animated via CSS transition if preferred, but GSAP on stroke is smoother */}
                    <polygon
                        points={dataPoly}
                        fill="rgba(99,102,241,0.1)"
                        stroke="none"
                        style={{ transition: 'all 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                    />

                    {/* Data polygon (stroke — animated) */}
                    <polygon
                        ref={radarRef}
                        points={dataPoly} // Initial state, GSAP updates this
                        fill="none"
                        stroke="rgb(99,102,241)"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                    />

                    {/* Data dots */}
                    {dataPoints.map((p, i) => (
                        <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r="4"
                            fill="rgb(99,102,241)"
                            stroke="white"
                            strokeWidth="2"
                            style={{ transition: 'all 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                        />
                    ))}

                    {/* Axis labels moving away slightly */}
                    {axisPoints.map((a, i) => (
                        <text
                            key={i}
                            x={a.labelX}
                            y={a.labelY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="fill-slate-500 font-bold"
                            style={{ fontSize: '10px', transition: 'all 0.5s ease' }}
                        >
                            {a.label}
                        </text>
                    ))}
                </svg>
            </div>

            {/* Bottom meta stats */}
            <div className="flex items-center justify-between mt-6 w-full px-2">
                {radarData.map(d => (
                    <div key={d.axis} className="text-center group flex-1">
                        <p className={`text-[12px] font-black font-mono transition-colors duration-500 ${d.value === 0 ? "text-slate-300" : d.value >= 70 ? "text-emerald-500" : d.value >= 50 ? "text-amber-500" : "text-rose-500"}`}>
                            {d.value}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ================================================================== */
/*  CONTRADICTION FEED                                                 */
/* ================================================================== */

function ContradictionFeed({ contradictions }: { contradictions: Contradiction[] }) {
    const tilt = useTilt();
    const feedRef = useRef<HTMLDivElement>(null);

    const severityStyle = {
        high: { icon: <Skull className="w-3.5 h-3.5" />, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200/50" },
        medium: { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200/50" },
        low: { icon: <Zap className="w-3.5 h-3.5" />, color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200/50" },
    };

    // Auto-scroll logic or animate in new items could go here, but React handles layout naturally.

    return (
        <div
            ref={tilt.ref}
            onMouseMove={tilt.handleMouseMove}
            onMouseLeave={tilt.handleMouseLeave}
            className="bento-block rounded-xl bg-white border border-slate-200/60 p-5 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 h-full flex flex-col"
            style={{ transformStyle: "preserve-3d" }}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Live Discrepancy Stream</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/80 border border-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[10px] text-slate-600 font-bold font-mono uppercase tracking-wider">Listening</span>
                </div>
            </div>

            <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar flex-1" ref={feedRef}>
                {contradictions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                        <Activity className="w-6 h-6 mb-2 animate-bounce-slow" />
                        <p className="text-[11px] uppercase tracking-widest font-semibold font-mono text-center">Awaiting Signals...</p>
                    </div>
                ) : (
                    contradictions.map((item) => {
                        const s = severityStyle[item.severity];
                        return (
                            <div
                                key={item.id}
                                className={`flex items-start gap-3 px-3.5 py-3 rounded-xl ${s.bg} border ${s.border} transition-all duration-300 group/flag cursor-default transform hover:-translate-y-0.5 shadow-sm shadow-slate-100`}
                            >
                                <div className={`mt-0.5 ${s.color} flex-shrink-0 bg-white p-1 rounded-md shadow-sm`}>{s.icon}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-medium text-slate-700 leading-snug break-words">{item.text}</p>
                                </div>
                                <span className="text-[9px] text-slate-400 font-mono flex-shrink-0 mt-1 whitespace-nowrap bg-white/60 px-1.5 py-0.5 rounded border border-slate-200/50">{item.time}</span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

/* ================================================================== */
/*  QUICK START DROP ZONE                                              */
/* ================================================================== */

function QuickStartCard({ onDrop, isScanning }: { onDrop: (f: File) => void; isScanning: boolean }) {
    const tilt = useTilt();
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!isScanning) setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (isScanning) return;

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            onDrop(files[0]);
        }
    };

    return (
        <div
            ref={tilt.ref}
            onMouseMove={tilt.handleMouseMove}
            onMouseLeave={tilt.handleMouseLeave}
            className="bento-block rounded-xl bg-white border border-slate-200/60 p-5 h-full hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col"
            style={{ transformStyle: "preserve-3d" }}
        >
            <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-indigo-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Quick Audit</span>
            </div>

            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex-1 rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-3 relative overflow-hidden
                    ${isScanning ? "border-indigo-200 bg-indigo-50/50 cursor-not-allowed" :
                        isDragging ? "border-indigo-400 bg-indigo-50 cursor-copy scale-95" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50 cursor-pointer group/drop"
                    }`}
            >
                {isScanning && (
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-100/40 to-transparent animate-pulse" />
                )}

                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 z-10
                    ${isScanning ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" :
                        isDragging ? "bg-indigo-100 text-indigo-600 scale-110" : "bg-slate-100 text-slate-400 group-hover/drop:bg-indigo-50 group-hover/drop:text-indigo-500 group-hover/drop:-translate-y-1"}`}>
                    {isScanning ? (
                        <Activity className="w-6 h-6 animate-spin-slow" />
                    ) : isDragging ? (
                        <FileText className="w-7 h-7" />
                    ) : (
                        <Upload className="w-6 h-6" />
                    )}
                </div>
                <div className="text-center z-10">
                    <p className="text-[12px] text-slate-700 font-bold tracking-tight">
                        {isScanning ? "Forensic Scan Active" : isDragging ? "Release File" : "Drop Target Resume"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">
                        {isScanning ? "Analyzing Repositories..." : "Triggers pipeline"}
                    </p>
                </div>
            </div>
        </div>
    );
}