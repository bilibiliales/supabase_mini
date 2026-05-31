const { createRequest } = require('./request');
const authModule = require('./auth');
const dbModule = require('./db');
const filters = require('./filters');
const functionsModule = require('./functions');

function makeStorageKey(url) {
  return `supabase-mini:${url}:currentSession`;
}

function getStorageAdapter() {
  if (typeof zdjl !== 'undefined') {
    return {
      getItem(key) {
        if (typeof zdjl.getStorage === 'function') {
          return zdjl.getStorage(key);
        }

        return null;
      },
      setItem(key, value) {
        if (typeof zdjl.setStorage === 'function') {
          zdjl.setStorage(key, value);
        }
      },
      removeItem(key) {
        if (typeof zdjl.removeStorage === 'function') {
          zdjl.removeStorage(key);
        }
      },
    };
  }

  if (typeof localStorage !== 'undefined') {
    return {
      getItem(key) {
        return localStorage.getItem(key);
      },
      setItem(key, value) {
        localStorage.setItem(key, value);
      },
      removeItem(key) {
        localStorage.removeItem(key);
      },
    };
  }

  return null;
}

function normalizeStoredSession(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  return null;
}

function getSessionEvent(session = {}, fallback = 'SIGNED_IN') {
  if (session && session._authEvent) {
    return session._authEvent;
  }

  if (session && session._isRefresh) {
    return 'TOKEN_REFRESHED';
  }

  return fallback;
}

class SupabaseClient {
  constructor(url, apiKey, options = {}) {
    this.url = url;
    this.apiKey = apiKey;
    this.accessToken = null;
    this.refreshToken = null;
    this._session = null;
    this._authStateChangeCallbacks = [];
    this.persistSession = options.persistSession !== false;
    this.storageKey = options.storageKey || makeStorageKey(url);
    this.storage = options.storage || getStorageAdapter();

    this.request = createRequest(this);
    this.auth = authModule.createAuth(this);
    this.db = dbModule.createDb(this);
    this.functions = functionsModule.createFunctions(this);
    this.filters = filters;

    this._loadSession();
  }

  _loadSession() {
    if (!this.persistSession || !this.storage || typeof this.storage.getItem !== 'function') {
      return;
    }

    try {
      const session = normalizeStoredSession(this.storage.getItem(this.storageKey));
      if (session) {
        this._saveSession(session, {
          persist: false,
          notify: false,
          event: 'INITIAL_SESSION',
        });
      }
    } catch (error) {
      // Storage access may be unavailable in embedded runtimes; keep memory session usable.
    }
  }

  _persistSession() {
    if (!this.persistSession || !this.storage || typeof this.storage.setItem !== 'function') {
      return;
    }

    const session = this.getSession();
    if (!session) {
      this._removePersistedSession();
      return;
    }

    try {
      this.storage.setItem(this.storageKey, JSON.stringify(session));
    } catch (error) {
      // Persistence is best-effort; request/auth behavior should not fail because of storage.
    }
  }

  _removePersistedSession() {
    if (!this.persistSession || !this.storage || typeof this.storage.removeItem !== 'function') {
      return;
    }

    try {
      this.storage.removeItem(this.storageKey);
    } catch (error) {
      // Persistence is best-effort; ignore storage cleanup failures.
    }
  }

  _notifyAuthStateChange(event, session) {
    this._authStateChangeCallbacks.slice().forEach((callback) => {
      try {
        callback(event, session);
      } catch (error) {
        setTimeout(() => {
          throw error;
        }, 0);
      }
    });
  }

  _onAuthStateChange(callback) {
    if (typeof callback !== 'function') {
      throw new Error('onAuthStateChange(): callback is required');
    }

    this._authStateChangeCallbacks.push(callback);

    Promise.resolve()
      .then(() => {
        callback('INITIAL_SESSION', this.getSession());
      })
      .catch((error) => {
        setTimeout(() => {
          throw error;
        }, 0);
      });

    return {
      unsubscribe: () => {
        this._authStateChangeCallbacks = this._authStateChangeCallbacks.filter((item) => item !== callback);
      },
    };
  }

  _saveSession(session = {}, options = {}) {
    if (!session || typeof session !== 'object') {
      return;
    }

    this._session = {
      ...(this._session || {}),
      ...session,
    };
    delete this._session._authEvent;
    delete this._session._isRefresh;

    if (session.access_token) {
      this.accessToken = session.access_token;
    }

    if (session.refresh_token) {
      this.refreshToken = session.refresh_token;
    }

    if (options.persist !== false) {
      this._persistSession();
    }

    if (options.notify !== false) {
      this._notifyAuthStateChange(getSessionEvent(session, options.event || 'SIGNED_IN'), this.getSession());
    }
  }

  _clearSession(options = {}) {
    this.accessToken = null;
    this.refreshToken = null;
    this._session = null;
    this._removePersistedSession();

    if (options.notify !== false) {
      this._notifyAuthStateChange(options.event || 'SIGNED_OUT', null);
    }
  }

  getSession() {
    if (!this._session && !this.accessToken && !this.refreshToken) {
      return null;
    }

    return {
      ...(this._session || {}),
      access_token: this.accessToken,
      refresh_token: this.refreshToken,
    };
  }
}

function createClient(url, apiKey, options = {}) {
  if (!url) {
    throw new Error('createClient(): url is required');
  }

  if (!apiKey) {
    throw new Error('createClient(): apiKey is required');
  }

  return new SupabaseClient(url, apiKey, options);
}

module.exports = {
  SupabaseClient,
  filters,
  createClient,
};
