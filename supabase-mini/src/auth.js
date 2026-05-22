const { request } = require('./request');

async function signUp(credentials = {}, options = {}) {
  const { email, password, data } = credentials;
  if (!email || !password) {
    throw new Error('signUp(): email and password are required');
  }

  return request('auth/v1/signup', {
    method: 'POST',
    body: { email, password, data },
    ...options,
  });
}

async function signIn(credentials = {}, options = {}) {
  const { email, password } = credentials;
  if (!email || !password) {
    throw new Error('signIn(): email and password are required');
  }

  return request('auth/v1/token?grant_type=password', {
    method: 'POST',
    body: {
      email,
      password,
    },
    ...options,
  });
}

async function refresh(refreshToken, options = {}) {
  if (!refreshToken) {
    throw new Error('refresh(): refreshToken is required');
  }

  return request('auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: {
      refresh_token: refreshToken,
    },
    ...options,
  });
}

async function getUser(options = {}) {
  return request('auth/v1/user', {
    method: 'GET',
    ...options,
  });
}

async function logout(options = {}) {
  const { refreshToken } = options;

  return request('auth/v1/logout', {
    method: 'POST',
    body: refreshToken ? { refresh_token: refreshToken } : undefined,
    ...options,
  });
}

module.exports = {
  signUp,
  signIn,
  refresh,
  getUser,
  logout,
};
