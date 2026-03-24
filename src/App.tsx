import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProjectDashboard } from '@/views/ProjectDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
