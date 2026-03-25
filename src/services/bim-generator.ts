import * as THREE from 'three';
import type { Building, Wall } from '@/types/building';

export function generateBuildingMesh(building: Building): THREE.Group {
  const group = new THREE.Group();

  const exteriorMat = new THREE.MeshLambertMaterial({ color: 0xd1d5db });
  const interiorMat = new THREE.MeshLambertMaterial({ color: 0x93c5fd });
  const floorMat = new THREE.MeshLambertMaterial({
    color: 0xf3f4f6,
    side: THREE.DoubleSide,
  });

  let currentHeight = 0;

  building.floors.forEach((floor) => {
    const floorGroup = new THREE.Group();
    floorGroup.position.y = currentHeight;

    floor.walls.forEach((wall) => {
      const mesh = createWallMesh(
        wall,
        floor.height,
        wall.isExterior ? exteriorMat : interiorMat,
      );
      floorGroup.add(mesh);
    });

    if (building.footprintLocal.length > 2) {
      const slab = createFloorSlab(building.footprintLocal, floorMat);
      floorGroup.add(slab);
    }

    group.add(floorGroup);
    currentHeight += floor.height;
  });

  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.sub(center);

  return group;
}

function createWallMesh(
  wall: Wall,
  height: number,
  material: THREE.Material,
): THREE.Mesh {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.hypot(dx, dy);

  if (length < 0.01) return new THREE.Mesh();

  const geometry = new THREE.BoxGeometry(length, height, wall.thickness);
  const mesh = new THREE.Mesh(geometry, material);

  const midX = (wall.start.x + wall.end.x) / 2;
  const midY = (wall.start.y + wall.end.y) / 2;
  mesh.position.set(midX, height / 2, -midY);

  const angle = Math.atan2(dy, dx);
  mesh.rotation.y = angle;

  return mesh;
}

function createFloorSlab(
  footprint: { x: number; y: number }[],
  material: THREE.Material,
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(footprint[0].x, footprint[0].y);
  for (let i = 1; i < footprint.length; i++) {
    shape.lineTo(footprint[i].x, footprint[i].y);
  }
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.2,
    bevelEnabled: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0;

  return mesh;
}
