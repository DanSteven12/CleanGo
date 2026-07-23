// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/routes/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
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
import { ReportesPage } from './pages/reportes/ReportesPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';

type Module = 'dashboard' | 'gestion-rutas' | 'asignacion-rutas' | 'mapa-vivo' | 'historial-recorridos' | 'calendario' | 'usuarios' | 'camiones' | 'conductores' | 'reportes-ciudadanos';

// ─── Private app shell (sidebar + main content) ───────────────────────────────
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  let activeModule: Module = 'dashboard';
  if (location.pathname === '/' || location.pathname === '') activeModule = 'dashboard';
  if (location.pathname.startsWith('/rutas')) activeModule = 'gestion-rutas';
  if (location.pathname.startsWith('/asignaciones')) activeModule = 'asignacion-rutas';
  if (location.pathname.startsWith('/mapa-vivo')) activeModule = 'mapa-vivo';
  if (location.pathname.startsWith('/historial')) activeModule = 'historial-recorridos';
  if (location.pathname.startsWith('/calendario')) activeModule = 'calendario';
  if (location.pathname.startsWith('/usuarios')) activeModule = 'usuarios';
  if (location.pathname.startsWith('/camiones')) activeModule = 'camiones';
  if (location.pathname.startsWith('/conductores')) activeModule = 'conductores';
  if (location.pathname.startsWith('/reportes')) activeModule = 'reportes-ciudadanos';

  const handleNavigate = (module: Module) => {
    const map: Record<Module, string> = {
      'dashboard': '/',
      'gestion-rutas': '/rutas',
      'asignacion-rutas': '/asignaciones',
      'mapa-vivo': '/mapa-vivo',
      'historial-recorridos': '/historial',
      'calendario': '/calendario',
      'usuarios': '/usuarios',
      'camiones': '/camiones',
      'conductores': '/conductores',
      'reportes-ciudadanos': '/reportes',
    };
    navigate(map[module]);
  };

  return (
    <MainLayout activeModule={activeModule} onNavigate={handleNavigate}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
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
        <Route path="/reportes" element={<ReportesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}

// ─── Root app with auth routing ───────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public routes (no auth required) ── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* ── Protected routes (requires valid JWT) ── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/*" element={<AppContent />} />
          </Route>
        </Routes>

        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={3000}
          toastOptions={{ style: { fontFamily: 'inherit' } }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
