import * as THREE from 'three';
import maplibregl from 'maplibre-gl';
import type { Building } from '@/types/building';
import { generateBuildingMesh } from '@/services/bim-generator';

const LAYER_ID = 'three-building-layer';

/**
 * Creates a MapLibre CustomLayerInterface that renders
 * a 3D building mesh at its real-world geo-coordinates.
 */
export function createBuildingLayer(building: Building): maplibregl.CustomLayerInterface & { id: string } {
  let renderer: THREE.WebGLRenderer;
  let scene: THREE.Scene;
  let camera: THREE.Camera;
  let map: maplibregl.Map;

  // Compute the footprint centroid in lng/lat
  const coords = building.footprint?.coordinates[0];
  if (!coords || coords.length < 3) {
    // Return a no-op layer if no footprint
    return {
      id: LAYER_ID,
      type: 'custom' as const,
      renderingMode: '3d' as const,
      onAdd() {},
      render() {},
    };
  }

  const centLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const centLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;

  // Convert centroid to Mercator coordinates
  const mercatorCenter = maplibregl.MercatorCoordinate.fromLngLat([centLng, centLat], 0);
  // Scale factor: meters to Mercator units at this latitude
  const metersPerUnit = mercatorCenter.meterInMercatorCoordinateUnits();

  return {
    id: LAYER_ID,
    type: 'custom' as const,
    renderingMode: '3d' as const,

    onAdd(mapInstance: maplibregl.Map, gl: WebGLRenderingContext) {
      map = mapInstance;

      // Set up Three.js with MapLibre's shared WebGL context
      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true,
      });
      renderer.autoClear = false;

      scene = new THREE.Scene();
      camera = new THREE.Camera();

      // Lighting
      const ambient = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambient);
      const directional = new THREE.DirectionalLight(0xffffff, 0.8);
      directional.position.set(0.5, 1, 0.3).normalize();
      scene.add(directional);

      // Generate the building mesh
      // Mesh coordinate system: X=east, Y=up, Z=south (from bim-generator)
      const meshGroup = generateBuildingMesh(building, building.groundFloorLevel);

      // MapLibre Mercator coordinate system: X=east, Y=south, Z=up
      // We need to swap Y↔Z: rotate -90° around X, then negate Z scale
      // Rx(-π/2) maps (x,y,z)→(x,z,-y), then scale Z by -s gives (x*s, z*s, y*s)
      // So mesh (east, up, south) → Mercator (east*s, south*s, up*s) ✓
      const rotation = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
      const transform = new THREE.Matrix4()
        .makeTranslation(mercatorCenter.x, mercatorCenter.y, mercatorCenter.z)
        .scale(new THREE.Vector3(metersPerUnit, metersPerUnit, -metersPerUnit))
        .multiply(rotation);

      meshGroup.applyMatrix4(transform);

      scene.add(meshGroup);
    },

    render(_gl: WebGLRenderingContext, args: unknown) {
      // MapLibre provides the camera projection matrix
      // In newer versions it's in args.defaultProjectionData.mainMatrix
      // In older versions it's directly args.matrix (as number[])
      const m = (args as any).defaultProjectionData?.mainMatrix ?? (args as any).matrix;
      if (!m) return;

      camera.projectionMatrix = new THREE.Matrix4().fromArray(m);

      renderer.resetState();
      renderer.render(scene, camera);

      map.triggerRepaint();
    },

    onRemove() {
      scene?.clear();
    },
  };
}

export { LAYER_ID };
