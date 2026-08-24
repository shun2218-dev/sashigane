/**
 * tokens.css がフレームワーク非依存で単体成立することを検査する（原則4）。
 *
 * decisions.md 決定4-4 の表で唯一残っていた検査。
 * 「素の HTML に tokens.css だけを読み込み、CSS 変数が解決すること」
 *
 * 実ブラウザでの確認は別途行うが（記録は PR に残す）、CI で回すために
 * ここでは静的に検証する。**したがってブラウザ固有の解決失敗は捕まえられない。**
 * 捕まえられるのは以下。
 *   - 外部への依存（@import、@apply、Tailwind 固有の記法）
 *   - 未定義の変数を参照している var()
 *     ただし差し込み口（名前表の inputs、決定1-11・2-7）は**未定義が正常**である。
 *     宣言すると var() のフォールバックが効かなくなるため、生成物は宣言しない。
 *     代わりに「必ずフォールバックを伴っていること」を検査する。
 *     フォールバックが無いと font-family 宣言ごと無効になり、**エラーは出ない**（教訓4）
 *   - セマンティックが1件も無い（出力が空）
 *   - 名前表（dist/tokens.layers.json）にあるセマンティックが tokens.css に無い
 *
 * 実ブラウザでの解決は apps/docs の /standalone.html で目視する。
 * 静的検査だけでは「解決する」を証明できない。
 */
import { readFileSync, existsSync } from 'node:fs';

const path = 'packages/tokens/dist/tokens.css';
if (!existsSync(path)) {
  console.error(`${path} がありません。先に pnpm build:tokens を実行してください。`);
  process.exit(1);
}
const css = readFileSync(path, 'utf8');
const errors = [];

/* ---------- 1. 外部への依存が無いこと ---------- */
const FORBIDDEN = [
  { re: /@import\b/, why: '外部ファイルに依存している' },
  { re: /@apply\b/, why: 'Tailwind の記法に依存している' },
  { re: /@tailwind\b/, why: 'Tailwind の記法に依存している' },
  { re: /@theme\b/, why: 'Tailwind の記法に依存している。アダプタは theme.css の担当' },
  { re: /theme\(/, why: 'Tailwind の関数に依存している' },
  { re: /url\(/, why: '外部アセットに依存している' },
];
for (const { re, why } of FORBIDDEN) {
  const m = re.exec(css);
  if (m) errors.push(`${why}: 「${m[0]}」`);
}

/* ---------- 2. 参照している変数がすべて定義されていること ---------- */
const LAYERS = 'packages/tokens/dist/tokens.layers.json';
if (!existsSync(LAYERS)) {
  console.error(`${LAYERS} がありません。先に pnpm build:tokens を実行してください。`);
  process.exit(1);
}
const layers = JSON.parse(readFileSync(LAYERS, 'utf8'));
const inputs = new Set(layers.inputs ?? []);

const defined = new Set([...css.matchAll(/^\s*(--sg-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]));
const referenced = new Set([...css.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((m) => m[1]));
for (const name of referenced) {
  if (defined.has(name) || inputs.has(name)) continue;
  errors.push(`未定義の変数を参照している: ${name}`);
}

/* 差し込み口は宣言されていてはならない（宣言するとフォールバックが死ぬ） */
for (const name of inputs) {
  if (defined.has(name)) {
    errors.push(
      `差し込み口 ${name} が宣言されている。宣言すると var() のフォールバックが効かない（決定1-11）`,
    );
  }
}

/* 差し込み口の参照には必ずフォールバックが要る。無いと宣言ごと無効になる（教訓4） */
for (const m of css.matchAll(/var\(\s*(--sg-[a-z0-9-]+)\s*([,)])/g)) {
  if (!inputs.has(m[1])) continue;
  if (m[2] === ')') {
    errors.push(`差し込み口 ${m[1]} の参照にフォールバックが無い。未定義のとき宣言が丸ごと無効になる`);
  }
}

/* ---------- 3. セマンティックが1つ以上あること（空の出力を通さない） ----------
 *
 * 当初は名前の形（`--sg-{英字}-{英字}`）でセマンティックを数えていたが、
 * `--sg-border-width-0` のようなプリミティブも数えてしまい 91 件と表示していた（実際は 40 件）。
 * **層は名前の形から推測しない**（決定2-3 の改訂、docs/agent-failures.md 2026-08-24）。
 * 生成器が出す名前表を使う。
 */
const semantic = layers.semantics;
if (semantic.length === 0) {
  errors.push('セマンティックが1つも定義されていない。出力が空の可能性がある');
}

for (const name of semantic) {
  if (!defined.has(name)) {
    errors.push(`名前表にあるセマンティックが tokens.css に無い: ${name}`);
  }
}

/* ---------- 結果 ---------- */
if (errors.length) {
  console.error('tokens.css の単体成立性の検査に失敗しました。\n');
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`✓ 外部依存が無い（${FORBIDDEN.length} 種の記法を検査）`);
console.log(
  `✓ 参照 ${referenced.size} 件がすべて解決する（定義 ${defined.size} 件 + 差し込み口 ${inputs.size} 件）`,
);
console.log(`✓ 差し込み口 ${inputs.size} 件は宣言されておらず、参照は必ずフォールバックを伴う`);
console.log(`✓ セマンティックが ${semantic.length} 件ある`);
console.log('\ntokens.css は単体で成立しています（原則4）');
