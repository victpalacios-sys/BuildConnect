import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { ArrowLeft, Menu, ChevronRight } from 'lucide-react';
import type { OSMBuilding } from '@/services/overpass';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import { useInputMode } from '@/hooks/useInputMode';
import { useFloorEditor } from '@/hooks/useFloorEditor';
import { useMapInteraction } from '@/hooks/useMapInteraction';
import type { SelectedElement } from '@/hooks/useMapInteraction';
import { SidePanel } from '@/components/layout/SidePanel';
import { FloorSelector } from '@/components/layout/FloorSelector';
import { ProjectInfoPanel } from '@/components/panels/ProjectInfoPanel';
import { AddBuildingPanel } from '@/components/panels/AddBuildingPanel';
import { BuildingPanel } from '@/components/panels/BuildingPanel';
import { ElementPropertiesPanel } from '@/components/panels/ElementPropertiesPanel';
import type { ElementType } from '@/components/panels/ElementPropertiesPanel';
import { MapContainer } from '@/components/map/MapContainer';
import { setSelectionHighlight, updateSectionCutData, updateFloorPlanData, hasFloorPlanLayers, addFloorPlanLayers } from '@/components/map/FloorPlanLayer';
import { CrossSectionPanel } from '@/components/panels/CrossSectionPanel';
import { Reticle } from '@/components/map/Reticle';
import { DrawingToolbar } from '@/components/toolbar/DrawingToolbar';
import type { Building, Wall, Door, Window, Equipment, CableRoute, Annotation } from '@/types/building';
import type { GeoPolygon } from '@/types/geometry';

