import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { ProjectCard } from '@/components/ProjectCard';
import { NewProjectDialog } from '@/components/NewProjectDialog';
import { useProjectStore } from '@/store/projectStore';

export function ProjectDashboard() {
  const navigate = useNavigate();
  const { projects, loading, loadProjects, createProject, deleteProject, openProject } = useProjectStore();
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreate = async (name: string, address: string, customer: string) => {
    const project = await createProject(name, address, customer);
    await openProject(project.id);
    navigate(`/project/${project.id}`);
  };

  const handleOpen = async (id: string) => {
    await openProject(id);
    navigate(`/project/${id}`);
  };

  return (
    <AppShell
      actions={
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      }
    >
      <div className="p-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No projects yet</p>
            <button
              onClick={() => setShowNew(true)}
              className="mt-4 text-blue-600 text-sm hover:underline"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleOpen(project.id)}
                onDelete={() => deleteProject(project.id)}
              />
            ))}
          </div>
        )}
      </div>

      <NewProjectDialog
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreate={handleCreate}
      />
    </AppShell>
  );
}
