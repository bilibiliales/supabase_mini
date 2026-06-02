# Supabase Mini App - Vue 3 + Element Plus

基于 Vue 3、Element Plus 和 Supabase 构建的 Web 应用。

## 功能特性

- 用户注册/登录/登出（用户名自动转换为 `用户名@zdjl.com` 邮箱格式）
- 个人资料管理
  - 昵称（nickname）
  - 头像（avatar）
  - 签名（signature）
  - 经验值（exp）- 只读
  - 角色（role）- 只读
- 每日签到（获得 10 经验值，每天只能签到一次）
- 修改密码（可选验证原密码）
- 管理员功能
  - 查看所有用户列表
  - 编辑用户资料（昵称、头像、签名、角色、经验值）

## 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **Vite** - 下一代前端构建工具
- **Element Plus** - Vue 3 组件库
- **Supabase** - 开源 Firebase 替代方案
- **Vue Router** - Vue.js 官方路由

## 数据库表结构

### profiles 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键，关联 auth.users(id) |
| nickname | text | 昵称 |
| avatar | text | 头像URL |
| signature | text | 个性签名 |
| role | text | 角色（user/admin），默认 user |
| exp | integer | 经验值，默认 0 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |
| last_checkin_date | date | 上次签到日期 |

## Edge Functions

- `init-profile` - 初始化用户资料
- `update-profile` - 更新用户资料
- `daily-checkin` - 每日签到
- `admin-list-users` - 管理员获取用户列表
- `admin-update-user` - 管理员更新用户资料

## 安装依赖

```bash
npm install
```

## 开发运行

```bash
npm run dev
```

访问 http://localhost:5173

## 生产构建

```bash
npm run build
```

## 预览构建结果

```bash
npm run preview
```

## Supabase 配置

- URL: `https://rftynrclbvnmemjvmrmx.supabase.co`
- Publishable key: `sb_publishable_vbOO5YSdR2C1mi_sWDmrhQ_nbdur_FE`

## 项目结构

```
webpage/
├── src/
│   ├── lib/
│   │   └── supabase.js      # Supabase 客户端配置
│   ├── router/
│   │   └── index.js         # 路由配置
│   ├── views/
│   │   ├── Login.vue        # 登录/注册页面
│   │   ├── Profile.vue      # 个人资料页面
│   │   └── Admin.vue        # 管理员页面
│   ├── App.vue              # 根组件
│   └── main.js              # 入口文件
├── index.html
├── vite.config.js
└── package.json
```
