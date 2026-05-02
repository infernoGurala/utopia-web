import { useAuth } from '../contexts/AuthContext';
import { User, Settings, Shield, Bell } from 'lucide-react';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  
  return (
    <div className="max-w-3xl">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-text mb-2">Profile</h1>
        <p className="text-sub text-lg">Manage your personal information and preferences.</p>
      </div>
      
      <div className="bg-surface/30 border border-border/40 rounded-3xl p-8 flex flex-col md:flex-row gap-8 items-center md:items-start mb-8">
        <div className="w-32 h-32 bg-primary/20 rounded-full flex items-center justify-center border-4 border-surface shadow-xl">
          <User size={64} className="text-primary" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-3xl font-bold text-text mb-2">{user?.displayName || 'Student'}</h2>
          <p className="text-sub text-lg mb-6">{user?.email || 'student@university.edu'}</p>
          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            <span className="px-4 py-2 bg-teal/10 text-teal rounded-full text-sm font-medium border border-teal/20">Writer Access</span>
            <span className="px-4 py-2 bg-blue/10 text-blue rounded-full text-sm font-medium border border-blue/20">CS Department</span>
          </div>
        </div>
      </div>

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
