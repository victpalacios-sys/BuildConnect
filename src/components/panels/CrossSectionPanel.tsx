import { useMemo } from 'react';
import type { Building } from '@/types/building';
import type { Point2D, GeoPolygon } from '@/types/geometry';
import { CrossSectionCanvas } from '@/components/cross-section/CrossSectionCanvas';
import { computeCrossSection } from '@/components/cross-section/crossSectionMath';

interface CrossSectionPanelProps {
  building: Building;
  activeSectionCutId: string | null;
  onSelectSectionCut: (id: string) => void;
}

function geoToLocal(lat: number, lng: number, polygon: GeoPolygon): Point2D {
  const coords = polygon.coordinates[0];
  const centLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const centLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos((centLat * Math.PI) / 180);
  return {
    x: (lng - centLng) * metersPerDegreeLng,
    y: (lat - centLat) * metersPerDegreeLat,
  };
}

export function CrossSectionPanel({ building, activeSectionCutId, onSelectSectionCut }: CrossSectionPanelProps) {
  const activeCut = building.sectionCuts.find((c) => c.id === activeSectionCutId);

  const sections = useMemo(() => {
    if (!activeCut || !building.footprint) return [];
    const start = geoToLocal(activeCut.start.lat, activeCut.start.lng, building.footprint);
    const end = geoToLocal(activeCut.end.lat, activeCut.end.lng, building.footprint);
    return computeCrossSection(building.floors, start, end);
  }, [activeCut, building.floors, building.footprint]);

  if (building.sectionCuts.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-8">
        Use the Section Cut tool to draw a cut line on the floor plan.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto">
        {building.sectionCuts.map((cut) => (
          <button
            key={cut.id}
            onClick={() => onSelectSectionCut(cut.id)}
            className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${
              cut.id === activeSectionCutId ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cut.label}
          </button>
        ))}
      </div>

      {activeCut && (
        <CrossSectionCanvas
          sections={sections}
          groundFloorLevel={building.groundFloorLevel}
        />
      )}
    </div>
  );
}
