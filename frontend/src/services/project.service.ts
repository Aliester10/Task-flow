import api from './api';
import { Project, ProjectMember } from '../types';

export const projectService = {
  getAll: async () => {
    const res = await api.get<{ success: boolean; data: Project[] }>('/projects');
    return res.data.data!;
  },
  getById: async (id: string) => {
    const res = await api.get<{ success: boolean; data: Project }>(`/projects/${id}`);
    return res.data.data!;
  },
  create: async (data: { name: string; description?: string; startDate?: string | null; endDate?: string | null }) => {
    const res = await api.post<{ success: boolean; data: Project }>('/projects', data);
    return res.data.data!;
  },
  update: async (id: string, data: Partial<{ name: string; description: string; startDate: string | null; endDate: string | null }>) => {
    const res = await api.put<{ success: boolean; data: Project }>(`/projects/${id}`, data);
    return res.data.data!;
  },
  delete: async (id: string) => {
    await api.delete(`/projects/${id}`);
  },
  archive: async (id: string) => {
    const res = await api.patch<{ success: boolean; data: Project }>(`/projects/${id}/archive`);
    return res.data.data!;
  },
  inviteMember: async (id: string, email: string) => {
    const res = await api.post<{ success: boolean; data: ProjectMember }>(`/projects/${id}/members`, { email });
    return res.data.data!;
  },
  removeMember: async (projectId: string, userId: string) => {
    await api.delete(`/projects/${projectId}/members/${userId}`);
  },
};
