/**
 * コンポーネントが**実際に展示されること**を検査する（決定6-4）。
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
 *   4. **展示ページ（`content/docs/components/<component>.mdx`）があること**
 *   5. **そのページが `meta.json` の `pages` に載っていること**
 *   6. **テスト（`<component>.test.tsx`）があること**（決定6-6）
 *   7. **展示がトークンを受け取れる形になっていること**（決定6-12）
 *   8. **`asChild` を持つなら、共有の Slot を通していること**（決定6-14）
 *   9. **export した部品が、自分の名前を名乗っていること**（決定6-23）
 *
 * 4 と 5 は自己レビュー J1・J2 で足した。索引と型表はファイルシステムから導いているが、
 * **ページと `pages` の並びは手で書く。** 足し忘れると、
 * **索引にも型表にも入るのに展示されない**——しかも他のどの検査も緑のままである。
 *
 * ページ本文には設計の説明（原則5 との関係など）を書くので**生成はしない。**
 * 生成すると、その説明を置く場所が無くなる。
 *
 * 「ページはあるのに `pages` に無い」は**無いのと同じで、しかも気づきにくい。**
 *
 * ## 7 は暗黙になった依存を見ている
 *
 * プレビュー用 CSS（`apps/docs/preview.css`）は**トークンの変数を持たない。**
 * サイト外枠（`app/global.css`）が `public/tokens.css` を読むので、
 * 二重に持つ意味が無いためである（決定6-12）。
 *
 * **外枠からその1行が消えると、展示は色を1つも持たない状態になる。**
 * `--sg-*` が未定義になるだけなので**エラーは出ない**（教訓4）。
 * `check:component-classes` は生成 CSS を読むので発火せず、
 * コンポーネントのテストは実ブラウザだが**展示ページを見ていない。**
 *
 * 依存を暗黙にしたので、**壊れたときに落ちる場所をここに1つ置く。**
 *
 * ## 8 は「全部が持つこと」を見ていない
 *
 * `asChild` を**どのコンポーネントが持つべきか**は機械では決められない。
 * `Separator` に要るかは自明でなく、`Table` にはおそらく要らない。
 *
 * 見ているのは**持つなら形が1つであること**だけである。
 *
 * **コメントは落としてから見る。** 落とさずに `asChild` の語を探すと、
 * 「`asChild` を持たない」と**書いた説明そのものに反応する。**
 * 実際そうなって CI が落ちた（Spinner）。
 * `asChild` を受け取りながら `cloneElement` を自前で呼ぶと、
 * 移し方（class の連結・行事の合成・ref の配り方）が2つになる。
 * **2つになったことは、壊れるまで誰も気づかない。**
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

/** 展示ページの置き場。**ここも手で書くので検査する**（自己レビュー J1） */
const DOCS = 'apps/docs/content/docs/components';

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

/* --- 展示ページ（自己レビュー J1・J2）--- */

const pageProblems = [];
const metaPath = join(DOCS, 'meta.json');
const listed = existsSync(metaPath)
  ? new Set(JSON.parse(readFileSync(metaPath, 'utf8')).pages ?? [])
  : new Set();

