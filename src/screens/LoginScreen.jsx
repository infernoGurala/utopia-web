import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function LoginScreen() {
  const { user, signInWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  if (user) {
    return <Navigate to="/app/community" replace />;
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
    <div className="min-h-screen bg-bg flex items-center justify-center relative overflow-hidden font-outfit">
      
      {/* Animated Background Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-peach/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-teal/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000"></div>
      
      {/* Ambient grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

      <div className="relative z-10 w-full max-w-lg p-6">
        {/* Glassmorphism Card */}
        <div className="bg-surface/40 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/40 rounded-[2.5rem] p-10 md:p-14 relative overflow-hidden group">
          
          {/* Subtle gradient shine effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

          <div className="relative z-10 flex flex-col items-center text-center">
            
            {/* Logo area */}
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-peach rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-8 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
              <Sparkles className="text-white w-10 h-10" />
            </div>

            <h1 className="font-playfair italic text-5xl md:text-6xl font-bold text-text mb-3 tracking-tight">
              Utopia.
            </h1>
            <p className="text-sub text-lg mb-12 font-medium">
              Your ultimate academic workspace.
            </p>

            {/* Login Button */}
            <button 
              onClick={handleLogin}
              disabled={isSigningIn}
              className={`w-full relative group/btn overflow-hidden rounded-2xl p-[2px] transition-all duration-300 ${isSigningIn ? 'opacity-80 cursor-not-allowed scale-95' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
            >
              {/* Button border gradient */}
              <span className="absolute inset-0 bg-gradient-to-r from-primary via-peach to-teal opacity-50 group-hover/btn:opacity-100 transition-opacity duration-300 rounded-2xl"></span>
              
              <div className="relative bg-surface border border-white/5 backdrop-blur-xl rounded-2xl py-4 px-6 flex items-center justify-center gap-4">
                {isSigningIn ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-text font-semibold text-lg">Authenticating...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.58c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span className="text-text font-semibold text-lg flex items-center gap-2">
                      Continue with Google
                      <ArrowRight className="w-5 h-5 opacity-0 -ml-4 group-hover/btn:opacity-100 group-hover/btn:ml-0 transition-all duration-300 text-dim" />
                    </span>
                  </>
                )}
              </div>
            </button>

            <p className="mt-8 text-dim text-sm">
              By continuing, you agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
