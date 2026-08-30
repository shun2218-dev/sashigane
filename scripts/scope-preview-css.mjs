/**
 * **プレビュー用 CSS を展示の中だけに閉じ込める。**
 *
 * ## なぜ要るのか
 *
 * ドキュメントサイトには Tailwind のビルドが2つある。
 * サイトの外枠（fumadocs）のビルドと、コンポーネントのプレビュー用のビルドである。
 * アダプタを外枠のビルドに入れると fumadocs の `@apply` が解決できず落ちるので、
 * 分けている。
 *
 * **分けたままだと、2つの出力が同じ `@layer utilities` に並ぶ。**
 * 後から読み込む方が勝つので、外枠の `.md\:hidden` にプレビュー側の `.flex` が勝ち、
 * **画面幅に応じて隠れるはずのものが隠れなくなる。**
 * 実際、上部のモバイル用バーが 1024px でも表示されたまま高さ 0 の枠から溢れ、
 * ページ上部が切れて見えていた。右端の目次も同じ理由で細く残っていた。
 *
 * プレビュー用のビルドは preflight（`*` や `html` への初期化）も持っており、
 * これも外枠に当たっていた。
 *
 * ## 何をするか
 *
 * `@layer base` と `@layer utilities`、および `--tw-*` の既定値を置く
 * `@layer properties` の中のセレクタを、すべて `[data-sg-preview]` の中に限定する。
 * **変数を宣言する部分（`:root` や `[data-sg-surface]`）は触らない**——
 * トークンの変数は外枠のビルドが別に読み込んでおり、ここには入っていない。
 *
 * 限定したことで詰め合わせの中では特異度が 1 段上がるので、
 * **展示の中ではプレビュー側が勝つ。** これは意図した向きである。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import postcss from 'postcss';

/** 展示の目印。`components/component-demo.tsx` が付ける */
const SCOPE = '[data-sg-preview]';

/** 中身を限定する層。**列挙する層以外は触らない**（教訓5 の裏返しで、ここは許可リストで足りる） */
const SCOPED_LAYERS = new Set(['base', 'utilities', 'properties']);

/** 文書全体を指すセレクタ。限定すると当たらなくなるので、目印そのものに読み替える */
const DOCUMENT_ROOTS = new Set([':root', ':host', 'html', 'body']);

/**
 * 1つのセレクタを限定する。**戻り値は複数になりうる。**
 *
 * `*` と擬似要素は**目印自身にも当てる。** `[data-sg-preview] ::after` は
 * 「子孫の ::after」であって、目印そのものの ::after を含まない——
 * 限定する前は含んでいたので、片方だけ落とすと初期化が非対称になる。
 */
const scopeOne = (sel) => {
  const s = sel.trim();
  if (DOCUMENT_ROOTS.has(s)) return [SCOPE];
  if (s === '*') return [SCOPE, `${SCOPE} *`];
  if (s.startsWith('::')) return [`${SCOPE}${s}`, `${SCOPE} ${s}`];
  return [`${SCOPE} ${s}`];
};

const scopeSelector = (selector) => {
  const parts = selector.split(',').flatMap(scopeOne);
  return [...new Set(parts)].join(', ');
};

/** その規則が、限定対象の層の中にいるか */
const insideScopedLayer = (node) => {
  for (let p = node.parent; p; p = p.parent) {
    if (p.type === 'atrule' && p.name === 'layer') {
      // `@layer theme, base, components, utilities;` のような宣言だけのものは親にならない
      return SCOPED_LAYERS.has(p.params.trim());
    }
  }
  return false;
};

export const scopeCss = (css) => {
  const root = postcss.parse(css);
  let scoped = 0;
  root.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && rule.parent.name === 'property') return;
    if (!insideScopedLayer(rule)) return;
    rule.selector = scopeSelector(rule.selector);
    scoped += 1;
  });

  /*
   * **結果の側から見る。** 変換が走ったことと、漏れが無いことは別である（教訓2）。
   * 限定対象の層に目印の付いていないセレクタが1つでも残っていれば、
   * そこから外枠へ漏れる。
   */
  const out = postcss.parse(root.toString());
  const leaked = [];
  out.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && rule.parent.name === 'property') return;
    if (!insideScopedLayer(rule)) return;
    for (const part of rule.selector.split(',')) {
      if (!part.trim().startsWith(SCOPE)) leaked.push(part.trim());
    }
  });

  return { css: root.toString(), scoped, leaked };
};

/* ============================================================
   対照 — 変換が実際に効くことを毎回確かめる（教訓2）
   ============================================================ */

const failures = [];
const check = (name, input, want) => {
  const got = scopeCss(input).css.replace(/\s+/g, ' ').trim();
  if (!got.includes(want)) failures.push(`${name}\n      期待: ${want}\n      実際: ${got}`);
};

check('汎用ユーティリティ', '@layer utilities { .flex { display: flex } }', `${SCOPE} .flex`);
check(
  '擬似要素は目印自身にも当てる',
  '@layer base { ::after { content: "" } }',
  `${SCOPE}::after, ${SCOPE} ::after`,
);
check(
  '入れ子の @media',
  '@layer utilities { @media (hover: hover) { .a:hover { color: red } } }',
  `${SCOPE} .a:hover`,
);
check('preflight の *', '@layer base { * { margin: 0 } }', `${SCOPE}, ${SCOPE} *`);
check('preflight の html', '@layer base { html, :host { line-height: 1.5 } }', `${SCOPE} {`);
check(
  '--tw-* の既定値',
  '@layer properties { @supports (x: y) { *, ::before { --tw-shadow: 0 0 #0000 } } }',
  `${SCOPE}, ${SCOPE} *, ${SCOPE}::before, ${SCOPE} ::before`,
);

// 通す側の対照。**層の外の変数宣言は触らない**
const untouched = scopeCss(':root { --sg-space-1: 0.25rem }').css;
if (untouched.includes(SCOPE)) failures.push('層の外の :root を限定してしまった');
if (scopeCss('@layer components { .x { color: red } }').css.includes(SCOPE)) {
  failures.push('列挙していない層を限定してしまった');
}

// 漏れの検出そのものにも対照を当てる。**検出できることを確かめてから 0 件と言う**
if (scopeCss('@layer utilities { .flex { display: flex } }').leaked.length !== 0) {
  failures.push('限定したのに漏れとして報告された');
}

if (failures.length) {
  console.error('対照に失敗しました。**この変換は機能していません。**\n');
  for (const m of failures) console.error(`  ✗ ${m}`);
  process.exit(1);
}

/* ============================================================
   本体
   ============================================================ */

const target = process.argv[2];
if (!target) {
  console.error('使い方: node scripts/scope-preview-css.mjs <css ファイル>');
  process.exit(1);
}

const before = readFileSync(target, 'utf8');
const { css, scoped, leaked } = scopeCss(before);

if (scoped === 0) {
  console.error(
    `${target} に限定対象が1つもありません。\n` +
      '**0 件は成功ではありません。** ビルドの出力構造が変わった可能性があります（教訓2）。',
  );
  process.exit(1);
}

if (leaked.length) {
  console.error(`${target} に目印の付かないセレクタが ${leaked.length} 件残っています。\n`);
  for (const sel of leaked.slice(0, 10)) console.error(`  ✗ ${sel}`);
  console.error('\nここから外枠へ漏れます。scopeOne の場合分けを直してください。');
  process.exit(1);
}

writeFileSync(target, css);
console.log('✓ 対照 9 件が期待どおり');
console.log(`✓ ${target} の ${scoped} 規則を ${SCOPE} の中に限定しました（漏れ 0 件）`);
