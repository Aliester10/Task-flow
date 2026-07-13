import api from './api';
import { Notification } from '../types';

export const notificationService = {
  getAll: async () => {
    const res = await api.get<{ success: boolean; data: { notifications: Notification[]; unreadCount: number } }>('/notifications');
    return res.data.data!;
  },
  markRead: async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
  },
  markAllRead: async () => {
    await api.patch('/notifications/read-all');
  },
};
