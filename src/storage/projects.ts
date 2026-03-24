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
