import { create } from 'zustand';
import type { Point2D } from '@/types/geometry';

export type EditorTool = 'select' | 'wall' | 'door' | 'window' | 'annotate' | 'photo' | 'cable' | 'equipment' | 'pan' | 'section-cut';

export type ViewMode = 'site' | 'building' | 'floor' | 'outdoor';

interface EditorState {
  activeTool: EditorTool;
  activeFloorIndex: number;
  gridSize: number;
  snapEnabled: boolean;
  zoom: number;
  panOffset: Point2D;
  showGrid: boolean;
  viewMode: ViewMode;
  mapTileOpacity: number;

  setTool: (tool: EditorTool) => void;
  setActiveFloor: (index: number) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: Point2D) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  setViewMode: (mode: ViewMode) => void;
  setMapTileOpacity: (opacity: number) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeTool: 'select',
  activeFloorIndex: 0,
  gridSize: 0.15,
  snapEnabled: true,
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  showGrid: true,
  viewMode: 'site',
  mapTileOpacity: 1.0,

  setTool: (tool) => set({ activeTool: tool }),
  setActiveFloor: (index) => set({ activeFloorIndex: index }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),
  setPanOffset: (offset) => set({ panOffset: offset }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  setViewMode: (mode) => set({ viewMode: mode }),
  setMapTileOpacity: (opacity) => set({ mapTileOpacity: Math.max(0, Math.min(1, opacity)) }),
}));
