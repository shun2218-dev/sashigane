/**
 * コンポーネントが書いた Tailwind クラスを、**生成された CSS の側から**検査する（原則3）。
 *
 * ## なぜソースではなく出力を読むのか
 *
 * `check:token-usage` は `class=` / `className=` の**属性の位置**を起点に文字列を拾う。
 * この形は**間接を1段挟むと見えなくなる。** 実測（Issue #95）:
 *
 *   className="p-[7px]" 直書き              見える
 *   cva(...) の中                            見えない
 *   const V = { sm: "p-[7px]" } のオブジェクト  見えない
 *   const base = "p-[7px]" の定数1本          見えない
 *
 * **cva 固有の問題ではない。** variant を持つコンポーネントはどう書いても間接が入る。
 *
 * そこで Tailwind に `packages/ui` を走査させ、**生成されたセレクタ**に規則を当てる。
 * Tailwind の候補抽出は**ソースを素のテキストとして読む**ので、cva でも
 * オブジェクト引きでも `tv()` でも自作ヘルパーでも一括で拾う。
 * **ヘルパー名を列挙しない**ので、許可リスト方式（教訓5）のままでいられる。
 *
 * 規則そのものは `scripts/lib/class-rules.mjs` が持ち、`check:token-usage` と共有する。
 * **写しを作らない。** 片方だけ直すと「同じものに2つの道があって片方だけが安全」になる。
 *
 * ## この検査が原理的に見逃す範囲（教訓5）
 *
 *   - **Tailwind が候補として読めないもの。** `p-${n}` のような実行時の組み立ては
 *     Tailwind 自身が拾わないので CSS が生成されない。`check:token-usage` と同じ限界である
 *   - **ユーティリティに一致しない文字列。** `rounded-md` は写像していない名前なので
 *     （decisions.md の radius は値が一致する Tailwind 名だけに写像している）
 *     **CSS が生成されず、エラーも出ず、角丸が付かない。** 教訓4 の「静かに失敗するもの」
 *     そのものだが、この検査は**書かれたのに出なかったもの**を見ていないので捕まえられない。
 *     打ち間違い（`bg-acent`）も同じ。Issue #96
 *   - **`style` 属性の生値と CSS-in-JS。** トークンを経由しないのでクラスが現れない
 *   - **`packages/ui` の外に置かれたコンポーネント。** 走査対象は下の `TARGET` だけで、
 *     **そこにしか置かないことは強制していない。** 決定4-1 がそう決めているだけである。
 *     外に置くと `check:token-usage` は見るが間接の向こうは見えず、この検査は見ない——
 *     **どちらも届かない。** 全ソースを走査対象にすると、`check:token-usage` が理由つきで
 *     除外している素の CSS やサンプルページを Tailwind に食わせることになるので採らない
 *   - **`--sg-*` の参照**はこの検査の担当ではない。`check:token-usage` が
 *     ファイル全文を走査しており、そちらは間接の影響を受けない
 *
 * ## 対照（教訓2）
 *
 * 実行のたびに2つのフィクスチャへ検出器を当てる。
 *
 *   陰性対照  cva / オブジェクト引き / 定数1本の中に隠した違反で**発火すること**
 *   陽性対照  通るべき cva が**落ちないこと**、かつ**クラスが実際に生成されていること**
 *
 * 陽性対照で生成件数まで見るのは、**コンパイルが黙って何も出さなくても
 * 「違反ゼロ」に見えてしまう**ためである。0 件は「対象が無かった」かもしれない。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { CLASS_MESSAGE, rulesFrom } from './lib/class-rules.mjs';

const dist = resolve('packages/tokens/dist');
for (const f of ['tokens.css', 'theme.css']) {
  if (!existsSync(join(dist, f))) {
    console.error(`${f} がありません。先に pnpm build:tokens を実行してください。`);
    process.exit(1);
  }
}

const { classify } = rulesFrom(join(dist, 'theme.css'));

/**
 * 走査対象。決定4-1 が「コンポーネントは `packages/ui`」と決めている。
 * **強制はしていない。** 外に置かれたものは見えない（冒頭の見逃す範囲）。
 */
const TARGET = resolve('packages/ui/src');

/* ============================================================
   Tailwind を走らせて、生成されたクラス名を取る
   ============================================================ */

/**
 * **`source(none)` が要る。** 付けないと Tailwind は既定の走査を行い、
 * リポジトリ全体を読む。実際、付けずに測ったときは `scripts/` にある
 * **陰性対照のフィクスチャ文字列まで拾って** 198 件のセレクタが出た（Issue #95）。
 * 走査範囲を明示的に閉じてから `@source` で開く。
 */
