import { useRef, useEffect, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useProjectStore } from '@/store/projectStore';
import { queryBuildingFootprints, findNearestBuilding } from '@/services/overpass';
import { geocodeAddress } from '@/services/geocode';
import type { GeoPolygon } from '@/types/geometry';
import { createBuildingLayer, LAYER_ID } from './ThreeBuildingLayer';

const STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const DEFAULT_CENTER: [number, number] = [-73.985, 40.748]; // NYC fallback

interface MapContainerProps {
  onBuildingSelected: (polygon: GeoPolygon, levels: number | null) => void;
  show3D?: boolean;
}

export function MapContainer({ onBuildingSelected, show3D = false }: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const { currentProject, updateCurrentProject } = useProjectStore();
  const [loading, setLoading] = useState(false);

  const loadBuildings = useCallback(async (map: maplibregl.Map, autoSelect?: boolean) => {
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

      // Auto-select nearest building to map center
      if (autoSelect && buildings.length > 0) {
        const nearest = findNearestBuilding(buildings, center.lat, center.lng);
        if (nearest) {
          const src = map.getSource('selected-building') as maplibregl.GeoJSONSource | undefined;
          if (src) {
            src.setData({
              type: 'FeatureCollection',
              features: [{ type: 'Feature', properties: {}, geometry: nearest.polygon }],
            });
          }
          onBuildingSelected(nearest.polygon, nearest.levels);
        }
      }
    } catch (err) {
      console.error('Failed to load buildings:', err);
    } finally {
      setLoading(false);
    }
  }, [onBuildingSelected]);

  useEffect(() => {
    if (!mapContainer.current) return;

    let map: maplibregl.Map;
    let cancelled = false;

    async function initMap() {
      let center: [number, number];

      if (currentProject?.center) {
        center = [currentProject.center.lng, currentProject.center.lat];
      } else if (currentProject?.address) {
        // Geocode the project address
        const result = await geocodeAddress(currentProject.address);
        if (cancelled) return;
        if (result) {
          center = [result.lng, result.lat];
          // Persist the geocoded center so we don't re-geocode next time
          updateCurrentProject({ center: { lat: result.lat, lng: result.lng } });
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

        // Selected building highlight layer
        map.addSource('selected-building', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        map.addLayer({
          id: 'selected-building-fill',
          type: 'fill',
          source: 'selected-building',
          paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.3 },
        });
        map.addLayer({
          id: 'selected-building-outline',
          type: 'line',
          source: 'selected-building',
          paint: { 'line-color': '#1d4ed8', 'line-width': 3.5 },
        });

        // Show existing selection if project already has a footprint
        const hasFootprint = !!currentProject?.building.footprint;
        if (hasFootprint) {
          (map.getSource('selected-building') as maplibregl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              properties: {},
              geometry: currentProject.building.footprint,
            }],
          });
        }

        // Load buildings; auto-select nearest if no footprint yet
        loadBuildings(map, !hasFootprint);
      });

      map.on('click', 'buildings-fill', (e) => {
        if (e.features?.[0]) {
          const feature = e.features[0];
          const polygon = feature.geometry as unknown as GeoPolygon;
          const levels = (feature.properties?.levels as number) ?? null;

          // Highlight the selected building
          const src = map.getSource('selected-building') as maplibregl.GeoJSONSource | undefined;
          if (src) {
            src.setData({
              type: 'FeatureCollection',
              features: [{ type: 'Feature', properties: {}, geometry: polygon }],
            });
          }

          onBuildingSelected(polygon, levels);
        }
      });

      map.on('mouseenter', 'buildings-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'buildings-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    }

    initMap();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [currentProject?.center, currentProject?.address, loadBuildings, onBuildingSelected, updateCurrentProject]);

  // Manage 3D building layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Remove existing 3D layer
    if (map.getLayer(LAYER_ID)) {
      map.removeLayer(LAYER_ID);
    }

    const building = currentProject?.building;
    if (show3D && building && building.floors.length > 0 && building.footprint) {
      const layer = createBuildingLayer(building);
      map.addLayer(layer);
      map.easeTo({ pitch: 55, bearing: -20, duration: 800 });
    } else {
      map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
    }
  }, [show3D, currentProject?.building]);

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
