# supabase-mini

`supabase-mini` 是一个纯 JavaScript 的 Supabase REST mini SDK。它只封装 Auth、PostgREST Database API 和 Edge Functions invoke，不实现官方 SDK 的完整能力。

## 核心模型

当前结构是 instance-bound：

```js
const { createClient } = require('./src');

const supabase = createClient(
  'https://your-project.supabase.co',
  'sb_publishable_...'
);
```

可选第三个参数用于控制 session 持久化：

```js
const supabase = createClient(url, apiKey, {
  storageKey: 'currentSession',
  persistSession: true,
});
```

client 状态全部保存在实例上：

- `supabase.url`
- `supabase.apiKey`
- `supabase.accessToken`
- `supabase.refreshToken`
- `supabase.auth`
- `supabase.db`
- `supabase.functions`

不会通过 `runtime` 或环境变量共享配置。多个 client 可以安全并存：

```js
const a = createClient('https://a.supabase.co', 'key-a');
const b = createClient('https://b.supabase.co', 'key-b');

a.url !== b.url;
a.auth !== b.auth;
```

## Auth

```js
await supabase.auth.signIn({
  email: 'user@example.com',
  password: 'password',
});

const session = supabase.auth.session();
```

可用方法：

- `signUp({ email, password, data })`
- `signIn({ email, password })`
- `refresh(refreshToken)`
- `getUser()`
- `logout()`
- `saveSession(session)`
- `clearSession()`
- `session()`
- `getSession()`
- `getAccessToken()`
- `getRefreshToken()`

`signUp`、`signIn`、`refresh` 返回 session 后，会写入当前 client。可以通过 `supabase.auth.session()` 或 `supabase.getSession()` 显式查看。

监听 auth 状态变化：

```js
const subscription = supabase.auth.onAuthStateChange((event, session) => {
  console.log(event, session);
});

subscription.unsubscribe();
```

当前支持：

- `INITIAL_SESSION`
- `SIGNED_IN`
- `SIGNED_OUT`
- `TOKEN_REFRESHED`

注册监听器后会异步收到一次 `INITIAL_SESSION`，session 参数为当前已恢复的 session 或 `null`。这表示 SDK 初始化后的当前状态，不代表用户刚刚登录。

`saveSession` 默认触发 `SIGNED_IN`，也可以显式指定事件：

```js
supabase.auth.saveSession(session, {
  event: 'INITIAL_SESSION',
});
```

当 session 为空时，SDK 会删除持久化存储，不会写入 `"null"` 字符串。

session 会自动持久化。脚本环境优先使用：

```js
zdjl.setStorage('key1', '内容1');
zdjl.getStorage('key1');
zdjl.removeStorage('key1');
```

没有 `zdjl` 时，浏览器会回退到等效的 `localStorage`：

```js
localStorage.setItem('key1', '内容1');
localStorage.getItem('key1');
localStorage.removeItem('key1');
```

默认 storage key 会按 Supabase URL 隔离：

```txt
supabase-mini:<supabase-url>:currentSession
```

如需固定 key 或禁用持久化：

```js
createClient(url, apiKey, { storageKey: 'currentSession' });
createClient(url, apiKey, { persistSession: false });
```

## Database

```js
await supabase.db.select('todos', {
  select: '*',
  eq: { done: false },
});
```

可用方法：

- `select(table, options)`
- `single(table, options)`
- `maybeSingle(table, options)`
- `insert(table, rows, options)`
- `update(table, changes, options)`
- `delete(table, options)`
- `rpc(fn, params, options)`

## Functions

```js
await supabase.functions.invoke('my-function', {
  hello: 'world',
});
```

## Request 约束

底层 request 必须绑定 client，所有 Supabase API 都应该从 client 实例访问：

```js
await supabase.request('rest/v1/todos');
await supabase.auth.getUser();
await supabase.db.select('todos');
await supabase.functions.invoke('my-function');
```

不要裸调用：

```js
request('rest/v1/todos');
```

裸调用会抛出：

```txt
request(): request must be bound to a Supabase client
```

这个限制是刻意的，用来保证不会重新引入全局状态或环境变量 fallback。

主入口只导出 `createClient`、`SupabaseClient` 和 `filters`。裸 `auth/db/functions` 不作为公开 API 使用。

## Refresh 去重

自动 refresh 使用 `WeakMap<client, Promise>`。

同一个 client 内并发刷新时，只会发出一个 refresh 请求。不同 client 即使 refresh token 相同，也不会共用 refresh promise。

refresh 成功后会先写回当前 client session，再用 client 上的新 access token 重试请求。如果 refresh 过程中该 client 已经 logout 或 session 被替换，旧 refresh 结果不会复活已失效 session。

只有 `rest/v1/*`、`functions/v1/*`、`auth/v1/user` 的 401 会触发自动 refresh。`signIn`、`signUp`、`refresh`、`logout` 等 Auth 接口自身的 401 不会触发 refresh。

## Timeout

请求 timeout 不依赖 `AbortController`，而是使用 `Promise.race`。这能兼容只有 `fetch`、没有 `AbortController` 的脚本环境。

## 构建

```bash
npm run build
```

产物：

```txt
../dist/supabase-mini.js
```
