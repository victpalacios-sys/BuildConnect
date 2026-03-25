# Unified Workspace Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild BuildConnect from a 4-tab layout into a unified MapLibre-centric workspace with multi-building support, contacts, dual-mode touch/mouse interaction, and 2D cross-section views.

**Architecture:** MapLibre is the single rendering canvas. Floor plans render as GeoJSON layers on the map. Side panels follow Material Design (non-modal desktop, bottom sheets mobile). Input auto-detects touch vs mouse. All data follows View→Edit pattern.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, MapLibre GL JS, Three.js, Zustand, IndexedDB (idb), Vitest

**Design doc:** `docs/plans/2026-03-25-unified-workspace-design.md`

---

## Phase 1: Data Model & Storage Migration

### Task 1: Update Type Definitions

**Files:**
- Modify: `src/types/project.ts`
- Modify: `src/types/building.ts`
- Create: `src/types/contact.ts`

**Step 1: Create Contact type**

Create `src/types/contact.ts`:

```typescript
export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string; // free text: "Building Manager", "Tenant", etc.
}
```

**Step 2: Update Building type**

Modify `src/types/building.ts` — add to the `Building` interface:

```typescript
export interface SectionCut {
  id: string;
  label: string;
  start: import('./geometry').GeoPoint;
  end: import('./geometry').GeoPoint;
}

export interface Floor {
  id: string;
  level: number;
  label: string;
  shortLabel: string;        // NEW: compact label for floor nav, e.g. "4", "-1", "M"
  height: number;
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
  name: string;              // NEW
  address: string;           // NEW: was on Project
  footprint: GeoPolygon | null;
  footprintLocal: Point2D[];
  groundFloorLevel: number;  // NEW: default 0, configurable
  defaultFloorHeight: number;
  floors: Floor[];
  sectionCuts: SectionCut[]; // NEW
}
```

Remove `floorCount` from Building (derived from `floors.length`).

**Step 3: Update Project type**

Modify `src/types/project.ts`:

```typescript
import type { GeoPoint } from './geometry';
import type { Annotation, Building, Equipment, CableRoute } from './building';
import type { Contact } from './contact';

export type ProjectStatus = 'draft' | 'survey' | 'design' | 'review' | 'complete';

export interface OutdoorPlan {
  fiberSourceLocation: GeoPoint | null;
  cableRoutes: CableRoute[];     // CHANGED: array of geo-positioned routes
  equipment: Equipment[];         // NEW: geo-positioned outdoor equipment
  annotations: Annotation[];
}

export interface Project {
  id: string;
  name: string;
  customer: string;               // was on Project already
  status: ProjectStatus;
  createdAt: number;
  updatedAt: number;
  center: GeoPoint | null;
  contacts: Contact[];            // NEW
  buildings: Building[];          // CHANGED: was singular `building`
  outdoorPlan: OutdoorPlan;
}
```

Remove `address` from Project (lives on Building now).

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Errors in files that reference old `Project.building` (singular) and `Project.address`. This is expected — we fix those in subsequent tasks.

**Step 5: Commit**

```bash
git add src/types/
git commit -m "feat: update data model — multi-building, contacts, floor labels, section cuts"
```

---

### Task 2: Update Storage Layer

**Files:**
- Modify: `src/storage/db.ts`
- Modify: `src/storage/projects.ts`
- Modify: `src/storage/__tests__/projects.test.ts`

**Step 1: Update DB version and add migration**

Modify `src/storage/db.ts` — bump `DB_VERSION` to 2. The schema doesn't change (projects store stays the same) but the data shape changes. IndexedDB doesn't enforce schema on values so this is just a version bump for safety.

```typescript
const DB_VERSION = 2;
```

In the `upgrade` callback, keep existing logic and add version check:

```typescript
upgrade(db, oldVersion) {
  if (oldVersion < 1) {
    const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
    projectStore.createIndex('by-updated', 'updatedAt');
    projectStore.createIndex('by-status', 'status');
  }
  // v2: data shape change handled in migration util
},
```

**Step 2: Update createEmptyProject**

Modify `src/storage/projects.ts` — update `createEmptyProject`:

```typescript
function createEmptyProject(name: string, customer: string): Project {
  const now = Date.now();
  return {
    id: uuidv4(),
    name,
    customer,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    center: null,
    contacts: [],
    buildings: [],
    outdoorPlan: {
      fiberSourceLocation: null,
      cableRoutes: [],
      equipment: [],
      annotations: [],
    },
  };
}
```

Update `createProject` signature — remove `address` parameter:

```typescript
export async function createProject(
  name: string,
  customer: string,
): Promise<Project> {
  const db = await getDB();
  const project = createEmptyProject(name, customer);
  await db.put('projects', project);
  return project;
}
```

**Step 3: Add a data migration utility**

Create `src/storage/migrate.ts`:

```typescript
import { v4 as uuidv4 } from 'uuid';
import type { Project } from '@/types/project';

/**
 * Migrates a project from the v1 data shape (singular building, address on project)
 * to v2 (buildings array, contacts, etc.). Returns the project unchanged if already v2.
 */
export function migrateProjectV1toV2(raw: any): Project {
  // Already v2: has buildings array
  if (Array.isArray(raw.buildings)) return raw as Project;

  // v1 shape: has singular `building` and `address`
  const oldBuilding = raw.building;
  const newBuilding = {
    ...oldBuilding,
    name: raw.name || 'Main Building',
    address: raw.address || '',
    groundFloorLevel: 0,
    sectionCuts: [],
    floors: (oldBuilding?.floors || []).map((f: any) => ({
      ...f,
      shortLabel: f.shortLabel || String(f.level >= 0 ? f.level + 1 : f.level),
    })),
  };
  delete newBuilding.floorCount;

  return {
    id: raw.id,
    name: raw.name,
    customer: raw.customer || '',
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    center: raw.center,
    contacts: [],
    buildings: oldBuilding ? [newBuilding] : [],
    outdoorPlan: {
      fiberSourceLocation: raw.outdoorPlan?.fiberSourceLocation || null,
      cableRoutes: raw.outdoorPlan?.cableRoute
        ? [{ id: uuidv4(), points: [], cableType: 'fiber' as const, label: 'Main Route' }]
        : [],
      equipment: [],
      annotations: raw.outdoorPlan?.annotations || [],
    },
  };
}
```

