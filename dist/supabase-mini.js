var Supabase = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // supabase-mini/src/runtime.js
  var require_runtime = __commonJS({
    "supabase-mini/src/runtime.js"(exports, module) {
      function getVarValue(name) {
        if (typeof zdjl !== "undefined" && typeof zdjl.getVar === "function") {
          return zdjl.getVar(name, "global");
        }
        if (typeof process !== "undefined" && process.env) {
          return process.env[name];
        }
        return void 0;
      }
      function setVarValue(name, value) {
        if (typeof zdjl !== "undefined" && typeof zdjl.setVar === "function") {
          return zdjl.setVar(name, value, "global");
        }
        if (typeof process !== "undefined" && process.env) {
          if (value === void 0) {
            delete process.env[name];
          } else {
            process.env[name] = value;
          }
        }
      }
      function getUrl() {
        return getVarValue("SUPABASE_URL");
      }
      function getApiKey() {
        return getVarValue("SUPABASE_API_KEY") || getVarValue("SUPABASE_PUBLISHABLE_KEY");
      }
      function getAccessToken() {
        return getVarValue("SUPABASE_ACCESS_TOKEN") || getVarValue("SUPABASE_BEARER_TOKEN");
      }
      function getRefreshToken() {
        return getVarValue("SUPABASE_REFRESH_TOKEN");
      }
      function saveSession(session = {}) {
        if (!session || typeof session !== "object") {
          return;
        }
        if (session.access_token) {
          setVarValue("SUPABASE_ACCESS_TOKEN", session.access_token);
        }
        if (session.refresh_token) {
          setVarValue("SUPABASE_REFRESH_TOKEN", session.refresh_token);
        }
      }
      function clearSession() {
        setVarValue("SUPABASE_ACCESS_TOKEN", void 0);
        setVarValue("SUPABASE_REFRESH_TOKEN", void 0);
      }
      module.exports = {
        getUrl,
        getApiKey,
        getAccessToken,
        getRefreshToken,
        saveSession,
        clearSession
      };
    }
  });

  // supabase-mini/src/auth.js
  var require_auth = __commonJS({
    "supabase-mini/src/auth.js"(exports, module) {
      var { request } = require_request();
      var runtime = require_runtime();
      async function signUp(credentials = {}, options = {}) {
        const { email, password, data } = credentials;
        if (!email || !password) {
          throw new Error("signUp(): email and password are required");
        }
        const result = await request("auth/v1/signup", {
          method: "POST",
          body: { email, password, data },
          ...options
        });
        runtime.saveSession(result);
        return result;
      }
      async function signIn(credentials = {}, options = {}) {
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
        runtime.saveSession(result);
        return result;
      }
      async function refresh(refreshToken, options = {}) {
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
        runtime.saveSession(result);
        return result;
      }
      async function getUser(options = {}) {
        return request("auth/v1/user", {
          method: "GET",
          ...options
        });
      }
      async function logout(options = {}) {
        const { refreshToken } = options;
        const result = await request("auth/v1/logout", {
          method: "POST",
          body: refreshToken ? { refresh_token: refreshToken } : void 0,
          ...options
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
        clearSession
      };
    }
  });

  // supabase-mini/src/request.js
  var require_request = __commonJS({
    "supabase-mini/src/request.js"(exports, module) {
      var DEFAULT_TIMEOUT = 3e4;
      var runtime = require_runtime();
      var refreshingPromise = null;
      function buildHeaders(options = {}) {
        const headers = {
          ...options.headers
        };
        const method = (options.method || "GET").toUpperCase();
        const hasBody = options.body !== void 0 && options.body !== null;
        if (hasBody && !headers["Content-Type"] && !headers["content-type"]) {
          if (options.body instanceof URLSearchParams) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
          } else {
            headers["Content-Type"] = "application/json";
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
      async function refreshSession(baseUrl, apiKey) {
        if (!refreshingPromise) {
          refreshingPromise = (async () => {
            const refreshToken = runtime.getRefreshToken();
            if (!refreshToken) {
              throw new Error("No refresh token available for session refresh");
            }
            const { refresh } = require_auth();
            const result = await refresh(refreshToken, {
              baseUrl,
              apikey: apiKey,
              _retry: true
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
          throw new Error("request(): path is required");
        }
        const baseUrl = options.baseUrl || runtime.getUrl();
        if (!baseUrl) {
          throw new Error("request(): SUPABASE_URL is required in environment variables or options");
        }
        const url = path.startsWith("http") ? path : `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
        const timeout = options.timeout != null ? options.timeout : DEFAULT_TIMEOUT;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, timeout);
        const fetchOptions = {
          method: options.method || "GET",
          headers: buildHeaders(options),
          signal: controller.signal
        };
        const bodyPayload = getBodyPayload(options);
        if (bodyPayload !== void 0) {
          fetchOptions.body = bodyPayload;
        }
        let response;
        try {
          response = await fetch(url, fetchOptions);
        } catch (networkError) {
          if (networkError.name === "AbortError") {
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
              _retry: true
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
        request
      };
    }
  });

  // supabase-mini/src/db.js
  var require_db = __commonJS({
    "supabase-mini/src/db.js"(exports, module) {
      var { request } = require_request();
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
        if (!table) {
          throw new Error("single(): table is required");
        }
        options = addDbHeaders(options);
        const path = buildPath(table, options);
        return request(path, {
          method: "GET",
          headers: {
            Accept: "application/vnd.pgrst.object+json",
            ...options.headers
          },
          ...options
        });
      }
      async function maybeSingle(table, options = {}) {
        if (!table) {
          throw new Error("maybeSingle(): table is required");
        }
        options = addDbHeaders(options);
        const path = buildPath(table, options);
        try {
          return await request(path, {
            method: "GET",
            headers: {
              Accept: "application/vnd.pgrst.object+json",
              ...options.headers
            },
            ...options
          });
        } catch (err) {
          if (err && err.status === 406) {
            return null;
          }
          throw err;
        }
      }
      async function insert(table, rows, options = {}) {
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
      async function invoke(functionName, data = {}, options = {}) {
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
        invoke
      };
    }
  });

  // supabase-mini/src/index.js
  var require_src = __commonJS({
    "supabase-mini/src/index.js"(exports, module) {
      var { request } = require_request();
      var auth = require_auth();
      var db = require_db();
      var filters = require_filters();
      var functions = require_functions();
      var runtime = require_runtime();
      module.exports = {
        request,
        auth,
        db,
        filters,
        functions,
        runtime
      };
    }
  });
  return require_src();
})();
zdjl.setVar("Supabase", Supabase, "global");