for (const name of components) {
  if (!existsSync(join(DOCS, `${name}.mdx`))) {
    pageProblems.push({ component: name, why: 'no-page' });
  } else if (!listed.has(name)) {
    pageProblems.push({ component: name, why: 'not-listed' });
  }
  // **テストがあること**（決定6-6）。バグが残らないことを保証しながら進めるため、
  // コンポーネントとテストは一緒に足す。文書に書くだけでは守られない（教訓3）
  if (!existsSync(join(UI, name, `${name}.test.tsx`))) {
    pageProblems.push({ component: name, why: 'no-test' });
  }
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

if (pageProblems.length) {
  console.error('コンポーネントに足りないものがあります（決定6-4・6-6）。\n');
  for (const p of pageProblems) {
    if (p.why === 'no-page') {
      console.error(`  ✗ ${DOCS}/${p.component}.mdx がありません`);
    } else if (p.why === 'no-test') {
      console.error(`  ✗ ${UI}/${p.component}/${p.component}.test.tsx がありません（決定6-6）`);
    } else {
      console.error(`  ✗ ${p.component} が ${metaPath} の pages に載っていません`);
    }
  }
  console.error(
    '\n**索引と型表はファイルシステムから導いていますが、ページと pages の並びは手で書きます。**' +
      '\n足し忘れると、索引にも型表にも入るのに展示されません。' +
      '\nページ本文には設計の説明を書くので、生成はしていません。',
  );
  process.exit(1);
}

if (components.length === 0) {
  console.error(`${UI} にコンポーネントがありません。検査対象が消えています。`);
  process.exit(1);
}

/* ============================================================
   7. 展示がトークンを受け取れること（決定6-12）
   ============================================================ */

const GLOBAL_CSS = 'apps/docs/app/global.css';
const PREVIEW_CSS = 'apps/docs/preview.css';
/** 外枠が読むトークン。**この形が消えると展示から色が消える** */
const TOKENS_IMPORT = /@import\s+['"][^'"]*tokens\.css['"]/;

// 対照。**発火することを確かめてから 0 件と言う**（教訓2）
if (TOKENS_IMPORT.test("@import 'tailwindcss';\n@import 'fumadocs-ui/css/preset.css';")) {
  console.error('陰性対照が発火しない: トークンを読んでいない global.css');
  process.exit(1);
}
if (!TOKENS_IMPORT.test("@import '../public/tokens.css';")) {
  console.error('陽性対照が落ちた: トークンを読んでいる global.css');
  process.exit(1);
}

for (const f of [GLOBAL_CSS, PREVIEW_CSS]) {
  if (!existsSync(f)) {
    console.error(`${f} がありません。展示の CSS の構成が変わっています。`);
    process.exit(1);
  }
}

const previewHasTokens = TOKENS_IMPORT.test(readFileSync(PREVIEW_CSS, 'utf8'));
const globalHasTokens = TOKENS_IMPORT.test(readFileSync(GLOBAL_CSS, 'utf8'));

if (!previewHasTokens && !globalHasTokens) {
  console.error(
    `${GLOBAL_CSS} も ${PREVIEW_CSS} も tokens.css を読んでいません。\n\n` +
      '**展示は色を1つも持たない状態になります。**\n' +
      '--sg-* が未定義になるだけなので、エラーは出ません。\n\n' +
      `どちらかで読んでください。いまは ${GLOBAL_CSS} が読む形にしてあります。`,
  );
  process.exit(1);
}

/* ============================================================
   8. asChild は共有の Slot を通ること（決定6-14）
   ============================================================ */

/** 移し方を1つにするための共有部品 */
const SLOT = 'internal/slot.tsx';

/**
 * コメントを落とす。**残りが実装である。**
 *
 * 行コメントは `://` を避ける——URL の中の `//` を落とすと、
 * その行の残りごと消えて**見逃す側に倒れる。**
 */
const withoutComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(?<!:)\/\/[^\n]*/g, '');

/**
 * `asChild` を受け取っているか。props の型でも分解でも拾う。
 *
 * **コメントは見ない。** 「持たない」と書いた説明に反応してしまう。
 */
const takesAsChild = (source) => /\basChild\b/.test(withoutComments(source));
/** 移し方を自前で書いていないか。**共有の Slot 以外で要素を複製していないこと** */
const clonesItself = (source) => /\bcloneElement\b/.test(withoutComments(source));
const usesSlot = (source) => withoutComments(source).includes(SLOT);

const contractOf = (name, source) => {
  if (!takesAsChild(source)) return [];
  const out = [];
  if (!usesSlot(source)) out.push({ name, why: `asChild を受け取るのに ${SLOT} を使っていない` });
  if (clonesItself(source)) out.push({ name, why: '要素の複製を自前で書いている' });
  return out;
};

// 対照。**発火することを確かめてから 0 件と言う**（教訓2）
const controls = [
  ['自前で複製している', 'export function X({ asChild }) { return cloneElement(c, {}) }', true],
  ['Slot を通していない', 'export function X({ asChild }) { return asChild ? <S/> : <b/> }', true],
  ['Slot を通している', "import { Slot } from '../internal/slot.tsx';\nexport function X({ asChild }) {}", false],
  ['asChild を持たない', 'export function X() { return <b/> }', false],
  // **説明に反応しないこと。** 実際に CI が落ちた形である
  ['コメントで asChild に触れているだけ', '/* asChild を持たない。渡す中身が無い */\nexport function X() {}', false],
  ['行コメントで触れているだけ', '// asChild は持たない\nexport function X() {}', false],
];
for (const [label, source, shouldFire] of controls) {
  if (contractOf('x', source).length > 0 !== shouldFire) {
    console.error(`対照が期待どおりでない: ${label}`);
    process.exit(1);
  }
}

const contractProblems = components.flatMap((name) =>
  contractOf(name, readFileSync(join(UI, name, `${name}.tsx`), 'utf8')),
);

if (contractProblems.length) {
  console.error('asChild の移し方が1つになっていません（決定6-14）。\n');
  for (const p of contractProblems) console.error(`  ✗ ${p.name}: ${p.why}`);
  console.error(
    `\n移し方（class の連結・行事の合成・ref の配り方）が2つになると、` +
      '\n**2つになったことは壊れるまで誰も気づきません。**' +
      `\n${SLOT} を使ってください。`,
  );
  process.exit(1);
}

