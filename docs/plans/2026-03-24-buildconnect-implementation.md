# BuildConnect Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a PWA for telecom engineers to survey buildings and design fiber/wireless network installations, with offline-first architecture and BIM 3D model generation.

**Architecture:** React 18 + TypeScript PWA with Vite. Three main views: MapLibre map for outdoor routing, custom Canvas-based 2D floor plan editor for on-site survey, and That Open Company's BIM libraries for 3D visualization. IndexedDB + OPFS for offline storage, Zustand for state management.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Zustand, MapLibre GL JS, @thatopen/components, @thatopen/fragments, Three.js, idb (IndexedDB wrapper), Workbox (PWA/Service Worker), Lucide React, Vitest

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `src/vite-env.d.ts`
- Create: `.gitignore`
- Create: `.eslintrc.cjs`

**Step 1: Scaffold Vite + React + TypeScript project**

```bash
npm create vite@latest . -- --template react-ts
```

Select overwrite if prompted (we already have files in the directory).

**Step 2: Install core dependencies**

```bash
npm install react-router-dom zustand immer lucide-react idb uuid
npm install maplibre-gl react-map-gl
npm install @thatopen/components @thatopen/components-front @thatopen/fragments three web-ifc camera-controls
npm install -D tailwindcss @tailwindcss/vite @types/three @types/uuid vitest @testing-library/react @testing-library/jest-dom jsdom happy-dom
```

**Step 3: Configure Tailwind CSS**

Replace `src/index.css` with:

```css
@import "tailwindcss";
```

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
```

**Step 4: Configure Vitest**

Add to `vite.config.ts` (merge with existing):

```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

Create `src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

**Step 5: Create base App with React Router**

`src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProjectDashboard } from '@/views/ProjectDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

`src/views/ProjectDashboard.tsx` (placeholder):

```tsx
export function ProjectDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <h1 className="text-3xl font-bold text-gray-900">BuildConnect</h1>
    </div>
  );
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

**Step 6: Verify the app runs**

```bash
npm run dev
```

Expected: App loads at localhost:5173 showing "BuildConnect" heading.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold React + TypeScript + Vite project with Tailwind and core dependencies"
```

---

## Task 2: Data Model and Types

**Files:**
- Create: `src/types/project.ts`
- Create: `src/types/building.ts`
- Create: `src/types/geometry.ts`

**Step 1: Define geometry primitives**

`src/types/geometry.ts`:

```typescript
export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoLineString {
  type: 'LineString';
  coordinates: [number, number][]; // [lng, lat]
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: [number, number][][]; // [[lng, lat], ...]
}
```

**Step 2: Define building types**

`src/types/building.ts`:

```typescript
import { Point2D, GeoPolygon } from './geometry';

export interface Wall {
  id: string;
  start: Point2D;
  end: Point2D;
  thickness: number; // meters
  isExterior: boolean;
}

export interface Door {
  id: string;
  wallId: string;
  position: number; // 0-1 along wall length
  width: number; // meters
}

export interface Window {
  id: string;
  wallId: string;
  position: number; // 0-1 along wall length
  width: number; // meters
  sillHeight: number; // meters from floor
  height: number; // meters
}

export type EquipmentType =
  | 'fiber-hub'
  | 'switch'
  | 'access-point'
  | 'router'
  | 'splice-enclosure'
  | 'patch-panel'
  | 'ont'
  | 'cable-tray';

export interface Equipment {
  id: string;
  type: EquipmentType;
  position: Point2D;
  label: string;
  properties: Record<string, string>;
}

export type CableType = 'fiber' | 'cat6' | 'cat6a' | 'coaxial';

export interface CableRoute {
  id: string;
  points: Point2D[];
  cableType: CableType;
  label: string;
}

export interface Annotation {
  id: string;
  text: string;
  position: Point2D;
  timestamp: number;
}

export interface PhotoAnnotation {
  id: string;
  blobKey: string; // key in OPFS
  position: Point2D;
  caption: string;
  timestamp: number;
}

export interface Floor {
  id: string;
  level: number; // 0 = ground, 1 = first, -1 = basement
  label: string;
  height: number; // floor-to-floor height in meters
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  equipment: Equipment[];
  cableRoutes: CableRoute[];
  annotations: Annotation[];
  photos: PhotoAnnotation[];
}

export interface Building {
  id: string;
  footprint: GeoPolygon | null; // from OSM or manual
  footprintLocal: Point2D[]; // local coordinates in meters
  floorCount: number;
  defaultFloorHeight: number; // meters
  floors: Floor[];
}
```

**Step 3: Define project types**

`src/types/project.ts`:

```typescript
import { GeoPoint, GeoLineString } from './geometry';
import { Annotation, Building } from './building';

export type ProjectStatus = 'draft' | 'survey' | 'design' | 'review' | 'complete';

export interface OutdoorPlan {
  fiberSourceLocation: GeoPoint | null;
  cableRoute: GeoLineString | null;
  annotations: Annotation[];
}

export interface Project {
  id: string;
  name: string;
  address: string;
  customer: string;
  status: ProjectStatus;
  createdAt: number;
  updatedAt: number;
  center: GeoPoint | null; // map center for this project
  outdoorPlan: OutdoorPlan;
  building: Building;
}
```

**Step 4: Commit**

```bash
git add src/types/
git commit -m "feat: define data model types for projects, buildings, floors, and geometry"
```

---

## Task 3: IndexedDB Storage Layer

**Files:**
- Create: `src/storage/db.ts`
- Create: `src/storage/projects.ts`
- Create: `src/storage/photos.ts`
- Test: `src/storage/__tests__/projects.test.ts`

**Step 1: Write failing test for project CRUD**

`src/storage/__tests__/projects.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createProject, getProject, listProjects, updateProject, deleteProject } from '../projects';
import { initDB } from '../db';

// Use fake-indexeddb for testing
import 'fake-indexeddb/auto';

beforeEach(async () => {
  // Reset the database before each test
  const dbs = await indexedDB.databases();
  for (const db of dbs) {
    if (db.name) indexedDB.deleteDatabase(db.name);
  }
});

describe('project storage', () => {
  it('creates and retrieves a project', async () => {
    const project = await createProject('Test Project', '123 Main St', 'ACME Corp');
    expect(project.id).toBeDefined();
    expect(project.name).toBe('Test Project');

    const retrieved = await getProject(project.id);
    expect(retrieved).toEqual(project);
  });

  it('lists all projects', async () => {
    await createProject('Project A', 'Addr A', 'Client A');
    await createProject('Project B', 'Addr B', 'Client B');
    const list = await listProjects();
    expect(list).toHaveLength(2);
  });

  it('updates a project', async () => {
    const project = await createProject('Old Name', 'Addr', 'Client');
    const updated = await updateProject(project.id, { name: 'New Name' });
    expect(updated.name).toBe('New Name');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(project.updatedAt);
  });

  it('deletes a project', async () => {
    const project = await createProject('To Delete', 'Addr', 'Client');
    await deleteProject(project.id);
    const retrieved = await getProject(project.id);
    expect(retrieved).toBeUndefined();
  });
});
```

**Step 2: Install fake-indexeddb for tests**

```bash
npm install -D fake-indexeddb
```

**Step 3: Run test to verify it fails**

```bash
npx vitest run src/storage/__tests__/projects.test.ts
```

Expected: FAIL — modules not found.

