import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { ArrowLeft, Menu } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import { useResponsive } from '@/hooks/useResponsive';
import { useInputMode } from '@/hooks/useInputMode';
import { useFloorEditor } from '@/hooks/useFloorEditor';
import { useMapInteraction } from '@/hooks/useMapInteraction';
import { SidePanel } from '@/components/layout/SidePanel';
import { FloorSelector } from '@/components/layout/FloorSelector';
import { ProjectInfoPanel } from '@/components/panels/ProjectInfoPanel';
import { BuildingPanel } from '@/components/panels/BuildingPanel';
import { ElementPropertiesPanel } from '@/components/panels/ElementPropertiesPanel';
import { MapContainer } from '@/components/map/MapContainer';
import { Reticle } from '@/components/map/Reticle';
import { DrawingToolbar } from '@/components/toolbar/DrawingToolbar';

export function UnifiedWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const breakpoint = useResponsive();
  const { currentProject, openProject, loading, activeBuildingId, setActiveBuilding } = useProjectStore();
  const { viewMode, setViewMode, activeFloorIndex, setActiveFloor, activeTool } = useEditorStore();
  const inputMode = useInputMode();
  const mapRef = useRef<MaplibreMap | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    if (projectId && currentProject?.id !== projectId) {
      openProject(projectId);
    }
  }, [projectId, currentProject?.id, openProject]);

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

  const activeBuilding = currentProject.buildings.find((b) => b.id === activeBuildingId);
  const activeFloor = activeBuilding?.floors[activeFloorIndex] ?? null;
  const showFloorSelector = activeBuilding && activeBuilding.floors.length > 0 && viewMode === 'floor';

  const { addWall, addDoor, addWindow, addAnnotation, addEquipment, addCableRoute, undo, redo, canUndo, canRedo } = useFloorEditor();

  const {
    handleMapClick,
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
  });

  const isPlacementTool = !['select', 'pan', 'photo', 'section-cut'].includes(activeTool);
  const showReticle = inputMode === 'touch' && viewMode === 'floor' && isPlacementTool;
  const showToolbar = viewMode === 'floor';

  let panelTitle = 'Project';
  let panelContent = <ProjectInfoPanel />;

  if (activeBuildingId && activeBuilding) {
    if (viewMode === 'floor') {
      panelTitle = activeBuilding.name || 'Building';
      panelContent = <ElementPropertiesPanel />;
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
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="p-1.5 hover:bg-gray-100 rounded" title="Back to projects">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">
            {currentProject.name}
          </h1>
        </div>
        <button onClick={() => setPanelOpen(!panelOpen)} className="p-1.5 hover:bg-gray-100 rounded" title="Toggle panel">
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {showFloorSelector && (
          <FloorSelector
            floors={activeBuilding.floors}
            groundFloorLevel={activeBuilding.groundFloorLevel}
            activeFloorIndex={activeFloorIndex}
            onSelectFloor={(index) => { setActiveFloor(index); setViewMode('floor'); }}
          />
        )}

        <div className="flex-1 relative">
          <MapContainer
            mapTileOpacity={viewMode === 'floor' ? 0.1 : 1.0}
            allowFootprintSelection={false}
            onMapBuildingClicked={(buildingId) => {
              setActiveBuilding(buildingId);
              setViewMode('building');
            }}
            onMapClick={viewMode === 'floor' ? handleMapClick : undefined}
            activeFloor={viewMode === 'floor' ? activeFloor : null}
            activeBuildingFootprint={activeBuilding?.footprint ?? null}
            viewMode={viewMode}
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

        {breakpoint === 'desktop' ? (
          <SidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={panelTitle}>
            {panelContent}
          </SidePanel>
        ) : (
          <SidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={panelTitle}>
            {panelContent}
          </SidePanel>
        )}
      </div>
    </div>
  );
}
