import { useRef, useEffect, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useProjectStore } from '@/store/projectStore';
import { queryBuildingFootprints } from '@/services/overpass';
import { geocodeAddress } from '@/services/geocode';
import type { GeoPolygon } from '@/types/geometry';
import type { Floor } from '@/types/building';
import type { ViewMode } from '@/store/editorStore';
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
  show3D?: boolean;
  activeFloor?: Floor | null;
  activeBuildingFootprint?: GeoPolygon | null;
  viewMode?: ViewMode;
  mapRef?: React.MutableRefObject<maplibregl.Map | null>;
}

export function MapContainer({
  mapTileOpacity = 1.0,
  allowFootprintSelection = false,
  onBuildingFootprintSelected,
  onMapBuildingClicked,
  onMapClick,
  show3D = false,
  activeFloor = null,
  activeBuildingFootprint = null,
  viewMode = 'site',
  mapRef: externalMapRef,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
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
    } catch (err) {
      console.error('Failed to load buildings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Render project buildings as highlighted footprint layers
  const renderProjectBuildings = useCallback((map: maplibregl.Map) => {
    if (!currentProject) return;

    const features: GeoJSON.Feature[] = currentProject.buildings
      .filter((b) => b.footprint)
      .map((b) => ({
        type: 'Feature' as const,
        properties: { buildingId: b.id },
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
    }
  }, [currentProject]);

  useEffect(() => {
    if (!mapContainer.current) return;

    let map: maplibregl.Map;
    let cancelled = false;

    async function initMap() {
      let center: [number, number];

      if (currentProject?.center) {
        center = [currentProject.center.lng, currentProject.center.lat];
      } else if (currentProject?.buildings.length) {
        // Try first building's address
        const firstBuilding = currentProject.buildings[0];
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
        center = DEFAULT_CENTER;
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
        if (externalMapRef) externalMapRef.current = map;

        // Project buildings highlight layer (replaces old single selected-building layer)
        renderProjectBuildings(map);

        // Load Overpass buildings
        loadBuildings(map);
      });

      // General map click — forwarded to parent for drawing tools
      map.on('click', (e) => {
        if (onMapClickRef.current) {
          onMapClickRef.current({ lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat }, point: { x: e.point.x, y: e.point.y } });
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

      // Project building click — skip when editing a floor (drawing tools handle clicks)
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
        if (allowFootprintSelection) {
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
      if (map) map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.center, currentProject?.buildings.length, loadBuildings, renderProjectBuildings, updateCurrentProject]);

  // Update project building footprints when buildings change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    renderProjectBuildings(map);
  }, [currentProject?.buildings, renderProjectBuildings]);

  // Manage map tile opacity
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

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
    if (!map || !map.isStyleLoaded()) return;

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

  // Manage floor plan GeoJSON layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (viewMode === 'floor' && activeFloor && activeBuildingFootprint) {
      if (!hasFloorPlanLayers(map)) {
        addFloorPlanLayers(map);
      }
      updateFloorPlanData(map, activeFloor, activeBuildingFootprint);
    } else {
      if (hasFloorPlanLayers(map)) {
        removeFloorPlanLayers(map);
      }
    }
  }, [viewMode, activeFloor, activeBuildingFootprint]);

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
