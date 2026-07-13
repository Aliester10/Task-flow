import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
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
    <div className="flex h-screen overflow-hidden bg-[#FFFDF5]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-w-0 border-l-3 border-gray-900" id="main-content">
        <Outlet />
      </main>
    </div>
  );
};