**Step 4: Apply migration in listProjects and getProject**

In `src/storage/projects.ts`, import and apply migration:

```typescript
import { migrateProjectV1toV2 } from './migrate';

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDB();
  const raw = await db.get('projects', id);
  if (!raw) return undefined;
  const migrated = migrateProjectV1toV2(raw);
  // Persist migration if shape changed
  if (migrated !== raw) await db.put('projects', migrated);
  return migrated;
}

export async function listProjects(): Promise<Project[]> {
  const db = await getDB();
  const rawList = await db.getAllFromIndex('projects', 'by-updated');
  const migrated = rawList.map(migrateProjectV1toV2);
  return migrated;
}
```

**Step 5: Update tests**

Modify `src/storage/__tests__/projects.test.ts` — update `createProject` calls to remove `address` param:

```typescript
// Before: await createProject('Test Project', '123 Main St', 'ACME Corp');
// After:
await createProject('Test Project', 'ACME Corp');
```

Update all test cases accordingly.

**Step 6: Run tests**

Run: `npx vitest run src/storage/__tests__/projects.test.ts`
Expected: All 4 tests pass.

**Step 7: Commit**

```bash
git add src/storage/ src/types/
git commit -m "feat: update storage layer for multi-building projects with v1→v2 migration"
```

---

### Task 3: Update Zustand Stores

**Files:**
- Modify: `src/store/projectStore.ts`
- Modify: `src/store/editorStore.ts`

**Step 1: Update projectStore**

```typescript
import { create } from 'zustand';
import type { Project } from '@/types/project';
import type { Building } from '@/types/building';
import * as projectStorage from '@/storage/projects';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  activeBuildingId: string | null;  // NEW: which building is focused
  loading: boolean;

  loadProjects: () => Promise<void>;
  createProject: (name: string, customer: string) => Promise<Project>;
  openProject: (id: string) => Promise<void>;
  updateCurrentProject: (changes: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  closeProject: () => void;

  // NEW: building management
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
```

**Step 2: Update editorStore — add view mode tracking**

Add to `editorStore.ts`:

```typescript
export type ViewMode = 'site' | 'building' | 'floor' | 'outdoor';

// Add to interface:
viewMode: ViewMode;
mapTileOpacity: number;
setViewMode: (mode: ViewMode) => void;
setMapTileOpacity: (opacity: number) => void;

// Add to create():
viewMode: 'site',
mapTileOpacity: 1.0,
setViewMode: (mode) => set({ viewMode: mode }),
setMapTileOpacity: (opacity) => set({ mapTileOpacity: Math.max(0, Math.min(1, opacity)) }),
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Still errors in view components (not yet updated). Store files should compile.

**Step 4: Commit**

```bash
git add src/store/
git commit -m "feat: update stores for multi-building, active building, and view modes"
```

---

## Phase 2: Project Dashboard Updates

### Task 4: Update Project Dashboard

**Files:**
- Modify: `src/components/ProjectCard.tsx`
- Modify: `src/components/NewProjectDialog.tsx`
- Modify: `src/views/ProjectDashboard.tsx`
- Delete: `src/components/EditProjectDialog.tsx` (functionality moves to side panel later)

**Step 1: Update ProjectCard — remove delete, add building count**

```tsx
import { Building2, Clock, User } from 'lucide-react';
import type { Project } from '@/types/project';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    survey: 'bg-blue-100 text-blue-700',
    design: 'bg-purple-100 text-purple-700',
    review: 'bg-amber-100 text-amber-700',
    complete: 'bg-green-100 text-green-700',
  };

  const buildingCount = project.buildings.length;

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

      {project.customer && (
        <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
          <User className="w-3.5 h-3.5" />
          {project.customer}
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(project.updatedAt).toLocaleDateString()}
        </span>
        <span className="text-xs text-gray-400">
          {buildingCount} building{buildingCount !== 1 ? 's' : ''}
        </span>
      </div>
    </button>
  );
}
```

**Step 2: Update NewProjectDialog — remove address field**

Remove the address input. Keep name (required) and customer.

```tsx
import { useState } from 'react';
import { X } from 'lucide-react';

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, customer: string) => void;
}

export function NewProjectDialog({ open, onClose, onCreate }: NewProjectDialogProps) {
  const [name, setName] = useState('');
  const [customer, setCustomer] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), customer.trim());
    setName('');
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
              placeholder="e.g., ACME Corp - Fiber Install"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <input
              type="text"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Company or client name"
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

**Step 3: Update ProjectDashboard — add search, update create flow**

