import type { CableRoute, CableType } from '@/types/building';

interface CableRoutePropertiesProps {
  route: CableRoute;
  editing: boolean;
  onUpdate: (changes: Partial<CableRoute>) => void;
  onDelete: () => void;
}

const CABLE_TYPES: { value: CableType; label: string }[] = [
  { value: 'fiber', label: 'Fiber' },
  { value: 'cat6', label: 'Cat6' },
  { value: 'cat6a', label: 'Cat6a' },
  { value: 'coaxial', label: 'Coaxial' },
];

function cableTypeLabel(type: CableType): string {
  return CABLE_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function CableRouteProperties({ route, editing, onUpdate, onDelete }: CableRoutePropertiesProps) {
  if (editing) {
    return (
      <div className="space-y-3 text-sm">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Cable Type</label>
          <select
            value={route.cableType}
            onChange={(e) => onUpdate({ cableType: e.target.value as CableType })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {CABLE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Label</label>
          <input
            type="text"
            value={route.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <span className="text-xs text-gray-500">Points: {route.points.length}</span>
        </div>
        <div className="pt-2 border-t border-gray-200">
          <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700">
            Delete Cable Route
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Cable Type</span>
        <span className="text-xs text-gray-900">{cableTypeLabel(route.cableType)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Label</span>
        <span className="text-xs text-gray-900">{route.label || '(none)'}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Points</span>
        <span className="text-xs text-gray-900">{route.points.length}</span>
      </div>
    </div>
  );
}
