import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { getDB, resetDB } from '../db';
import { createProject, getProject, listProjects, updateProject, deleteProject } from '../projects';

beforeEach(async () => {
  await resetDB();
  const dbs = await indexedDB.databases();
  for (const db of dbs) {
    if (db.name) indexedDB.deleteDatabase(db.name);
  }
});

describe('project storage', () => {
  it('creates and retrieves a project', async () => {
    const project = await createProject('Test Project', 'ACME Corp');
    expect(project.id).toBeDefined();
    expect(project.name).toBe('Test Project');

    const retrieved = await getProject(project.id);
    expect(retrieved).toEqual(project);
  });

  it('lists all projects', async () => {
    await createProject('Project A', 'Client A');
    await createProject('Project B', 'Client B');
    const list = await listProjects();
    expect(list).toHaveLength(2);
  });

  it('updates a project', async () => {
    const project = await createProject('Old Name', 'Client');
    const updated = await updateProject(project.id, { name: 'New Name' });
    expect(updated.name).toBe('New Name');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(project.updatedAt);
  });

  it('deletes a project', async () => {
    const project = await createProject('To Delete', 'Client');
    await deleteProject(project.id);
    const retrieved = await getProject(project.id);
    expect(retrieved).toBeUndefined();
  });

  it('migrates v1 project to v2 on read', async () => {
    // Directly write a v1-shaped project to the DB
    const db = await getDB();
    const v1Project = {
      id: 'v1-test',
      name: 'Old Project',
      address: '123 Main St',
      customer: 'Old Client',
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      center: null,
      outdoorPlan: { fiberSourceLocation: null, cableRoute: null, annotations: [] },
      building: {
        id: 'b1',
        footprint: null,
        footprintLocal: [],
        floorCount: 1,
        defaultFloorHeight: 3.0,
        floors: [{ id: 'f1', level: 0, label: 'Ground Floor', height: 3.0, walls: [], doors: [], windows: [], equipment: [], cableRoutes: [], annotations: [], photos: [] }],
      },
    };
    await db.put('projects', v1Project as any);

    const migrated = await getProject('v1-test');
    expect(migrated).toBeDefined();
    expect(Array.isArray(migrated!.buildings)).toBe(true);
    expect(migrated!.buildings).toHaveLength(1);
    expect(migrated!.buildings[0].name).toBe('Old Project');
    expect(migrated!.buildings[0].address).toBe('123 Main St');
    expect((migrated as any).address).toBeUndefined();
    expect((migrated as any).building).toBeUndefined();
  });
});
