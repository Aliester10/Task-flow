import { create } from 'zustand';
import { Task, TaskStatus } from '../types';
import { taskService } from '../services/task.service';

interface TaskState {
  tasks: Task[];
  currentTask: Task | null;
  isLoading: boolean;
  fetchTasks: (projectId: string, params?: { status?: TaskStatus; sprintId?: string; search?: string }) => Promise<void>;
  fetchTask: (projectId: string, taskId: string) => Promise<void>;
  createTask: (projectId: string, data: Parameters<typeof taskService.create>[1]) => Promise<Task>;
  updateTask: (projectId: string, taskId: string, data: Parameters<typeof taskService.update>[2]) => Promise<void>;
  deleteTask: (projectId: string, taskId: string) => Promise<void>;
  importTasks: (projectId: string, tasks: any[]) => Promise<number>;
  moveTask: (projectId: string, taskId: string, newStatus: TaskStatus, newOrder: number) => Promise<void>;
  updateTaskLocal: (taskId: string, data: Partial<Task>) => void;
  setCurrentTask: (task: Task | null) => void;
  clearTasks: () => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  currentTask: null,
  isLoading: false,

  fetchTasks: async (projectId, params) => {
    set({ isLoading: true });
    try {
      const tasks = await taskService.getAll(projectId, params);
      set({ tasks, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchTask: async (projectId, taskId) => {
    try {
      const task = await taskService.getById(projectId, taskId);
      set({ currentTask: task });
    } catch {
      // ignore
    }
  },

  createTask: async (projectId, data) => {
    const task = await taskService.create(projectId, data);
    set((s) => ({ tasks: [...s.tasks, task] }));
    return task;
  },

  updateTask: async (projectId, taskId, data) => {
    const updated = await taskService.update(projectId, taskId, data);
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...updated } : t)),
      currentTask: s.currentTask?.id === taskId ? { ...s.currentTask, ...updated } : s.currentTask,
    }));
  },

  deleteTask: async (projectId, taskId) => {
    await taskService.delete(projectId, taskId);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId) }));
  },

  importTasks: async (projectId, tasks) => {
    const count = await taskService.importBulk(projectId, tasks);
    // Reload tasks
    const updatedTasks = await taskService.getAll(projectId);
    set({ tasks: updatedTasks });
    return count;
  },

  moveTask: async (projectId, taskId, newStatus, newOrder) => {
    // Optimistic update
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus, order: newOrder } : t)),
    }));
    try {
      await taskService.reorder(projectId, { taskId, newStatus, newOrder });
    } catch {
      // revert on error by re-fetching
    }
  },

  updateTaskLocal: (taskId, data) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...data } : t)),
      currentTask: s.currentTask?.id === taskId ? { ...s.currentTask, ...data } : s.currentTask,
    }));
  },

  setCurrentTask: (task) => set({ currentTask: task }),

  clearTasks: () => set({ tasks: [], currentTask: null }),
}));
