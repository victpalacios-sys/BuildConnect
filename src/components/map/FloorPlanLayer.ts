import type { Floor, SectionCut } from '@/types/building';
import type { Point2D, GeoPolygon } from '@/types/geometry';
import type { Map as MaplibreMap, GeoJSONSource } from 'maplibre-gl';

/**
 * Convert local meter coordinates to [lng, lat] using the building footprint centroid.
 */
function localToGeo(point: Point2D, centroid: [number, number]): [number, number] {
  const [centLng, centLat] = centroid;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos((centLat * Math.PI) / 180);
  return [
    centLng + point.x / metersPerDegreeLng,
    centLat + point.y / metersPerDegreeLat,
  ];
}

/**
 * Get the centroid of a GeoPolygon as [lng, lat].
 */
function getPolygonCentroid(polygon: GeoPolygon): [number, number] {
  const coords = polygon.coordinates[0];
  const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  return [lng, lat];
}

const LAYER_IDS = ['fp-walls', 'fp-doors', 'fp-windows', 'fp-equipment', 'fp-cables', 'fp-annotations', 'fp-selection', 'fp-section-cuts'] as const;

export function addFloorPlanLayers(map: MaplibreMap): void {
  // Add empty GeoJSON sources for each layer
  for (const id of LAYER_IDS) {
    if (!map.getSource(id)) {
      map.addSource(id, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }
  }

  // fp-walls: line layer
  if (!map.getLayer('fp-walls')) {
    map.addLayer({
      id: 'fp-walls',
      type: 'line',
      source: 'fp-walls',
      paint: {
        'line-color': ['case', ['get', 'isExterior'], '#1e293b', '#64748b'],
        'line-width': ['max', ['*', ['get', 'thickness'], 200], 2],
      },
    });
  }

  // fp-doors: circle layer, amber, larger radius for visibility
  if (!map.getLayer('fp-doors')) {
    map.addLayer({
      id: 'fp-doors',
      type: 'circle',
      source: 'fp-doors',
      paint: {
        'circle-color': '#f59e0b',
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-pitch-alignment': 'map',
      },
    });
  }

  // fp-windows: circle layer, sky-blue with darker blue border
  if (!map.getLayer('fp-windows')) {
    map.addLayer({
      id: 'fp-windows',
      type: 'circle',
      source: 'fp-windows',
      paint: {
        'circle-color': '#38bdf8',
        'circle-radius': 6,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#0ea5e9',
        'circle-pitch-alignment': 'map',
      },
    });
  }

  // fp-equipment: circle layer, green
  if (!map.getLayer('fp-equipment')) {
    map.addLayer({
      id: 'fp-equipment',
      type: 'circle',
      source: 'fp-equipment',
      paint: {
        'circle-color': '#10b981',
        'circle-radius': 8,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#fff',
      },
    });
  }

  // fp-cables: line layer, dashed, color by cable type
  if (!map.getLayer('fp-cables')) {
    map.addLayer({
      id: 'fp-cables',
      type: 'line',
      source: 'fp-cables',
      paint: {
        'line-color': [
          'match',
          ['get', 'cableType'],
          'fiber', '#ef4444',
          'cat6', '#3b82f6',
          'cat6a', '#6366f1',
          'coaxial', '#f97316',
          '#6b7280',
        ],
        'line-width': 3,
        'line-dasharray': [2, 1],
      },
    });
  }

  // fp-annotations: symbol layer with text
  if (!map.getLayer('fp-annotations')) {
    map.addLayer({
      id: 'fp-annotations',
      type: 'symbol',
      source: 'fp-annotations',
      layout: {
        'text-field': ['get', 'text'],
        'text-size': 12,
        'text-offset': [0, 1],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': '#7c3aed',
      },
    });
  }

  // fp-selection: highlight circle for selected point elements
  if (!map.getSource('fp-selection')) {
    map.addSource('fp-selection', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }
  if (!map.getLayer('fp-selection-circle')) {
    map.addLayer({
      id: 'fp-selection-circle',
      type: 'circle',
      source: 'fp-selection',
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-color': 'transparent',
        'circle-radius': 14,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#3b82f6',
      },
    });
  }
  if (!map.getLayer('fp-selection-line')) {
    map.addLayer({
      id: 'fp-selection-line',
      type: 'line',
      source: 'fp-selection',
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: {
        'line-color': '#3b82f6',
        'line-width': 6,
        'line-opacity': 0.5,
      },
    });
  }

  // Section cut layers
  if (!map.getSource('fp-section-cuts')) {
    map.addSource('fp-section-cuts', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }
  if (!map.getLayer('fp-section-cuts-line')) {
    map.addLayer({
      id: 'fp-section-cuts-line',
      type: 'line',
      source: 'fp-section-cuts',
      paint: {
        'line-color': '#ef4444',
        'line-width': 2,
        'line-dasharray': [4, 3],
      },
    });
  }
  if (!map.getLayer('fp-section-cuts-labels')) {
    map.addLayer({
      id: 'fp-section-cuts-labels',
      type: 'symbol',
      source: 'fp-section-cuts',
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 12,
        'text-anchor': 'center',
        'symbol-placement': 'line-center',
      },
      paint: {
        'text-color': '#ef4444',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
      },
    });
  }
}

export function updateFloorPlanData(
  map: MaplibreMap,
  floor: Floor,
  buildingFootprint: GeoPolygon | null,
): void {
  if (!buildingFootprint) return;
  const centroid = getPolygonCentroid(buildingFootprint);

  // Convert walls to GeoJSON LineString features
  const wallFeatures: GeoJSON.Feature[] = floor.walls.map((wall) => ({
    type: 'Feature' as const,
    properties: { id: wall.id, thickness: wall.thickness, isExterior: wall.isExterior },
    geometry: {
      type: 'LineString' as const,
      coordinates: [localToGeo(wall.start, centroid), localToGeo(wall.end, centroid)],
    },
  }));

  // Convert doors to GeoJSON Point features (at position along wall)
  const doorFeatures: GeoJSON.Feature[] = floor.doors
    .map((door) => {
      const wall = floor.walls.find((w) => w.id === door.wallId);
      if (!wall) return null;
      const pos: Point2D = {
        x: wall.start.x + (wall.end.x - wall.start.x) * door.position,
        y: wall.start.y + (wall.end.y - wall.start.y) * door.position,
      };
      return {
        type: 'Feature' as const,
        properties: { id: door.id, width: door.width },
        geometry: { type: 'Point' as const, coordinates: localToGeo(pos, centroid) },
      };
    })
    .filter((f): f is GeoJSON.Feature => f !== null);

  // Convert windows similarly
  const windowFeatures: GeoJSON.Feature[] = floor.windows
    .map((win) => {
      const wall = floor.walls.find((w) => w.id === win.wallId);
      if (!wall) return null;
      const pos: Point2D = {
        x: wall.start.x + (wall.end.x - wall.start.x) * win.position,
        y: wall.start.y + (wall.end.y - wall.start.y) * win.position,
      };
      return {
        type: 'Feature' as const,
        properties: { id: win.id, width: win.width },
        geometry: { type: 'Point' as const, coordinates: localToGeo(pos, centroid) },
      };
    })
    .filter((f): f is GeoJSON.Feature => f !== null);

  // Equipment as points
  const equipFeatures: GeoJSON.Feature[] = floor.equipment.map((eq) => ({
    type: 'Feature' as const,
    properties: { id: eq.id, type: eq.type, label: eq.label },
    geometry: { type: 'Point' as const, coordinates: localToGeo(eq.position, centroid) },
  }));

  // Cable routes as LineStrings
  const cableFeatures: GeoJSON.Feature[] = floor.cableRoutes.map((route) => ({
    type: 'Feature' as const,
    properties: { id: route.id, cableType: route.cableType, label: route.label },
    geometry: {
      type: 'LineString' as const,
      coordinates: route.points.map((p) => localToGeo(p, centroid)),
    },
  }));

  // Annotations as points with text
  const annotFeatures: GeoJSON.Feature[] = floor.annotations.map((ann) => ({
    type: 'Feature' as const,
    properties: { id: ann.id, text: ann.text },
    geometry: { type: 'Point' as const, coordinates: localToGeo(ann.position, centroid) },
  }));

  // Update sources
  updateSource(map, 'fp-walls', wallFeatures);
  updateSource(map, 'fp-doors', doorFeatures);
  updateSource(map, 'fp-windows', windowFeatures);
  updateSource(map, 'fp-equipment', equipFeatures);
  updateSource(map, 'fp-cables', cableFeatures);
  updateSource(map, 'fp-annotations', annotFeatures);
}

export function updateSectionCutData(map: MaplibreMap, sectionCuts: SectionCut[]): void {
  const features: GeoJSON.Feature[] = sectionCuts.map((cut) => ({
    type: 'Feature' as const,
    properties: { id: cut.id, label: cut.label },
    geometry: {
      type: 'LineString' as const,
      coordinates: [
        [cut.start.lng, cut.start.lat],
        [cut.end.lng, cut.end.lat],
      ],
    },
  }));
  updateSource(map, 'fp-section-cuts', features);
}

function updateSource(map: MaplibreMap, sourceId: string, features: GeoJSON.Feature[]): void {
  const source = map.getSource(sourceId);
  if (source && 'setData' in source) {
    (source as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features,
    });
  }
}

