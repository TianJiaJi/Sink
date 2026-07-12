---
title: 部署 Sink 到 Cloudflare Pages
description: 将 Sink 部署到 Cloudflare Pages，并配置 D1、KV、R2、Analytics Engine、兼容性标志和迁移。
---

# 部署 Sink 到 Cloudflare Pages

1. [Fork 仓库](https://github.com/miantiao-me/Sink/fork)。
2. 从 Fork 创建 [Cloudflare Pages](https://developers.cloudflare.com/pages/) 项目，并选择 Nuxt.js 预设。
3. 按阶段配置环境变量：
   - **仅构建时：** 需要 CORS 时设置 `NUXT_API_CORS=true`。
   - **构建和运行时：** 全部 `NUXT_PUBLIC_*`。
   - **运行时：** 其他映射到运行时配置的 `NUXT_*`，包括站点令牌、分析凭据、Access 与 Webhook 设置。

建议使用至少 8 个字符的安全 `NUXT_SITE_TOKEN`，并避免纯数字等可预测值。Analytics API Token 至少需要 Account Analytics 权限。

4. 保存项目并开始部署，然后在第一次完整发布前取消部署。
5. 在 **Settings** → **Bindings** 中添加：
   - **KV Namespace：** 将命名空间绑定为 `KV`。
   - **D1 Database：** 创建或选择 `sink`，绑定为 `DB` 并复制数据库 ID。
   - **Workers AI**（可选）：将目录绑定为 `AI`。
   - **R2 Bucket：** 将已有存储桶绑定为 `R2`。
   - **Analytics Engine：** 为账户启用该产品，再把 `sink` 数据集绑定为 `ANALYTICS`。
6. 在已通过 Wrangler 登录的本地检出中，将部署值写入 `.env` 并应用 D1 结构：

```dotenv
DEPLOY_D1_DATABASE_ID=your-d1-database-id
DEPLOY_KV_NAMESPACE_ID=your-kv-namespace-id
```

```sh
pnpm db:migrate:remote
```

即使 Pages 绑定由仪表盘管理，迁移命令仍使用这些值生成 `wrangler.deploy.jsonc`。每次发布包含新迁移的版本前都要运行该命令。`DEPLOY_D1_DATABASE_NAME`、`DEPLOY_R2_BUCKET_NAME` 和 `DEPLOY_ANALYTICS_DATASET` 可选且默认均为 `sink`。不要把 `DEPLOY_*` 上传为运行时变量，也不要编辑版本库中的 `wrangler.jsonc`。

7. 在 **Settings** → **Runtime** → **Compatibility flags** 中添加 `nodejs_compat`。
8. 重新部署。

D1 是链接的权威存储。KV 是写穿式读取缓存，并在迁移完成前临时提供旧记录。升级实例应运行 [KV 到 D1 迁移 API](/zh-CN/api/#迁移与工具)。

如需保护仪表盘，请参阅 [Cloudflare Access](/zh-CN/configuration/cloudflare-access)；事件投递详见[点击 Webhook](/zh-CN/configuration/webhooks)。更新 Fork 可参考 GitHub 的[同步 Fork](https://docs.github.com/zh/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork)指南。
