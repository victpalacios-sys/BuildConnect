interface ReticleProps {
  visible: boolean;
  hint?: string;
  onPlace: () => void;
}

export function Reticle({ visible, hint, onPlace }: ReticleProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
      {/* Crosshair */}
      <div className="relative">
        {/* Horizontal line */}
        <div className="absolute w-12 h-[1.5px] bg-blue-500/70 -translate-x-1/2 -translate-y-1/2" />
        {/* Vertical line */}
        <div className="absolute w-[1.5px] h-12 bg-blue-500/70 -translate-x-1/2 -translate-y-1/2" />
        {/* Center tap target */}
        <button
          onClick={onPlace}
          className="absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-500 bg-blue-500/10 pointer-events-auto active:bg-blue-500/30 transition-colors"
          aria-label="Place element"
        />
      </div>
      {/* Hint text */}
      {hint && (
        <div className="absolute top-1/2 mt-10 bg-black/60 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
          {hint}
        </div>
      )}
    </div>
  );
}
