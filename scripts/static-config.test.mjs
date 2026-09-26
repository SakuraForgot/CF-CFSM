import { describe, expect, it } from 'vitest';
import { configureStaticHtml } from './static-config.mjs';

const html = '<html><head><meta name="apiBase" content="" /><title>CFSM</title><script>bootstrap()</script></head><body></body></html>';
describe('static deployment configuration', () => {
  it('permits every backend HTTP, WebSocket and host icon origin before bootstrap', () => {
    const result = configureStaticHtml(html, {
      API_BASE: 'https://a.example,https://b.example/', CSP_API: 'https://extra.example',
      CSP_STATIC: 'https://cdn.example',
    });
    expect(result).toContain('content="https://a.example,https://b.example"');
    expect(result).toContain('https://a.example wss://a.example https://b.example wss://b.example');
    expect(result).toContain('https://extra.example wss://extra.example');
    expect(result).toContain("img-src 'self' data: https://a.example https://b.example https://cdn.example");
    expect(result.indexOf('Content-Security-Policy')).toBeLessThan(result.indexOf('<script>'));
  });
  it('escapes HTML and preserves literal replacement tokens in a title', () => {
    const result = configureStaticHtml(html, {API_BASE: 'https://a.example', TITLE: '<site> $&', BACKGROUND_IMAGE: 'https://img.example/a.png?x=</style>'});
    expect(result).toContain('<title>&lt;site&gt; $&amp;</title>');
    expect(result).not.toContain("x=</style>");
    expect(result).toContain('https://img.example');
  });
  it('rejects missing backends and credentials, paths or injected CSP directives', () => {
    for (const API_BASE of ['', 'https://name:secret@a.example', 'https://a.example/api', 'javascript:alert(1)']) {
      expect(() => configureStaticHtml(html, {API_BASE})).toThrow();
    }
    expect(() => configureStaticHtml(html, {API_BASE:'https://a.example', CSP_API:"https://b.example; default-src *"})).toThrow();
  });
  it('supports local HTTP backends and avoids duplicate CSP tags', () => {
    const env = {API_BASE:'http://127.0.0.1:8787'};
    const result = configureStaticHtml(configureStaticHtml(html, env), env);
    expect(result).toContain('ws://127.0.0.1:8787');
    expect(result.match(/http-equiv="Content-Security-Policy"/g)).toHaveLength(1);
  });
});
