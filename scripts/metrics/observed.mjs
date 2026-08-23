/**
 * 既存4プロジェクトから実値を抽出する。
 *
 * 「値のソース」ではなく「需要の観測」のための抽出である（原則2）。
 * ここで得た値は tokens.json には入らない。生成スケールが実需要を
 * 覆えるかを照合するためだけに使う。
 *
 * ~/ghq/github.com/shun2218-dev/ 配下に観測対象が存在することを前提とする。
 * CI では動かない。
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const R = join(homedir(), 'ghq/github.com/shun2218-dev');

/** i = ichirizuka / p = pylabo / h = holosphere */
const CSS_SOURCES = [
  ['i', join(R, 'ichirizuka/app/globals.css')],
  ['p', join(R, 'pylabo/src/styles')],
];
const TSX_SOURCES = [['h', join(R, 'holosphere/src')]];

const TW_TEXT = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60, '7xl': 72 };
const TW_RADIUS = { none: 0, xs: 2, sm: 4, md: 6, lg: 8, xl: 12, '2xl': 16, '3xl': 24, full: 9999 };

const bag = () => new Map();
const add = (m, v, src) => m.set(v, (m.get(v) ?? new Set()).add(src));
const pxIn = (s) => [...s.matchAll(/(-?[\d.]+)px/g)].map((m) => parseFloat(m[1]));

const walk = (dir, re, out = []) => {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.git' || e.startsWith('.venv')) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, re, out);
    else if (re.test(e)) out.push(p);
  }
  return out;
};

export function collect() {
  const o = {
    spacing: bag(), fontSize: bag(), radius: bag(),
    duration: bag(), lineHeight: bag(), letterSpacing: bag(),
  };
  const missing = [];

  for (const [src, path] of CSS_SOURCES) {
    const files = existsSync(path) && statSync(path).isDirectory()
      ? walk(path, /\.s?css$/)
      : existsSync(path) ? [path] : [];
    if (!files.length) { missing.push(path); continue; }
    for (const file of files) {
      const t = readFileSync(file, 'utf8');
      for (const m of t.matchAll(/(?:^|[\s;{])(padding|margin|gap|row-gap|column-gap)(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?\s*:\s*([^;}]+)/g))
        pxIn(m[2]).forEach((v) => add(o.spacing, v, src));
      for (const m of t.matchAll(/font-size\s*:\s*([^;}]+)/g)) pxIn(m[1]).forEach((v) => add(o.fontSize, v, src));
      for (const m of t.matchAll(/border-radius\s*:\s*([^;}]+)/g)) pxIn(m[1]).forEach((v) => add(o.radius, v, src));
      for (const m of t.matchAll(/line-height\s*:\s*([\d.]+)\s*[;}]/g)) add(o.lineHeight, parseFloat(m[1]), src);
      for (const m of t.matchAll(/letter-spacing\s*:\s*(-?[\d.]+)em/g)) add(o.letterSpacing, parseFloat(m[1]), src);
      for (const m of t.matchAll(/(-?[\d.]+)(ms|s)\b/g)) {
        const v = m[2] === 's' ? parseFloat(m[1]) * 1000 : parseFloat(m[1]);
        if (v > 0 && v <= 2000) add(o.duration, v, src);
      }
    }
  }

  for (const [src, dir] of TSX_SOURCES) {
    const files = walk(dir, /\.tsx?$/);
    if (!files.length) { missing.push(dir); continue; }
    for (const file of files) {
      const t = readFileSync(file, 'utf8');
      for (const m of t.matchAll(/(?:^|["'\s`])-?(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-(\d+(?:\.5)?)\b/g))
        add(o.spacing, parseFloat(m[1]) * 4, src);
      for (const m of t.matchAll(/(?:^|["'\s`])text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl)\b/g)) add(o.fontSize, TW_TEXT[m[1]], src);
      for (const m of t.matchAll(/(?:^|["'\s`])rounded(?:-(none|xs|sm|md|lg|xl|2xl|3xl|full))?\b/g)) add(o.radius, TW_RADIUS[m[1] ?? 'md'], src);
      for (const m of t.matchAll(/(?:^|["'\s`])duration-(\d+)\b/g)) add(o.duration, parseFloat(m[1]), src);
      for (const m of t.matchAll(/fontSize:\s*(\d+)/g)) add(o.fontSize, parseFloat(m[1]), src);
    }
  }

  return { observed: o, missing };
}

export const sorted = (m) => [...m.keys()].sort((a, b) => a - b);
export const sourcesOf = (m, v) => [...m.get(v)].sort().join('');
