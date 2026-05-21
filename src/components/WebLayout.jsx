import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Users, BookOpen, ClipboardCheck, Zap, User, LogOut, Flame, Home } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';

export default function WebLayout() {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showMolecularDashboard, setShowMolecularDashboard] = useState(
    location.pathname === '/app' || location.pathname === '/app/'
  );

  // Blossoming state: controls whether the constellation is expanded or collapsed
  const [isExpanded, setIsExpanded] = useState(false);

  // Magnetic coordinate states for the mini-constellation
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHoveredConstellation, setIsHoveredConstellation] = useState(false);

  // Magnetic coordinate states for the fullscreen portal
  const [portalCoords, setPortalCoords] = useState({ x: 0, y: 0 });
  const [isHoveredPortal, setIsHoveredPortal] = useState(false);

  useEffect(() => {
    if (location.pathname === '/app' || location.pathname === '/app/') {
      setShowMolecularDashboard(true);
    } else {
      setShowMolecularDashboard(false);
    }
  }, [location.pathname]);

  const handleConstellationMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setCoords({ x, y });
    setIsHoveredConstellation(true);
  };

  const handleConstellationMouseLeave = () => {
    setCoords({ x: 0, y: 0 });
    setIsHoveredConstellation(false);
    setIsExpanded(false); // Sucks back into the core cleanly when cursor leaves
  };

  const handlePortalMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setPortalCoords({ x, y });
    setIsHoveredPortal(true);
  };

  const handlePortalMouseLeave = () => {
    setPortalCoords({ x: 0, y: 0 });
    setIsHoveredPortal(false);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col relative overflow-x-hidden">
      <style>{`
        @keyframes floatDockEntrance {
          0% { opacity: 0; transform: translateY(-20px) scale(0.95); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: none; }
        }
        @keyframes rotateHalo {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 120; }
        }
        @keyframes flowSignal {
          to { stroke-dashoffset: -30; }
        }
        @keyframes hapticRipple {
          0% { transform: scale(0.95); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        /* Lock centering translation to preserve coordinates during float animation */
        @keyframes gentleFloat {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50% { transform: translate(-50%, -50%) translateY(-8px); }
        }
        .animate-dock-entrance {
          animation: floatDockEntrance 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .flow-signal-line {
          stroke-dasharray: 6, 14;
          animation: flowSignal 2s linear infinite;
        }
        .animate-float-slow {
          animation: gentleFloat 6s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: gentleFloat 5s ease-in-out infinite;
        }
        .animate-float-fast {
          animation: gentleFloat 4s ease-in-out infinite;
        }
        .star-ripple {
          pointer-events: none;
          opacity: 0;
          transition: all 0.3s ease;
        }
        .group:hover .star-ripple {
          animation: hapticRipple 1.4s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
          opacity: 1;
        }
        .spring-physics-bubble {
          transition: transform 0.6s cubic-bezier(0.25, 1.5, 0.5, 1), background-color 0.3s ease, border-color 0.3s ease;
        }
        .spring-physics-bubble:hover {
          transform: scale(1.18);
        }
        .magnetic-spring-container {
          transition: transform 0.85s cubic-bezier(0.2, 1, 0.2, 1);
        }
        .halo-ring {
          stroke-dasharray: 30, 90;
          animation: rotateHalo 3s linear infinite;
          transition: stroke 0.3s ease, stroke-width 0.3s ease, opacity 0.3s ease;
        }
        .group:hover .halo-ring {
          stroke-width: 1.5px;
          opacity: 1 !important;
        }
        .blossom-element {
          transition: transform 0.75s cubic-bezier(0.34, 1.85, 0.64, 1), opacity 0.5s ease;
        }
        .molecular-dashboard-bg {
          background: radial-gradient(ellipse at center, var(--surface) 0%, var(--bg) 100%);
        }
      `}</style>

      {/* Futuristic SVG Filter Definitions for Neon Glow effects */}
      <svg className="hidden w-0 h-0 absolute pointer-events-none select-none">
        <defs>
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Floating Global Mini-Constellation Dock (Desktop) */}
      {!showMolecularDashboard && (
        <div 
          onMouseMove={handleConstellationMouseMove}
          onMouseLeave={handleConstellationMouseLeave}
          className={`hidden md:block fixed top-6 right-6 md:right-12 z-50 transition-all duration-500 animate-dock-entrance select-none cursor-default ${
            isExpanded 
              ? 'w-[220px] h-[130px] bg-transparent hover:bg-surface/5 border border-transparent hover:border-border/5 rounded-[36px] hover:shadow-[0_20px_50px_rgba(203,166,247,0.02)] p-3' 
              : 'w-[64px] h-[64px] bg-transparent border border-transparent p-0'
          }`}
        >
          {/* Dynamic Spotlight Aura Backdrop (Tracks cursor position inside the card) */}
          {isExpanded && (
            <div 
              className="absolute inset-0 transition-opacity duration-500 rounded-[36px] pointer-events-none z-0"
              style={{ 
                opacity: isHoveredConstellation ? 1 : 0, 
                background: `radial-gradient(circle 90px at ${coords.x + 110}px ${coords.y + 65}px, color-mix(in srgb, var(--primary) 8%, transparent) 0%, transparent 100%)` 
              }} 
            />
          )}

          {/* Magnetic Parallax Shift Content Group */}
          <div 
            className="w-full h-full relative magnetic-spring-container"
            style={{ 
              transform: isHoveredConstellation && isExpanded
                ? `translate(${coords.x * 0.12}px, ${coords.y * 0.12}px)` 
                : 'translate(0px, 0px)' 
            }}
          >
            {/* Wireframe Constellation Connections (Fades in dynamically when blossomed) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none select-none z-0 transition-opacity duration-500" style={{ opacity: isExpanded ? 1 : 0 }}>
              {/* Background glowing fiber-optic paths with custom filter */}
              <g filter="url(#neon-glow)">
                <line x1="110" y1="65" x2="110" y2="20" stroke="var(--border)" opacity="0.15" strokeWidth="0.75" />
                <line x1="110" y1="65" x2="155" y2="65" stroke="var(--border)" opacity="0.15" strokeWidth="0.75" />
                <line x1="110" y1="65" x2="110" y2="110" stroke="var(--border)" opacity="0.15" strokeWidth="0.75" />
                <line x1="110" y1="65" x2="65" y2="65" stroke="var(--border)" opacity="0.15" strokeWidth="0.75" />

                {/* Glowing flowing neon data signal paths */}
                <line x1="110" y1="65" x2="110" y2="20" stroke="var(--primary)" opacity="0.4" strokeWidth="0.75" className="flow-signal-line" />
                <line x1="110" y1="65" x2="155" y2="65" stroke="var(--teal)" opacity="0.4" strokeWidth="0.75" className="flow-signal-line" />
                <line x1="110" y1="65" x2="110" y2="110" stroke="var(--lavender)" opacity="0.4" strokeWidth="0.75" className="flow-signal-line" />
                <line x1="110" y1="65" x2="65" y2="65" stroke="var(--primary)" opacity="0.4" strokeWidth="0.75" className="flow-signal-line" />
              </g>
            </svg>

            {/* Utopia Core Mini Bubble (Center - Floating Anchor) */}
            <div 
              className="absolute group w-13 h-13 z-20" 
              style={{ 
                left: isExpanded ? '110px' : '32px', 
                top: isExpanded ? '65px' : '32px', 
                transform: 'translate(-50%, -50%)',
                transition: 'left 0.5s cubic-bezier(0.25, 1, 0.5, 1), top 0.5s cubic-bezier(0.25, 1, 0.5, 1)'
              }}
            >
              <div className="star-ripple absolute inset-[-5px] rounded-full border border-primary/30 text-primary" />

              <button
                onMouseEnter={() => setIsExpanded(true)} // Triggers the blossom pop dynamically
                onClick={() => { setShowMolecularDashboard(true); navigate('/app'); }}
                className="absolute top-0 left-0 w-13 h-13 rounded-full backdrop-blur-2xl bg-surface/50 hover:bg-surface/85 border border-border/30 shadow-[inset_0_2px_6px_rgba(255,255,255,0.1),_0_8px_32px_rgba(0,0,0,0.15)] cursor-pointer flex items-center justify-center text-text spring-physics-bubble"
                title="Portal Overview"
              >
                {/* Spinning Neon Laser Ring - Nested inside button for perfect locked rendering context */}
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none select-none z-0">
                  <circle cx="50" cy="50" r="58" fill="none" stroke="var(--primary)" strokeWidth="2" opacity="0.8" className="halo-ring" />
                </svg>
                <Home className="w-5 h-5 text-text z-10" />
              </button>
              {/* Home Tooltip (Points upwards cleanly) */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 opacity-0 scale-95 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 transition-all duration-300 z-30 flex items-center gap-1.5 bg-surface/95 backdrop-blur-xl border border-border/40 px-3 py-1.5 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.15)]">
                <Home className="w-3.5 h-3.5 text-primary" />
                <span className="text-[9px] font-bold text-primary uppercase tracking-wider whitespace-nowrap">Dashboard</span>
              </div>
            </div>

            {/* Notes Star Bubble (Blossoms out/sucks in) */}
            <div 
              className="absolute group w-10 h-10 z-10 blossom-element" 
              style={{ 
                left: '110px', 
                top: '65px', 
                transform: isExpanded 
                  ? 'translate(-50%, -50%) translate(0px, -45px)' 
                  : 'translate(-50%, -50%) translate(0px, 0px) scale(0)',
                opacity: isExpanded ? 1 : 0
              }}
            >
              <div className="star-ripple absolute inset-[-5px] rounded-full border border-primary/30 text-primary" />

              <button
                onClick={() => navigate('/app/notes')}
                className={`absolute top-0 left-0 w-10 h-10 rounded-full backdrop-blur-2xl border flex items-center justify-center cursor-pointer spring-physics-bubble ${
                  location.pathname.startsWith('/app/notes')
                    ? 'bg-primary/10 border-primary/40 shadow-[0_8px_24px_color-mix(in_srgb,var(--primary)_25%,transparent),_inset_0_2px_4px_rgba(255,255,255,0.1)] text-primary'
                    : 'bg-surface/40 border-border/20 text-sub hover:text-text hover:border-primary/30'
                }`}
              >
                {/* Spinning Neon Laser Ring - Nested inside button for perfect locked rendering context */}
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none select-none z-0">
                  <circle cx="50" cy="50" r="60" fill="none" 
                    stroke="var(--primary)" 
                    strokeWidth="2.5" 
                    opacity={location.pathname.startsWith('/app/notes') ? '0.9' : '0.25'} 
                    className="halo-ring" 
                  />
                </svg>
                <BookOpen className="w-4 h-4 z-10" />
              </button>
              {/* Tooltip points UPWARDS */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 opacity-0 scale-95 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 transition-all duration-300 z-30 flex items-center gap-1.5 bg-surface/95 backdrop-blur-xl border border-border/40 px-3 py-1.5 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.15)]">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                <span className="text-[9px] font-bold text-primary uppercase tracking-wider whitespace-nowrap">Notes</span>
              </div>
            </div>

            {/* Attendance Star Bubble (Blossoms out/sucks in) */}
            <div 
              className="absolute group w-10 h-10 z-10 blossom-element" 
              style={{ 
                left: '110px', 
                top: '65px', 
                transform: isExpanded 
                  ? 'translate(-50%, -50%) translate(45px, 0px)' 
                  : 'translate(-50%, -50%) translate(0px, 0px) scale(0)',
                opacity: isExpanded ? 1 : 0
              }}
            >
              <div className="star-ripple absolute inset-[-5px] rounded-full border border-teal/30 text-teal" />

              <button
                onClick={() => navigate('/app/attendance')}
                className={`absolute top-0 left-0 w-10 h-10 rounded-full backdrop-blur-2xl border flex items-center justify-center cursor-pointer spring-physics-bubble ${
                  location.pathname.startsWith('/app/attendance')
                    ? 'bg-teal/10 border-teal/40 shadow-[0_8px_24px_color-mix(in_srgb,var(--teal)_25%,transparent),_inset_0_2px_4px_rgba(255,255,255,0.1)] text-teal'
                    : 'bg-surface/40 border-border/20 text-sub hover:text-text hover:border-teal/30'
                }`}
              >
                {/* Spinning Neon Laser Ring - Nested inside button for perfect locked rendering context */}
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none select-none z-0">
                  <circle cx="50" cy="50" r="60" fill="none" 
                    stroke="var(--teal)" 
                    strokeWidth="2.5" 
                    opacity={location.pathname.startsWith('/app/attendance') ? '0.9' : '0.25'} 
                    className="halo-ring" 
                  />
                </svg>
                <ClipboardCheck className="w-4 h-4 z-10" />
              </button>
              {/* Tooltip points OUTWARD RIGHT */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 opacity-0 scale-95 -translate-x-1 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-300 z-30 flex items-center gap-1.5 bg-surface/95 backdrop-blur-xl border border-border/40 px-3 py-1.5 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.15)]">
                <ClipboardCheck className="w-3.5 h-3.5 text-teal" />
                <span className="text-[9px] font-bold text-teal uppercase tracking-wider whitespace-nowrap">Presence</span>
              </div>
            </div>

            {/* Focus Star Bubble (Blossoms out/sucks in) */}
            <div 
              className="absolute group w-10 h-10 z-10 blossom-element" 
              style={{ 
                left: '110px', 
                top: '65px', 
                transform: isExpanded 
                  ? 'translate(-50%, -50%) translate(0px, 45px)' 
                  : 'translate(-50%, -50%) translate(0px, 0px) scale(0)',
                opacity: isExpanded ? 1 : 0
              }}
            >
              <div className="star-ripple absolute inset-[-5px] rounded-full border border-lavender/30 text-lavender" />

              <button
                onClick={() => navigate('/app/focus')}
                className={`absolute top-0 left-0 w-10 h-10 rounded-full backdrop-blur-2xl border flex items-center justify-center cursor-pointer spring-physics-bubble ${
                  location.pathname.startsWith('/app/focus')
                    ? 'bg-lavender/10 border-lavender/40 shadow-[0_8px_24px_color-mix(in_srgb,var(--lavender)_25%,transparent),_inset_0_2px_4px_rgba(255,255,255,0.1)] text-lavender'
                    : 'bg-surface/40 border-border/20 text-sub hover:text-text hover:border-lavender/30'
                }`}
              >
                {/* Spinning Neon Laser Ring - Nested inside button for perfect locked rendering context */}
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none select-none z-0">
                  <circle cx="50" cy="50" r="60" fill="none" 
                    stroke="var(--lavender)" 
                    strokeWidth="2.5" 
                    opacity={location.pathname.startsWith('/app/focus') ? '0.9' : '0.25'} 
                    className="halo-ring" 
                  />
                </svg>
                <Flame className="w-4 h-4 z-10" />
              </button>
              {/* Tooltip points OUTWARD DOWNWARDS */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3.5 opacity-0 scale-95 -translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 transition-all duration-300 z-30 flex items-center gap-1.5 bg-surface/95 backdrop-blur-xl border border-border/40 px-3 py-1.5 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.15)]">
                <Flame className="w-3.5 h-3.5 text-lavender" />
                <span className="text-[9px] font-bold text-lavender uppercase tracking-wider whitespace-nowrap">Focus</span>
              </div>
            </div>

            {/* Profile Star Bubble (Blossoms out/sucks in) */}
            <div 
              className="absolute group w-10 h-10 z-10 blossom-element" 
              style={{ 
                left: '110px', 
                top: '65px', 
                transform: isExpanded 
                  ? 'translate(-50%, -50%) translate(-45px, 0px)' 
                  : 'translate(-50%, -50%) translate(0px, 0px) scale(0)',
                opacity: isExpanded ? 1 : 0
              }}
            >
              <div className="star-ripple absolute inset-[-5px] rounded-full border border-primary/30 text-primary" />

              <button
                onClick={() => navigate('/app/profile')}
                className={`absolute top-0 left-0 w-10 h-10 rounded-full backdrop-blur-2xl border flex items-center justify-center cursor-pointer spring-physics-bubble ${
                  location.pathname.startsWith('/app/profile')
                    ? 'bg-primary/10 border-primary/40 shadow-[0_8px_24px_color-mix(in_srgb,var(--primary)_25%,transparent),_inset_0_2px_4px_rgba(255,255,255,0.1)] text-primary'
                    : 'bg-surface/40 border-border/20 text-sub hover:text-text hover:border-primary/30'
                }`}
              >
                {/* Spinning Neon Laser Ring - Nested inside button for perfect locked rendering context */}
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none select-none z-0">
                  <circle cx="50" cy="50" r="60" fill="none" 
                    stroke="var(--primary)" 
                    strokeWidth="2.5" 
                    opacity={location.pathname.startsWith('/app/profile') ? '0.9' : '0.25'} 
                    className="halo-ring" 
                  />
                </svg>
                <User className="w-4 h-4 z-10" />
              </button>
              {/* Tooltip points OUTWARD LEFT */}
              <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3.5 opacity-0 scale-95 translate-x-1 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-300 z-30 flex items-center gap-1.5 bg-surface/95 backdrop-blur-xl border border-border/40 px-3 py-1.5 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.15)]">
                <User className="w-3.5 h-3.5 text-primary" />
                <span className="text-[9px] font-bold text-primary uppercase tracking-wider whitespace-nowrap">Profile</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {!showMolecularDashboard ? (
        <main className="flex-1 min-w-0 min-h-screen pb-24 md:pb-0 relative animate-dock-entrance">
          <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-12">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between mb-6 pt-2">
              <h1 className="font-playfair italic text-3xl font-bold text-primary" style={{ textShadow: '0 2px 10px rgba(203,166,247,0.2)' }}>
                Utopia
              </h1>
              <button onClick={signOut} className="p-2 text-dim hover:text-red transition-colors bg-surface/50 rounded-full">
                <LogOut size={20} />
              </button>
            </div>
            
            <Outlet />
          </div>
        </main>
      ) : (
        /* Fullscreen Molecular Dashboard Portal with Full Interactive Spotlight Parallax and Spinning Laser Rings */
        <div 
          onMouseMove={handlePortalMouseMove}
          onMouseLeave={handlePortalMouseLeave}
          className="flex-1 min-h-screen flex flex-col justify-center items-center relative py-20 px-4 animate-dock-entrance overflow-hidden select-none molecular-dashboard-bg"
        >
          {/* Dynamic Spotlight Aura Backdrop (Tracks cursor position on the main dashboard) */}
          <div 
            className="absolute inset-0 transition-opacity duration-700 pointer-events-none z-0"
            style={{ 
              opacity: isHoveredPortal ? 1 : 0.6, 
              background: `radial-gradient(circle 280px at ${portalCoords.x + window.innerWidth / 2}px ${portalCoords.y + window.innerHeight / 2}px, color-mix(in srgb, var(--primary) 8%, transparent) 0%, transparent 100%)` 
            }} 
          />

          {/* Background visual dust */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,color-mix(in_srgb,var(--primary)_6%,transparent)_0%,transparent_50%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,color-mix(in_srgb,var(--blue)_6%,transparent)_0%,transparent_50%)] pointer-events-none" />

          {/* Header */}
          <div className="text-center space-y-3 mb-16 relative z-10 max-w-lg">
            <h2 
              className="font-playfair italic text-4xl md:text-5xl font-bold tracking-tight text-text leading-none" 
              style={{ textShadow: '0 5px 25px color-mix(in srgb, var(--primary) 20%, transparent)' }}
            >
              Utopia Portal
            </h2>
            <p className="text-xs font-semibold text-dim tracking-widest uppercase">
              SELECT A GLOWING STAR TO START YOUR SESSION
            </p>
          </div>

          {/* Triangulated Molecular Constellation with overall Parallax Tilt */}
          <div 
            className="relative w-[500px] h-[500px] shrink-0 transform scale-90 md:scale-100 transition-transform duration-500 magnetic-spring-container z-10"
            style={{ 
              transform: isHoveredPortal 
                ? `translate(${portalCoords.x * 0.06}px, ${portalCoords.y * 0.06}px)` 
                : 'translate(0px, 0px)' 
            }}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              {/* Static background lines with Neon Glow */}
              <g filter="url(#neon-glow)">
                {/* Radial Lines */}
                <line x1="250" y1="250" x2="250" y2="80" stroke="var(--border)" opacity="0.15" strokeWidth="0.75" />
                <line x1="250" y1="250" x2="420" y2="250" stroke="var(--border)" opacity="0.15" strokeWidth="0.75" />
                <line x1="250" y1="250" x2="250" y2="420" stroke="var(--border)" opacity="0.15" strokeWidth="0.75" />
                <line x1="250" y1="250" x2="80" y2="250" stroke="var(--border)" opacity="0.15" strokeWidth="0.75" />
                
                {/* Outer connections forming a beautiful glowing square diamond */}
                <line x1="250" y1="80" x2="420" y2="250" stroke="var(--border)" opacity="0.08" strokeWidth="0.5" />
                <line x1="420" y1="250" x2="250" y2="420" stroke="var(--border)" opacity="0.08" strokeWidth="0.5" />
                <line x1="250" y1="420" x2="80" y2="250" stroke="var(--border)" opacity="0.08" strokeWidth="0.5" />
                <line x1="80" y1="250" x2="250" y2="80" stroke="var(--border)" opacity="0.08" strokeWidth="0.5" />

                {/* Glowing, flowing signal paths */}
                <line x1="250" y1="250" x2="250" y2="80" stroke="var(--primary)" opacity="0.4" strokeWidth="0.75" className="flow-signal-line" />
                <line x1="250" y1="250" x2="420" y2="250" stroke="var(--teal)" opacity="0.4" strokeWidth="0.75" className="flow-signal-line" />
                <line x1="250" y1="250" x2="250" y2="420" stroke="var(--lavender)" opacity="0.4" strokeWidth="0.75" className="flow-signal-line" />
                <line x1="250" y1="250" x2="80" y2="250" stroke="var(--primary)" opacity="0.4" strokeWidth="0.75" className="flow-signal-line" />
              </g>
            </svg>

            {/* Central Core Sphere */}
            <div 
              className="absolute group w-[140px] h-[140px]"
              style={{ left: '250px', top: '250px', transform: 'translate(-50%, -50%)' }}
            >
              {/* Giant Spinning Neon Laser Ring - Placed outside the inner core to prevent border-radius clipping */}
              <svg viewBox="0 0 100 100" className="absolute inset-[-14px] w-[168px] h-[168px] overflow-visible pointer-events-none select-none z-0">
                <circle cx="50" cy="50" r="46" fill="none" stroke="var(--primary)" strokeWidth="1" opacity="0.8" className="halo-ring" />
              </svg>

              <div className="absolute inset-0 rounded-full backdrop-blur-3xl bg-surface/60 border border-border/30 flex flex-col items-center justify-center text-center core-glow-pulse z-10 shadow-[inset_0_4px_12px_rgba(255,255,255,0.15),_0_16px_48px_color-mix(in_srgb,var(--primary)_22%,transparent)] animate-jelly-liquid">
                <span className="font-playfair italic text-2xl font-bold tracking-tight text-text select-none z-10">Utopia</span>
              </div>
            </div>
 
            {/* Notes Node */}
            <div className="absolute group w-28 h-28 animate-float-slow" style={{ left: '250px', top: '80px', transform: 'translate(-50%, -50%)' }}>
              <div className="star-ripple absolute inset-[-8px] rounded-full border border-primary/30 text-primary" />
 
              {/* Spinning Neon Laser Ring - Placed outside the button to prevent browser clipping */}
              <svg viewBox="0 0 100 100" className="absolute inset-[-14px] w-[140px] h-[140px] overflow-visible pointer-events-none select-none z-0">
                <circle cx="50" cy="50" r="46" fill="none" stroke="var(--primary)" strokeWidth="1.2" opacity="0.8" className="halo-ring" />
              </svg>

              <button
                onClick={() => { setShowMolecularDashboard(false); navigate('/app/notes'); }}
                className="absolute inset-0 rounded-full backdrop-blur-2xl bg-surface/50 hover:bg-surface/85 border border-border/30 flex flex-col items-center justify-center gap-1.5 transition-all duration-500 shadow-[inset_0_3px_8px_rgba(255,255,255,0.1),_0_12px_32px_rgba(0,0,0,0.12)] text-primary cursor-pointer z-10 spring-physics-bubble"
              >
                <BookOpen size={24} className="z-10 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-wider z-10 text-primary">Notes</span>
              </button>
            </div>
 
            {/* Attendance Node */}
            <div className="absolute group w-28 h-28 animate-float-fast" style={{ left: '420px', top: '250px', transform: 'translate(-50%, -50%)' }}>
              <div className="star-ripple absolute inset-[-8px] rounded-full border border-teal/30 text-teal" />
 
              {/* Spinning Neon Laser Ring - Placed outside the button to prevent browser clipping */}
              <svg viewBox="0 0 100 100" className="absolute inset-[-14px] w-[140px] h-[140px] overflow-visible pointer-events-none select-none z-0">
                <circle cx="50" cy="50" r="46" fill="none" stroke="var(--teal)" strokeWidth="1.2" opacity="0.8" className="halo-ring" />
              </svg>

              <button
                onClick={() => { setShowMolecularDashboard(false); navigate('/app/attendance'); }}
                className="absolute inset-0 rounded-full backdrop-blur-2xl bg-surface/50 hover:bg-surface/85 border border-border/30 flex flex-col items-center justify-center gap-1.5 transition-all duration-500 shadow-[inset_0_3px_8px_rgba(255,255,255,0.1),_0_12px_32px_rgba(0,0,0,0.12)] text-teal cursor-pointer z-10 spring-physics-bubble"
              >
                <ClipboardCheck size={24} className="z-10 text-teal" />
                <span className="text-[10px] font-bold uppercase tracking-wider z-10 text-teal">Presence</span>
              </button>
            </div>
 
            {/* Focus Node */}
            <div className="absolute group w-28 h-28 animate-float-medium" style={{ left: '250px', top: '420px', transform: 'translate(-50%, -50%)' }}>
              <div className="star-ripple absolute inset-[-8px] rounded-full border border-lavender/30 text-lavender" />
 
              {/* Spinning Neon Laser Ring - Placed outside the button to prevent browser clipping */}
              <svg viewBox="0 0 100 100" className="absolute inset-[-14px] w-[140px] h-[140px] overflow-visible pointer-events-none select-none z-0">
                <circle cx="50" cy="50" r="46" fill="none" stroke="var(--lavender)" strokeWidth="1.2" opacity="0.8" className="halo-ring" />
              </svg>

              <button
                onClick={() => { setShowMolecularDashboard(false); navigate('/app/focus'); }}
                className="absolute inset-0 rounded-full backdrop-blur-2xl bg-surface/50 hover:bg-surface/85 border border-border/30 flex flex-col items-center justify-center gap-1.5 transition-all duration-500 shadow-[inset_0_3px_8px_rgba(255,255,255,0.1),_0_12px_32px_rgba(0,0,0,0.12)] text-lavender cursor-pointer z-10 spring-physics-bubble"
              >
                <Flame size={24} className="z-10 text-lavender" />
                <span className="text-[10px] font-bold uppercase tracking-wider z-10 text-lavender">Focus</span>
              </button>
            </div>
 
            {/* Profile Node */}
            <div className="absolute group w-28 h-28 animate-float-fast" style={{ left: '80px', top: '250px', transform: 'translate(-50%, -50%)' }}>
              <div className="star-ripple absolute inset-[-8px] rounded-full border border-primary/30 text-primary" />
 
              {/* Spinning Neon Laser Ring - Placed outside the button to prevent browser clipping */}
              <svg viewBox="0 0 100 100" className="absolute inset-[-14px] w-[140px] h-[140px] overflow-visible pointer-events-none select-none z-0">
                <circle cx="50" cy="50" r="46" fill="none" stroke="var(--primary)" strokeWidth="1.2" opacity="0.8" className="halo-ring" />
              </svg>

              <button
                onClick={() => { setShowMolecularDashboard(false); navigate('/app/profile'); }}
                className="absolute inset-0 rounded-full backdrop-blur-2xl bg-surface/50 hover:bg-surface/85 border border-border/30 flex flex-col items-center justify-center gap-1.5 transition-all duration-500 shadow-[inset_0_3px_8px_rgba(255,255,255,0.1),_0_12px_32px_rgba(0,0,0,0.12)] text-primary cursor-pointer z-10 spring-physics-bubble"
              >
                <User size={24} className="z-10 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-wider z-10 text-primary">Profile</span>
              </button>
            </div>
          </div>

          {/* Sign Out Node */}
          <button 
            onClick={signOut}
            className="mt-20 px-6 py-2.5 rounded-full border border-red/20 bg-red/5 text-red hover:bg-red/10 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer hover:scale-105 z-20 relative animate-dock-entrance"
          >
            Sign Out Portal
          </button>
        </div>
      )}

      {/* Bottom Navigation (Mobile) */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 bg-surface/60 backdrop-blur-xl border border-border/20 rounded-3xl p-1.5 flex justify-around items-center z-50 shadow-2xl">
        <MobileNavItem to="/app/notes" icon={<BookOpen size={20} />} label="Notes" />
        <MobileNavItem to="/app/attendance" icon={<ClipboardCheck size={20} />} label="Presence" />
        <MobileNavItem to="/app/focus" icon={<Flame size={20} />} label="Focus" />
        <MobileNavItem to="/app/profile" icon={<User size={20} />} label="Profile" />
      </div>
    </div>
  );
}

function NavItem({ to, icon, label, collapsed }) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);

  return (
    <NavLink 
      to={to} 
      className={`flex items-center ${collapsed ? 'justify-center' : ''} gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 ${
        isActive 
          ? `bg-primary/10 text-primary font-semibold ${collapsed ? '' : 'shadow-[inset_4px_0_0_var(--primary)]'}` 
          : 'text-sub hover:text-text hover:bg-surface/50 font-medium'
      }`}
      title={collapsed ? label : undefined}
    >
      <div className={isActive ? 'text-primary' : 'text-dim'}>
        {icon}
      </div>
      {!collapsed && <span className="text-[15px]">{label}</span>}
    </NavLink>
  );
}

function MobileNavItem({ to, icon, label }) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);

  return (
    <NavLink 
      to={to} 
      className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200 ${
        isActive 
          ? 'text-primary' 
          : 'text-dim hover:text-text'
      }`}
    >
      <div className={`mb-1 transition-transform duration-200 ${isActive ? 'scale-110 -translate-y-0.5' : ''}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-medium transition-opacity ${isActive ? 'opacity-100' : 'opacity-70'}`}>
        {label}
      </span>
      {isActive && (
        <div className="absolute top-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]"></div>
      )}
    </NavLink>
  );
}
