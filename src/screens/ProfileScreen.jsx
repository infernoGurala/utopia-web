import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Settings, Shield, Bell, Palette, CheckCircle2, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { themes } from '../theme/themes';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { currentThemeId } = useTheme();
  const [updatingTheme, setUpdatingTheme] = useState(false);
  const [isThemeExpanded, setIsThemeExpanded] = useState(true); // Open by default for easier go-to theme selection

  const handleThemeChange = async (themeKey) => {
    if (!user || updatingTheme) return;
    setUpdatingTheme(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { themeAccent: themeKey });
    } catch (error) {
      console.error('Error updating theme:', error);
    } finally {
      setUpdatingTheme(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 font-sans animate-fadeIn">
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-text mb-2">Profile</h1>
        <p className="text-sub text-base">Configure your personal preferences, look-and-feel, and university credentials.</p>
      </div>
      
      {/* Profile Header */}
      <div className="glass-premium rounded-2xl p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start mb-8 shadow-sm hover:scale-[1.01] duration-300">
        <div className="w-20 h-20 bg-surface border border-border/60 rounded-xl flex items-center justify-center shrink-0">
          <User size={36} className="text-primary" />
        </div>
        <div className="flex-1 text-center sm:text-left space-y-1">
          <h2 className="text-2xl font-extrabold text-text leading-tight">{user?.displayName || 'Student User'}</h2>
          <p className="text-sub text-sm font-semibold mb-4">{user?.email || 'student@university.edu'}</p>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-2">
            <span className="px-3 py-1 bg-teal/10 text-teal border border-teal/20 rounded-lg text-xs font-semibold uppercase tracking-wider">
              Writer Access
            </span>
          </div>
        </div>
      </div>

      {/* Theme Selector */}
      <div className="mb-8 glass-premium rounded-2xl shadow-sm overflow-hidden">
        <button 
          className="w-full flex items-center justify-between p-5 hover:bg-surface/30 transition-colors"
          onClick={() => setIsThemeExpanded(!isThemeExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-primary border border-border/40">
              <Palette size={18} />
            </div>
            <div className="text-left">
              <h2 className="text-base font-bold text-text">Interface Appearance</h2>
              <p className="text-sub text-xs font-medium mt-0.5">
                {isThemeExpanded ? 'Select a visual environment' : `Current: ${currentThemeId?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Default'}`}
              </p>
            </div>
          </div>
          <div className={`w-8 h-8 flex items-center justify-center text-dim transition-all duration-200 ${isThemeExpanded ? 'rotate-180' : ''}`}>
            <ChevronDown size={18} />
          </div>
        </button>

        {isThemeExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5 pt-0 animate-fadeIn border-t border-border/10">
            {Object.keys(themes).map((themeKey) => {
              const themeObj = themes[themeKey];
              const isSelected = currentThemeId === themeKey;
              const label = themeKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

              return (
                <button
                  key={themeKey}
                  onClick={() => handleThemeChange(themeKey)}
                  disabled={updatingTheme}
                  className={`relative overflow-hidden rounded-xl border text-left cursor-pointer shadow-sm transition-all duration-200 hover:scale-[1.015] active:scale-[0.98] ${isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border/40 hover:border-border hover:bg-surface/30'}`}
                  style={{ backgroundColor: themeObj.bg }}
                >
                  {/* Theme Preview Card */}
                  <div className="p-4 border-b border-border/20" style={{ backgroundColor: themeObj.bg }}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeObj.red }}></div>
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeObj.gold }}></div>
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeObj.green }}></div>
                      </div>
                      {isSelected && <CheckCircle2 size={16} style={{ color: themeObj.primary }} />}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="w-3/4 h-2 rounded-full" style={{ backgroundColor: themeObj.text, opacity: 0.8 }}></div>
                      <div className="w-1/2 h-2 rounded-full" style={{ backgroundColor: themeObj.sub, opacity: 0.6 }}></div>
                      <div className="mt-4 flex gap-1.5 pt-1">
                        <div className="w-full h-6 rounded-md opacity-80" style={{ backgroundColor: themeObj.primary }}></div>
                        <div className="w-8 h-6 rounded-md opacity-80" style={{ backgroundColor: themeObj.surface }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Theme Label */}
                  <div className="p-3" style={{ backgroundColor: themeObj.card }}>
                    <h3 className="font-bold text-xs" style={{ color: themeObj.text }}>
                      {label}
                    </h3>
                    <p className="text-[10px] uppercase font-bold tracking-wider mt-0.5" style={{ color: themeObj.sub }}>
                      {themeObj.isDark ? 'Dark Theme' : 'Light Theme'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-premium rounded-xl p-5 flex items-center gap-4 cursor-pointer shadow-sm hover:scale-[1.015] active:scale-[0.98] hover:border-primary/30">
          <div className="w-10 h-10 bg-surface/50 rounded-lg flex items-center justify-center text-primary shrink-0 border border-border/30">
            <Settings size={18} />
          </div>
          <div>
            <h3 className="text-text font-bold text-sm tracking-tight">Account Settings</h3>
            <p className="text-sub text-[11px] font-semibold mt-0.5">Password and security</p>
          </div>
        </div>
        <div className="glass-premium rounded-xl p-5 flex items-center gap-4 cursor-pointer shadow-sm hover:scale-[1.015] active:scale-[0.98] hover:border-peach/30">
          <div className="w-10 h-10 bg-surface/50 rounded-lg flex items-center justify-center text-peach shrink-0 border border-border/30">
            <Bell size={18} />
          </div>
          <div>
            <h3 className="text-text font-bold text-sm tracking-tight">Notifications</h3>
            <p className="text-sub text-[11px] font-semibold mt-0.5">Manage system alerts</p>
          </div>
        </div>
        <div className="glass-premium rounded-xl p-5 flex items-center gap-4 cursor-pointer shadow-sm hover:scale-[1.015] active:scale-[0.98] hover:border-red/30">
          <div className="w-10 h-10 bg-surface/50 rounded-lg flex items-center justify-center text-red shrink-0 border border-border/30">
            <Shield size={18} />
          </div>
          <div>
            <h3 className="text-text font-bold text-sm tracking-tight">Privacy Center</h3>
            <p className="text-sub text-[11px] font-semibold mt-0.5">Data privacy controls</p>
          </div>
        </div>
      </div>
    </div>
  );
}
