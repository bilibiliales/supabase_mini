var Supabase = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // supabase-mini/src/auth.js
  var require_auth = __commonJS({
    "supabase-mini/src/auth.js"(exports, module) {
      var { request } = require_request();
      function withClient(options, client) {
        if (!client) {
          return options;
        }
        return {
          ...options,
          client
        };
      }
      function requireClient(options = {}, methodName = "auth") {
        if (!options.client) {
          throw new Error(`${methodName}(): must be called from a Supabase client`);
        }
      }
      function saveSessionToClient(client, session2 = {}, options = {}) {
        if (client && typeof client._saveSession === "function") {
          client._saveSession(session2, options);
        }
      }
      function clearClientSession(client, options = {}) {
        if (client && typeof client._clearSession === "function") {
          client._clearSession(options);
        }
      }
      function notifyClient(client, event) {
        if (client && typeof client._notifyAuthStateChange === "function") {
          client._notifyAuthStateChange(event, client.getSession ? client.getSession() : null);
        }
      }
      function normalizeUserAttributes(attributes = {}) {
        const body = {};
        Object.entries(attributes).forEach(([key, value]) => {
          if (value === void 0) {
            return;
          }
          if (key === "currentPassword") {
            body.current_password = value;
            return;
          }
          body[key] = value;
        });
        return body;
      }
      function normalizeSignOutScope(scope = "global") {
        const allowed = ["global", "local", "others"];
        if (!allowed.includes(scope)) {
          throw new Error("signOut(): scope must be one of global, local, or others");
        }
        return scope;
      }
      async function signUp(credentials = {}, options = {}) {
        requireClient(options, "signUp");
        const { email, password, data } = credentials;
        if (!email || !password) {
          throw new Error("signUp(): email and password are required");
        }
        const result = await request("auth/v1/signup", {
          method: "POST",
          body: { email, password, data },
          ...options
        });
        if (!options._skipSave) {
          saveSessionToClient(options.client, result, { event: "SIGNED_IN" });
        }
        return result;
      }
      async function signIn(credentials = {}, options = {}) {
        requireClient(options, "signIn");
        const { email, password } = credentials;
        if (!email || !password) {
          throw new Error("signIn(): email and password are required");
        }
        const result = await request("auth/v1/token?grant_type=password", {
          method: "POST",
          body: {
            email,
            password
          },
          ...options
        });
        if (!options._skipSave) {
          saveSessionToClient(options.client, result, { event: "SIGNED_IN" });
        }
        return result;
      }
      async function refresh(refreshToken, options = {}) {
        requireClient(options, "refresh");
        if (!refreshToken) {
          throw new Error("refresh(): refreshToken is required");
        }
        const result = await request("auth/v1/token?grant_type=refresh_token", {
          method: "POST",
          body: {
            refresh_token: refreshToken
          },
          ...options
        });
        if (!options._skipSave) {
          saveSessionToClient(options.client, result, { event: "TOKEN_REFRESHED" });
        }
        return result;
      }
      async function getUser(options = {}) {
        requireClient(options, "getUser");
        return request("auth/v1/user", {
          method: "GET",
          ...options
        });
      }
      async function updateUser(attributes = {}, options = {}) {
        requireClient(options, "updateUser");
        if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
          throw new Error("updateUser(): attributes must be an object");
        }
        const body = normalizeUserAttributes(attributes);
        if (Object.keys(body).length === 0) {
          throw new Error("updateUser(): at least one attribute is required");
        }
        const query = options.emailRedirectTo ? `?redirect_to=${encodeURIComponent(options.emailRedirectTo)}` : "";
        const result = await request(`auth/v1/user${query}`, {
          method: "PUT",
          body,
          ...options
        });
        notifyClient(options.client, "USER_UPDATED");
        return result;
      }
      async function signOut(options = {}) {
        requireClient(options, "signOut");
        const scope = normalizeSignOutScope(options.scope || "global");
        const { refreshToken } = options;
        const result = await request(`auth/v1/logout?scope=${encodeURIComponent(scope)}`, {
          method: "POST",
          body: refreshToken ? { refresh_token: refreshToken } : void 0,
          ...options
        });
        if (scope !== "others") {
          clearClientSession(options.client, { event: "SIGNED_OUT" });
        }
        return result;
      }
      function saveSession(session2 = {}, options = {}) {
        requireClient(options, "saveSession");
        saveSessionToClient(options.client, session2, { event: options.event || "SIGNED_IN" });
      }
      function clearSession(options = {}) {
        requireClient(options, "clearSession");
        clearClientSession(options.client, { event: "SIGNED_OUT" });
      }
      function session(options = {}) {
        requireClient(options, "session");
        const client = options.client;
        if (client && typeof client.getSession === "function") {
          return client.getSession();
        }
        return null;
      }
      function onAuthStateChange(callback, options = {}) {
        requireClient(options, "onAuthStateChange");
        if (options.client && typeof options.client._onAuthStateChange === "function") {
          return options.client._onAuthStateChange(callback);
        }
        throw new Error("onAuthStateChange(): client does not support auth state changes");
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
          updateUser(attributes = {}, options = {}) {
            return updateUser(attributes, withClient(options, client));
          },
          signOut(options = {}) {
            return signOut(withClient(options, client));
          },
          saveSession(session2 = {}, options = {}) {
            return saveSession(session2, withClient(options, client));
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
            return client ? client.accessToken : void 0;
          },
          getRefreshToken() {
            return client ? client.refreshToken : void 0;
          },
          onAuthStateChange(callback) {
            return onAuthStateChange(callback, { client });
          }
        };
      }
      module.exports = {
        createAuth,
        signUp,
        signIn,
        refresh,
        getUser,
        updateUser,
        signOut,
        saveSession,
        clearSession,
        session,
        onAuthStateChange
      };
    }
  });

  // supabase-mini/src/request.js
  var require_request = __commonJS({
    "supabase-mini/src/request.js"(exports, module) {
      var refreshingPromisesByClient = /* @__PURE__ */ new WeakMap();
      function getSessionValue(client, key) {
        if (client && client[key]) {
          return client[key];
        }
        return void 0;
      }
      function saveSession(client, session, options = {}) {
        if (client && typeof client._saveSession === "function") {
          client._saveSession(session, options);
        }
      }
      function clearSession(client) {
        if (client && typeof client._clearSession === "function") {
          client._clearSession();
        }
      }
      function buildHeaders(options = {}, client = null) {
        const headers = {
          ...options.headers
        };
        headers["Accept-Encoding"] = "identity";
        const method = (options.method || "GET").toUpperCase();
        const hasBody = options.body !== void 0 && options.body !== null;
        if (hasBody && !headers["Content-Type"] && !headers["content-type"]) {
          if (options.body instanceof URLSearchParams) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
          } else {
            headers["Content-Type"] = "application/json";
          }
        }
        const apiKey = options.apikey || options.apiKey || getSessionValue(client, "apiKey");
        if (apiKey) {
          headers.apikey = apiKey;
        }
        const token = options.token || getSessionValue(client, "accessToken");
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        return headers;
      }
      function normalizeResponse(response) {
        return response.text().then((text) => {
          const contentType = response.headers.get("content-type") || "";
          if (!text) {
            return {
              status: response.status,
              ok: response.ok,
              body: null
            };
          }
          if (contentType.includes("application/json")) {
            try {
              return {
                status: response.status,
                ok: response.ok,
                body: JSON.parse(text)
              };
            } catch (error) {
              throw new Error(`Failed to parse JSON response: ${error.message}`);
            }
          }
          return {
            status: response.status,
            ok: response.ok,
            body: text
          };
        });
      }
      function getBodyPayload(options) {
        if (options.body === void 0 || options.body === null) {
          return void 0;
        }
        if (typeof options.body === "string") {
          return options.body;
        }
        if (options.body instanceof URLSearchParams) {
          return options.body.toString();
        }
        return JSON.stringify(options.body);
      }
      function shouldRefreshRequest(path) {
        const normalizedPath = String(path).replace(/^https?:\/\/[^/]+\//, "").replace(/^\//, "");
        return normalizedPath.startsWith("rest/v1/") || normalizedPath.startsWith("functions/v1/") || normalizedPath === "auth/v1/user" || normalizedPath.startsWith("auth/v1/user?");
      }
      async function refreshSession(baseUrl, apiKey, client = null) {
        if (!client) {
          throw new Error("request(): session refresh requires a bound client");
        }
        const refreshToken = getSessionValue(client, "refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token available for session refresh");
        }
        let refreshPromise = refreshingPromisesByClient.get(client);
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const { refresh } = require_auth();
            const result = await refresh(refreshToken, {
              baseUrl,
              apikey: apiKey,
              _retry: true,
              _skipSave: true,
              client
            });
            if (client.refreshToken !== refreshToken) {
              throw new Error("Session changed while refresh was in progress");
            }
            saveSession(client, result, { event: "TOKEN_REFRESHED" });
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
          throw new Error("request(): path is required");
        }
        const client = options.client || null;
        if (!client) {
          throw new Error("request(): request must be bound to a Supabase client");
        }
        const baseUrl = options.baseUrl || client && client.url;
        if (!baseUrl) {
          throw new Error("request(): baseUrl is required in options or client");
        }
        const url = path.startsWith("http") ? path : `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
        const fetchOptions = {
          method: options.method || "GET",
          headers: buildHeaders(options, client)
        };
        const bodyPayload = getBodyPayload(options);
        if (bodyPayload !== void 0) {
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
              options.apikey || options.apiKey || client && client.apiKey,
              client
            );
            const retryOptions = {
              ...options,
              token: void 0,
              _retry: true
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
            client
          });
        };
      }
      module.exports = {
        createRequest,
        request
      };
    }
  });

  // supabase-mini/src/db.js
  var require_db = __commonJS({
    "supabase-mini/src/db.js"(exports, module) {
      var { request } = require_request();
      function withClient(options, client) {
        if (!client) {
          return options;
        }
        return {
          ...options,
          client
        };
      }
      function requireClient(options = {}, methodName = "db") {
        if (!options.client) {
          throw new Error(`${methodName}(): must be called from a Supabase client`);
        }
      }
      function encodeQueryValue(value) {
        return encodeURIComponent(String(value));
      }
      function buildPreferHeader(headers, value) {
        const existing = headers.Prefer || headers.prefer || "";
        const values = existing.split(",").map((item) => item.trim()).filter(Boolean);
        if (!values.includes(value)) {
          values.push(value);
        }
        headers.Prefer = values.join(",");
      }
      function addDbHeaders(options = {}) {
        const headers = {
          ...options.headers
        };
        const readSchema = options.readSchema || options.schema;
        const writeSchema = options.writeSchema || options.profile;
        if (readSchema) {
          headers["Accept-Profile"] = readSchema;
        }
        if (writeSchema) {
          headers["Content-Profile"] = writeSchema;
        }
        if (options.count) {
          const countMode = typeof options.count === "string" ? options.count : "exact";
          buildPreferHeader(headers, `count=${countMode}`);
        }
        return {
          ...options,
          headers
        };
      }
      function buildQueryString(options = {}) {
        const parts = [];
        if (options.select) {
          const selectValue = Array.isArray(options.select) ? options.select.join(",") : options.select;
          parts.push(`select=${encodeQueryValue(selectValue)}`);
        }
        const filters = [
          ["eq", "eq"],
          ["neq", "neq"],
          ["gt", "gt"],
          ["gte", "gte"],
          ["lt", "lt"],
          ["lte", "lte"],
          ["like", "like"],
          ["ilike", "ilike"]
        ];
        filters.forEach(([optionKey, operator]) => {
          if (options[optionKey]) {
            Object.entries(options[optionKey]).forEach(([key, value]) => {
              parts.push(`${encodeQueryValue(key)}=${operator}.${encodeQueryValue(value)}`);
            });
          }
        });
        if (options.not) {
          Object.entries(options.not).forEach(([op, obj]) => {
            if (obj && typeof obj === "object") {
              Object.entries(obj).forEach(([key, value]) => {
                const encoded = value === null ? "null" : encodeQueryValue(value);
                parts.push(`${encodeQueryValue(key)}=not.${op}.${encoded}`);
              });
            }
          });
        }
        if (options["in"]) {
          Object.entries(options["in"]).forEach(([key, value]) => {
            const makeQuoted = (v) => {
              const s = String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
              return `"${s}"`;
            };
            const raw = Array.isArray(value) ? value.map(makeQuoted).join(",") : makeQuoted(value);
            const encodedRaw = encodeURIComponent(raw);
            parts.push(`${encodeQueryValue(key)}=in.(${encodedRaw})`);
          });
        }
        if (options.is) {
          Object.entries(options.is).forEach(([key, value]) => {
            const encoded = value === null ? "null" : encodeQueryValue(value);
            parts.push(`${encodeQueryValue(key)}=is.${encoded}`);
          });
        }
        if (options.order) {
          parts.push(`order=${encodeQueryValue(options.order)}`);
        }
        if (options.limit != null) {
          parts.push(`limit=${encodeQueryValue(options.limit)}`);
        }
        if (options.offset != null) {
          parts.push(`offset=${encodeQueryValue(options.offset)}`);
        }
        return parts.join("&");
      }
      function buildPath(table, options = {}) {
        const query = buildQueryString(options);
        const basePath = `rest/v1/${table}`;
        return query ? `${basePath}?${query}` : basePath;
      }
      async function select(table, options = {}) {
        requireClient(options, "select");
        if (!table) {
          throw new Error("select(): table is required");
        }
        options = addDbHeaders(options);
        const path = buildPath(table, options);
        return request(path, {
          method: "GET",
          ...options
        });
      }
      async function single(table, options = {}) {
        requireClient(options, "single");
        if (!table) {
          throw new Error("single(): table is required");
        }
        options = addDbHeaders(options);
        const path = buildPath(table, options);
        return request(path, {
          method: "GET",
          ...options,
          headers: {
            ...options.headers,
            Accept: "application/vnd.pgrst.object+json"
          }
        });
      }
      async function maybeSingle(table, options = {}) {
        requireClient(options, "maybeSingle");
        if (!table) {
          throw new Error("maybeSingle(): table is required");
        }
        options = addDbHeaders(options);
        const path = buildPath(table, options);
        try {
          return await request(path, {
            method: "GET",
            ...options,
            headers: {
              ...options.headers,
              Accept: "application/vnd.pgrst.object+json"
            }
          });
        } catch (err) {
          if (err && err.status === 406) {
            return null;
          }
          throw err;
        }
      }
      async function insert(table, rows, options = {}) {
        requireClient(options, "insert");
        if (!table) {
          throw new Error("insert(): table is required");
        }
        if (rows === void 0 || rows === null) {
          throw new Error("insert(): rows are required");
        }
        options = addDbHeaders(options);
        buildPreferHeader(options.headers, "return=representation");
        const path = buildPath(table, options);
        return request(path, {
          method: "POST",
          ...options,
          body: rows
        });
      }
      async function update(table, changes, options = {}) {
        requireClient(options, "update");
        if (!table) {
          throw new Error("update(): table is required");
        }
        if (changes === void 0 || changes === null) {
          throw new Error("update(): changes are required");
        }
        options = addDbHeaders(options);
        buildPreferHeader(options.headers, "return=representation");
        const path = buildPath(table, options);
        return request(path, {
          method: "PATCH",
          ...options,
          body: changes
        });
      }
      async function remove(table, options = {}) {
        requireClient(options, "delete");
        if (!table) {
          throw new Error("delete(): table is required");
        }
        options = addDbHeaders(options);
        buildPreferHeader(options.headers, "return=representation");
        const path = buildPath(table, options);
        return request(path, {
          method: "DELETE",
          ...options
        });
      }
      async function rpc(fn, params = {}, options = {}) {
        requireClient(options, "rpc");
        if (!fn) {
          throw new Error("rpc(): function name is required");
        }
        return request(`rest/v1/rpc/${fn}`, {
          method: "POST",
          body: params,
          ...options
        });
      }
      module.exports = {
        createDb(client) {
          return {
            select(table, options = {}) {
              return select(table, withClient(options, client));
            },
            single(table, options = {}) {
              return single(table, withClient(options, client));
            },
            maybeSingle(table, options = {}) {
              return maybeSingle(table, withClient(options, client));
            },
            insert(table, rows, options = {}) {
              return insert(table, rows, withClient(options, client));
            },
            update(table, changes, options = {}) {
              return update(table, changes, withClient(options, client));
            },
            delete(table, options = {}) {
              return remove(table, withClient(options, client));
            },
            rpc(fn, params = {}, options = {}) {
              return rpc(fn, params, withClient(options, client));
            }
          };
        },
        select,
        single,
        maybeSingle,
        insert,
        update,
        delete: remove,
        rpc
      };
    }
  });

  // supabase-mini/src/filters.js
  var require_filters = __commonJS({
    "supabase-mini/src/filters.js"(exports, module) {
      function eq(field, value) {
        if (!field) {
          throw new Error("eq(): field is required");
        }
        return {
          eq: {
            [field]: value
          }
        };
      }
      function neq(field, value) {
        if (!field) {
          throw new Error("neq(): field is required");
        }
        return {
          neq: {
            [field]: value
          }
        };
      }
      function gt(field, value) {
        if (!field) {
          throw new Error("gt(): field is required");
        }
        return {
          gt: {
            [field]: value
          }
        };
      }
      function lt(field, value) {
        if (!field) {
          throw new Error("lt(): field is required");
        }
        return {
          lt: {
            [field]: value
          }
        };
      }
      function order(field, direction = "asc") {
        if (!field) {
          throw new Error("order(): field is required");
        }
        return {
          order: `${field}.${direction}`
        };
      }
      function limit(count) {
        if (count == null || count < 0) {
          throw new Error("limit(): count must be a non-negative number");
        }
        return {
          limit: count
        };
      }
      module.exports = {
        eq,
        neq,
        gt,
        lt,
        order,
        limit
      };
    }
  });

  // supabase-mini/src/functions.js
  var require_functions = __commonJS({
    "supabase-mini/src/functions.js"(exports, module) {
      var { request } = require_request();
      function withClient(options, client) {
        if (!client) {
          return options;
        }
        return {
          ...options,
          client
        };
      }
      function requireClient(options = {}, methodName = "functions") {
        if (!options.client) {
          throw new Error(`${methodName}(): must be called from a Supabase client`);
        }
      }
      async function invoke(functionName, data = {}, options = {}) {
        requireClient(options, "invoke");
        if (!functionName) {
          throw new Error("invoke(): functionName is required");
        }
        return request(`functions/v1/${functionName}`, {
          method: options.method || "POST",
          body: data,
          ...options
        });
      }
      module.exports = {
        createFunctions(client) {
          return {
            invoke(functionName, data = {}, options = {}) {
              return invoke(functionName, data, withClient(options, client));
            }
          };
        },
        invoke
      };
    }
  });

  // supabase-mini/src/index.js
  var require_src = __commonJS({
    "supabase-mini/src/index.js"(exports, module) {
      var { createRequest } = require_request();
      var authModule = require_auth();
      var dbModule = require_db();
      var filters = require_filters();
      var functionsModule = require_functions();
      function makeStorageKey(url) {
        return `supabase-mini:${url}:currentSession`;
      }
      function getStorageAdapter() {
        if (typeof zdjl !== "undefined") {
          return {
            getItem(key) {
              if (typeof zdjl.getStorage === "function") {
                return zdjl.getStorage(key);
              }
              return null;
            },
            setItem(key, value) {
              if (typeof zdjl.setStorage === "function") {
                zdjl.setStorage(key, value);
              }
            },
            removeItem(key) {
              if (typeof zdjl.removeStorage === "function") {
                zdjl.removeStorage(key);
              }
            }
          };
        }
        if (typeof localStorage !== "undefined") {
          return {
            getItem(key) {
              return localStorage.getItem(key);
            },
            setItem(key, value) {
              localStorage.setItem(key, value);
            },
            removeItem(key) {
              localStorage.removeItem(key);
            }
          };
        }
        return null;
      }
      function normalizeStoredSession(value) {
        if (!value) {
          return null;
        }
        if (typeof value === "object") {
          return value;
        }
        if (typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch (error) {
            return null;
          }
        }
        return null;
      }
      function getSessionEvent(session = {}, fallback = "SIGNED_IN") {
        if (session && session._authEvent) {
          return session._authEvent;
        }
        if (session && session._isRefresh) {
          return "TOKEN_REFRESHED";
        }
        return fallback;
      }
      var SupabaseClient = class {
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
          if (!this.persistSession || !this.storage || typeof this.storage.getItem !== "function") {
            return;
          }
          try {
            const session = normalizeStoredSession(this.storage.getItem(this.storageKey));
            if (session) {
              this._saveSession(session, {
                persist: false,
                notify: false,
                event: "INITIAL_SESSION"
              });
            }
          } catch (error) {
          }
        }
        _persistSession() {
          if (!this.persistSession || !this.storage || typeof this.storage.setItem !== "function") {
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
          }
        }
        _removePersistedSession() {
          if (!this.persistSession || !this.storage || typeof this.storage.removeItem !== "function") {
            return;
          }
          try {
            this.storage.removeItem(this.storageKey);
          } catch (error) {
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
          if (typeof callback !== "function") {
            throw new Error("onAuthStateChange(): callback is required");
          }
          this._authStateChangeCallbacks.push(callback);
          Promise.resolve().then(() => {
            callback("INITIAL_SESSION", this.getSession());
          }).catch((error) => {
            setTimeout(() => {
              throw error;
            }, 0);
          });
          return {
            unsubscribe: () => {
              this._authStateChangeCallbacks = this._authStateChangeCallbacks.filter((item) => item !== callback);
            }
          };
        }
        _saveSession(session = {}, options = {}) {
          if (!session || typeof session !== "object") {
            return;
          }
          this._session = {
            ...this._session || {},
            ...session
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
            this._notifyAuthStateChange(getSessionEvent(session, options.event || "SIGNED_IN"), this.getSession());
          }
        }
        _clearSession(options = {}) {
          this.accessToken = null;
          this.refreshToken = null;
          this._session = null;
          this._removePersistedSession();
          if (options.notify !== false) {
            this._notifyAuthStateChange(options.event || "SIGNED_OUT", null);
          }
        }
        getSession() {
          if (!this._session && !this.accessToken && !this.refreshToken) {
            return null;
          }
          return {
            ...this._session || {},
            access_token: this.accessToken,
            refresh_token: this.refreshToken
          };
        }
      };
      function createClient(url, apiKey, options = {}) {
        if (!url) {
          throw new Error("createClient(): url is required");
        }
        if (!apiKey) {
          throw new Error("createClient(): apiKey is required");
        }
        return new SupabaseClient(url, apiKey, options);
      }
      module.exports = {
        SupabaseClient,
        filters,
        createClient
      };
    }
  });
  return require_src();
})();
// 启动脚本时创建Supabase实例，并将其赋值给环境变量supabase
const supabase = Supabase.createClient("https://rftynrclbvnmemjvmrmx.supabase.co", "sb_publishable_vbOO5YSdR2C1mi_sWDmrhQ_nbdur_FE")
zdjl.setVar("supabase", supabase);