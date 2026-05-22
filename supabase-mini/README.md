# supabase-mini

一个纯 JavaScript 的 Supabase REST Runtime。该项目只实现 REST API 适配层，不实现官方 SDK 的完整功能。

目标环境：
- Node.js 脚本容器
- 仅 HTTP(S)
- 仅 fetch()
- 只使用轻量 REST 参数拼接

目前结构：
- `docs/`：协议与架构文档
- `src/`：核心 REST runtime 实现
- `tests/`：单元测试与验证

## 当前进度

1. `docs/architecture.md`：协议驱动开发说明
2. `src/request.js`：请求封装与统一错误处理
