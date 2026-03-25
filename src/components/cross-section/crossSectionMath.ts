import type { Point2D } from '@/types/geometry';
import type { Floor } from '@/types/building';

export interface WallSection {
  position: number;  // distance along cut line where this wall intersects
  thickness: number;
  isExterior: boolean;
  wallId: string;
}

export interface DoorOpening {
  position: number;
  width: number;
  doorId: string;
}

export interface WindowOpening {
  position: number;
  width: number;
  sillHeight: number;
  height: number;
  windowId: string;
}

export interface FloorSection {
  level: number;
  label: string;
  height: number;
  walls: WallSection[];
  doors: DoorOpening[];
  windows: WindowOpening[];
}

/**
 * Compute line-segment intersection. Returns t parameter along line AB if segments intersect.
 */
function lineIntersection(
  a: Point2D, b: Point2D, c: Point2D, d: Point2D,
): { t: number; u: number } | null {
  const dx1 = b.x - a.x;
  const dy1 = b.y - a.y;
  const dx2 = d.x - c.x;
  const dy2 = d.y - c.y;

  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-10) return null;

  const t = ((c.x - a.x) * dy2 - (c.y - a.y) * dx2) / denom;
  const u = ((c.x - a.x) * dy1 - (c.y - a.y) * dx1) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return { t, u };
  }
  return null;
}

/**
 * Compute cross-section data for all floors of a building given a cut line.
 */
export function computeCrossSection(
  floors: Floor[],
  cutStart: Point2D,
  cutEnd: Point2D,
): FloorSection[] {
  const cutLength = Math.hypot(cutEnd.x - cutStart.x, cutEnd.y - cutStart.y);

  return floors.map((floor) => {
    const walls: WallSection[] = [];
    const doors: DoorOpening[] = [];
    const windows: WindowOpening[] = [];

    floor.walls.forEach((wall) => {
      const hit = lineIntersection(cutStart, cutEnd, wall.start, wall.end);
      if (hit) {
        const position = hit.t * cutLength;
        walls.push({
          position,
          thickness: wall.thickness,
          isExterior: wall.isExterior,
          wallId: wall.id,
        });

        // Check doors on this wall near the intersection
        floor.doors.forEach((door) => {
          if (door.wallId === wall.id) {
            const doorCenter = door.position;
            const doorHalfWidth = door.width / (2 * Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y));
            if (Math.abs(hit.u - doorCenter) < doorHalfWidth) {
              doors.push({
                position,
                width: door.width,
                doorId: door.id,
              });
            }
          }
        });

        // Check windows on this wall
        floor.windows.forEach((win) => {
          if (win.wallId === wall.id) {
            const winCenter = win.position;
            const winHalfWidth = win.width / (2 * Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y));
            if (Math.abs(hit.u - winCenter) < winHalfWidth) {
              windows.push({
                position,
                width: win.width,
                sillHeight: win.sillHeight,
                height: win.height,
                windowId: win.id,
              });
            }
          }
        });
      }
    });

    return {
      level: floor.level,
      label: floor.label,
      height: floor.height,
      walls,
      doors,
      windows,
    };
  });
}
