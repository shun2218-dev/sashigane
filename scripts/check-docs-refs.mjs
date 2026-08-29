/**
 * 文書が挙げている**名前と参照**が実在することを検査する。
 *
 * ## なぜ要るのか
 *
 * `check:docs-scales` が照合するのは**数値表だけ**である。
 * 値は生成器から出るので目立つが、**名前と扱いは人が書く**ので、より腐りやすい。
 *
 * 実際、Phase 1 の棚卸し（Issue #91）で7件のすれ違いが見つかり、
 * うち3件は生成物と突き合わせれば機械的に見つかるものだった。
 * 経緯は docs/agent-failures.md の 2026-08-29 の記録。
 *
 * ## 見るもの
 *
 *   1. 文書内の `--sg-*` が名前表に実在すること
 *   2. 「決定 N-M」「教訓 N」の参照が実在すること
 *   3. 決定3-3 の名前空間表が theme.css と一致すること
 *
 * ## この検査が原理的に見逃す範囲（教訓5）
 *
 *   - **自然言語の主張。** 「未実装です」が嘘かどうかは読まないと分からない。
 *     README の警告ブロックも実験記録の記述もここに入る
 *   - **文脈。** 「以前は `--sg-elevation-0` が出ていた」という歴史的な言及と、
 *     「`--sg-elevation-0` を使う」という現役の記述を区別できない。
 *     そのため文書にだけ現れる名前は**理由つきの許可リスト**で許す（下記 DOC_ONLY）
 *   - 文書が触れていないこと。**書かれていない古さは見えない**
 *
 * ## 陰性対照
 *
 * 違反が 0 件であることと、検出器が壊れていることは区別がつかない（教訓2）。
 * 実行のたびに、意図的な違反を含むフィクスチャへ同じ検出器を当て、
 * **発火しなければこの検査自体を失敗させる。**
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const LAYERS = 'packages/tokens/dist/tokens.layers.json';
const THEME = 'packages/tokens/dist/theme.css';

/**
 * 検査する文書。**一覧を手で持たない**（決定2-6、自己レビュー B1）。
 *
 * 手で並べると、文書を足したときに足し忘れた分だけ**黙って検査されない。**
 * `check-token-usage.mjs` と同じく `git ls-files` から集める。
 *
 * **verification.md も入る。** どの検査も見ていない文書があること自体が穴だった。
 */
