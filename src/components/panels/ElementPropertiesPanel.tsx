import { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import type { Wall, Door, Window, Equipment, CableRoute, Annotation } from '@/types/building';
import { WallProperties } from './WallProperties';
import { DoorProperties } from './DoorProperties';
import { WindowProperties } from './WindowProperties';
import { EquipmentProperties } from './EquipmentProperties';
import { CableRouteProperties } from './CableRouteProperties';
import { AnnotationProperties } from './AnnotationProperties';

export type ElementType = 'wall' | 'door' | 'window' | 'equipment' | 'cable' | 'annotation';

export interface ElementPropertiesPanelProps {
  elementType: ElementType | null;
  elementData: Wall | Door | Window | Equipment | CableRoute | Annotation | null;
  onUpdate: (changes: Record<string, unknown>) => void;
  onDelete: () => void;
  onDeselect: () => void;
}

const TYPE_LABELS: Record<ElementType, string> = {
  wall: 'Wall',
  door: 'Door',
  window: 'Window',
  equipment: 'Equipment',
  cable: 'Cable Route',
  annotation: 'Annotation',
};

export function ElementPropertiesPanel({
  elementType,
  elementData,
  onUpdate,
  onDelete,
  onDeselect,
}: ElementPropertiesPanelProps) {
  const [editing, setEditing] = useState(false);

  if (!elementType || !elementData) {
    return (
      <div className="text-sm text-gray-400 text-center py-8">
        Select an element to see its properties
      </div>
    );
  }

  const handleSave = () => {
    setEditing(false);
  };

  const handleDelete = () => {
    onDelete();
    setEditing(false);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{TYPE_LABELS[elementType]}</h3>
        <div className="flex items-center gap-1">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 hover:bg-gray-100 rounded"
              title="Edit"
            >
              <Pencil className="w-4 h-4 text-gray-500" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700"
            >
              Done
            </button>
          )}
          <button
            onClick={onDeselect}
            className="p-1.5 hover:bg-gray-100 rounded"
            title="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Property editor */}
      {elementType === 'wall' && (
        <WallProperties
          wall={elementData as Wall}
          editing={editing}
          onUpdate={onUpdate}
          onDelete={handleDelete}
        />
      )}
      {elementType === 'door' && (
        <DoorProperties
          door={elementData as Door}
          editing={editing}
          onUpdate={onUpdate}
          onDelete={handleDelete}
        />
      )}
      {elementType === 'window' && (
        <WindowProperties
          window={elementData as Window}
          editing={editing}
          onUpdate={onUpdate}
          onDelete={handleDelete}
        />
      )}
      {elementType === 'equipment' && (
        <EquipmentProperties
          equipment={elementData as Equipment}
          editing={editing}
          onUpdate={onUpdate}
          onDelete={handleDelete}
        />
      )}
      {elementType === 'cable' && (
        <CableRouteProperties
          route={elementData as CableRoute}
          editing={editing}
          onUpdate={onUpdate}
          onDelete={handleDelete}
        />
      )}
      {elementType === 'annotation' && (
        <AnnotationProperties
          annotation={elementData as Annotation}
          editing={editing}
          onUpdate={onUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
