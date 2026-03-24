import { Canvas2D } from '@/components/floor-plan/Canvas2D';
import { FloorToolbar } from '@/components/floor-plan/FloorToolbar';
import { useFloorEditor } from '@/hooks/useFloorEditor';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';

export function FloorPlanEditor() {
  const { currentProject } = useProjectStore();
  const { activeFloorIndex, setActiveFloor } = useEditorStore();
  const {
    floor,
    addWall, addDoor, addWindow, addAnnotation,
    addEquipment, addCableRoute,
    undo, redo, canUndo, canRedo,
  } = useFloorEditor();

  const building = currentProject?.building;

  if (!building || building.floors.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 p-4 text-center">
        <div>
          <p className="text-lg">No floors generated yet.</p>
          <p className="text-sm mt-1">Go to Building Setup to generate floors first.</p>
        </div>
      </div>
    );
  }

  if (!floor) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Floor selector */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-2 shrink-0 overflow-x-auto">
        {building.floors.map((f, i) => (
          <button
            key={f.id}
            onClick={() => setActiveFloor(i)}
            className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${
              i === activeFloorIndex
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <Canvas2D
          floor={floor}
          onWallCreated={addWall}
          onDoorPlaced={addDoor}
          onWindowPlaced={addWindow}
          onAnnotationPlaced={addAnnotation}
          onEquipmentPlaced={addEquipment}
          onCableRouteCreated={addCableRoute}
        />
      </div>

      {/* Toolbar */}
      <FloorToolbar
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
    </div>
  );
}
