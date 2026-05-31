const { request } = require('./request');

function withClient(options, client) {
  if (!client) {
    return options;
  }

  return {
    ...options,
    client,
  };
}

function requireClient(options = {}, methodName = 'auth') {
  if (!options.client) {
    throw new Error(`${methodName}(): must be called from a Supabase client`);
  }
}

function saveSessionToClient(client, session = {}, options = {}) {
  if (client && typeof client._saveSession === 'function') {
    client._saveSession(session, options);
  }
}

function clearClientSession(client, options = {}) {
  if (client && typeof client._clearSession === 'function') {
    client._clearSession(options);
  }
}

async function signUp(credentials = {}, options = {}) {
  requireClient(options, 'signUp');

  const { email, password, data } = credentials;
  if (!email || !password) {
    throw new Error('signUp(): email and password are required');
  }

  const result = await request('auth/v1/signup', {
    method: 'POST',
    body: { email, password, data },
    ...options,
  });

  if (!options._skipSave) {
    saveSessionToClient(options.client, result, { event: 'SIGNED_IN' });
  }
  return result;
}

async function signIn(credentials = {}, options = {}) {
  requireClient(options, 'signIn');

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

  if (!options._skipSave) {
    saveSessionToClient(options.client, result, { event: 'SIGNED_IN' });
  }
  return result;
}

async function refresh(refreshToken, options = {}) {
  requireClient(options, 'refresh');

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

  if (!options._skipSave) {
    saveSessionToClient(options.client, result, { event: 'TOKEN_REFRESHED' });
  }
  return result;
}

async function getUser(options = {}) {
  requireClient(options, 'getUser');

  return request('auth/v1/user', {
    method: 'GET',
    ...options,
  });
}

async function logout(options = {}) {
  requireClient(options, 'logout');

  const { refreshToken } = options;

  const result = await request('auth/v1/logout', {
    method: 'POST',
    body: refreshToken ? { refresh_token: refreshToken } : undefined,
    ...options,
  });

  clearClientSession(options.client, { event: 'SIGNED_OUT' });
  return result;
}

function saveSession(session = {}, options = {}) {
  requireClient(options, 'saveSession');

  saveSessionToClient(options.client, session, { event: options.event || 'SIGNED_IN' });
}

function clearSession(options = {}) {
  requireClient(options, 'clearSession');

  clearClientSession(options.client, { event: 'SIGNED_OUT' });
}

function session(options = {}) {
  requireClient(options, 'session');

  const client = options.client;
  if (client && typeof client.getSession === 'function') {
    return client.getSession();
  }

  return null;
}

function onAuthStateChange(callback, options = {}) {
  requireClient(options, 'onAuthStateChange');

  if (options.client && typeof options.client._onAuthStateChange === 'function') {
    return options.client._onAuthStateChange(callback);
  }

  throw new Error('onAuthStateChange(): client does not support auth state changes');
}

function createAuth(client) {
  return {
    signUp(credentials = {}, options = {}) {
      return signUp(credentials, withClient(options, client));
    },
    signIn(credentials = {}, options = {}) {
      return signIn(credentials, withClient(options, client));
    },
    refresh(refreshToken, options = {}) {
      return refresh(refreshToken, withClient(options, client));
    },
    getUser(options = {}) {
      return getUser(withClient(options, client));
    },
    logout(options = {}) {
      return logout(withClient(options, client));
    },
    saveSession(session = {}, options = {}) {
      return saveSession(session, withClient(options, client));
    },
    clearSession() {
      return clearSession({ client });
    },
    session() {
      return session({ client });
    },
    getSession() {
      return session({ client });
    },
    getAccessToken() {
      return client ? client.accessToken : undefined;
    },
    getRefreshToken() {
      return client ? client.refreshToken : undefined;
    },
    onAuthStateChange(callback) {
      return onAuthStateChange(callback, { client });
    },
  };
}

module.exports = {
  createAuth,
  signUp,
  signIn,
  refresh,
  getUser,
  logout,
  saveSession,
  clearSession,
  session,
  onAuthStateChange,
};
