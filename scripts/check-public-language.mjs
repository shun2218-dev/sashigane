/**
 * **利用者に届く文面に、内部の参照を書いていないこと**を検査する（決定6-8）。
 *
 * ## なぜ要るのか
 *
 * `packages/ui` の JSDoc は**型表としてドキュメントサイトに出る。**
 * 例のソースも**そのまま表示される。** MDX は言うまでもない。
 *
 * そこに「決定5-13」とだけ書いても、**読む側には辿る先が無い。**
 * 番号の定義はこのリポジトリの `docs/` にあり、
 * レジストリ配信でコードを受け取った利用者は持っていない。
 *
 * 設計の経緯は残す価値がある。**残す場所が違うだけである。**
 *
 * ## 何を見るか
 *
 *   1. `packages/ui/src` の **JSDoc**（`/** … *␘/`）と**例のファイル全体**
 *   2. `apps/docs/content` の MDX
 *   3. **生成物**（`packages/tokens/dist`）。レジストリ配信で利用側へ落ちる
 *   4. **画面に出る文**——ドキュメントサイトの実装（`apps/docs/app`）と
 *      デモページ（`apps/docs/src/*.html`）から**コメントを除いた残り**
 *
 * どれも「決定N-M」「教訓N」「原則N」の形を落とす。
 *
 * ## 生成物とサイトの実装を後から足した
 *
 * もとは `packages/ui` と MDX だけを見ていた。**足りていなかった。**
 * テーマビルダーの画面にも、そこがコピペさせる CSS のコメントにも、
 * デモページの本文にも番号が残っており、利用者から指摘された。
 *
 * 生成物のヘッダは絶対 URL で「番号の定義はここ」と案内していたが、
 * **辿った先は和文の設計記録である。** 受け取った側の役に立たない。
 *
 * ## 何を見ないか（教訓5）
 *
 *   - **JSDoc でない普通のコメント**（`/* … *␘/` と `//`）。
 *     維持する側への覚書はここに書く。**型表には出ない**ので利用者に届かない。
 *     サイトの実装とデモページでも同じで、**コメントは落としてから見る**
 *   - `scripts/` と `docs/`。**維持する側が読むもので、番号の定義がある場所である**
 *   - **テスト。** 利用者に届かない。設計の根拠を書く場所としてはむしろ適している
 *   - **番号を使わずに書かれた不親切な文章。** 「読んで分かるか」は機械では見えない
 *
 * ## コメント落としが原理的に見逃す範囲（教訓5）
 *
 * `stripComments` は字句解析をしない。**文字列やテンプレートリテラルの中の
 * `/* ` や `//` をコメントの開始として落とす。**
 * 落としすぎる方向なので、**見逃す側に倒れる。**
 *
 * `://` は除いてあるので URL では起きないが、
 * `'a // b（決定1-2）'` のような文字列は見逃す。
 * 番号を文字列リテラルに書く必要が出たら、ここを字句解析に替える。
 *
 * ## 配布先で壊れる参照も見る
 *
 * `packages/ui/src` はレジストリ配信で**利用側リポジトリへ落ちる。**
 * そこに `docs/decisions.md` のような**リポジトリ相対のパス**を書くと、
 * 落ちた先には存在しないので必ず壊れる。
 *
 * 生成物のヘッダで一度踏んだ穴と同じである（そちらは絶対 URL で解いてある）。
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

/** 内部の参照。**番号だけ書かれても辿れない** */
const INTERNAL_REF = /(?:決定|保留)\s?\d+-\d+|教訓\s?\d+|原則\s?\d+/g;

/**
 * 配布先で壊れるパス。**リポジトリ相対の文書参照**を落とす。
 * URL（`https://`）は落とさない——落ちた先でも開ける。
 */
const REPO_PATH = /(?<!https:\/\/[^\s)]{0,200})\b(?:\.\.\/)*docs\/[a-z-]+\.md\b/g;

/** JSDoc だけを取り出す。普通のコメントは維持する側のものなので見ない */
const JSDOC = /\/\*\*[\s\S]*?\*\//g;

