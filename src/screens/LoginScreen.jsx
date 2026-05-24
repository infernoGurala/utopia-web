import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight } from 'lucide-react';

export default function LoginScreen() {
  const { user, signInWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  if (user) {
    return <Navigate to="/app/focus" replace />;
  }

  const handleLogin = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative bg-bg overflow-hidden font-sans">
      
      {/* LEFT HALF - Pure White Paper Aesthetic */}
      <div className="w-full md:w-1/2 bg-[#fbfbfa] flex flex-col justify-between p-8 md:p-16 lg:p-24 shrink-0 min-h-[50vh] md:min-h-screen">
        
        {/* Top Spacer or Header */}
        <div className="editorial-text-spaced text-dim">
          UT.01 / ACADEMIA
        </div>

        {/* Main Content Area */}
        <div className="my-auto py-12 md:py-20 max-w-md">
          {/* Logo & Headline */}
          <h1 className="text-7xl md:text-8xl lg:text-[7rem] font-serif font-light text-[#121212] tracking-tighter leading-[0.8] uppercase select-none">
            Utopia
          </h1>
          <span className="editorial-text-spaced text-dim block mt-4 mb-8 tracking-[0.55em] font-light">
            A c a d e m i a
          </span>
          
          <p className="font-serif italic text-lg md:text-xl text-sub font-light leading-relaxed mb-12 max-w-sm">
            "A sanctuary for the quiet focus and deep thought of the modern academic mind."
          </p>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={isSigningIn}
            className="w-full max-w-xs btn-premium-mono py-4 px-6 flex items-center justify-center gap-3 border border-[#121212] cursor-pointer"
          >
            {isSigningIn ? (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin"></div>
                <span className="editorial-text-spaced text-bg">Signing in...</span>
              </div>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.58c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.5 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="editorial-text-spaced text-bg">Continue with Google</span>
                <ArrowRight className="w-3.5 h-3.5 text-bg" />
              </>
            )}
          </button>
        </div>

        {/* Typographic Gallery Row at Bottom-Left */}
        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-[#121212]/10">
          <div>
            <div className="editorial-text-spaced text-[9px] tracking-[0.2em] text-[#121212] font-semibold mb-1">
              01 / FOCUS
            </div>
            <div className="font-serif italic text-xs text-sub leading-normal">
              Silent solitude of the desk.
            </div>
          </div>
          <div>
            <div className="editorial-text-spaced text-[9px] tracking-[0.2em] text-[#121212] font-semibold mb-1">
              02 / JOURNAL
            </div>
            <div className="font-serif italic text-xs text-sub leading-normal">
              Ink marks the passing thought.
            </div>
          </div>
          <div>
            <div className="editorial-text-spaced text-[9px] tracking-[0.2em] text-[#121212] font-semibold mb-1">
              03 / TEMPLE
            </div>
            <div className="font-serif italic text-xs text-sub leading-normal">
              Time slips into quiet order.
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT HALF - Rich Black Gallery Solitude Aesthetic */}
      <div className="w-full md:w-1/2 bg-[#0a0a0a] flex items-center justify-center p-8 md:p-16 min-h-[50vh] md:min-h-screen relative shrink-0">
        
        {/* Large abstract typographic background art */}
        <div className="absolute inset-0 flex flex-col justify-center p-12 md:p-20 lg:p-24 select-none pointer-events-none">
          <div className="text-[12vw] md:text-[8vw] font-serif font-extralight tracking-tighter leading-[0.85] text-white/[0.015] dark:text-white/[0.025] uppercase">
            Deep<br />Focus
          </div>
          <div className="text-[7vw] md:text-[5vw] font-editorial italic text-white/[0.015] dark:text-white/[0.025] leading-[1] ml-[15%] mt-4">
            & Solitude
          </div>
        </div>

        {/* Subdued top navigation item right in the corner, matching references */}
        <div className="absolute top-8 md:top-16 right-8 md:right-16 flex gap-6 md:gap-10">
          <span className="editorial-text-spaced text-white/40 select-none hover:text-white/80 transition-colors cursor-pointer text-[10px]">Journal</span>
          <span className="editorial-text-spaced text-white/40 select-none hover:text-white/80 transition-colors cursor-pointer text-[10px]">Library</span>
          <span className="editorial-text-spaced text-white/40 select-none hover:text-white/80 transition-colors cursor-pointer text-[10px]">Sanctuary</span>
        </div>

        {/* Small minimalist text block inside the black section */}
        <div className="max-w-xs z-10 text-center md:text-left mt-auto md:mt-0 select-none">
          <p className="editorial-text-spaced text-white/30 text-[9px] mb-2 tracking-[0.3em]">
            THE TIMELESS ENVIRONMENT
          </p>
          <p className="font-serif text-white/60 text-sm font-light leading-relaxed">
            Eliminate all sensory distractions. Reclaim your intellectual domain.
          </p>
        </div>

        {/* Bottom copyright detail */}
        <div className="absolute bottom-8 right-8 md:right-16">
          <span className="editorial-text-spaced text-white/20 text-[9px]">© Utopia Studio</span>
        </div>

      </div>

      {/* OVERLAPPING FROSTED GLASS CAPSULE - Exactly in the center of the screen split */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none hidden md:block">
        <div className="glass-pill-premium rounded-full py-4 px-10 border shadow-2xl shrink-0 whitespace-nowrap animate-fadeIn">
          <span className="font-serif italic text-sm md:text-base text-[#121212] dark:text-[#fbfbfa] tracking-wider select-none">
            "Photography for the timeless."
          </span>
        </div>
      </div>

    </div>
  );
}
