import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Settings, Shield, Bell, Palette, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { themes } from '../theme/themes';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { currentThemeId } = useTheme();
  const [updatingTheme, setUpdatingTheme] = useState(false);

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
    <div className="max-w-4xl">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-text mb-2">Profile</h1>
        <p className="text-sub text-lg">Manage your personal information and preferences.</p>
      </div>
      
      {/* Profile Header */}
      <div className="bg-surface/30 border border-border/40 rounded-3xl p-8 flex flex-col md:flex-row gap-8 items-center md:items-start mb-12">
        <div className="w-32 h-32 bg-primary/20 rounded-full flex items-center justify-center border-4 border-surface shadow-xl">
          <User size={64} className="text-primary" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-3xl font-bold text-text mb-2">{user?.displayName || 'Student'}</h2>
          <p className="text-sub text-lg mb-6">{user?.email || 'student@university.edu'}</p>
          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            <span className="px-4 py-2 bg-teal/10 text-teal rounded-full text-sm font-medium border border-teal/20">Writer Access</span>
          </div>
        </div>
      </div>

      {/* Theme Selector */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Palette size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text">Appearance</h2>
            <p className="text-sub">Customize the look and feel of your workspace.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.keys(themes).map((themeKey) => {
            const themeObj = themes[themeKey];
            const isSelected = currentThemeId === themeKey;
            
            // Extract a readable label from the key
            const label = themeKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            return (
              <button
                key={themeKey}
                onClick={() => handleThemeChange(themeKey)}
                disabled={updatingTheme}
                className={`relative overflow-hidden group rounded-2xl border text-left transition-all duration-300 ${isSelected ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]' : 'border-border/40 hover:border-border hover:bg-surface/30'}`}
                style={{ backgroundColor: isSelected ? themeObj.surface : themeObj.bg }}
              >
                {/* Theme Preview Card */}
                <div className="p-4 border-b border-border/20" style={{ backgroundColor: themeObj.bg }}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: themeObj.red }}></div>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: themeObj.gold }}></div>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: themeObj.green }}></div>
                    </div>
                    {isSelected && <CheckCircle2 size={20} style={{ color: themeObj.primary }} />}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="w-3/4 h-3 rounded-full" style={{ backgroundColor: themeObj.text }}></div>
                    <div className="w-1/2 h-2.5 rounded-full" style={{ backgroundColor: themeObj.sub }}></div>
                    <div className="mt-4 flex gap-2">
                      <div className="w-full h-8 rounded-lg opacity-80" style={{ backgroundColor: themeObj.primary }}></div>
                      <div className="w-10 h-8 rounded-lg opacity-80" style={{ backgroundColor: themeObj.surface }}></div>
                    </div>
                  </div>
                </div>

                {/* Theme Label */}
                <div className="p-4" style={{ backgroundColor: themeObj.card }}>
                  <h3 className="font-bold text-[15px] flex items-center justify-between" style={{ color: themeObj.text }}>
                    {label}
                  </h3>
                  <p className="text-xs mt-1" style={{ color: themeObj.sub }}>
                    {themeObj.isDark ? 'Dark Mode' : 'Light Mode'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface/20 border border-border/30 rounded-2xl p-6 cursor-pointer hover:bg-surface/40 transition-colors flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Settings size={24} /></div>
          <div>
            <h3 className="text-text font-semibold">Account Settings</h3>
            <p className="text-sub text-sm">Update your password and email</p>
          </div>
        </div>
        <div className="bg-surface/20 border border-border/30 rounded-2xl p-6 cursor-pointer hover:bg-surface/40 transition-colors flex items-center gap-4">
          <div className="w-12 h-12 bg-peach/10 rounded-xl flex items-center justify-center text-peach"><Bell size={24} /></div>
          <div>
            <h3 className="text-text font-semibold">Notifications</h3>
            <p className="text-sub text-sm">Manage email alerts</p>
          </div>
        </div>
        <div className="bg-surface/20 border border-border/30 rounded-2xl p-6 cursor-pointer hover:bg-surface/40 transition-colors flex items-center gap-4">
          <div className="w-12 h-12 bg-red/10 rounded-xl flex items-center justify-center text-red"><Shield size={24} /></div>
          <div>
            <h3 className="text-text font-semibold">Privacy</h3>
            <p className="text-sub text-sm">Control your data visibility</p>
          </div>
        </div>
      </div>
    </div>
  );
}
