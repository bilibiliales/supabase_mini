本项目是一个纯 JavaScript 的 Supabase REST Runtime。

目标环境：
- Node.js 脚本容器
- 无 websocket
- 无 browser runtime
- 无 TypeScript
- 无 SDK
- 仅 HTTP(S)

支持功能：
- Auth REST API
- PostgREST Database API
- Edge Functions invoke

不支持：
- Realtime
- Storage bucket
- OAuth
- WebAuthn
- MFA
- SSR
- BroadcastChannel

环境变量通过：

setVar(name, value, "global")
getVar(name, "global")

删除：

setVar(name, undefined, "global")

本地持久化保存可以通过localStorage

不实现 ORM。

只实现轻量 REST 参数构造。
