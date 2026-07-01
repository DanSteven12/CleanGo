import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { RoutesPage } from './pages/routes/RoutesPage';
import { RoutesCreatePage } from './pages/routes/RoutesCreatePage';
import { AssignmentsPage } from './pages/assignments/AssignmentsPage';
import { AssignmentsCreatePage } from './pages/assignments/AssignmentsCreatePage';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active module based on path
  const activeModule = location.pathname.startsWith('/asignaciones') ? 'asignacion-rutas' : 'gestion-rutas';

  const handleNavigate = (module: 'gestion-rutas' | 'asignacion-rutas') => {
    if (module === 'gestion-rutas') {
      navigate('/rutas');
    } else {
      navigate('/asignaciones');
    }
  };

  return (
    <MainLayout activeModule={activeModule} onNavigate={handleNavigate}>
      <Routes>
        <Route path="/rutas" element={<RoutesPage />} />
        <Route path="/rutas/nueva" element={<RoutesCreatePage />} />
        <Route path="/asignaciones" element={<AssignmentsPage />} />
        <Route path="/asignaciones/nueva" element={<AssignmentsCreatePage />} />
        <Route path="*" element={<Navigate to="/rutas" replace />} />
      </Routes>
    </MainLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;

