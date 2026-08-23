/**
 * packages/tokens が単体で成立していることを検査する（原則4: 依存は一方通行）。
 *
 * トークン層が React も packages/ui も知らずに動くことが、このデザインシステムの
 * 設計の証明である。README でそう主張している以上、機械的に検査できなければならない。
 *
 * 検査するのは2つ。
 *   1. dependencies が空であること（devDependencies は対象外）
 *   2. src が外部モジュールを一切 import していないこと
 *
 * 2 は「react を禁止する」ではなく「相対パスと node: 以外を全部禁止する」形にしている。
 * 禁止リスト方式だと、リストに無い依存が入ったときに黙って通る。
 * docs/agent-failures.md の教訓4「静かに失敗するものを疑う」より。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const PKG = 'packages/tokens';
const errors = [];

/* ---------- 1. dependencies が空であること ---------- */
const manifest = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8'));
const deps = Object.keys(manifest.dependencies ?? {});
if (deps.length > 0) {
  errors.push(
    `${PKG}/package.json の dependencies が空ではありません: ${deps.join(', ')}\n` +
      '  トークン層は単体で成立しなければならない（原則4）。',
  );
}
if (Object.keys(manifest.peerDependencies ?? {}).length > 0) {
  errors.push(`${PKG}/package.json に peerDependencies があります。同じ理由で許可されません。`);
}

/* ---------- 2. src が外部モジュールを import していないこと ---------- */
const walk = (dir, out = []) => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mts|js|mjs)$/.test(e)) out.push(p);
  }
  return out;
};

/** import / export ... from '…' と dynamic import('…') */
const SPECIFIER = /(?:\bfrom\s*|(?:\bimport|\brequire)\s*\(\s*)['"]([^'"]+)['"]/g;
const isInternal = (spec) => spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('node:');

for (const file of walk(join(PKG, 'src'))) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(SPECIFIER)) {
    const spec = m[1];
    if (isInternal(spec)) continue;
    const line = text.slice(0, m.index).split('\n').length;
    errors.push(
      `${relative(process.cwd(), file)}:${line} が外部モジュールを import しています: '${spec}'\n` +
        '  トークン層は相対パスと node: 以外を import できない（原則4）。',
    );
  }
}

/* ---------- 結果 ---------- */
if (errors.length) {
  console.error('packages/tokens の独立性検査に失敗しました。\n');
  for (const e of errors) console.error(`  ✗ ${e}\n`);
  process.exit(1);
}

console.log('✓ dependencies が空である');
console.log('✓ src が外部モジュールを import していない');
console.log('\npackages/tokens は単体で成立しています（原則4）');
