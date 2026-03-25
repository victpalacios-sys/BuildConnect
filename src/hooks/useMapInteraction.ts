import { useCallback, useRef, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { Point2D, GeoPolygon } from '@/types/geometry';
import { useEditorStore } from '@/store/editorStore';

/**
 * Convert [lng, lat] to local meter coordinates relative to building centroid.
 */
function geoToLocal(lngLat: [number, number], centroid: [number, number]): Point2D {
  const [centLng, centLat] = centroid;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos((centLat * Math.PI) / 180);
  return {
    x: (lngLat[0] - centLng) * metersPerDegreeLng,
    y: (lngLat[1] - centLat) * metersPerDegreeLat,
  };
}

function getPolygonCentroid(polygon: GeoPolygon): [number, number] {
  const coords = polygon.coordinates[0];
  const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  return [lng, lat];
}

function snapToGrid(point: Point2D, gridSize: number): Point2D {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

interface UseMapInteractionProps {
  mapRef: React.RefObject<MaplibreMap | null>;
  buildingFootprint: GeoPolygon | null;
  onWallCreated: (start: Point2D, end: Point2D) => void;
  onDoorPlaced: (worldPoint: Point2D) => void;
  onWindowPlaced: (worldPoint: Point2D) => void;
  onAnnotationPlaced: (worldPoint: Point2D) => void;
  onEquipmentPlaced: (worldPoint: Point2D) => void;
  onCableRouteCreated: (points: Point2D[]) => void;
}

export function useMapInteraction({
  mapRef,
  buildingFootprint,
  onWallCreated,
  onDoorPlaced,
  onWindowPlaced,
  onAnnotationPlaced,
  onEquipmentPlaced,
  onCableRouteCreated,
}: UseMapInteractionProps) {
  const { activeTool, snapEnabled, gridSize } = useEditorStore();
  const wallStart = useRef<Point2D | null>(null);
  const cablePoints = useRef<Point2D[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const getLocalPoint = useCallback((lngLat: { lng: number; lat: number }) => {
    if (!buildingFootprint) return { x: 0, y: 0 };
    const centroid = getPolygonCentroid(buildingFootprint);
    let point = geoToLocal([lngLat.lng, lngLat.lat], centroid);
    if (snapEnabled) point = snapToGrid(point, gridSize);
    return point;
  }, [buildingFootprint, snapEnabled, gridSize]);

  const getReticlePoint = useCallback(() => {
    const map = mapRef.current;
    if (!map) return { x: 0, y: 0 };
    const canvas = map.getCanvas();
    const center = map.unproject([canvas.width / (2 * devicePixelRatio), canvas.height / (2 * devicePixelRatio)]);
    return getLocalPoint(center);
  }, [mapRef, getLocalPoint]);

  const handlePlace = useCallback((lngLat?: { lng: number; lat: number }) => {
    const point = lngLat ? getLocalPoint(lngLat) : getReticlePoint();

    switch (activeTool) {
      case 'wall':
        if (!wallStart.current) {
          wallStart.current = point;
          setIsDrawing(true);
        } else {
          onWallCreated(wallStart.current, point);
          wallStart.current = point; // continue from last point
        }
        break;
      case 'door':
        onDoorPlaced(point);
        break;
      case 'window':
        onWindowPlaced(point);
        break;
      case 'annotate':
        onAnnotationPlaced(point);
        break;
      case 'equipment':
        onEquipmentPlaced(point);
        break;
      case 'cable':
        cablePoints.current.push(point);
        setIsDrawing(true);
        break;
    }
  }, [activeTool, getLocalPoint, getReticlePoint, onWallCreated, onDoorPlaced, onWindowPlaced, onAnnotationPlaced, onEquipmentPlaced]);

  const handleFinishDrawing = useCallback(() => {
    if (activeTool === 'wall') {
      wallStart.current = null;
      setIsDrawing(false);
    }
    if (activeTool === 'cable' && cablePoints.current.length >= 2) {
      onCableRouteCreated([...cablePoints.current]);
      cablePoints.current = [];
      setIsDrawing(false);
    }
  }, [activeTool, onCableRouteCreated]);

  const handleMapClick = useCallback((e: { lngLat: { lng: number; lat: number } }) => {
    if (activeTool === 'select' || activeTool === 'pan') return;
    handlePlace(e.lngLat);
  }, [activeTool, handlePlace]);

  const handleReticlePlace = useCallback(() => {
    handlePlace();
  }, [handlePlace]);

  const getReticleHint = useCallback(() => {
    if (activeTool === 'wall') {
      return isDrawing ? 'Tap to place next point. Double-tap to finish.' : 'Tap to place wall start';
    }
    if (activeTool === 'cable') {
      return isDrawing ? 'Tap to place next point. Double-tap to finish.' : 'Tap to start cable route';
    }
    if (activeTool === 'door') return 'Tap to place door';
    if (activeTool === 'window') return 'Tap to place window';
    if (activeTool === 'equipment') return 'Tap to place equipment';
    if (activeTool === 'annotate') return 'Tap to place note';
    return '';
  }, [activeTool, isDrawing]);

  return {
    handleMapClick,
    handleReticlePlace,
    handleFinishDrawing,
    isDrawing,
    getReticleHint,
  };
}
