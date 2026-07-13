import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, Bell, Settings,
  LogOut, Plus, Zap, ChevronLeft, ChevronRight,
  Search, HelpCircle,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useNotificationStore } from '../../store/notification.store';
import { useProjectStore } from '../../store/project.store';
import { Avatar } from '../ui/Avatar';

const navItems = [
  { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects',       icon: FolderKanban,    label: 'Projects'  },
  { to: '/notifications',  icon: Bell,            label: 'Notifikasi'},
  { to: '/settings',       icon: Settings,        label: 'Pengaturan'},
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { projects } = useProjectStore();
  const navigate = useNavigate();
  const location = useLocation();

  const recentProjects = projects.slice(0, 4);

  return (
    <aside
      className={`relative flex flex-col h-full bg-neo-cream flex-shrink-0 transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[68px]' : 'w-[230px]'}`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 h-16 border-b-3 border-gray-900 flex-shrink-0
        ${collapsed ? 'justify-center px-2' : ''}`}>
        <div className="w-8 h-8 rounded-neo border-3 border-gray-900 flex items-center justify-center flex-shrink-0 overflow-hidden"
             style={{ boxShadow: '2px 2px 0px 0px #1a1a1a' }}>
          <img src="/logo.svg" alt="Logo" className="w-full h-full object-cover" />
        </div>
        {!collapsed && (
          <span className="font-bold text-gray-900 text-lg tracking-tight">TaskFlow</span>
        )}
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={() => navigate('/projects')}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-neo bg-white border-2 border-gray-900
                       text-gray-500 hover:text-gray-800 text-xs transition-all group font-medium"
            style={{ boxShadow: '2px 2px 0px 0px #1a1a1a' }}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Cari project...</span>
            <kbd className="ml-auto text-[10px] bg-neo-yellow border-2 border-gray-900 px-1.5 py-0.5 rounded font-bold text-gray-900">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Main Nav */}
      <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
          return (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-neo text-xs font-bold transition-all relative group
                border-2
                ${isActive
                  ? 'bg-neo-yellow border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-white hover:border-gray-900'
                }`}
              style={isActive ? { boxShadow: '2px 2px 0px 0px #1a1a1a' } : {}}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
              {label === 'Notifikasi' && unreadCount > 0 && (
                <span className={`bg-neo-red text-white text-[9px] font-bold rounded-neo min-w-[18px] h-[18px] flex items-center justify-center px-1
                  border-2 border-gray-900
                  ${collapsed ? 'absolute -top-0.5 -right-0.5' : 'ml-auto'}`}
                  style={{ boxShadow: '1px 1px 0px 0px #1a1a1a' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>
          );
        })}

        {/* Recent Projects */}
        {!collapsed && recentProjects.length > 0 && (
          <div className="pt-4 pb-1">
            <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
              Recent
            </p>
            {recentProjects.map((p) => (
              <NavLink
                key={p.id}
                to={`/projects/${p.id}`}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-neo text-xs transition-all truncate font-medium border-2
                  ${isActive
                    ? 'text-gray-900 bg-white border-gray-900'
                    : 'text-gray-500 border-transparent hover:text-gray-900 hover:bg-white hover:border-gray-400'}`
                }
              >
                <span className="w-5 h-5 rounded border-2 border-gray-900 bg-neo-pink flex items-center justify-center text-[9px] font-bold text-gray-900 flex-shrink-0"
                  style={{ boxShadow: '1px 1px 0px 0px #1a1a1a' }}>
                  {p.name[0].toUpperCase()}
                </span>
                <span className="truncate">{p.name}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* New Project */}
      <div className={`px-3 pb-2 ${collapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={() => navigate('/projects')}
          title={collapsed ? 'Project Baru' : undefined}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-neo bg-neo-lime border-3 border-gray-900
                     text-gray-900 text-xs font-bold transition-all w-full
                     ${collapsed ? 'justify-center px-2' : ''}`}
          style={{ boxShadow: '3px 3px 0px 0px #1a1a1a' }}
          onMouseDown={(e) => {
            const el = e.currentTarget;
            el.style.transform = 'translate(3px, 3px)';
            el.style.boxShadow = '0px 0px 0px 0px #1a1a1a';
          }}
          onMouseUp={(e) => {
            const el = e.currentTarget;
            el.style.transform = '';
            el.style.boxShadow = '3px 3px 0px 0px #1a1a1a';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.transform = '';
            el.style.boxShadow = '3px 3px 0px 0px #1a1a1a';
          }}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Project Baru</span>}
        </button>
      </div>

      {/* Help */}
      {!collapsed && (
        <div className="px-3 pb-1">
          <button className="flex items-center gap-2.5 px-3 py-2 rounded-neo text-gray-500 hover:text-gray-900 hover:bg-white text-xs w-full transition-colors font-medium border-2 border-transparent hover:border-gray-400">
            <HelpCircle className="w-4 h-4" />
            <span>Bantuan</span>
          </button>
        </div>
      )}

      {/* User Footer */}
      <div className={`border-t-3 border-gray-900 p-3 flex items-center gap-2.5
        ${collapsed ? 'justify-center' : ''}`}>
        {user && (
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" className="flex-shrink-0" />
        )}
        {!collapsed && user && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">{user.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-neo hover:bg-neo-red/20 text-gray-500 hover:text-neo-red transition-colors flex-shrink-0 border-2 border-transparent hover:border-gray-900"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3.5 top-16 w-7 h-7 bg-neo-yellow border-3 border-gray-900 rounded-neo
                   flex items-center justify-center text-gray-900 hover:bg-yellow-300
                   transition-all z-10"
        style={{ boxShadow: '2px 2px 0px 0px #1a1a1a' }}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </aside>
  );
};
