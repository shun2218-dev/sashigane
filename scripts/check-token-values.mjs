/**
 * tokens.js の値が tokens.css とずれていないことを検査する。
 *
 * 同じセマンティックが2つの生成物に別の形で出る。**二重管理そのもの**なので、
 * 一致を機械的に確かめないと片方だけ直したときに静かにずれる。
 * これは Phase 2 で ichirizuka に実際に起きた失敗の形である
 * （凡例は CSS、データは JS。片方だけ新しくなって色が食い違った）。
 *
 * 検査は**生成器ではなく出力された CSS のテキストから**値を組み立てて突き合わせる。
 * 両方を palette から作ると同じコードを2回通すだけになり、ずれを検出できない。
 *
 * 16進への変換と var() フォールバックの展開だけは packages/tokens の実装を借りる。
 * ここで sRGB 変換や CSS の入れ子解析を書き直すと、**その正しさを検査する検査**が
 * 要ることになり、正が2つになる。
 *
 * 検査できないこと:
 *   - 変換そのものの誤り（上記の理由で共有している）
 *   - tokens.css と tokens.js が同じ palette から出ていること
 *     （build.mjs が1回の実行で両方を書くので、構造上ずれない）
 */
import { existsSync, readFileSync } from 'node:fs';
import { toHex } from '../packages/tokens/src/color/oklch.ts';
import { expandVarFallbacks } from '../packages/tokens/src/output/values.ts';

const DIST = 'packages/tokens/dist';
for (const f of ['tokens.css', 'tokens.js', 'tokens.layers.json']) {
  if (!existsSync(`${DIST}/${f}`)) {
    console.error(`${DIST}/${f} がありません。先に pnpm build:tokens を実行してください。`);
    process.exit(1);
  }
}

const css = readFileSync(`${DIST}/tokens.css`, 'utf8');
const layers = JSON.parse(readFileSync(`${DIST}/tokens.layers.json`, 'utf8'));

/* ---------- tokens.css から値を組み立てる ---------- */

/** セレクタのブロックを取り出す。@media の中は入れ子なので開始位置を指定して切る */
const blockAfter = (from) => {
  const start = css.indexOf('{', from);
  const end = css.indexOf('\n}', start);
  return css.slice(start, end);
};

const declarations = (block) => {
  const out = new Map();
  for (const m of block.matchAll(/(--sg-[a-z0-9-]+):\s*([^;]+);/g)) out.set(m[1], m[2].trim());
  return out;
};

const OKLCH = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/;
const asValue = (raw) => {
  const m = OKLCH.exec(raw);
  if (m) return toHex({ L: Number(m[1]), C: Number(m[2]), H: Number(m[3]) });
  // 書体スタックは差し込み口を含む。JS 側は既定へ展開した姿を持つ（決定1-11）
  return expandVarFallbacks(raw);
};

const root = declarations(blockAfter(css.indexOf(':root {')));
const darkBlock = declarations(blockAfter(css.indexOf('[data-theme="dark"] {')));

/** プリミティブは :root にしか出ない */
const primitives = new Map();
for (const name of layers.primitives) {
  const raw = root.get(name);
  if (raw === undefined) {
    console.error(`tokens.css にプリミティブ ${name} がありません。`);
    process.exit(1);
  }
  primitives.set(name, asValue(raw));
}

const resolveFrom = (block, name) => {
  const raw = block.get(name);
  if (raw === undefined) return undefined;
  const ref = /^var\((--sg-[a-z0-9-]+)\)$/.exec(raw);
  return ref ? primitives.get(ref[1]) : asValue(raw);
};

const fromCss = {
  light: Object.fromEntries(layers.semantics.map((n) => [n, resolveFrom(root, n)])),
  // タイポグラフィは暗色ブロックに出ないので :root の値が生きる
  dark: Object.fromEntries(
    layers.semantics.map((n) => [n, resolveFrom(darkBlock, n) ?? resolveFrom(root, n)]),
  ),
};

/* ---------- tokens.js を読む ---------- */
const { tokens } = await import(`../${DIST}/tokens.js`);

/* ---------- 突き合わせ ---------- */
const errors = [];
for (const theme of ['light', 'dark']) {
  const js = tokens[theme];
  if (!js) {
    errors.push(`tokens.js に ${theme} がありません。`);
    continue;
  }
  for (const name of layers.semantics) {
    const expected = fromCss[theme][name];
    if (expected === undefined) {
      errors.push(`tokens.css の ${theme} に ${name} がありません。`);
    } else if (js[name] !== expected) {
      errors.push(`${theme} の ${name} がずれています: css=${expected} js=${js[name]}`);
    }
  }
  for (const name of Object.keys(js)) {
    if (!layers.semantics.includes(name)) {
      errors.push(`tokens.js の ${theme} に、セマンティックでない ${name} が出ています。`);
    }
  }
}

if (errors.length) {
  console.error('tokens.js と tokens.css の値がずれています。\n');
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log(`✓ light / dark の ${layers.semantics.length} 件が tokens.css と一致`);
console.log('✓ tokens.js にセマンティック以外の名前は出ていない');
