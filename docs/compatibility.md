# CFSM 接入审核

审核日期：2026-09-26。上游 `main` 已刷新，提交为 `19af7d1d32f4495e276cc81dd8b1617a9df8fb6a`。

依据：[theme-develop.md](https://github.com/huilang-me/CF-Server-Monitor/blob/19af7d1d32f4495e276cc81dd8b1617a9df8fb6a/theme-develop.md)、[主题加载器](https://github.com/huilang-me/CF-Server-Monitor/blob/19af7d1d32f4495e276cc81dd8b1617a9df8fb6a/src/handlers/frontend.js)、[CSP 与运行配置注入](https://github.com/huilang-me/CF-Server-Monitor/blob/19af7d1d32f4495e276cc81dd8b1617a9df8fb6a/src/utils/csp.js)。

## 结论

自定义主题 URL 的格式、资源目录和同源 API 模式符合当前宿主加载约定。标准 CFSM 多公开后端聚合有适配与测试；独立私有站点的多账户聚合不在当前支持范围。没有进行生产 Worker 安装验收。

| 项目 | 当前实现 / 边界 |
| --- | --- |
| 自定义 URL | `https://github.com/SakuraForgot/CF-CFSM/tree/dist`；宿主转换成 GitHub raw 地址加载 HTML 与 assets；可用产物 SHA 固定版本 |
| 产物 | 仅 `index.html`、`assets/`；相对资源路径；hash 路由；生产包不含开发 mock |
| 默认 API | `apiBase` 留空使用页面 origin；兼容 Worker 的 `API_BASE` 注入 |
| 聚合 API | 逗号分隔多 origin；部分站失败保留其他站结果；全失败显示错误 |
| 服务器归属 | 列表建立 serverId → base 映射；历史走所属后端；重复 ID 取首站 |
| 历史 | `/api/history/all?id=…&hours=…`；支持上游时间档位；匿名最长 24 小时 |
| 实时 | 每站独立 `/api/ws`；发送该站拥有的 ids；详情只订阅当前服务器；支持 data / payload / metrics 增量样本 |
| 登录 / 验证 | 复用宿主 JWT、Turnstile 头；同域 WS Cookie，跨域 WSS token 参数；当前只有一套凭证存储 |
| 设置 | `/api/config`；登录后的 `/api/theme_options`；后台入口为 `/admin#admin` |
| 图标 | 宿主 `/flags/` 和 `/os-icons/`；静态模式使用主后端地址 |
| 静态部署 | 构建脚本写入 API、标题、背景与 CSP；自动允许每个后端 HTTP / WS 与图标 origin |
| 更新检查 | 查询本仓库 dist 的 theme-version；缓存独立于 SAO |

## 已知限制

1. 多站共享第一站配置与一套 JWT / Turnstile。不同 JWT 密钥、独立人机验证的多个私有站点不能分别认证；某站 401/403 也会清理共享凭证。建议公开站点聚合，私有站点优先同源单站。
2. 服务器 ID 要全局唯一，否则后站同 ID 节点不会单独展示。
3. 详情页 WS 已缩小到单节点，但初始 REST 与周期同步仍通过全量 `/api/servers` 建立共享 store。能够展示详情，但尚未达到上游推荐的“详情仅请求 `/api/server`”节省额度要求。
4. 独立静态站与 Worker 的 localStorage 不共享。仅在 Worker 后台登录不会自动让静态站获得管理员 JWT；本主题没有实现独立跨域登录流程。
5. 静态 CSP 无法放宽托管平台已有的响应头限制；宿主安装模式的 CSP 由 Worker 外观设置管理。跨域 CORS 必须在每一个后端配置。

## 本次修正与校验

- 补齐静态构建的 CSP_API / CSP_STATIC，验证 origin、添加 WSS、允许后端图标、转义标题和背景配置。
- 更新检查从 SAO 仓库切换至 CF-CFSM，并隔离版本缓存。
- Actions 使用完整产物验证；区分远端分支不存在与网络失败，保留 dist 历史。
- 自动化覆盖 API 聚合与部分失败、同 ID 归属、历史转换、JWT / Turnstile、WS 订阅和生命周期；新增静态配置校验。
- 验证命令：`npm test`、`npm run lint`、`npm run build`、`npm run verify:dist`。实际每次发布结果以 GitHub Actions 为准。

这些是源代码、协议模拟与构建层面的证据；真实 Worker 的 CORS、登录、Turnstile 和探针实时连接需安装后另行验证。