const EXCLUDED = [
  // 生成物の配布先に置く説明。--sg-* も決定番号も出てこない
  { re: /^packages\/tokens\/dist\//, why: '生成物' },
];

const docFiles = () =>
  execSync('git ls-files "*.md"', { encoding: 'utf8' })
    .split('\n')
    .filter((f) => f && existsSync(f))
    .filter((f) => !EXCLUDED.some((e) => e.re.test(f)));

/**
 * **文書にだけ現れてよい `--sg-*` の名前**（教訓5 の許可リスト方式）。
 *
 * 落とした名前・退けた案・今後の候補など、**現役でない名前を挙げる正当な理由**がある。
 * ここに理由つきで並べたものだけを許し、それ以外は落とす。
 * **理由が書けない古い名前は、直すべき記述である。**
 *
 * 使われなくなった項目も落とす。**古い理由は消す。**
 */
const DOC_ONLY = new Map([
  ['--sg-color-bg-surface', 'Issue #65 で落とした名前。落とした経緯を決定5-12 が記録している'],
  ['--sg-color-bg-inset', '同上'],
  ['--sg-color-bg-danger', '決定3-2・2-6 が退けた案の中の例（色システムより前の命名）'],
  ['--sg-color-bg-danger-hover', '同上'],
  ['--sg-color-bg-hover', '決定5-13 が退けた「塗るだけの道」の例'],
  ['--sg-color-hover-bg', '決定1-14 改訂で --sg-color-deeper-bg に改名した。改名の経緯として残す'],
  ['--sg-font-weight-700', '決定1-13 が退けた案（数値の段をそのまま出す）'],
  ['--sg-elevation-0', '決定1-8 改訂で落とした高さの数字。落とした理由を書くために挙げている'],
  ['--sg-elevation-1', '同上。agent-failures.md が棚卸しの記録として引いている'],
  ['--sg-blue-500', '決定2-1 が色システムより前に挙げていた例。agent-failures.md が記録として引いている'],
  ['--sg-line-height-3', 'tailwind-v4-spacing.md の実験用に手で書いた入力。行高は3系統ある（決定1-4）'],
  ['--sg-radius-control', 'sample-page.md が「今後決めること」の候補として挙げている名前'],
  ['--sg-space', 'agent-failures.md が「名前に切り詰めてはいけない形」として挙げている非名前'],
]);

/** 名前の一部として書かれた雛形（`--sg-space-{段}` など）。名前ではないので見ない */
const isTemplate = (name) => /-$|\{|\*/.test(name);

/* ============================================================
   検出器（フィクスチャにも実ファイルにも同じものを当てる）
   ============================================================ */

/** 文書に現れる `--sg-*`。行番号つき */
const sgNames = (text) =>
  [...text.matchAll(/--sg-[a-z0-9-]+/g)].map((m) => ({
    name: m[0],
    line: text.slice(0, m.index).split('\n').length,
  }));

/**
 * 「決定 N-M」「保留 N-M」「教訓 N」の参照。
 *
 * **`保留` も拾う**（自己レビュー B3）。`decisions.md` には `### 保留 4-5` があり、
 * 集める側は拾っている。片方だけの語彙にすると、参照が静かに照合されない。
 */
const refs = (text) => [
  ...[...text.matchAll(/(?:決定|保留)\s?(\d+-\d+)/g)].map((m) => ({
    kind: 'decision',
    id: m[1],
    line: text.slice(0, m.index).split('\n').length,
  })),
  ...[...text.matchAll(/教訓\s?(\d+)/g)].map((m) => ({
    kind: 'lesson',
    id: m[1],
    line: text.slice(0, m.index).split('\n').length,
  })),
];

/**
 * 決定3-3 の名前空間表を読む。`| \`--x-*\` … | 落とす / 写像する | 理由 |`
 *
 * **表の形に依存する。** 形を変えたら行が見つからなくなり、下の行数の検査が落ちる。
 * 黙って 0 件になることはない。
 */
const namespaceRows = (doc) => {
  const start = doc.indexOf('#### 落としたまま写像しない名前空間');
  if (start === -1) return null;
  const end = doc.indexOf('####', start + 1);
  return doc
    .slice(start, end === -1 ? undefined : end)
    .split('\n')
    .filter((l) => l.startsWith('| `--'))
    .map((row) => ({
      namespaces: [...row.matchAll(/`(--[a-z-]+?)-?\*`/g)].map((m) => m[1]),
      drop: /\|\s*落とす\s*\|/.test(row),
    }));
};

/* ============================================================
   陰性対照 — 検出器が発火することを先に確かめる（教訓2）
   ============================================================ */

const expect = (cond, msg) => {
  if (!cond) {
    console.error(`陰性対照が期待どおりに動いていない: ${msg}`);
    console.error('検出器が壊れている可能性があるため、本体の検査に進まず失敗させる。');
    process.exit(1);
  }
};

{
  const fixture = [
    '`--sg-color-accent` は現役、`--sg-nonexistent-9` は存在しない。',
    '決定5-16 は実在し、決定9-9 は実在しない。教訓7 は実在し、教訓99 は実在しない。',
    '保留4-5 も参照として拾う（集める側が拾っているので、照合する側も拾う）。',
    '`--sg-space-{段}` と `--sg-color-*` は雛形なので見ない。',
  ].join('\n');

  const names = sgNames(fixture).filter((n) => !isTemplate(n.name));
  expect(
    names.some((n) => n.name === '--sg-nonexistent-9'),
    '存在しない --sg-* を検出できていない',
  );
  expect(
    names.some((n) => n.name === '--sg-color-accent'),
    '現役の --sg-* を拾えていない（拾えなければ実在の照合もできない）',
  );
  expect(
    !names.some((n) => n.name.includes('{') || n.name.endsWith('-')),
    '雛形まで名前として拾っている',
  );

  const r = refs(fixture);
  expect(r.some((x) => x.kind === 'decision' && x.id === '9-9'), '決定の参照を拾えていない');
  expect(r.some((x) => x.kind === 'lesson' && x.id === '99'), '教訓の参照を拾えていない');
  expect(r.some((x) => x.kind === 'decision' && x.id === '4-5'), '保留の参照を拾えていない');
}

/* ============================================================
   本体
   ============================================================ */

for (const f of [LAYERS, THEME]) {
  if (!existsSync(f)) {
    console.error(`${f} がありません。先に pnpm build:tokens を実行してください。`);
    process.exit(1);
  }
}

const layers = JSON.parse(readFileSync(LAYERS, 'utf8'));
const known = new Set([
  ...layers.primitives,
  ...layers.semantics,
  ...layers.inputs,
  ...layers.internals,
]);
const themeVars = [...readFileSync(THEME, 'utf8').matchAll(/^\s*(--[a-z0-9\\.-]+)\s*:/gm)]
  .map((m) => m[1])
  .filter((v) => v !== '--*');

const decisions = readFileSync('docs/decisions.md', 'utf8');
const knownDecisions = new Set(
  [...decisions.matchAll(/^### (?:決定|保留) (\d+-\d+)/gm)].map((m) => m[1]),
);
/** **個数ではなく番号の集合。** 教訓を廃止して番号が飛んだときに、実在するものを落とさない */
const knownLessons = new Set(
  [...readFileSync('docs/lessons.md', 'utf8').matchAll(/^### (\d+)\./gm)].map((m) => m[1]),
);

const errors = [];
const usedDocOnly = new Set();

const docs = docFiles();
for (const f of docs) {
  const text = readFileSync(f, 'utf8');

  for (const { name, line } of sgNames(text)) {
    if (isTemplate(name) || known.has(name)) continue;
    if (DOC_ONLY.has(name)) {
      usedDocOnly.add(name);
      continue;
    }
    errors.push(`${f}:${line}  ${name} は名前表に無い（打ち間違いか、古い記述）`);
  }

  for (const { kind, id, line } of refs(text)) {
    if (kind === 'decision' && !knownDecisions.has(id)) {
      errors.push(`${f}:${line}  決定${id} が decisions.md に無い`);
    }
    if (kind === 'lesson' && !knownLessons.has(id)) {
      errors.push(`${f}:${line}  教訓${id} が lessons.md に無い`);
    }
  }
}

/** 使われなくなった許可。**古い理由は消す** */
for (const name of DOC_ONLY.keys()) {
  if (!usedDocOnly.has(name)) {
    errors.push(`DOC_ONLY の ${name} はどの文書にも現れない（一覧から消すこと）`);
  }
}

/* --- 名前空間表 --- */
const rows = namespaceRows(decisions);
if (!rows || rows.length === 0) {
  errors.push('決定3-3 の名前空間表が読めない（表の形を変えたならこのスクリプトも直すこと）');
} else {
  for (const { namespaces, drop } of rows) {
    for (const ns of namespaces) {
      const emitted = themeVars.some((v) => v === ns || v.startsWith(`${ns}-`));
      if (drop === emitted) {
        errors.push(
          `決定3-3 の表: ${ns}-* は「${drop ? '落とす' : '写像する'}」と書いてあるが、` +
            `theme.css には${emitted ? 'ある' : 'ない'}`,
        );
      }
    }
  }
}

if (errors.length) {
  console.error('文書が挙げている名前・参照が実装と合っていません。\n');
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(
    '\n古い記述なら直してください。挙げる理由がある名前は、' +
      'scripts/check-docs-refs.mjs の DOC_ONLY に**理由つきで**並べてください。',
  );
  process.exit(1);
}

console.log(`✓ ${docs.length} 文書の --sg-* が名前表と一致（文書にだけ現れる ${usedDocOnly.size} 件は理由つき）`);
console.log(`✓ 決定（${knownDecisions.size} 件）と教訓（${knownLessons.size} 件）の参照がすべて実在する`);
console.log(`✓ 決定3-3 の名前空間表 ${rows.length} 行が theme.css と一致`);
