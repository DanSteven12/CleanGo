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

    // Only inject credentials for same-origin API calls
    if (url.startsWith('/api')) {
      init = { ...init, credentials: 'include' };
    }

    return _originalFetch(input, init);
  };
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
