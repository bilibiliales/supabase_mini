function getVarValue(name) {
  if (typeof getVar === 'function') {
    return getVar(name, 'global');
  }

  if (typeof process !== 'undefined' && process.env) {
    return process.env[name];
  }

  return undefined;
}

function setVarValue(name, value) {
  if (typeof setVar === 'function') {
    return setVar(name, value, 'global');
  }

  if (typeof process !== 'undefined' && process.env) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}

function getUrl() {
  return getVarValue('SUPABASE_URL');
}

function getApiKey() {
  return getVarValue('SUPABASE_API_KEY') || getVarValue('SUPABASE_ANON_KEY');
}

function getAccessToken() {
  return getVarValue('SUPABASE_ACCESS_TOKEN') || getVarValue('SUPABASE_BEARER_TOKEN');
}

function getRefreshToken() {
  return getVarValue('SUPABASE_REFRESH_TOKEN');
}

function saveSession(session = {}) {
  if (!session || typeof session !== 'object') {
    return;
  }

  if (session.access_token) {
    setVarValue('SUPABASE_ACCESS_TOKEN', session.access_token);
  }

  if (session.refresh_token) {
    setVarValue('SUPABASE_REFRESH_TOKEN', session.refresh_token);
  }

  if (session.supabaseUrl) {
    setVarValue('SUPABASE_URL', session.supabaseUrl);
  }

  if (session.apiKey) {
    setVarValue('SUPABASE_API_KEY', session.apiKey);
  }
}

function clearSession() {
  setVarValue('SUPABASE_ACCESS_TOKEN', undefined);
  setVarValue('SUPABASE_REFRESH_TOKEN', undefined);
}

module.exports = {
  getUrl,
  getApiKey,
  getAccessToken,
  getRefreshToken,
  saveSession,
  clearSession,
};
