import { useRef, useEffect, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useProjectStore } from '@/store/projectStore';
import { queryBuildingFootprints } from '@/services/overpass';
import type { GeoPolygon } from '@/types/geometry';

const STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

interface MapContainerProps {
  onBuildingSelected: (polygon: GeoPolygon, levels: number | null) => void;
}

export function MapContainer({ onBuildingSelected }: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const { currentProject } = useProjectStore();
  const [loading, setLoading] = useState(false);

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
            'fill-opacity': 0.15,
          },
        });
        map.addLayer({
          id: 'buildings-outline',
          type: 'line',
          source: 'buildings',
          paint: {
            'line-color': '#3b82f6',
            'line-width': 2,
          },
        });
      }
    } catch (err) {
      console.error('Failed to load buildings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    const center: [number, number] = currentProject?.center
      ? [currentProject.center.lng, currentProject.center.lat]
      : [-73.985, 40.748]; // Default: NYC

    const map = new maplibregl.Map({
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
      loadBuildings(map);
    });

    map.on('click', 'buildings-fill', (e) => {
      if (e.features?.[0]) {
        const feature = e.features[0];
        const polygon = feature.geometry as unknown as GeoPolygon;
        const levels = (feature.properties?.levels as number) ?? null;
        onBuildingSelected(polygon, levels);
      }
    });

    map.on('mouseenter', 'buildings-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'buildings-fill', () => {
      map.getCanvas().style.cursor = '';
    });

    return () => map.remove();
  }, [currentProject?.center, loadBuildings, onBuildingSelected]);

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
