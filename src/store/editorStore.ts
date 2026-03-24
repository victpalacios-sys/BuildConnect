import { create } from 'zustand';
import type { Point2D } from '@/types/geometry';

export type EditorTool = 'select' | 'wall' | 'door' | 'window' | 'annotate' | 'photo' | 'cable' | 'equipment' | 'pan';

interface EditorState {
  activeTool: EditorTool;
  activeFloorIndex: number;
  gridSize: number; // meters
  snapEnabled: boolean;
  zoom: number;
  panOffset: Point2D;
  showGrid: boolean;

  setTool: (tool: EditorTool) => void;
  setActiveFloor: (index: number) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: Point2D) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeTool: 'select',
  activeFloorIndex: 0,
  gridSize: 0.15, // 15cm snap grid
  snapEnabled: true,
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  showGrid: true,

  setTool: (tool) => set({ activeTool: tool }),
  setActiveFloor: (index) => set({ activeFloorIndex: index }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),
  setPanOffset: (offset) => set({ panOffset: offset }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
}));