**Step 4: Implement database initialization**

`src/storage/db.ts`:

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Project } from '@/types/project';

interface BuildConnectDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: {
      'by-updated': number;
      'by-status': string;
    };
  };
}

const DB_NAME = 'buildconnect';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<BuildConnectDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<BuildConnectDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BuildConnectDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
        projectStore.createIndex('by-updated', 'updatedAt');
        projectStore.createIndex('by-status', 'status');
      },
    });
  }
  return dbPromise;
}

export function initDB() {
  return getDB();
}
```

**Step 5: Implement project CRUD**

`src/storage/projects.ts`:

```typescript
import { v4 as uuidv4 } from 'uuid';
import { getDB } from './db';
import type { Project } from '@/types/project';

function createEmptyProject(name: string, address: string, customer: string): Project {
  const now = Date.now();
  return {
    id: uuidv4(),
    name,
    address,
    customer,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    center: null,
    outdoorPlan: {
      fiberSourceLocation: null,
      cableRoute: null,
      annotations: [],
    },
    building: {
      id: uuidv4(),
      footprint: null,
      footprintLocal: [],
      floorCount: 1,
      defaultFloorHeight: 3.0,
      floors: [],
    },
  };
}

export async function createProject(
  name: string,
  address: string,
  customer: string,
): Promise<Project> {
  const db = await getDB();
  const project = createEmptyProject(name, address, customer);
  await db.put('projects', project);
  return project;
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDB();
  return db.get('projects', id);
}

export async function listProjects(): Promise<Project[]> {
  const db = await getDB();
  return db.getAllFromIndex('projects', 'by-updated');
}

export async function updateProject(
  id: string,
  changes: Partial<Project>,
): Promise<Project> {
  const db = await getDB();
  const existing = await db.get('projects', id);
  if (!existing) throw new Error(`Project ${id} not found`);
  const updated: Project = {
    ...existing,
    ...changes,
    id: existing.id, // prevent id override
    updatedAt: Date.now(),
  };
  await db.put('projects', updated);
  return updated;
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('projects', id);
}
```

**Step 6: Implement photo storage**

`src/storage/photos.ts`:

```typescript
const PHOTO_DIR = 'photos';

async function getPhotosDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(PHOTO_DIR, { create: true });
}

