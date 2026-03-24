import { useRef, useEffect } from 'react';
import * as OBC from '@thatopen/components';
import { useProjectStore } from '@/store/projectStore';
import { generateBuildingMesh } from '@/services/bim-generator';

export function BIMViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const componentsRef = useRef<OBC.Components | null>(null);
  const { currentProject } = useProjectStore();
  const building = currentProject?.building;

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const components = new OBC.Components();
    componentsRef.current = components;

    const worlds = components.get(OBC.Worlds);
    const world = worlds.create<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBC.SimpleRenderer
    >();

    world.scene = new OBC.SimpleScene(components);
    world.renderer = new OBC.SimpleRenderer(components, container);
    world.camera = new OBC.SimpleCamera(components);

    components.init();
    world.scene.setup();

    const grids = components.get(OBC.Grids);
    grids.create(world);

    if (building && building.floors.length > 0) {
      const buildingMesh = generateBuildingMesh(building);
      world.scene.three.add(buildingMesh);

      const totalHeight = building.floors.reduce(
        (h, f) => h + f.height,
        0,
      );
      world.camera.controls.setLookAt(
        30,
        totalHeight + 10,
        30,
        0,
        totalHeight / 2,
        0,
      );
    } else {
      world.camera.controls.setLookAt(10, 10, 10, 0, 0, 0);
    }

    return () => {
      components.dispose();
    };
  }, [building]);

  if (!building || building.floors.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 p-4 text-center">
        <div>
          <p className="text-lg">No building model yet.</p>
          <p className="text-sm mt-1">
            Generate floors in Building Setup to see the 3D view.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}
