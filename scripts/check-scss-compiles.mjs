/**
 * 生成した tokens.scss が SCSS としてコンパイルできることを検査する。
 *
 * 生成しただけで一度も動かしていない状態だった。
 * 壊れていても誰も気づかない類のもので、教訓4（静かに失敗するものを疑う）に該当する。
 *
 * 検査できる範囲: 構文として通ること、変数が参照できること。
 * 検査できない範囲: 実際のブラウザでの見え方。
 *   SCSS 変数は CSS 変数を参照する形なので、値の正しさは tokens.css 側の検査が担う。
 */
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import * as sass from 'sass';

const path = resolve('packages/tokens/dist/tokens.scss');
if (!existsSync(path)) {
  console.error(`${path} がありません。先に pnpm build:tokens を実行してください。`);
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), 'sashigane-scss-'));
const entry = join(dir, 'in.scss');
// 変数を定義するだけでなく、実際に使ってコンパイルが通ることまで見る
writeFileSync(
  entry,
  `@use "${path.replace(/\\/g, '/')}" as sg;\n` +
    `.probe {\n` +
    `  color: sg.$sg-color-text-default;\n` +
    `  background: sg.$sg-color-bg-page;\n` +
    `  font-size: sg.$sg-text-body;\n` +
    `  line-height: sg.$sg-text-body-leading;\n` +
    `}\n`,
);

let out;
try {
  out = sass.compile(entry).css;
} catch (e) {
  console.error('tokens.scss のコンパイルに失敗しました。\n');
  console.error(`  ✗ ${e.message.split('\n')[0]}`);
  process.exit(1);
}

const errors = [];
if (!/\.probe\s*\{/.test(out)) errors.push('コンパイル結果に .probe が出ていない');
for (const v of ['--sg-color-text-default', '--sg-text-body', '--sg-text-body-leading']) {
  if (!out.includes(`var(${v})`)) {
    errors.push(`SCSS 変数が CSS 変数を参照していない: ${v}`);
  }
}
const count = (readFileSync(path, 'utf8').match(/^\$sg-/gm) ?? []).length;
if (count === 0) errors.push('SCSS 変数が1つも定義されていない');

if (errors.length) {
  console.error('tokens.scss の検査に失敗しました。\n');
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`✓ SCSS としてコンパイルできる（変数 ${count} 件）`);
console.log('✓ SCSS 変数が CSS 変数を参照している（暗色モードが実行時に効く）');