export function UnifiedWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentProject, openProject, loading, activeBuildingId, setActiveBuilding, addBuilding } = useProjectStore();
  const { viewMode, setViewMode, activeFloorIndex, setActiveFloor, activeTool } = useEditorStore();
  const inputMode = useInputMode();
  const mapRef = useRef<MaplibreMap | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [activeSectionCutId, setActiveSectionCutId] = useState<string | null>(null);
  const [addingBuilding, setAddingBuilding] = useState(false);
  const [pendingFootprint, setPendingFootprint] = useState<GeoPolygon | null>(null);
  const [pendingLevels, setPendingLevels] = useState<number | null>(null);
  const [osmBuildings, setOsmBuildings] = useState<OSMBuilding[]>([]);

  useEffect(() => {
    if (projectId && currentProject?.id !== projectId) {
      openProject(projectId);
    }
  }, [projectId, currentProject?.id, openProject]);

  const activeBuilding = currentProject?.buildings.find((b) => b.id === activeBuildingId) ?? undefined;
  const activeFloor = activeBuilding?.floors[activeFloorIndex] ?? null;

  // Imperative floor plan map update — called after every floor edit
  const handleFloorChanged = useCallback((updatedFloor: import('@/types/building').Floor) => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const footprint = activeBuilding?.footprint ?? null;
    if (!footprint) return;
    if (!hasFloorPlanLayers(map)) {
      addFloorPlanLayers(map);
    }
    updateFloorPlanData(map, updatedFloor, footprint);
  }, [activeBuilding?.footprint]);

  const {
    building: _editorBuilding,
    addWall, addDoor, addWindow, addAnnotation, addEquipment, addCableRoute, addSectionCut,
    updateWall, updateDoor, updateWindow, updateEquipment, updateCableRoute, updateAnnotation,
    removeWall, removeDoor, removeWindow, removeEquipment, removeCableRoute, removeAnnotation,
    undo, redo, canUndo, canRedo,
  } = useFloorEditor({ onFloorChanged: handleFloorChanged });

  const handleElementSelected = useCallback((element: SelectedElement | null) => {
    setSelectedElement(element);
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      setSelectionHighlight(mapRef.current, element?.feature ?? null);
    }
  }, []);

  const {
    handleMapClick,
    handleFinishDrawing,
    handleReticlePlace,
    getReticleHint,
  } = useMapInteraction({
    mapRef,
    buildingFootprint: activeBuilding?.footprint ?? null,
    onWallCreated: addWall,
    onDoorPlaced: addDoor,
    onWindowPlaced: addWindow,
    onAnnotationPlaced: addAnnotation,
    onEquipmentPlaced: addEquipment,
    onCableRouteCreated: addCableRoute,
    onSectionCutCreated: addSectionCut,
    onElementSelected: handleElementSelected,
  });

  // Clear selection when switching floors or view modes
  useEffect(() => {
    setSelectedElement(null);
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      setSelectionHighlight(mapRef.current, null);
    }
  }, [activeFloorIndex, viewMode]);

  // Update section cut rendering on map when building section cuts change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (activeBuilding && viewMode === 'floor') {
      updateSectionCutData(map, activeBuilding.sectionCuts);
    }
  }, [activeBuilding?.sectionCuts, viewMode]);


  const showFloorSelector = activeBuilding && activeBuilding.floors.length > 0 && viewMode === 'floor';

  // Resolve selected element data from the floor
  const selectedElementType: ElementType | null = selectedElement?.type ?? null;
  const selectedElementData: Wall | Door | Window | Equipment | CableRoute | Annotation | null = (() => {
    if (!selectedElement || !activeFloor) return null;
    const { id, type } = selectedElement;
    switch (type) {
      case 'wall': return activeFloor.walls.find((w) => w.id === id) ?? null;
      case 'door': return activeFloor.doors.find((d) => d.id === id) ?? null;
      case 'window': return activeFloor.windows.find((w) => w.id === id) ?? null;
      case 'equipment': return activeFloor.equipment.find((e) => e.id === id) ?? null;
      case 'cable': return activeFloor.cableRoutes.find((r) => r.id === id) ?? null;
      case 'annotation': return activeFloor.annotations.find((a) => a.id === id) ?? null;
      default: return null;
    }
  })();

  const handleElementUpdate = useCallback((changes: Record<string, unknown>) => {
    if (!selectedElement) return;
    const { id, type } = selectedElement;
    switch (type) {
      case 'wall': updateWall(id, changes as Partial<Wall>); break;
      case 'door': updateDoor(id, changes as Partial<Door>); break;
      case 'window': updateWindow(id, changes as Partial<Window>); break;
      case 'equipment': updateEquipment(id, changes as Partial<Equipment>); break;
      case 'cable': updateCableRoute(id, changes as Partial<CableRoute>); break;
      case 'annotation': updateAnnotation(id, changes as Partial<Annotation>); break;
    }
  }, [selectedElement, updateWall, updateDoor, updateWindow, updateEquipment, updateCableRoute, updateAnnotation]);

  const handleElementDelete = useCallback(() => {
    if (!selectedElement) return;
    const { id, type } = selectedElement;
    switch (type) {
      case 'wall': removeWall(id); break;
      case 'door': removeDoor(id); break;
      case 'window': removeWindow(id); break;
      case 'equipment': removeEquipment(id); break;
      case 'cable': removeCableRoute(id); break;
      case 'annotation': removeAnnotation(id); break;
    }
    handleElementSelected(null);
  }, [selectedElement, removeWall, removeDoor, removeWindow, removeEquipment, removeCableRoute, removeAnnotation, handleElementSelected]);

  const handleDeselect = useCallback(() => {
    handleElementSelected(null);
  }, [handleElementSelected]);

  const isPlacementTool = !['select', 'pan', 'photo'].includes(activeTool);
  const showReticle = inputMode === 'touch' && viewMode === 'floor' && isPlacementTool;
  const showToolbar = viewMode === 'floor';

  const handleStartAddBuilding = useCallback(() => {
    setAddingBuilding(true);
    setPendingFootprint(null);
    setPendingLevels(null);
    setActiveBuilding(null);
    setPanelOpen(true);
  }, [setActiveBuilding]);

  const handleFootprintSelected = useCallback((polygon: GeoPolygon, levels: number | null) => {
    setPendingFootprint(polygon);
    setPendingLevels(levels);
  }, []);

  const handleAddBuildingSave = useCallback(async (building: Building) => {
    await addBuilding(building);
    setAddingBuilding(false);
    setPendingFootprint(null);
    setPendingLevels(null);
    setViewMode('building');
  }, [addBuilding, setViewMode]);

  const handleAddBuildingCancel = useCallback(() => {
    setAddingBuilding(false);
    setPendingFootprint(null);
    setPendingLevels(null);
  }, []);

  const handleFlyTo = useCallback((lat: number, lng: number) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 17 });
  }, []);

  const handleBuildingsLoaded = useCallback((buildings: OSMBuilding[]) => {
    setOsmBuildings(buildings);
  }, []);

  const handleExitFloorMode = useCallback(() => {
    if (activeBuildingId) {
      setViewMode('building');
    }
  }, [activeBuildingId, setViewMode]);

  // Back button handler: navigate up the hierarchy
  const handleBack = useCallback(() => {
    if (viewMode === 'floor') {
      setViewMode('building');
    } else if (viewMode === 'building') {
      setActiveBuilding(null);
      setViewMode('site');
    } else {
      navigate('/');
    }
  }, [viewMode, setViewMode, setActiveBuilding, navigate]);

  // Early returns AFTER all hooks
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading project...</div>;
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p>Project not found</p>
          <button onClick={() => navigate('/')} className="mt-2 text-blue-600 text-sm hover:underline">Back to projects</button>
        </div>
      </div>
    );
  }

  let panelTitle = 'Project';
  let panelContent = <ProjectInfoPanel onAddBuilding={handleStartAddBuilding} />;

  if (addingBuilding) {
    panelTitle = 'Add Building';
    panelContent = (
      <AddBuildingPanel
        onSave={handleAddBuildingSave}
        onCancel={handleAddBuildingCancel}
        selectedFootprint={pendingFootprint}
        selectedLevels={pendingLevels}
        onFlyTo={handleFlyTo}
        onAutoSelectFootprint={handleFootprintSelected}
        osmBuildings={osmBuildings}
      />
    );
  } else if (activeBuildingId && activeBuilding) {
    if (viewMode === 'floor') {
      panelTitle = selectedElementData ? 'Properties' : activeBuilding.name || 'Building';
      panelContent = (
        <>
          <ElementPropertiesPanel
            elementType={selectedElementType}
            elementData={selectedElementData}
            onUpdate={handleElementUpdate}
            onDelete={handleElementDelete}
            onDeselect={handleDeselect}
          />
          {activeBuilding.sectionCuts.length > 0 && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cross Section</h3>
              <CrossSectionPanel
                building={activeBuilding}
                activeSectionCutId={activeSectionCutId}
                onSelectSectionCut={setActiveSectionCutId}
              />
            </div>
          )}
        </>
      );
    } else {
      panelTitle = activeBuilding.name || 'Building';
      panelContent = (
        <BuildingPanel
          building={activeBuilding}
          onBack={() => { setActiveBuilding(null); setViewMode('site'); }}
        />
      );
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-1 min-w-0">
          <button onClick={handleBack} className="p-1.5 hover:bg-gray-100 rounded shrink-0" title="Go back">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <nav className="flex items-center gap-1 min-w-0 text-sm">
            {viewMode === 'site' && !activeBuildingId ? (
              <span className="font-semibold text-gray-900 truncate max-w-[200px]">{currentProject.name}</span>
            ) : (
              <button
                onClick={() => { setActiveBuilding(null); setViewMode('site'); }}
                className="text-blue-600 hover:underline truncate max-w-[120px]"
              >
                {currentProject.name}
              </button>
            )}
            {activeBuildingId && activeBuilding && (
              <>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                {viewMode === 'floor' ? (
                  <button
                    onClick={() => setViewMode('building')}
                    className="text-blue-600 hover:underline truncate max-w-[120px]"
                  >
                    {activeBuilding.name || 'Building'}
                  </button>
                ) : (
                  <span className="font-semibold text-gray-900 truncate max-w-[120px]">{activeBuilding.name || 'Building'}</span>
                )}
              </>
            )}
            {viewMode === 'floor' && activeFloor && (
              <>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="font-semibold text-gray-900 truncate max-w-[100px]">{activeFloor.label}</span>
              </>
            )}
          </nav>
        </div>
        <button
          onClick={() => setPanelOpen((prev) => !prev)}
          className="p-1.5 hover:bg-gray-100 rounded shrink-0"
          title="Toggle panel"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className={showFloorSelector ? '' : 'hidden'}>
          {activeBuilding && (
            <FloorSelector
              floors={activeBuilding.floors}
              groundFloorLevel={activeBuilding.groundFloorLevel}
              activeFloorIndex={activeFloorIndex}
              onSelectFloor={(index) => { setActiveFloor(index); setViewMode('floor'); }}
            />
          )}
        </div>

        <div className="flex-1 relative">
          <MapContainer
            mapTileOpacity={viewMode === 'floor' ? 0.1 : 1.0}
            allowFootprintSelection={addingBuilding}
            onBuildingFootprintSelected={addingBuilding ? handleFootprintSelected : undefined}
            onMapBuildingClicked={(buildingId) => {
              setActiveBuilding(buildingId);
              setViewMode('building');
            }}
            onMapClick={viewMode === 'floor' ? handleMapClick : undefined}
            onDoubleClick={viewMode === 'floor' ? handleFinishDrawing : undefined}
            onBuildingsLoaded={handleBuildingsLoaded}
            onExitFloorMode={handleExitFloorMode}
            activeFloor={viewMode === 'floor' ? activeFloor : null}
            activeBuildingFootprint={activeBuilding?.footprint ?? null}
            viewMode={viewMode}
            activeTool={activeTool}
            pendingFootprint={addingBuilding ? pendingFootprint : null}
            mapRef={mapRef}
          />
          <Reticle
            visible={showReticle}
            hint={getReticleHint()}
            onPlace={handleReticlePlace}
          />
          {showToolbar && (
            <DrawingToolbar
              onUndo={undo}
              onRedo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
            />
          )}
        </div>

        <SidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={panelTitle}>
          {panelContent}
        </SidePanel>
      </div>
    </div>
  );
}
