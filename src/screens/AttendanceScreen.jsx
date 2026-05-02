import { useState, useEffect } from 'react';
import { GasAttendanceService } from '../services/GasAttendanceService';
import { RefreshCw, Calendar, LogOut, AlertCircle, Info, CheckCircle2, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AttendanceScreen() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [college, setCollege] = useState('aus');

  // Load saved credentials on mount
  useEffect(() => {
    const saved = localStorage.getItem('utopia_attendance_creds');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRollNumber(parsed.rollNumber);
        setPassword(parsed.password);
        setCollege(parsed.college);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const handleFetch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      localStorage.setItem('utopia_attendance_creds', JSON.stringify({ rollNumber, password, college }));
      const result = await GasAttendanceService.fetchAttendance(rollNumber, password, college);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    localStorage.removeItem('utopia_attendance_creds');
    setRollNumber('');
    setPassword('');
    setData(null);
  };

  const getPercentageColorClass = (value) => {
    if (value >= 75) return 'text-green';
    if (value >= 65) return 'text-peach';
    return 'text-red';
  };
  
  const getPercentageBgClass = (value) => {
    if (value >= 75) return 'bg-green/20';
    if (value >= 65) return 'bg-peach/20';
    return 'bg-red/20';
  };

  const getHeadline = (overall) => {
    if (overall >= 85) return 'Locked in';
    if (overall >= 75) return 'On track';
    if (overall >= 65) return 'Recoverable';
    return 'Needs attention';
  };

  const getHeroStatusText = (belowTargetCount) => {
    if (belowTargetCount > 0) {
      return `${belowTargetCount} subject${belowTargetCount === 1 ? '' : 's'} need attention`;
    }
    return 'All subjects are on track';
  };

  const calculateMissable = (attended, held) => {
    if (held <= 0 || attended <= 0) return 0;
    return Math.max(0, Math.floor((attended / 0.75) - held));
  };

  const calculateNeeded = (attended, held) => {
    if (held <= 0) return 0;
    const needed = ((0.75 * held) - attended) / (1 - 0.75);
    return Math.max(0, Math.ceil(needed));
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-text font-bold text-lg mb-1">Authenticating</p>
          <p className="text-sub text-sm">Connecting to college portal...</p>
        </div>
      );
    }

    if (data) {
      const overall = parseFloat(data.overallPercentage) || 0;
      const belowTargetCount = data.subjects.filter(s => s.percentage < 75).length;
      const colorClass = getPercentageColorClass(overall);
      const bgClass = getPercentageBgClass(overall);

      return (
        <div className="flex-1 animate-fade-in pb-8">
          {/* Hero Widget */}
          <div className={`p-6 md:p-8 rounded-[30px] border border-border bg-gradient-to-br from-card to-bg mb-8 relative overflow-hidden`}>
            {/* Soft gradient overlay matching the flutter linear gradient */}
            <div className={`absolute inset-0 opacity-10 bg-gradient-to-br from-transparent to-current ${colorClass}`}></div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-5">
                <div className={`w-14 h-14 rounded-2xl ${bgClass} flex items-center justify-center shadow-md shadow-${bgClass.replace('/20', '')}/20`}>
                  <svg className={`w-7 h-7 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleFetch()} className="p-2 bg-surface/50 hover:bg-surface border border-border/50 rounded-xl transition-colors">
                    <RefreshCw size={18} className="text-dim hover:text-text" />
                  </button>
                  <button onClick={disconnect} className="p-2 bg-surface/50 hover:bg-surface border border-border/50 rounded-xl transition-colors">
                    <LogOut size={18} className="text-dim hover:text-red" />
                  </button>
                </div>
              </div>
              
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${colorClass}`}>
                {getHeadline(overall)}
              </h3>
              <h1 className="text-5xl font-extrabold text-text mb-2 tracking-tight">
                {overall.toFixed(1)}%
              </h1>
              <p className={`font-semibold text-sm ${belowTargetCount > 0 ? 'text-red' : 'text-sub'}`}>
                {getHeroStatusText(belowTargetCount)}
              </p>
              
              {data.studentName && (
                <div className="mt-4 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-dim" />
                  <span className="text-sm font-semibold text-text truncate uppercase tracking-wide">
                    {data.studentName}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Subjects Header */}
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-xl font-bold text-text">Subjects</h2>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 bg-surface border border-border/50 rounded-xl text-xs font-medium text-sub hover:text-text transition-colors">
                Yesterday
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border/50 rounded-xl text-xs font-medium text-sub hover:text-text transition-colors">
                <Calendar size={14} /> Date
              </button>
            </div>
          </div>

          {/* Subjects List */}
          <div className="space-y-3">
            {data.subjects.map((sub, i) => {
              const subColor = getPercentageColorClass(sub.percentage);
              const subBg = getPercentageBgClass(sub.percentage); // This now returns bg-green/20 etc
              const solidBg = getPercentageBgClass(sub.percentage).replace('/20', '');
              const missable = calculateMissable(sub.attendedClasses, sub.totalClasses);
              const needed = calculateNeeded(sub.attendedClasses, sub.totalClasses);
              
              const bufferLine = sub.percentage >= 75
                ? missable === 0 ? 'At the 75% line' : `Can miss ${missable} more class${missable === 1 ? '' : 'es'}`
                : needed === 0 ? 'Needs attention' : `Attend ${needed} more class${needed === 1 ? '' : 'es'} to reach 75%`;

              // Extract first letter for a clean fallback/icon
              const initial = sub.subject ? sub.subject.charAt(0).toUpperCase() : 'B';

              return (
                <div key={i} className="bg-card border border-border/60 rounded-3xl p-4 md:p-5 transition-transform hover:-translate-y-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 shrink-0 rounded-xl ${subBg} flex items-center justify-center`}>
                      <BookOpen className={`w-5 h-5 ${subColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-text font-bold text-[16px] md:text-lg truncate mb-1">
                        {sub.subject}
                      </h3>
                      <p className="text-sub text-xs font-medium">
                        {sub.attendedClasses} / {sub.totalClasses} classes
                      </p>
                    </div>
                    <div className={`font-extrabold text-xl md:text-2xl ${subColor}`}>
                      {sub.percentage.toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="h-2 bg-surface rounded-full overflow-hidden mb-3">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${solidBg}`} 
                      style={{ width: `${Math.min(100, Math.max(0, sub.percentage))}%` }} 
                    />
                  </div>
                  
                  <p className={`text-xs ${sub.percentage >= 75 ? 'text-sub font-medium' : `${subColor} font-semibold`}`}>
                    {bufferLine}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-sub opacity-80">
            <Info size={14} />
            <span className="text-xs font-medium">Fetched via In-App Service</span>
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={handleFetch} className="relative w-full max-w-md mx-auto mt-4 animate-fade-in font-outfit">
        {/* Cool floating background blobs for the login form */}
        <div className="absolute top-10 -left-10 w-40 h-40 bg-primary/20 rounded-full mix-blend-screen filter blur-[50px] animate-blob"></div>
        <div className="absolute bottom-10 -right-10 w-40 h-40 bg-teal/20 rounded-full mix-blend-screen filter blur-[50px] animate-blob animation-delay-2000"></div>

        <div className="relative z-10 bg-surface/60 backdrop-blur-3xl border border-white/10 shadow-2xl shadow-black/40 rounded-[2.5rem] p-8 md:p-10">
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-teal rounded-[20px] flex items-center justify-center mb-5 shadow-lg shadow-primary/20 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
              <svg className="w-8 h-8 text-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-text mb-2 tracking-tight">Connect Portal</h2>
            <p className="text-sub text-sm font-medium">Link your academic identity</p>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex bg-bg/50 backdrop-blur-md rounded-[20px] p-1.5 border border-white/5">
                <button 
                  type="button"
                  onClick={() => setCollege('aus')}
                  className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${college === 'aus' ? 'bg-primary text-bg shadow-[0_4px_12px_rgba(203,166,247,0.3)] scale-[1.02]' : 'text-sub hover:text-text hover:bg-surface/50'}`}
                >
                  AUS
                </button>
                <button 
                  type="button"
                  onClick={() => setCollege('acet')}
                  className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${college === 'acet' ? 'bg-primary text-bg shadow-[0_4px_12px_rgba(203,166,247,0.3)] scale-[1.02]' : 'text-sub hover:text-text hover:bg-surface/50'}`}
                >
                  ACET
                </button>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-text text-xs font-bold uppercase tracking-wider ml-2 opacity-80">Roll Number</label>
              <input 
                type="text" 
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                placeholder="21A91A0501"
                className="w-full bg-bg/50 backdrop-blur-sm border border-white/5 rounded-2xl px-5 py-4 text-text text-base focus:border-primary/50 focus:bg-surface/50 outline-none uppercase transition-all duration-300 placeholder:text-dim"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-text text-xs font-bold uppercase tracking-wider ml-2 opacity-80">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-bg/50 backdrop-blur-sm border border-white/5 rounded-2xl px-5 py-4 text-text text-base focus:border-primary/50 focus:bg-surface/50 outline-none transition-all duration-300 placeholder:text-dim"
                required
              />
            </div>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red/10 border border-red/20 rounded-2xl flex items-start gap-3 text-red text-sm animate-fade-in">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <button 
            type="submit"
            className="w-full relative group overflow-hidden rounded-2xl mt-8 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-primary via-peach to-teal opacity-80 group-hover:opacity-100 transition-opacity duration-300"></span>
            <div className="relative flex items-center justify-center gap-2 py-4">
              <span className="text-bg font-bold text-lg tracking-wide">Connect</span>
              <svg className="w-5 h-5 text-bg transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="max-w-2xl mx-auto font-outfit">
      {/* Page Title only visible if no data, otherwise rely on hero */}
      {!data && !loading && (
        <div className="mb-6 hidden md:block text-center">
          <h1 className="text-4xl font-extrabold text-text mb-2 tracking-tight">Attendance</h1>
        </div>
      )}

      {renderContent()}
    </div>
  );
}

// Inline helper for UserIcon
function UserIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
