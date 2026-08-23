/**
 * コンポーネントがセマンティックしか参照していないことを検査する（原則3）。
 *
 * 検査するのは2つ。
 *   1. プリミティブ（`--sg-space-3` など）を参照していないこと
 *   2. Tailwind の任意値記法（`p-[20px]`）を使っていないこと
 *
 * ## 1 の判定方法 — 名前の形ではなく生成器の事実で判定する
 *
 * 決定2-3 は当初「`--sg-{category}-{数字}` がプリミティブ、`--sg-{category}-{単語}` が
 * セマンティック」という**1つの正規表現で判別できる**としていた。
 * 実際の出力に当てたところ両方向に破れていた（docs/agent-failures.md）。
 *
 *   偽陽性  --sg-text-heading-1 … 3、--sg-color-chart-1 … 5
 *   偽陰性  --sg-radius-full
 *
 * そこで**生成器が出す名前表**（`dist/tokens.layers.json`）を唯一の正とし、
 * 「セマンティックに載っている名前だけを許す」形で判定する。教訓5 の許可リスト方式。
 * 表に無い `--sg-*` は、プリミティブでも打ち間違いでも等しく落ちる。
 *
 * ## 2 の判定方法
 *
 * 決定3-1 により `--spacing: initial` でスケール外の数値クラス（`p-5` 等）は
 * **構造的に生成されなくなった。** 残る抜け道は任意値記法だけである。
 * class 属性のトークンを「英数字と記号の許可集合」に照らし、`[` `]` `(` `)` を
 * 含むものを落とす。禁止する記法を列挙するのではなく、許す形以外を落とす。
 *
 * ## この検査が原理的に見逃す範囲（教訓5）
 *
 *   - 実行時に組み立てられる class 名。`${...}` を含む部分は静的に読めないため
 *     取り除いてから検査する。clsx / cva の変数経由も同様に見えない
 *   - CSS-in-JS、`style` 属性に直接書いた生値。トークンを経由しないので `--sg-` が現れない
 *   - 消費側が自分で `--sg-*` を**定義**した場合は「表に無い名前」として落ちるが、
 *     `--brand-blue: #3b82f6` のような別名の生値は検出できない
 *   - 除外したファイル（下記 EXCLUDED）
 *
 * ## 陰性対照
 *
 * 現時点で Tailwind を使う消費者は存在せず、2 の検出は 0 件になる。
 * **「0 件」は検査が機能していないことと区別がつかない**（教訓2）。
 * そこで実行のたびに、意図的な違反を含むフィクスチャに検出器を当て、
 * 発火することを確かめてから本体を走らせる。発火しなければこの検査自体が失敗する。
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

/* ============================================================
   検査対象
   ============================================================ */

/** 消費側のソースとして扱う拡張子 */
const TARGET_EXT = /\.(css|scss|html|tsx|jsx|ts|js|mts|mjs)$/;

/**
 * 対象から外すもの。**理由の書けない除外を足さない。**
 * 対象は「追跡下の全ソース」であり、ここに列挙したものだけを引く。
 * 新しく作ったファイルは自動的に検査に入る。
 */
const EXCLUDED = [
  {
    re: /^packages\/tokens\//,
    why: 'トークンの生成器そのもの。プリミティブ名を書くのが仕事である',
  },
  {
    re: /^scripts\//,
    why: 'この検査自身が陰性対照として違反文字列を持つ',
  },
  {
    re: /^apps\/docs\/public\/standalone\.html$/,
    why:
      'tokens.css が単体で成立することを目で確かめる検査用フィクスチャであり、コンポーネントではない。' +
      'プリミティブが解決することを見るのが目的そのもの。' +
      'また spacing / radius / duration のセマンティックは実需要が観測されるまで定義しないと決めており（原則3・原則7）、現時点で代替が存在しない',
  },
];

/* ============================================================
   検出器（フィクスチャにも実ファイルにも同じものを当てる）
   ============================================================ */

/** ソース中に現れる `--sg-*` の名前 */
const SG_NAME = /--sg-[a-z0-9-]+/g;