/**
 * コメントを落とす。**残りが画面に出る文である。**
 *
 * 行コメントは `://` を避ける——URL の中の `//` を落とすと、
 * その行の残りごと消えて**見逃す側に倒れる。**
 */
const stripComments = (text) =>
  text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(?<!:)\/\/[^\n]*/g, '');

/**
 * 1つのファイルを見る。**純粋な関数にしてある。**
 * 対照を文字列で当てられるようにするため。
 */
const inspect = (path, text) => {
  const found = [];
  const isExample = /\/examples\//.test(path);
  const whole = isExample || path.endsWith('.mdx') || path.startsWith('packages/tokens/dist/');
  // **コメントを落とした残りが画面に出る**もの
  const rendered = /^apps\/docs\/(app|components)\/.*\.tsx?$/.test(path) || /^apps\/docs\/src\/.*\.html$/.test(path);

  // 例・MDX・生成物は**全体が利用者に届く。** 画面に出る文はコメントを落とす。
  // それ以外は JSDoc だけ
  const targets = whole
    ? [text]
    : rendered
      ? [stripComments(text)]
      : [...text.matchAll(JSDOC)].map((m) => m[0]);

  for (const chunk of targets) {
    for (const m of chunk.matchAll(INTERNAL_REF)) found.push({ path, kind: 'ref', what: m[0] });
  }
  // 配布されるものは、ファイル全体を見る（普通のコメントに書いても落ちた先で壊れる）
  if (path.startsWith('packages/ui/')) {
    for (const m of text.matchAll(REPO_PATH)) found.push({ path, kind: 'repo-path', what: m[0] });
  }
  return found;
};

/* ============================================================
   対照 — 検出器が発火することを毎回確かめる（教訓2）
   ============================================================ */

const failures = [];
const expectFire = (name, path, text, kind) => {
  if (!inspect(path, text).some((f) => f.kind === kind)) {
    failures.push(`陰性対照が発火しない: ${name}`);
  }
};
const expectPass = (name, path, text) => {
  const found = inspect(path, text);
  if (found.length) failures.push(`陽性対照が落ちた: ${name}（${found.map((f) => f.what).join(' ')}）`);
};

expectFire(
  'JSDoc の中の決定番号',
  'packages/ui/src/card/card.tsx',
  '/**\n * 面の種類（決定5-13）\n */\nexport const a = 1;',
  'ref',
);
expectFire(
  '例のソースの中の教訓番号',
  'packages/ui/src/card/examples/default.tsx',
  '// 教訓7 に従う\nexport default function A() {}',
  'ref',
);
expectFire('MDX の中の原則番号', 'apps/docs/content/docs/x.mdx', '原則5 のとおり。', 'ref');
expectFire(
  '配布されるファイルのリポジトリ相対パス',
  'packages/ui/src/card/card.tsx',
  '/* 経緯は docs/decisions.md にある */',
  'repo-path',
);

expectPass(
  'JSDoc でない普通のコメントの中の番号',
  'packages/ui/src/card/card.tsx',
  '/*\n * 維持する側への覚書。決定5-13 の経緯はリポジトリにある\n */\nexport const a = 1;',
);
expectPass(
  '平文で理由が書かれた JSDoc',
  'packages/ui/src/card/card.tsx',
  '/**\n * 面の種類。凹んだ面は別の役割なので持たない。\n */\nexport const a = 1;',
);
expectPass('絶対 URL', 'packages/ui/src/card/card.tsx', '/* https://example.com/docs/decisions.md */');

expectFire(
  '生成物のコメントの中の決定番号',
  'packages/tokens/dist/tokens.css',
  '/* spacing — 決定1-2 */\n:root { --sg-space-1: 0.25rem; }',
  'ref',
);
expectFire(
  '画面に出る文の中の決定番号',
  'apps/docs/app/theme/ThemeBuilder.tsx',
  'export const A = () => <p>これは規則が解いています（決定5-1）。</p>;',
  'ref',
);
expectFire(
  'デモページの本文の中の決定番号',
  'apps/docs/src/sample-page.html',
  '<p class="caption">段をずらして配ります（決定5-8）。</p>',
  'ref',
);

