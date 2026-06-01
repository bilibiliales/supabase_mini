# supabase-mini

一个轻量的 Supabase REST mini SDK，面向只需要 Auth、PostgREST 和 Edge Functions 的脚本或浏览器环境。

## 设计原则

`supabase-mini` 现在是 instance-safe 结构：

```js
const { createClient } = require('./supabase-mini/src');

const supabase1 = createClient('https://project-a.supabase.co', 'sb_publishable_a');
const supabase2 = createClient('https://project-b.supabase.co', 'sb_publishable_b');
```

每个 client 都有独立状态：

- `url`
- `apiKey`
- `accessToken`
- `refreshToken`
- `auth`
- `db`
- `functions`

不会再通过全局 `runtime`、环境变量或共享 token 仓库保存 client 状态。

## 安装与构建

```bash
npm install
npm run build
```

构建产物会输出到：

```txt
dist/supabase-mini.js
```

浏览器中会暴露全局变量：

```js
Supabase.createClient(url, apiKey)
```

## 创建 Client

```js
const Supabase = require('./supabase-mini/src');

const supabase = Supabase.createClient(
  'https://your-project.supabase.co',
  'sb_publishable_...'
);
```

`createClient(url, apiKey)` 必须显式传入两个参数。

第三个参数可以配置 session 持久化：

```js
const supabase = Supabase.createClient(url, apiKey, {
  storageKey: 'currentSession',
  persistSession: true,
});
```

不再支持：

```js
createClient();
```

## Auth

```js
const result = await supabase.auth.signIn({
  email: 'user@example.com',
  password: 'password',
});

console.log(result);
console.log(supabase.auth.session());
```

登录、注册和 refresh 成功后，会写入当前 client 的 session。你可以显式读取：

```js
supabase.auth.session();
supabase.auth.getSession();
supabase.getSession();
supabase.auth.getAccessToken();
supabase.auth.getRefreshToken();
```

更新当前登录用户资料或密码：

```js
await supabase.auth.updateUser({
  password: 'new_password',
});
```

如果需要用户输入当前密码再修改：

```js
await supabase.auth.updateUser({
  password: 'new_password',
  currentPassword: 'old_password',
});
```

也可以更新 email、phone 或用户 metadata：

```js
await supabase.auth.updateUser(
  {
    email: 'new@example.com',
    data: { display_name: 'Ada' },
  },
  {
    emailRedirectTo: 'https://example.com/account',
  }
);
```

`updateUser` 需要当前 client 已有有效登录 session，并会触发 `USER_UPDATED` 事件。

session 会自动持久化。优先使用脚本环境的 `zdjl` storage API：

```js
zdjl.setStorage('key1', '内容1');
zdjl.getStorage('key1');
zdjl.removeStorage('key1');
```

如果没有 `zdjl`，浏览器环境会回退到等效的 `localStorage`：

```js
localStorage.setItem('key1', '内容1');
localStorage.getItem('key1');
localStorage.removeItem('key1');
```

默认 storage key 按项目 URL 隔离：

```txt
supabase-mini:<supabase-url>:currentSession
```

如果你想和平台代码共用固定 key，可以显式传：

```js
const supabase = Supabase.createClient(url, apiKey, {
  storageKey: 'currentSession',
});
```

如需禁用持久化：

```js
const supabase = Supabase.createClient(url, apiKey, {
  persistSession: false,
});
```

清除 session：

```js
await supabase.auth.signOut();
supabase.auth.clearSession();
```

`signOut` 支持 Supabase Auth 的 scope：

```js
await supabase.auth.signOut(); // default: global
await supabase.auth.signOut({ scope: 'local' });
await supabase.auth.signOut({ scope: 'others' });
```

`global` 会终止该用户的所有 session，`local` 只终止当前 session，`others` 会终止除当前 session 外的其它 session。`global/local` 会清除当前 client 的本地 session 并触发 `SIGNED_OUT`；`others` 会保留当前 client session。

