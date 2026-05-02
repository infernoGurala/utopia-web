import { useState, useEffect } from 'react';
import { GasAttendanceService } from '../services/GasAttendanceService';
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
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
    e.preventDefault();
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

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sub font-medium">Fetching attendance...</p>
        </div>
      );
    }

    if (data) {
      return (
        <div className="flex-1 overflow-y-auto pb-8">
          <div className="bg-surface border border-border/40 rounded-2xl p-6 mb-6 text-center">
            <h2 className="text-text font-semibold text-lg mb-1">{data.studentName}</h2>
            <div className="text-4xl font-bold text-primary mb-2">{data.overallPercentage}%</div>
            <p className="text-sub text-sm">Overall Attendance</p>
            <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-border/30">
              <div className="text-center">
                <span className="block text-text font-bold text-lg">{data.totalClasses}</span>
                <span className="text-dim text-xs">Total Held</span>
              </div>
              <div className="text-center">
                <span className="block text-green font-bold text-lg">{data.totalAttended}</span>
                <span className="text-dim text-xs">Attended</span>
              </div>
            </div>
          </div>

          <h3 className="text-text font-semibold mb-4 px-1">Subject Breakdown</h3>
          <div className="space-y-3">
            {data.subjects.map((sub, i) => (
              <div key={i} className="bg-surface/50 border border-border/30 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-text font-medium text-sm pr-4 truncate">{sub.subject}</span>
                  <span className={`font-bold ${sub.percentage >= 75 ? 'text-green' : sub.percentage >= 65 ? 'text-peach' : 'text-red'}`}>
                    {sub.percentage}%
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 flex-1 bg-bg rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${sub.percentage >= 75 ? 'bg-green' : sub.percentage >= 65 ? 'bg-peach' : 'bg-red'}`} 
                      style={{ width: `${Math.min(100, Math.max(0, sub.percentage))}%` }} 
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs text-dim">
                  <span>Held: {sub.totalClasses}</span>
                  <span>Attended: {sub.attendedClasses}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={handleFetch} className="flex-1 flex flex-col justify-center">
        <div className="bg-surface border border-border/40 rounded-2xl p-6">
          <h2 className="text-text font-semibold mb-6 flex items-center gap-2">
            <CheckCircle2 size={20} className="text-teal" />
            Connect Portal
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sub text-xs mb-1.5">College</label>
              <select 
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="w-full bg-bg border border-border/50 rounded-xl px-4 py-3 text-text text-sm focus:border-primary outline-none"
              >
                <option value="aus">Aditya University (AUS)</option>
                <option value="acet">Aditya College of Engineering & Technology (ACET)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sub text-xs mb-1.5">Roll Number</label>
              <input 
                type="text" 
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                placeholder="e.g. 21A91A0501"
                className="w-full bg-bg border border-border/50 rounded-xl px-4 py-3 text-text text-sm focus:border-primary outline-none uppercase"
                required
              />
            </div>
            
            <div>
              <label className="block text-sub text-xs mb-1.5">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Portal Password"
                className="w-full bg-bg border border-border/50 rounded-xl px-4 py-3 text-text text-sm focus:border-primary outline-none"
                required
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red/10 border border-red/20 rounded-xl flex items-start gap-2 text-red text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-primary text-bg font-semibold py-3.5 rounded-xl mt-6 hover:bg-primary/90 transition-colors"
          >
            Fetch Attendance
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-text mb-2">Attendance</h1>
        <p className="text-sub text-lg">Check your college attendance and subject breakdown.</p>
      </div>

      <div className="bg-surface/20 border border-border/40 rounded-3xl p-6 lg:p-10">
        <div className="max-w-lg mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
