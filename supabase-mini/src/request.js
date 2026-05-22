const DEFAULT_TIMEOUT = 30000;
const runtime = require('./runtime');
let refreshingPromise = null;

function buildHeaders(options = {}) {
  const headers = {
    ...options.headers,
  };

  const method = (options.method || 'GET').toUpperCase();
  const hasBody = options.body !== undefined && options.body !== null;

  if (hasBody && !headers['Content-Type'] && !headers['content-type']) {
    if (options.body instanceof URLSearchParams) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else {
      headers['Content-Type'] = 'application/json';
    }
  }

  const apiKey = options.apikey || runtime.getApiKey();
  if (apiKey) {
    headers.apikey = apiKey;
  }

  const token = options.token || runtime.getAccessToken();
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

async function refreshSession(baseUrl, apiKey) {
  if (!refreshingPromise) {
    refreshingPromise = (async () => {
      const refreshToken = runtime.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available for session refresh');
      }

      const { refresh } = require('./auth');
      const result = await refresh(refreshToken, {
        baseUrl,
        apikey: apiKey,
        _retry: true,
      });

      runtime.saveSession(result);
      return result;
    })();

    refreshingPromise.finally(() => {
      refreshingPromise = null;
    });
  }

  return refreshingPromise;
}

async function executeRequest(path, options = {}) {
  if (!path) {
    throw new Error('request(): path is required');
  }

  const baseUrl = options.baseUrl || runtime.getUrl();
  if (!baseUrl) {
    throw new Error('request(): SUPABASE_URL is required in environment variables or options');
  }

  const url = path.startsWith('http') ? path : `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const timeout = options.timeout != null ? options.timeout : DEFAULT_TIMEOUT;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  const fetchOptions = {
    method: options.method || 'GET',
    headers: buildHeaders(options),
    signal: controller.signal,
  };

  const bodyPayload = getBodyPayload(options);
  if (bodyPayload !== undefined) {
    fetchOptions.body = bodyPayload;
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (networkError) {
    if (networkError.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms: ${url}`);
    }
    throw new Error(`Network error while requesting ${url}: ${networkError.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  const normalized = await normalizeResponse(response);

  if (!response.ok && response.status === 401 && !options._retry) {
    try {
      const refreshResult = await refreshSession(baseUrl, options.apikey || runtime.getApiKey());
      const retryOptions = {
        ...options,
        token: refreshResult.access_token || options.token,
        _retry: true,
      };
      return executeRequest(path, retryOptions);
    } catch (refreshError) {
      runtime.clearSession();
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

module.exports = {
  request,
};
