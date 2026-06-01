demo - Supabase Edge Functions

本目录包含 5 个边缘函数的占位实现、源码结构与相关 SQL 查询，便于本地开发、测试与替换为远端下载的实现。

Publishable key: sb_publishable_vbOO5YSdR2C1mi_sWDmrhQ_nbdur_FE

目录结构（已存在）：

- [function/admin-list-users/index.ts](function/admin-list-users/index.ts#L1)
- [function/admin-update-user/source/index.ts](function/admin-update-user/source/index.ts#L1)
- [function/daily-checkin/source/index.ts](function/daily-checkin/source/index.ts#L1)
- [function/init-profile/source/index.ts](function/init-profile/source/index.ts#L1)
- [function/update-profile/source/index.ts](function/update-profile/source/index.ts#L1)
- [query/profiles.sql](query/profiles.sql#L1)
- [query/rls.sql](query/rls.sql#L1)

Supabase CLI 常用命令（在项目根或想存放函数的目录运行）：

```bash
# 下载远端函数到本地（需要有项目访问权限）
supabase functions download admin-list-users
supabase functions download admin-update-user
supabase functions download daily-checkin
supabase functions download init-profile
supabase functions download update-profile

# 在本地启动函数（dev 监听）
supabase functions serve

# 部署到 Supabase（需要 service_role 或已登录且有权限）
supabase functions deploy admin-list-users

# 删除远端函数
supabase functions delete admin-list-users
```

本地调试与调用示例：

- 使用 `supabase functions serve` 在本地启动后，可通过 `http://localhost:54321/functions/v1/<fn>` 调用。
- 直接请求已部署的远端函数示例（替换为你的域名或使用下列样例域名）：

```bash
curl -X POST \
	-H "Content-Type: application/json" \
	-H "Authorization: Bearer sb_publishable_vbOO5YSdR2C1mi_sWDmrhQ_nbdur_FE" \
	https://rftynrclbvnmemjvmrmx.supabase.co/functions/v1/admin-list-users
```

备注：
- `publishable`（公开）密钥只能用于客户端动作和公开接口；执行 `supabase functions download` / `deploy` / 管理操作通常需要具有更高权限的 `service_role` key 或在 supabase CLI 中以可访问该项目的账号登录。
- 若你希望我替换占位代码为从远端下载的真实代码，请提供具有下载权限的 service_role 密钥，或在本机完成 `supabase login` 并授权后让我执行下载命令。

