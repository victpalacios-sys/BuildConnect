import type { GeoPoint } from './geometry';
import type { Annotation, Building, Equipment, CableRoute } from './building';
import type { Contact } from './contact';

export type ProjectStatus = 'draft' | 'survey' | 'design' | 'review' | 'complete';

export interface OutdoorPlan {
  fiberSourceLocation: GeoPoint | null;
  cableRoutes: CableRoute[];     // was singular `cableRoute: GeoLineString | null`
  equipment: Equipment[];         // geo-positioned outdoor equipment
  annotations: Annotation[];
}

export interface Project {
  id: string;
  name: string;
  customer: string;
  status: ProjectStatus;
  createdAt: number;
  updatedAt: number;
  center: GeoPoint | null;
  contacts: Contact[];
  buildings: Building[];
  outdoorPlan: OutdoorPlan;
}
