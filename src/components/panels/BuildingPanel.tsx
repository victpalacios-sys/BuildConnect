import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ArrowLeft, Pencil, Plus, ChevronRight } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import type { Building, Floor } from '@/types/building';

interface BuildingPanelProps {
  building: Building;
  onBack: () => void;
}

function createFloor(level: number, defaultHeight: number): Floor {
  const isBelow = level < 0;
  const absLevel = Math.abs(level);
  return {
    id: uuidv4(),
    level,
    label: isBelow ? `Lower Level ${absLevel}` : `Floor ${level}`,
    shortLabel: isBelow ? `-${absLevel}` : `${level}`,
    height: defaultHeight,
    walls: [],
    doors: [],
    windows: [],
    equipment: [],
    cableRoutes: [],
    annotations: [],
    photos: [],
  };
}

export function BuildingPanel({ building, onBack }: BuildingPanelProps) {
  const { updateBuilding, removeBuilding } = useProjectStore();
  const { activeFloorIndex, setActiveFloor, setViewMode } = useEditorStore();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Edit form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [groundFloorLevel, setGroundFloorLevel] = useState(0);

  const startEdit = () => {
    setName(building.name);
    setAddress(building.address);
    setGroundFloorLevel(building.groundFloorLevel);
    setEditing(true);
    setConfirmDelete(false);
  };

  const cancelEdit = () => {
    setEditing(false);
    setConfirmDelete(false);
  };

  const saveEdit = async () => {
    await updateBuilding(building.id, { name, address, groundFloorLevel });
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await removeBuilding(building.id);
  };

  const addFloorAbove = async () => {
    const maxLevel = building.floors.length > 0
      ? Math.max(...building.floors.map((f) => f.level))
      : building.groundFloorLevel - 1;
    const newFloor = createFloor(maxLevel + 1, building.defaultFloorHeight);
    await updateBuilding(building.id, { floors: [...building.floors, newFloor] });
  };

  const addFloorBelow = async () => {
    const minLevel = building.floors.length > 0
      ? Math.min(...building.floors.map((f) => f.level))
      : building.groundFloorLevel + 1;
    const newFloor = createFloor(minLevel - 1, building.defaultFloorHeight);
    await updateBuilding(building.id, { floors: [...building.floors, newFloor] });
  };

  const handleFloorClick = (index: number) => {
    setActiveFloor(index);
    setViewMode('floor');
  };

  // Floor stacking
  const aboveGround = building.floors
    .map((f, i) => ({ floor: f, index: i }))
    .filter(({ floor }) => floor.level >= building.groundFloorLevel)
    .sort((a, b) => b.floor.level - a.floor.level);

  const belowGround = building.floors
    .map((f, i) => ({ floor: f, index: i }))
    .filter(({ floor }) => floor.level < building.groundFloorLevel)
    .sort((a, b) => a.floor.level - b.floor.level);

  // ---- Edit Mode ----
  if (editing) {
    return (
      <div className="space-y-4 text-sm">
        <button
          onClick={cancelEdit}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Cancel
        </button>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Building Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Ground Floor Level</label>
          <select
            value={groundFloorLevel}
            onChange={(e) => setGroundFloorLevel(Number(e.target.value))}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {building.floors.length === 0 ? (
              <option value={0}>0 (default)</option>
            ) : (
              building.floors
                .slice()
                .sort((a, b) => a.level - b.level)
                .map((f) => (
                  <option key={f.id} value={f.level}>
                    {f.level} &mdash; {f.label}
                  </option>
                ))
            )}
          </select>
        </div>

        {/* Delete building */}
        <div className="pt-2 border-t border-gray-200">
          <button
            onClick={handleDelete}
            className={`text-xs ${
              confirmDelete
                ? 'text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded'
                : 'text-red-500 hover:text-red-700'
            }`}
          >
            {confirmDelete ? 'Confirm Delete Building' : 'Delete Building'}
          </button>
        </div>

        {/* Save / Cancel */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={saveEdit}
            className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700"
          >
            Save
          </button>
          <button
            onClick={cancelEdit}
            className="flex-1 border border-gray-300 text-xs py-1.5 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ---- View Mode ----
  return (
    <div className="space-y-4 text-sm">
      {/* Back + Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to project
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{building.name || 'Unnamed Building'}</h3>
          {building.address && (
            <p className="text-xs text-gray-500 mt-0.5">{building.address}</p>
          )}
        </div>
        <button
          onClick={startEdit}
          className="p-1.5 hover:bg-gray-100 rounded"
          title="Edit building"
        >
          <Pencil className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Floors */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs text-gray-500 font-medium">Floors</h4>
        </div>

        {/* Add Above button */}
        <button
          onClick={addFloorAbove}
          className="w-full flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded py-1.5 mb-1"
        >
          <Plus className="w-3 h-3" /> Add Above
        </button>

        {building.floors.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">No floors yet</p>
        ) : (
          <div className="space-y-0.5">
            {/* Above ground */}
            {aboveGround.length > 0 && (
              <>
                <span className="text-[10px] text-gray-400 block mb-0.5">Above Ground</span>
                {aboveGround.map(({ floor, index }) => (
                  <button
                    key={floor.id}
                    onClick={() => handleFloorClick(index)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left group ${
                      index === activeFloorIndex
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xs font-mono w-6 text-center shrink-0">
                      {floor.shortLabel}
                    </span>
                    <span className="text-xs truncate flex-1">{floor.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 shrink-0" />
                  </button>
                ))}
              </>
            )}

            {/* Divider */}
            {aboveGround.length > 0 && belowGround.length > 0 && (
              <div className="border-t border-gray-200 my-1" />
            )}

            {/* Below ground */}
            {belowGround.length > 0 && (
              <>
                <span className="text-[10px] text-gray-400 block mb-0.5">Below Ground</span>
                {belowGround.map(({ floor, index }) => (
                  <button
                    key={floor.id}
                    onClick={() => handleFloorClick(index)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left group ${
                      index === activeFloorIndex
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xs font-mono w-6 text-center shrink-0">
                      {floor.shortLabel}
                    </span>
                    <span className="text-xs truncate flex-1">{floor.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 shrink-0" />
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* Add Below button */}
        <button
          onClick={addFloorBelow}
          className="w-full flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded py-1.5 mt-1"
        >
          <Plus className="w-3 h-3" /> Add Below
        </button>
      </div>
    </div>
  );
}
