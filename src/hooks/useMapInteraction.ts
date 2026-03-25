import { useCallback, useRef, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { Point2D, GeoPolygon } from '@/types/geometry';
import { useEditorStore } from '@/store/editorStore';
import { QUERYABLE_LAYER_IDS, layerIdToElementType } from '@/components/map/FloorPlanLayer';
import type { ElementType } from '@/components/panels/ElementPropertiesPanel';

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

export interface SelectedElement {
  id: string;
  type: ElementType;
  feature: GeoJSON.Feature;
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
  onSectionCutCreated?: (start: Point2D, end: Point2D) => void;
  onElementSelected?: (element: SelectedElement | null) => void;
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
  onSectionCutCreated,
  onElementSelected,
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

  const handleSelect = useCallback((e: { lngLat: { lng: number; lat: number }; point: { x: number; y: number } }) => {
    const map = mapRef.current;
    if (!map || !onElementSelected) return;

    // Query rendered features at the click point across all floor plan layers
    const existingLayers = QUERYABLE_LAYER_IDS.filter((id) => map.getLayer(id));
    if (existingLayers.length === 0) {
      onElementSelected(null);
      return;
    }

    const features = map.queryRenderedFeatures(
      [e.point.x, e.point.y],
      { layers: existingLayers as unknown as string[] },
    );

    if (features.length > 0) {
      const feature = features[0];
      const layerId = feature.layer?.id;
      const elementType = layerId ? layerIdToElementType(layerId) : null;
      const elementId = feature.properties?.id as string | undefined;

      if (elementType && elementId) {
        onElementSelected({
          id: elementId,
          type: elementType,
          feature: feature as unknown as GeoJSON.Feature,
        });
        return;
      }
    }

    // Clicked on empty space - deselect
    onElementSelected(null);
  }, [mapRef, onElementSelected]);

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
      case 'section-cut':
        if (!wallStart.current) {
          wallStart.current = point;
          setIsDrawing(true);
        } else {
          onSectionCutCreated?.(wallStart.current, point);
          wallStart.current = null;
          setIsDrawing(false);
        }
        break;
    }
  }, [activeTool, getLocalPoint, getReticlePoint, onWallCreated, onDoorPlaced, onWindowPlaced, onAnnotationPlaced, onEquipmentPlaced, onSectionCutCreated]);

  const handleFinishDrawing = useCallback(() => {
    if (activeTool === 'wall' || activeTool === 'section-cut') {
      wallStart.current = null;
      setIsDrawing(false);
    }
    if (activeTool === 'cable' && cablePoints.current.length >= 2) {
      onCableRouteCreated([...cablePoints.current]);
      cablePoints.current = [];
      setIsDrawing(false);
    }
  }, [activeTool, onCableRouteCreated]);

  const handleMapClick = useCallback((e: { lngLat: { lng: number; lat: number }; point?: { x: number; y: number } }) => {
    if (activeTool === 'select') {
      if (e.point) {
        handleSelect(e as { lngLat: { lng: number; lat: number }; point: { x: number; y: number } });
      }
      return;
    }
    if (activeTool === 'pan') return;
    handlePlace(e.lngLat);
  }, [activeTool, handlePlace, handleSelect]);

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
    if (activeTool === 'section-cut') {
      return isDrawing ? 'Tap to place cut end point' : 'Tap to place cut start point';
    }
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
