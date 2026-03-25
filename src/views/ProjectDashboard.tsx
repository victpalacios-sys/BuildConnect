import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Search } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { ProjectCard } from '@/components/ProjectCard';
import { NewProjectDialog } from '@/components/NewProjectDialog';
import { useProjectStore } from '@/store/projectStore';

export function ProjectDashboard() {
  const navigate = useNavigate();
  const { projects, loading, loadProjects, createProject, openProject } = useProjectStore();
  const [showNew, setShowNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.customer.toLowerCase().includes(q) ||
      p.contacts.some((c) => c.name.toLowerCase().includes(q)) ||
      p.buildings.some((b) => b.address.toLowerCase().includes(q))
    );
  }, [projects, searchQuery]);

  const handleCreate = async (name: string, customer: string) => {
    const project = await createProject(name, customer);
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
        {projects.length > 0 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, customers, contacts, addresses..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : filteredProjects.length === 0 && searchQuery ? (
          <div className="text-center py-12 text-gray-400">
            No projects match &quot;{searchQuery}&quot;
          </div>
        ) : filteredProjects.length === 0 ? (
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
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleOpen(project.id)}
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
