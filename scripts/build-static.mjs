/**
 * 纯静态部署（GitHub Pages 等）的构建后处理。
 *
 * 由 Worker 托管主题时，站点标题、图标、背景图、CSP 都由后端注入，直接 `npm run build` 即可。
 * 静态托管没有这一层注入，所以这里把 .env 里的配置写进 dist/index.html：
 *
 *   API_BASE         必填，后端地址，多个用英文逗号分隔
 *   TITLE            选填，页面标题
 *   BACKGROUND_IMAGE 选填，背景图 URL
 *
 * 用法：`npm run build:github-page`
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { configureStaticHtml } from "./static-config.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const indexPath = resolve(root, "dist/index.html");

function readEnvFile() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return {};

  const env = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = value;
  }
  return env;
}

if (!existsSync(indexPath)) throw new Error("dist/index.html 不存在，请先执行 npm run build");
const env = { ...readEnvFile(), ...process.env };
writeFileSync(indexPath, configureStaticHtml(readFileSync(indexPath, "utf8"), env));
console.log("[build:github-page] 已写入 API、标题、背景与 CSP 配置");
console.log("[build:github-page] 每个 Worker 的 CORS_ALLOWED_ORIGINS 都需要允许静态站点 origin");