import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProjectDashboard } from '@/views/ProjectDashboard';
import { UnifiedWorkspace } from '@/views/UnifiedWorkspace';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectDashboard />} />
        <Route path="/project/:projectId" element={<UnifiedWorkspace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