const compile = (sourceDir) => {
  const dir = mkdtempSync(join(tmpdir(), 'sashigane-ui-'));
  writeFileSync(
    join(dir, 'in.css'),
    `@import "${join(dist, 'tokens.css')}";\n` +
      `@import "${join(dist, 'theme.css')}" source(none);\n` +
      `@source "${sourceDir}";\n`,
  );
  try {
    execFileSync(
      'node_modules/.bin/tailwindcss',
      ['-i', join(dir, 'in.css'), '-o', join(dir, 'out.css')],
      { stdio: 'pipe' },
    );
  } catch (e) {
    // **黙って 0 件にしない。** ただし何をしようとして失敗したかは言う
    console.error(`${sourceDir} を Tailwind でコンパイルできませんでした。`);
    console.error('生成した入力 CSS が読めないか、tokens の生成物が壊れています。');
    console.error('先に pnpm build:tokens を実行してください。\n');
    console.error(String(e.stderr ?? e.message).trim());
    process.exit(1);
  }
  return readFileSync(join(dir, 'out.css'), 'utf8');
};

/** コメント。中に URL があり、`tailwindcss.com` の `.com` がクラスに見える */
const COMMENT = /\/\*[\s\S]*?\*\//g;

/**
 * 規則の前置き（`{` の手前）だけを取り出す。
 * **宣言の中を見てはいけない。** `oklch(0.0029 …)` の `.0029` がクラスに見える。
 *
 * **正規表現でやらない。** `/(?:^|[{};])([^{};]*)\{/g` の形は区切り文字を消費するので、
 * 連続する規則の2つ目以降が始まる位置に区切りが残らず、**丸ごと飛ばす。**
 * 実際、`@layer utilities` の中の `.w-1\/2` と `@media (hover: hover)` の中身が
 * 1件も取れていなかった。**陽性対照が捕まえた**（教訓2）。
 */
const preludes = (css) => {
  const out = [];
  let last = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c !== '{' && c !== '}' && c !== ';') continue;
    if (c === '{') out.push(css.slice(last, i));
    last = i + 1;
  }
  return out;
};

/**
 * 前置きの中のクラスセレクタ。
 *
 * `:` `.` `/` `[` `]` `(` `)` は CSS 側でエスケープされている（`\[`）ので、
 * **エスケープ対を1文字として食う。** そうしないと `hover\:opacity-50:hover` の
 * 変種と擬似クラスを区別できず、`p-\[7px\]` が `p-` で切れる。
 *
 * 先頭が数字のものは識別子として成立しないので除く（`0.5` の `.5` を拾わないため）。
 */
const CLASS_SELECTOR = /\.(-?(?:\\.|[A-Za-z_])(?:\\.|[A-Za-z0-9_-])*)/g;

/**
 * CSS のエスケープを外して、ソースに書かれていたクラス名に戻す。
 * 16進エスケープ（`\32 xl` → `2xl`）も扱う。Tailwind は先頭が数字の識別子をこの形にする。
 */
const unescapeClass = (s) =>
  s
    .replace(/\\([0-9a-fA-F]{1,6})[ ]?/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/\\(.)/g, '$1');

const generatedClasses = (sourceDir) => {
  const css = compile(sourceDir).replace(COMMENT, '');
  const out = new Set();
  for (const prelude of preludes(css)) {
    for (const m of prelude.matchAll(CLASS_SELECTOR)) out.add(unescapeClass(m[1]));
  }
  return out;
};

const violationsIn = (sourceDir) => {
  const found = [];
  const classes = generatedClasses(sourceDir);
  for (const cls of classes) found.push(...classify(cls));
  return { classes, found };
};

/* ============================================================
   対照 — 検出器が発火し、通すべきものを落とさないことを毎回確かめる（教訓2）
   ============================================================ */

/**
 * 陰性対照。**違反を全部「間接の向こう側」に置く。**
 * 直書きしてしまうと `check:token-usage` でも捕まるので、この検査の意味が確かめられない。
 */
const NEGATIVE = `import { cva } from "class-variance-authority";
const buttonVariants = cva("inline-flex duration-200 p-4", {
  variants: {
    variant: { ghost: "p-[7px] text-accent/50" },
    size: { lg: "duration-137 opacity-88 border-4" },
  },
});
const V = { danger: "bg-danger/15" };
const bare = "gap-[9px]";
export { buttonVariants, V, bare };
`;

/** 期待する違反の種類と、それを起こしているクラス */
const NEGATIVE_EXPECT = [
  { kind: 'arbitrary', what: 'p-[7px]', where: 'cva の variants の中' },
  { kind: 'arbitrary', what: 'gap-[9px]', where: '定数1本' },
  { kind: 'alpha', what: 'text-accent/50', where: 'cva の variants の中' },
  { kind: 'alpha', what: 'bg-danger/15', where: 'オブジェクト引き' },
  { kind: 'bare-number', what: 'duration-137', where: 'cva の variants の中' },
  { kind: 'no-scale', what: 'opacity-88', where: 'cva の variants の中' },
  { kind: 'bare-number', what: 'border-4', where: 'cva の variants の中' },
];

/**
 * 陽性対照。**通るべき cva が落ちないこと。**
 * 落ちる側だけを持っていると、写像を増やしたときに
 * 「通すはずの書き方が落ちるようになった」ことに気づけない（Issue #63 の教訓）。
 */
