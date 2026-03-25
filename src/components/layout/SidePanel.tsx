import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { BottomSheet } from './BottomSheet';

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function SidePanel({ open, onClose, title, children }: SidePanelProps) {
  const breakpoint = useResponsive();

  // Mobile: modal bottom sheet
  if (breakpoint === 'mobile') {
    return (
      <BottomSheet open={open} onClose={onClose} modal>
        {title && (
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {children}
      </BottomSheet>
    );
  }

  // Tablet: non-modal bottom sheet
  if (breakpoint === 'tablet') {
    return (
      <BottomSheet open={open} onClose={onClose}>
        {title && (
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {children}
      </BottomSheet>
    );
  }

  // Desktop: right side panel
  if (!open) return null;

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col shrink-0 overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-auto p-4">
        {children}
      </div>
    </div>
  );
}
