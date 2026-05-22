import { NavLink, Outlet } from 'react-router-dom';
import { BookOpen, ClipboardCheck, User, LogOut, Flame } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function WebLayout() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row relative font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-surface border-r border-border/80 flex-col p-6 shrink-0 h-screen sticky top-0">
        <div className="mb-12 px-2">
          <h1 className="text-2xl font-extrabold text-text tracking-tighter">
            utopia<span className="text-primary font-medium">.</span>
          </h1>
        </div>

        <nav className="flex-1 space-y-1">
          <NavItem to="/app/notes" icon={<BookOpen size={18} />} label="Notebooks" />
          <NavItem to="/app/attendance" icon={<ClipboardCheck size={18} />} label="Presence" />
          <NavItem to="/app/focus" icon={<Flame size={18} />} label="Focus" />
          <NavItem to="/app/profile" icon={<User size={18} />} label="Profile" />
        </nav>

        <div className="pt-4 border-t border-border/30">
          <button 
            onClick={signOut}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-red hover:bg-red/10 font-bold transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] text-left"
          >
            <LogOut size={18} />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-6 py-4 bg-surface border-b border-border/60">
          <h1 className="text-xl font-extrabold tracking-tighter text-text">
            utopia<span className="text-primary font-medium">.</span>
          </h1>
          <button onClick={signOut} className="p-2 text-dim hover:text-red transition-all bg-bg border border-border/40 rounded-xl cursor-pointer active:scale-90">
            <LogOut size={16} />
          </button>
        </header>

        <main className="flex-1 p-5 md:p-8 lg:p-10 overflow-y-auto pb-28 md:pb-10">
          <div className="max-w-4xl mx-auto animate-fadeIn">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Premium Floating Bottom Navigation Dock (Mobile) */}
      <div className="md:hidden fixed bottom-5 left-4 right-4 bg-surface/85 backdrop-blur-lg border border-border/50 px-4 py-2.5 rounded-2xl flex justify-around items-center z-50 shadow-lg shadow-black/5 animate-fadeIn">
        <MobileNavItem to="/app/notes" icon={<BookOpen size={18} />} label="Notes" />
        <MobileNavItem to="/app/attendance" icon={<ClipboardCheck size={18} />} label="Presence" />
        <MobileNavItem to="/app/focus" icon={<Flame size={18} />} label="Focus" />
        <MobileNavItem to="/app/profile" icon={<User size={18} />} label="Profile" />
      </div>
    </div>
  );
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => 
        `flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
          isActive 
            ? 'bg-primary text-bg shadow-md shadow-primary/10' 
            : 'text-sub hover:text-text hover:bg-bg/60'
        }`
      }
    >
      {icon}
      <span className="text-sm">{label}</span>
    </NavLink>
  );
}

function MobileNavItem({ to, icon, label }) {
  return (
    <NavLink 
      to={to} 
      className="relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer active:scale-[0.92]"
    >
      {({ isActive }) => (
        <>
          <div className={`mb-0.5 transition-colors ${isActive ? 'text-primary' : 'text-dim'}`}>{icon}</div>
          <span className={`text-[10px] tracking-wide transition-colors ${isActive ? 'text-primary font-bold' : 'text-dim'}`}>{label}</span>
          {isActive && (
            <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary animate-fadeIn" />
          )}
        </>
      )}
    </NavLink>
  );
}
