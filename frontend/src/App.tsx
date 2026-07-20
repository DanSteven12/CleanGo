import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { MainLayout } from './layouts/MainLayout';
import { RoutesPage } from './pages/routes/RoutesPage';
import { RoutesCreatePage } from './pages/routes/RoutesCreatePage';
import { AssignmentsPage } from './pages/assignments/AssignmentsPage';
import { AssignmentsCreatePage } from './pages/assignments/AssignmentsCreatePage';
import { LiveMapPage } from './pages/live-map/LiveMapPage';
import { HistorialRecorridosPage } from './pages/historial/HistorialRecorridosPage';
import { HorariosPage } from './pages/calendario/horarios/HorariosPage';

import { CalendarioPage } from './pages/calendario/CalendarioPage';
import { UsuariosPage } from './pages/usuarios/UsuariosPage';
import { UsuariosCreatePage } from './pages/usuarios/UsuariosCreatePage';
import { UsuariosEditPage } from './pages/usuarios/UsuariosEditPage';

import { CamionesPage } from './pages/camiones/CamionesPage';
import { CamionesCreatePage } from './pages/camiones/CamionesCreatePage';
import { CamionesEditPage } from './pages/camiones/CamionesEditPage';

import { ConductoresPage } from './pages/conductores/ConductoresPage';
import { ConductoresCreatePage } from './pages/conductores/ConductoresCreatePage';
import { ConductoresEditPage } from './pages/conductores/ConductoresEditPage';
type Module = 'gestion-rutas' | 'asignacion-rutas' | 'mapa-vivo' | 'historial-recorridos' | 'calendario' | 'usuarios' | 'camiones' | 'conductores';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active module based on path
  let activeModule: Module = 'gestion-rutas';
  if (location.pathname.startsWith('/asignaciones')) activeModule = 'asignacion-rutas';
  if (location.pathname.startsWith('/mapa-vivo')) activeModule = 'mapa-vivo';
  if (location.pathname.startsWith('/historial')) activeModule = 'historial-recorridos';
  if (location.pathname.startsWith('/calendario')) activeModule = 'calendario';
  if (location.pathname.startsWith('/usuarios')) activeModule = 'usuarios';
  if (location.pathname.startsWith('/camiones')) activeModule = 'camiones';
  if (location.pathname.startsWith('/conductores')) activeModule = 'conductores';

  const handleNavigate = (module: Module) => {
    if (module === 'gestion-rutas') {
      navigate('/rutas');
    } else if (module === 'asignacion-rutas') {
      navigate('/asignaciones');
    } else if (module === 'mapa-vivo') {
      navigate('/mapa-vivo');
    } else if (module === 'historial-recorridos') {
      navigate('/historial');
    } else if (module === 'usuarios') {
      navigate('/usuarios');
    } else if (module === 'camiones') {
      navigate('/camiones');
    } else if (module === 'conductores') {
      navigate('/conductores');
    } else {
      navigate('/calendario');
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
        <Route path="/calendario" element={<CalendarioPage />} />
        <Route path="/calendario/horarios" element={<HorariosPage />} />
        <Route path="/usuarios" element={<UsuariosPage />} />
        <Route path="/usuarios/nuevo" element={<UsuariosCreatePage />} />
        <Route path="/usuarios/:id/editar" element={<UsuariosEditPage />} />
        <Route path="/camiones" element={<CamionesPage />} />
        <Route path="/camiones/nuevo" element={<CamionesCreatePage />} />
        <Route path="/camiones/:id/editar" element={<CamionesEditPage />} />
        <Route path="/conductores" element={<ConductoresPage />} />
        <Route path="/conductores/create" element={<ConductoresCreatePage />} />
        <Route path="/conductores/:id/edit" element={<ConductoresEditPage />} />
        <Route path="*" element={<Navigate to="/rutas" replace />} />
      </Routes>
    </MainLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={3000}
        toastOptions={{ style: { fontFamily: 'inherit' } }}
      />
    </BrowserRouter>
  );
}

export default App;