监听 auth 状态变化：

```js
const subscription = supabase.auth.onAuthStateChange((event, session) => {
  console.log(event, session);
});

subscription.unsubscribe();
```

当前支持的事件：

- `INITIAL_SESSION`
- `SIGNED_IN`
- `SIGNED_OUT`
- `TOKEN_REFRESHED`
- `USER_UPDATED`

注册监听器后会异步回调一次 `INITIAL_SESSION`，session 参数为当前已恢复的 session 或 `null`。这表示 SDK 初始化后的当前状态，不代表用户刚刚登录。

`signIn`、`signUp`、`saveSession` 默认触发 `SIGNED_IN`，`signOut`、`clearSession` 会触发 `SIGNED_OUT`，手动或自动 refresh 会触发 `TOKEN_REFRESHED`，`updateUser` 会触发 `USER_UPDATED`。

如果你用 `saveSession` 恢复缓存或表达其它语义，可以显式指定事件：

```js
supabase.auth.saveSession(session, {
  event: 'INITIAL_SESSION',
});
```

当 session 为空时，SDK 会删除持久化存储，不会写入 `"null"` 字符串。

## Database

```js
const rows = await supabase.db.select('todos', {
  select: '*',
  eq: {
    user_id: '123',
  },
});
```

写入数据：

```js
const inserted = await supabase.db.insert('todos', {
  title: 'Ship it',
  done: false,
});
```

更新数据：

```js
await supabase.db.update(
  'todos',
  { done: true },
  { eq: { id: 1 } }
);
```

删除数据：

```js
await supabase.db.delete('todos', {
  eq: { id: 1 },
});
```

## Edge Functions

```js
const result = await supabase.functions.invoke('hello-world', {
  name: 'Ada',
});
```

## Request

`request` 只能通过 client 使用，`auth/db/functions` 也只应该从 client 实例访问：

```js
await supabase.request('rest/v1/todos');
await supabase.auth.getUser();
await supabase.db.select('todos');
await supabase.functions.invoke('hello-world');
```

裸调用会被拒绝：

```js
const { request } = require('./supabase-mini/src/request');

await request('rest/v1/todos');
// Error: request(): request must be bound to a Supabase client
```

主入口不再导出裸 `auth`、`db`、`functions` 模块。即使直接 require 子模块，未传入内部 client 也会抛错。这样可以避免重新退化成全局状态或半环境变量模式。

## 自动 Refresh

当请求收到 `401` 且当前 client 有 `refreshToken` 时，SDK 会自动 refresh 并重试一次。

refresh 去重按 client 实例进行：

- 同一个 client 内并发触发多个 refresh，只会发起一次 refresh 请求。
- 不同 client 即使 refresh token 相同，也不会共用 refresh promise。
- refresh 成功后先写回当前 client session，再用 client 上的新 access token 重试请求。
- 如果 refresh 过程中当前 client 已经 signOut 或 session 被替换，旧 refresh 结果不会复活已失效 session。
- 只有 `rest/v1/*`、`functions/v1/*`、`auth/v1/user` 的 401 会触发 refresh。
- `signIn`、`signUp`、`refresh`、`signOut` 等 Auth 接口自身的 401 不会触发自动 refresh。

## Timeout

请求超时不依赖 `AbortController`，而是使用 `Promise.race`：

```js
await supabase.request('rest/v1/todos', {
  timeout: 30000,
});
```

这能兼容只有 `fetch`、没有 `AbortController` 的脚本平台。超时后 Promise 会 reject，但底层 HTTP 请求不会被强制取消。

## 不支持范围

- Realtime
- Storage bucket
- OAuth
- WebAuthn
- MFA
- SSR 专用能力
- BroadcastChannel
- ORM

这是一个轻量 REST adapter，不是官方 SDK 的完整替代品。