/** Highlight a selected feature on the map. Pass null to clear. */
export function setSelectionHighlight(
  map: MaplibreMap,
  feature: GeoJSON.Feature | null,
): void {
  const source = map.getSource('fp-selection');
  if (source && 'setData' in source) {
    (source as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: feature ? [feature] : [],
    });
  }
}

const SELECTION_LAYER_IDS = ['fp-selection-circle', 'fp-selection-line'] as const;
const SECTION_CUT_LAYER_IDS = ['fp-section-cuts-line', 'fp-section-cuts-labels'] as const;

export function removeFloorPlanLayers(map: MaplibreMap): void {
  for (const id of [...LAYER_IDS, ...SELECTION_LAYER_IDS, ...SECTION_CUT_LAYER_IDS]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  for (const id of LAYER_IDS) {
    if (map.getSource(id)) map.removeSource(id);
  }
  if (map.getSource('fp-section-cuts')) map.removeSource('fp-section-cuts');
}

export function hasFloorPlanLayers(map: MaplibreMap): boolean {
  return LAYER_IDS.some((id) => map.getSource(id));
}

/** Layer IDs that can be queried for element selection */
export const QUERYABLE_LAYER_IDS = ['fp-walls', 'fp-doors', 'fp-windows', 'fp-equipment', 'fp-cables', 'fp-annotations'] as const;

/** Map a layer ID to an element type */
export function layerIdToElementType(layerId: string): 'wall' | 'door' | 'window' | 'equipment' | 'cable' | 'annotation' | null {
  switch (layerId) {
    case 'fp-walls': return 'wall';
    case 'fp-doors': return 'door';
    case 'fp-windows': return 'window';
    case 'fp-equipment': return 'equipment';
    case 'fp-cables': return 'cable';
    case 'fp-annotations': return 'annotation';
    default: return null;
  }
}
