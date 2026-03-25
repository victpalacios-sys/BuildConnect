import { useEffect, useRef } from 'react';
import type { Annotation } from '@/types/building';

interface AnnotationPropertiesProps {
  annotation: Annotation;
  editing: boolean;
  onUpdate: (changes: Partial<Annotation>) => void;
  onDelete: () => void;
}

export function AnnotationProperties({ annotation, editing, onUpdate, onDelete }: AnnotationPropertiesProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editing]);

  if (editing) {
    return (
      <div className="space-y-3 text-sm">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Text</label>
          <textarea
            ref={textareaRef}
            value={annotation.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            rows={3}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>
        <div>
          <span className="text-xs text-gray-500">Created: {new Date(annotation.timestamp).toLocaleString()}</span>
        </div>
        <div className="pt-2 border-t border-gray-200">
          <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700">
            Delete Annotation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <div>
        <span className="text-xs text-gray-500 block mb-1">Text</span>
        <p className="text-xs text-gray-900">{annotation.text}</p>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">Created</span>
        <span className="text-xs text-gray-900">{new Date(annotation.timestamp).toLocaleString()}</span>
      </div>
    </div>
  );
}
