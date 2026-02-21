/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  LayoutGrid,
  Plus,
  Copy,
  Check,
  Link as LinkIcon,
  Video,
  Keyboard,
  ArrowRight,
  Shield,
  Zap,
  ArrowLeft,
  Star
} from "lucide-react";

interface LobbyProps {
  onStartSession: (candidateName: string, role: string, meetingId: string) => void;
  onJoinSession: (code: string) => void;
}

type UserType = "none" | "interviewer" | "candidate";

export default function Lobby({ onStartSession, onJoinSession }: LobbyProps) {
  const [candidateName, setCandidateName] = useState("");
  const [role, setRole] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [meetingId] = useState(() => Math.random().toString(36).substring(2, 11).match(/.{1,3}/g)?.join('-').toUpperCase() || "ABC-DEFG-HIJ");

  const [userType, setUserType] = useState<UserType>("none");

  const containerRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const hexagonRef = useRef<HTMLDivElement>(null);

  // Main entrance animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial page load animations
      gsap.from(leftRef.current, {
        x: -60,
        opacity: 0,
        duration: 1.2,
        ease: "power4.out"
      });

      gsap.from(rightRef.current, {
        x: 60,
        opacity: 0,
        duration: 1.2,
        delay: 0.3,
        ease: "power4.out"
      });

      // Navbar animation
      gsap.from("nav", {
        y: -20,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
      });

      // Hexagon subtle animation
      if (hexagonRef.current) {
        gsap.to(hexagonRef.current, {
          rotation: 360,
          duration: 20,
          repeat: -1,
          ease: "none"
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Animate when user type changes
  useEffect(() => {
    if (userType !== "none" && leftRef.current) {
      gsap.fromTo(leftRef.current.querySelector(".user-actions"),
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.2)" }
      );
    }
  }, [userType]);

  // Modal animations
  useEffect(() => {
    if (showCreateModal && modalRef.current) {
      gsap.fromTo(modalRef.current,
        { scale: 0.8, opacity: 0, y: 30 },
        { 
          scale: 1, 
          opacity: 1, 
          y: 0, 
          duration: 0.5,
          ease: "back.out(1.7)",
          clearProps: "scale,opacity,y"
        }
      );
      
      // Animate backdrop
      gsap.fromTo(".modal-backdrop",
        { opacity: 0 },
        { opacity: 1, duration: 0.3 }
      );

      // Focus input with animation
      if (inputRef.current) {
        gsap.fromTo(inputRef.current,
          { scale: 0.95, borderColor: "#e4e4e7" },
          { 
            scale: 1, 
            borderColor: "#6DE0A3", 
            duration: 0.4,
            delay: 0.2,
            ease: "power2.out"
          }
        );
        inputRef.current.focus();
      }
    }
  }, [showCreateModal]);

  // Generated state animation
  useEffect(() => {
    if (isGenerated && modalRef.current) {
      gsap.fromTo(modalRef.current.querySelector(".generated-content"),
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }
      );
    }
  }, [isGenerated]);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (candidateName && role) {
      // Button press animation
      gsap.to(e.currentTarget as HTMLElement, {
        scale: 0.95,
        duration: 0.1,
        yoyo: true,
        repeat: 1
      });

      setTimeout(() => setIsGenerated(true), 200);

      // Success animation on form
      gsap.to(".modal-form", {
        backgroundColor: "rgba(109, 224, 163, 0.1)",
        duration: 0.3,
        yoyo: true,
        repeat: 1
      });
    }
  };

  const handleCopy = () => {
    const url = `${window.location.origin}/join/${meetingId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);

    // Copy animation
    gsap.to(".copy-button", {
      scale: 1.2,
      duration: 0.2,
      yoyo: true,
      repeat: 1,
      ease: "power2.inOut"
    });

    // Success pulse on link container
    gsap.to(".link-container", {
      backgroundColor: "rgba(109, 224, 163, 0.2)",
      borderColor: "#6DE0A3",
      duration: 0.3,
      yoyo: true,
      repeat: 1
    });

    setTimeout(() => setCopied(false), 2000);
  };

  const handleButtonHover = (buttonId: string, isHovering: boolean) => {
    setHoveredButton(isHovering ? buttonId : null);
    
    if (isHovering) {
      gsap.to(`[data-button="${buttonId}"]`, {
        scale: 1.02,
        duration: 0.3,
        ease: "power2.out"
      });
    } else {
      gsap.to(`[data-button="${buttonId}"]`, {
        scale: 1,
        duration: 0.3,
        ease: "power2.out"
      });
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    gsap.to(e.target, {
      scale: 1.02,
      borderColor: "#6DE0A3",
      boxShadow: "0 4px 12px rgba(109, 224, 163, 0.2)",
      duration: 0.3,
      ease: "power2.out"
    });
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    gsap.to(e.target, {
      scale: 1,
      borderColor: "#e4e4e7",
      boxShadow: "none",
      duration: 0.3,
      ease: "power2.out"
    });
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-[#7BDCB5]/30 overflow-hidden">
      {/* Navbar - Matching Landing Page */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto bg-white z-50">
        <div className="flex items-center gap-2 group">
          {/* Hexagon icon with animation */}
          <div 
            ref={hexagonRef}
            className="w-7 h-7 relative flex items-center justify-center text-[#65D49D] transition-all group-hover:scale-110"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 drop-shadow-sm">
              <path d="M12 2L22 7.77333V16.2267L12 22L2 16.2267V7.77333L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 6H14M11 6V11L8 16H16L13 11V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-900 group-hover:text-[#65D49D] transition-colors duration-300">Interviewer's Co-Pilot</span>
        </div>
      </nav>

      {/* Hero Section - Reduced top padding */}
      <main className="flex flex-col lg:flex-row items-center justify-center px-6 lg:px-24 gap-12 lg:gap-24 max-w-[1400px] mx-auto pt-8 lg:pt-12">
        {/* Left Content - Reduced top padding */}
        <div ref={leftRef} className="flex-1 max-w-xl space-y-6 py-8">
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-[64px] font-medium tracking-tight text-zinc-800 leading-[1.1]">
              {userType === "candidate" ? "Join an Interview" : "Engineering Interviews"}
            </h1>
            <p className="text-[17px] md:text-[20px] text-zinc-500 leading-[1.6] max-w-2xl">
              {userType === "candidate" 
                ? "Join your scheduled technical interview in a secure, intelligent environment." 
                : "Create a fair, deep, and collaborative engineering interview session in seconds."}
            </p>
          </div>

          <div className="h-px w-16 bg-zinc-200 animate-pulse" />

          {/* User Type Selection */}
          {userType === "none" && (
            <div className="flex flex-col gap-4 user-actions">
              <button
                data-button="interviewer"
                onMouseEnter={() => handleButtonHover("interviewer", true)}
                onMouseLeave={() => handleButtonHover("interviewer", false)}
                onClick={() => {
                  gsap.to("[data-button='interviewer']", {
                    scale: 0.95,
                    duration: 0.1,
                    yoyo: true,
                    repeat: 1
                  });
                  setUserType("interviewer");
                }}
                className="w-full flex items-center justify-between p-6 rounded-2xl bg-[#6DE0A3] hover:bg-[#5bc98e] text-zinc-900 transition-all group shadow-sm relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="p-3 bg-black/5 rounded-xl group-hover:rotate-12 transition-transform duration-300">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-lg">Login as Interviewer</h3>
                    <p className="text-sm text-zinc-700/80 mt-0.5">Create and host technical assessments</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300 relative z-10" />
              </button>

              <button
                data-button="candidate"
                onMouseEnter={() => handleButtonHover("candidate", true)}
                onMouseLeave={() => handleButtonHover("candidate", false)}
                onClick={() => {
                  gsap.to("[data-button='candidate']", {
                    scale: 0.95,
                    duration: 0.1,
                    yoyo: true,
                    repeat: 1
                  });
                  setUserType("candidate");
                }}
                className="w-full flex items-center justify-between p-6 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 transition-all group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="p-3 bg-white/50 rounded-xl group-hover:rotate-12 transition-transform duration-300">
                    <Keyboard className="w-6 h-6 text-zinc-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-lg">Login as Candidate</h3>
                    <p className="text-sm text-zinc-500 mt-0.5">Join a scheduled interview session</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-2 transition-all duration-300 relative z-10" />
              </button>
            </div>
          )}

          {/* Interviewer Actions */}
          {userType === "interviewer" && (
            <div className="space-y-6 user-actions">
              <button
                onClick={() => {
                  gsap.to(".user-actions", {
                    opacity: 0,
                    y: -20,
                    duration: 0.3,
                    onComplete: () => setUserType("none")
                  });
                }}
                className="text-sm font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-2 transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Change Role
              </button>

              <button
                data-button="start-interview"
                onMouseEnter={() => handleButtonHover("start-interview", true)}
                onMouseLeave={() => handleButtonHover("start-interview", false)}
                onClick={() => {
                  gsap.to("[data-button='start-interview']", {
                    scale: 0.95,
                    duration: 0.1,
                    yoyo: true,
                    repeat: 1
                  });
                  setShowCreateModal(true);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#6DE0A3] hover:bg-[#5bc98e] text-zinc-900 font-semibold px-6 py-4 rounded-2xl transition-all text-[17px] shadow-sm relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <Video className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform" />
                <span className="relative z-10">Start New Interview</span>
              </button>
            </div>
          )}

          {/* Candidate Actions */}
          {userType === "candidate" && (
            <div className="space-y-6 user-actions">
              <button
                onClick={() => {
                  gsap.to(".user-actions", {
                    opacity: 0,
                    y: -20,
                    duration: 0.3,
                    onComplete: () => setUserType("none")
                  });
                }}
                className="text-sm font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-2 transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Change Role
              </button>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-80 flex items-center gap-3 bg-white border border-zinc-200 rounded-2xl px-4 py-4 focus-within:ring-2 focus-within:ring-[#6DE0A3] transition-all shadow-sm">
                  <LinkIcon className="w-5 h-5 text-zinc-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Enter meeting code (e.g. ABC-123)"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    className="bg-transparent border-none focus:outline-none text-sm font-medium w-full"
                  />
                </div>
                <button
                  data-button="join-meeting"
                  onMouseEnter={() => handleButtonHover("join-meeting", true)}
                  onMouseLeave={() => handleButtonHover("join-meeting", false)}
                  onClick={() => {
                    if (joinCode) {
                      gsap.to("[data-button='join-meeting']", {
                        scale: 0.95,
                        duration: 0.1,
                        yoyo: true,
                        repeat: 1
                      });
                      onJoinSession(joinCode);
                    }
                  }}
                  disabled={!joinCode}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#6DE0A3] hover:bg-[#5bc98e] text-zinc-900 font-semibold px-6 py-4 rounded-2xl transition-all text-[17px] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <span className="relative z-10">Join Meeting</span>
                  <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Visual - Redesigned to match landing page aesthetic */}
        <div ref={rightRef} className="flex-1 w-full max-w-2xl hidden lg:block">
          <div className="relative aspect-[4/3] rounded-[40px] bg-gradient-to-br from-zinc-50 to-zinc-100 border border-zinc-200 overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-500">
            {/* Abstract geometric pattern matching the hexagon theme */}
            <div className="absolute inset-0 opacity-10 animate-pulse">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="hexagons" x="0" y="0" width="50" height="43.4" patternUnits="userSpaceOnUse">
                    <path d="M25 0L50 14.4V43.4L25 57.8L0 43.4V14.4L25 0Z" fill="none" stroke="#65D49D" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#hexagons)" />
              </svg>
            </div>

            {/* Mock UI Elements - Matching the green accent color */}
            <div className="absolute inset-0 p-8 flex flex-col gap-4">
              {/* Top bar with avatar group */}
              <div className="flex items-center justify-between">
                <div className="flex -space-x-3">
                  {[1, 2, 3].map((i) => (
                    <div 
                      key={i} 
                      className="w-10 h-10 rounded-full border-2 border-white bg-zinc-300 overflow-hidden shadow-sm animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
                <div className="w-24 h-8 bg-[#6DE0A3]/20 rounded-lg border border-[#6DE0A3]/30 animate-pulse" />
              </div>

              {/* Main content area - split screen mock */}
              <div className="flex-1 grid grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div 
                    key={i} 
                    className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200 p-4 shadow-sm hover:scale-105 transition-transform duration-300"
                    style={{ transitionDelay: `${i * 0.1}s` }}
                  >
                    <div className="w-3/4 h-4 bg-zinc-200 rounded mb-3 animate-pulse" />
                    <div className="w-full h-24 bg-zinc-100 rounded-lg mb-2 animate-pulse" />
                    <div className="w-1/2 h-4 bg-zinc-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>

              {/* Bottom chat/controls mock */}
              <div className="h-16 bg-white/80 backdrop-blur-sm rounded-xl border border-zinc-200 flex items-center px-4 gap-2 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-zinc-200 animate-pulse" />
                <div className="flex-1 h-8 bg-zinc-100 rounded-lg animate-pulse" />
                <div className="w-8 h-8 rounded-lg bg-[#6DE0A3]/20 border border-[#6DE0A3]/30 animate-pulse" />
              </div>
            </div>

            {/* Floating badge - Matching landing page typography */}
            <div className="absolute -bottom-6 left-8 right-8 bg-white p-6 rounded-3xl border border-zinc-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <h3 className="text-lg font-bold tracking-tight text-zinc-900 mb-2">
                {userType === "candidate" ? "Ready when you are" : "Secure war room link"}
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                {userType === "candidate"
                  ? "Make sure your camera and microphone are ready before joining."
                  : "Generate a unique link to share with your candidate. Secure and simple."}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Create Meeting Modal - Redesigned to match landing page */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div
            className="modal-backdrop absolute inset-0 bg-zinc-900/20 backdrop-blur-sm"
            onClick={() => {
              gsap.to(modalRef.current, {
                scale: 0.8,
                opacity: 0,
                y: 30,
                duration: 0.3,
                onComplete: () => setShowCreateModal(false)
              });
              gsap.to(".modal-backdrop", {
                opacity: 0,
                duration: 0.3
              });
            }}
          />
          <div ref={modalRef} className="relative w-full max-w-md bg-white rounded-[32px] border border-zinc-200 shadow-2xl overflow-hidden">
            <div className="p-8">
              {!isGenerated ? (
                <form onSubmit={handleGenerate} className="space-y-6 modal-form">
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Create new meeting</h2>
                    <p className="text-sm text-zinc-500">Enter the candidate details to generate a secure war room link.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Candidate Name</label>
                      <input
                        ref={inputRef}
                        type="text"
                        required
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        placeholder="e.g. Sarah Chen"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6DE0A3] transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Target Role</label>
                      <input
                        type="text"
                        required
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        placeholder="e.g. Senior Frontend Engineer"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6DE0A3] transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    data-button="generate-link"
                    onMouseEnter={() => handleButtonHover("generate-link", true)}
                    onMouseLeave={() => handleButtonHover("generate-link", false)}
                    className="w-full bg-[#6DE0A3] hover:bg-[#5bc98e] text-zinc-900 font-semibold rounded-xl py-4 text-[15px] flex items-center justify-center gap-2 transition-all shadow-sm relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <Plus className="w-4 h-4 relative z-10 group-hover:rotate-180 transition-transform duration-500" />
                    <span className="relative z-10">Generate Link</span>
                  </button>
                </form>
              ) : (
                <div className="space-y-8 generated-content">
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Here's your meeting link</h2>
                    <p className="text-sm text-zinc-500">Copy this link and send it to {candidateName}.</p>
                  </div>

                  <div className="link-container flex items-center gap-2 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl">
                    <LinkIcon className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    <span className="text-sm font-mono text-zinc-500 truncate flex-1">
                      {window.location.origin}/join/{meetingId}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="copy-button p-2 hover:bg-zinc-200 rounded-lg transition-colors relative"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-500 animate-bounce" />
                      ) : (
                        <Copy className="w-4 h-4 text-zinc-600" />
                      )}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <button
                      data-button="start-session"
                      onMouseEnter={() => handleButtonHover("start-session", true)}
                      onMouseLeave={() => handleButtonHover("start-session", false)}
                      onClick={() => {
                        gsap.to("[data-button='start-session']", {
                          scale: 0.95,
                          duration: 0.1,
                          yoyo: true,
                          repeat: 1
                        });
                        onStartSession(candidateName, role, meetingId);
                      }}
                      className="w-full bg-[#6DE0A3] hover:bg-[#5bc98e] text-zinc-900 font-semibold rounded-xl py-4 text-[15px] flex items-center justify-center gap-2 transition-all shadow-sm relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      <span className="relative z-10">Start Session</span>
                      <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-2 transition-transform" />
                    </button>
                    <button
                      onClick={() => {
                        gsap.to(modalRef.current, {
                          scale: 0.8,
                          opacity: 0,
                          y: 30,
                          duration: 0.3,
                          onComplete: () => {
                            setIsGenerated(false);
                            setShowCreateModal(false);
                          }
                        });
                      }}
                      className="w-full py-2 text-xs font-medium text-zinc-400 hover:text-zinc-900 transition-colors hover:scale-105"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}