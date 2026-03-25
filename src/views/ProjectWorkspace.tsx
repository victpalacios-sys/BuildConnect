import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { WorkspaceNav } from '@/components/WorkspaceNav';
import { EditProjectDialog } from '@/components/EditProjectDialog';
import { useProjectStore } from '@/store/projectStore';
import { MapView } from '@/views/MapView';
import { BuildingSetup } from '@/views/BuildingSetup';
import { FloorPlanEditor } from '@/views/FloorPlanEditor';
import { BIMViewer } from '@/views/BIMViewer';

export function ProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, openProject, updateCurrentProject, loading } = useProjectStore();
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    if (projectId && currentProject?.id !== projectId) {
      openProject(projectId);
    }
  }, [projectId, currentProject?.id, openProject]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading project...</div>;
  }

  if (!currentProject) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <WorkspaceNav
        projectId={currentProject.id}
        projectName={currentProject.name}
        onEditProject={() => setShowEdit(true)}
      />
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="map" element={<MapView />} />
          <Route path="setup" element={<BuildingSetup />} />
          <Route path="floor" element={<FloorPlanEditor />} />
          <Route path="3d" element={<BIMViewer />} />
          <Route path="*" element={<Navigate to="map" replace />} />
        </Routes>
      </div>

      <EditProjectDialog
        project={showEdit ? currentProject : null}
        onClose={() => setShowEdit(false)}
        onSave={async (changes) => {
          const addressChanged = changes.address !== currentProject.address;
          await updateCurrentProject({
            ...changes,
            // Reset center if address changed so map re-geocodes
            ...(addressChanged ? { center: null } : {}),
          });
        }}
      />
    </div>
  );
}
