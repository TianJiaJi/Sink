---
title: 升级 Sink
description: 通过同步 GitHub Fork 并重新部署来升级 Sink。
---

# 升级 Sink

## 升级前

1. 查看上游版本说明。
2. 保留 Cloudflare 绑定、密钥和环境设置。
3. 如果已配置 R2，可以先手动创建[链接快照](/zh-CN/features/backups)。

## 升级 D1 部署

1. 在 GitHub 中将你的 Fork 与上游 `master` 分支同步。如果自己的修改造成冲突，请先解决冲突。
2. 通过 Workers Builds 或 Pages 重新部署更新后的 `master` 分支。
3. 等待部署完成。

## 升级旧版纯 KV 部署

如果现有实例仅使用 KV 存储链接，请先在 Cloudflare 中保留原始 KV 数据，再按照独立的 [KV 到 D1 迁移指南](/zh-CN/storage/kv-to-d1)操作。

## 验证

- 打开仪表盘并确认可以正常登录。
- 创建、打开、编辑和删除一个测试链接。
- 检查已启用的访问分析和其他可选功能。