const POSITIVE = `import { cva } from "class-variance-authority";
export const cardVariants = cva("text-default border-1 border-default p-4 duration-200", {
  variants: {
    tone: { accent: "bg-accent text-on-accent", subtle: "bg-accent-subtle text-on-accent-subtle" },
    size: { sm: "p-3 gap-2", lg: "p-6 gap-4" },
  },
  defaultVariants: { tone: "accent", size: "sm" },
});
export const layout = "w-1/2 basis-1/3 opacity-100 border-0 md:p-6 hover:bg-accent-strong";
`;

/** 陽性対照で最低限これだけは生成されていること。0 件を「違反なし」と読まないため */
const POSITIVE_MUST_GENERATE = ['bg-accent', 'p-6', 'w-1/2', 'hover:bg-accent-strong'];

const fixtureDir = (name, source) => {
  const dir = mkdtempSync(join(tmpdir(), `sashigane-fx-${name}-`));
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src', 'fixture.tsx'), source);
  return join(dir, 'src');
};

const failures = [];

{
  const { found } = violationsIn(fixtureDir('neg', NEGATIVE));
  for (const e of NEGATIVE_EXPECT) {
    if (!found.some((v) => v.kind === e.kind && v.what === e.what)) {
      failures.push(`陰性対照が発火しない: ${e.what}（${e.where}、期待 ${e.kind}）`);
    }
  }
}

{
  const { classes, found } = violationsIn(fixtureDir('pos', POSITIVE));
  for (const cls of POSITIVE_MUST_GENERATE) {
    if (!classes.has(cls)) {
      failures.push(
        `陽性対照で ${cls} が生成されていない。コンパイルが機能していないか、写像が消えた`,
      );
    }
  }
  for (const v of found) failures.push(`陽性対照が落ちた: ${v.what}（${v.kind}）`);
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

if (!existsSync(TARGET)) {
  console.error(`${TARGET} がありません。コンポーネントは packages/ui に置きます（決定4-1）。`);
  process.exit(1);
}

const { classes, found } = violationsIn(TARGET);

/**
 * 違反したクラスがソースのどこにあるかを探す。
 * **生成された CSS にはクラス名しか残らない**ので、位置は後から引き当てる。
 * 間接の向こう側にあっても、文字列としては書かれているので見つかる。
 *
 * **`git ls-files` を使わない。** Tailwind はファイルシステムを走査するので、
 * この検査は**未追跡のファイルも見る**（`check:token-usage` は追跡下だけを見る）。
 * 位置の側だけ追跡下に絞ると、**検出できたのに場所が出ない**という食い違いが起きる。
 * 実際、未追跡の probe で違反は出たのに「ソース中に見つかりません」と出た。
 *
 * 逆に、Tailwind は `.gitignore` されたファイルを走査しない。
 * したがってこの一覧は走査対象の**上位集合**であり、位置が出ないことはありうる。
 */
const locate = (cls) => {
  const files = readdirSync(TARGET, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath ?? e.path, e.name));
  const hits = [];
  for (const file of files) {
    // 変種つき（md:p-[7px]）で生成された場合、ソースには変種ごと書かれている
    const bare = cls.split(':').pop();
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (line.includes(cls) || line.includes(bare)) {
          hits.push(`${file.replace(`${process.cwd()}/`, '')}:${i + 1}`);
        }
      });
  }
  return hits.length
    ? hits.join(' ')
    : '（ソース中に見つかりません。組み立てられたクラス名かもしれません）';
};

if (found.length) {
  console.error('コンポーネントのクラスに違反があります。\n');
  for (const v of found) {
    console.error(`  ✗ ${v.what}  ${locate(v.what)}`);
    console.error(`    ${CLASS_MESSAGE[v.kind]}\n`);
  }
  process.exit(1);
}

/**
 * 内訳は **`NEGATIVE_EXPECT` から数え上げる。**
 * 手で書いた数を混ぜると、対照を1件足したときに内訳だけが古いまま緑で通る
 * （許す数値を theme.css から取るのと同じ判断。自己レビュー B2）。
 */
const byPlace = new Map();
for (const e of NEGATIVE_EXPECT) byPlace.set(e.where, (byPlace.get(e.where) ?? 0) + 1);
console.log(
  `✓ 陰性対照 ${NEGATIVE_EXPECT.length} 件が期待どおり発火し（` +
    [...byPlace].map(([where, n]) => `${where} ${n} 件`).join('・') +
    '）、陽性対照は落ちなかった',
);
console.log(`✓ ${TARGET.replace(`${process.cwd()}/`, '')} が生成したクラス ${classes.size} 件に違反なし`);
if (classes.size === 0) {
  console.log(
    '  **ただし生成されたクラスは 0 件である。** いま守っているものは無い（教訓2）。' +
      '\n  コンポーネントを足すと、この数が対象の実在を示す。',
  );
}
