import type { GeoPolygon } from '@/types/geometry';

export interface OSMBuilding {
  id: number;
  polygon: GeoPolygon;
  levels: number | null;
  height: number | null;
  name: string | null;
}

export function findNearestBuilding(
  buildings: OSMBuilding[],
  lat: number,
  lng: number,
): OSMBuilding | null {
  if (buildings.length === 0) return null;

  let best: OSMBuilding | null = null;
  let bestDist = Infinity;

  for (const b of buildings) {
    const coords = b.polygon.coordinates[0];
    // Compute centroid of polygon
    const centLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    const centLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    const dist = Math.hypot(centLat - lat, centLng - lng);
    if (dist < bestDist) {
      bestDist = dist;
      best = b;
    }
  }

  return best;
}

export async function queryBuildingFootprints(
  lat: number,
  lng: number,
  radiusMeters: number = 200,
): Promise<OSMBuilding[]> {
  const query = `
    [out:json][timeout:10];
    (
      way["building"](around:${radiusMeters},${lat},${lng});
      relation["building"](around:${radiusMeters},${lat},${lng});
    );
    out geom;
  `;

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);

  const data = await response.json();

  return data.elements
    .filter((el: any) => el.geometry && el.geometry.length > 2)
    .map((el: any) => ({
      id: el.id,
      polygon: {
        type: 'Polygon' as const,
        coordinates: [el.geometry.map((node: any) => [node.lon, node.lat])],
      },
      levels: el.tags?.['building:levels'] ? parseInt(el.tags['building:levels']) : null,
      height: el.tags?.height ? parseFloat(el.tags.height) : null,
      name: el.tags?.name ?? null,
    }));
}
