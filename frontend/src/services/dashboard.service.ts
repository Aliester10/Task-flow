import api from './api';
import { DashboardData } from '../types';

export const dashboardService = {
  get: async () => {
    const res = await api.get<{ success: boolean; data: DashboardData }>('/dashboard');
    return res.data.data!;
  },
};
