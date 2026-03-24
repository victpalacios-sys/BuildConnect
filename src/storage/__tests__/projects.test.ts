import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { resetDB } from '../db';
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
