import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
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
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<BuildConnectDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<BuildConnectDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BuildConnectDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('by-updated', 'updatedAt');
          projectStore.createIndex('by-status', 'status');
        }
      },
    });
  }
  return dbPromise;
}

export async function resetDB(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}

export function initDB() {
  return getDB();
}
