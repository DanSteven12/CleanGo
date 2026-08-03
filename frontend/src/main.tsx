import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ── Monkey-patch global fetch to always send cookies for API requests ──────────
// This ensures credentials:'include' is set on every /api/* request made by any
// page or component, without needing to touch each call site individually.
// The cookie (HttpOnly session) is sent automatically by the browser when
// credentials:'include' is present.
;(function patchFetch() {
  const _originalFetch = window.fetch.bind(window);
  let isRefreshing = false;
  let failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void }> = [];

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
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;

    const method = init?.method || (input instanceof Request ? input.method : 'GET');
    init = init || {};

    // Only inject credentials and CSRF for same-origin API calls
    if (url.startsWith('/api')) {
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
      if (res.status === 401 && !url.includes('/login') && !url.includes('/refresh')) {
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
          window.dispatchEvent(
            new CustomEvent('auth:unauthorized', { detail: { message: 'Sesión invalidada' } })
          );
          return res;
        }
      }
      if (res.status === 403) {
        window.dispatchEvent(new CustomEvent('auth:forbidden'));
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
