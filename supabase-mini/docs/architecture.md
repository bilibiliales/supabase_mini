# supabase-mini Architecture

## 目标

实现一个稳定、简单、可维护的 Supabase REST Runtime，绝不实现 SDK 风格的复杂抽象。

只允许：
- HTTP REST API
- 轻量 URL 参数拼接
- 小函数式封装

禁止：
- TypeScript
- websocket / realtime
- storage bucket
- browser runtime
- localStorage
- ORM
- class-based fluent builder
- SDK runtime

## 设计原则

1. 协议驱动开发
   - 以 PostgREST 和 GoTrue REST API 为规范
   - 直接实现 REST 请求与参数适配
   - 不追求与官方 SDK 语义兼容，只追求所需功能

2. 模块化迭代
   - 第一阶段：`request.js`
   - 第二阶段：`auth.js`
   - 第三阶段：`db.js`
   - 第四阶段：`filters.js`

3. 简单优先
   - 先实现最小可用功能
   - 避免 Builder、泛型、抽象层、middleware、inheritance
   - 以 `db.select(table, options)` 这种明确接口为主

## 模块职责

- `request.js`
  - 自动附加 `apikey`
  - 自动附加 `Authorization`
  - 自动 JSON 解析
  - 自动错误包装

- `auth.js`
  - 实现 `signUp`, `signIn`, `refresh`, `getUser`, `logout`
  - 不实现 OAuth、magic link、PKCE、session manager

- `db.js`
  - 实现 `select`, `insert`, `update`, `delete`, `rpc`
  - 只支持 REST 查询参数

- `filters.js`
  - 提供 `eq`, `neq`, `gt`, `lt`, `order`, `limit`
  - 用于生成简单 URL 参数对象

## 运行时假设

- 运行在 Node.js 脚本容器中
- 有全局 `fetch`
- 提供 `setVar(name, value, "global")` 和 `getVar(name, "global")`
- 无需构建步骤

## 目录结构

```
supabase-mini/
├── docs/
│   ├── postgrest.md
│   ├── gotrue.md
│   └── architecture.md
├── src/
│   ├── auth.js
│   ├── db.js
│   ├── functions.js
│   ├── request.js
│   ├── filters.js
│   └── index.js
├── tests/
└── README.md
```
