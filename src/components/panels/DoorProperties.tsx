import type { Door } from '@/types/building';

interface DoorPropertiesProps {
  door: Door;
  editing: boolean;
  onUpdate: (changes: Partial<Door>) => void;
  onDelete: () => void;
}

export function DoorProperties({ door, editing, onUpdate, onDelete }: DoorPropertiesProps) {
  if (editing) {
    return (
      <div className="space-y-3 text-sm">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Width (m)</label>
          <input
            type="number"
            step="0.1"
            min="0.3"
            max="3.0"
            value={door.width}
            onChange={(e) => onUpdate({ width: parseFloat(e.target.value) || 0.9 })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Position along wall</label>
          <p className="text-xs text-gray-700">{(door.position * 100).toFixed(0)}%</p>
        </div>
        <div className="pt-2 border-t border-gray-200">
          <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700">
            Delete Door
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Width</span>
        <span className="text-xs text-gray-900">{door.width} m</span>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Position</span>
        <span className="text-xs text-gray-900">{(door.position * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}
