import { create } from 'zustand';
import type { Project } from '@/types/project';
import * as projectStorage from '@/storage/projects';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;

  loadProjects: () => Promise<void>;
  createProject: (name: string, address: string, customer: string) => Promise<Project>;
  openProject: (id: string) => Promise<void>;
  updateCurrentProject: (changes: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  closeProject: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,

  loadProjects: async () => {
    set({ loading: true });
    const projects = await projectStorage.listProjects();
    set({ projects, loading: false });
  },

  createProject: async (name, address, customer) => {
    const project = await projectStorage.createProject(name, address, customer);
    set((state) => ({ projects: [...state.projects, project] }));
    return project;
  },

  openProject: async (id) => {
    set({ loading: true });
    const project = await projectStorage.getProject(id);
    set({ currentProject: project ?? null, loading: false });
  },

  updateCurrentProject: async (changes) => {
    const { currentProject } = get();
    if (!currentProject) return;
    const updated = await projectStorage.updateProject(currentProject.id, changes);
    set({
      currentProject: updated,
      projects: get().projects.map((p) => (p.id === updated.id ? updated : p)),
    });
  },

  deleteProject: async (id) => {
    await projectStorage.deleteProject(id);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    }));
  },

  closeProject: () => set({ currentProject: null }),
}));
