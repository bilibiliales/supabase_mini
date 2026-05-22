const DEFAULT_TIMEOUT = 30000;

function getEnvValue(name) {
  if (typeof getVar === 'function') {
    const value = getVar(name, 'global');
    if (value !== undefined) {
      return value;
    }
  }

  if (typeof process !== 'undefined' && process.env && process.env[name] !== undefined) {
    return process.env[name];
  }

  return undefined;
}

function buildHeaders(options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const apiKey = options.apikey || getEnvValue('SUPABASE_API_KEY');
  if (apiKey) {
    headers.apikey = apiKey;
  }

  const token = options.token || getEnvValue('SUPABASE_BEARER_TOKEN');
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

  const fetchOptions = {
    method: options.method || 'GET',
    headers: buildHeaders(options),
  };

  if (options.body !== undefined && options.body !== null) {
    fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  if (options.timeout == null) {
    options.timeout = DEFAULT_TIMEOUT;
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (networkError) {
    throw new Error(`Network error while requesting ${url}: ${networkError.message}`);
  }

  const normalized = await normalizeResponse(response);

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
