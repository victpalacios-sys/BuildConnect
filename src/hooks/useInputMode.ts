import { useState, useEffect } from 'react';

export type InputMode = 'mouse' | 'touch';

export function useInputMode(): InputMode {
  const [mode, setMode] = useState<InputMode>('mouse');

  useEffect(() => {
    const handlePointer = (e: PointerEvent) => {
      setMode(e.pointerType === 'touch' ? 'touch' : 'mouse');
    };
    window.addEventListener('pointerdown', handlePointer, { passive: true });
    return () => window.removeEventListener('pointerdown', handlePointer);
  }, []);

  return mode;
}
