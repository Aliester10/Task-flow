import api from './api';
import { Task, TaskStatus, Priority } from '../types';

export const taskService = {
  getAll: async (projectId: string, params?: { status?: TaskStatus; assigneeId?: string; sprintId?: string; search?: string }) => {
    const res = await api.get<{ success: boolean; data: Task[] }>(`/projects/${projectId}/tasks`, { params });
    return res.data.data!;
  },
  getById: async (projectId: string, taskId: string) => {
    const res = await api.get<{ success: boolean; data: Task }>(`/projects/${projectId}/tasks/${taskId}`);
    return res.data.data!;
  },
  create: async (projectId: string, data: {
    title: string; description?: string | null; assigneeId?: string | null;
    status?: TaskStatus; priority?: Priority; dueDate?: string | null;
    labels?: string[]; sprintId?: string | null;
  }) => {
    const res = await api.post<{ success: boolean; data: Task }>(`/projects/${projectId}/tasks`, data);
    return res.data.data!;
  },
  update: async (projectId: string, taskId: string, data: Partial<{
    title: string; description: string | null; assigneeId: string | null;
    status: TaskStatus; priority: Priority; dueDate: string | null;
    labels: string[]; sprintId: string | null;
  }>) => {
    const res = await api.put<{ success: boolean; data: Task }>(`/projects/${projectId}/tasks/${taskId}`, data);
    return res.data.data!;
  },
  delete: async (projectId: string, taskId: string) => {
    await api.delete(`/projects/${projectId}/tasks/${taskId}`);
  },
  reorder: async (projectId: string, data: { taskId: string; newStatus: TaskStatus; newOrder: number }) => {
    const res = await api.patch<{ success: boolean; data: Task }>(`/projects/${projectId}/tasks/reorder`, data);
    return res.data.data!;
  },
  addComment: async (projectId: string, taskId: string, content: string) => {
    const res = await api.post(`/projects/${projectId}/tasks/${taskId}/comments`, { content });
    return res.data.data;
  },
  deleteComment: async (projectId: string, taskId: string, commentId: string) => {
    await api.delete(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`);
  },
};
