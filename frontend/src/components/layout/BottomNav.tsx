import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Bell, Settings, Plus } from 'lucide-react';
import { useNotificationStore } from '../../store/notification.store';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/projects', icon: FolderKanban, label: 'Project' },
  { to: '/notifications', icon: Bell, label: 'Notif' },
  { to: '/settings', icon: Settings, label: 'Akun' },
];

export const BottomNav: React.FC = () => {
  const { unreadCount } = useNotificationStore();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[68px] bg-neo-cream border-t-3 border-gray-900 flex items-center justify-around px-2 z-50 md:hidden">
      {navItems.map((item, index) => {
        const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
        
        // Insert floating action button in the middle (index 2)
        if (index === 2) {
          return (
            <React.Fragment key="fab-fragment">
              {/* FAB */}
              <div className="relative -top-5" key="fab">
                <button
                  onClick={() => navigate('/projects')}
                  className="w-14 h-14 rounded-full bg-neo-lime border-3 border-gray-900 flex items-center justify-center text-gray-900 transition-transform active:scale-95"
                  style={{ boxShadow: '4px 4px 0px 0px #1a1a1a' }}
                >
                  <Plus className="w-6 h-6 stroke-[3]" />
                </button>
              </div>
              
              {/* Actual item at index 2 */}
              <NavItem item={item} isActive={isActive} unreadCount={item.to === '/notifications' ? unreadCount : 0} />
            </React.Fragment>
          );
        }

        return <NavItem key={item.to} item={item} isActive={isActive} unreadCount={item.to === '/notifications' ? unreadCount : 0} />;
      })}
    </nav>
  );
};

const NavItem = ({ item, isActive, unreadCount }: { item: any, isActive: boolean, unreadCount: number }) => {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={`relative flex flex-col items-center justify-center w-14 h-full gap-1
        ${isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
    >
      <div className={`relative flex items-center justify-center w-8 h-8 rounded-xl border-2 transition-all
        ${isActive ? 'bg-neo-yellow border-gray-900 shadow-[2px_2px_0px_0px_#1a1a1a]' : 'border-transparent'}`}>
        <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-neo-red text-white text-[9px] font-bold rounded-neo min-w-[16px] h-[16px] flex items-center justify-center px-0.5 border-[1.5px] border-gray-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      <span className={`text-[10px] font-bold ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
        {item.label}
      </span>
    </NavLink>
  );
};