export async function savePhoto(key: string, blob: Blob): Promise<void> {
  const dir = await getPhotosDir();
  const fileHandle = await dir.getFileHandle(key, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export async function getPhoto(key: string): Promise<Blob | null> {
  try {
    const dir = await getPhotosDir();
    const fileHandle = await dir.getFileHandle(key);
    const file = await fileHandle.getFile();
    return file;
  } catch {
    return null;
  }
}

export async function deletePhoto(key: string): Promise<void> {
  try {
    const dir = await getPhotosDir();
    await dir.removeEntry(key);
  } catch {
    // ignore if not found
  }
}
```

**Step 7: Run tests**

```bash
npx vitest run src/storage/__tests__/projects.test.ts
```

Expected: All 4 tests PASS.

**Step 8: Commit**

```bash
git add src/storage/ package.json package-lock.json
git commit -m "feat: add IndexedDB storage layer for projects with OPFS photo storage"
```

---

## Task 4: Zustand State Management

**Files:**
- Create: `src/store/projectStore.ts`
- Create: `src/store/editorStore.ts`

**Step 1: Create project store**

`src/store/projectStore.ts`:

```typescript
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
```

**Step 2: Create editor store**

`src/store/editorStore.ts`:

```typescript
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
```

**Step 3: Commit**

```bash
git add src/store/
git commit -m "feat: add Zustand stores for project state and 2D editor state"
```

---

## Task 5: Project Dashboard View

**Files:**
- Create: `src/views/ProjectDashboard.tsx` (replace placeholder)
- Create: `src/components/ProjectCard.tsx`
- Create: `src/components/NewProjectDialog.tsx`
- Create: `src/components/AppShell.tsx`

**Step 1: Create AppShell layout**

`src/components/AppShell.tsx`:

```tsx
import { ReactNode } from 'react';
import { Wifi } from 'lucide-react';

interface AppShellProps {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
}

export function AppShell({ children, title = 'BuildConnect', actions }: AppShellProps) {
  const isOnline = navigator.onLine;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          {!isOnline && (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              <Wifi className="w-3 h-3" />
              Offline
            </span>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
```

**Step 2: Create ProjectCard**

`src/components/ProjectCard.tsx`:

```tsx
import { Building2, MapPin, Clock } from 'lucide-react';
import type { Project } from '@/types/project';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onDelete: () => void;
}

export function ProjectCard({ project, onClick, onDelete }: ProjectCardProps) {
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    survey: 'bg-blue-100 text-blue-700',
    design: 'bg-purple-100 text-purple-700',
    review: 'bg-amber-100 text-amber-700',
    complete: 'bg-green-100 text-green-700',
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all active:scale-[0.98]"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-400" />
          <h3 className="font-medium text-gray-900">{project.name}</h3>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[project.status]}`}>
          {project.status}
        </span>
      </div>

      {project.address && (
        <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
          <MapPin className="w-3.5 h-3.5" />
          {project.address}
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(project.updatedAt).toLocaleDateString()}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-xs text-red-400 hover:text-red-600 px-2 py-1"
        >
          Delete
        </button>
      </div>
    </button>
  );
}
```

**Step 3: Create NewProjectDialog**

`src/components/NewProjectDialog.tsx`:

```tsx
import { useState } from 'react';
import { X } from 'lucide-react';

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, address: string, customer: string) => void;
}

export function NewProjectDialog({ open, onClose, onCreate }: NewProjectDialogProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [customer, setCustomer] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), address.trim(), customer.trim());
    setName('');
    setAddress('');
    setCustomer('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">New Project</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 123 Main St - Fiber Install"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123 Main St, City, State"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <input
              type="text"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Company or tenant name"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={!name.trim()} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 4: Update ProjectDashboard**

`src/views/ProjectDashboard.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { ProjectCard } from '@/components/ProjectCard';
import { NewProjectDialog } from '@/components/NewProjectDialog';
import { useProjectStore } from '@/store/projectStore';

export function ProjectDashboard() {
  const navigate = useNavigate();
  const { projects, loading, loadProjects, createProject, deleteProject, openProject } = useProjectStore();
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreate = async (name: string, address: string, customer: string) => {
    const project = await createProject(name, address, customer);
    await openProject(project.id);
    navigate(`/project/${project.id}`);
  };

  const handleOpen = async (id: string) => {
    await openProject(id);
    navigate(`/project/${id}`);
  };

  return (
    <AppShell
      actions={
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      }
    >
      <div className="p-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No projects yet</p>
            <button
              onClick={() => setShowNew(true)}
              className="mt-4 text-blue-600 text-sm hover:underline"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleOpen(project.id)}
                onDelete={() => deleteProject(project.id)}
              />
            ))}
          </div>
        )}
      </div>

      <NewProjectDialog
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreate={handleCreate}
      />
    </AppShell>
  );
}
```

**Step 5: Verify the dashboard runs**

```bash
npm run dev
```

Expected: Dashboard shows empty state with "New Project" button. Creating a project navigates to `/project/:id` (404 for now is fine).

**Step 6: Commit**

```bash
git add src/views/ src/components/
git commit -m "feat: add Project Dashboard with create/list/delete functionality"
```

---

## Task 6: Project Workspace Layout and Routing

**Files:**
- Create: `src/views/ProjectWorkspace.tsx`
- Create: `src/components/WorkspaceNav.tsx`
- Modify: `src/App.tsx`
- Create: `src/views/MapView.tsx` (placeholder)
- Create: `src/views/BuildingSetup.tsx` (placeholder)
- Create: `src/views/FloorPlanEditor.tsx` (placeholder)
- Create: `src/views/BIMViewer.tsx` (placeholder)

**Step 1: Create WorkspaceNav**

`src/components/WorkspaceNav.tsx`:

```tsx
import { Map, Grid3x3, PenTool, Box, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface WorkspaceNavProps {
  projectId: string;
}

export function WorkspaceNav({ projectId }: WorkspaceNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const base = `/project/${projectId}`;

  const tabs = [
    { path: `${base}/map`, label: 'Map', icon: Map },
    { path: `${base}/setup`, label: 'Building', icon: Grid3x3 },
    { path: `${base}/floor`, label: 'Floor Plan', icon: PenTool },
    { path: `${base}/3d`, label: '3D View', icon: Box },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 flex items-center px-2 shrink-0">
      <button
        onClick={() => navigate('/')}
        className="p-2 hover:bg-gray-100 rounded mr-2"
        title="Back to projects"
      >
        <ArrowLeft className="w-5 h-5 text-gray-600" />
      </button>
      <div className="flex gap-1">
        {tabs.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-t transition-colors ${
                active
                  ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

**Step 2: Create ProjectWorkspace**

`src/views/ProjectWorkspace.tsx`:

```tsx
import { useEffect } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { WorkspaceNav } from '@/components/WorkspaceNav';
import { useProjectStore } from '@/store/projectStore';
import { MapView } from '@/views/MapView';
import { BuildingSetup } from '@/views/BuildingSetup';
import { FloorPlanEditor } from '@/views/FloorPlanEditor';
import { BIMViewer } from '@/views/BIMViewer';

export function ProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, openProject, loading } = useProjectStore();

  useEffect(() => {
    if (projectId && currentProject?.id !== projectId) {
      openProject(projectId);
    }
  }, [projectId, currentProject?.id, openProject]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading project...</div>;
  }

  if (!currentProject) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <WorkspaceNav projectId={currentProject.id} />
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="map" element={<MapView />} />
          <Route path="setup" element={<BuildingSetup />} />
          <Route path="floor" element={<FloorPlanEditor />} />
          <Route path="3d" element={<BIMViewer />} />
          <Route path="*" element={<Navigate to="map" replace />} />
        </Routes>
      </div>
    </div>
  );
}
```

**Step 3: Create placeholder views**

`src/views/MapView.tsx`:

```tsx
export function MapView() {
  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      Map View — coming next
    </div>
  );
}
```

`src/views/BuildingSetup.tsx`:

```tsx
export function BuildingSetup() {
  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      Building Setup — coming soon
    </div>
  );
}
```

`src/views/FloorPlanEditor.tsx`:

```tsx
export function FloorPlanEditor() {
  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      Floor Plan Editor — coming soon
    </div>
  );
}
```

`src/views/BIMViewer.tsx`:

```tsx
export function BIMViewer() {
  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      3D BIM Viewer — coming soon
    </div>
  );
}
```

**Step 4: Update App.tsx routing**

`src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProjectDashboard } from '@/views/ProjectDashboard';
import { ProjectWorkspace } from '@/views/ProjectWorkspace';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectDashboard />} />
        <Route path="/project/:projectId/*" element={<ProjectWorkspace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Step 5: Verify navigation works**

```bash
npm run dev
```

Expected: Create project → navigates to workspace → tab navigation works between Map/Building/Floor Plan/3D View.

**Step 6: Commit**

```bash
git add src/
git commit -m "feat: add project workspace layout with tab navigation between views"
```

---

## Task 7: Map View with MapLibre + OSM Building Footprints

**Files:**
- Modify: `src/views/MapView.tsx`
- Create: `src/services/overpass.ts`
- Create: `src/components/map/MapContainer.tsx`

**Step 1: Create Overpass API service**

`src/services/overpass.ts`:

```typescript
import type { GeoPolygon } from '@/types/geometry';

interface OSMBuilding {
  id: number;
  polygon: GeoPolygon;
  levels: number | null;
  height: number | null;
  name: string | null;
}

export async function queryBuildingFootprints(
  lat: number,
  lng: number,
  radiusMeters: number = 200,
): Promise<OSMBuilding[]> {
  const query = `
    [out:json][timeout:10];
    (
      way["building"](around:${radiusMeters},${lat},${lng});
      relation["building"](around:${radiusMeters},${lat},${lng});
    );
    out geom;
  `;

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);

  const data = await response.json();

  return data.elements
    .filter((el: any) => el.geometry && el.geometry.length > 2)
    .map((el: any) => ({
      id: el.id,
      polygon: {
        type: 'Polygon' as const,
        coordinates: [el.geometry.map((node: any) => [node.lon, node.lat])],
      },
      levels: el.tags?.['building:levels'] ? parseInt(el.tags['building:levels']) : null,
      height: el.tags?.height ? parseFloat(el.tags.height) : null,
      name: el.tags?.name ?? null,
    }));
}
```

**Step 2: Create MapContainer component**

`src/components/map/MapContainer.tsx`:

```tsx
import { useRef, useEffect, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useProjectStore } from '@/store/projectStore';
import { queryBuildingFootprints } from '@/services/overpass';
import type { GeoPolygon } from '@/types/geometry';

const STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

interface MapContainerProps {
  onBuildingSelected: (polygon: GeoPolygon, levels: number | null) => void;
}

export function MapContainer({ onBuildingSelected }: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const { currentProject } = useProjectStore();
  const [loading, setLoading] = useState(false);

  const loadBuildings = useCallback(async (map: maplibregl.Map) => {
    const center = map.getCenter();
    setLoading(true);
    try {
      const buildings = await queryBuildingFootprints(center.lat, center.lng, 300);

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: buildings.map((b) => ({
          type: 'Feature',
          properties: { id: b.id, levels: b.levels, name: b.name },
          geometry: b.polygon,
        })),
      };

      const source = map.getSource('buildings') as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(geojson);
      } else {
        map.addSource('buildings', { type: 'geojson', data: geojson });
        map.addLayer({
          id: 'buildings-fill',
          type: 'fill',
          source: 'buildings',
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.15,
          },
        });
        map.addLayer({
          id: 'buildings-outline',
          type: 'line',
          source: 'buildings',
          paint: {
            'line-color': '#3b82f6',
            'line-width': 2,
          },
        });
      }
    } catch (err) {
      console.error('Failed to load buildings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    const center = currentProject?.center
      ? [currentProject.center.lng, currentProject.center.lat] as [number, number]
      : [-73.985, 40.748] as [number, number]; // Default: NYC

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: STYLE_URL,
      center,
      zoom: 17,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(
      new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }),
      'top-right',
    );

    map.on('load', () => {
      mapRef.current = map;
      loadBuildings(map);
    });

    map.on('click', 'buildings-fill', (e) => {
      if (e.features?.[0]) {
        const feature = e.features[0];
        const polygon = feature.geometry as GeoPolygon;
        const levels = (feature.properties?.levels as number) ?? null;
        onBuildingSelected(polygon, levels);
      }
    });

    map.on('mouseenter', 'buildings-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'buildings-fill', () => {
      map.getCanvas().style.cursor = '';
    });

    return () => map.remove();
  }, [currentProject?.center, loadBuildings, onBuildingSelected]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {loading && (
        <div className="absolute top-3 left-3 bg-white/90 px-3 py-1.5 rounded-lg text-sm text-gray-600 shadow">
          Loading buildings...
        </div>
      )}
    </div>
  );
}
```

**Step 3: Update MapView**

`src/views/MapView.tsx`:

```tsx
import { useCallback } from 'react';
import { MapContainer } from '@/components/map/MapContainer';
import { useProjectStore } from '@/store/projectStore';
import type { GeoPolygon } from '@/types/geometry';
import { Search } from 'lucide-react';

