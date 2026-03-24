import { useCallback } from 'react';
import { MapContainer } from '@/components/map/MapContainer';
import { useProjectStore } from '@/store/projectStore';
import type { GeoPolygon } from '@/types/geometry';
import { Search } from 'lucide-react';

export function MapView() {
  const { currentProject, updateCurrentProject } = useProjectStore();

  const handleBuildingSelected = useCallback(
    async (polygon: GeoPolygon, levels: number | null) => {
      if (!currentProject) return;
      await updateCurrentProject({
        building: {
          ...currentProject.building,
          footprint: polygon,
          floorCount: levels ?? currentProject.building.floorCount,
        },
      });
    },
    [currentProject, updateCurrentProject],
  );

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b px-4 py-2 flex items-center gap-2 shrink-0">
        <Search className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500">
          {currentProject?.building.footprint
            ? 'Building footprint selected. Click another to change.'
            : 'Click a building on the map to select its footprint.'}
        </span>
      </div>
      <div className="flex-1">
        <MapContainer onBuildingSelected={handleBuildingSelected} />
      </div>
    </div>
  );
}
