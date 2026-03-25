import { create } from 'zustand';
import type { Project } from '@/types/project';
import type { Building } from '@/types/building';
import * as projectStorage from '@/storage/projects';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  activeBuildingId: string | null;
  loading: boolean;

  loadProjects: () => Promise<void>;
  createProject: (name: string, customer: string) => Promise<Project>;
  openProject: (id: string) => Promise<void>;
  updateCurrentProject: (changes: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  closeProject: () => void;

  setActiveBuilding: (buildingId: string | null) => void;
  addBuilding: (building: Building) => Promise<void>;
  updateBuilding: (buildingId: string, changes: Partial<Building>) => Promise<void>;
  removeBuilding: (buildingId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  activeBuildingId: null,
  loading: false,

  loadProjects: async () => {
    set({ loading: true });
    const projects = await projectStorage.listProjects();
    set({ projects, loading: false });
  },

  createProject: async (name, customer) => {
    const project = await projectStorage.createProject(name, customer);
    set((state) => ({ projects: [...state.projects, project] }));
    return project;
  },

  openProject: async (id) => {
    set({ loading: true });
    const project = await projectStorage.getProject(id);
    set({
      currentProject: project ?? null,
      activeBuildingId: project?.buildings[0]?.id ?? null,
      loading: false,
    });
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

  closeProject: () => set({ currentProject: null, activeBuildingId: null }),

  setActiveBuilding: (buildingId) => set({ activeBuildingId: buildingId }),

  addBuilding: async (building) => {
    const { currentProject, updateCurrentProject } = get();
    if (!currentProject) return;
    const buildings = [...currentProject.buildings, building];
    const center = currentProject.center || (building.footprint
      ? (() => {
          const coords = building.footprint.coordinates[0];
          const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
          const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
          return { lat, lng };
        })()
      : null);
    await updateCurrentProject({ buildings, center });
    set({ activeBuildingId: building.id });
  },

  updateBuilding: async (buildingId, changes) => {
    const { currentProject, updateCurrentProject } = get();
    if (!currentProject) return;
    const buildings = currentProject.buildings.map((b) =>
      b.id === buildingId ? { ...b, ...changes } : b,
    );
    await updateCurrentProject({ buildings });
  },

  removeBuilding: async (buildingId) => {
    const { currentProject, updateCurrentProject, activeBuildingId } = get();
    if (!currentProject) return;
    const buildings = currentProject.buildings.filter((b) => b.id !== buildingId);
    await updateCurrentProject({ buildings });
    if (activeBuildingId === buildingId) {
      set({ activeBuildingId: buildings[0]?.id ?? null });
    }
  },
}));
