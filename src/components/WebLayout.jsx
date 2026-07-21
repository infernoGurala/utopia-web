import { NavLink, Outlet } from 'react-router-dom';
import { BookOpen, User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function WebLayout() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row font-sans">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-60 bg-surface border-r border-border flex-col p-5 shrink-0 h-screen sticky top-0">
        
        {/* Brand Header */}
        <div className="mb-8 px-2 select-none">
          <h1 className="text-xl font-bold font-sans text-text">
            Utopia
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          <NavItem to="/app/notes" icon={<BookOpen size={18} />} label="Notebooks" />
          <NavItem to="/app/profile" icon={<User size={18} />} label="Profile" />
        </nav>

        {/* Bottom User Area */}
        <div className="pt-4 border-t border-border">
          <button 
            onClick={signOut}
            className="flex w-full items-center justify-between px-3 py-2 text-sm text-sub hover:text-text hover:bg-bg rounded transition-colors cursor-pointer"
          >
            <span>Sign Out</span>
            <LogOut size={16} />
          </button>
        </div>

      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
          <h1 className="text-lg font-bold font-sans text-text">
            Utopia
          </h1>
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-2">
              <NavLink 
                to="/app/notes" 
                className={({ isActive }) => 
                  `px-2.5 py-1 text-sm rounded transition-colors ${
                    isActive ? 'bg-text text-bg font-medium' : 'text-sub hover:text-text'
                  }`
                }
              >
                Notes
              </NavLink>
              <NavLink 
                to="/app/profile" 
                className={({ isActive }) => 
                  `px-2.5 py-1 text-sm rounded transition-colors ${
                    isActive ? 'bg-text text-bg font-medium' : 'text-sub hover:text-text'
                  }`
                }
              >
                Profile
              </NavLink>
            </nav>
            <button onClick={signOut} className="p-1.5 text-sub hover:text-text rounded transition-colors cursor-pointer" title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Main Content Container */}
        <main className="flex-1 p-5 md:p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

    </div>
  );
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => 
        `flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors cursor-pointer ${
          isActive 
            ? 'bg-text text-bg font-medium' 
            : 'text-sub hover:text-text hover:bg-bg/60'
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
