/**
 * 生成した型定義が実際に型として成立することを検査する。
 *
 * `pnpm typecheck` が見るのは packages/tokens と apps/docs の**ソース**であって、
 * dist に書き出した `tokens.d.ts` ではない。
 * **構文が壊れた .d.ts を出しても CI は緑のまま通る。** 生成物なので誰も目で読まない。
 * 教訓4「静かに失敗するものを疑う」より。
 *
 * 検査するのは2つ。
 *   1. 正しい使い方がコンパイルを通ること
 *   2. **プリミティブへのアクセスが型エラーになること**（原則3 が型の側からも効く）
 *
 * 2 が要るのは、1 だけだと「コンパイルが通る」しか言えないからである。
 * 型を Record<string, string> に広げれば 1 は通り続け、
 * **原則3 が型から失われたことに気づけない。**
 *
 * 検査できないこと:
 *   - 実行時の値。tokens.js の中身は check-token-values.mjs が見る
 *   - tsc の設定差。ここでは strict / bundler 解決で検査しており、
 *     利用側が別の設定を使う場合の挙動までは見ていない
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DIST = 'packages/tokens/dist';
for (const f of ['tokens.d.ts', 'tokens.js']) {
  if (!existsSync(`${DIST}/${f}`)) {
    console.error(`${DIST}/${f} がありません。先に pnpm build:tokens を実行してください。`);
    process.exit(1);
  }
}

const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');

/** 通るべきもの / 落ちるべきもの。落ちる側が陰性対照になる */
const FIXTURES = [
  {
    name: '正しい使い方',
    shouldCompile: true,
    code: `
import tokens, { tokens as named, type SemanticToken, type Theme } from './tokens.js';

const theme: Theme = 'dark';
const name: SemanticToken = '--sg-color-danger';

export const a: string = named[theme][name];
export const b: string = tokens.light['--sg-color-bg-page'];
`,
  },
  {
    name: 'プリミティブを引く',
    shouldCompile: false,
    code: `
import { tokens } from './tokens.js';

export const a = tokens.light['--sg-space-3'];
`,
  },
  {
    name: 'セマンティックでない名前を SemanticToken に入れる',
    shouldCompile: false,
    code: `
import type { SemanticToken } from './tokens.js';

export const a: SemanticToken = '--sg-space-3';
`,
  },
  {
    name: '存在しないテーマを引く',
    shouldCompile: false,
    code: `
import { tokens } from './tokens.js';

export const a = tokens.sepia['--sg-color-accent'];
`,
  },
];

const dir = mkdtempSync(join(tmpdir(), 'sashigane-types-'));
const errors = [];

try {
  copyFileSync(`${DIST}/tokens.d.ts`, join(dir, 'tokens.d.ts'));
  copyFileSync(`${DIST}/tokens.js`, join(dir, 'tokens.js'));

  for (const [i, f] of FIXTURES.entries()) {
    const file = join(dir, `fixture-${i}.ts`);
    writeFileSync(file, f.code, 'utf8');

    let compiled = true;
    let output = '';
    try {
      execFileSync(
        process.execPath,
        [tsc, '--noEmit', '--strict', '--module', 'esnext', '--moduleResolution', 'bundler', file],
        { encoding: 'utf8', stdio: 'pipe' },
      );
    } catch (e) {
      compiled = false;
      output = `${e.stdout ?? ''}`.trim();
    }

    if (compiled !== f.shouldCompile) {
      errors.push(
        f.shouldCompile
          ? `「${f.name}」がコンパイルを通りませんでした。生成した型が壊れています。\n${output}`
          : `「${f.name}」がコンパイルを通ってしまいました。型が緩すぎます。`,
      );
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (errors.length) {
  console.error('生成した型定義の検査に失敗しました。\n');
  for (const e of errors) console.error(`  ✗ ${e}\n`);
  process.exit(1);
}

console.log(`✓ 生成した tokens.d.ts が型として成立する（フィクスチャ ${FIXTURES.length} 件）`);
console.log('✓ プリミティブへのアクセスは型エラーになる（原則3）');
