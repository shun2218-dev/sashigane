/**
 * コンポーネントに3状態の例が揃っていることを検査する（決定6-4）。
 *
 * `development-process.md` は「**3状態の例を必ず添える。例がない時点で自己レビュー不合格**」
 * と決めているが、**人が見るしかなかった。**
 * 機械的に検査できるものは文書ではなく検査にする（教訓3）——
 * 規則を書いた本人が同じコミットの中でその規則を破った実例が、このリポジトリにはある。
 *
 * ## 例は唯一の正である
 *
 * 決定6-4 は「**ドキュメントサイトの描画・配信 JSON・型表はすべて例から出す**」と決めた。
 * したがって**例が無いことは、どこにも展示されないことを意味する。**
 * 3状態が揃っていないコンポーネントは、揃っていない分だけ見えない。
 *
 * ## この検査が見ているもの
 *
 *   1. `packages/ui/src/<component>/` に `examples/` があること
 *   2. その中に `default` `empty` `edge` が揃っていること
 *   3. どれも**既定エクスポートを持つ**こと（描画に使うため）
 *
 * ## この検査が見ていないもの（教訓5）
 *
 *   - **例の中身が3状態を表しているか。** `empty.tsx` に中身を書いても通る。
 *     名前と実態の一致は読まないと分からない
 *   - **追加の例。** 3つ以上は自由なので、数は見ない
 *   - **既定エクスポートが React コンポーネントかどうか。** 静的には型まで見ていない
 *     （`pnpm typecheck` の担当）
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** 決定6-4。**この3つは必須。追加は自由** */
const REQUIRED = ['default', 'empty', 'edge'];

const UI = 'packages/ui/src';

/** 既定エクスポートを持つか。`export default function` も `export default X` も拾う */
const hasDefaultExport = (source) => /^\s*export\s+default\s/m.test(source);

/**
 * 1つのコンポーネントディレクトリを見る。**純粋な関数にしてある。**
 * 対照をフィクスチャの構造で当てられるようにするため。
 */
const inspect = (name, files) => {
  const problems = [];
  const found = new Map(files.map((f) => [f.name.replace(/\.tsx$/, ''), f.source]));
  for (const state of REQUIRED) {
    if (!found.has(state)) {
      problems.push({ component: name, state, why: 'missing' });
      continue;
    }
    if (!hasDefaultExport(found.get(state))) {
      problems.push({ component: name, state, why: 'no-default-export' });
    }
  }
  return problems;
};

/* ============================================================
   対照 — 検出器が発火することを毎回確かめる（教訓2）
   ============================================================ */

const failures = [];

{
  const missing = inspect('fixture', [
    { name: 'default.tsx', source: 'export default function A() { return null; }' },
    { name: 'edge.tsx', source: 'export default function C() { return null; }' },
  ]);
  if (!missing.some((p) => p.state === 'empty' && p.why === 'missing')) {
    failures.push('陰性対照が発火しない: empty.tsx が無いことを検出できていない');
  }
  if (missing.some((p) => p.state === 'default')) {
    failures.push('陽性対照が落ちた: 揃っている default.tsx を問題として報告した');
  }
}

{
  const noExport = inspect('fixture', [
    { name: 'default.tsx', source: 'const A = () => null;' },
    { name: 'empty.tsx', source: 'export default function B() { return null; }' },
    { name: 'edge.tsx', source: 'export default function C() { return null; }' },
  ]);
  if (!noExport.some((p) => p.state === 'default' && p.why === 'no-default-export')) {
    failures.push('陰性対照が発火しない: 既定エクスポートが無いことを検出できていない');
  }
  if (noExport.length !== 1) {
    failures.push(`陽性対照が落ちた: 問題は1件のはずが ${noExport.length} 件`);
  }
}

{
  // **通るべきもの。** 揃っていて既定エクスポートもある形が落ちないこと
  const ok = inspect('fixture', REQUIRED.map((s) => ({
    name: `${s}.tsx`,
    source: `export default function X() { return null; }`,
  })));
  if (ok.length) failures.push(`陽性対照が落ちた: ${ok.map((p) => p.state).join(' ')}`);
}

if (failures.length) {
  console.error('対照に失敗しました。**この検査は機能していません。**\n');
  for (const m of failures) console.error(`  ✗ ${m}`);
  console.error('\n検出器を直してください。0 件という結果は信用できません（教訓2）。');
  process.exit(1);
}

/* ============================================================
   本体
   ============================================================ */

/**
 * コンポーネントのディレクトリ。**追跡下のものだけを見る。**
 * `git ls-files` に無いファイルは配布にも展示にも乗らない。
 */
const tracked = execSync(`git ls-files ${UI}`, { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

/** `packages/ui/src/<name>/<name>.tsx` を持つディレクトリをコンポーネントとみなす */
const components = [...new Set(tracked.map((f) => f.split('/')[3]))]
  .filter((name) => name && tracked.includes(`${UI}/${name}/${name}.tsx`))
  .sort();

const problems = [];
for (const name of components) {
  const dir = join(UI, name, 'examples');
  const files = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.tsx'))
        .map((f) => ({ name: f, source: readFileSync(join(dir, f), 'utf8') }))
    : [];
  problems.push(...inspect(name, files));
}

const MESSAGE = {
  missing: '例がありません',
  'no-default-export': '既定エクスポートがありません（描画に使えません）',
};

if (problems.length) {
  console.error('コンポーネントの例が揃っていません（決定6-4）。\n');
  for (const p of problems) {
    console.error(`  ✗ ${UI}/${p.component}/examples/${p.state}.tsx  ${MESSAGE[p.why]}`);
  }
  console.error(
    `\n必須は ${REQUIRED.join(' / ')} の3つです（通常 / 空 / エッジケース）。追加は自由です。` +
      '\n**例が無いことは、どこにも展示されないことを意味します**——' +
      '\nドキュメントサイトの描画・配信 JSON・型表は、すべて例から出しています（決定6-4）。',
  );
  process.exit(1);
}

if (components.length === 0) {
  console.error(`${UI} にコンポーネントがありません。検査対象が消えています。`);
  process.exit(1);
}

console.log(`✓ 対照 3 件が期待どおり（欠落・既定エクスポート無し・揃っている形）`);
console.log(
  `✓ コンポーネント ${components.length} 件（${components.join(' ')}）に ` +
    `${REQUIRED.join(' / ')} が揃っている`,
);
