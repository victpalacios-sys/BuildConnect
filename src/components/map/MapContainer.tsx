import { useRef, useEffect, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useProjectStore } from '@/store/projectStore';
import { queryBuildingFootprints } from '@/services/overpass';
import { geocodeAddress } from '@/services/geocode';
import type { GeoPolygon } from '@/types/geometry';
import type { Floor } from '@/types/building';
import type { ViewMode, EditorTool } from '@/store/editorStore';
import type { OSMBuilding } from '@/services/overpass';
import { createBuildingLayer, LAYER_ID } from './ThreeBuildingLayer';
import { addFloorPlanLayers, updateFloorPlanData, removeFloorPlanLayers, hasFloorPlanLayers } from './FloorPlanLayer';

const STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const DEFAULT_CENTER: [number, number] = [-73.985, 40.748]; // NYC fallback

interface MapContainerProps {
  mapTileOpacity?: number;           // 0-1, dims street tiles
  allowFootprintSelection?: boolean; // only true during add/edit building flow
  onBuildingFootprintSelected?: (polygon: GeoPolygon, levels: number | null) => void;
  onMapBuildingClicked?: (buildingId: string) => void;
  onMapClick?: (e: { lngLat: { lng: number; lat: number }; point?: { x: number; y: number } }) => void;
  onBuildingsLoaded?: (buildings: OSMBuilding[]) => void;
  onExitFloorMode?: () => void;
  show3D?: boolean;
  activeFloor?: Floor | null;
  activeBuildingFootprint?: GeoPolygon | null;
  viewMode?: ViewMode;
  activeTool?: EditorTool;
  pendingFootprint?: GeoPolygon | null; // shows preview during Add Building flow
  mapRef?: React.MutableRefObject<maplibregl.Map | null>;
}

