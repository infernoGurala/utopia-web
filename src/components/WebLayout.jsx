import { NavLink, Outlet } from 'react-router-dom';
import { BookOpen, ClipboardCheck, User, LogOut, Rocket } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function WebLayout() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row relative font-sans">
      
      {/* Desktop Sidebar - Premium Gallery Guide Aesthetic */}
      <aside className="hidden md:flex md:w-64 bg-surface border-r border-border/80 flex-col p-6 shrink-0 h-screen sticky top-0">
        
        {/* Brand Header */}
        <div className="mb-14 px-2 select-none">
          <h1 className="text-3xl font-serif font-light text-text uppercase tracking-tighter leading-none">
            Utopia
          </h1>
          <span className="editorial-text-spaced text-dim text-[8px] tracking-[0.3em] block mt-1">
            ACADEMIA DOCK
          </span>
        </div>

        {/* Index Navigation */}
        <nav className="flex-1 space-y-2">
          <NavItem to="/app/notes" index="01" label="Notebooks" />
          <NavItem to="/app/attendance" index="02" label="Presence" />
          <NavItem to="/app/focus" index="03" label="Rockets" />
          <NavItem to="/app/profile" index="04" label="Profile" />
        </nav>

        {/* Bottom User Area */}
        <div className="pt-4 border-t border-border/40">
          <button 
            onClick={signOut}
            className="flex w-full items-center justify-between px-4 py-3 bg-transparent border border-border/30 hover:border-text hover:bg-text hover:text-bg text-text transition-all duration-200 cursor-pointer font-sans"
          >
            <span className="editorial-text-spaced text-[9px] tracking-[0.2em] font-medium transition-colors">Sign Out</span>
            <LogOut size={13} className="shrink-0" />
          </button>
        </div>

      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-6 py-4 bg-surface border-b border-border/60">
          <div>
            <h1 className="text-xl font-serif font-light text-text uppercase tracking-tighter">
              Utopia
            </h1>
            <span className="text-[7px] tracking-[0.25em] text-dim block uppercase font-light font-sans">
              Academia
            </span>
          </div>
          <button onClick={signOut} className="p-2 text-text hover:bg-text hover:text-bg border border-border/30 rounded-lg transition-all cursor-pointer">
            <LogOut size={13} />
          </button>
        </header>

        {/* Main Content Container */}
        <main className="flex-1 p-5 md:p-8 lg:p-12 overflow-y-auto pb-28 md:pb-12">
          <div className="max-w-4xl mx-auto animate-fadeIn">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Premium Floating Bottom Navigation Dock (Mobile) */}
      <div className="md:hidden fixed bottom-6 left-6 right-6 glass-pill-premium border px-4 py-3 rounded-full flex justify-around items-center z-50 animate-fadeIn shadow-2xl">
        <MobileNavItem to="/app/notes" icon={<BookOpen size={16} />} label="Notes" />
        <MobileNavItem to="/app/attendance" icon={<ClipboardCheck size={16} />} label="Presence" />
        <MobileNavItem to="/app/focus" icon={<Rocket size={16} />} label="Rockets" />
        <MobileNavItem to="/app/profile" icon={<User size={16} />} label="Profile" />
      </div>

    </div>
  );
}

function NavItem({ to, index, label }) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => 
        `flex items-center gap-4 px-4 py-3.5 transition-all duration-200 cursor-pointer ${
          isActive 
            ? 'bg-text text-bg font-semibold' 
            : 'text-sub hover:text-text hover:bg-bg/40'
        }`
      }
    >
      <span className="font-mono text-[9px] opacity-40 tracking-normal">{index} //</span>
      <span className="editorial-text-spaced text-[10px] tracking-[0.2em]">{label}</span>
    </NavLink>
  );
}

function MobileNavItem({ to, icon, label }) {
  return (
    <NavLink 
      to={to} 
      className="relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors cursor-pointer"
    >
      {({ isActive }) => (
        <>
          <div className={`mb-1 transition-colors ${isActive ? 'text-text scale-110' : 'text-dim'}`}>{icon}</div>
          <span className={`text-[8px] tracking-[0.1em] uppercase transition-colors ${isActive ? 'text-text font-semibold' : 'text-dim'}`}>{label}</span>
          {isActive && (
            <span className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-text animate-fadeIn" />
          )}
        </>
      )}
    </NavLink>
  );
}