export function MapView() {
  const { currentProject, updateCurrentProject } = useProjectStore();

  const handleBuildingSelected = useCallback(
    async (polygon: GeoPolygon, levels: number | null) => {
      if (!currentProject) return;
      await updateCurrentProject({
        building: {
          ...currentProject.building,
          footprint: polygon,
          floorCount: levels ?? currentProject.building.floorCount,
        },
      });
    },
    [currentProject, updateCurrentProject],
  );

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b px-4 py-2 flex items-center gap-2 shrink-0">
        <Search className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500">
          {currentProject?.building.footprint
            ? 'Building footprint selected. Click another to change.'
            : 'Click a building on the map to select its footprint.'}
        </span>
      </div>
      <div className="flex-1">
        <MapContainer onBuildingSelected={handleBuildingSelected} />
      </div>
    </div>
  );
}
```

**Step 4: Verify map loads**

```bash
npm run dev
```

Expected: Map view shows OpenStreetMap tiles, building footprints load as blue overlays, clicking a building updates the project.

**Step 5: Commit**

```bash
git add src/
git commit -m "feat: add Map View with MapLibre, OSM building footprint selection via Overpass API"
```

---

## Task 8: Building Setup View

**Files:**
- Modify: `src/views/BuildingSetup.tsx`
- Create: `src/services/building-generator.ts`

**Step 1: Create building floor generator**

`src/services/building-generator.ts`:

```typescript
import { v4 as uuidv4 } from 'uuid';
import type { Building, Floor, Wall } from '@/types/building';
import type { Point2D, GeoPolygon } from '@/types/geometry';

/**
 * Converts a GeoPolygon (lng/lat) to local coordinates in meters
 * using a simple equirectangular projection from the polygon centroid.
 */
export function geoPolygonToLocal(polygon: GeoPolygon): Point2D[] {
  const coords = polygon.coordinates[0];
  if (!coords || coords.length < 3) return [];

  // Calculate centroid
  const centLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const centLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;

  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos((centLat * Math.PI) / 180);

  return coords.map(([lng, lat]) => ({
    x: (lng - centLng) * metersPerDegreeLng,
    y: (lat - centLat) * metersPerDegreeLat,
  }));
}

export function createExteriorWalls(footprintLocal: Point2D[], thickness: number = 0.3): Wall[] {
  const walls: Wall[] = [];
  for (let i = 0; i < footprintLocal.length - 1; i++) {
    walls.push({
      id: uuidv4(),
      start: footprintLocal[i],
      end: footprintLocal[i + 1],
      thickness,
      isExterior: true,
    });
  }
  return walls;
}

export function generateFloors(building: Building): Floor[] {
  const floors: Floor[] = [];
  const exteriorWalls = createExteriorWalls(building.footprintLocal);

  for (let i = 0; i < building.floorCount; i++) {
    floors.push({
      id: uuidv4(),
      level: i,
      label: i === 0 ? 'Ground Floor' : `Floor ${i}`,
      height: building.defaultFloorHeight,
      walls: exteriorWalls.map((w) => ({ ...w, id: uuidv4() })),
      doors: [],
      windows: [],
      equipment: [],
      cableRoutes: [],
      annotations: [],
      photos: [],
    });
  }
  return floors;
}
```

**Step 2: Implement BuildingSetup view**

`src/views/BuildingSetup.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { Building2, Layers, Ruler, RefreshCw } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { geoPolygonToLocal, generateFloors } from '@/services/building-generator';

