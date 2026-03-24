import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Floor, Wall, Door, Equipment, CableRoute, Annotation } from '@/types/building';
import type { Point2D } from '@/types/geometry';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';

export function useFloorEditor() {
  const { currentProject, updateCurrentProject } = useProjectStore();
  const { activeFloorIndex } = useEditorStore();

  const building = currentProject?.building;
  const floor = building?.floors[activeFloorIndex] ?? null;

  const undoStack = useRef<Floor[]>([]);
  const redoStack = useRef<Floor[]>([]);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const saveFloor = useCallback(
    async (updatedFloor: Floor) => {
      if (!building || !currentProject) return;
      const floors = [...building.floors];
      floors[activeFloorIndex] = updatedFloor;
      await updateCurrentProject({
        building: { ...building, floors },
      });
    },
    [building, currentProject, activeFloorIndex, updateCurrentProject],
  );

  const pushUndo = useCallback(() => {
    if (!floor) return;
    undoStack.current.push(structuredClone(floor));
    redoStack.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, [floor]);

  const undo = useCallback(async () => {
    if (!floor || undoStack.current.length === 0) return;
    redoStack.current.push(structuredClone(floor));
    const prev = undoStack.current.pop()!;
    await saveFloor(prev);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
  }, [floor, saveFloor]);

  const redo = useCallback(async () => {
    if (!floor || redoStack.current.length === 0) return;
    undoStack.current.push(structuredClone(floor));
    const next = redoStack.current.pop()!;
    await saveFloor(next);
    setCanRedo(redoStack.current.length > 0);
    setCanUndo(true);
  }, [floor, saveFloor]);

  const addWall = useCallback(
    async (start: Point2D, end: Point2D) => {
      if (!floor) return;
      pushUndo();
      const wall: Wall = { id: uuidv4(), start, end, thickness: 0.15, isExterior: false };
      await saveFloor({ ...floor, walls: [...floor.walls, wall] });
    },
    [floor, pushUndo, saveFloor],
  );

  const addDoor = useCallback(
    async (worldPoint: Point2D) => {
      if (!floor) return;
      const nearest = findNearestWall(floor.walls, worldPoint);
      if (!nearest) return;
      pushUndo();
      const door: Door = { id: uuidv4(), wallId: nearest.wall.id, position: nearest.t, width: 0.9 };
      await saveFloor({ ...floor, doors: [...floor.doors, door] });
    },
    [floor, pushUndo, saveFloor],
  );

  const addWindow = useCallback(
    async (worldPoint: Point2D) => {
      if (!floor) return;
      const nearest = findNearestWall(floor.walls, worldPoint);
      if (!nearest) return;
      pushUndo();
      const win = { id: uuidv4(), wallId: nearest.wall.id, position: nearest.t, width: 1.2, sillHeight: 0.9, height: 1.2 };
      await saveFloor({ ...floor, windows: [...floor.windows, win] });
    },
    [floor, pushUndo, saveFloor],
  );

  const addAnnotation = useCallback(
    async (worldPoint: Point2D) => {
      if (!floor) return;
      pushUndo();
      const annotation: Annotation = { id: uuidv4(), text: 'Note', position: worldPoint, timestamp: Date.now() };
      await saveFloor({ ...floor, annotations: [...floor.annotations, annotation] });
    },
    [floor, pushUndo, saveFloor],
  );

  const addEquipment = useCallback(
    async (worldPoint: Point2D) => {
      if (!floor) return;
      pushUndo();
      const eq: Equipment = { id: uuidv4(), type: 'access-point', position: worldPoint, label: 'AP', properties: {} };
      await saveFloor({ ...floor, equipment: [...floor.equipment, eq] });
    },
    [floor, pushUndo, saveFloor],
  );

  const addCableRoute = useCallback(
    async (points: Point2D[]) => {
      if (!floor || points.length < 2) return;
      pushUndo();
      const route: CableRoute = { id: uuidv4(), points, cableType: 'fiber', label: '' };
      await saveFloor({ ...floor, cableRoutes: [...floor.cableRoutes, route] });
    },
    [floor, pushUndo, saveFloor],
  );

  return { floor, addWall, addDoor, addWindow, addAnnotation, addEquipment, addCableRoute, undo, redo, canUndo, canRedo };
}

function findNearestWall(walls: Wall[], point: Point2D, maxDist: number = 1.0) {
  let best: { wall: Wall; t: number; dist: number } | null = null;

  for (const wall of walls) {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;

    let t = ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / lenSq;
    t = Math.max(0.05, Math.min(0.95, t));

    const proj = { x: wall.start.x + t * dx, y: wall.start.y + t * dy };
    const dist = Math.hypot(point.x - proj.x, point.y - proj.y);

    if (dist < maxDist && (!best || dist < best.dist)) {
      best = { wall, t, dist };
    }
  }

  return best;
}
