import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { isPublicRoute } from './utils/routeUtils'

// ── Monkey-patch global fetch to always send cookies for API requests ──────────
// This ensures credentials:'include' is set on every /api/* request made by any
// page or component, without needing to touch each call site individually.
// The cookie (HttpOnly session) is sent automatically by the browser when
// credentials:'include' is present.
;(function patchFetch() {
  const _originalFetch = window.fetch.bind(window);
  let isRefreshing = false;
  let failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void }> = [];

  // En producción, redirige /api/* al backend real (VITE_API_URL).
  // En desarrollo, Vite proxy ya lo maneja, así que se deja relativa.
  const rawApiBase: string = import.meta.env.VITE_API_URL || '';
  const API_BASE: string = rawApiBase.replace(/\/api\/?$/, '').replace(/\/$/, '');

  const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    failedQueue = [];
  };

  const getCsrfToken = () => {
    const match = document.cookie.match(/(^|;)\s*XSRF-TOKEN\s*=\s*([^;]+)/);
    return match ? decodeURIComponent(match[2]) : null;
  };

  window.fetch = function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    let url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;

    // Reescribe /api/* → API_BASE/api/* cuando API_BASE está configurado (producción)
    if (API_BASE && url.startsWith('/api')) {
      url = API_BASE + url;
      input = url;
    }

    const method = init?.method || (input instanceof Request ? input.method : 'GET');
    init = init || {};

    // Inyecta credentials y CSRF para peticiones al backend (relativas o absolutas)
    const isApiCall = url.startsWith('/api') || (API_BASE && url.startsWith(API_BASE + '/api'));
    if (isApiCall) {
      init.credentials = 'include';
      
      // Inject CSRF token for mutating requests
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
        const csrfToken = getCsrfToken();
        if (csrfToken) {
          init.headers = {
            ...init.headers,
            'X-XSRF-TOKEN': csrfToken
          };
        }
      }
    }

    // Safely clone input if it's a Request to avoid "Body is disturbed" on retry
    let firstInput = input;
    let retryInput = input;
    if (input instanceof Request) {
      firstInput = input.clone();
      retryInput = input.clone();
    }

    return _originalFetch(firstInput, init).then(async (res) => {
      // 401 Unauthorized handling
      if (res.status === 401) {
        // Auth check / auth form calls returning 401 are expected when unauthenticated.
        // Return 401 directly without attempting refresh or dispatching unauthorized toast events.
        const isAuthFormOrMe =
          url.includes('/api/auth/me') ||
          url.includes('/api/auth/login') ||
          url.includes('/api/auth/register') ||
          url.includes('/api/auth/forgot-password') ||
          url.includes('/api/auth/reset-password');

        if (isAuthFormOrMe) {
          return res;
        }

        // If the refresh call itself returned 401
        if (url.includes('/api/auth/refresh')) {
          if (!isPublicRoute()) {
            window.dispatchEvent(
              new CustomEvent('auth:unauthorized', { detail: { message: 'Sesión invalidada' } })
            );
          }
          return res;
        }

        // Handle protected endpoint 401: attempt Silent Refresh
        if (isRefreshing) {
          try {
            await new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            });
            // Re-clone retryInput if it's a Request to handle multiple retries safely
            const finalInput = retryInput instanceof Request ? retryInput.clone() : retryInput;
            return _originalFetch(finalInput, init);
          } catch (err) {
            return res; // Fallback to original 401
          }
        }

        isRefreshing = true;
        try {
          const refreshInit: RequestInit = { method: 'POST', credentials: 'include', headers: {} };
          const csrfToken = getCsrfToken();
          if (csrfToken) {
            refreshInit.headers = { 'X-XSRF-TOKEN': csrfToken };
          }
          const refreshRes = await _originalFetch('/api/auth/refresh', refreshInit);
          if (refreshRes.ok) {
            isRefreshing = false;
            processQueue(null);
            // Re-clone retryInput if it's a Request to handle multiple retries safely
            const finalInput = retryInput instanceof Request ? retryInput.clone() : retryInput;
            return _originalFetch(finalInput, init); // Retry original request
          } else {
            throw new Error('Refresh failed');
          }
        } catch (err) {
          isRefreshing = false;
          processQueue(err);
          // Only dispatch unauthorized event if the user is in an authenticated route
          if (!isPublicRoute()) {
            window.dispatchEvent(
              new CustomEvent('auth:unauthorized', { detail: { message: 'Sesión invalidada' } })
            );
          }
          return res;
        }
      }

      // 403 Forbidden handling — only notify if in an authenticated route
      if (res.status === 403) {
        if (!isPublicRoute()) {
          window.dispatchEvent(new CustomEvent('auth:forbidden'));
        }
      }

      return res;
    });
  };
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
