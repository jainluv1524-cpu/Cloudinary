import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout.tsx';
import { DashboardHome } from './routes/index.tsx';
import { ProjectsPage } from './routes/projects/index.tsx';
import { ProjectDetailPage } from './routes/projects/ProjectDetail.tsx';
import { SearchPage } from './routes/search.tsx';
import { MapPage } from './routes/map.tsx';
import { IntegrityPage } from './routes/integrity.tsx';
import { AdminPage } from './routes/admin.tsx';

export function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<DashboardHome />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="integrity" element={<IntegrityPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
    </Routes>
  );
}
