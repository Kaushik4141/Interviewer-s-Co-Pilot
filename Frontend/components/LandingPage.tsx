import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Star, ChevronRight, Sparkles, Shield, Zap, Users, Code } from 'lucide-react';
import gsap from 'gsap';

interface LandingPageProps {
    onEnter: () => void;
}

export default function LandingPage({ onEnter }: LandingPageProps) {
    const [hoveredButton, setHoveredButton] = useState<string | null>(null);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const navRef = useRef<HTMLElement>(null);
    const heroRef = useRef<HTMLElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const subtitleRef = useRef<HTMLParagraphElement>(null);
    const buttonsRef = useRef<HTMLDivElement>(null);
    const hexagonRef = useRef<HTMLDivElement>(null);
    const featuresRef = useRef<HTMLDivElement>(null);
    const floatingElementsRef = useRef<HTMLDivElement>(null);

    // Features data for micro-interactions
    const features = [
        { icon: Shield, text: "Secure War Rooms", color: "#6DE0A3" },
        { icon: Zap, text: "Real-time Collaboration", color: "#65D49D" },
        { icon: Users, text: "Fair Assessments", color: "#5bc98e" },
        { icon: Code, text: "Code Execution", color: "#7BDCB5" }
    ];

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Initial page load timeline
            const tl = gsap.timeline();

            // Navbar animation
            tl.from(navRef.current, {
                y: -50,
                opacity: 0,
                duration: 0.8,
                ease: "power3.out"
            });

            // Hero section animations
            tl.from(titleRef.current, {
                y: 30,
                opacity: 0,
                duration: 1,
                ease: "power4.out"
            }, "-=0.4");

            tl.from(subtitleRef.current, {
                y: 30,
                opacity: 0,
                duration: 1,
                ease: "power4.out"
            }, "-=0.6");

            tl.from(buttonsRef.current, {
                y: 30,
                opacity: 0,
                duration: 1,
                ease: "power4.out"
            }, "-=0.6");

            // Hexagon rotation animation
            if (hexagonRef.current) {
                gsap.to(hexagonRef.current, {
                    rotation: 360,
                    duration: 20,
                    repeat: -1,
                    ease: "none"
                });
            }

            // Floating elements animation
            if (floatingElementsRef.current) {
                gsap.to(floatingElementsRef.current.children, {
                    y: "random(-15, 15)",
                    duration: "random(2, 4)",
                    repeat: -1,
                    yoyo: true,
                    ease: "sine.inOut",
                    stagger: 0.2
                });
            }

            // Features staggered animation
            if (featuresRef.current) {
                gsap.from(featuresRef.current.children, {
                    scrollTrigger: {
                        trigger: featuresRef.current,
                        start: "top bottom-=100",
                        toggleActions: "play none none reverse"
                    },
                    scale: 0.8,
                    opacity: 0,
                    y: 40,
                    duration: 0.8,
                    stagger: 0.15,
                    ease: "back.out(1.2)"
                });
            }

            // Background gradient animation
            gsap.to(".gradient-bg", {
                backgroundPosition: "200% 200%",
                duration: 10,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });

        }, containerRef);

        return () => ctx.revert();
    }, []);

    // Button hover animations
    const handleButtonHover = (buttonId: string, isHovering: boolean) => {
        setHoveredButton(isHovering ? buttonId : null);
        
        const button = document.querySelector(`[data-button="${buttonId}"]`);
        if (button) {
            if (isHovering) {
                gsap.to(button, {
                    scale: 1.05,
                    duration: 0.3,
                    ease: "power2.out"
                });
                
                // Animate arrow icon
                const arrow = button.querySelector('.arrow-icon');
                if (arrow) {
                    gsap.to(arrow, {
                        x: 5,
                        duration: 0.3,
                        ease: "power2.out"
                    });
                }
            } else {
                gsap.to(button, {
                    scale: 1,
                    duration: 0.3,
                    ease: "power2.out"
                });
                
                const arrow = button.querySelector('.arrow-icon');
                if (arrow) {
                    gsap.to(arrow, {
                        x: 0,
                        duration: 0.3,
                        ease: "power2.out"
                    });
                }
            }
        }
    };

    // Nav link hover animations
    const handleNavHover = (e: React.MouseEvent<HTMLAnchorElement>, isEnter: boolean) => {
        const link = e.currentTarget;
        const line = link.querySelector('.nav-line');
        
        if (line) {
            gsap.to(line, {
                scaleX: isEnter ? 1 : 0,
                duration: 0.3,
                ease: "power2.out"
            });
        }
    };

    return (
        <div ref={containerRef} className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-[#7BDCB5]/30 overflow-x-hidden">
            {/* Animated background gradient */}
            <div className="gradient-bg fixed inset-0 bg-gradient-to-br from-white via-white to-[#6DE0A3]/5 bg-[length:200%_200%] pointer-events-none" />
            
            {/* Floating decorative elements */}
            <div ref={floatingElementsRef} className="fixed inset-0 pointer-events-none overflow-hidden">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-[#6DE0A3]/20 rounded-full"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                        }}
                    />
                ))}
            </div>

            {/* Navbar */}
            <nav 
                ref={navRef}
                className="relative flex items-center justify-between px-6 py-5 max-w-7xl mx-auto bg-white/80 backdrop-blur-sm z-50 rounded-2xl mt-4 border border-zinc-100 shadow-sm"
            >
                <div className="flex items-center gap-2 group cursor-pointer" onClick={onEnter}>
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
                    <span className="text-xl font-bold tracking-tight text-zinc-900 group-hover:text-[#65D49D] transition-colors duration-300">
                        Interviewer's Co-Pilot
                    </span>
                </div>

                <div className="hidden md:flex items-center gap-8 font-medium text-[15px] text-zinc-800">
                    {['Home', 'Features', 'Pricing', 'Testimonials', 'FAQ'].map((item) => (
                        <a
                            key={item}
                            href="#"
                            className="relative group py-2"
                            onMouseEnter={(e) => handleNavHover(e, true)}
                            onMouseLeave={(e) => handleNavHover(e, false)}
                        >
                            {item}
                            <span className="nav-line absolute bottom-0 left-0 w-full h-0.5 bg-[#6DE0A3] scale-x-0 origin-left transition-transform" />
                        </a>
                    ))}
                </div>

                <button
                    data-button="get-started-nav"
                    onMouseEnter={() => handleButtonHover("get-started-nav", true)}
                    onMouseLeave={() => handleButtonHover("get-started-nav", false)}
                    onClick={onEnter}
                    className="hidden md:flex items-center gap-2 bg-[#6DE0A3] hover:bg-[#5bc98e] text-zinc-900 font-semibold px-5 py-2.5 rounded-lg text-[15px] transition-all shadow-sm relative overflow-hidden group"
                >
                    <span className="relative z-10">Get Started</span>
                    <ChevronRight className="arrow-icon w-4 h-4 relative z-10" />
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </button>
            </nav>

            {/* Hero Section */}
            <main ref={heroRef} className="relative flex flex-col items-center text-center pt-20 md:pt-28 px-4 max-w-[1200px] mx-auto">
                {/* Animated badge */}
                <div className="inline-flex items-center gap-2 bg-zinc-100 border border-zinc-200 rounded-full px-4 py-2 mb-8 hover:scale-105 transition-transform duration-300 cursor-default">
                    <Sparkles className="w-4 h-4 text-[#6DE0A3]" />
                    <span className="text-sm font-medium text-zinc-600">AI-Powered Technical Interviews</span>
                </div>

                <h1 
                    ref={titleRef}
                    className="text-5xl md:text-[64px] lg:text-[80px] leading-[1.1] font-medium tracking-tight text-zinc-800 mb-6"
                >
                    Elevate Your{' '}
                    <span className="relative inline-block">
                        Engineering
                        <span className="absolute -bottom-2 left-0 w-full h-1 bg-[#6DE0A3]/30 rounded-full" />
                    </span>
                    <br />
                    Interviews
                </h1>

                <p 
                    ref={subtitleRef}
                    className="text-[17px] md:text-[20px] text-zinc-500 mb-10 max-w-2xl leading-[1.6]"
                >
                    A secure, intelligent platform for technical assessments. Experience fair, deep, 
                    and collaborative engineering interviews with real-time feedback.
                </p>

                <div ref={buttonsRef} className="flex flex-col sm:flex-row items-center gap-4 mb-16 w-full sm:w-auto">
                    <button
                        data-button="get-started-main"
                        onMouseEnter={() => handleButtonHover("get-started-main", true)}
                        onMouseLeave={() => handleButtonHover("get-started-main", false)}
                        onClick={onEnter}
                        className="group relative w-full sm:w-auto flex items-center justify-center gap-2 bg-[#6DE0A3] hover:bg-[#5bc98e] text-zinc-900 font-semibold px-8 py-4 rounded-2xl transition-all text-[17px] shadow-md overflow-hidden"
                    >
                        <span className="relative z-10">Get started</span>
                        <ArrowRight className="arrow-icon w-5 h-5 relative z-10" />
                        <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    </button>

                    <button
                        data-button="live-demo"
                        onMouseEnter={() => handleButtonHover("live-demo", true)}
                        onMouseLeave={() => handleButtonHover("live-demo", false)}
                        className="group relative w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-semibold px-8 py-4 rounded-2xl transition-all text-[17px] overflow-hidden"
                    >
                        <span className="relative z-10">View Live Demo</span>
                        <div className="absolute inset-0 bg-white/50 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    </button>
                </div>

                {/* Features grid */}
                <div 
                    ref={featuresRef}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 w-full max-w-3xl mx-auto mb-20"
                >
                    {features.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <div
                                key={index}
                                className="group flex flex-col items-center p-4 rounded-2xl bg-white border border-zinc-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-default"
                                style={{
                                    transform: hoveredButton === `feature-${index}` ? 'scale(1.05)' : 'scale(1)',
                                }}
                                onMouseEnter={() => setHoveredButton(`feature-${index}`)}
                                onMouseLeave={() => setHoveredButton(null)}
                            >
                                <div 
                                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110"
                                    style={{ backgroundColor: `${feature.color}20` }}
                                >
                                    <Icon className="w-6 h-6" style={{ color: feature.color }} />
                                </div>
                                <span className="text-xs font-medium text-zinc-600 text-center">
                                    {feature.text}
                                </span>
                            </div>
                        );
                    })}
                </div>

                

                
            </main>

            {/* Floating CTA for mobile */}
            <div className="fixed bottom-6 left-4 right-4 md:hidden z-50">
                <button
                    onClick={onEnter}
                    className="w-full bg-[#6DE0A3] hover:bg-[#5bc98e] text-zinc-900 font-semibold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all"
                >
                    Get Started
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}