import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Users, BookOpen, ClipboardCheck, Zap, User, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function WebLayout() {
  const { signOut } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row">
      {/* Sidebar Navigation (Desktop) */}
      <aside className={`hidden md:flex ${isSidebarCollapsed ? 'w-20' : 'w-72'} bg-surface/30 border-r border-border/40 flex-col sticky top-0 h-screen overflow-y-auto z-20 transition-all duration-300 ease-in-out`}>
        <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center p-4' : 'justify-between p-6'} mb-6`}>
          {!isSidebarCollapsed && (
            <h1 className="font-playfair italic text-4xl font-bold text-primary" style={{ textShadow: '0 2px 10px rgba(203,166,247,0.2)' }}>
              Utopia
            </h1>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 text-dim hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>

        <nav className={`flex-1 space-y-2 ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}>
          <NavItem to="/app/community" icon={<Users size={20} />} label="Community Notes" collapsed={isSidebarCollapsed} />
          <NavItem to="/app/classes" icon={<BookOpen size={20} />} label="Classes" collapsed={isSidebarCollapsed} />
          <NavItem to="/app/attendance" icon={<ClipboardCheck size={20} />} label="Attendance" collapsed={isSidebarCollapsed} />
          <NavItem to="/app/sciwordle" icon={<Zap size={20} />} label="Sciwordle" collapsed={isSidebarCollapsed} />
        </nav>

        <div className={`pt-8 border-t border-border/40 mt-auto space-y-2 ${isSidebarCollapsed ? 'px-2 pb-4' : 'px-4 pb-6'}`}>
          <NavItem to="/app/profile" icon={<User size={20} />} label="Profile" collapsed={isSidebarCollapsed} />
          <button 
            onClick={signOut}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} gap-4 px-4 py-3 rounded-xl text-dim hover:text-red hover:bg-red/10 transition-colors`}
            title={isSidebarCollapsed ? 'Sign Out' : undefined}
          >
            <LogOut size={20} />
            {!isSidebarCollapsed && <span className="font-medium text-[15px]">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 md:h-screen md:overflow-y-auto pb-20 md:pb-0 relative">
        <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-12">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between mb-6 pt-2">
            <h1 className="font-playfair italic text-3xl font-bold text-primary" style={{ textShadow: '0 2px 10px rgba(203,166,247,0.2)' }}>
              Utopia
            </h1>
            <button onClick={signOut} className="p-2 text-dim hover:text-red transition-colors bg-surface/50 rounded-full">
              <LogOut size={20} />
            </button>
          </div>
          
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-xl border-t border-border/40 flex justify-around items-center p-2 z-50 pb-safe">
        <MobileNavItem to="/app/community" icon={<Users size={22} />} label="Notes" />
        <MobileNavItem to="/app/classes" icon={<BookOpen size={22} />} label="Classes" />
        <MobileNavItem to="/app/attendance" icon={<ClipboardCheck size={22} />} label="Attendance" />
        <MobileNavItem to="/app/sciwordle" icon={<Zap size={22} />} label="Sciwordle" />
        <MobileNavItem to="/app/profile" icon={<User size={22} />} label="Profile" />
      </nav>
    </div>
  );
}

function NavItem({ to, icon, label, collapsed }) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);

  return (
    <NavLink 
      to={to} 
      className={`flex items-center ${collapsed ? 'justify-center' : ''} gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 ${
        isActive 
          ? `bg-primary/10 text-primary font-semibold ${collapsed ? '' : 'shadow-[inset_4px_0_0_var(--primary)]'}` 
          : 'text-sub hover:text-text hover:bg-surface/50 font-medium'
      }`}
      title={collapsed ? label : undefined}
    >
      <div className={isActive ? 'text-primary' : 'text-dim'}>
        {icon}
      </div>
      {!collapsed && <span className="text-[15px]">{label}</span>}
    </NavLink>
  );
}

function MobileNavItem({ to, icon, label }) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);

  return (
    <NavLink 
      to={to} 
      className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200 ${
        isActive 
          ? 'text-primary' 
          : 'text-dim hover:text-text'
      }`}
    >
      <div className={`mb-1 transition-transform duration-200 ${isActive ? 'scale-110 -translate-y-0.5' : ''}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-medium transition-opacity ${isActive ? 'opacity-100' : 'opacity-70'}`}>
        {label}
      </span>
      {isActive && (
        <div className="absolute top-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]"></div>
      )}
    </NavLink>
  );
}
