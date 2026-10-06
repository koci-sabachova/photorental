#!/usr/bin/env node
// Stejný princip jako u 13remesel: _pages + _partials -> docs/.
// Bez BASE_PATH (web běží na vlastní doméně z kořene).
import {
  readFileSync, writeFileSync, mkdirSync, readdirSync,
  existsSync, cpSync, rmSync,
} from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = process.cwd();
const PAGES = join(ROOT, '_pages');
const PARTIALS = join(ROOT, '_partials');
const DIST = join(ROOT, 'docs');

if (existsSync(DIST)) rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

const head = readFileSync(join(PARTIALS, 'head.html'), 'utf8');
const header = readFileSync(join(PARTIALS, 'header.html'), 'utf8');
const footer = readFileSync(join(PARTIALS, 'footer.html'), 'utf8');

function parseFrontMatter(src) {
  const m = src.match(/^<!--meta\s*([\s\S]*?)-->\s*/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*:\s*(.*?)\s*$/);
    if (kv) meta[kv[1]] = kv[2];
  }
  return { meta, body: src.slice(m[0].length) };
}

function template(str, vars) {
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
}

const pages = existsSync(PAGES)
  ? readdirSync(PAGES).filter(f => f.endsWith('.html'))
  : [];

for (const file of pages) {
  const src = readFileSync(join(PAGES, file), 'utf8');
  const { meta, body } = parseFrontMatter(src);

  const slug = basename(file, '.html');
  const defaults = {
    titleCs: 'Photo Rental Prague',
    titleEn: 'Photo Rental Prague',
    descriptionCs: '',
    descriptionEn: '',
    bodyClass: '',
  };
  const vars = { ...defaults, ...meta };
  vars.titleCsJson = JSON.stringify(vars.titleCs);
  vars.titleEnJson = JSON.stringify(vars.titleEn);
  vars.descriptionCsJson = JSON.stringify(vars.descriptionCs);
  vars.descriptionEnJson = JSON.stringify(vars.descriptionEn);

  const html = [
    '<!doctype html>',
    '<html lang="cs" data-lang="cs">',
    '<head>',
    template(head, vars),
    '</head>',
    `<body class="${vars.bodyClass}">`,
    header,
    body,
    footer,
    '</body>',
    '</html>',
  ].join('\n');

  const outDir = file === 'index.html' ? DIST : join(DIST, slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html);
  console.log(`✓ ${slug.padEnd(16)} ${(html.length / 1024).toFixed(1)} KB`);
}

for (const dir of ['assets', 'data']) {
  if (existsSync(join(ROOT, dir))) {
    cpSync(join(ROOT, dir), join(DIST, dir), {
      recursive: true,
      filter: (p) => !p.endsWith('.DS_Store') && !p.includes(`${dir === 'assets' ? 'assets' : 'data'}/source`),
    });
  }
}
// /admin se nepublikuje — běží jen lokálně nad souborovým systémem (File System Access API).

console.log(`\nBuilt ${pages.length} page(s) → docs/`);
