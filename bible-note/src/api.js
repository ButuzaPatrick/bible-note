// function available in the global scope for making API requests
(function (global) {
  const BASE_URL = 'http://localhost:8000';
  let toastTimer = null;

  function ensureToast() {
    let toast = document.getElementById('bn-global-toast');
    if (toast) return toast;

    toast = document.createElement('div');
    toast.id = 'bn-global-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.style.cssText = [
      'position: fixed',
      'top: 16px',
      'right: 16px',
      'max-width: min(360px, calc(100vw - 24px))',
      'padding: 12px 14px',
      'background: #2a0f0f',
      'color: #ffe6e6',
      'border: 1px solid #d46a6a',
      'box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28)',
      'z-index: 9999',
      'display: none',
      'pointer-events: none',
      'font-family: Inter, Avenir, Helvetica, Arial, sans-serif',
      'font-size: 0.95rem'
    ].join('; ');

    document.body.appendChild(toast);
    return toast;
  }

  // Show a toast notification with the given message (global error visualisation)
  function showError(message) {
    const toast = ensureToast();
    toast.textContent = message || 'Request failed';
    toast.style.display = 'block';

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.display = 'none';
      toast.textContent = '';
    }, 3200);
  }

  function buildUrl(path, params) {
    const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return url.toString();
  }

  async function request(path, options = {}, params) {
    try {
      const response = await fetch(buildUrl(path, params), {
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        ...options
      });

      if (!response.ok) {
        let errorMessage = 'Request failed';
        try {
          const errorBody = await response.json();
          errorMessage = errorBody?.detail || errorBody?.message || errorMessage;
        } catch (err) {
          // ignore JSON parse errors and use the fallback message
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const text = await response.text();
        return text ? JSON.parse(text) : null;
      }

      return response.text();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      showError(message);
      throw error;
    }
  }

  function get(path, params) {
    return request(path, { method: 'GET' }, params);
  }

  function post(path, body) {
    return request(path, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  function put(path, body) {
    return request(path, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  function del(path) {
    return request(path, { method: 'DELETE' });
  }

  // Expose the API functions to the global scope
  global.BNApi = {
    baseUrl: BASE_URL,
    request,
    get,
    post,
    put,
    del,
    showError
  };
})(window);
