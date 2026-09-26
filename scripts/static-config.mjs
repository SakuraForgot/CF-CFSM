/** Static hosts do not receive the CSP header injected by the CFSM Worker. */
export function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function origins(value, name) {
  return [...new Set(String(value ?? "").split(",").map(value => value.trim()).filter(Boolean).map(value => {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) {
      throw new Error(`${name} must contain HTTP(S) origins without paths or credentials`);
    }
    return url.origin;
  }))];
}

export function configureStaticHtml(html, env) {
  const bases = origins(env.API_BASE, 'API_BASE');
  if (!bases.length) throw new Error('缺少 API_BASE：静态部署必须配置后端 origin');
  const staticOrigins = origins(env.CSP_STATIC, 'CSP_STATIC');
  const apiOrigins = [...new Set([...bases, ...origins(env.CSP_API, 'CSP_API')])];
  const connections = apiOrigins.flatMap(origin => [origin, origin.replace(/^http/, 'ws')]);
  const challenge = 'https://challenges.cloudflare.com';
  const background = String(env.BACKGROUND_IMAGE ?? '').trim();
  const imageOrigins = [...bases, ...staticOrigins];
  if (background) {
    const url = new URL(background);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('BACKGROUND_IMAGE must be an HTTP(S) URL');
    imageOrigins.push(url.origin);
  }
  const directive = (name, sources) => `${name} ${[...new Set(sources)].join(' ')}`;
  const csp = [
    "default-src 'self'", "base-uri 'self'", "object-src 'none'", "form-action 'self'",
    directive('script-src', ["'self'", "'unsafe-inline'", challenge, ...staticOrigins]),
    directive('style-src', ["'self'", "'unsafe-inline'", ...staticOrigins]),
    directive('font-src', ["'self'", ...staticOrigins]),
    directive('img-src', ["'self'", 'data:', ...imageOrigins]),
    directive('media-src', ["'self'", ...imageOrigins]),
    directive('connect-src', ["'self'", challenge, 'https://raw.githubusercontent.com', 'https://api.frankfurter.app',
      'https://api.frankfurter.dev', 'https://open.er-api.com', ...connections]),
    directive('frame-src', [challenge]),
  ].join('; ');
  html = html.replace(/<meta\b(?=[^>]*http-equiv=["']Content-Security-Policy["'])[^>]*>\s*/gi, '');
  // The policy must precede preloads and the inline early-data bootstrap.
  html = html.replace(/<head>/i, () => `<head>\n<meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">`);
  html = html.replace(/<meta name="apiBase" content="[^"]*"\s*\/?>/,
    () => `<meta name="apiBase" content="${escapeHtml(bases.join(','))}" />`);
  const title = String(env.TITLE ?? '').trim();
  if (title) html = html.replace(/<title>.*?<\/title>/s,
    () => `<title>${escapeHtml(title)}</title>\n<meta name="siteTitle" content="${escapeHtml(title)}" />`);
  if (background) {
    const safe = background.replace(/[\\'"()<>\s]/g, char => `%${char.charCodeAt(0).toString(16)}`);
    html = html.replace('</head>', () => `<style>body{background-image:url('${safe}') !important;background-size:cover !important;background-attachment:fixed !important;background-position:center !important;}</style>\n</head>`);
  }
  return html;
}
