import type { Wall } from '@/types/building';

interface WallPropertiesProps {
  wall: Wall;
  editing: boolean;
  onUpdate: (changes: Partial<Wall>) => void;
  onDelete: () => void;
}

function wallLength(wall: Wall): string {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  return Math.hypot(dx, dy).toFixed(2);
}

export function WallProperties({ wall, editing, onUpdate, onDelete }: WallPropertiesProps) {
  if (editing) {
    return (
      <div className="space-y-3 text-sm">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Length</label>
          <p className="text-sm text-gray-700">{wallLength(wall)} m (calculated)</p>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Thickness</label>
          <div className="flex gap-2">
            <button
              onClick={() => onUpdate({ thickness: 0.15 })}
              className={`flex-1 text-xs py-1.5 rounded border ${
                wall.thickness === 0.15
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              0.15 m (interior)
            </button>
            <button
              onClick={() => onUpdate({ thickness: 0.3 })}
              className={`flex-1 text-xs py-1.5 rounded border ${
                wall.thickness === 0.3
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              0.3 m (exterior)
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <div className="flex gap-2">
            <button
              onClick={() => onUpdate({ isExterior: false })}
              className={`flex-1 text-xs py-1.5 rounded border ${
                !wall.isExterior
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              Interior
            </button>
            <button
              onClick={() => onUpdate({ isExterior: true })}
              className={`flex-1 text-xs py-1.5 rounded border ${
                wall.isExterior
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              Exterior
            </button>
          </div>
        </div>
        <div className="pt-2 border-t border-gray-200">
          <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700">
            Delete Wall
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Length</span>
        <span className="text-xs text-gray-900">{wallLength(wall)} m</span>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Thickness</span>
        <span className="text-xs text-gray-900">{wall.thickness} m</span>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Type</span>
        <span className="text-xs text-gray-900">{wall.isExterior ? 'Exterior' : 'Interior'}</span>
      </div>
    </div>
  );
}
