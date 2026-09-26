# CFSM Cloud · CF-CFSM

为 [CF-Server-Monitor](https://github.com/huilang-me/CF-Server-Monitor) 制作的 Cloudflare 控制台风格主题，基于 [CFSM-SAO](https://github.com/WAOR/CFSM-SAO) 的 React 前端与数据适配层，使用 [Cloudflare Kumo](https://github.com/cloudflare/kumo) 组件。这是社区主题。

## 安装到 CFSM

在 CFSM 后台主题管理的「自定义主题 URL」中填写：

```text
https://github.com/SakuraForgot/CF-CFSM/tree/dist
```

`main` 保存源码；GitHub Actions 检查、构建后，将 `index.html` 和 `assets/` 发布到 `dist`。首次使用前确认 [构建工作流](https://github.com/SakuraForgot/CF-CFSM/actions/workflows/build-theme.yml) 成功。也可将 `dist` 换成该产物分支的完整提交 SHA，固定版本。不要填写 `.git` 地址、源码 `main` 或 raw `index.html` 地址。

同源安装无需填写 API 地址，管理入口返回宿主 `/admin#admin`；标题、背景、图标与 CSP 由宿主注入。主题不会替换管理后台。

## 多后端 / 复合接口

支持 CFSM 文档约定的逗号分隔 `API_BASE`，并行合并各站 `/api/servers`，按服务器归属发送历史请求与 WebSocket 订阅。这里的复合接口指多个标准 CFSM Worker 聚合，不是任意第三方网关响应格式。

- **通过自定义主题 URL 安装**：在承载页面的 Worker 环境变量中设置 `API_BASE=https://a.example,https://b.example`，宿主会注入到主题。
- **独立静态托管**：复制 `.env.example` 为 `.env`，填写 `API_BASE` 后运行 `npm run build:github-page`，将 `dist/` 发布到静态站点。
- 每个跨域 Worker 的 `CORS_ALLOWED_ORIGINS` 必须包含主题 origin，例如 `https://example.github.io`，不含路径和结尾 `/`。
- 第一站提供页面配置、管理入口与主题设置。同 ID 服务器以第一站为准；多个后端应使用不同服务器 ID。
- **推荐公开后端聚合**。当前共用一套 JWT / Turnstile 存储，不支持多个独立私有站点分别登录、分别验证。

`.env` 还支持 `TITLE`、`BACKGROUND_IMAGE`、`CSP_API`、`CSP_STATIC`。CSP 白名单为逗号分隔 HTTP(S) origin；API 的 WebSocket origin 会自动加入。不要把 `API_SECRET` 或管理员密码放入主题。

完整审核依据、已验证范围和限制见 [接入审核](docs/compatibility.md)。

## 界面

- 浅色 / 深色 / 跟随系统，桌面侧栏与移动端抽屉。
- 双层半透明卡片边框、柔和悬浮反馈、统一分段按钮；支持减少动态效果。
- 列表、卡片、紧凑、详细视图，名称 / 地区 / 分组搜索、状态筛选与排序。
- 服务器详情、负载 / Ping 历史、平滑曲线、实时吞吐与集群状态。
- 主题设置、资产汇总、权限相关字段隐藏、实时断线降级与连接时限提示。
- 首页吞吐仅记录当前会话收到的采样；生产模式不会生成模拟服务器和历史数据。

## 本地开发与构建

需要 Node.js 22.12+ 或 24+。

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

访问 `http://127.0.0.1:5173/?mock=1` 可预览模拟服务器。真实后端开发需填写 `.env` 的 `API_BASE` 并移除 `mock=1`；每个后端应允许 `http://127.0.0.1:5173` 的 CORS。

```sh
npm run lint
npm test
npm run build
npm run verify:dist
```

国旗与 OS 图标由后端 `/flags/`、`/os-icons/` 提供，本地开发图标不进入生产包。`.npmrc` 保留 `legacy-peer-deps=true`：现有校验层使用 Zod 3，Kumo 可选表单声明 Zod 4，本主题没有使用该表单模块。

## 来源与验证边界

保留 [第三方归属与许可说明](THIRD_PARTY_NOTICES.md)，构建包附带 `assets/THIRD_PARTY_LICENSES.txt`。

| 参考项目 | 审核快照 |
| --- | --- |
| WAOR/CFSM-SAO | `b58fb8b2444ec33e34f5fc45e3997c7e01e1c588` |
| huilang-me/CF-Server-Monitor | `19af7d1d32f4495e276cc81dd8b1617a9df8fb6a` |
| cloudflare/kumo | `c3b0294678a651909ed06867a96ad61b8bb9554c` |

构建、协议测试和本地模拟预览不等同于真实 Worker 验收。尚未安装到用户的生产 Worker，真实登录、Turnstile、跨域白名单及探针推送仍需在目标站验证。
