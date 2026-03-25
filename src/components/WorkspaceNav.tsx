import { Map, Grid3x3, PenTool, ArrowLeft, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface WorkspaceNavProps {
  projectId: string;
  projectName?: string;
  onEditProject?: () => void;
}

export function WorkspaceNav({ projectId, projectName, onEditProject }: WorkspaceNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const base = `/project/${projectId}`;

  const tabs = [
    { path: `${base}/map`, label: 'Map', icon: Map },
    { path: `${base}/setup`, label: 'Building', icon: Grid3x3 },
    { path: `${base}/floor`, label: 'Floor Plan', icon: PenTool },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 flex items-center px-2 shrink-0">
      <button
        onClick={() => navigate('/')}
        className="p-2 hover:bg-gray-100 rounded mr-2"
        title="Back to projects"
      >
        <ArrowLeft className="w-5 h-5 text-gray-600" />
      </button>
      {projectName && (
        <span className="text-sm font-medium text-gray-700 mr-3 hidden md:inline truncate max-w-48">
          {projectName}
        </span>
      )}
      <div className="flex gap-1 flex-1">
        {tabs.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-t transition-colors ${
                active
                  ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>
      {onEditProject && (
        <button
          onClick={onEditProject}
          className="p-2 hover:bg-gray-100 rounded ml-2"
          title="Edit project details"
        >
          <Settings className="w-4 h-4 text-gray-500" />
        </button>
      )}
    </nav>
  );
}
