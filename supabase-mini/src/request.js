const refreshingPromisesByClient = new WeakMap();

function getSessionValue(client, key) {
  if (client && client[key]) {
    return client[key];
  }

  return undefined;
}

function saveSession(client, session, options = {}) {
  if (client && typeof client._saveSession === 'function') {
    client._saveSession(session, options);
  }
}

function clearSession(client) {
  if (client && typeof client._clearSession === 'function') {
    client._clearSession();
  }
}

function buildHeaders(options = {}, client = null) {
  const headers = {
    ...options.headers,
  };

  headers['Accept-Encoding'] = 'identity';

  const method = (options.method || 'GET').toUpperCase();
  const hasBody = options.body !== undefined && options.body !== null;

  if (hasBody && !headers['Content-Type'] && !headers['content-type']) {
    if (options.body instanceof URLSearchParams) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else {
      headers['Content-Type'] = 'application/json';
    }
  }

  const apiKey = options.apikey || options.apiKey || getSessionValue(client, 'apiKey');
  if (apiKey) {
    headers.apikey = apiKey;
  }

  const token = options.token || getSessionValue(client, 'accessToken');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function normalizeResponse(response) {
  return response.text().then((text) => {
    const contentType = response.headers.get('content-type') || '';
    if (!text) {
      return {
        status: response.status,
        ok: response.ok,
        body: null,
      };
    }

    if (contentType.includes('application/json')) {
      try {
        return {
          status: response.status,
          ok: response.ok,
          body: JSON.parse(text),
        };
      } catch (error) {
        throw new Error(`Failed to parse JSON response: ${error.message}`);
      }
    }

    return {
      status: response.status,
      ok: response.ok,
      body: text,
    };
  });
}

function getBodyPayload(options) {
  if (options.body === undefined || options.body === null) {
    return undefined;
  }

  if (typeof options.body === 'string') {
    return options.body;
  }

  if (options.body instanceof URLSearchParams) {
    return options.body.toString();
  }

  return JSON.stringify(options.body);
}

function shouldRefreshRequest(path) {
  const normalizedPath = String(path).replace(/^https?:\/\/[^/]+\//, '').replace(/^\//, '');

  return (
    normalizedPath.startsWith('rest/v1/') ||
    normalizedPath.startsWith('functions/v1/') ||
    normalizedPath === 'auth/v1/user' ||
    normalizedPath.startsWith('auth/v1/user?')
  );
}

async function refreshSession(baseUrl, apiKey, client = null) {
  if (!client) {
    throw new Error('request(): session refresh requires a bound client');
  }

  const refreshToken = getSessionValue(client, 'refreshToken');
  if (!refreshToken) {
    throw new Error('No refresh token available for session refresh');
  }

  let refreshPromise = refreshingPromisesByClient.get(client);
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const { refresh } = require('./auth');
      const result = await refresh(refreshToken, {
        baseUrl,
        apikey: apiKey,
        _retry: true,
        _skipSave: true,
        client,
      });

      if (client.refreshToken !== refreshToken) {
        throw new Error('Session changed while refresh was in progress');
      }

      saveSession(client, result, { event: 'TOKEN_REFRESHED' });
      return result;
    })();

    refreshingPromisesByClient.set(client, refreshPromise);

    const clearRefreshPromise = () => {
      if (refreshingPromisesByClient.get(client) === refreshPromise) {
        refreshingPromisesByClient.delete(client);
      }
    };

    refreshPromise.then(clearRefreshPromise, clearRefreshPromise);
  }

  return refreshPromise;
}

async function executeRequest(path, options = {}) {
  if (!path) {
    throw new Error('request(): path is required');
  }

  const client = options.client || null;
  if (!client) {
    throw new Error('request(): request must be bound to a Supabase client');
  }

  const baseUrl = options.baseUrl || (client && client.url);
  if (!baseUrl) {
    throw new Error('request(): baseUrl is required in options or client');
  }

  const url = path.startsWith('http') ? path : `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

  const fetchOptions = {
    method: options.method || 'GET',
    headers: buildHeaders(options, client),
  };

  const bodyPayload = getBodyPayload(options);
  if (bodyPayload !== undefined) {
    fetchOptions.body = bodyPayload;
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (networkError) {
    throw new Error(`Network error while requesting ${url}: ${networkError.message}`);
  }

  const normalized = await normalizeResponse(response);

  if (!response.ok && response.status === 401 && shouldRefreshRequest(path) && !options._retry) {
    try {
      const refreshResult = await refreshSession(
        baseUrl,
        options.apikey || options.apiKey || (client && client.apiKey),
        client
      );
      const retryOptions = {
        ...options,
        token: undefined,
        _retry: true,
      };
      return executeRequest(path, retryOptions);
    } catch (refreshError) {
      clearSession(client);
    }
  }

  if (!response.ok) {
    const message = normalized.body && normalized.body.message ? normalized.body.message : response.statusText;
    const error = new Error(`Request failed: ${response.status} ${message}`);
    error.status = response.status;
    error.body = normalized.body;
    throw error;
  }

  return normalized.body;
}

async function request(path, options = {}) {
  return executeRequest(path, options);
}

function createRequest(client) {
  return function boundRequest(path, options = {}) {
    return executeRequest(path, {
      ...options,
      client,
    });
  };
}

module.exports = {
  createRequest,
  request,
};
