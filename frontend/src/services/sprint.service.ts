import api from './api';
import { Sprint, SprintStatus } from '../types';

export const sprintService = {
  getAll: async (projectId: string) => {
    const res = await api.get<{ success: boolean; data: Sprint[] }>(`/projects/${projectId}/sprints`);
    return res.data.data!;
  },
  create: async (projectId: string, data: { name: string; goal?: string; startDate?: string | null; endDate?: string | null }) => {
    const res = await api.post<{ success: boolean; data: Sprint }>(`/projects/${projectId}/sprints`, data);
    return res.data.data!;
  },
  update: async (projectId: string, sprintId: string, data: Partial<{ name: string; goal: string; startDate: string | null; endDate: string | null; status: SprintStatus }>) => {
    const res = await api.put<{ success: boolean; data: Sprint }>(`/projects/${projectId}/sprints/${sprintId}`, data);
    return res.data.data!;
  },
  delete: async (projectId: string, sprintId: string) => {
    await api.delete(`/projects/${projectId}/sprints/${sprintId}`);
  },
  addTask: async (projectId: string, sprintId: string, taskId: string) => {
    const res = await api.post(`/projects/${projectId}/sprints/${sprintId}/add-task`, { taskId });
    return res.data.data;
  },
};
