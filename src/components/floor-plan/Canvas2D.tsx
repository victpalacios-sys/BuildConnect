import { useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';
import type { Floor } from '@/types/building';
import type { Point2D } from '@/types/geometry';
import {
  drawGrid, drawWalls, drawDoors, drawEquipment,
  drawCableRoutes, drawAnnotations, drawTempWall,
} from './renderers';
import { useCanvasInteraction } from './useCanvasInteraction';

interface Canvas2DProps {
  floor: Floor;
  onWallCreated: (start: Point2D, end: Point2D) => void;
  onDoorPlaced: (worldPoint: Point2D) => void;
  onWindowPlaced: (worldPoint: Point2D) => void;
  onAnnotationPlaced: (worldPoint: Point2D) => void;
  onEquipmentPlaced: (worldPoint: Point2D) => void;
  onCableRouteCreated: (points: Point2D[]) => void;
}

export function Canvas2D({
  floor,
  onWallCreated,
  onDoorPlaced,
  onWindowPlaced,
  onAnnotationPlaced,
  onEquipmentPlaced,
  onCableRouteCreated,
}: Canvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { zoom, panOffset, showGrid, gridSize } = useEditorStore();

  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDoubleClick,
    tempWallStart,
    tempWallEnd,
  } = useCanvasInteraction(
    canvasRef,
    onWallCreated,
    onDoorPlaced,
    onWindowPlaced,
    onAnnotationPlaced,
    onEquipmentPlaced,
    onCableRouteCreated,
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);

    // Grid
    if (showGrid) {
      drawGrid(ctx, zoom, panOffset, w, h, gridSize);
    }

    // Building elements
    drawWalls(ctx, floor.walls, zoom, panOffset, w, h);
    drawDoors(ctx, floor.doors, floor.walls, zoom, panOffset, w, h);
    drawCableRoutes(ctx, floor.cableRoutes, zoom, panOffset, w, h);
    drawEquipment(ctx, floor.equipment, zoom, panOffset, w, h);
    drawAnnotations(ctx, floor.annotations, zoom, panOffset, w, h);

    // Temp wall preview
    if (tempWallStart && tempWallEnd) {
      drawTempWall(ctx, tempWallStart, tempWallEnd, zoom, panOffset, w, h);
    }

    ctx.restore();
  }, [floor, zoom, panOffset, showGrid, gridSize, tempWallStart, tempWallEnd]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      render();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [render]);

  useEffect(() => {
    render();
  }, [render]);

  return (
    <div ref={containerRef} className="w-full h-full touch-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        className="block"
      />
    </div>
  );
}
