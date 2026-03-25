import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Search, Check, Building2, AlertCircle } from 'lucide-react';
import { geocodeAddress } from '@/services/geocode';
import { findNearestBuilding } from '@/services/overpass';
import type { OSMBuilding } from '@/services/overpass';
import { geoPolygonToLocal, generateFloors } from '@/services/building-generator';
import type { Building } from '@/types/building';
import type { GeoPolygon } from '@/types/geometry';

/** Create a default rectangular footprint (~20m x 15m) centered on a geo point */
function createDefaultFootprint(lat: number, lng: number): GeoPolygon {
  const mPerDegreeLat = 111320;
  const mPerDegreeLng = 111320 * Math.cos((lat * Math.PI) / 180);
  const halfW = 10 / mPerDegreeLng; // 10m half-width
  const halfH = 7.5 / mPerDegreeLat; // 7.5m half-height
  return {
    type: 'Polygon',
    coordinates: [[
      [lng - halfW, lat - halfH],
      [lng + halfW, lat - halfH],
      [lng + halfW, lat + halfH],
      [lng - halfW, lat + halfH],
      [lng - halfW, lat - halfH],
    ]],
  };
}

interface AddBuildingPanelProps {
  onSave: (building: Building) => void;
  onCancel: () => void;
  selectedFootprint: GeoPolygon | null;
  selectedLevels: number | null;
  onFlyTo: (lat: number, lng: number) => void;
  onAutoSelectFootprint?: (polygon: GeoPolygon, levels: number | null) => void;
  osmBuildings?: OSMBuilding[];
}

export function AddBuildingPanel({ onSave, onCancel, selectedFootprint, selectedLevels, onFlyTo, onAutoSelectFootprint, osmBuildings }: AddBuildingPanelProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [floorCount, setFloorCount] = useState(3);
  const [floorHeight, setFloorHeight] = useState(3.0);
  const [geocoding, setGeocoding] = useState(false);
  const [autoSelectFailed, setAutoSelectFailed] = useState(false);

  // Use OSM levels if available
  const effectiveFloorCount = selectedLevels ?? floorCount;

  const handleGeocode = useCallback(async () => {
    if (!address.trim()) return;
    setGeocoding(true);
    setAutoSelectFailed(false);
    try {
      const result = await geocodeAddress(address);
      if (result) {
        onFlyTo(result.lat, result.lng);

        // Auto-select nearest building footprint from already-loaded OSM data
        if (onAutoSelectFootprint) {
          let found = false;
          if (osmBuildings && osmBuildings.length > 0) {
            const nearest = findNearestBuilding(osmBuildings, result.lat, result.lng);
            if (nearest) {
              onAutoSelectFootprint(nearest.polygon, nearest.levels);
              found = true;
            }
          }
          if (!found) {
            // Overpass failed or no nearby building found — use default rectangle
            onAutoSelectFootprint(createDefaultFootprint(result.lat, result.lng), null);
            setAutoSelectFailed(true);
          }
        }
      }
    } catch (err) {
      console.error('Geocoding failed:', err);
    } finally {
      setGeocoding(false);
    }
  }, [address, onFlyTo, onAutoSelectFootprint, osmBuildings]);

  const handleSave = useCallback(() => {
    const footprintLocal = selectedFootprint ? geoPolygonToLocal(selectedFootprint) : [];

    const building: Building = {
      id: uuidv4(),
      name: name.trim() || 'Building',
      address: address.trim(),
      footprint: selectedFootprint,
      footprintLocal,
      groundFloorLevel: 0,
      defaultFloorHeight: floorHeight,
      floors: [],
      sectionCuts: [],
    };

    // Generate floors
    building.floors = generateFloors(building, effectiveFloorCount);

    onSave(building);
  }, [name, address, selectedFootprint, floorHeight, effectiveFloorCount, onSave]);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
        <Building2 className="w-5 h-5" />
        Add Building
      </h3>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Building Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Main Building, Tower A"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
        <div className="flex gap-2">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Type address to search"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && handleGeocode()}
          />
          <button
            onClick={handleGeocode}
            disabled={geocoding || !address.trim()}
            className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className={`p-3 rounded-lg text-sm ${selectedFootprint ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
        {selectedFootprint ? (
          <span className="flex items-center gap-1"><Check className="w-4 h-4" /> Footprint selected from map</span>
        ) : (
          'Tap a building on the map to select its footprint'
        )}
      </div>

      {autoSelectFailed && !selectedFootprint && (
        <div className="p-3 rounded-lg text-sm bg-amber-50 text-amber-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Could not auto-detect building. Tap a building on the map to select it.</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Number of Floors</label>
        <input
          type="number"
          min={1}
          max={100}
          value={effectiveFloorCount}
          onChange={(e) => setFloorCount(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Floor Height (meters)</label>
        <input
          type="number"
          min={2}
          max={10}
          step={0.1}
          value={floorHeight}
          onChange={(e) => setFloorHeight(Math.max(2, parseFloat(e.target.value) || 3))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Add Building
        </button>
        <button
          onClick={onCancel}
          className="flex-1 border border-gray-300 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
