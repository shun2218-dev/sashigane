import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';

const R = process.env.HOME + '/ghq/github.com/shun2218-dev';

const cssFiles = [
  ['i', `${R}/ichirizuka/app/globals.css`],
];
for (const f of readdirSync(`${R}/pylabo/src/styles`)) {
  if (f.endsWith('.scss')) cssFiles.push(['p', `${R}/pylabo/src/styles/${f}`]);
}

const bag = (n) => ({ add(v, src){ (this.m[v] ??= new Set()).add(src); }, m:{}, name:n });
const spacing = bag('spacing'), fontSize = bag('font-size'), radius = bag('radius'), dur = bag('duration'), lh = bag('line-height'), tracking = bag('letter-spacing');

const px = (s) => [...s.matchAll(/(-?[\d.]+)px/g)].map(m => parseFloat(m[1]));

for (const [src, file] of cssFiles) {
  const t = readFileSync(file, 'utf8');
  for (const m of t.matchAll(/(?:^|[\s;{])(padding|margin|gap|row-gap|column-gap)(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?\s*:\s*([^;}]+)/g))
    px(m[2]).forEach(v => spacing.add(v, src));
  for (const m of t.matchAll(/font-size\s*:\s*([^;}]+)/g)) px(m[1]).forEach(v => fontSize.add(v, src));
  for (const m of t.matchAll(/border-radius\s*:\s*([^;}]+)/g)) px(m[1]).forEach(v => radius.add(v, src));
  for (const m of t.matchAll(/line-height\s*:\s*([\d.]+)\s*[;}]/g)) lh.add(parseFloat(m[1]), src);
  for (const m of t.matchAll(/letter-spacing\s*:\s*(-?[\d.]+)em/g)) tracking.add(parseFloat(m[1]), src);
  for (const m of t.matchAll(/(-?[\d.]+)(ms|s)\b/g)) {
    const v = m[2] === 's' ? parseFloat(m[1]) * 1000 : parseFloat(m[1]);
    if (v > 0 && v <= 2000) dur.add(v, src);
  }
}

// holosphere: Tailwind v4 classes
const walk = (d, out=[]) => { for (const e of readdirSync(d)) { const p = join(d,e); if (e === 'node_modules' || e === '.git') continue; const s = statSync(p); if (s.isDirectory()) walk(p, out); else if (/\.(tsx|ts)$/.test(e)) out.push(p); } return out; };
const hs = walk(`${R}/holosphere/src`);
const TW_TEXT = {xs:12,sm:14,base:16,lg:18,xl:20,'2xl':24,'3xl':30,'4xl':36,'5xl':48,'6xl':60,'7xl':72};
const TW_R = {none:0,xs:2,sm:4,md:6,lg:8,xl:12,'2xl':16,'3xl':24,full:9999};
for (const f of hs) {
  const t = readFileSync(f, 'utf8');
  for (const m of t.matchAll(/(?:^|["'\s`])-?(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-(\d+(?:\.5)?)\b/g))
    spacing.add(parseFloat(m[1]) * 4, 'h');
  for (const m of t.matchAll(/(?:^|["'\s`])text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl)\b/g)) fontSize.add(TW_TEXT[m[1]], 'h');
  for (const m of t.matchAll(/(?:^|["'\s`])rounded(?:-(none|xs|sm|md|lg|xl|2xl|3xl|full))?\b/g)) radius.add(TW_R[m[1] ?? 'md'] ?? 6, 'h');
  for (const m of t.matchAll(/(?:^|["'\s`])duration-(\d+)\b/g)) dur.add(parseFloat(m[1]), 'h');
  for (const m of t.matchAll(/fontSize:\s*(\d+)/g)) fontSize.add(parseFloat(m[1]), 'h');
}

const SCALE = {
  spacing: [0,4,8,12,16,24,32,48,64,96],
  'font-size': [11.24,12.64,14.22,16,20,25,31.25,39.06],
  radius: [0,4,8,12,16,9999],
  duration: [100,141.4,200,282.8,400],
};
const near = (v, arr) => arr.reduce((a,b)=> Math.abs(b-v) < Math.abs(a-v) ? b : a);

for (const b of [spacing, fontSize, radius, dur, lh, tracking]) {
  const vals = Object.keys(b.m).map(Number).sort((a,c)=>a-c);
  console.log(`\n===== ${b.name} (${vals.length} distinct) =====`);
  const scale = SCALE[b.name];
  let hit=0;
  for (const v of vals) {
    const src = [...b.m[v]].sort().join('');
    if (!scale) { console.log(`  ${String(v).padStart(7)}  [${src}]`); continue; }
    const n = near(v, scale);
    const exact = Math.abs(n - v) < 0.001;
    if (exact) hit++;
    const d = v === 0 ? 0 : ((n - v) / v * 100);
    console.log(`  ${String(v).padStart(7)}  [${src.padEnd(3)}]  ${exact ? '✓ 一致' : `→ ${n}  (${d>0?'+':''}${d.toFixed(1)}%)`}`);
  }
  if (scale) console.log(`  --- 完全一致 ${hit}/${vals.length}`);
}
