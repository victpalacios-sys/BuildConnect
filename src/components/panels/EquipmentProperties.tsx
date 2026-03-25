import { useState } from 'react';
import type { Equipment, EquipmentType } from '@/types/building';

interface EquipmentPropertiesProps {
  equipment: Equipment;
  editing: boolean;
  onUpdate: (changes: Partial<Equipment>) => void;
  onDelete: () => void;
}

const EQUIPMENT_TYPES: { value: EquipmentType; label: string }[] = [
  { value: 'fiber-hub', label: 'Fiber Hub' },
  { value: 'switch', label: 'Switch' },
  { value: 'access-point', label: 'Access Point' },
  { value: 'router', label: 'Router' },
  { value: 'splice-enclosure', label: 'Splice Enclosure' },
  { value: 'patch-panel', label: 'Patch Panel' },
  { value: 'ont', label: 'ONT' },
  { value: 'cable-tray', label: 'Cable Tray' },
];

function equipmentLabel(type: EquipmentType): string {
  return EQUIPMENT_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function EquipmentProperties({ equipment, editing, onUpdate, onDelete }: EquipmentPropertiesProps) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const addProperty = () => {
    if (!newKey.trim()) return;
    onUpdate({ properties: { ...equipment.properties, [newKey.trim()]: newValue } });
    setNewKey('');
    setNewValue('');
  };

  const removeProperty = (key: string) => {
    const props = { ...equipment.properties };
    delete props[key];
    onUpdate({ properties: props });
  };

  if (editing) {
    return (
      <div className="space-y-3 text-sm">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select
            value={equipment.type}
            onChange={(e) => onUpdate({ type: e.target.value as EquipmentType })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {EQUIPMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Label</label>
          <input
            type="text"
            value={equipment.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Properties</label>
          <div className="space-y-1">
            {Object.entries(equipment.properties).map(([key, value]) => (
              <div key={key} className="flex items-center gap-1">
                <span className="text-xs text-gray-600 truncate w-20">{key}</span>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => onUpdate({ properties: { ...equipment.properties, [key]: e.target.value } })}
                  className="flex-1 border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button onClick={() => removeProperty(key)} className="text-xs text-red-400 hover:text-red-600 px-1">x</button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Key"
              className="w-20 border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Value"
              className="flex-1 border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button onClick={addProperty} className="text-xs text-blue-600 hover:text-blue-700 px-1">+</button>
          </div>
        </div>
        <div className="pt-2 border-t border-gray-200">
          <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700">
            Delete Equipment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Type</span>
        <span className="text-xs text-gray-900">{equipmentLabel(equipment.type)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Label</span>
        <span className="text-xs text-gray-900">{equipment.label}</span>
      </div>
      {Object.keys(equipment.properties).length > 0 && (
        <div>
          <span className="text-xs text-gray-500 block mb-1">Properties</span>
          {Object.entries(equipment.properties).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-xs text-gray-500">{key}</span>
              <span className="text-xs text-gray-900">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
