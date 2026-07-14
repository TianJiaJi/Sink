---
title: Workers AI 辅助
description: 为 Sink 启用可选的 Workers AI 辅助，以生成 Slug 建议和 OpenGraph 元数据。
---

# Workers AI 辅助

Sink 可以使用 Cloudflare Workers AI 绑定来建议 Slug，并生成 OpenGraph 标题和描述。此功能可选，不影响正常的链接创建或重定向。

## 启用 AI 辅助

将 Workers AI 目录绑定为 `AI`。之后可以通过[配置参考](/zh-CN/configuration/#高级默认值)选择模型或替换提示词。自定义 Slug 提示词必须保留 `{slugRegex}` 占位符，以便 Sink 提供实例的 Slug 规则。

如果绑定不可用，AI 端点会返回 `501 AI not enabled`。除非每个部署环境都提供该绑定，否则不要让集成依赖 AI。

## 行为与限制

对于请求的 URL，Sink 会尝试获取页面内容，并请求配置的模型返回结构化输出。Slug 结果会根据自定义 Slug 的大小写设置进行规范化。元数据生成支持指定首选语言区域。

如果 AI 请求开始后模型执行或输出解析失败，Sink 会返回基于 URL 的确定性回退结果。建议仍可能与现有 Slug 冲突或包含不合适的措辞；保存前请进行检查。

页面内容和目标 URL 可能会发送到 Cloudflare Workers AI。使用此功能前，请考虑目标页面的敏感性及其适用策略。
