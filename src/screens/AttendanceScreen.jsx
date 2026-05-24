import { useState, useEffect } from 'react';
import { GasAttendanceService } from '../services/GasAttendanceService';
import { RefreshCw, LogOut, Info, BookOpen } from 'lucide-react';
import UtopiaLoader from '../components/UtopiaLoader';

export default function AttendanceScreen() {
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

  // Typographic visual hierarchy for monochrome layout
  const getPercentageColorClass = (value) => {
    if (value >= 75) return 'text-text font-bold';
    if (value >= 65) return 'text-text font-medium underline decoration-dotted';
    return 'text-text italic font-bold';
  };
  
  const getPercentageBgClass = (value) => {
    if (value >= 75) return 'bg-surface border border-border/30';
    if (value >= 65) return 'bg-surface border border-border/40';
    return 'bg-surface border border-text/60';
  };

  const getPercentageSolidBgClass = () => {
    return 'bg-text'; // Crisp solid black or white bar
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
        <div className="flex-1 flex flex-col items-center justify-center py-24 animate-fadeIn select-none">
          <UtopiaLoader />
          <p className="editorial-text-spaced text-text mt-4 mb-1">Connecting</p>
          <p className="text-dim text-xs font-serif italic">Accessing college database...</p>
        </div>
      );
    }

    if (data) {
      const overall = parseFloat(data.overallPercentage) || 0;
      const belowTargetCount = data.subjects.filter(s => s.percentage < 75).length;
      const colorClass = getPercentageColorClass(overall);
      const bgClass = getPercentageBgClass(overall);

      return (
        <div className="flex-1 animate-fadeIn pb-8">
          {/* Minimalist Hero Widget */}
          <div className="p-6 md:p-8 rounded-none card-premium-mono mb-8 relative overflow-hidden">
            <div className="flex items-start justify-between mb-4">
              <div className={`px-3 py-1 rounded-none text-[10px] font-bold uppercase tracking-widest ${bgClass} ${colorClass}`}>
                {getHeadline(overall)}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleFetch()} 
                  title="Refresh attendance"
                  className="p-2 bg-surface hover:bg-border/20 border border-border/30 rounded-none transition-all cursor-pointer"
                >
                  <RefreshCw size={13} className="text-text" />
                </button>
                <button 
                  onClick={disconnect} 
                  title="Disconnect account"
                  className="p-2 bg-surface hover:bg-border/20 border border-border/30 rounded-none transition-all cursor-pointer"
                >
                  <LogOut size={13} className="text-text" />
                </button>
              </div>
            </div>
            
            <h1 className="tracking-tight select-none flex items-baseline mb-2">
              <span className="font-sans font-black text-5xl md:text-6xl text-text leading-none">{overall.toFixed(0)}</span>
              <span className="font-serif font-light italic text-2xl md:text-3xl text-dim ml-1">.{overall.toFixed(1).split('.')[1]}%</span>
            </h1>
            <p className={`text-xs uppercase tracking-wider font-semibold ${belowTargetCount > 0 ? 'text-text underline decoration-wavy' : 'text-dim'}`}>
              {getHeroStatusText(belowTargetCount)}
            </p>
            
            {data.studentName && (
              <div className="mt-4 pt-4 border-t border-border/20 flex items-center gap-2">
                <UserIcon className="w-3.5 h-3.5 text-dim" />
                <span className="editorial-text-spaced text-[9px] text-text font-bold tracking-widest">
                  {data.studentName}
                </span>
              </div>
            )}
          </div>

          {/* Subjects Header */}
          <div className="flex items-center justify-between mb-4 px-1 select-none">
            <h2 className="editorial-text-spaced text-[10px] text-text font-bold">Subjects List</h2>
            {data.lastUpdated && (
              <span className="text-[10px] uppercase font-medium tracking-wide text-dim">
                Updated: {data.lastUpdated}
              </span>
            )}
          </div>

          {/* Subjects List */}
          <div className="space-y-4 font-sans">
            {data.subjects.map((sub, i) => {
              const subColor = getPercentageColorClass(sub.percentage);
              const solidBg = getPercentageSolidBgClass();
              const missable = calculateMissable(sub.attendedClasses, sub.totalClasses);
              const needed = calculateNeeded(sub.attendedClasses, sub.totalClasses);
              
              const bufferLine = sub.percentage >= 75
                ? missable === 0 ? 'At the 75% line' : `Can miss ${missable} more class${missable === 1 ? '' : 'es'}`
                : needed === 0 ? 'Needs attention' : `Attend ${needed} more class${needed === 1 ? '' : 'es'} to reach 75%`;

              return (
                <div key={i} className="card-premium-mono rounded-none p-5 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 shrink-0 rounded-none bg-surface border border-border/40 flex items-center justify-center text-text">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-text font-serif font-light text-base md:text-[17px] tracking-tight mb-1 leading-snug uppercase">
                        {sub.subject}
                      </h3>
                      <p className="text-dim text-xs font-medium">
                        {sub.attendedClasses} / {sub.totalClasses} classes attended
                      </p>
                    </div>
                    <div className={`font-serif font-light text-xl md:text-2xl ${subColor}`}>
                      {sub.percentage.toFixed(1)}%
                    </div>
                  </div>
                  
                  {/* Progressive Bar */}
                  <div className="h-1 bg-surface rounded-none overflow-hidden">
                    <div 
                      className={`h-full rounded-none transition-all duration-500 ${solidBg}`} 
                      style={{ width: `${Math.min(100, Math.max(0, sub.percentage))}%` }} 
                    />
                  </div>
                  
                  <p className={`text-xs ${sub.percentage >= 75 ? 'text-dim font-medium' : 'text-text font-semibold italic'}`}>
                    // {bufferLine}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-12 flex items-center justify-center gap-2 text-dim select-none">
            <Info size={12} />
            <span className="editorial-text-spaced text-[9px] font-semibold">Synced via college database</span>
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={handleFetch} className="w-full max-w-md mx-auto animate-fadeIn select-none font-sans">
        <div className="card-premium-mono rounded-none p-8 md:p-10">
          
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-text text-bg rounded-none flex items-center justify-center mb-5 mx-auto border border-border">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="tracking-tight mb-1 select-none">
              <span className="font-sans font-black uppercase text-xl tracking-wider text-text mr-1.5">Connect</span>
              <span className="font-serif font-light italic text-2xl text-dim lowercase">portal</span>
            </h2>
            <p className="editorial-text-spaced text-dim text-[9px] tracking-[0.2em]">Link your academic identity</p>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex bg-surface border border-border/80 p-0.5 rounded-none">
                <button 
                  type="button"
                  onClick={() => setCollege('aus')}
                  className={`flex-grow py-2 text-[10px] font-bold uppercase tracking-[0.2em] rounded-none transition-colors cursor-pointer text-center ${college === 'aus' ? 'bg-text text-bg' : 'text-sub hover:text-text'}`}
                >
                  AUS
                </button>
                <button 
                  type="button"
                  onClick={() => setCollege('acet')}
                  className={`flex-grow py-2 text-[10px] font-bold uppercase tracking-[0.2em] rounded-none transition-colors cursor-pointer text-center ${college === 'acet' ? 'bg-text text-bg' : 'text-sub hover:text-text'}`}
                >
                  ACET
                </button>
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="block text-text text-[9px] font-bold uppercase tracking-widest ml-1">Roll Number</label>
              <input 
                type="text" 
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                placeholder="e.g. 21A91A0501"
                className="w-full bg-transparent border border-border/60 focus:border-text rounded-none px-4 py-2.5 text-xs font-semibold text-text focus:outline-none uppercase tracking-wider transition-colors placeholder:text-dim/50"
                required
              />
            </div>
            
            <div className="space-y-1">
              <label className="block text-text text-[9px] font-bold uppercase tracking-widest ml-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent border border-border/60 focus:border-text rounded-none px-4 py-2.5 text-xs font-semibold text-text focus:outline-none transition-colors placeholder:text-dim/50"
                required
              />
            </div>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-transparent border border-border rounded-none flex items-start gap-3 text-text text-xs animate-fadeIn font-serif italic">
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <button 
            type="submit"
            className="w-full btn-premium-mono py-3.5 px-6 flex items-center justify-center gap-2 border border-border cursor-pointer mt-8"
          >
            <span className="editorial-text-spaced text-bg">Connect Portal</span>
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
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
