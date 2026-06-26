// function available in the global scope for making API requests
(function (global) {
  const BASE_URL = 'http://localhost:8000';

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
    del
  };
})(window);
