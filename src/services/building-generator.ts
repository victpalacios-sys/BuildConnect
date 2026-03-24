import { v4 as uuidv4 } from 'uuid';
import type { Building, Floor, Wall } from '@/types/building';
import type { Point2D, GeoPolygon } from '@/types/geometry';

/**
 * Converts a GeoPolygon (lng/lat) to local coordinates in meters
 * using a simple equirectangular projection from the polygon centroid.
 */
export function geoPolygonToLocal(polygon: GeoPolygon): Point2D[] {
  const coords = polygon.coordinates[0];
  if (!coords || coords.length < 3) return [];

  const centLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const centLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;

  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos((centLat * Math.PI) / 180);

  return coords.map(([lng, lat]) => ({
    x: (lng - centLng) * metersPerDegreeLng,
    y: (lat - centLat) * metersPerDegreeLat,
  }));
}

export function createExteriorWalls(footprintLocal: Point2D[], thickness: number = 0.3): Wall[] {
  const walls: Wall[] = [];
  for (let i = 0; i < footprintLocal.length - 1; i++) {
    walls.push({
      id: uuidv4(),
      start: footprintLocal[i],
      end: footprintLocal[i + 1],
      thickness,
      isExterior: true,
    });
  }
  return walls;
}

export function generateFloors(building: Building): Floor[] {
  const floors: Floor[] = [];
  const exteriorWalls = createExteriorWalls(building.footprintLocal);

  for (let i = 0; i < building.floorCount; i++) {
    floors.push({
      id: uuidv4(),
      level: i,
      label: i === 0 ? 'Ground Floor' : `Floor ${i}`,
      height: building.defaultFloorHeight,
      walls: exteriorWalls.map((w) => ({ ...w, id: uuidv4() })),
      doors: [],
      windows: [],
      equipment: [],
      cableRoutes: [],
      annotations: [],
      photos: [],
    });
  }
  return floors;
}
