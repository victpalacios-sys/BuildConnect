import { Building2, MapPin, Clock } from 'lucide-react';
import type { Project } from '@/types/project';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onDelete: () => void;
}

export function ProjectCard({ project, onClick, onDelete }: ProjectCardProps) {
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    survey: 'bg-blue-100 text-blue-700',
    design: 'bg-purple-100 text-purple-700',
    review: 'bg-amber-100 text-amber-700',
    complete: 'bg-green-100 text-green-700',
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all active:scale-[0.98]"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-400" />
          <h3 className="font-medium text-gray-900">{project.name}</h3>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[project.status]}`}>
          {project.status}
        </span>
      </div>

      {project.address && (
        <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
          <MapPin className="w-3.5 h-3.5" />
          {project.address}
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(project.updatedAt).toLocaleDateString()}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-xs text-red-400 hover:text-red-600 px-2 py-1"
        >
          Delete
        </button>
      </div>
    </button>
  );
}
