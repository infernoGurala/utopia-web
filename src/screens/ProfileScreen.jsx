import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Settings, Shield, Bell, Palette, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { themes } from '../theme/themes';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { currentThemeId, changeTheme } = useTheme();
  const [updatingTheme, setUpdatingTheme] = useState(false);
  const [isThemeExpanded, setIsThemeExpanded] = useState(true); // Open by default for easier go-to theme selection

  const handleThemeChange = async (themeKey) => {
    if (updatingTheme) return;
    setUpdatingTheme(true);
    try {
      await changeTheme(themeKey);
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
        <h1 className="text-3xl md:text-4xl tracking-tight leading-none mb-2 select-none">
          <span className="font-serif font-light uppercase text-2xl md:text-3xl tracking-tight mr-2">User</span>
          <span className="font-serif font-light italic text-3xl md:text-4xl text-dim lowercase">profile</span>
        </h1>
        <p className="text-sub text-sm">Configure your personal preferences, look-and-feel, and university credentials.</p>
      </div>

      {/* Profile Header */}
      <div className="card-premium-mono rounded-none p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start mb-8 transition-colors">
        <div className="w-20 h-20 bg-surface border border-border/50 rounded-none flex items-center justify-center shrink-0">
          <User size={30} className="text-text" />
        </div>
        <div className="flex-1 text-center sm:text-left space-y-1">
          <h2 className="text-2xl font-serif font-light text-text uppercase tracking-tight leading-tight">{user?.displayName || 'Student User'}</h2>
          <p className="text-dim text-xs font-semibold uppercase tracking-wider mb-4">{user?.email || 'student@university.edu'}</p>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-2 select-none">
            <span className="px-3 py-1 border border-text text-text rounded-none text-[9px] font-bold uppercase tracking-[0.15em]">
              Writer Access
            </span>
          </div>
        </div>
      </div>

      {/* Theme Selector */}
      <div className="mb-8 bg-surface border border-border rounded-none overflow-hidden">
        <button 
          className="w-full flex items-center justify-between p-5 hover:bg-surface/30 transition-colors"
          onClick={() => setIsThemeExpanded(!isThemeExpanded)}
        >
          <div className="flex items-center gap-3 select-none">
            <div className="w-10 h-10 rounded-none bg-surface flex items-center justify-center text-text border border-border">
              <Palette size={16} />
            </div>
            <div className="text-left">
              <h2 className="tracking-tight select-none flex items-baseline">
                <span className="font-sans font-black text-[10px] uppercase tracking-[0.2em] text-text mr-1.5">Interface</span>
                <span className="font-serif font-light italic text-xs text-dim lowercase">appearance</span>
              </h2>
              <p className="text-sub text-[10px] font-medium mt-0.5 font-serif italic">
                {isThemeExpanded ? 'Select a visual environment' : `Current: ${currentThemeId?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Default'}`}
              </p>
            </div>
          </div>
          <div className={`w-8 h-8 flex items-center justify-center text-dim transition-all duration-200 ${isThemeExpanded ? 'rotate-180' : ''}`}>
            <ChevronDown size={18} />
          </div>
        </button>

        {isThemeExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 pt-0 animate-fadeIn border-t border-border/10 max-w-2xl font-sans">
            {Object.keys(themes).map((themeKey) => {
              const themeObj = themes[themeKey];
              const isSelected = currentThemeId === themeKey;
              const label = themeKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

              return (
                <button
                  key={themeKey}
                  onClick={() => handleThemeChange(themeKey)}
                  disabled={updatingTheme}
                  className={`relative overflow-hidden rounded-none border text-left cursor-pointer transition-all duration-200 hover:scale-[1.01] ${isSelected ? 'border-text ring-1 ring-text/30' : 'border-border/30 hover:border-text hover:bg-surface/30'}`}
                  style={{ backgroundColor: themeObj.bg }}
                >
                  {/* Theme Preview Card */}
                  <div className="p-4 border-b border-border/20 select-none" style={{ backgroundColor: themeObj.bg }}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-none border border-border" style={{ backgroundColor: themeObj.red }}></div>
                        <div className="w-2.5 h-2.5 rounded-none border border-border" style={{ backgroundColor: themeObj.gold }}></div>
                        <div className="w-2.5 h-2.5 rounded-none border border-border" style={{ backgroundColor: themeObj.green }}></div>
                      </div>
                      {isSelected && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border border-text text-text bg-bg select-none">
                          Active
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="w-3/4 h-2 rounded-none" style={{ backgroundColor: themeObj.text, opacity: 0.8 }}></div>
                      <div className="w-1/2 h-2 rounded-none" style={{ backgroundColor: themeObj.sub, opacity: 0.6 }}></div>
                      <div className="mt-4 flex gap-1.5 pt-1">
                        <div className="w-full h-5 rounded-none opacity-80" style={{ backgroundColor: themeObj.primary }}></div>
                        <div className="w-8 h-5 rounded-none opacity-80" style={{ backgroundColor: themeObj.surface }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Theme Label */}
                  <div className="p-3 border-t border-border/25" style={{ backgroundColor: themeObj.card }}>
                    <h3 className="font-black text-[10px] uppercase tracking-[0.2em]" style={{ color: themeObj.text }}>
                      {label}
                    </h3>
                    <p className="text-[8px] uppercase font-bold tracking-[0.2em] mt-1" style={{ color: themeObj.sub }}>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans select-none">
        <div className="card-premium-mono rounded-none p-5 flex items-center gap-4 cursor-pointer">
          <div className="w-10 h-10 bg-surface/50 rounded-none flex items-center justify-center text-text shrink-0 border border-border/40">
            <Settings size={16} />
          </div>
          <div>
            <h3 className="text-text font-bold text-[10px] uppercase tracking-[0.15em]">Account</h3>
            <p className="text-dim text-[9px] font-semibold tracking-wider uppercase mt-0.5">Credentials</p>
          </div>
        </div>
        
        <div className="card-premium-mono rounded-none p-5 flex items-center gap-4 cursor-pointer">
          <div className="w-10 h-10 bg-surface/50 rounded-none flex items-center justify-center text-text shrink-0 border border-border/40">
            <Bell size={16} />
          </div>
          <div>
            <h3 className="text-text font-bold text-[10px] uppercase tracking-[0.15em]">Alerts</h3>
            <p className="text-dim text-[9px] font-semibold tracking-wider uppercase mt-0.5">Notifications</p>
          </div>
        </div>
        
        <div className="card-premium-mono rounded-none p-5 flex items-center gap-4 cursor-pointer">
          <div className="w-10 h-10 bg-surface/50 rounded-none flex items-center justify-center text-text shrink-0 border border-border/40">
            <Shield size={16} />
          </div>
          <div>
            <h3 className="text-text font-bold text-[10px] uppercase tracking-[0.15em]">Privacy</h3>
            <p className="text-dim text-[9px] font-semibold tracking-wider uppercase mt-0.5">Data Controls</p>
          </div>
        </div>
      </div>
    </div>
  );
}
