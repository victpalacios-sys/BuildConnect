import type { Floor } from '@/types/building';

interface FloorSelectorProps {
  floors: Floor[];
  groundFloorLevel: number;
  activeFloorIndex: number;
  onSelectFloor: (index: number) => void;
}

export function FloorSelector({ floors, groundFloorLevel, activeFloorIndex, onSelectFloor }: FloorSelectorProps) {
  if (floors.length === 0) return null;

  const aboveGround = floors
    .map((f, i) => ({ floor: f, index: i }))
    .filter(({ floor }) => floor.level >= groundFloorLevel)
    .sort((a, b) => b.floor.level - a.floor.level);

  const belowGround = floors
    .map((f, i) => ({ floor: f, index: i }))
    .filter(({ floor }) => floor.level < groundFloorLevel)
    .sort((a, b) => a.floor.level - b.floor.level);

  return (
    <div className="bg-white/90 backdrop-blur-sm border-r border-gray-200 flex flex-col py-2 px-1 gap-0.5 z-10 shrink-0 overflow-y-auto">
      {aboveGround.length > 0 && (
        <>
          <span className="text-[10px] text-gray-400 text-center px-1 mb-0.5">Above</span>
          {aboveGround.map(({ floor, index }) => (
            <button
              key={floor.id}
              onClick={() => onSelectFloor(index)}
              className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded text-xs font-medium transition-colors ${
                index === activeFloorIndex
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={floor.label}
            >
              {floor.shortLabel}
            </button>
          ))}
        </>
      )}

      {aboveGround.length > 0 && belowGround.length > 0 && (
        <div className="border-t border-gray-200 my-1" />
      )}

      {belowGround.length > 0 && (
        <>
          <span className="text-[10px] text-gray-400 text-center px-1 mb-0.5">Below</span>
          {belowGround.map(({ floor, index }) => (
            <button
              key={floor.id}
              onClick={() => onSelectFloor(index)}
              className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded text-xs font-medium transition-colors ${
                index === activeFloorIndex
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={floor.label}
            >
              {floor.shortLabel}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
