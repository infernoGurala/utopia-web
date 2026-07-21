import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Settings, Shield, Bell, Palette, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { themes } from '../theme/themes';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { currentThemeId, changeTheme } = useTheme();
  const [updatingTheme, setUpdatingTheme] = useState(false);
  const [isThemeExpanded, setIsThemeExpanded] = useState(true);

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
    <div className="max-w-4xl mx-auto py-4 font-sans">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text mb-1 select-none">
          User Profile
        </h1>
        <p className="text-sub text-sm">Configure your personal preferences, look-and-feel, and account details.</p>
      </div>

      {/* Profile Header */}
      <div className="card-premium-mono rounded p-5 flex flex-col sm:flex-row gap-5 items-center sm:items-start mb-6">
        <div className="w-16 h-16 bg-surface border border-border rounded flex items-center justify-center shrink-0">
          <User size={28} className="text-text" />
        </div>
        <div className="flex-1 text-center sm:text-left space-y-1">
          <h2 className="text-xl font-bold text-text">{user?.displayName || 'Student User'}</h2>
          <p className="text-sub text-sm mb-3">{user?.email || 'student@university.edu'}</p>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start select-none">
            <span className="px-2.5 py-0.5 border border-border text-sub rounded text-xs font-medium">
              Writer Access
            </span>
          </div>
        </div>
      </div>

      {/* Theme Selector */}
      <div className="mb-6 bg-card border border-border rounded overflow-hidden">
        <button 
          className="w-full flex items-center justify-between p-4 hover:bg-surface/50 transition-colors"
          onClick={() => setIsThemeExpanded(!isThemeExpanded)}
        >
          <div className="flex items-center gap-3 select-none">
            <div className="w-9 h-9 rounded bg-surface flex items-center justify-center text-text border border-border">
              <Palette size={16} />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-semibold text-text">
                Interface Appearance
              </h2>
              <p className="text-sub text-xs mt-0.5">
                {isThemeExpanded ? 'Select a visual theme' : `Current: ${currentThemeId?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Default'}`}
              </p>
            </div>
          </div>
          <div className={`w-6 h-6 flex items-center justify-center text-sub transition-transform duration-200 ${isThemeExpanded ? 'rotate-180' : ''}`}>
            <ChevronDown size={16} />
          </div>
        </button>

        {isThemeExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 pt-0 border-t border-border font-sans">
            {Object.keys(themes).map((themeKey) => {
              const themeObj = themes[themeKey];
              const isSelected = currentThemeId === themeKey;
              const label = themeKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

              return (
                <button
                  key={themeKey}
                  onClick={() => handleThemeChange(themeKey)}
                  disabled={updatingTheme}
                  className={`relative overflow-hidden rounded border text-left cursor-pointer transition-colors ${isSelected ? 'border-text ring-1 ring-text' : 'border-border hover:border-text'}`}
                  style={{ backgroundColor: themeObj.bg }}
                >
                  {/* Theme Preview Card */}
                  <div className="p-3 border-b border-border/20 select-none" style={{ backgroundColor: themeObj.bg }}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full border border-border" style={{ backgroundColor: themeObj.red }}></div>
                        <div className="w-2 h-2 rounded-full border border-border" style={{ backgroundColor: themeObj.gold }}></div>
                        <div className="w-2 h-2 rounded-full border border-border" style={{ backgroundColor: themeObj.green }}></div>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 border border-text text-text bg-bg select-none">
                          Active
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="w-3/4 h-1.5 rounded" style={{ backgroundColor: themeObj.text, opacity: 0.8 }}></div>
                      <div className="w-1/2 h-1.5 rounded" style={{ backgroundColor: themeObj.sub, opacity: 0.6 }}></div>
                    </div>
                  </div>

                  {/* Theme Label */}
                  <div className="p-3 border-t border-border/25" style={{ backgroundColor: themeObj.card }}>
                    <h3 className="font-semibold text-xs" style={{ color: themeObj.text }}>
                      {label}
                    </h3>
                    <p className="text-[10px] mt-0.5" style={{ color: themeObj.sub }}>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans select-none">
        <div className="card-premium-mono rounded p-4 flex items-center gap-3 cursor-pointer">
          <div className="w-9 h-9 bg-surface rounded flex items-center justify-center text-text shrink-0 border border-border">
            <Settings size={16} />
          </div>
          <div>
            <h3 className="text-text font-semibold text-xs">Account</h3>
            <p className="text-sub text-xs mt-0.5">Credentials</p>
          </div>
        </div>
        
        <div className="card-premium-mono rounded p-4 flex items-center gap-3 cursor-pointer">
          <div className="w-9 h-9 bg-surface rounded flex items-center justify-center text-text shrink-0 border border-border">
            <Bell size={16} />
          </div>
          <div>
            <h3 className="text-text font-semibold text-xs">Alerts</h3>
            <p className="text-sub text-xs mt-0.5">Notifications</p>
          </div>
        </div>
        
        <div className="card-premium-mono rounded p-4 flex items-center gap-3 cursor-pointer">
          <div className="w-9 h-9 bg-surface rounded flex items-center justify-center text-text shrink-0 border border-border">
            <Shield size={16} />
          </div>
          <div>
            <h3 className="text-text font-semibold text-xs">Privacy</h3>
            <p className="text-sub text-xs mt-0.5">Data Controls</p>
          </div>
        </div>
      </div>
    </div>
  );
}
