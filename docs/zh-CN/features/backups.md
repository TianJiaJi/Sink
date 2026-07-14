---
title: 链接备份
description: 创建权威 D1 链接的 R2 JSON 快照，并了解其内容、计划执行方式和恢复限制。
---

# 链接备份

Sink 备份是写入 `R2` 绑定的**权威 D1 链接**逻辑 JSON 快照。它们不是完整的 D1 数据库备份，也不是 KV 兼容性备份。

## 要求与操作

创建任何快照前，都必须存在 KV 到 D1 数据迁移标记。缺少标记时，已认证的备份 API 会返回 `423`。手动快照使用该 API。自动快照需要配置计划 Worker，并可通过[配置参考](/zh-CN/configuration/#高级默认值)禁用。

本仓库的 Workers Cron 每天 **UTC 00:00** 运行。Cloudflare Pages 可以创建手动快照，但本仓库不提供 Pages 计划触发器，也不保证自动 Cron 会在那里运行。

自动对象使用 `backups/links-<timestamp>.json`；手动对象使用 `backups/manual-links-<timestamp>.json`。

## 快照内容

快照包含所有权威 D1 链接记录，包括过期链接和密码凭据材料。通过当前创建和编辑流程设置的密码会先进行保护再存储。但是，KV 到 D1 数据迁移会原样保留每个旧版密码值，因此较旧的迁移记录可能包含明文密码。

请将每个 R2 链接快照视为敏感数据，并严格限制存储桶和对象的访问权限。

快照不包含：

- D1 架构或迁移
- 链接墓碑记录
- KV 到 D1 数据迁移运行记录或游标
- 存储在 KV 中的数据迁移标记
- Analytics Engine 数据或其他数据库状态

## 恢复限制

Sink 未实现保留清理、快照轮换或一键精确恢复。你需要自行管理 R2 生命周期和访问策略。快照可为正常导入流程提供链接记录，但仍需遵循导入验证和冲突处理规则，且不会精确复现原始数据库。

对于数据库级恢复，Cloudflare D1 还提供 [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)。这是 Cloudflare 的另一项独立功能，有自己的保留和恢复语义。
