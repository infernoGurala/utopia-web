import { useState, useEffect } from 'react';
import { GasAttendanceService } from '../services/GasAttendanceService';
import { RefreshCw, Calendar, LogOut, AlertCircle, Info, BookOpen } from 'lucide-react';
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
    if (value >= 75) return 'bg-green/10';
    if (value >= 65) return 'bg-peach/10';
    return 'bg-red/10';
  };

  const getPercentageSolidBgClass = (value) => {
    if (value >= 75) return 'bg-green';
    if (value >= 65) return 'bg-peach';
    return 'bg-red';
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
        <div className="flex-1 flex flex-col items-center justify-center py-20 animate-fadeIn">
          <div className="w-10 h-10 mb-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-text font-bold text-lg mb-1">Connecting</p>
          <p className="text-sub text-sm">Accessing college database...</p>
        </div>
      );
    }

    if (data) {
      const overall = parseFloat(data.overallPercentage) || 0;
      const belowTargetCount = data.subjects.filter(s => s.percentage < 75).length;
      const colorClass = getPercentageColorClass(overall);
      const bgClass = getPercentageBgClass(overall);
      const solidBgClass = getPercentageSolidBgClass(overall);

      return (
        <div className="flex-1 animate-fadeIn pb-8">
          {/* Minimalist Hero Widget */}
          <div className="p-6 md:p-8 rounded-2xl glass-premium mb-6 shadow-sm relative overflow-hidden">
            <div className="flex items-start justify-between mb-4">
              <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest ${bgClass} ${colorClass}`}>
                {getHeadline(overall)}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleFetch()} 
                  title="Refresh attendance"
                  className="p-2 bg-surface hover:bg-border/30 border border-border/40 rounded-lg transition-all cursor-pointer"
                >
                  <RefreshCw size={16} className="text-sub hover:text-text" />
                </button>
                <button 
                  onClick={disconnect} 
                  title="Disconnect account"
                  className="p-2 bg-surface hover:bg-border/30 border border-border/40 rounded-lg transition-all cursor-pointer"
                >
                  <LogOut size={16} className="text-sub hover:text-red" />
                </button>
              </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-extrabold text-text mb-2 tracking-tight">
              {overall.toFixed(1)}%
            </h1>
            <p className={`text-sm font-semibold ${belowTargetCount > 0 ? 'text-red' : 'text-sub'}`}>
              {getHeroStatusText(belowTargetCount)}
            </p>
            
            {data.studentName && (
              <div className="mt-4 pt-4 border-t border-border/20 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-dim" />
                <span className="text-xs font-bold text-text uppercase tracking-widest">
                  {data.studentName}
                </span>
              </div>
            )}
          </div>

          {/* Subjects Header */}
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-text">Subjects</h2>
            {data.lastUpdated && (
              <span className="text-xs text-dim">
                Updated: {data.lastUpdated}
              </span>
            )}
          </div>

          {/* Subjects List */}
          <div className="space-y-4">
            {data.subjects.map((sub, i) => {
              const subColor = getPercentageColorClass(sub.percentage);
              const subBg = getPercentageBgClass(sub.percentage);
              const solidBg = getPercentageSolidBgClass(sub.percentage);
              const missable = calculateMissable(sub.attendedClasses, sub.totalClasses);
              const needed = calculateNeeded(sub.attendedClasses, sub.totalClasses);
              
              const bufferLine = sub.percentage >= 75
                ? missable === 0 ? 'At the 75% line' : `Can miss ${missable} more class${missable === 1 ? '' : 'es'}`
                : needed === 0 ? 'Needs attention' : `Attend ${needed} more class${needed === 1 ? '' : 'es'} to reach 75%`;

              return (
                <div key={i} className="glass-premium hover:border-primary/30 rounded-xl p-5 shadow-sm space-y-3 hover:scale-[1.01] active:scale-[0.99]">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 shrink-0 rounded-lg ${subBg} flex items-center justify-center`}>
                      <BookOpen className={`w-5 h-5 ${subColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-text font-bold text-base md:text-lg tracking-tight mb-1 leading-snug">
                        {sub.subject}
                      </h3>
                      <p className="text-sub text-xs font-medium">
                        {sub.attendedClasses} / {sub.totalClasses} classes attended
                      </p>
                    </div>
                    <div className={`font-extrabold text-xl md:text-2xl ${subColor}`}>
                      {sub.percentage.toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${solidBg}`} 
                      style={{ width: `${Math.min(100, Math.max(0, sub.percentage))}%` }} 
                    />
                  </div>
                  
                  <p className={`text-xs ${sub.percentage >= 75 ? 'text-sub font-medium' : `${subColor} font-bold`}`}>
                    {bufferLine}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-sub/70">
            <Info size={12} />
            <span className="text-xs font-semibold uppercase tracking-wider">Synced via college database</span>
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={handleFetch} className="w-full max-w-md mx-auto animate-fadeIn">
        <div className="glass-premium shadow-lg rounded-[2rem] p-8 md:p-10 hover:scale-[1.005]">
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary text-bg rounded-2xl flex items-center justify-center shadow-sm mb-6 mx-auto">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold text-text tracking-tight mb-2">Connect Portal</h2>
            <p className="text-sub text-base font-medium">Link your academic identity</p>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex bg-surface/30 border border-border/25 rounded-xl p-1">
                <button 
                  type="button"
                  onClick={() => setCollege('aus')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-[0.96] ${college === 'aus' ? 'bg-primary text-bg shadow-sm' : 'text-sub hover:text-text hover:bg-surface/30'}`}
                >
                  AUS
                </button>
                <button 
                  type="button"
                  onClick={() => setCollege('acet')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-[0.96] ${college === 'acet' ? 'bg-primary text-bg shadow-sm' : 'text-sub hover:text-text hover:bg-surface/30'}`}
                >
                  ACET
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-text text-xs font-bold uppercase tracking-wider ml-1">Roll Number</label>
              <input 
                type="text" 
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                placeholder="e.g. 21A91A0501"
                className="w-full bg-surface/30 hover:bg-surface/50 border border-border/25 focus:border-primary rounded-xl px-4 py-3 text-text text-base outline-none uppercase transition-all placeholder:text-dim active:scale-[0.99]"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-text text-xs font-bold uppercase tracking-wider ml-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface/30 hover:bg-surface/50 border border-border/25 focus:border-primary rounded-xl px-4 py-3 text-text text-base outline-none transition-all placeholder:text-dim active:scale-[0.99]"
                required
              />
            </div>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red/10 border border-red/20 rounded-xl flex items-start gap-3 text-red text-xs animate-fadeIn">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <button 
            type="submit"
            className="w-full rounded-xl py-3.5 px-6 font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 border border-border/40 cursor-pointer bg-primary text-bg hover:scale-[1.015] active:scale-[0.97] disabled:opacity-50 shadow-sm mt-8"
          >
            <span>Connect Portal</span>
            <svg className="w-4 h-4 text-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 font-sans">
      {renderContent()}
    </div>
  );
}

function UserIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
