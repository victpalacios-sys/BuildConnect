import { v4 as uuidv4 } from 'uuid';
import type { Project } from '@/types/project';

/**
 * Migrates a project from v1 shape (singular building, address on project)
 * to v2 (buildings array, contacts, etc.). Returns unchanged if already v2.
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
  // Remove old floorCount field if present
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
      cableRoutes: [],
      equipment: [],
      annotations: raw.outdoorPlan?.annotations || [],
    },
  };
}
