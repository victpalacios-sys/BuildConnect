import type { Wall, Door, Equipment, CableRoute, Annotation } from '@/types/building';
import type { Point2D } from '@/types/geometry';

const PIXELS_PER_METER = 50;

export function toScreen(point: Point2D, zoom: number, pan: Point2D, canvasW: number, canvasH: number): Point2D {
  return {
    x: (point.x * PIXELS_PER_METER * zoom) + pan.x + canvasW / 2,
    y: (-point.y * PIXELS_PER_METER * zoom) + pan.y + canvasH / 2,
  };
}

export function toWorld(screenX: number, screenY: number, zoom: number, pan: Point2D, canvasW: number, canvasH: number): Point2D {
  return {
    x: (screenX - pan.x - canvasW / 2) / (PIXELS_PER_METER * zoom),
    y: -(screenY - pan.y - canvasH / 2) / (PIXELS_PER_METER * zoom),
  };
}

export function snapToGrid(point: Point2D, gridSize: number): Point2D {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

export function drawGrid(ctx: CanvasRenderingContext2D, zoom: number, pan: Point2D, w: number, h: number, gridSize: number) {
  const step = gridSize * PIXELS_PER_METER * zoom;
  if (step < 5) return;

  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 0.5;

  const offsetX = (pan.x + w / 2) % step;
  const offsetY = (pan.y + h / 2) % step;

  ctx.beginPath();
  for (let x = offsetX; x < w; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = offsetY; y < h; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
}

export function drawWalls(ctx: CanvasRenderingContext2D, walls: Wall[], zoom: number, pan: Point2D, w: number, h: number) {
  walls.forEach((wall) => {
    const start = toScreen(wall.start, zoom, pan, w, h);
    const end = toScreen(wall.end, zoom, pan, w, h);
    const thickness = wall.thickness * PIXELS_PER_METER * zoom;

    ctx.strokeStyle = wall.isExterior ? '#1e293b' : '#64748b';
    ctx.lineWidth = Math.max(thickness, 2);
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  });
}

export function drawDoors(ctx: CanvasRenderingContext2D, doors: Door[], walls: Wall[], zoom: number, pan: Point2D, w: number, h: number) {
  doors.forEach((door) => {
    const wall = walls.find((wal) => wal.id === door.wallId);
    if (!wall) return;

    const t = door.position;
    const doorCenter: Point2D = {
      x: wall.start.x + (wall.end.x - wall.start.x) * t,
      y: wall.start.y + (wall.end.y - wall.start.y) * t,
    };
    const screen = toScreen(doorCenter, zoom, pan, w, h);
    const size = door.width * PIXELS_PER_METER * zoom;

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, Math.max(size / 2, 4), 0, Math.PI * 2);
    ctx.fill();
  });
}

export function drawEquipment(ctx: CanvasRenderingContext2D, equipment: Equipment[], zoom: number, pan: Point2D, w: number, h: number) {
  equipment.forEach((eq) => {
    const screen = toScreen(eq.position, zoom, pan, w, h);
    const size = 12 * zoom;

    ctx.fillStyle = '#10b981';
    ctx.fillRect(screen.x - size / 2, screen.y - size / 2, size, size);

    ctx.fillStyle = '#065f46';
    ctx.font = `${Math.max(10, 10 * zoom)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(eq.label || eq.type, screen.x, screen.y + size / 2 + 12);
  });
}

export function drawCableRoutes(ctx: CanvasRenderingContext2D, routes: CableRoute[], zoom: number, pan: Point2D, w: number, h: number) {
  const cableColors: Record<string, string> = {
    fiber: '#ef4444',
    cat6: '#3b82f6',
    cat6a: '#6366f1',
    coaxial: '#f97316',
  };

  routes.forEach((route) => {
    if (route.points.length < 2) return;
    ctx.strokeStyle = cableColors[route.cableType] || '#6b7280';
    ctx.lineWidth = Math.max(2, 3 * zoom);
    ctx.setLineDash([6, 4]);

    ctx.beginPath();
    const first = toScreen(route.points[0], zoom, pan, w, h);
    ctx.moveTo(first.x, first.y);
    route.points.slice(1).forEach((p) => {
      const s = toScreen(p, zoom, pan, w, h);
      ctx.lineTo(s.x, s.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  });
}

export function drawAnnotations(ctx: CanvasRenderingContext2D, annotations: Annotation[], zoom: number, pan: Point2D, w: number, h: number) {
  annotations.forEach((ann) => {
    const screen = toScreen(ann.position, zoom, pan, w, h);
    ctx.fillStyle = '#7c3aed';
    ctx.font = `${Math.max(11, 11 * zoom)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(ann.text, screen.x + 6, screen.y + 4);

    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function drawTempWall(ctx: CanvasRenderingContext2D, start: Point2D, end: Point2D, zoom: number, pan: Point2D, w: number, h: number) {
  const s = toScreen(start, zoom, pan, w, h);
  const e = toScreen(end, zoom, pan, w, h);

  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 3;
  ctx.setLineDash([4, 4]);

  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(e.x, e.y);
  ctx.stroke();
  ctx.setLineDash([]);
}