```tsx
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Search } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { ProjectCard } from '@/components/ProjectCard';
import { NewProjectDialog } from '@/components/NewProjectDialog';
import { useProjectStore } from '@/store/projectStore';

export function ProjectDashboard() {
  const navigate = useNavigate();
  const { projects, loading, loadProjects, createProject, openProject } = useProjectStore();
  const [showNew, setShowNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.customer.toLowerCase().includes(q) ||
      p.contacts.some((c) => c.name.toLowerCase().includes(q)) ||
      p.buildings.some((b) => b.address.toLowerCase().includes(q))
    );
  }, [projects, searchQuery]);

  const handleCreate = async (name: string, customer: string) => {
    const project = await createProject(name, customer);
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
        {/* Search bar */}
        {projects.length > 0 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, customers, contacts, addresses..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : filteredProjects.length === 0 && searchQuery ? (
          <div className="text-center py-12 text-gray-400">
            No projects match "{searchQuery}"
          </div>
        ) : filteredProjects.length === 0 ? (
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
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleOpen(project.id)}
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

**Step 4: Delete EditProjectDialog**

```bash
rm src/components/EditProjectDialog.tsx
```

This functionality moves to the side panel in Phase 3.

**Step 5: Verify build**

Run: `npx tsc --noEmit` then `npm run build`
Note: The workspace views (ProjectWorkspace, MapView, etc.) will have errors due to old references. We'll fix those in Phase 3.

**Step 6: Commit**

```bash
git add src/components/ProjectCard.tsx src/components/NewProjectDialog.tsx src/views/ProjectDashboard.tsx
git rm src/components/EditProjectDialog.tsx
git commit -m "feat: update dashboard — search, multi-building cards, simplified project creation"
```

---

## Phase 3: Unified Workspace Layout

### Task 5: Create Side Panel Component

**Files:**
- Create: `src/components/layout/SidePanel.tsx`
- Create: `src/components/layout/BottomSheet.tsx`
- Create: `src/hooks/useResponsive.ts`

**Step 1: Create responsive breakpoint hook**

`src/hooks/useResponsive.ts`:

```typescript
import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useResponsive(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => getBreakpoint());

  useEffect(() => {
    const handler = () => setBreakpoint(getBreakpoint());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return breakpoint;
}

function getBreakpoint(): Breakpoint {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}
```

**Step 2: Create BottomSheet component**

`src/components/layout/BottomSheet.tsx`:

```tsx
import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  modal?: boolean;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, modal = false, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<'collapsed' | 'half' | 'full'>('half');
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    dragStartHeight.current = sheetRef.current?.getBoundingClientRect().height ?? 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handleDrag = useCallback((e: React.PointerEvent) => {
    if (!dragStartY.current) return;
    const deltaY = dragStartY.current - e.clientY;
    const newHeight = dragStartHeight.current + deltaY;
    const vh = window.innerHeight;

    if (newHeight < vh * 0.15) {
      setHeight('collapsed');
      onClose();
    } else if (newHeight < vh * 0.5) {
      setHeight('half');
    } else {
      setHeight('full');
    }
  }, [onClose]);

  const handleDragEnd = useCallback(() => {
    dragStartY.current = 0;
  }, []);

  if (!open) return null;

  const heightClass = height === 'full' ? 'h-[85vh]' : height === 'half' ? 'h-[33vh]' : 'h-[10vh]';

  return (
    <>
      {modal && (
        <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      )}
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-lg transition-all duration-200 ${heightClass}`}
      >
        <div
          className="flex justify-center py-2 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handleDragStart}
          onPointerMove={handleDrag}
          onPointerUp={handleDragEnd}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="overflow-auto h-[calc(100%-20px)] px-4 pb-4">
          {children}
        </div>
      </div>
    </>
  );
}
```

**Step 3: Create SidePanel component**

`src/components/layout/SidePanel.tsx`:

```tsx
import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { BottomSheet } from './BottomSheet';

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function SidePanel({ open, onClose, title, children }: SidePanelProps) {
  const breakpoint = useResponsive();

  // Mobile: modal bottom sheet
  if (breakpoint === 'mobile') {
    return (
      <BottomSheet open={open} onClose={onClose} modal>
        {title && (
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {children}
      </BottomSheet>
    );
  }

  // Tablet: non-modal bottom sheet
  if (breakpoint === 'tablet') {
    return (
      <BottomSheet open={open} onClose={onClose}>
        {title && (
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {children}
      </BottomSheet>
    );
  }

  // Desktop: right side panel, pushes content
  if (!open) return null;

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col shrink-0 overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-auto p-4">
        {children}
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/components/layout/ src/hooks/useResponsive.ts
git commit -m "feat: add responsive SidePanel and BottomSheet layout components"
```

---

### Task 6: Create Floor Selector Component

**Files:**
- Create: `src/components/layout/FloorSelector.tsx`

**Step 1: Create floor selector**

```tsx
import type { Floor } from '@/types/building';

interface FloorSelectorProps {
  floors: Floor[];
  groundFloorLevel: number;
  activeFloorIndex: number;
  onSelectFloor: (index: number) => void;
}

export function FloorSelector({ floors, groundFloorLevel, activeFloorIndex, onSelectFloor }: FloorSelectorProps) {
  if (floors.length === 0) return null;

  const aboveGround = floors
    .map((f, i) => ({ floor: f, index: i }))
    .filter(({ floor }) => floor.level >= groundFloorLevel)
    .sort((a, b) => b.floor.level - a.floor.level); // highest first

  const belowGround = floors
    .map((f, i) => ({ floor: f, index: i }))
    .filter(({ floor }) => floor.level < groundFloorLevel)
    .sort((a, b) => a.floor.level - b.floor.level); // shallowest first (closest to ground)

  return (
    <div className="bg-white/90 backdrop-blur-sm border-r border-gray-200 flex flex-col py-2 px-1 gap-0.5 z-10 shrink-0 overflow-y-auto">
      {aboveGround.length > 0 && (
        <>
          <span className="text-[10px] text-gray-400 text-center px-1 mb-0.5">Above</span>
          {aboveGround.map(({ floor, index }) => (
            <button
              key={floor.id}
              onClick={() => onSelectFloor(index)}
              className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded text-xs font-medium transition-colors ${
                index === activeFloorIndex
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={floor.label}
            >
              {floor.shortLabel}
            </button>
          ))}
        </>
      )}

      {aboveGround.length > 0 && belowGround.length > 0 && (
        <div className="border-t border-gray-200 my-1" />
      )}

      {belowGround.length > 0 && (
        <>
          <span className="text-[10px] text-gray-400 text-center px-1 mb-0.5">Below</span>
          {belowGround.map(({ floor, index }) => (
            <button
              key={floor.id}
              onClick={() => onSelectFloor(index)}
              className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded text-xs font-medium transition-colors ${
                index === activeFloorIndex
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={floor.label}
            >
              {floor.shortLabel}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/layout/FloorSelector.tsx
git commit -m "feat: add floor selector with physical stacking and above/below ground headers"
```

---

### Task 7: Create Unified Workspace View

**Files:**
- Create: `src/views/UnifiedWorkspace.tsx`
- Create: `src/components/panels/ProjectInfoPanel.tsx`
- Create: `src/components/panels/BuildingPanel.tsx`
- Create: `src/components/panels/ElementPropertiesPanel.tsx`
- Modify: `src/App.tsx`

This is a large task. The unified workspace replaces ProjectWorkspace, MapView, BuildingSetup, and FloorPlanEditor with a single view.

**Step 1: Create ProjectInfoPanel**

`src/components/panels/ProjectInfoPanel.tsx`:

```tsx
import { useState } from 'react';
import { Pencil, Phone, Mail, MessageSquare, Plus, Building2, User, ChevronRight } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import type { Contact } from '@/types/contact';
import { v4 as uuidv4 } from 'uuid';

export function ProjectInfoPanel() {
  const { currentProject, updateCurrentProject, setActiveBuilding, deleteProject } = useProjectStore();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCustomer, setEditCustomer] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!currentProject) return null;

  const startEdit = () => {
    setEditName(currentProject.name);
    setEditCustomer(currentProject.customer);
    setEditStatus(currentProject.status);
    setEditing(true);
  };

  const saveEdit = async () => {
    await updateCurrentProject({
      name: editName,
      customer: editCustomer,
      status: editStatus as any,
    });
    setEditing(false);
  };

  const addContact = async () => {
    const contact: Contact = { id: uuidv4(), name: '', phone: '', email: '', role: '' };
    await updateCurrentProject({
      contacts: [...currentProject.contacts, contact],
    });
  };

  const updateContact = async (id: string, changes: Partial<Contact>) => {
    const contacts = currentProject.contacts.map((c) =>
      c.id === id ? { ...c, ...changes } : c,
    );
    await updateCurrentProject({ contacts });
  };

  const removeContact = async (id: string) => {
    const contacts = currentProject.contacts.filter((c) => c.id !== id);
    await updateCurrentProject({ contacts });
  };

  if (editing) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Project Name</label>
          <input value={editName} onChange={(e) => setEditName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Customer</label>
          <input value={editCustomer} onChange={(e) => setEditCustomer(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {['draft', 'survey', 'design', 'review', 'complete'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Contacts</span>
            <button onClick={addContact} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          {currentProject.contacts.map((contact) => (
            <div key={contact.id} className="border rounded-lg p-2 mb-2 space-y-1">
              <input value={contact.name} onChange={(e) => updateContact(contact.id, { name: e.target.value })}
                placeholder="Name" className="w-full text-sm border-b pb-1 focus:outline-none" />
              <input value={contact.role} onChange={(e) => updateContact(contact.id, { role: e.target.value })}
                placeholder="Role (e.g., Building Manager)" className="w-full text-xs text-gray-500 border-b pb-1 focus:outline-none" />
              <input value={contact.phone} onChange={(e) => updateContact(contact.id, { phone: e.target.value })}
                placeholder="Phone" className="w-full text-sm border-b pb-1 focus:outline-none" />
              <input value={contact.email} onChange={(e) => updateContact(contact.id, { email: e.target.value })}
                placeholder="Email" className="w-full text-sm border-b pb-1 focus:outline-none" />
              <button onClick={() => removeContact(contact.id)} className="text-xs text-red-500 hover:underline">Remove</button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={saveEdit} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm">Save</button>
          <button onClick={() => setEditing(false)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
        </div>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full text-red-500 text-sm py-2 hover:bg-red-50 rounded-lg"
        >
          Delete Project
        </button>
        {showDeleteConfirm && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
            <p className="text-red-700 mb-2">Permanently delete this project?</p>
            <div className="flex gap-2">
              <button onClick={() => deleteProject(currentProject.id)} className="flex-1 bg-red-600 text-white py-1.5 rounded text-xs">Delete</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 border py-1.5 rounded text-xs">Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // View mode
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-gray-900">{currentProject.name}</h3>
          {currentProject.customer && (
            <p className="text-sm text-gray-500 mt-0.5">{currentProject.customer}</p>
          )}
        </div>
        <button onClick={startEdit} className="p-1.5 hover:bg-gray-100 rounded" title="Edit project">
          <Pencil className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Contacts */}
      {currentProject.contacts.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-400 uppercase mb-2">Contacts</h4>
          {currentProject.contacts.map((contact) => (
            <div key={contact.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-medium">{contact.name || 'Unnamed'}</p>
                <p className="text-xs text-gray-400">{contact.role}</p>
              </div>
              <div className="flex gap-1">
                {contact.phone && (
                  <>
                    <a href={`tel:${contact.phone}`} className="p-1.5 hover:bg-gray-100 rounded" title="Call">
                      <Phone className="w-4 h-4 text-green-600" />
                    </a>
                    <a href={`sms:${contact.phone}`} className="p-1.5 hover:bg-gray-100 rounded" title="Text">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                    </a>
                  </>
                )}
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="p-1.5 hover:bg-gray-100 rounded" title="Email">
                    <Mail className="w-4 h-4 text-purple-600" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Buildings */}
      <div>
        <h4 className="text-xs font-medium text-gray-400 uppercase mb-2">Buildings</h4>
        {currentProject.buildings.map((building) => (
          <button
            key={building.id}
            onClick={() => setActiveBuilding(building.id)}
            className="w-full flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <div className="text-left">
                <p className="text-sm font-medium">{building.name || 'Unnamed'}</p>
                <p className="text-xs text-gray-400">{building.address || 'No address'}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Create BuildingPanel (stub)**

`src/components/panels/BuildingPanel.tsx`:

```tsx
import { useState } from 'react';
import { ArrowLeft, Pencil, Plus, GripVertical } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import type { Building, Floor } from '@/types/building';
import { v4 as uuidv4 } from 'uuid';

interface BuildingPanelProps {
  building: Building;
  onBack: () => void;
}

export function BuildingPanel({ building, onBack }: BuildingPanelProps) {
  const { updateBuilding, removeBuilding } = useProjectStore();
  const { activeFloorIndex, setActiveFloor, setViewMode } = useEditorStore();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(building.name);
  const [editAddress, setEditAddress] = useState(building.address);

  const groundLevel = building.groundFloorLevel;

  const aboveGround = building.floors
    .map((f, i) => ({ floor: f, index: i }))
    .filter(({ floor }) => floor.level >= groundLevel)
    .sort((a, b) => b.floor.level - a.floor.level);

  const belowGround = building.floors
    .map((f, i) => ({ floor: f, index: i }))
    .filter(({ floor }) => floor.level < groundLevel)
    .sort((a, b) => a.floor.level - b.floor.level);

  const handleFloorSelect = (index: number) => {
    setActiveFloor(index);
    setViewMode('floor');
  };

  const saveEdit = async () => {
    await updateBuilding(building.id, { name: editName, address: editAddress });
    setEditing(false);
  };

  const addFloor = async (aboveGround: boolean) => {
    const existingLevels = building.floors.map((f) => f.level);
    const newLevel = aboveGround
      ? Math.max(...existingLevels, -1) + 1
      : Math.min(...existingLevels, 1) - 1;

    const label = aboveGround ? `Floor ${newLevel + 1}` : `Lower Level ${Math.abs(newLevel)}`;
    const shortLabel = aboveGround ? String(newLevel + 1) : String(newLevel);

    const newFloor: Floor = {
      id: uuidv4(),
      level: newLevel,
      label,
      shortLabel,
      height: building.defaultFloorHeight,
      walls: [],
      doors: [],
      windows: [],
      equipment: [],
      cableRoutes: [],
      annotations: [],
      photos: [],
    };

    await updateBuilding(building.id, {
      floors: [...building.floors, newFloor].sort((a, b) => a.level - b.level),
    });
  };

  if (editing) {
    return (
      <div className="space-y-4">
        <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-sm text-gray-500">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Building Name</label>
          <input value={editName} onChange={(e) => setEditName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
          <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Ground Floor</label>
          <select
            value={groundLevel}
            onChange={(e) => updateBuilding(building.id, { groundFloorLevel: parseInt(e.target.value) })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {building.floors
              .sort((a, b) => a.level - b.level)
              .map((f) => (
                <option key={f.id} value={f.level}>{f.label}</option>
              ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={saveEdit} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm">Save</button>
          <button onClick={() => setEditing(false)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
        </div>
        <button
          onClick={() => { if (confirm('Delete this building?')) removeBuilding(building.id); }}
          className="w-full text-red-500 text-sm py-2 hover:bg-red-50 rounded-lg"
        >
          Delete Building
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{building.name || 'Unnamed Building'}</h3>
          <p className="text-xs text-gray-400">{building.address || 'No address'}</p>
        </div>
        <button onClick={() => { setEditName(building.name); setEditAddress(building.address); setEditing(true); }}
          className="p-1.5 hover:bg-gray-100 rounded">
          <Pencil className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Floor list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400 uppercase">Floors</span>
          <div className="flex gap-1">
            <button onClick={() => addFloor(true)} className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
              <Plus className="w-3 h-3" /> Above
            </button>
            <button onClick={() => addFloor(false)} className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
              <Plus className="w-3 h-3" /> Below
            </button>
          </div>
        </div>

        {aboveGround.length > 0 && (
          <>
            <span className="text-[10px] text-gray-400 block mb-1">Above ground</span>
            {aboveGround.map(({ floor, index }) => (
              <button
                key={floor.id}
                onClick={() => handleFloorSelect(index)}
                className={`w-full flex items-center gap-2 py-2 px-2 rounded-lg text-sm ${
                  index === activeFloorIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                }`}
              >
                <span className="w-6 text-center font-mono text-xs text-gray-400">{floor.shortLabel}</span>
                <span className="flex-1 text-left">{floor.label}</span>
              </button>
            ))}
          </>
        )}

        {belowGround.length > 0 && (
          <>
            <span className="text-[10px] text-gray-400 block mb-1 mt-2">Below ground</span>
            {belowGround.map(({ floor, index }) => (
              <button
                key={floor.id}
                onClick={() => handleFloorSelect(index)}
                className={`w-full flex items-center gap-2 py-2 px-2 rounded-lg text-sm ${
                  index === activeFloorIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                }`}
              >
                <span className="w-6 text-center font-mono text-xs text-gray-400">{floor.shortLabel}</span>
                <span className="flex-1 text-left">{floor.label}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Create ElementPropertiesPanel (stub for now — will be expanded in Phase 5)**

`src/components/panels/ElementPropertiesPanel.tsx`:

```tsx
export function ElementPropertiesPanel() {
  return (
    <div className="text-sm text-gray-400 text-center py-8">
      Select an element to see its properties
    </div>
  );
}
```

**Step 4: Create UnifiedWorkspace**

`src/views/UnifiedWorkspace.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Menu } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import { useResponsive } from '@/hooks/useResponsive';
import { SidePanel } from '@/components/layout/SidePanel';
import { FloorSelector } from '@/components/layout/FloorSelector';
import { ProjectInfoPanel } from '@/components/panels/ProjectInfoPanel';
import { BuildingPanel } from '@/components/panels/BuildingPanel';
import { ElementPropertiesPanel } from '@/components/panels/ElementPropertiesPanel';

export function UnifiedWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const breakpoint = useResponsive();
  const { currentProject, openProject, loading, activeBuildingId, setActiveBuilding } = useProjectStore();
  const { viewMode, setViewMode, activeFloorIndex, setActiveFloor } = useEditorStore();
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    if (projectId && currentProject?.id !== projectId) {
      openProject(projectId);
    }
  }, [projectId, currentProject?.id, openProject]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading project...</div>;
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p>Project not found</p>
          <button onClick={() => navigate('/')} className="mt-2 text-blue-600 text-sm hover:underline">
            Back to projects
          </button>
        </div>
      </div>
    );
  }

  const activeBuilding = currentProject.buildings.find((b) => b.id === activeBuildingId);
  const showFloorSelector = activeBuilding && activeBuilding.floors.length > 0 && viewMode === 'floor';

  // Determine panel content based on view mode
  let panelTitle = 'Project';
  let panelContent = <ProjectInfoPanel />;

  if (activeBuildingId && activeBuilding) {
    if (viewMode === 'floor') {
      panelTitle = activeBuilding.name || 'Building';
      panelContent = <ElementPropertiesPanel />;
    } else {
      panelTitle = activeBuilding.name || 'Building';
      panelContent = (
        <BuildingPanel
          building={activeBuilding}
          onBack={() => { setActiveBuilding(null); setViewMode('site'); }}
        />
      );
    }
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="p-1.5 hover:bg-gray-100 rounded" title="Back to projects">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">
            {currentProject.name}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="p-1.5 hover:bg-gray-100 rounded"
            title="Toggle panel"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Floor selector (left) */}
        {showFloorSelector && (
          <FloorSelector
            floors={activeBuilding.floors}
            groundFloorLevel={activeBuilding.groundFloorLevel}
            activeFloorIndex={activeFloorIndex}
            onSelectFloor={(index) => {
              setActiveFloor(index);
              setViewMode('floor');
            }}
          />
        )}

        {/* Map canvas (center) */}
        <div className="flex-1 relative">
          {/* MapContainer will go here — Phase 4 */}
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
            Map Canvas (Phase 4)
          </div>

          {/* Toolbar (bottom) — Phase 5 */}
        </div>

        {/* Side panel (right, desktop only — mobile/tablet uses bottom sheet) */}
        {breakpoint === 'desktop' ? (
          <SidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={panelTitle}>
            {panelContent}
          </SidePanel>
        ) : (
          <SidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={panelTitle}>
            {panelContent}
          </SidePanel>
        )}
      </div>
    </div>
  );
}
```

**Step 5: Update App.tsx routing**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProjectDashboard } from '@/views/ProjectDashboard';
import { UnifiedWorkspace } from '@/views/UnifiedWorkspace';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectDashboard />} />
        <Route path="/project/:projectId" element={<UnifiedWorkspace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds. Old views (ProjectWorkspace, BuildingSetup, BIMViewer, MapView, FloorPlanEditor) still exist but are no longer routed to.

**Step 7: Commit**

```bash
git add src/views/UnifiedWorkspace.tsx src/components/panels/ src/App.tsx
git commit -m "feat: add unified workspace with side panels, floor selector, and responsive layout"
```

---

## Phase 4: MapLibre Integration in Unified Workspace

### Task 8: Integrate MapContainer into UnifiedWorkspace

**Files:**
- Modify: `src/components/map/MapContainer.tsx`
- Modify: `src/views/UnifiedWorkspace.tsx`

Refactor MapContainer to work within the unified workspace. The map must:
- Accept view mode and adjust tile opacity accordingly
- Support building selection for "add building" flow
- Render floor plan elements as GeoJSON layers when in floor editing mode
- Show 3D buildings when not in floor editing mode

This is a significant refactoring of MapContainer. The key changes:
- Add `mapTileOpacity` prop that dims street tiles when editing floors
- Add callbacks for building selection that respect the current context (add vs view)
- Expose the map instance for floor plan layer integration

**Step 1: Refactor MapContainer to accept unified workspace props**

The MapContainer needs these new props:

```typescript
interface MapContainerProps {
  mapTileOpacity?: number;
  onBuildingFootprintSelected?: (polygon: GeoPolygon, levels: number | null, address: string | null) => void;
  allowFootprintSelection?: boolean; // only true during add/edit building flow
  show3D?: boolean;
}
```

Update the existing MapContainer to accept these props and adjust behavior. When `mapTileOpacity` is less than 1, apply a raster opacity filter to the base map tiles. When `allowFootprintSelection` is false, clicking a building footprint does `setActiveBuilding` instead of selecting the footprint.

**Step 2: Wire MapContainer into UnifiedWorkspace**

Replace the placeholder div in UnifiedWorkspace with the actual MapContainer. Pass the view mode and opacity settings.

**Step 3: Verify and commit**

Run: `npm run build`

```bash
git add src/components/map/MapContainer.tsx src/views/UnifiedWorkspace.tsx
git commit -m "feat: integrate MapContainer into unified workspace with opacity and selection modes"
```

---

### Task 9: Floor Plan as MapLibre GeoJSON Layers

**Files:**
- Create: `src/components/map/FloorPlanLayer.ts`
- Modify: `src/components/map/MapContainer.tsx`

**Step 1: Create FloorPlanLayer**

This module converts floor plan data (walls, doors, windows, equipment, cables, annotations) into GeoJSON features and adds them as MapLibre layers. Each element type gets its own source and layer for independent styling and interaction.

Key functions:
- `addFloorPlanLayers(map, floor, building)` — creates GeoJSON sources and layers for all floor elements
- `updateFloorPlanLayers(map, floor, building)` — updates GeoJSON data when floor changes
- `removeFloorPlanLayers(map)` — cleans up all floor plan layers

Coordinate conversion: use the building's footprint centroid as the origin, then convert local meter coordinates to lng/lat using the inverse of `geoPolygonToLocal`.

Wall rendering: GeoJSON LineString features with `line-width` based on wall thickness.
Door rendering: GeoJSON Point features with a custom icon or symbol layer showing the arc.
Window rendering: GeoJSON Point features with a custom symbol.
Equipment: GeoJSON Point features with colored circle markers.
Cable routes: GeoJSON LineString features with dashed lines.
Annotations: GeoJSON Point features with text labels.

**Step 2: Integrate into MapContainer**

When `viewMode === 'floor'`, add floor plan layers. When view mode changes away from floor, remove them.

**Step 3: Verify and commit**

```bash
git add src/components/map/FloorPlanLayer.ts src/components/map/MapContainer.tsx
git commit -m "feat: render floor plan elements as MapLibre GeoJSON layers"
```

---

## Phase 5: Interaction System

### Task 10: Touch/Mouse Input Detection and Reticle

**Files:**
- Create: `src/hooks/useInputMode.ts`
- Create: `src/components/map/Reticle.tsx`

**Step 1: Create input mode detection hook**

```typescript
import { useState, useEffect } from 'react';

export type InputMode = 'mouse' | 'touch';

export function useInputMode(): InputMode {
  const [mode, setMode] = useState<InputMode>('mouse');

  useEffect(() => {
    const handlePointer = (e: PointerEvent) => {
      setMode(e.pointerType === 'touch' ? 'touch' : 'mouse');
    };
    window.addEventListener('pointerdown', handlePointer, { passive: true });
    return () => window.removeEventListener('pointerdown', handlePointer);
  }, []);

  return mode;
}
```

**Step 2: Create Reticle component**

The reticle is a fixed crosshair at screen center, visible only in touch mode when a tool is active. Tapping it triggers placement.

```tsx
interface ReticleProps {
  visible: boolean;
  hint?: string;
  onPlace: () => void;
}
```

Renders as a 48px circle with crosshair lines, positioned fixed at center of the map container. Shows a contextual hint text below.

**Step 3: Commit**

```bash
git add src/hooks/useInputMode.ts src/components/map/Reticle.tsx
git commit -m "feat: add touch/mouse input detection and reticle component"
```

---

### Task 11: Drawing Toolbar with Responsive Collapse

**Files:**
- Create: `src/components/toolbar/DrawingToolbar.tsx`
- Create: `src/components/toolbar/ToolSheet.tsx`

**Step 1: Create DrawingToolbar**

Desktop: horizontal toolbar at bottom with all tools visible.
Mobile: collapsed to a "+" FAB that opens a ToolSheet (bottom card sliding up with tool grid).

Tools: select, pan, wall, door, window, equipment, cable, annotate, photo, section-cut.
Plus: grid toggle, snap toggle, undo, redo.

**Step 2: Create ToolSheet**

Bottom sheet for mobile showing tool grid in a card that slides up from bottom.

**Step 3: Commit**

```bash
git add src/components/toolbar/
git commit -m "feat: add responsive drawing toolbar with FAB collapse for mobile"
```

---

### Task 12: Map Interaction Handler

**Files:**
- Create: `src/hooks/useMapInteraction.ts`

This hook replaces `useCanvasInteraction.ts` for the MapLibre-based workflow. It:
- Listens for map click events (mouse mode) or reticle taps (touch mode)
- Converts click coordinates to world coordinates using the building's local coordinate system
- Applies snapping (wall endpoints, midpoints, grid)
- Dispatches to the appropriate handler based on active tool
- Manages wall/cable drawing state (multi-click)

**Step 1: Implement the hook**

Key responsibilities:
- Convert MapLibre lng/lat clicks to local meter coordinates (inverse of geo projection)
- Find snap targets in current floor data
- Call appropriate callback: onWallCreated, onDoorPlaced, etc.
- Manage drawing state (wall start point, cable point accumulation)
- Show snap indicators on the map

**Step 2: Commit**

```bash
git add src/hooks/useMapInteraction.ts
git commit -m "feat: add map interaction handler with snapping and dual input mode"
```

---

## Phase 6: Element Rendering & Editing

### Task 13: Architectural Door and Window Rendering

**Files:**
- Modify: `src/components/map/FloorPlanLayer.ts`

**Step 1: Door rendering as arc symbol**

Create an SDF icon or use a canvas-generated image for the door arc symbol. Add it as a MapLibre image and use it in the door symbol layer. The arc shows swing direction.

**Step 2: Window rendering as architectural symbol**

Create a canvas-generated image for the window symbol (three parallel lines in a wall break). Add as MapLibre image.

**Step 3: Commit**

```bash
git commit -m "feat: render doors as arc symbols and windows as architectural notation"
```

---

### Task 14: Element Selection and Properties Panel

**Files:**
- Modify: `src/components/panels/ElementPropertiesPanel.tsx`
- Create: `src/components/panels/WallProperties.tsx`
- Create: `src/components/panels/DoorProperties.tsx`
- Create: `src/components/panels/WindowProperties.tsx`
- Create: `src/components/panels/EquipmentProperties.tsx`
- Create: `src/components/panels/CableRouteProperties.tsx`
- Create: `src/components/panels/AnnotationProperties.tsx`

**Step 1: Create property editors for each element type**

Each follows View→Edit pattern:
- View mode: displays key properties read-only
- Edit mode: all fields editable, delete button at bottom
- Auto-enters edit mode for newly placed elements

**Step 2: Wire into ElementPropertiesPanel**

ElementPropertiesPanel receives the selected element type and ID, renders the appropriate sub-panel.

**Step 3: Annotation editor — support text editing on placement**

When an annotation is placed, immediately focus the text input so the user can type.

**Step 4: Commit**

```bash
git add src/components/panels/
git commit -m "feat: add element property panels with View→Edit pattern for all element types"
```

---

### Task 15: Element Modification (Move, Resize)

**Files:**
- Modify: `src/hooks/useMapInteraction.ts`

**Step 1: Selection handling**

When in select mode:
- Click/tap an element to select it
- Show selection handles (dots at wall endpoints, slider dot on doors/windows)
- Mouse mode: drag handles to modify
- Touch mode: "Move" button in properties panel re-enters placement mode

**Step 2: Wall endpoint dragging**

In mouse mode, dragging a wall endpoint adjusts the wall geometry. Snap to other endpoints.

**Step 3: Door/window position sliding**

Drag the handle along the parent wall to reposition.

**Step 4: Commit**

```bash
git commit -m "feat: add element selection, move, and resize with drag handles"
```

---

## Phase 7: Building Management

### Task 16: Add Building Flow

**Files:**
- Create: `src/components/panels/AddBuildingPanel.tsx`
- Modify: `src/views/UnifiedWorkspace.tsx`

**Step 1: Create AddBuildingPanel**

A panel with:
- Building name input
- Address input with geocode button
- "Or tap a building on the map" instruction
- Floor count and height inputs (shown after footprint selected)
- Ground floor designation
- Save / Cancel buttons

When address is entered and geocoded, map flies to location. When a building is tapped on the map (in add-building mode), footprint is captured and address is reverse-geocoded.

**Step 2: Wire into UnifiedWorkspace**

Add an "Add Building" button to the ProjectInfoPanel. When clicked, enter add-building mode:
- Set `allowFootprintSelection` on MapContainer
- Show AddBuildingPanel in the side panel
- On save: create building, generate floors, add to project

**Step 3: Commit**

```bash
git add src/components/panels/AddBuildingPanel.tsx src/views/UnifiedWorkspace.tsx
git commit -m "feat: add building flow with address geocoding and map footprint selection"
```

---

## Phase 8: 2D Vertical Cross-Section

### Task 17: Section Cut Tool

**Files:**
- Modify: `src/hooks/useMapInteraction.ts`
- Modify: `src/components/map/FloorPlanLayer.ts`

**Step 1: Add section-cut tool handling**

When section-cut tool is active, user places two points (same as wall drawing). The cut line is stored in `building.sectionCuts[]`. Render cut lines on the map as dashed lines with arrow markers and labels.

**Step 2: Commit**

```bash
git commit -m "feat: add section cut tool for placing cut lines on floor plan"
```

---

### Task 18: Cross-Section Renderer

**Files:**
- Create: `src/components/cross-section/CrossSectionCanvas.tsx`
- Create: `src/components/cross-section/crossSectionRenderer.ts`

**Step 1: Create cross-section math**

`crossSectionRenderer.ts`:
- Takes a cut line (two GeoPoints converted to local coords) and all floors
- For each floor, calculates which walls intersect the cut line
- Computes intersection points and wall thickness at each intersection
- Determines door and window openings that fall on or near the cut line
- Returns a data structure of floor slabs, wall sections, openings, and equipment

**Step 2: Create cross-section canvas**

`CrossSectionCanvas.tsx`:
- Canvas-based renderer (not MapLibre — this is a schematic view)
- Stacks floors vertically with correct heights
- Draws wall sections as filled rectangles
- Draws door openings as gaps
- Draws window openings with sill/header lines
- Shows floor labels on left, dimension annotations on right
- Independent zoom/pan

**Step 3: Integrate into SidePanel**

When a section cut is selected, the cross-section view replaces the properties panel content.

**Step 4: Commit**

```bash
git add src/components/cross-section/
git commit -m "feat: add 2D vertical cross-section view with wall intersection calculation"
```

---

## Phase 9: Cleanup and Polish

### Task 19: Remove Old Views and Components

**Files:**
- Delete: `src/views/ProjectWorkspace.tsx`
- Delete: `src/views/BuildingSetup.tsx`
- Delete: `src/views/FloorPlanEditor.tsx`
- Delete: `src/views/MapView.tsx`
- Delete: `src/views/BIMViewer.tsx`
- Delete: `src/components/WorkspaceNav.tsx`
- Delete: `src/components/floor-plan/Canvas2D.tsx`
- Delete: `src/components/floor-plan/useCanvasInteraction.ts`
- Delete: `src/components/floor-plan/FloorToolbar.tsx`
- Keep: `src/components/floor-plan/renderers.ts` (used by cross-section renderer)
- Keep: `src/hooks/useFloorEditor.ts` (still used for floor CRUD operations)

**Step 1: Remove files**

```bash
git rm src/views/ProjectWorkspace.tsx src/views/BuildingSetup.tsx src/views/FloorPlanEditor.tsx src/views/MapView.tsx src/views/BIMViewer.tsx
git rm src/components/WorkspaceNav.tsx
git rm src/components/floor-plan/Canvas2D.tsx src/components/floor-plan/useCanvasInteraction.ts src/components/floor-plan/FloorToolbar.tsx
```

**Step 2: Update useFloorEditor to work with multi-building model**

The hook currently references `currentProject.building` (singular). Update to use `activeBuildingId` from the project store to find the correct building.

**Step 3: Verify build**

Run: `npm run build`
Expected: Clean build with no references to deleted files.

**Step 4: Commit**

```bash
git commit -m "refactor: remove old multi-tab views and canvas components, update floor editor for multi-building"
```

---

### Task 20: Update Building Generator for New Model

**Files:**
- Modify: `src/services/building-generator.ts`

**Step 1: Update generateFloors**

Update to produce floors with `shortLabel` field. Use the building's `groundFloorLevel` to determine labels:
- Above ground: "Floor 1", "Floor 2", etc. Short: "1", "2"
- Ground: configurable label. Short: "G" or "1"
- Below ground: "Lower Level 1", "Lower Level 2". Short: "-1", "-2"

**Step 2: Remove floorCount references**

The function should accept a count parameter rather than reading from `building.floorCount` (which no longer exists).

**Step 3: Commit**

```bash
git commit -m "feat: update building generator for new floor model with short labels"
```

---

### Task 21: Update 3D Building Layer for Above-Ground Only

**Files:**
- Modify: `src/components/map/ThreeBuildingLayer.ts`
- Modify: `src/services/bim-generator.ts`

**Step 1: Filter floors in generateBuildingMesh**

Add a `groundFloorLevel` parameter. Only include floors where `floor.level >= groundFloorLevel`.

**Step 2: Update ThreeBuildingLayer to pass groundFloorLevel**

**Step 3: Commit**

```bash
git commit -m "feat: 3D building shows only above-ground floors based on groundFloorLevel"
```

---

### Task 22: Update Tests

**Files:**
- Modify: `src/storage/__tests__/projects.test.ts`
- Create: `src/storage/__tests__/migrate.test.ts`

**Step 1: Add migration tests**

Test that v1 projects (with singular `building` and `address`) are correctly migrated to v2 shape.

**Step 2: Update existing project CRUD tests**

Ensure all tests use the new `createProject(name, customer)` signature and verify the new data shape.

**Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/storage/__tests__/
git commit -m "test: add migration tests and update project CRUD tests for v2 data model"
```

---

### Task 23: Final Build Verification and Push

**Step 1: Full verification**

```bash
npx tsc --noEmit
npm run build
npx vitest run
```

All must pass.

**Step 2: Push to GitHub**

```bash
git push origin master
```