export function BuildingSetup() {
  const { currentProject, updateCurrentProject } = useProjectStore();
  const building = currentProject?.building;

  const [floorCount, setFloorCount] = useState(building?.floorCount ?? 1);
  const [floorHeight, setFloorHeight] = useState(building?.defaultFloorHeight ?? 3.0);

  useEffect(() => {
    if (building) {
      setFloorCount(building.floorCount);
      setFloorHeight(building.defaultFloorHeight);
    }
  }, [building]);

  if (!currentProject || !building) {
    return <div className="h-full flex items-center justify-center text-gray-400">No project loaded</div>;
  }

  const hasFootprint = building.footprint !== null;

  const handleGenerateFloors = async () => {
    let footprintLocal = building.footprintLocal;
    if (building.footprint && footprintLocal.length === 0) {
      footprintLocal = geoPolygonToLocal(building.footprint);
    }

    const updatedBuilding = {
      ...building,
      floorCount,
      defaultFloorHeight: floorHeight,
      footprintLocal,
      floors: generateFloors({
        ...building,
        floorCount,
        defaultFloorHeight: floorHeight,
        footprintLocal,
      }),
    };

    await updateCurrentProject({ building: updatedBuilding });
  };

  return (
    <div className="h-full overflow-auto p-4 max-w-lg mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Building Setup
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure the building dimensions and generate floors.
        </p>
      </div>

      {/* Footprint status */}
      <div className={`p-3 rounded-lg text-sm ${hasFootprint ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
        {hasFootprint
          ? 'Building footprint loaded from map.'
          : 'No footprint selected. Go to Map view to select a building, or floors will use a default rectangle.'}
      </div>

      {/* Floor count */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Layers className="w-4 h-4" />
          Number of Floors
        </label>
        <input
          type="number"
          min={1}
          max={100}
          value={floorCount}
          onChange={(e) => setFloorCount(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Floor height */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Ruler className="w-4 h-4" />
          Floor-to-Floor Height (meters)
        </label>
        <input
          type="number"
          min={2}
          max={10}
          step={0.1}
          value={floorHeight}
          onChange={(e) => setFloorHeight(Math.max(2, parseFloat(e.target.value) || 3))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerateFloors}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-[0.98]"
      >
        <RefreshCw className="w-4 h-4" />
        Generate {floorCount} Floor{floorCount > 1 ? 's' : ''}
      </button>

      {/* Floor list */}
      {building.floors.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Generated Floors</h3>
          <div className="space-y-1">
            {building.floors.map((floor) => (
              <div key={floor.id} className="flex items-center justify-between bg-white border rounded-lg px-3 py-2 text-sm">
                <span>{floor.label}</span>
                <span className="text-gray-400">{floor.walls.length} walls</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Verify building setup works**

```bash
npm run dev
```

Expected: Building Setup view shows floor count/height inputs. After generating floors, the floor list appears.

**Step 4: Commit**

```bash
git add src/
git commit -m "feat: add Building Setup view with floor generation from OSM footprint"
```

---

## Task 9: 2D Floor Plan Canvas — Core Rendering

**Files:**
- Create: `src/components/floor-plan/Canvas2D.tsx`
- Create: `src/components/floor-plan/renderers.ts`
- Create: `src/components/floor-plan/useCanvasInteraction.ts`
- Create: `src/components/floor-plan/FloorToolbar.tsx`
- Modify: `src/views/FloorPlanEditor.tsx`

**Step 1: Create rendering functions**

`src/components/floor-plan/renderers.ts`:

```typescript
import type { Wall, Door, Window as WindowType, Equipment, CableRoute, Annotation } from '@/types/building';
import type { Point2D } from '@/types/geometry';

const PIXELS_PER_METER = 50; // default scale

export function toScreen(point: Point2D, zoom: number, pan: Point2D, canvasW: number, canvasH: number): Point2D {
  return {
    x: (point.x * PIXELS_PER_METER * zoom) + pan.x + canvasW / 2,
    y: (-point.y * PIXELS_PER_METER * zoom) + pan.y + canvasH / 2, // flip Y
  };
}

export function toWorld(screenX: number, screenY: number, zoom: number, pan: Point2D, canvasW: number, canvasH: number): Point2D {
  return {
    x: (screenX - pan.x - canvasW / 2) / (PIXELS_PER_METER * zoom),
    y: -(screenY - pan.y - canvasH / 2) / (PIXELS_PER_METER * zoom),
  };
}

export function snapToGrid(point: Point2D, gridSize: number): Point2D {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

export function drawGrid(ctx: CanvasRenderingContext2D, zoom: number, pan: Point2D, w: number, h: number, gridSize: number) {
  const step = gridSize * PIXELS_PER_METER * zoom;
  if (step < 5) return; // too dense

  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 0.5;

  const offsetX = (pan.x + w / 2) % step;
  const offsetY = (pan.y + h / 2) % step;

  ctx.beginPath();
  for (let x = offsetX; x < w; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = offsetY; y < h; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
}

export function drawWalls(ctx: CanvasRenderingContext2D, walls: Wall[], zoom: number, pan: Point2D, w: number, h: number) {
  walls.forEach((wall) => {
    const start = toScreen(wall.start, zoom, pan, w, h);
    const end = toScreen(wall.end, zoom, pan, w, h);
    const thickness = wall.thickness * PIXELS_PER_METER * zoom;

    ctx.strokeStyle = wall.isExterior ? '#1e293b' : '#64748b';
    ctx.lineWidth = Math.max(thickness, 2);
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  });
}

export function drawDoors(ctx: CanvasRenderingContext2D, doors: Door[], walls: Wall[], zoom: number, pan: Point2D, w: number, h: number) {
  doors.forEach((door) => {
    const wall = walls.find((w) => w.id === door.wallId);
    if (!wall) return;

    const t = door.position;
    const doorCenter: Point2D = {
      x: wall.start.x + (wall.end.x - wall.start.x) * t,
      y: wall.start.y + (wall.end.y - wall.start.y) * t,
    };
    const screen = toScreen(doorCenter, zoom, pan, w, h);
    const size = door.width * PIXELS_PER_METER * zoom;

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, Math.max(size / 2, 4), 0, Math.PI * 2);
    ctx.fill();
  });
}

export function drawEquipment(ctx: CanvasRenderingContext2D, equipment: Equipment[], zoom: number, pan: Point2D, w: number, h: number) {
  equipment.forEach((eq) => {
    const screen = toScreen(eq.position, zoom, pan, w, h);
    const size = 12 * zoom;

    ctx.fillStyle = '#10b981';
    ctx.fillRect(screen.x - size / 2, screen.y - size / 2, size, size);

    ctx.fillStyle = '#065f46';
    ctx.font = `${Math.max(10, 10 * zoom)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(eq.label || eq.type, screen.x, screen.y + size / 2 + 12);
  });
}

export function drawCableRoutes(ctx: CanvasRenderingContext2D, routes: CableRoute[], zoom: number, pan: Point2D, w: number, h: number) {
  const cableColors: Record<string, string> = {
    fiber: '#ef4444',
    cat6: '#3b82f6',
    cat6a: '#6366f1',
    coaxial: '#f97316',
  };

  routes.forEach((route) => {
    if (route.points.length < 2) return;
    ctx.strokeStyle = cableColors[route.cableType] || '#6b7280';
    ctx.lineWidth = Math.max(2, 3 * zoom);
    ctx.setLineDash([6, 4]);

    ctx.beginPath();
    const first = toScreen(route.points[0], zoom, pan, w, h);
    ctx.moveTo(first.x, first.y);
    route.points.slice(1).forEach((p) => {
      const s = toScreen(p, zoom, pan, w, h);
      ctx.lineTo(s.x, s.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  });
}

export function drawAnnotations(ctx: CanvasRenderingContext2D, annotations: Annotation[], zoom: number, pan: Point2D, w: number, h: number) {
  annotations.forEach((ann) => {
    const screen = toScreen(ann.position, zoom, pan, w, h);
    ctx.fillStyle = '#7c3aed';
    ctx.font = `${Math.max(11, 11 * zoom)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(ann.text, screen.x + 6, screen.y + 4);

    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function drawTempWall(ctx: CanvasRenderingContext2D, start: Point2D, end: Point2D, zoom: number, pan: Point2D, w: number, h: number) {
  const s = toScreen(start, zoom, pan, w, h);
  const e = toScreen(end, zoom, pan, w, h);

  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 3;
  ctx.setLineDash([4, 4]);

  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(e.x, e.y);
  ctx.stroke();
  ctx.setLineDash([]);
}
```

**Step 2: Create canvas interaction hook**

`src/components/floor-plan/useCanvasInteraction.ts`:

```typescript
import { useRef, useCallback, useEffect, useState } from 'react';
import type { Point2D } from '@/types/geometry';
import { toWorld, snapToGrid } from './renderers';
import { useEditorStore } from '@/store/editorStore';

interface InteractionState {
  isPanning: boolean;
  lastPointer: Point2D | null;
  wallStart: Point2D | null;
  cablePoints: Point2D[];
}

export function useCanvasInteraction(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onWallCreated: (start: Point2D, end: Point2D) => void,
  onDoorPlaced: (worldPoint: Point2D) => void,
  onWindowPlaced: (worldPoint: Point2D) => void,
  onAnnotationPlaced: (worldPoint: Point2D) => void,
  onEquipmentPlaced: (worldPoint: Point2D) => void,
  onCableRouteCreated: (points: Point2D[]) => void,
) {
  const { activeTool, zoom, panOffset, snapEnabled, gridSize, setZoom, setPanOffset } = useEditorStore();
  const state = useRef<InteractionState>({
    isPanning: false,
    lastPointer: null,
    wallStart: null,
    cablePoints: [],
  });
  const [tempWallEnd, setTempWallEnd] = useState<Point2D | null>(null);

  const getWorldPoint = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const world = toWorld(
        e.clientX - rect.left,
        e.clientY - rect.top,
        zoom,
        panOffset,
        canvas.width,
        canvas.height,
      );
      return snapEnabled ? snapToGrid(world, gridSize) : world;
    },
    [canvasRef, zoom, panOffset, snapEnabled, gridSize],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const point = getWorldPoint(e);

      if (activeTool === 'pan' || e.button === 1) {
        state.current.isPanning = true;
        state.current.lastPointer = { x: e.clientX, y: e.clientY };
        return;
      }

      if (activeTool === 'wall') {
        if (!state.current.wallStart) {
          state.current.wallStart = point;
        } else {
          onWallCreated(state.current.wallStart, point);
          state.current.wallStart = point; // chain walls
          setTempWallEnd(null);
        }
        return;
      }

      if (activeTool === 'door') { onDoorPlaced(point); return; }
      if (activeTool === 'window') { onWindowPlaced(point); return; }
      if (activeTool === 'annotate') { onAnnotationPlaced(point); return; }
      if (activeTool === 'equipment') { onEquipmentPlaced(point); return; }

      if (activeTool === 'cable') {
        state.current.cablePoints.push(point);
        return;
      }
    },
    [activeTool, getWorldPoint, onWallCreated, onDoorPlaced, onWindowPlaced, onAnnotationPlaced, onEquipmentPlaced],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (state.current.isPanning && state.current.lastPointer) {
        const dx = e.clientX - state.current.lastPointer.x;
        const dy = e.clientY - state.current.lastPointer.y;
        setPanOffset({ x: panOffset.x + dx, y: panOffset.y + dy });
        state.current.lastPointer = { x: e.clientX, y: e.clientY };
        return;
      }

      if (activeTool === 'wall' && state.current.wallStart) {
        setTempWallEnd(getWorldPoint(e));
      }
    },
    [activeTool, panOffset, setPanOffset, getWorldPoint],
  );

  const handlePointerUp = useCallback(() => {
    state.current.isPanning = false;
    state.current.lastPointer = null;
  }, []);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(zoom * delta);
    },
    [zoom, setZoom],
  );

  const handleDoubleClick = useCallback(() => {
    // Finish cable route on double-click
    if (activeTool === 'cable' && state.current.cablePoints.length >= 2) {
      onCableRouteCreated([...state.current.cablePoints]);
      state.current.cablePoints = [];
    }
    // Cancel wall chain on double-click
    if (activeTool === 'wall') {
      state.current.wallStart = null;
      setTempWallEnd(null);
    }
  }, [activeTool, onCableRouteCreated]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [canvasRef, handleWheel]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDoubleClick,
    tempWallStart: state.current.wallStart,
    tempWallEnd,
  };
}
```

**Step 3: Create FloorToolbar**

`src/components/floor-plan/FloorToolbar.tsx`:

```tsx
import { useEditorStore, EditorTool } from '@/store/editorStore';
import {
  MousePointer2, Minus, DoorOpen, SquareSplitHorizontal,
  MessageSquare, Camera, Cable, Box, Move, Undo2, Redo2, Grid3x3, Magnet,
} from 'lucide-react';

const tools: { tool: EditorTool; icon: typeof MousePointer2; label: string }[] = [
  { tool: 'select', icon: MousePointer2, label: 'Select' },
  { tool: 'pan', icon: Move, label: 'Pan' },
  { tool: 'wall', icon: Minus, label: 'Wall' },
  { tool: 'door', icon: DoorOpen, label: 'Door' },
  { tool: 'window', icon: SquareSplitHorizontal, label: 'Window' },
  { tool: 'equipment', icon: Box, label: 'Equipment' },
  { tool: 'cable', icon: Cable, label: 'Cable' },
  { tool: 'annotate', icon: MessageSquare, label: 'Note' },
  { tool: 'photo', icon: Camera, label: 'Photo' },
];

interface FloorToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function FloorToolbar({ onUndo, onRedo, canUndo, canRedo }: FloorToolbarProps) {
  const { activeTool, setTool, showGrid, snapEnabled, toggleGrid, toggleSnap } = useEditorStore();

  return (
    <div className="bg-white border-t border-gray-200 px-2 py-1.5 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-0.5 overflow-x-auto">
        {tools.map(({ tool, icon: Icon, label }) => (
          <button
            key={tool}
            onClick={() => setTool(tool)}
            className={`flex flex-col items-center px-2 py-1.5 rounded text-xs min-w-[48px] min-h-[48px] justify-center ${
              activeTool === tool
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            title={label}
          >
            <Icon className="w-5 h-5" />
            <span className="mt-0.5 hidden sm:block">{label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 ml-2">
        <button
          onClick={toggleGrid}
          className={`p-2 rounded ${showGrid ? 'bg-blue-100 text-blue-700' : 'text-gray-400'}`}
          title="Toggle Grid"
        >
          <Grid3x3 className="w-4 h-4" />
        </button>
        <button
          onClick={toggleSnap}
          className={`p-2 rounded ${snapEnabled ? 'bg-blue-100 text-blue-700' : 'text-gray-400'}`}
          title="Toggle Snap"
        >
          <Magnet className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <button onClick={onUndo} disabled={!canUndo} className="p-2 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Undo">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={onRedo} disabled={!canRedo} className="p-2 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Redo">
          <Redo2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
```

**Step 4: Create Canvas2D component**

`src/components/floor-plan/Canvas2D.tsx`:

```tsx
import { useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';
import type { Floor } from '@/types/building';
import type { Point2D } from '@/types/geometry';
import {
  drawGrid, drawWalls, drawDoors, drawEquipment,
  drawCableRoutes, drawAnnotations, drawTempWall,
} from './renderers';
import { useCanvasInteraction } from './useCanvasInteraction';

interface Canvas2DProps {
  floor: Floor;
  onWallCreated: (start: Point2D, end: Point2D) => void;
  onDoorPlaced: (worldPoint: Point2D) => void;
  onWindowPlaced: (worldPoint: Point2D) => void;
  onAnnotationPlaced: (worldPoint: Point2D) => void;
  onEquipmentPlaced: (worldPoint: Point2D) => void;
  onCableRouteCreated: (points: Point2D[]) => void;
}

export function Canvas2D({
  floor,
  onWallCreated,
  onDoorPlaced,
  onWindowPlaced,
  onAnnotationPlaced,
  onEquipmentPlaced,
  onCableRouteCreated,
}: Canvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { zoom, panOffset, showGrid, gridSize } = useEditorStore();

  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDoubleClick,
    tempWallStart,
    tempWallEnd,
  } = useCanvasInteraction(
    canvasRef,
    onWallCreated,
    onDoorPlaced,
    onWindowPlaced,
    onAnnotationPlaced,
    onEquipmentPlaced,
    onCableRouteCreated,
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);

    // Grid
    if (showGrid) {
      drawGrid(ctx, zoom, panOffset, w, h, gridSize);
    }

    // Building elements
    drawWalls(ctx, floor.walls, zoom, panOffset, w, h);
    drawDoors(ctx, floor.doors, floor.walls, zoom, panOffset, w, h);
    drawCableRoutes(ctx, floor.cableRoutes, zoom, panOffset, w, h);
    drawEquipment(ctx, floor.equipment, zoom, panOffset, w, h);
    drawAnnotations(ctx, floor.annotations, zoom, panOffset, w, h);

    // Temp wall preview
    if (tempWallStart && tempWallEnd) {
      drawTempWall(ctx, tempWallStart, tempWallEnd, zoom, panOffset, w, h);
    }
  }, [floor, zoom, panOffset, showGrid, gridSize, tempWallStart, tempWallEnd]);

  // Resize canvas to container
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      render();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [render]);

  // Re-render on state changes
  useEffect(() => {
    render();
  }, [render]);

  return (
    <div ref={containerRef} className="w-full h-full touch-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        className="block"
      />
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add src/components/floor-plan/
git commit -m "feat: add 2D floor plan canvas with wall rendering, grid, snap, and touch interaction"
```

---

## Task 10: Floor Plan Editor View (Connecting Canvas to State)

**Files:**
- Modify: `src/views/FloorPlanEditor.tsx`
- Create: `src/hooks/useFloorEditor.ts`

**Step 1: Create floor editor hook with undo/redo**

`src/hooks/useFloorEditor.ts`:

```typescript
import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Floor, Wall, Door, Equipment, CableRoute, Annotation } from '@/types/building';
import type { Point2D } from '@/types/geometry';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';

export function useFloorEditor() {
  const { currentProject, updateCurrentProject } = useProjectStore();
  const { activeFloorIndex } = useEditorStore();

  const building = currentProject?.building;
  const floor = building?.floors[activeFloorIndex] ?? null;

  const undoStack = useRef<Floor[]>([]);
  const redoStack = useRef<Floor[]>([]);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const saveFloor = useCallback(
    async (updatedFloor: Floor) => {
      if (!building || !currentProject) return;
      const floors = [...building.floors];
      floors[activeFloorIndex] = updatedFloor;
      await updateCurrentProject({
        building: { ...building, floors },
      });
    },
    [building, currentProject, activeFloorIndex, updateCurrentProject],
  );

  const pushUndo = useCallback(() => {
    if (!floor) return;
    undoStack.current.push(structuredClone(floor));
    redoStack.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, [floor]);

  const undo = useCallback(async () => {
    if (!floor || undoStack.current.length === 0) return;
    redoStack.current.push(structuredClone(floor));
    const prev = undoStack.current.pop()!;
    await saveFloor(prev);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
  }, [floor, saveFloor]);

  const redo = useCallback(async () => {
    if (!floor || redoStack.current.length === 0) return;
    undoStack.current.push(structuredClone(floor));
    const next = redoStack.current.pop()!;
    await saveFloor(next);
    setCanRedo(redoStack.current.length > 0);
    setCanUndo(true);
  }, [floor, saveFloor]);

  const addWall = useCallback(
    async (start: Point2D, end: Point2D) => {
      if (!floor) return;
      pushUndo();
      const wall: Wall = {
        id: uuidv4(),
        start,
        end,
        thickness: 0.15,
        isExterior: false,
      };
      await saveFloor({ ...floor, walls: [...floor.walls, wall] });
    },
    [floor, pushUndo, saveFloor],
  );

  const addDoor = useCallback(
    async (worldPoint: Point2D) => {
      if (!floor) return;
      // Find nearest wall
      const nearest = findNearestWall(floor.walls, worldPoint);
      if (!nearest) return;
      pushUndo();
      const door: Door = {
        id: uuidv4(),
        wallId: nearest.wall.id,
        position: nearest.t,
        width: 0.9,
      };
      await saveFloor({ ...floor, doors: [...floor.doors, door] });
    },
    [floor, pushUndo, saveFloor],
  );

  const addWindow = useCallback(
    async (worldPoint: Point2D) => {
      if (!floor) return;
      const nearest = findNearestWall(floor.walls, worldPoint);
      if (!nearest) return;
      pushUndo();
      const win = {
        id: uuidv4(),
        wallId: nearest.wall.id,
        position: nearest.t,
        width: 1.2,
        sillHeight: 0.9,
        height: 1.2,
      };
      await saveFloor({ ...floor, windows: [...floor.windows, win] });
    },
    [floor, pushUndo, saveFloor],
  );

  const addAnnotation = useCallback(
    async (worldPoint: Point2D) => {
      if (!floor) return;
      pushUndo();
      const annotation: Annotation = {
        id: uuidv4(),
        text: 'Note',
        position: worldPoint,
        timestamp: Date.now(),
      };
      await saveFloor({ ...floor, annotations: [...floor.annotations, annotation] });
    },
    [floor, pushUndo, saveFloor],
  );

  const addEquipment = useCallback(
    async (worldPoint: Point2D) => {
      if (!floor) return;
      pushUndo();
      const eq: Equipment = {
        id: uuidv4(),
        type: 'access-point',
        position: worldPoint,
        label: 'AP',
        properties: {},
      };
      await saveFloor({ ...floor, equipment: [...floor.equipment, eq] });
    },
    [floor, pushUndo, saveFloor],
  );

  const addCableRoute = useCallback(
    async (points: Point2D[]) => {
      if (!floor || points.length < 2) return;
      pushUndo();
      const route: CableRoute = {
        id: uuidv4(),
        points,
        cableType: 'fiber',
        label: '',
      };
      await saveFloor({ ...floor, cableRoutes: [...floor.cableRoutes, route] });
    },
    [floor, pushUndo, saveFloor],
  );

  return {
    floor,
    addWall,
    addDoor,
    addWindow,
    addAnnotation,
    addEquipment,
    addCableRoute,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}

function findNearestWall(walls: Wall[], point: Point2D, maxDist: number = 1.0) {
  let best: { wall: Wall; t: number; dist: number } | null = null;

  for (const wall of walls) {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;

    let t = ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / lenSq;
    t = Math.max(0.05, Math.min(0.95, t));

    const proj = { x: wall.start.x + t * dx, y: wall.start.y + t * dy };
    const dist = Math.hypot(point.x - proj.x, point.y - proj.y);

    if (dist < maxDist && (!best || dist < best.dist)) {
      best = { wall, t, dist };
    }
  }

  return best;
}
```

**Step 2: Implement FloorPlanEditor view**

`src/views/FloorPlanEditor.tsx`:

```tsx
import { Canvas2D } from '@/components/floor-plan/Canvas2D';
import { FloorToolbar } from '@/components/floor-plan/FloorToolbar';
import { useFloorEditor } from '@/hooks/useFloorEditor';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';

export function FloorPlanEditor() {
  const { currentProject } = useProjectStore();
  const { activeFloorIndex, setActiveFloor } = useEditorStore();
  const {
    floor,
    addWall, addDoor, addWindow, addAnnotation,
    addEquipment, addCableRoute,
    undo, redo, canUndo, canRedo,
  } = useFloorEditor();

  const building = currentProject?.building;

  if (!building || building.floors.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 p-4 text-center">
        <div>
          <p className="text-lg">No floors generated yet.</p>
          <p className="text-sm mt-1">Go to Building Setup to generate floors first.</p>
        </div>
      </div>
    );
  }

  if (!floor) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Floor selector */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-2 shrink-0 overflow-x-auto">
        {building.floors.map((f, i) => (
          <button
            key={f.id}
            onClick={() => setActiveFloor(i)}
            className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${
              i === activeFloorIndex
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <Canvas2D
          floor={floor}
          onWallCreated={addWall}
          onDoorPlaced={addDoor}
          onWindowPlaced={addWindow}
          onAnnotationPlaced={addAnnotation}
          onEquipmentPlaced={addEquipment}
          onCableRouteCreated={addCableRoute}
        />
      </div>

      {/* Toolbar */}
      <FloorToolbar
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
    </div>
  );
}
```

**Step 3: Verify the floor plan editor**

```bash
npm run dev
```

Expected: After generating floors in Building Setup, the Floor Plan editor shows exterior walls on canvas. Can draw interior walls with tap-tap, place doors/equipment, scroll to zoom, drag to pan.

**Step 4: Commit**

```bash
git add src/
git commit -m "feat: add 2D Floor Plan Editor with wall drawing, door/window/equipment placement, undo/redo"
```

---

## Task 11: 3D BIM Viewer with That Open Libraries

**Files:**
- Modify: `src/views/BIMViewer.tsx`
- Create: `src/services/bim-generator.ts`

**Step 1: Create BIM geometry generator**

`src/services/bim-generator.ts`:

```typescript
import * as THREE from 'three';
import type { Building, Floor, Wall } from '@/types/building';

/**
 * Generates Three.js geometry from the building model.
 * Each floor's walls are extruded to 3D at the correct height.
 */
export function generateBuildingMesh(building: Building): THREE.Group {
  const group = new THREE.Group();

  const exteriorMat = new THREE.MeshLambertMaterial({ color: 0xd1d5db });
  const interiorMat = new THREE.MeshLambertMaterial({ color: 0x93c5fd });
  const floorMat = new THREE.MeshLambertMaterial({ color: 0xf3f4f6, side: THREE.DoubleSide });

  let currentHeight = 0;

  building.floors.forEach((floor) => {
    const floorGroup = new THREE.Group();
    floorGroup.position.y = currentHeight;

    // Walls
    floor.walls.forEach((wall) => {
      const mesh = createWallMesh(wall, floor.height, wall.isExterior ? exteriorMat : interiorMat);
      floorGroup.add(mesh);
    });

    // Floor slab (if we have footprint)
    if (building.footprintLocal.length > 2) {
      const slab = createFloorSlab(building.footprintLocal, floorMat);
      floorGroup.add(slab);
    }

    group.add(floorGroup);
    currentHeight += floor.height;
  });

  // Center the model
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.sub(center);

  return group;
}

function createWallMesh(
  wall: Wall,
  height: number,
  material: THREE.Material,
): THREE.Mesh {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.hypot(dx, dy);

  if (length < 0.01) return new THREE.Mesh();

  const geometry = new THREE.BoxGeometry(length, height, wall.thickness);
  const mesh = new THREE.Mesh(geometry, material);

  // Position at wall midpoint
  const midX = (wall.start.x + wall.end.x) / 2;
  const midY = (wall.start.y + wall.end.y) / 2;
  mesh.position.set(midX, height / 2, -midY); // Z is flipped for 3D convention

  // Rotate to match wall angle
  const angle = Math.atan2(dy, dx);
  mesh.rotation.y = -angle;

  return mesh;
}

function createFloorSlab(
  footprint: { x: number; y: number }[],
  material: THREE.Material,
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(footprint[0].x, -footprint[0].y);
  for (let i = 1; i < footprint.length; i++) {
    shape.lineTo(footprint[i].x, -footprint[i].y);
  }
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0;

  return mesh;
}
```

**Step 2: Implement BIMViewer**

`src/views/BIMViewer.tsx`:

```tsx
import { useRef, useEffect } from 'react';
import * as OBC from '@thatopen/components';
import * as THREE from 'three';
import { useProjectStore } from '@/store/projectStore';
import { generateBuildingMesh } from '@/services/bim-generator';

export function BIMViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const componentsRef = useRef<OBC.Components | null>(null);
  const { currentProject } = useProjectStore();
  const building = currentProject?.building;

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const components = new OBC.Components();
    componentsRef.current = components;

    const worlds = components.get(OBC.Worlds);
    const world = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>();

    world.scene = new OBC.SimpleScene(components);
    world.renderer = new OBC.SimpleRenderer(components, container);
    world.camera = new OBC.SimpleCamera(components);

    components.init();
    world.scene.setup();

    // Add grid
    const grids = components.get(OBC.Grids);
    grids.create(world);

    // Add building mesh
    if (building && building.floors.length > 0) {
      const buildingMesh = generateBuildingMesh(building);
      world.scene.three.add(buildingMesh);

      // Position camera to see the whole building
      const totalHeight = building.floors.reduce((h, f) => h + f.height, 0);
      world.camera.controls.setLookAt(30, totalHeight + 10, 30, 0, totalHeight / 2, 0);
    } else {
      world.camera.controls.setLookAt(10, 10, 10, 0, 0, 0);
    }

    return () => {
      components.dispose();
    };
  }, [building]);

  if (!building || building.floors.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 p-4 text-center">
        <div>
          <p className="text-lg">No building model yet.</p>
          <p className="text-sm mt-1">Generate floors in Building Setup to see the 3D view.</p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}
```

**Step 3: Verify 3D viewer**

```bash
npm run dev
```

Expected: After generating floors, the 3D view shows extruded walls with orbit camera controls.

**Step 4: Commit**

```bash
git add src/
git commit -m "feat: add 3D BIM Viewer using That Open Components with building mesh generation"
```

---

## Task 12: PWA Configuration (Offline Support)

**Files:**
- Create: `src/sw.ts` (service worker)
- Modify: `vite.config.ts`
- Create: `public/manifest.json`
- Create: `public/icons/icon-192.png` (placeholder)
- Create: `public/icons/icon-512.png` (placeholder)

**Step 1: Install PWA plugin**

```bash
npm install -D vite-plugin-pwa
```

**Step 2: Create manifest**

`public/manifest.json`:

```json
{
  "name": "BuildConnect",
  "short_name": "BuildConnect",
  "description": "Network survey and design tool for buildings",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Step 3: Update Vite config with PWA plugin**

Add to `vite.config.ts`:

```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: false, // use public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/basemaps\.cartocdn\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 5000, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/overpass-api\.de\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'overpass-queries',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

**Step 4: Create placeholder icons**

```bash
mkdir -p public/icons
```

Generate simple placeholder PNGs (will be replaced with real icons later):

```bash
# Use a simple 1x1 blue pixel expanded — or skip and add real icons later
# For now, create empty placeholder files so the build doesn't fail
touch public/icons/icon-192.png
touch public/icons/icon-512.png
```

**Step 5: Add PWA meta tags to index.html**

Add to `<head>` in `index.html`:

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#2563eb" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
```

**Step 6: Verify build works**

```bash
npm run build
```

Expected: Build succeeds, outputs dist/ with service worker files.

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add PWA configuration with offline caching for map tiles and Overpass queries"
```

---

## Task 13: Create GitHub Repository

**Step 1: Create repo and push**

```bash
gh repo create BuildConnect --public --source=. --description "BIM-based network survey and design tool for telecom engineers" --push
```

**Step 2: Verify repo exists**

```bash
gh repo view --web
```

Expected: Opens the GitHub repo page with all committed code.

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Project scaffolding | vite.config.ts, package.json |
| 2 | Data model types | src/types/*.ts |
| 3 | IndexedDB storage layer | src/storage/*.ts |
| 4 | Zustand state management | src/store/*.ts |
| 5 | Project Dashboard UI | src/views/ProjectDashboard.tsx |
| 6 | Workspace layout + routing | src/views/ProjectWorkspace.tsx |
| 7 | Map View + OSM buildings | src/views/MapView.tsx, src/services/overpass.ts |
| 8 | Building Setup | src/views/BuildingSetup.tsx |
| 9 | 2D Canvas rendering engine | src/components/floor-plan/*.ts |
| 10 | Floor Plan Editor | src/views/FloorPlanEditor.tsx |
| 11 | 3D BIM Viewer | src/views/BIMViewer.tsx, src/services/bim-generator.ts |
| 12 | PWA offline support | vite.config.ts, manifest.json |
| 13 | GitHub repository | Remote repo |