const withAsChild = components.filter((name) =>
  takesAsChild(readFileSync(join(UI, name, `${name}.tsx`), 'utf8')),
);

/* ============================================================
   10. 型表の印を解いていること（決定6-4）
   ============================================================ */

/**
 * 型表の説明は **JSDoc の素の文字列**である。解かずに出すと
 * `**必須である。**` のように記号がそのまま並ぶ。
 * **エラーは出ず、読みにくくなるだけ**なので、画面を見るまで気づけない（実際に踏んだ）。
 *
 * **画面からは見られない。** 型表はクライアント側で描かれるので、
 * サーバの HTML に出てこない——`check:docs-llms` で見ようとして、
 * **切り出す先が無いまま緑になっていた。**
 *
 * ここではソースの側から見る。**弱い検査である**——
 * 解く関数の中身が間違っていても通る。捕まえるのは「解くのをやめた」形だけである。
 */
const DEMO = 'apps/docs/components/component-demo.tsx';
const demoSource = existsSync(DEMO) ? readFileSync(DEMO, 'utf8') : '';

if (!demoSource) {
  console.error(`${DEMO} がありません。展示の組み立てが動いています。`);
  process.exit(1);
}
if (!/description:\s*inline\(/.test(withoutComments(demoSource))) {
  console.error('型表の説明が、印を解かずに渡されています（決定6-4）。\n');
  console.error('  ✗ `description: inline(...)` の形になっていません');
  console.error(
    '\n解かないと `**必須である。**` のように記号がそのまま並びます。' +
      '\n**エラーは出ず、読みにくくなるだけ**なので、画面を見るまで気づけません。',
  );
  process.exit(1);
}

/* ============================================================
   9. export した部品が自分の名前を名乗ること（決定6-23）
   ============================================================ */

/**
 * `CardHeader` → `card-header`。**名前の変換規則はここ1箇所だけ。**
 *
 * 印はクラスではなく data 属性にした。クラスにすると
 * `check:component-classes` の見逃す範囲へ入り、**打ち間違えても永久に捕まらない。**
 */
const markerOf = (name) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

/** export している部品の名前。`export function X` と `export const X = ` の両方 */
const exportedComponents = (source) => {
  const text = withoutComments(source);
  return [
    ...[...text.matchAll(/export\s+function\s+([A-Z]\w*)/g)].map((m) => m[1]),
    ...[...text.matchAll(/export\s+const\s+([A-Z]\w*)\s*=/g)].map((m) => m[1]),
  ];
};

/**
 * 名乗りを**別の部品から導いている**もの。
 *
 * アイコンは図案の名前（lucide の `displayName`）から名乗りを作る。
 * **手で書かないので、文字列としてはソースに現れない。**
 * 代わりに `export const IconX = defineIcon(X)` の**対応**を見る——
 * `Icon` を外した名前が図案の名前と一致していれば、名乗りは一致する。
 */
const DERIVED = /export\s+const\s+(\w+)\s*=\s*defineIcon\(\s*(\w+)/g;

const derivedPairs = (source) =>
  new Map([...withoutComments(source).matchAll(DERIVED)].map((m) => [m[1], m[2]]));

const missingMarkers = (source) => {
  const text = withoutComments(source);
  const derived = derivedPairs(source);
  return exportedComponents(source).filter((name) => {
    const from = derived.get(name);
    // 導いているものは、名前の対応で見る
    if (from !== undefined) return name !== `Icon${from}`;
    return !text.includes(`'${markerOf(name)}'`) && !text.includes(`"${markerOf(name)}"`);
  });
};

// 対照。**発火することを確かめてから 0 件と言う**（教訓2）
const markerControls = [
  ['名乗っていない', 'export function Button() { return <button/> }', true],
  ['名前がずれている', "export function Button() { return <button data-sg-component='btn'/> }", true],
  [
    '名乗っている',
    "export function Button() { return <button data-sg-component='button'/> }",
    false,
  ],
  [
    '2語の名前',
    "export const CardHeader = part('div', 'card-header', '');",
    false,
  ],
  ['コメントの中だけ', '// data-sg-component="button"\nexport function Button() {}', true],
  ['図案から導いている', 'export const IconX = defineIcon(X);', false],
  ['導いた名前がずれている', 'export const IconX = defineIcon(Plus);', true],
];
for (const [label, source, shouldFire] of markerControls) {
  if (missingMarkers(source).length > 0 !== shouldFire) {
    console.error(`対照が期待どおりでない: ${label}`);
    process.exit(1);
  }
}

const markerProblems = [];
for (const name of components) {
  for (const file of tracked.filter(
    (f) => f.startsWith(`${UI}/${name}/`) && f.endsWith('.tsx') && !f.includes('/examples/') && !f.endsWith('.test.tsx'),
  )) {
    for (const missing of missingMarkers(readFileSync(file, 'utf8'))) {
      markerProblems.push(`${file}: ${missing} が ${markerOf(missing)} を名乗っていない`);
    }
  }
}

if (markerProblems.length) {
  console.error('export した部品が自分の名前を名乗っていません（決定6-23）。\n');
  for (const p of markerProblems) console.error(`  ✗ ${p}`);
  console.error(
    '\n`data-sg-component` に部品名を小文字ハイフンで書いてください。' +
      '\n**見た目は持ちません。** 利用側が CSS でもテストでも同じように狙えるようにするためです。',
  );
  process.exit(1);
}

/* ============================================================
   11. プレビューの器は1箇所だけであること
   ============================================================ */

/**
 * プレビューの器を持つ唯一のファイル。
 *
 * **`data-sg-preview` と `not-prose` は対で要る。** 前者はプレビュー用 CSS の範囲、
 * 後者はサイト外枠の本文スタイル（`p` に 1.25em の余白）の遮断である。
 *
 * **忘れても静かに壊れる**——余白が広いだけで、エラーは出ない。
 * 実際に忘れて、フォームの説明文が入力から 20px 離れて見えていた。
 */
const PREVIEW_HOST = 'apps/docs/components/preview.tsx';
const PREVIEW_MARK = /data-sg-preview/;

// 対照。**発火することを確かめてから 0 件と言う**（教訓2）
if (!PREVIEW_MARK.test('<div data-sg-preview className="flex">')) {
  console.error('陽性対照が落ちた: 器を自分で書いている行を見逃した');
  process.exit(1);
}
if (PREVIEW_MARK.test("<div {...previewProps('flex')}>")) {
  console.error('陰性対照が発火した: 共有の器を通している行を問題として報告した');
  process.exit(1);
}

if (!existsSync(PREVIEW_HOST)) {
  console.error(`${PREVIEW_HOST} がありません。プレビューの器の置き場所が変わっています。`);
  process.exit(1);
}
if (!/not-prose/.test(readFileSync(PREVIEW_HOST, 'utf8'))) {
  console.error(
    `${PREVIEW_HOST} が not-prose を持っていません。\n\n` +
      '**外枠の本文スタイルがプレビューの中に当たります。**\n' +
      '`p` に 1.25em の余白が付き、コンポーネントが gap で持っている間隔では出ません。\n' +
      'エラーは出ません——余白が広いだけです。',
  );
  process.exit(1);
}

// **`.mdx` も見る。** 展示ページの中でも JSX は書けるので、
// `.tsx` だけを見ていると、器を手で組む道が1本残る
const strayHosts = execSync('git ls-files apps/docs', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => (f.endsWith('.tsx') || f.endsWith('.mdx')) && f !== PREVIEW_HOST)
  .filter((f) => PREVIEW_MARK.test(withoutComments(readFileSync(f, 'utf8'))));

if (strayHosts.length) {
  console.error('プレビューの器を自分で組んでいる場所があります。\n');
  for (const f of strayHosts) console.error(`  ✗ ${f}`);
  console.error(
    `\n${PREVIEW_HOST} の previewProps() を通してください。` +
      '\n**器には not-prose が要ります。** 書き忘れても余白が広くなるだけで、エラーは出ません。',
  );
  process.exit(1);
}

console.log(
  '✓ 対照 20 件が期待どおり（欠落・既定エクスポート無し・揃っている形・' +
    'トークン読み込み2件・asChild 6件・名乗り7件・プレビューの器2件）',
);
console.log(`✓ プレビューの器は ${PREVIEW_HOST} だけが持ち、not-prose を伴っている`);
console.log(
  `✓ コンポーネント ${components.length} 件（${components.join(' ')}）に ` +
    `${REQUIRED.join(' / ')} が揃っている`,
);
console.log(
  `✓ ${components.length} 件とも展示ページがあり、meta.json の pages に載っていて、テストがある`,
);
console.log(
  `✓ 展示がトークンを受け取れる（${globalHasTokens ? GLOBAL_CSS : PREVIEW_CSS} が tokens.css を読む）`,
);
const marked = components.flatMap((name) =>
  tracked
    .filter((f) => f.startsWith(`${UI}/${name}/`) && f.endsWith('.tsx') && !f.includes('/examples/') && !f.endsWith('.test.tsx'))
    .flatMap((f) => exportedComponents(readFileSync(f, 'utf8'))),
);
console.log(`✓ export した ${marked.length} 個の部品が、すべて自分の名前を名乗っている`);
console.log('✓ 型表の説明が印を解いてから渡されている');
console.log(
  withAsChild.length
    ? `✓ asChild を持つ ${withAsChild.length} 件（${withAsChild.join(' ')}）は共有の Slot を通している`
    : '✓ asChild を持つコンポーネントは無い（持つこと自体は検査していない）',
);
