// Static PWA checks (a stand-in for Lighthouse, which needs a browser): node tools/check-pwa.mjs
// Verifies the service worker precaches every shipped file, the manifest and index.html have what installability needs.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
let bad = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) bad++; };

const sw = readFileSync(join(root, 'sw.js'), 'utf8');
const assets = [...sw.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(a => a && a !== '');
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? (['.git', 'tools', 'node_modules'].includes(f) ? [] : walk(p)) : [relative(root, p)]; });
const shipped = walk(root).filter(f => !/^(README\.md|CLAUDE\.md|DriveThru-MDD\.md|\.gitignore|sw\.js)$/.test(f) && !f.startsWith('.'));
for (const f of shipped) check(assets.includes(f) || sw.includes(`'./${f}'`), `precached: ${f}`);
for (const a of assets) check(existsSync(join(root, a)), `exists: ${a}`);
check(/const CACHE = 'drive-thru-v\d+'/.test(sw), 'cache name is versioned');
check(/caches\.delete/.test(sw) && /skipWaiting/.test(sw), 'old caches deleted on activate, skipWaiting on request');

const man = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
for (const k of ['name', 'short_name', 'start_url', 'scope', 'display', 'background_color', 'theme_color']) check(!!man[k], `manifest.${k}`);
check(man.display === 'standalone', 'display standalone');
check(man.icons.some(i => i.sizes === '192x192') && man.icons.some(i => i.sizes === '512x512'), 'icons 192 and 512');
check(man.icons.some(i => i.purpose === 'maskable'), 'maskable icon');
for (const i of man.icons) check(existsSync(join(root, i.src)), `icon file ${i.src}`);
const html = readFileSync(join(root, 'index.html'), 'utf8');
for (const [re, n] of [[/rel="manifest"/, 'manifest link'], [/apple-touch-icon/, 'apple-touch-icon'], [/name="viewport"[^>]*viewport-fit=cover/, 'viewport-fit=cover'], [/name="theme-color"/, 'theme-color'], [/apple-mobile-web-app-capable/, 'iOS standalone meta'], [/<title>/, 'title']]) check(re.test(html), n);
check(/serviceWorker\.register\('\.\/sw\.js'\)/.test(readFileSync(join(root, 'js/main.js'), 'utf8')), 'service worker registered with a relative path');
const rel = [...readFileSync(join(root, 'js/scene.js'), 'utf8').matchAll(/(?:src|href)=["']\/[^/]/g)];
check(rel.length === 0, 'no absolute-path URLs');
console.log(bad ? `\n${bad} problem(s)` : '\nall checks passed');
process.exit(bad ? 1 : 0);
