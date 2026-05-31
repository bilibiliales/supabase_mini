const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIST_PATH = path.resolve(__dirname, '../../dist/supabase-mini.js');

const PROJECTS = {
  a: {
    name: 'project-a',
    url: 'https://aowdwnsrqgpcgqhmmggv.supabase.co',
    key: 'sb_publishable_RkGQT6lO3Alp6kDtG8k33Q_lchShzCt',
    table: 'profiles',
    id: '00000000-0000-0000-0000-0000000000a1',
    row: {
      username: 'mini_a',
      website: 'https://example.com/a',
      avatar_url: 'https://example.com/a.png',
    },
    update: {
      username: 'mini_a_updated',
    },
  },
  b: {
    name: 'project-b',
    url: 'https://rftynrclbvnmemjvmrmx.supabase.co',
    key: 'sb_publishable_vbOO5YSdR2C1mi_sWDmrhQ_nbdur_FE',
    table: 'profile',
    id: '00000000-0000-0000-0000-0000000000b1',
    row: {
      nickname: 'mini_b',
      role: 'tester',
      exp: 1,
    },
    update: {
      nickname: 'mini_b_updated',
      exp: 2,
    },
  },
};

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${message}. Expected ${expectedJson}, got ${actualJson}`);
  }
}

function flushMicrotasks() {
  return Promise.resolve();
}

function makeResponse(status, body, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    headers: {
      get(name) {
        return name.toLowerCase() === 'content-type' ? contentType : '';
      },
    },
    text() {
      if (body === undefined || body === null) {
        return Promise.resolve('');
      }

      return Promise.resolve(contentType.includes('json') ? JSON.stringify(body) : String(body));
    },
  };
}

function loadSupabase(fetchImpl = fetch, extraContext = {}) {
  const context = {
    fetch: fetchImpl,
    setTimeout,
    clearTimeout,
    URLSearchParams,
    console,
    ...extraContext,
  };

  vm.createContext(context);
  vm.runInContext(fs.readFileSync(DIST_PATH, 'utf8'), context, {
    filename: DIST_PATH,
  });

  if (!context.Supabase) {
    throw new Error('dist/supabase-mini.js did not expose global Supabase');
  }

  return context.Supabase;
}

function createMockFetch() {
  const state = {
    calls: [],
    refreshCountByProject: {},
    rows: {
      [PROJECTS.a.url]: {},
      [PROJECTS.b.url]: {},
    },
  };

  function projectFromUrl(url) {
    const project = Object.values(PROJECTS).find((item) => url.startsWith(item.url));
    if (!project) {
      throw new Error(`Unexpected request URL: ${url}`);
    }

    return project;
  }

  function getAuth(headers = {}) {
    return headers.Authorization || headers.authorization || '';
  }

  function getApiKey(headers = {}) {
    return headers.apikey;
  }

  function parseBody(body) {
    if (!body) {
      return null;
    }

    if (typeof body === 'string') {
      try {
        return JSON.parse(body);
      } catch (error) {
        return body;
      }
    }

    return body;
  }

  function authSession(project, tag) {
    return {
      access_token: `${project.name}-${tag}-access`,
      refresh_token: `${project.name}-${tag}-refresh`,
      token_type: 'bearer',
      expires_in: 3600,
      user: {
        id: project.id,
        email: `${tag}@example.com`,
      },
    };
  }

  async function mockFetch(url, options = {}) {
    const project = projectFromUrl(url);
    const method = (options.method || 'GET').toUpperCase();
    const body = parseBody(options.body);
    const headers = options.headers || {};
    const pathname = url.replace(project.url, '').replace(/^\//, '');

    state.calls.push({
      url,
      method,
      headers,
      body,
      project: project.name,
    });

    assertEqual(getApiKey(headers), project.key, `${project.name} request should include its own apikey`);

    if (pathname.startsWith('auth/v1/signup')) {
      return makeResponse(200, authSession(project, 'signup'));
    }

    if (pathname.startsWith('auth/v1/token?grant_type=password')) {
      if (body && body.email === 'bad@example.com') {
        return makeResponse(401, { message: 'Invalid login credentials' });
      }

      return makeResponse(200, authSession(project, 'signin'));
    }

    if (pathname.startsWith('auth/v1/token?grant_type=refresh_token')) {
      state.refreshCountByProject[project.name] = (state.refreshCountByProject[project.name] || 0) + 1;
      const count = state.refreshCountByProject[project.name];
      return makeResponse(200, {
        access_token: `${project.name}-refreshed-${count}-access`,
        refresh_token: `${project.name}-refreshed-${count}-refresh`,
        token_type: 'bearer',
        expires_in: 3600,
        user: {
          id: project.id,
          email: `refresh-${count}@example.com`,
        },
      });
    }

    if (pathname.startsWith('auth/v1/user')) {
      if (!getAuth(headers)) {
        return makeResponse(401, { message: 'missing auth' });
      }

      return makeResponse(200, {
        id: project.id,
        email: `${project.name}@example.com`,
      });
    }

    if (pathname.startsWith('auth/v1/logout')) {
      return makeResponse(204, null);
    }

    if (pathname.startsWith('functions/v1/')) {
      return makeResponse(200, {
        functionName: pathname.replace('functions/v1/', ''),
        received: body,
        project: project.name,
      });
    }

    if (pathname.startsWith('rest/v1/rpc/')) {
      return makeResponse(200, {
        rpc: pathname.replace('rest/v1/rpc/', ''),
        params: body,
        project: project.name,
      });
    }

    if (pathname.startsWith(`rest/v1/${project.table}`)) {
      const rows = state.rows[project.url];

      if (method === 'GET') {
        if (getAuth(headers).includes('expired-token')) {
          return makeResponse(401, { message: 'expired token' });
        }

        const values = Object.values(rows);
        const accept = headers.Accept || headers.accept || '';
        if (accept.includes('vnd.pgrst.object+json')) {
          if (values.length === 0) {
            return makeResponse(406, { message: 'Results contain 0 rows' });
          }

          return makeResponse(200, values[0]);
        }

        return makeResponse(200, values);
      }

      if (method === 'POST') {
        const id = body.id || project.id;
        const row = {
          id,
          created_at: '2026-05-30T00:00:00.000Z',
          ...body,
        };
        rows[id] = row;
        return makeResponse(201, [row]);
      }

      if (method === 'PATCH') {
        const id = Object.keys(rows)[0] || project.id;
        rows[id] = {
          id,
          ...(rows[id] || {}),
          ...body,
        };
        return makeResponse(200, [rows[id]]);
      }

      if (method === 'DELETE') {
        const deleted = Object.values(rows);
        Object.keys(rows).forEach((id) => {
          delete rows[id];
        });
        return makeResponse(200, deleted);
      }
    }

    return makeResponse(404, { message: `Unhandled mock route: ${method} ${pathname}` });
  }

  mockFetch.state = state;
  return mockFetch;
}

async function expectReject(fn, expectedMessage) {
  try {
    await fn();
  } catch (error) {
    assert(
      error.message.includes(expectedMessage),
      `Expected rejection containing "${expectedMessage}", got "${error.message}"`
    );
    return;
  }

  throw new Error(`Expected rejection containing "${expectedMessage}"`);
}

function createClients(Supabase) {
  return {
    supabaseClient: Supabase.createClient(PROJECTS.a.url, PROJECTS.a.key),
    supabaseClient2: Supabase.createClient(PROJECTS.b.url, PROJECTS.b.key),
  };
}

test('dist exposes only the public instance-safe API', async () => {
  const Supabase = loadSupabase();
  assertDeepEqual(
    Object.keys(Supabase).sort(),
    ['SupabaseClient', 'createClient', 'filters'],
    'dist public API should stay minimal'
  );
  assertEqual(typeof Supabase.createClient, 'function', 'createClient should exist');
  assertEqual(typeof Supabase.SupabaseClient, 'function', 'SupabaseClient should exist');
});

test('createClient creates isolated clients for both real projects', async () => {
  const Supabase = loadSupabase();
  const { supabaseClient, supabaseClient2 } = createClients(Supabase);

  assertEqual(supabaseClient.url, PROJECTS.a.url, 'project A url should be bound to client A');
  assertEqual(supabaseClient.apiKey, PROJECTS.a.key, 'project A key should be bound to client A');
  assertEqual(supabaseClient2.url, PROJECTS.b.url, 'project B url should be bound to client B');
  assertEqual(supabaseClient2.apiKey, PROJECTS.b.key, 'project B key should be bound to client B');
  assert(supabaseClient.auth !== supabaseClient2.auth, 'auth modules should be instance scoped');
  assert(supabaseClient.db !== supabaseClient2.db, 'db modules should be instance scoped');
  assert(supabaseClient.functions !== supabaseClient2.functions, 'function modules should be instance scoped');
});

test('filters helpers build REST filter objects', async () => {
  const Supabase = loadSupabase();

  assertDeepEqual(Supabase.filters.eq('id', 1), { eq: { id: 1 } }, 'eq filter should match');
  assertDeepEqual(Supabase.filters.neq('role', 'admin'), { neq: { role: 'admin' } }, 'neq filter should match');
  assertDeepEqual(Supabase.filters.gt('exp', 1), { gt: { exp: 1 } }, 'gt filter should match');
  assertDeepEqual(Supabase.filters.lt('exp', 10), { lt: { exp: 10 } }, 'lt filter should match');
  assertDeepEqual(Supabase.filters.order('created_at', 'desc'), { order: 'created_at.desc' }, 'order filter should match');
  assertDeepEqual(Supabase.filters.limit(2), { limit: 2 }, 'limit filter should match');
});

test('auth covers signUp, signIn, getUser, refresh, session and logout', async () => {
  const mockFetch = createMockFetch();
  const Supabase = loadSupabase(mockFetch);
  const { supabaseClient } = createClients(Supabase);

  const signUp = await supabaseClient.auth.signUp({
    email: 'signup@example.com',
    password: 'password-123',
    data: { source: 'dist-test' },
  });
  assertEqual(signUp.access_token, 'project-a-signup-access', 'signUp should return mocked session');
  assertEqual(supabaseClient.auth.getAccessToken(), 'project-a-signup-access', 'signUp should save access token');

  const signIn = await supabaseClient.auth.signIn({
    email: 'signin@example.com',
    password: 'password-123',
  });
  assertEqual(signIn.access_token, 'project-a-signin-access', 'signIn should return mocked session');
  assertEqual(supabaseClient.auth.session().access_token, 'project-a-signin-access', 'session should expose signIn token');

  const user = await supabaseClient.auth.getUser();
  assertEqual(user.id, PROJECTS.a.id, 'getUser should use current client token');

  const refreshed = await supabaseClient.auth.refresh(supabaseClient.auth.getRefreshToken());
  assertEqual(refreshed.access_token, 'project-a-refreshed-1-access', 'refresh should return new session');
  assertEqual(supabaseClient.getSession().access_token, 'project-a-refreshed-1-access', 'refresh should save new session');

  await supabaseClient.auth.logout();
  assertEqual(supabaseClient.auth.session(), null, 'logout should clear session');
  assertEqual(supabaseClient.auth.getAccessToken(), null, 'logout should clear access token');
});

test('session persists through zdjl storage and reloads into a new client', async () => {
  const mockFetch = createMockFetch();
  const store = {};
  const zdjl = {
    setStorage(key, value) {
      store[key] = value;
    },
    getStorage(key) {
      return store[key] || null;
    },
    removeStorage(key) {
      delete store[key];
    },
  };
  const Supabase = loadSupabase(mockFetch, { zdjl });
  const storageKey = 'currentSession';

  const supabaseClient = Supabase.createClient(PROJECTS.a.url, PROJECTS.a.key, { storageKey });
  await supabaseClient.auth.signIn({
    email: 'signin@example.com',
    password: 'password-123',
  });

  assert(store[storageKey], 'signIn should persist session through zdjl.setStorage');
  assertEqual(JSON.parse(store[storageKey]).access_token, 'project-a-signin-access', 'stored session should include token');

  const restoredClient = Supabase.createClient(PROJECTS.a.url, PROJECTS.a.key, { storageKey });
  assertEqual(restoredClient.auth.getAccessToken(), 'project-a-signin-access', 'new client should load stored session');

  const events = [];
  let initialized = false;
  restoredClient.auth.onAuthStateChange((event, session) => {
    events.push({
      event,
      accessToken: session && session.access_token,
      initialized,
    });
  });
  initialized = true;
  await flushMicrotasks();
  assertDeepEqual(
    events,
    [{ event: 'INITIAL_SESSION', accessToken: 'project-a-signin-access', initialized: true }],
    'subscription should receive restored session as async INITIAL_SESSION'
  );

  restoredClient.auth.clearSession();
  assertEqual(store[storageKey], undefined, 'clearSession should call zdjl.removeStorage');
  assert(store[storageKey] !== 'null', 'clearSession should not persist the string "null"');
});

test('session falls back to browser localStorage when zdjl is unavailable', async () => {
  const mockFetch = createMockFetch();
  const store = {};
  const localStorage = {
    setItem(key, value) {
      store[key] = value;
    },
    getItem(key) {
      return store[key] || null;
    },
    removeItem(key) {
      delete store[key];
    },
  };
  const Supabase = loadSupabase(mockFetch, { localStorage });

  const supabaseClient = Supabase.createClient(PROJECTS.b.url, PROJECTS.b.key);
  await supabaseClient.auth.signIn({
    email: 'signin@example.com',
    password: 'password-123',
  });

  const storageKey = `supabase-mini:${PROJECTS.b.url}:currentSession`;
  assert(store[storageKey], 'signIn should persist session through localStorage');

  const restoredClient = Supabase.createClient(PROJECTS.b.url, PROJECTS.b.key);
  assertEqual(restoredClient.auth.getAccessToken(), 'project-b-signin-access', 'new client should load localStorage session');
});

test('auth state change emits signed in, token refreshed and signed out events', async () => {
  const mockFetch = createMockFetch();
  const Supabase = loadSupabase(mockFetch);
  const { supabaseClient } = createClients(Supabase);
  const events = [];

  const subscription = supabaseClient.auth.onAuthStateChange((event, session) => {
    events.push({
      event,
      accessToken: session && session.access_token,
    });
  });
  await flushMicrotasks();

  await supabaseClient.auth.signIn({
    email: 'signin@example.com',
    password: 'password-123',
  });
  await supabaseClient.auth.refresh(supabaseClient.auth.getRefreshToken());
  await supabaseClient.auth.logout();

  assertDeepEqual(
    events,
    [
      { event: 'INITIAL_SESSION', accessToken: null },
      { event: 'SIGNED_IN', accessToken: 'project-a-signin-access' },
      { event: 'TOKEN_REFRESHED', accessToken: 'project-a-refreshed-1-access' },
      { event: 'SIGNED_OUT', accessToken: null },
    ],
    'auth state events should follow auth actions'
  );

  subscription.unsubscribe();
  await supabaseClient.auth.signIn({
    email: 'signin@example.com',
    password: 'password-123',
  });
  assertEqual(events.length, 4, 'unsubscribe should stop future events');
});

test('saveSession can emit an explicit auth event', async () => {
  const mockFetch = createMockFetch();
  const Supabase = loadSupabase(mockFetch);
  const { supabaseClient } = createClients(Supabase);
  const events = [];

  supabaseClient.auth.onAuthStateChange((event, session) => {
    events.push({
      event,
      accessToken: session && session.access_token,
    });
  });
  await flushMicrotasks();
  supabaseClient.auth.saveSession(
    {
      access_token: 'manual-refresh-token',
      refresh_token: 'manual-refresh-refresh',
    },
    { event: 'TOKEN_REFRESHED' }
  );

  assertDeepEqual(
    events,
    [
      { event: 'INITIAL_SESSION', accessToken: null },
      { event: 'TOKEN_REFRESHED', accessToken: 'manual-refresh-token' },
    ],
    'saveSession should honor explicit event option'
  );
});

test('database covers select, single, maybeSingle, insert, update, delete and rpc', async () => {
  const mockFetch = createMockFetch();
  const Supabase = loadSupabase(mockFetch);
  const { supabaseClient, supabaseClient2 } = createClients(Supabase);

  supabaseClient.auth.saveSession({ access_token: 'project-a-token', refresh_token: 'project-a-refresh' });
  supabaseClient2.auth.saveSession({ access_token: 'project-b-token', refresh_token: 'project-b-refresh' });

  assertEqual(await supabaseClient.db.maybeSingle(PROJECTS.a.table), null, 'maybeSingle should return null for 406');

  const insertedA = await supabaseClient.db.insert(PROJECTS.a.table, {
    id: PROJECTS.a.id,
    ...PROJECTS.a.row,
  });
  assertEqual(insertedA[0].username, PROJECTS.a.row.username, 'project A insert should return row');

  const selectedA = await supabaseClient.db.select(PROJECTS.a.table, {
    select: '*',
    eq: { id: PROJECTS.a.id },
    limit: 1,
  });
  assertEqual(selectedA.length, 1, 'project A select should return inserted row');

  const singleA = await supabaseClient.db.single(PROJECTS.a.table, {
    eq: { id: PROJECTS.a.id },
  });
  assertEqual(singleA.username, PROJECTS.a.row.username, 'project A single should return object');

  const updatedA = await supabaseClient.db.update(PROJECTS.a.table, PROJECTS.a.update, {
    eq: { id: PROJECTS.a.id },
  });
  assertEqual(updatedA[0].username, PROJECTS.a.update.username, 'project A update should return changed row');

  const rpcA = await supabaseClient.db.rpc('debug_echo', { hello: 'world' });
  assertEqual(rpcA.rpc, 'debug_echo', 'rpc should call function path');

  const deletedA = await supabaseClient.db.delete(PROJECTS.a.table, {
    eq: { id: PROJECTS.a.id },
  });
  assertEqual(deletedA.length, 1, 'project A delete should return deleted row');

  const insertedB = await supabaseClient2.db.insert(PROJECTS.b.table, {
    id: PROJECTS.b.id,
    ...PROJECTS.b.row,
  });
  assertEqual(insertedB[0].nickname, PROJECTS.b.row.nickname, 'project B insert should use its own table');
});

test('functions.invoke posts to the bound project', async () => {
  const mockFetch = createMockFetch();
  const Supabase = loadSupabase(mockFetch);
  const { supabaseClient, supabaseClient2 } = createClients(Supabase);

  const resultA = await supabaseClient.functions.invoke('hello-a', { project: 'a' });
  const resultB = await supabaseClient2.functions.invoke('hello-b', { project: 'b' });

  assertEqual(resultA.functionName, 'hello-a', 'project A function should be invoked');
  assertEqual(resultA.project, 'project-a', 'project A function should use client A');
  assertEqual(resultB.functionName, 'hello-b', 'project B function should be invoked');
  assertEqual(resultB.project, 'project-b', 'project B function should use client B');
});

test('request covers custom request, headers, timeout option and instance routing', async () => {
  const mockFetch = createMockFetch();
  const Supabase = loadSupabase(mockFetch);
  const { supabaseClient, supabaseClient2 } = createClients(Supabase);

  supabaseClient.auth.saveSession({ access_token: 'token-a', refresh_token: 'refresh-a' });
  supabaseClient2.auth.saveSession({ access_token: 'token-b', refresh_token: 'refresh-b' });

  await supabaseClient.request(`rest/v1/${PROJECTS.a.table}`, {
    timeout: 1000,
    headers: { Prefer: 'count=exact' },
  });
  await supabaseClient2.request(`rest/v1/${PROJECTS.b.table}`, {
    timeout: 1000,
  });

  const [callA, callB] = mockFetch.state.calls;
  assert(callA.url.startsWith(PROJECTS.a.url), 'client A request should hit project A');
  assert(callB.url.startsWith(PROJECTS.b.url), 'client B request should hit project B');
  assertEqual(callA.headers.Authorization, 'Bearer token-a', 'client A request should use token A');
  assertEqual(callB.headers.Authorization, 'Bearer token-b', 'client B request should use token B');
});

test('request timeout works without AbortController', async () => {
  const neverFetch = () => new Promise(() => {});
  const Supabase = loadSupabase(neverFetch);
  const { supabaseClient } = createClients(Supabase);

  await expectReject(
    () => supabaseClient.request(`rest/v1/${PROJECTS.a.table}`, { timeout: 1 }),
    'Request timed out after 1ms'
  );
});

test('auto refresh retries with the client access token, not stale option token', async () => {
  const mockFetch = createMockFetch();
  const Supabase = loadSupabase(mockFetch);
  const { supabaseClient } = createClients(Supabase);

  supabaseClient.auth.saveSession({
    access_token: 'expired-token',
    refresh_token: 'project-a-refresh',
  });

  await supabaseClient.request(`rest/v1/${PROJECTS.a.table}`, {
    token: 'expired-token',
  });

  const authHeaders = mockFetch.state.calls.map((call) => call.headers.Authorization).filter(Boolean);
  assert(authHeaders.includes('Bearer project-a-refreshed-1-access'), 'retry should use refreshed client token');
  assertEqual(mockFetch.state.refreshCountByProject['project-a'], 1, 'refresh should run once for one client');
});

test('auto refresh emits TOKEN_REFRESHED event', async () => {
  const mockFetch = createMockFetch();
  const Supabase = loadSupabase(mockFetch);
  const { supabaseClient } = createClients(Supabase);
  const events = [];

  supabaseClient.auth.onAuthStateChange((event, session) => {
    events.push({
      event,
      accessToken: session && session.access_token,
    });
  });
  await flushMicrotasks();
  supabaseClient.auth.saveSession({
    access_token: 'expired-token',
    refresh_token: 'project-a-refresh',
  });

  await supabaseClient.request(`rest/v1/${PROJECTS.a.table}`);

  assert(
    events.some((item) => item.event === 'TOKEN_REFRESHED' && item.accessToken === 'project-a-refreshed-1-access'),
    'auto refresh should emit TOKEN_REFRESHED'
  );
});

test('auth endpoint 401 does not trigger refresh', async () => {
  const mockFetch = createMockFetch();
  const Supabase = loadSupabase(mockFetch);
  const { supabaseClient } = createClients(Supabase);

  supabaseClient.auth.saveSession({
    access_token: 'old-token',
    refresh_token: 'refresh-token',
  });

  await expectReject(
    () => supabaseClient.auth.signIn({ email: 'bad@example.com', password: 'wrong-password' }),
    'Request failed: 401 Invalid login credentials'
  );
  assertEqual(mockFetch.state.refreshCountByProject['project-a'], undefined, 'auth 401 should not refresh');
});

test('same client deduplicates concurrent refresh, separate clients do not share refresh promises', async () => {
  const mockFetch = createMockFetch();
  const Supabase = loadSupabase(mockFetch);
  const { supabaseClient, supabaseClient2 } = createClients(Supabase);

  supabaseClient.auth.saveSession({
    access_token: 'expired-token',
    refresh_token: 'shared-refresh-token',
  });

  await Promise.all([
    supabaseClient.request(`rest/v1/${PROJECTS.a.table}`),
    supabaseClient.request(`rest/v1/${PROJECTS.a.table}`),
  ]);
  assertEqual(mockFetch.state.refreshCountByProject['project-a'], 1, 'same client should dedupe refresh');

  supabaseClient2.auth.saveSession({
    access_token: 'expired-token',
    refresh_token: 'shared-refresh-token',
  });

  await Promise.all([
    supabaseClient.request(`rest/v1/${PROJECTS.a.table}`),
    supabaseClient2.request(`rest/v1/${PROJECTS.b.table}`),
  ]);
  assertEqual(mockFetch.state.refreshCountByProject['project-a'], 1, 'client A should not refresh again after valid token');
  assertEqual(mockFetch.state.refreshCountByProject['project-b'], 1, 'client B should refresh independently');
});

test('public API does not allow bare auth/db/functions/request usage', async () => {
  const Supabase = loadSupabase();
  assertEqual(Supabase.auth, undefined, 'bare auth should not be exported');
  assertEqual(Supabase.db, undefined, 'bare db should not be exported');
  assertEqual(Supabase.functions, undefined, 'bare functions should not be exported');
  assertEqual(Supabase.request, undefined, 'bare request should not be exported');
});

async function runLiveSmokeTests() {
  if (process.env.RUN_LIVE_SUPABASE !== '1') {
    console.log('[skip] live Supabase smoke tests skipped; set RUN_LIVE_SUPABASE=1 to enable');
    return;
  }

  const Supabase = loadSupabase(fetch);
  const { supabaseClient, supabaseClient2 } = createClients(Supabase);

  await Promise.all([
    supabaseClient.db.select(PROJECTS.a.table, { select: 'id,username,website,avatar_url', limit: 1 }),
    supabaseClient2.db.select(PROJECTS.b.table, { select: 'id,nickname,role,exp', limit: 1 }),
  ]);

  console.log('[pass] live anonymous select smoke tests passed');

  const email = process.env.SUPABASE_TEST_EMAIL;
  const password = process.env.SUPABASE_TEST_PASSWORD;
  if (!email || !password) {
    console.log('[skip] live auth smoke tests skipped; set SUPABASE_TEST_EMAIL and SUPABASE_TEST_PASSWORD');
    return;
  }

  await supabaseClient.auth.signIn({ email, password });
  await supabaseClient.auth.getUser();
  await supabaseClient.auth.logout();
  console.log('[pass] live auth smoke tests passed');
}

async function run() {
  let passed = 0;

  for (const item of tests) {
    try {
      await item.fn();
      passed += 1;
      console.log(`[pass] ${item.name}`);
    } catch (error) {
      console.error(`[fail] ${item.name}`);
      console.error(error && error.stack ? error.stack : error);
      process.exitCode = 1;
      return;
    }
  }

  console.log(`\n${passed}/${tests.length} dist-only coverage tests passed`);
  await runLiveSmokeTests();
}

if (require.main === module) {
  run();
}

module.exports = {
  PROJECTS,
  loadSupabase,
  run,
};