expectPass(
  'サイトの実装のコメントの中の番号',
  'apps/docs/app/theme/ThemeBuilder.tsx',
  '// 面ごとに段が変わる（決定5-12）\nexport const A = () => <p>面ごとに段が変わります。</p>;',
);
expectPass(
  'JSX コメントの中の番号',
  'apps/docs/app/docs/layout.tsx',
  'export const A = () => <div>{/* 別ビルドである（決定6-4） */}</div>;',
);
expectPass(
  'デモページの HTML コメントと CSS コメントの中の番号',
  'apps/docs/src/sample-page.html',
  '<!-- 原則4 の実証 -->\n<style>/* 面は data-sg-surface が塗る（決定5-12） */</style>',
);
expectPass(
  '行コメントに見える URL',
  'apps/docs/app/layout.config.tsx',
  "export const o = { githubUrl: 'https://github.com/x/y' };",
);

if (failures.length) {
  console.error('対照に失敗しました。**この検査は機能していません。**\n');
  for (const m of failures) console.error(`  ✗ ${m}`);
  console.error('\n検出器を直してください。0 件という結果は信用できません（教訓2）。');
  process.exit(1);
}

/* ============================================================
   本体
   ============================================================ */

const TARGETS = [
  { re: /^packages\/ui\/src\/.*\.tsx?$/, skip: /\.test\.tsx?$/ },
  { re: /^apps\/docs\/content\/.*\.mdx$/ },
  { re: /^apps\/docs\/(app|components)\/.*\.tsx?$/ },
  { re: /^apps\/docs\/src\/.*\.html$/ },
];

const tracked = execSync('git ls-files packages/ui apps/docs', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && existsSync(f))
  .filter((f) => TARGETS.some((t) => t.re.test(f) && !(t.skip && t.skip.test(f))));

/**
 * 生成物。**追跡されていない**ので `git ls-files` には出ない（原則1）。
 * 先に `pnpm build:tokens` が要る——他の生成物を見る検査と同じ形である。
 */
const DIST = 'packages/tokens/dist';
const DIST_FILES = ['tokens.css', 'theme.css', 'tokens.scss', 'tokens.js', 'tokens.d.ts'].map(
  (f) => `${DIST}/${f}`,
);
const missing = DIST_FILES.filter((f) => !existsSync(f));
if (missing.length) {
  console.error(`生成物がありません: ${missing.join(' ')}\n先に pnpm build:tokens を実行してください。`);
  process.exit(1);
}

const files = [...tracked, ...DIST_FILES];

const violations = files.flatMap((f) => inspect(f, readFileSync(f, 'utf8')));

if (violations.length) {
  console.error('利用者に届く文面に、内部の参照が入っています（決定6-8）。\n');
  for (const v of violations) {
    console.error(`  ✗ ${v.path}  ${v.what}`);
  }
  console.error(
    '\n**JSDoc は型表として、例のソースはそのままドキュメントサイトに出ます。**' +
      '\n番号だけ書いても、読む側には辿る先がありません——' +
      '\n番号の定義はこのリポジトリの docs/ にあり、コードを受け取った利用者は持っていません。' +
      '\n\n**理由を平文で書いてください。** 設計の経緯を残すなら、' +
      '\nJSDoc ではない普通のコメント（型表に出ません）か、docs/ に書きます。' +
      '\n\nリポジトリ相対のパスも同じ理由で書けません。落ちた先に docs/ はありません。',
  );
  process.exit(1);
}

if (files.length === 0) {
  console.error('検査対象がありません。対象が消えています。');
  process.exit(1);
}

console.log('✓ 対照 14 件が期待どおり（発火 7・通過 7）');
console.log(`✓ 利用者に届く ${files.length} ファイルに内部の参照なし`);
