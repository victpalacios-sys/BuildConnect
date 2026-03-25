import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Floor, Wall, Door, Window, Equipment, CableRoute, Annotation, SectionCut, Building } from '@/types/building';
import type { Point2D, GeoPoint } from '@/types/geometry';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';

function localToGeoPoint(point: Point2D, building: Building): GeoPoint {
  if (!building.footprint) return { lat: 0, lng: 0 };
  const coords = building.footprint.coordinates[0];
  const centLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const centLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos((centLat * Math.PI) / 180);
  return {
    lng: centLng + point.x / metersPerDegreeLng,
    lat: centLat + point.y / metersPerDegreeLat,
  };
}

export function useFloorEditor() {
  const { currentProject, updateCurrentProject, activeBuildingId, updateBuilding } = useProjectStore();
  const { activeFloorIndex } = useEditorStore();

  const building = currentProject?.buildings.find((b) => b.id === activeBuildingId) ?? null;
  const floor = building?.floors[activeFloorIndex] ?? null;

  const undoStack = useRef<Floor[]>([]);
  const redoStack = useRef<Floor[]>([]);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const saveFloor = useCallback(
    async (updatedFloor: Floor) => {
      if (!building || !currentProject || !activeBuildingId) return;
      const floors = [...building.floors];
      floors[activeFloorIndex] = updatedFloor;
      const buildings = currentProject.buildings.map((b) =>
        b.id === activeBuildingId ? { ...b, floors } : b,
      );
      await updateCurrentProject({ buildings });
    },
    [building, currentProject, activeBuildingId, activeFloorIndex, updateCurrentProject],
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

  // --- Update methods ---

  const updateWall = useCallback(
    async (wallId: string, changes: Partial<Wall>) => {
      if (!floor) return;
      pushUndo();
      const walls = floor.walls.map((w) => (w.id === wallId ? { ...w, ...changes } : w));
      await saveFloor({ ...floor, walls });
    },
    [floor, pushUndo, saveFloor],
  );

  const updateDoor = useCallback(
    async (doorId: string, changes: Partial<Door>) => {
      if (!floor) return;
      pushUndo();
      const doors = floor.doors.map((d) => (d.id === doorId ? { ...d, ...changes } : d));
      await saveFloor({ ...floor, doors });
    },
    [floor, pushUndo, saveFloor],
  );

  const updateWindow = useCallback(
    async (windowId: string, changes: Partial<Window>) => {
      if (!floor) return;
      pushUndo();
      const windows = floor.windows.map((w) => (w.id === windowId ? { ...w, ...changes } : w));
      await saveFloor({ ...floor, windows });
    },
    [floor, pushUndo, saveFloor],
  );

  const updateEquipment = useCallback(
    async (equipmentId: string, changes: Partial<Equipment>) => {
      if (!floor) return;
      pushUndo();
      const equipment = floor.equipment.map((e) => (e.id === equipmentId ? { ...e, ...changes } : e));
      await saveFloor({ ...floor, equipment });
    },
    [floor, pushUndo, saveFloor],
  );

  const updateCableRoute = useCallback(
    async (routeId: string, changes: Partial<CableRoute>) => {
      if (!floor) return;
      pushUndo();
      const cableRoutes = floor.cableRoutes.map((r) => (r.id === routeId ? { ...r, ...changes } : r));
      await saveFloor({ ...floor, cableRoutes });
    },
    [floor, pushUndo, saveFloor],
  );

  const updateAnnotation = useCallback(
    async (annotationId: string, changes: Partial<Annotation>) => {
      if (!floor) return;
      pushUndo();
      const annotations = floor.annotations.map((a) => (a.id === annotationId ? { ...a, ...changes } : a));
      await saveFloor({ ...floor, annotations });
    },
    [floor, pushUndo, saveFloor],
  );

  // --- Remove methods ---

  const removeWall = useCallback(
    async (wallId: string) => {
      if (!floor) return;
      pushUndo();
      const walls = floor.walls.filter((w) => w.id !== wallId);
      // Also remove doors and windows on this wall
      const doors = floor.doors.filter((d) => d.wallId !== wallId);
      const windows = floor.windows.filter((w) => w.wallId !== wallId);
      await saveFloor({ ...floor, walls, doors, windows });
    },
    [floor, pushUndo, saveFloor],
  );

  const removeDoor = useCallback(
    async (doorId: string) => {
      if (!floor) return;
      pushUndo();
      const doors = floor.doors.filter((d) => d.id !== doorId);
      await saveFloor({ ...floor, doors });
    },
    [floor, pushUndo, saveFloor],
  );

  const removeWindow = useCallback(
    async (windowId: string) => {
      if (!floor) return;
      pushUndo();
      const windows = floor.windows.filter((w) => w.id !== windowId);
      await saveFloor({ ...floor, windows });
    },
    [floor, pushUndo, saveFloor],
  );

  const removeEquipment = useCallback(
    async (equipmentId: string) => {
      if (!floor) return;
      pushUndo();
      const equipment = floor.equipment.filter((e) => e.id !== equipmentId);
      await saveFloor({ ...floor, equipment });
    },
    [floor, pushUndo, saveFloor],
  );

  const removeCableRoute = useCallback(
    async (routeId: string) => {
      if (!floor) return;
      pushUndo();
      const cableRoutes = floor.cableRoutes.filter((r) => r.id !== routeId);
      await saveFloor({ ...floor, cableRoutes });
    },
    [floor, pushUndo, saveFloor],
  );

  const removeAnnotation = useCallback(
    async (annotationId: string) => {
      if (!floor) return;
      pushUndo();
      const annotations = floor.annotations.filter((a) => a.id !== annotationId);
      await saveFloor({ ...floor, annotations });
    },
    [floor, pushUndo, saveFloor],
  );

  const addSectionCut = useCallback(
    async (start: Point2D, end: Point2D) => {
      if (!building) return;
      const sectionCut: SectionCut = {
        id: uuidv4(),
        label: `Section ${String.fromCharCode(65 + building.sectionCuts.length)}`,
        start: localToGeoPoint(start, building),
        end: localToGeoPoint(end, building),
      };
      await updateBuilding(building.id, {
        sectionCuts: [...building.sectionCuts, sectionCut],
      });
    },
    [building, updateBuilding],
  );

  return {
    floor,
    building,
    addWall, addDoor, addWindow, addAnnotation, addEquipment, addCableRoute, addSectionCut,
    updateWall, updateDoor, updateWindow, updateEquipment, updateCableRoute, updateAnnotation,
    removeWall, removeDoor, removeWindow, removeEquipment, removeCableRoute, removeAnnotation,
    undo, redo, canUndo, canRedo,
  };
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
