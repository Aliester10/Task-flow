import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { useNotificationStore } from '../../store/notification.store';
import { useProjectStore } from '../../store/project.store';
import { useAuthStore } from '../../store/auth.store';
import { socket } from '../../services/socket';

export const AppLayout: React.FC = () => {
  const { fetchNotifications, addNotification } = useNotificationStore();
  const { fetchProjects } = useProjectStore();
  const { token, user } = useAuthStore();

  useEffect(() => {
    if (token) {
      fetchNotifications();
      fetchProjects();
      const interval = setInterval(fetchNotifications, 60_000);
      return () => clearInterval(interval);
    }
  }, [token, fetchNotifications, fetchProjects]);

  useEffect(() => {
    if (token && user) {
      socket.connect();
      socket.emit('authenticate', user.id);

      const handleNewNotification = (notif: any) => {
        addNotification(notif);
      };

      socket.on('new-notification', handleNewNotification);

      return () => {
        socket.off('new-notification', handleNewNotification);
        socket.disconnect();
      };
    }
  }, [token, user, addNotification]);

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] overflow-hidden bg-[#FFFDF5]">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full flex-shrink-0 z-40">
        <Sidebar />
      </div>
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 md:border-l-3 md:border-gray-900 pb-[80px] md:pb-0" id="main-content">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
};
