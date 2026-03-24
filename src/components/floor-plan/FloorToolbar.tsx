import { useEditorStore, type EditorTool } from '@/store/editorStore';
import {
  MousePointer2, Minus, DoorOpen, SquareSplitHorizontal,
  MessageSquare, Camera, Cable, Box, Move, Undo2, Redo2, Grid3x3, Magnet,
} from 'lucide-react';

const tools: { tool: EditorTool; icon: typeof MousePointer2; label: string }[] = [
  { tool: 'select', icon: MousePointer2, label: 'Select' },
  { tool: 'pan', icon: Move, label: 'Pan' },
  { tool: 'wall', icon: Minus, label: 'Wall' },
  { tool: 'door', icon: DoorOpen, label: 'Door' },
  { tool: 'window', icon: SquareSplitHorizontal, label: 'Window' },
  { tool: 'equipment', icon: Box, label: 'Equipment' },
  { tool: 'cable', icon: Cable, label: 'Cable' },
  { tool: 'annotate', icon: MessageSquare, label: 'Note' },
  { tool: 'photo', icon: Camera, label: 'Photo' },
];

interface FloorToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function FloorToolbar({ onUndo, onRedo, canUndo, canRedo }: FloorToolbarProps) {
  const { activeTool, setTool, showGrid, snapEnabled, toggleGrid, toggleSnap } = useEditorStore();

  return (
    <div className="bg-white border-t border-gray-200 px-2 py-1.5 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-0.5 overflow-x-auto">
        {tools.map(({ tool, icon: Icon, label }) => (
          <button
            key={tool}
            onClick={() => setTool(tool)}
            className={`flex flex-col items-center px-2 py-1.5 rounded text-xs min-w-[48px] min-h-[48px] justify-center ${
              activeTool === tool
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            title={label}
          >
            <Icon className="w-5 h-5" />
            <span className="mt-0.5 hidden sm:block">{label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 ml-2">
        <button
          onClick={toggleGrid}
          className={`p-2 rounded ${showGrid ? 'bg-blue-100 text-blue-700' : 'text-gray-400'}`}
          title="Toggle Grid"
        >
          <Grid3x3 className="w-4 h-4" />
        </button>
        <button
          onClick={toggleSnap}
          className={`p-2 rounded ${snapEnabled ? 'bg-blue-100 text-blue-700' : 'text-gray-400'}`}
          title="Toggle Snap"
        >
          <Magnet className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <button onClick={onUndo} disabled={!canUndo} className="p-2 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Undo">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={onRedo} disabled={!canRedo} className="p-2 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Redo">
          <Redo2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
