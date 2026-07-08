import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { RoutesPage } from './pages/routes/RoutesPage';
import { RoutesCreatePage } from './pages/routes/RoutesCreatePage';
import { AssignmentsPage } from './pages/assignments/AssignmentsPage';
import { AssignmentsCreatePage } from './pages/assignments/AssignmentsCreatePage';
import { LiveMapPage } from './pages/live-map/LiveMapPage';
import { HistorialRecorridosPage } from './pages/historial/HistorialRecorridosPage';

type Module = 'gestion-rutas' | 'asignacion-rutas' | 'mapa-vivo' | 'historial-recorridos';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active module based on path
  let activeModule: Module = 'gestion-rutas';
  if (location.pathname.startsWith('/asignaciones')) activeModule = 'asignacion-rutas';
  if (location.pathname.startsWith('/mapa-vivo')) activeModule = 'mapa-vivo';
  if (location.pathname.startsWith('/historial')) activeModule = 'historial-recorridos';

  const handleNavigate = (module: Module) => {
    if (module === 'gestion-rutas') {
      navigate('/rutas');
    } else if (module === 'asignacion-rutas') {
      navigate('/asignaciones');
    } else if (module === 'mapa-vivo') {
      navigate('/mapa-vivo');
    } else {
      navigate('/historial');
    }
  };

  return (
    <MainLayout activeModule={activeModule} onNavigate={handleNavigate}>
      <Routes>
        <Route path="/rutas" element={<RoutesPage />} />
        <Route path="/rutas/nueva" element={<RoutesCreatePage />} />
        <Route path="/asignaciones" element={<AssignmentsPage />} />
        <Route path="/asignaciones/nueva" element={<AssignmentsCreatePage />} />
        <Route path="/mapa-vivo" element={<LiveMapPage />} />
        <Route path="/historial" element={<HistorialRecorridosPage />} />
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
