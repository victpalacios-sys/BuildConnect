import { v4 as uuidv4 } from 'uuid';
import { getDB } from './db';
import type { Project } from '@/types/project';
import { migrateProjectV1toV2 } from './migrate';

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

export async function createProject(
  name: string,
  customer: string,
): Promise<Project> {
  const db = await getDB();
  const project = createEmptyProject(name, customer);
  await db.put('projects', project);
  return project;
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDB();
  const raw = await db.get('projects', id);
  if (!raw) return undefined;
  const migrated = migrateProjectV1toV2(raw);
  if (migrated !== raw) await db.put('projects', migrated);
  return migrated;
}

export async function listProjects(): Promise<Project[]> {
  const db = await getDB();
  const rawList = await db.getAllFromIndex('projects', 'by-updated');
  return rawList.map(migrateProjectV1toV2);
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
    id: existing.id,
    updatedAt: Date.now(),
  };
  await db.put('projects', updated);
  return updated;
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('projects', id);
}
