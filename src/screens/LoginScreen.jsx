import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const { user, signInWithGoogle } = useAuth();

  if (user) {
    return <Navigate to="/app/community" replace />;
  }

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center relative overflow-hidden bg-surface/30">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-teal/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
        
        <div className="relative z-10 text-center">
          <h1 className="font-playfair italic text-8xl font-bold text-primary mb-6" style={{ textShadow: '0 8px 32px rgba(203, 166, 247, 0.3)' }}>
            Utopia
          </h1>
          <p className="text-dim text-xl tracking-[0.3em] font-medium uppercase">
            The Productivity Platform
          </p>
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-24 relative z-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-16">
            <h1 className="font-playfair italic text-6xl font-bold text-primary mb-4" style={{ textShadow: '0 4px 20px rgba(203, 166, 247, 0.2)' }}>
              Utopia
            </h1>
            <p className="text-dim text-sm tracking-widest uppercase">The Productivity Platform</p>
          </div>

          <h2 className="text-text text-3xl font-bold mb-2">Welcome back</h2>
          <p className="text-sub mb-10">Log in to access your academic workspace.</p>

          <button 
            onClick={signInWithGoogle}
            className="w-full bg-surface border border-border/50 hover:border-primary/50 rounded-2xl py-4 px-6 flex items-center justify-center gap-4 hover:bg-surface/80 transition-all shadow-lg shadow-black/10 hover:shadow-primary/10 group"
          >
            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.58c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-text font-semibold text-lg">Continue with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
}
