import type { Window } from '@/types/building';

interface WindowPropertiesProps {
  window: Window;
  editing: boolean;
  onUpdate: (changes: Partial<Window>) => void;
  onDelete: () => void;
}

export function WindowProperties({ window: win, editing, onUpdate, onDelete }: WindowPropertiesProps) {
  if (editing) {
    return (
      <div className="space-y-3 text-sm">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Width (m)</label>
          <input
            type="number"
            step="0.1"
            min="0.3"
            max="5.0"
            value={win.width}
            onChange={(e) => onUpdate({ width: parseFloat(e.target.value) || 1.2 })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Height (m)</label>
          <input
            type="number"
            step="0.1"
            min="0.3"
            max="3.0"
            value={win.height}
            onChange={(e) => onUpdate({ height: parseFloat(e.target.value) || 1.2 })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Sill Height (m)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="2.0"
            value={win.sillHeight}
            onChange={(e) => onUpdate({ sillHeight: parseFloat(e.target.value) || 0.9 })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="pt-2 border-t border-gray-200">
          <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700">
            Delete Window
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Width</span>
        <span className="text-xs text-gray-900">{win.width} m</span>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Height</span>
        <span className="text-xs text-gray-900">{win.height} m</span>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Sill Height</span>
        <span className="text-xs text-gray-900">{win.sillHeight} m</span>
      </div>
    </div>
  );
}
