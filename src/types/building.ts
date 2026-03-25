import type { Point2D, GeoPoint, GeoPolygon } from './geometry';

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

export interface SectionCut {
  id: string;
  label: string;
  start: GeoPoint;
  end: GeoPoint;
}

export interface Floor {
  id: string;
  level: number; // 0 = ground, 1 = first, -1 = basement
  label: string;
  shortLabel: string; // compact label for floor nav, e.g. "4", "-1", "M"
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
  name: string;
  address: string;
  footprint: GeoPolygon | null; // from OSM or manual
  footprintLocal: Point2D[]; // local coordinates in meters
  groundFloorLevel: number; // default 0, configurable per locale
  defaultFloorHeight: number; // meters
  floors: Floor[];
  sectionCuts: SectionCut[];
}
