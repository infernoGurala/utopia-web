import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Users, BookOpen, ClipboardCheck, Zap, User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function WebLayout() {
  const { signOut } = useAuth();
  
  return (
    <div className="min-h-screen bg-bg flex">
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-surface/30 border-r border-border/40 flex flex-col p-6 sticky top-0 h-screen overflow-y-auto">
        <div className="mb-12">
          <h1 className="font-playfair italic text-4xl font-bold text-primary" style={{ textShadow: '0 2px 10px rgba(203,166,247,0.2)' }}>
            Utopia
          </h1>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem to="/app/community" icon={<Users size={20} />} label="Community Notes" />
          <NavItem to="/app/classes" icon={<BookOpen size={20} />} label="Classes" />
          <NavItem to="/app/attendance" icon={<ClipboardCheck size={20} />} label="Attendance" />
          <NavItem to="/app/sciwordle" icon={<Zap size={20} />} label="Sciwordle" />
        </nav>

        <div className="pt-8 border-t border-border/40 mt-auto space-y-2">
          <NavItem to="/app/profile" icon={<User size={20} />} label="Profile" />
          <button 
            onClick={signOut}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-dim hover:text-red hover:bg-red/10 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium text-[15px]">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto h-screen">
        <div className="max-w-6xl mx-auto p-8 lg:p-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, icon, label }) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);

  return (
    <NavLink 
      to={to} 
      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 ${
        isActive 
          ? 'bg-primary/10 text-primary font-semibold shadow-[inset_4px_0_0_var(--primary)]' 
          : 'text-sub hover:text-text hover:bg-surface/50 font-medium'
      }`}
    >
      <div className={isActive ? 'text-primary' : 'text-dim'}>
        {icon}
      </div>
      <span className="text-[15px]">{label}</span>
    </NavLink>
  );
}
