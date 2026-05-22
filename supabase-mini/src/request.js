const DEFAULT_TIMEOUT = 30000;
const runtime = require('./runtime');

function buildHeaders(options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

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

async function request(path, options = {}) {
  if (!path) {
    throw new Error('request(): path is required');
  }

  const baseUrl = options.baseUrl || getEnvValue('SUPABASE_URL');
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

  if (options.body !== undefined && options.body !== null) {
    if (typeof options.body === 'string') {
      fetchOptions.body = options.body;
    } else if (options.body instanceof URLSearchParams) {
      fetchOptions.body = options.body.toString();
    } else {
      fetchOptions.body = JSON.stringify(options.body);
    }
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
    const refreshToken = runtime.getRefreshToken();
    if (refreshToken) {
      try {
        const { refresh } = require('./auth');
        const refreshResult = await refresh(refreshToken, {
          baseUrl,
          apikey: options.apikey || runtime.getApiKey(),
          _retry: true,
        });

        runtime.saveSession(refreshResult);
        const retryOptions = {
          ...options,
          token: refreshResult.access_token || options.token,
          _retry: true,
        };
        return request(path, retryOptions);
      } catch (refreshError) {
        runtime.clearSession();
      }
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

module.exports = {
  request,
};
