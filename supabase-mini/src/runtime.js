function getVarValue(name) {
  if (typeof zdjl !== 'undefined' && typeof zdjl.getVar === 'function') {
    return zdjl.getVar(name, 'global');
  }

  if (typeof process !== 'undefined' && process.env) {
    return process.env[name];
  }

  return undefined;
}

function setVarValue(name, value) {
  if (typeof zdjl !== 'undefined' && typeof zdjl.setVar === 'function') {
    return zdjl.setVar(name, value, 'global');
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
  return getVarValue('SUPABASE_API_KEY') || getVarValue('SUPABASE_PUBLISHABLE_KEY');
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
