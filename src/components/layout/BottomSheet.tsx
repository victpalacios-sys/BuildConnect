import { useRef, useState, useCallback, type ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  modal?: boolean;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, modal = false, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<'collapsed' | 'half' | 'full'>('half');
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    dragStartHeight.current = sheetRef.current?.getBoundingClientRect().height ?? 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handleDrag = useCallback((e: React.PointerEvent) => {
    if (!dragStartY.current) return;
    const deltaY = dragStartY.current - e.clientY;
    const newHeight = dragStartHeight.current + deltaY;
    const vh = window.innerHeight;

    if (newHeight < vh * 0.15) {
      setHeight('collapsed');
      onClose();
    } else if (newHeight < vh * 0.5) {
      setHeight('half');
    } else {
      setHeight('full');
    }
  }, [onClose]);

  const handleDragEnd = useCallback(() => {
    dragStartY.current = 0;
  }, []);

  if (!open) return null;

  const heightClass = height === 'full' ? 'h-[85vh]' : height === 'half' ? 'h-[33vh]' : 'h-[10vh]';

  return (
    <>
      {modal && (
        <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      )}
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-lg transition-all duration-200 ${heightClass}`}
      >
        <div
          className="flex justify-center py-2 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handleDragStart}
          onPointerMove={handleDrag}
          onPointerUp={handleDragEnd}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="overflow-auto h-[calc(100%-20px)] px-4 pb-4">
          {children}
        </div>
      </div>
    </>
  );
}
