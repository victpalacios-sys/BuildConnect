import { useState } from 'react';
import {
  MousePointer2, Move, Minus, DoorOpen, SquareDashedBottom,
  Box, Cable, MessageSquare, Camera, Scissors,
  Grid3x3, Magnet, Undo2, Redo2, Plus,
} from 'lucide-react';
import { useEditorStore, type EditorTool } from '@/store/editorStore';
import { useResponsive } from '@/hooks/useResponsive';

const tools: { tool: EditorTool; icon: typeof MousePointer2; label: string }[] = [
  { tool: 'select', icon: MousePointer2, label: 'Select' },
  { tool: 'pan', icon: Move, label: 'Pan' },
  { tool: 'wall', icon: Minus, label: 'Wall' },
  { tool: 'door', icon: DoorOpen, label: 'Door' },
  { tool: 'window', icon: SquareDashedBottom, label: 'Window' },
  { tool: 'equipment', icon: Box, label: 'Equip' },
  { tool: 'cable', icon: Cable, label: 'Cable' },
  { tool: 'annotate', icon: MessageSquare, label: 'Note' },
  { tool: 'photo', icon: Camera, label: 'Photo' },
  { tool: 'section-cut', icon: Scissors, label: 'Section' },
];

interface DrawingToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function DrawingToolbar({ onUndo, onRedo, canUndo, canRedo }: DrawingToolbarProps) {
  const { activeTool, setTool, showGrid, snapEnabled, toggleGrid, toggleSnap } = useEditorStore();
  const breakpoint = useResponsive();
  const [showSheet, setShowSheet] = useState(false);

  const toolButtons = tools.map(({ tool, icon: Icon, label }) => (
    <button
      key={tool}
      onClick={() => { setTool(tool); setShowSheet(false); }}
      className={`flex flex-col items-center px-2 py-1.5 rounded text-xs min-w-[44px] min-h-[44px] justify-center ${
        activeTool === tool ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
      }`}
      title={label}
    >
      <Icon className="w-5 h-5" />
      <span className="mt-0.5 text-[10px]">{label}</span>
    </button>
  ));

  // Mobile: FAB + bottom sheet
  if (breakpoint === 'mobile') {
    return (
      <>
        {/* FAB */}
        <button
          onClick={() => setShowSheet(!showSheet)}
          className="absolute bottom-4 right-4 z-30 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Tool sheet */}
        {showSheet && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setShowSheet(false)} />
            <div className="absolute bottom-20 left-2 right-2 z-30 bg-white rounded-2xl shadow-lg p-3">
              <div className="grid grid-cols-5 gap-1">
                {toolButtons}
              </div>
              <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t">
                <button onClick={toggleGrid} className={`p-2 rounded ${showGrid ? 'bg-blue-100 text-blue-700' : 'text-gray-400'}`}>
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button onClick={toggleSnap} className={`p-2 rounded ${snapEnabled ? 'bg-blue-100 text-blue-700' : 'text-gray-400'}`}>
                  <Magnet className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-gray-200" />
                <button onClick={onUndo} disabled={!canUndo} className="p-2 rounded text-gray-500 disabled:opacity-30">
                  <Undo2 className="w-4 h-4" />
                </button>
                <button onClick={onRedo} disabled={!canRedo} className="p-2 rounded text-gray-500 disabled:opacity-30">
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // Desktop/tablet: horizontal toolbar at bottom
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-2 py-1.5 flex items-center justify-between z-10">
      <div className="flex items-center gap-0.5 overflow-x-auto">
        {toolButtons}
      </div>
      <div className="flex items-center gap-1 ml-2">
        <button onClick={toggleGrid} className={`p-2 rounded ${showGrid ? 'bg-blue-100 text-blue-700' : 'text-gray-400'}`} title="Grid">
          <Grid3x3 className="w-4 h-4" />
        </button>
        <button onClick={toggleSnap} className={`p-2 rounded ${snapEnabled ? 'bg-blue-100 text-blue-700' : 'text-gray-400'}`} title="Snap">
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
