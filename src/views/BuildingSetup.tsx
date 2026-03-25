import { useState, useEffect } from 'react';
import { Building2, Layers, Ruler, RefreshCw } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { geoPolygonToLocal, generateFloors } from '@/services/building-generator';

export function BuildingSetup() {
  const { currentProject, updateCurrentProject } = useProjectStore();
  const building = currentProject?.building;

  const [floorCount, setFloorCount] = useState(building?.floorCount ?? 1);
  const [floorHeight, setFloorHeight] = useState(building?.defaultFloorHeight ?? 3.0);

  useEffect(() => {
    if (building) {
      setFloorCount(building.floorCount);
      setFloorHeight(building.defaultFloorHeight);
    }
  }, [building]);

  if (!currentProject || !building) {
    return <div className="h-full flex items-center justify-center text-gray-400">No project loaded</div>;
  }

  const hasFootprint = building.footprint !== null;

  const handleGenerateFloors = async () => {
    let footprintLocal = building.footprintLocal;
    if (building.footprint && footprintLocal.length === 0) {
      footprintLocal = geoPolygonToLocal(building.footprint);
    }

    const updatedBuilding = {
      ...building,
      floorCount,
      defaultFloorHeight: floorHeight,
      footprintLocal,
      floors: generateFloors({
        ...building,
        defaultFloorHeight: floorHeight,
        footprintLocal,
      }, floorCount),
    };

    await updateCurrentProject({ building: updatedBuilding });
  };

  return (
    <div className="h-full overflow-auto p-4 max-w-lg mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Building Setup
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure the building dimensions and generate floors.
        </p>
      </div>

      <div className={`p-3 rounded-lg text-sm ${hasFootprint ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
        {hasFootprint
          ? 'Building footprint loaded from map.'
          : 'No footprint selected. Go to Map view to select a building, or floors will use a default rectangle.'}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Layers className="w-4 h-4" />
          Number of Floors
        </label>
        <input
          type="number"
          min={1}
          max={100}
          value={floorCount}
          onChange={(e) => setFloorCount(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Ruler className="w-4 h-4" />
          Floor-to-Floor Height (meters)
        </label>
        <input
          type="number"
          min={2}
          max={10}
          step={0.1}
          value={floorHeight}
          onChange={(e) => setFloorHeight(Math.max(2, parseFloat(e.target.value) || 3))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        onClick={handleGenerateFloors}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-[0.98]"
      >
        <RefreshCw className="w-4 h-4" />
        Generate {floorCount} Floor{floorCount > 1 ? 's' : ''}
      </button>

      {building.floors.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Generated Floors</h3>
          <div className="space-y-1">
            {building.floors.map((floor) => (
              <div key={floor.id} className="flex items-center justify-between bg-white border rounded-lg px-3 py-2 text-sm">
                <span>{floor.label}</span>
                <span className="text-gray-400">{floor.walls.length} walls</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
