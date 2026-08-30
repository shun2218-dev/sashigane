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
 *
 * どちらも「決定N-M」「教訓N」「原則N」の形を落とす。
 *
 * ## 何を見ないか（教訓5）
 *
 *   - **JSDoc でない普通のコメント**（`/* … *␘/` と `//`）。
 *     維持する側への覚書はここに書く。**型表には出ない**ので利用者に届かない
 *   - `scripts/` と `docs/`。**維持する側が読むもので、番号の定義がある場所である**
 *   - `apps/docs/app` と `apps/docs/components`。サイト自身の実装で、利用者は読まない
 *   - **テスト。** 利用者に届かない。設計の根拠を書く場所としてはむしろ適している
 *   - **番号を使わずに書かれた不親切な文章。** 「読んで分かるか」は機械では見えない
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
 * 1つのファイルを見る。**純粋な関数にしてある。**
 * 対照を文字列で当てられるようにするため。
 */
const inspect = (path, text) => {
  const found = [];
  const isExample = /\/examples\//.test(path);
  const isMdx = path.endsWith('.mdx');
  // 例と MDX は**全体が利用者に届く。** それ以外は JSDoc だけ
  const targets = isExample || isMdx ? [text] : [...text.matchAll(JSDOC)].map((m) => m[0]);

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
];

const files = execSync('git ls-files packages/ui apps/docs/content', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && existsSync(f))
  .filter((f) => TARGETS.some((t) => t.re.test(f) && !(t.skip && t.skip.test(f))));

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

console.log('✓ 対照 7 件が期待どおり（発火 4・通過 3）');
console.log(`✓ 利用者に届く ${files.length} ファイルに内部の参照なし`);