export function MapContainer({
  mapTileOpacity = 1.0,
  allowFootprintSelection = false,
  onBuildingFootprintSelected,
  onMapBuildingClicked,
  onMapClick,
  onBuildingsLoaded,
  onExitFloorMode,
  show3D = false,
  activeFloor = null,
  activeBuildingFootprint = null,
  viewMode = 'site',
  activeTool = 'select',
  pendingFootprint = null,
  mapRef: externalMapRef,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapReadyRef = useRef(false);
  const { currentProject, activeBuildingId, updateCurrentProject } = useProjectStore();
  const [loading, setLoading] = useState(false);

  // Use refs to avoid stale closures in map event handlers
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const onMapBuildingClickedRef = useRef(onMapBuildingClicked);
  onMapBuildingClickedRef.current = onMapBuildingClicked;
  const allowFootprintSelectionRef = useRef(allowFootprintSelection);
  allowFootprintSelectionRef.current = allowFootprintSelection;
  const onBuildingFootprintSelectedRef = useRef(onBuildingFootprintSelected);
  onBuildingFootprintSelectedRef.current = onBuildingFootprintSelected;
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const onBuildingsLoadedRef = useRef(onBuildingsLoaded);
  onBuildingsLoadedRef.current = onBuildingsLoaded;
  const onExitFloorModeRef = useRef(onExitFloorMode);
  onExitFloorModeRef.current = onExitFloorMode;
  const currentProjectRef = useRef(currentProject);
  currentProjectRef.current = currentProject;

  const loadBuildings = useCallback(async (map: maplibregl.Map) => {
    const center = map.getCenter();
    setLoading(true);
    try {
      const buildings = await queryBuildingFootprints(center.lat, center.lng, 300);

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: buildings.map((b) => ({
          type: 'Feature' as const,
          properties: { id: b.id, levels: b.levels, name: b.name },
          geometry: b.polygon,
        })),
      };

      const source = map.getSource('buildings') as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(geojson);
      } else {
        map.addSource('buildings', { type: 'geojson', data: geojson });
        map.addLayer({
          id: 'buildings-fill',
          type: 'fill',
          source: 'buildings',
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.04,
          },
        });
        map.addLayer({
          id: 'buildings-outline',
          type: 'line',
          source: 'buildings',
          paint: {
            'line-color': '#94a3b8',
            'line-width': 1,
          },
        });
      }

      // Notify parent about loaded OSM buildings
      if (onBuildingsLoadedRef.current) {
        onBuildingsLoadedRef.current(buildings);
      }
    } catch (err) {
      console.error('Failed to load buildings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Render project buildings as highlighted footprint layers
  const renderProjectBuildings = useCallback((map: maplibregl.Map) => {
    const project = currentProjectRef.current;
    if (!project) return;

    const features: GeoJSON.Feature[] = project.buildings
      .filter((b) => b.footprint)
      .map((b) => ({
        type: 'Feature' as const,
        properties: { buildingId: b.id, buildingName: b.name || '' },
        geometry: b.footprint!,
      }));

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features,
    };

    const source = map.getSource('project-buildings') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);
    } else {
      map.addSource('project-buildings', { type: 'geojson', data: geojson });
      map.addLayer({
        id: 'project-buildings-fill',
        type: 'fill',
        source: 'project-buildings',
        paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.3 },
      });
      map.addLayer({
        id: 'project-buildings-outline',
        type: 'line',
        source: 'project-buildings',
        paint: { 'line-color': '#1d4ed8', 'line-width': 3.5 },
      });
      map.addLayer({
        id: 'project-buildings-label',
        type: 'symbol',
        source: 'project-buildings',
        layout: {
          'text-field': ['get', 'buildingName'],
          'text-size': 12,
          'text-anchor': 'center',
          'text-allow-overlap': true,
          'symbol-placement': 'point',
        },
        paint: {
          'text-color': '#1e293b',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      });
    }
  }, []);

  // === ONE-TIME map initialization — empty dependency array ===
  useEffect(() => {
    if (!mapContainer.current) return;

    let cancelled = false;
    let map: maplibregl.Map;

    async function initMap() {
      // Determine initial center
      const project = currentProjectRef.current;
      let center: [number, number];

      if (project?.center) {
        center = [project.center.lng, project.center.lat];
      } else if (project?.buildings.length) {
        const firstBuilding = project.buildings[0];
        if (firstBuilding.address) {
          const result = await geocodeAddress(firstBuilding.address);
          if (cancelled) return;
          if (result) {
            center = [result.lng, result.lat];
            updateCurrentProject({ center: { lat: result.lat, lng: result.lng } });
          } else {
            center = DEFAULT_CENTER;
          }
        } else {
          center = DEFAULT_CENTER;
        }
      } else {
        // Try browser geolocation
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 5000,
              maximumAge: 300000,
            });
          });
          if (!cancelled) {
            center = [pos.coords.longitude, pos.coords.latitude];
          }
        } catch {
          // Geolocation denied or unavailable — use NYC fallback
        }
        center ??= DEFAULT_CENTER;
      }

      if (cancelled || !mapContainer.current) return;

      map = new maplibregl.Map({
        container: mapContainer.current,
        style: STYLE_URL,
        center,
        zoom: 17,
      });

      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.addControl(
        new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }),
        'top-right',
      );

      map.on('load', () => {
        mapRef.current = map;
        mapReadyRef.current = true;
        if (externalMapRef) externalMapRef.current = map;

        // Render project building footprints
        renderProjectBuildings(map);

        // Load Overpass buildings
        loadBuildings(map);
      });

      // General map click — forwarded to parent for drawing tools
      map.on('click', (e) => {
        if (onMapClickRef.current) {
          onMapClickRef.current({ lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat }, point: { x: e.point.x, y: e.point.y } });
        }

        // Exit floor mode when clicking empty space with select tool
        if (viewModeRef.current === 'floor' && activeToolRef.current === 'select' && onExitFloorModeRef.current) {
          const floorLayers = ['fp-walls', 'fp-doors', 'fp-windows', 'fp-equipment', 'fp-cables', 'fp-annotations', 'fp-section-cuts-line'];
          const hitFeatures = floorLayers.flatMap((layerId) => {
            try {
              return map.queryRenderedFeatures(e.point, { layers: [layerId] });
            } catch {
              return [];
            }
          });
          if (hitFeatures.length === 0) {
            onExitFloorModeRef.current();
          }
        }
      });

      // Overpass building click — only when footprint selection is allowed
      map.on('click', 'buildings-fill', (e) => {
        if (!allowFootprintSelectionRef.current || !onBuildingFootprintSelectedRef.current) return;
        if (e.features?.[0]) {
          const feature = e.features[0];
          const polygon = feature.geometry as unknown as GeoPolygon;
          const levels = (feature.properties?.levels as number) ?? null;
          onBuildingFootprintSelectedRef.current(polygon, levels);
        }
      });

      // Project building click — skip when editing a floor
      map.on('click', 'project-buildings-fill', (e) => {
        if (viewModeRef.current === 'floor') return;
        if (e.features?.[0]) {
          const buildingId = e.features[0].properties?.buildingId as string;
          if (buildingId && onMapBuildingClickedRef.current) {
            onMapBuildingClickedRef.current(buildingId);
          }
        }
      });

      map.on('mouseenter', 'buildings-fill', () => {
        if (allowFootprintSelectionRef.current) {
          map.getCanvas().style.cursor = 'pointer';
        }
      });
      map.on('mouseleave', 'buildings-fill', () => {
        map.getCanvas().style.cursor = '';
      });
      map.on('mouseenter', 'project-buildings-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'project-buildings-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    }

    initMap();

    return () => {
      cancelled = true;
      mapReadyRef.current = false;
      if (map) map.remove();
      mapRef.current = null;
      if (externalMapRef) externalMapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === Fly to project center when project changes ===
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    if (currentProject?.center) {
      map.flyTo({ center: [currentProject.center.lng, currentProject.center.lat], zoom: 17 });
    }
  }, [currentProject?.center]);

  // Update project building footprints when buildings change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    if (!map.isStyleLoaded()) {
      map.once('styledata', () => renderProjectBuildings(map));
      return;
    }
    renderProjectBuildings(map);
  }, [currentProject?.buildings, renderProjectBuildings]);

  // Manage map tile opacity
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    if (!map.isStyleLoaded()) return;

    const style = map.getStyle();
    if (!style?.layers) return;

    for (const layer of style.layers) {
      if (layer.type === 'raster') {
        map.setPaintProperty(layer.id, 'raster-opacity', mapTileOpacity);
      }
    }
  }, [mapTileOpacity]);

  // Manage 3D building layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    if (!map.isStyleLoaded()) return;

    // Remove existing 3D layer
    if (map.getLayer(LAYER_ID)) {
      map.removeLayer(LAYER_ID);
    }

    const activeBuilding = currentProject?.buildings.find((b) => b.id === activeBuildingId);
    if (show3D && activeBuilding && activeBuilding.floors.length > 0 && activeBuilding.footprint) {
      const layer = createBuildingLayer(activeBuilding);
      map.addLayer(layer);
      map.easeTo({ pitch: 55, bearing: -20, duration: 800 });
    } else {
      map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
    }
  }, [show3D, currentProject?.buildings, activeBuildingId]);

  // Derive a fingerprint from floor element counts to detect data changes
  const floorFingerprint = activeFloor
    ? `${activeFloor.id}-${activeFloor.walls.length}-${activeFloor.doors.length}-${activeFloor.windows.length}-${activeFloor.equipment.length}-${activeFloor.cableRoutes.length}-${activeFloor.annotations.length}`
    : '';

  // Manage floor plan GeoJSON layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;

    function doUpdate() {
      if (!map!.isStyleLoaded()) return;
      if (viewMode === 'floor' && activeFloor && activeBuildingFootprint) {
        if (!hasFloorPlanLayers(map!)) {
          addFloorPlanLayers(map!);
        }
        updateFloorPlanData(map!, activeFloor, activeBuildingFootprint);
      } else {
        if (hasFloorPlanLayers(map!)) {
          removeFloorPlanLayers(map!);
        }
      }
    }

    if (map.isStyleLoaded()) {
      doUpdate();
    } else {
      map.once('styledata', doUpdate);
    }
  }, [viewMode, activeFloor, activeBuildingFootprint, floorFingerprint]);

  // Show pending footprint preview during Add Building flow
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    if (!map.isStyleLoaded()) return;

    const sourceId = 'pending-footprint';
    const fillId = 'pending-footprint-fill';
    const outlineId = 'pending-footprint-outline';

    if (pendingFootprint) {
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: pendingFootprint }],
      };
      const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(geojson);
      } else {
        map.addSource(sourceId, { type: 'geojson', data: geojson });
        map.addLayer({
          id: fillId,
          type: 'fill',
          source: sourceId,
          paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.25 },
        });
        map.addLayer({
          id: outlineId,
          type: 'line',
          source: sourceId,
          paint: { 'line-color': '#1d4ed8', 'line-width': 3 },
        });
      }
    } else {
      // Clear pending footprint layers
      if (map.getLayer(fillId)) map.removeLayer(fillId);
      if (map.getLayer(outlineId)) map.removeLayer(outlineId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    }
  }, [pendingFootprint]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {loading && (
        <div className="absolute top-3 left-3 bg-white/90 px-3 py-1.5 rounded-lg text-sm text-gray-600 shadow">
          Loading buildings...
        </div>
      )}
    </div>
  );
}
