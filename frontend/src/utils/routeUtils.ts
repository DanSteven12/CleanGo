// frontend/src/utils/routeUtils.ts

/**
 * Lista de rutas públicas donde no deben mostrarse toasts ni notificaciones de error
 * relativas a expiración de sesión o permisos denegados.
 */
export const PUBLIC_ROUTES: readonly string[] = [
  '/',
  '/welcome',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/privacy-policy',
  '/terms-and-conditions',
];

/**
 * Comprueba si una ruta determinada es pública.
 * Por defecto evalúa `window.location.pathname`.
 */
export function isPublicRoute(pathname?: string): boolean {
  const currentPath = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  // Extraer únicamente el path base (sin query params ni hash)
  const cleanPath = currentPath.split('?')[0].split('#')[0];
  return PUBLIC_ROUTES.includes(cleanPath);
}
