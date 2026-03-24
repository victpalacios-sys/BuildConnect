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