/** class / className の属性値。`class="…"` `className={"…"}` `className={`…`}` を拾う */
const CLASS_ATTR = /\b(?:class|className)\s*=\s*\{?\s*(["'`])([\s\S]*?)\1/g;

/** SCSS / CSS 側の Tailwind 呼び出し */
const APPLY = /@apply\s+([^;{}]+)/g;

/** 実行時に埋まる部分。静的には読めないので取り除く（見逃す範囲） */
const INTERPOLATION = /\$\{[^}]*\}/g;

/**
 * class トークンとして許す形。
 * 英数字と、Tailwind が修飾に使う記号だけ。`[` `]` `(` `)` は入っていない。
 */
const ALLOWED_CLASS_TOKEN = /^[A-Za-z0-9_@:.\/!*+~<>-]+$/;

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/** 1. プリミティブ参照 / 表に無い名前 */
const findTokenViolations = (text, semantics, primitives) => {
  const out = [];
  for (const m of text.matchAll(SG_NAME)) {
    const name = m[0];
    if (semantics.has(name)) continue;
    out.push({
      kind: primitives.has(name) ? 'primitive' : 'unknown',
      line: lineOf(text, m.index),
      what: name,
    });
  }
  return out;
};

/** 2. Tailwind の任意値記法 */
const findClassViolations = (text) => {
  const out = [];
  const scan = (raw, at) => {
    for (const token of raw.replace(INTERPOLATION, ' ').split(/\s+/)) {
      if (token === '' || ALLOWED_CLASS_TOKEN.test(token)) continue;
      out.push({ kind: 'arbitrary', line: lineOf(text, at), what: token });
    }
  };
  for (const m of text.matchAll(CLASS_ATTR)) scan(m[2], m.index);
  for (const m of text.matchAll(APPLY)) scan(m[1], m.index);
  return out;
};

const findAll = (text, semantics, primitives) => [
  ...findTokenViolations(text, semantics, primitives),
  ...findClassViolations(text),
];

/* ============================================================
   名前表を読む
   ============================================================ */

const LAYERS = 'packages/tokens/dist/tokens.layers.json';
if (!existsSync(LAYERS)) {
  console.error(`${LAYERS} がありません。先に pnpm build:tokens を実行してください。`);
  process.exit(1);
}
const layers = JSON.parse(readFileSync(LAYERS, 'utf8'));
const semantics = new Set(layers.semantics);
const primitives = new Set(layers.primitives);

if (semantics.size === 0 || primitives.size === 0) {
  console.error(`${LAYERS} の層が空です。生成器が壊れています。`);
  process.exit(1);
}

/* ============================================================
   陰性対照 — 検出器が発火することを毎回確かめる（教訓2）
   ============================================================ */

const FIXTURES = [
  // 落ちるべきもの
  { text: 'a { padding: var(--sg-space-3); }', expect: 'primitive' },
  { text: 'a { border-radius: var(--sg-radius-full); }', expect: 'primitive' },
  { text: 'a { color: var(--sg-color-text-mutedd); }', expect: 'unknown' },
  { text: '<div class="p-[20px]">', expect: 'arbitrary' },
  { text: '<div class="[mask-type:luminance]">', expect: 'arbitrary' },
  { text: '<div class="bg-(--sg-color-accent)">', expect: 'arbitrary' },
  { text: '.card { @apply gap-[7px]; }', expect: 'arbitrary' },
  { text: 'const c = <b className={"text-[13px]"} />', expect: 'arbitrary' },

  // 通るべきもの
  { text: 'a { color: var(--sg-color-text-muted); }', expect: null },
  // 決定2-3 の正規表現が誤検出していた2件
  { text: 'h1 { font-size: var(--sg-text-heading-1); }', expect: null },
  { text: 'svg { fill: var(--sg-color-chart-1); }', expect: null },
  { text: '<div class="p-4 bg-danger hover:bg-danger/80 md:p-6">', expect: null },
  { text: 'const c = <b className={`p-4 ${extra}`} />', expect: null },
];

const selfTestFailures = [];
for (const f of FIXTURES) {
  const kinds = findAll(f.text, semantics, primitives).map((v) => v.kind);
  const ok = f.expect === null ? kinds.length === 0 : kinds.includes(f.expect);
  if (!ok) {
    selfTestFailures.push(
      `期待 ${f.expect ?? '検出なし'} / 実際 ${kinds.length ? kinds.join(',') : '検出なし'}: ${f.text}`,
    );
  }
}

if (selfTestFailures.length) {
  console.error('陰性対照に失敗しました。**この検査は機能していません。**\n');
  for (const m of selfTestFailures) console.error(`  ✗ ${m}`);
  console.error('\n検出器を直してください。0 件という結果は信用できません（教訓2）。');
  process.exit(1);
}

/* ============================================================
   本体
   ============================================================ */

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && TARGET_EXT.test(f))
  .filter((f) => !EXCLUDED.some((e) => e.re.test(f)));

const violations = [];
for (const file of files) {
  for (const v of findAll(readFileSync(file, 'utf8'), semantics, primitives)) {
    violations.push({ file, ...v });
  }
}

const MESSAGE = {
  primitive: 'プリミティブを参照しています。コンポーネントはセマンティックのみ参照できます（原則3）',
  unknown: '生成器が出力しない名前です。打ち間違いか、消費側で独自に定義した変数です',
  arbitrary: 'Tailwind の任意値記法です。スケール外の値を書けてしまいます（決定3-1）',
};

if (violations.length) {
  console.error('トークンの使い方に違反があります。\n');
  for (const v of violations) {
    console.error(`  ✗ ${v.file}:${v.line}  ${v.what}`);
    console.error(`    ${MESSAGE[v.kind]}\n`);
  }
  console.error(`許可されるのはセマンティック ${semantics.size} 個のみ（${LAYERS}）。`);
  process.exit(1);
}

console.log(`✓ 陰性対照 ${FIXTURES.length} 件が期待どおり発火した`);
console.log(`✓ プリミティブ参照なし（許可: セマンティック ${semantics.size} 個）`);
console.log(`✓ Tailwind の任意値記法なし`);
console.log(`\n${files.length} ファイルを検査（除外 ${EXCLUDED.length} 規則）`);
