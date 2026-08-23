/**
 * 生成した Tailwind アダプタが、実験で確認した挙動を実際に満たすことを検査する。
 *
 * 実験（docs/experiments/tailwind-v4-spacing.md）は「Tailwind v4 の仕様を確かめる」ものだった。
 * こちらは「**我々が生成したアダプタが期待どおりのユーティリティを出すか**」の回帰テストで、
 * 目的が違う。仕様が変わればここが落ちる。
 *
 * 検査できる範囲: 生成されるユーティリティの有無。
 * 検査できない範囲: 実ブラウザでの見え方、任意値記法（p-[20px]）の抑止は
 *   構造では不可能で lint の担当（決定3-1）。
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const dist = resolve('packages/tokens/dist');
for (const f of ['tokens.css', 'theme.css']) {
  if (!existsSync(join(dist, f))) {
    console.error(`${f} がありません。先に pnpm build:tokens を実行してください。`);
    process.exit(1);
  }
}

const dir = mkdtempSync(join(tmpdir(), 'sashigane-tw-'));
writeFileSync(
  join(dir, 'content.html'),
  `<div class="
    p-0 p-1 p-2 p-3 p-4 p-6 p-8 p-12 p-16 p-24
    p-5 p-7 p-9 p-20
    bg-red-500 bg-blue-500 bg-accent bg-danger bg-page bg-surface
    text-body text-caption text-display text-lg text-2xl
    leading-tight leading-7 leading-normal
    rounded-sm rounded-lg rounded-xl rounded-2xl rounded-full rounded-md rounded-3xl
    shadow-lg ease-out
    font-body font-display font-label font-numeric font-code
    font-sans font-mono font-serif
  "></div>`,
);
writeFileSync(
  join(dir, 'in.css'),
  `@import "${join(dist, 'tokens.css')}";\n@import "${join(dist, 'theme.css')}";\n@source "${join(dir, 'content.html')}";\n`,
);
execFileSync('node_modules/.bin/tailwindcss', ['-i', join(dir, 'in.css'), '-o', join(dir, 'out.css')], {
  stdio: 'pipe',
});
const out = readFileSync(join(dir, 'out.css'), 'utf8');
const has = (cls) => new RegExp(`^\\s*\\.${cls.replace(/[-]/g, '\\-')}\\s*\\{`, 'm').test(out);

/** [クラス, 生成されるべきか, 理由] */
const EXPECTATIONS = [
  ['p-4', true, 'スケールにある段（--sg-space-4 = 16px）'],
  ['p-6', true, 'スケールの 24px。Tailwind の倍数規約では 6（決定3-3）'],
  ['p-24', true, 'スケールの 96px'],
  ['p-5', false, 'スケールに無い 20px。動的生成が止まっていること（決定3-1）'],
  ['p-7', false, 'スケールに無い 28px'],
  ['p-20', false, 'スケールに無い 80px'],
  ['bg-red-500', false, '素の Tailwind の色。名前空間のリセット漏れの検出（決定3-3）'],
  ['bg-blue-500', false, '素の Tailwind の色'],
  ['bg-accent', true, 'セマンティックの写像'],
  ['bg-danger', true, 'セマンティックの写像'],
  ['bg-page', true, 'セマンティックの写像'],
  ['text-body', true, 'セマンティック役割名（決定3-3）'],
  ['text-lg', false, '素の t シャツ語彙。値が一致しないので写像していない'],
  ['text-2xl', false, '素の t シャツ語彙'],
  ['leading-tight', false, '行高の上書き手段が消えていること（決定1-4）'],
  ['leading-7', false, '--spacing 由来の動的な行高も消えていること'],
  ['rounded-sm', true, '4px。素の Tailwind と値が一致する'],
  ['rounded-2xl', true, '16px。素の Tailwind と値が一致する'],
  ['rounded-full', true, 'ピルは段ではなく別カテゴリ（決定1-5）'],
  ['rounded-md', false, '6px。対応する段が無いので定義していない'],
  ['rounded-3xl', false, '24px。対応する段が無い'],
  ['shadow-lg', false, '影は未実装。名前空間をリセットしている'],
  ['font-body', true, '書体のセマンティック役割（決定1-11）'],
  ['font-display', true, '書体のセマンティック役割'],
  ['font-label', true, '書体のセマンティック役割'],
  ['font-numeric', true, 'サイズと直交する書体役割'],
  ['font-code', true, 'サイズと直交する書体役割'],
  ['font-sans', false, '素の Tailwind の書体。--font-* のリセット漏れの検出'],
  ['font-mono', false, '素の Tailwind の書体'],
  ['font-serif', false, '素の Tailwind の書体'],
];

const failures = [];
for (const [cls, expected, why] of EXPECTATIONS) {
  const actual = has(cls);
  if (actual !== expected) {
    failures.push(`${cls}: ${expected ? '生成されるはず' : '生成されないはず'}だが ${actual ? 'ある' : 'ない'} — ${why}`);
  }
}

/* font-numeric は書体と tabular が必ず対で出ること（決定1-11）。
   Tailwind v4.3.3 に --font-*--font-variant-numeric 修飾子は無く、
   font-feature-settings でしか束ねられない（docs/experiments/font-family.md） */
const numeric = /\.font-numeric\s*\{([^}]*)\}/m.exec(out)?.[1] ?? '';
if (!/font-family:\s*var\(--sg-text-numeric-family\)/.test(numeric)) {
  failures.push('font-numeric が --sg-text-numeric-family を参照していない');
}
if (!/font-feature-settings:\s*var\(--sg-font-feature-tabular\)/.test(numeric)) {
  failures.push('font-numeric に等幅数字の指定が伴っていない。書体だけが当たると桁が揃わない');
}

/* preflight の既定書体が我々のものになっていること。
   --font-*: initial は素の Tailwind のスタックへ戻すので、差し替えないと
   本文だけがトークンの外側に残る。**エラーにならない**（教訓4） */
for (const [prop, token] of [
  ['--default-font-family', '--sg-text-body-family'],
  ['--default-mono-font-family', '--sg-text-code-family'],
]) {
  if (!new RegExp(`${prop}:\\s*var\\(${token}\\)|font-family:\\s*var\\(${token}`).test(out)) {
    failures.push(`preflight の ${prop} が ${token} になっていない`);
  }
}

/* --sg-* を直接参照しているか（@theme inline が効いているか） */
if (has('bg-accent') && !/\.bg-accent\s*\{[^}]*var\(--sg-color-accent\)/m.test(out)) {
  failures.push('bg-accent が --sg-* を直接参照していない。@theme inline が効いていない（決定3-2）');
}

if (failures.length) {
  console.error('Tailwind アダプタの検査に失敗しました。\n');
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`✓ ${EXPECTATIONS.length} 件のユーティリティが期待どおり`);
console.log('✓ セマンティックが --sg-* を直接参照している（@theme inline）');
