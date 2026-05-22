const { request } = require('./request');
const runtime = require('./runtime');

async function signUp(credentials = {}, options = {}) {
  const { email, password, data } = credentials;
  if (!email || !password) {
    throw new Error('signUp(): email and password are required');
  }

  const result = await request('auth/v1/signup', {
    method: 'POST',
    body: { email, password, data },
    ...options,
  });

  runtime.saveSession(result);
  return result;
}

async function signIn(credentials = {}, options = {}) {
  const { email, password } = credentials;
  if (!email || !password) {
    throw new Error('signIn(): email and password are required');
  }

  const result = await request('auth/v1/token?grant_type=password', {
    method: 'POST',
    body: {
      email,
      password,
    },
    ...options,
  });

  runtime.saveSession(result);
  return result;
}

async function refresh(refreshToken, options = {}) {
  if (!refreshToken) {
    throw new Error('refresh(): refreshToken is required');
  }

  const result = await request('auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: {
      refresh_token: refreshToken,
    },
    ...options,
  });

  runtime.saveSession(result);
  return result;
}

async function getUser(options = {}) {
  return request('auth/v1/user', {
    method: 'GET',
    ...options,
  });
}

async function logout(options = {}) {
  const { refreshToken } = options;

  const result = await request('auth/v1/logout', {
    method: 'POST',
    body: refreshToken ? { refresh_token: refreshToken } : undefined,
    ...options,
  });

  runtime.clearSession();
  return result;
}

function saveSession(session = {}) {
  runtime.saveSession(session);
}

function clearSession() {
  runtime.clearSession();
}

module.exports = {
  signUp,
  signIn,
  refresh,
  getUser,
  logout,
  saveSession,
  clearSession,
};
