import { useRef, useCallback, useEffect, useState } from 'react';
import type { Point2D } from '@/types/geometry';
import { toWorld, snapToGrid } from './renderers';
import { useEditorStore } from '@/store/editorStore';

interface InteractionState {
  isPanning: boolean;
  lastPointer: Point2D | null;
  wallStart: Point2D | null;
  cablePoints: Point2D[];
}

export function useCanvasInteraction(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onWallCreated: (start: Point2D, end: Point2D) => void,
  onDoorPlaced: (worldPoint: Point2D) => void,
  onWindowPlaced: (worldPoint: Point2D) => void,
  onAnnotationPlaced: (worldPoint: Point2D) => void,
  onEquipmentPlaced: (worldPoint: Point2D) => void,
  onCableRouteCreated: (points: Point2D[]) => void,
) {
  const { activeTool, zoom, panOffset, snapEnabled, gridSize, setZoom, setPanOffset } = useEditorStore();
  const state = useRef<InteractionState>({
    isPanning: false,
    lastPointer: null,
    wallStart: null,
    cablePoints: [],
  });
  const [tempWallEnd, setTempWallEnd] = useState<Point2D | null>(null);

  const getWorldPoint = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const world = toWorld(
        e.clientX - rect.left,
        e.clientY - rect.top,
        zoom,
        panOffset,
        canvas.width / (window.devicePixelRatio || 1),
        canvas.height / (window.devicePixelRatio || 1),
      );
      return snapEnabled ? snapToGrid(world, gridSize) : world;
    },
    [canvasRef, zoom, panOffset, snapEnabled, gridSize],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const point = getWorldPoint(e);

      if (activeTool === 'pan' || e.button === 1) {
        state.current.isPanning = true;
        state.current.lastPointer = { x: e.clientX, y: e.clientY };
        return;
      }

      if (activeTool === 'wall') {
        if (!state.current.wallStart) {
          state.current.wallStart = point;
        } else {
          onWallCreated(state.current.wallStart, point);
          state.current.wallStart = point;
          setTempWallEnd(null);
        }
        return;
      }

      if (activeTool === 'door') { onDoorPlaced(point); return; }
      if (activeTool === 'window') { onWindowPlaced(point); return; }
      if (activeTool === 'annotate') { onAnnotationPlaced(point); return; }
      if (activeTool === 'equipment') { onEquipmentPlaced(point); return; }

      if (activeTool === 'cable') {
        state.current.cablePoints.push(point);
        return;
      }
    },
    [activeTool, getWorldPoint, onWallCreated, onDoorPlaced, onWindowPlaced, onAnnotationPlaced, onEquipmentPlaced],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (state.current.isPanning && state.current.lastPointer) {
        const dx = e.clientX - state.current.lastPointer.x;
        const dy = e.clientY - state.current.lastPointer.y;
        setPanOffset({ x: panOffset.x + dx, y: panOffset.y + dy });
        state.current.lastPointer = { x: e.clientX, y: e.clientY };
        return;
      }

      if (activeTool === 'wall' && state.current.wallStart) {
        setTempWallEnd(getWorldPoint(e));
      }
    },
    [activeTool, panOffset, setPanOffset, getWorldPoint],
  );

  const handlePointerUp = useCallback(() => {
    state.current.isPanning = false;
    state.current.lastPointer = null;
  }, []);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(zoom * delta);
    },
    [zoom, setZoom],
  );

  const handleDoubleClick = useCallback(() => {
    if (activeTool === 'cable' && state.current.cablePoints.length >= 2) {
      onCableRouteCreated([...state.current.cablePoints]);
      state.current.cablePoints = [];
    }
    if (activeTool === 'wall') {
      state.current.wallStart = null;
      setTempWallEnd(null);
    }
  }, [activeTool, onCableRouteCreated]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [canvasRef, handleWheel]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDoubleClick,
    tempWallStart: state.current.wallStart,
    tempWallEnd,
  };
}
