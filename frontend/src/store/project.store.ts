import { create } from 'zustand';
import { Project } from '../types';
import { projectService } from '../services/project.service';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (data: { name: string; description?: string; startDate?: string | null; endDate?: string | null }) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const projects = await projectService.getAll();
      set({ projects, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchProject: async (id) => {
    set({ isLoading: true });
    try {
      const project = await projectService.getById(id);
      set({ currentProject: project, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createProject: async (data) => {
    const project = await projectService.create(data);
    set((s) => ({ projects: [project, ...s.projects] }));
    return project;
  },

  updateProject: async (id, data) => {
    const updated = await projectService.update(id, data as Parameters<typeof projectService.update>[1]);
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...updated } : p)),
      currentProject: s.currentProject?.id === id ? { ...s.currentProject, ...updated } : s.currentProject,
    }));
  },

  deleteProject: async (id) => {
    await projectService.delete(id);
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      currentProject: s.currentProject?.id === id ? null : s.currentProject,
    }));
  },

  archiveProject: async (id) => {
    const updated = await projectService.archive(id);
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      currentProject: s.currentProject?.id === id ? updated : s.currentProject,
    }));
  },

  setCurrentProject: (project) => set({ currentProject: project }),
}));
