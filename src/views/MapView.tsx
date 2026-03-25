import { useCallback, useState } from 'react';
import { MapContainer } from '@/components/map/MapContainer';
import { useProjectStore } from '@/store/projectStore';
import type { GeoPolygon } from '@/types/geometry';
import { Search, Box } from 'lucide-react';

export function MapView() {
  const { currentProject, activeBuildingId, updateBuilding } = useProjectStore();
  const [show3D, setShow3D] = useState(false);

  const activeBuilding = currentProject?.buildings.find((b) => b.id === activeBuildingId);
  const hasFloors = (activeBuilding?.floors.length ?? 0) > 0;

  const handleBuildingFootprintSelected = useCallback(
    async (polygon: GeoPolygon, _levels: number | null) => {
      if (!activeBuildingId) return;
      await updateBuilding(activeBuildingId, { footprint: polygon });
    },
    [activeBuildingId, updateBuilding],
  );

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">
            {activeBuilding?.footprint
              ? 'Building footprint selected. Click another to change.'
              : 'Click a building on the map to select its footprint.'}
          </span>
        </div>
        <button
          onClick={() => setShow3D(!show3D)}
          disabled={!hasFloors}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            show3D
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } disabled:opacity-30 disabled:cursor-not-allowed`}
          title={hasFloors ? 'Toggle 3D building view' : 'Generate floors in Building Setup first'}
        >
          <Box className="w-4 h-4" />
          3D
        </button>
      </div>
      <div className="flex-1">
        <MapContainer
          allowFootprintSelection
          onBuildingFootprintSelected={handleBuildingFootprintSelected}
          show3D={show3D}
        />
      </div>
    </div>
  );
}
