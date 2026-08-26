/**
 * サンプルページ（`apps/docs/src/sample-page.html`）が
 * **生成した変数だけで組まれていること**を検査し、**何を使ったかを集計する。**
 *
 * ## なぜ検査するのか
 *
 * このページの主張は「読み込むのは生成した CSS 1枚だけ」である。
 * `#fff` を1つ書けばその主張は崩れるが、**見た目は何も変わらない。**
 * 静かに壊れる性質のものなので、文書ではなく検査にする（教訓3・教訓4）。
 *
 * ## 判定の形 — 許可するものを列挙する（教訓5）
 *
 * 「生値の色を禁止する」形にすると、`rebeccapurple` も `color-mix()` も
 * `light-dark()` も列挙し忘れた分だけ黙って通る。
 * そこで**色を持ちうるプロパティ**を選び、その値に許すものを列挙する。
 *
 *   var(--sg-*)                     トークン参照
 *   transparent / currentColor / inherit / none / 0
 *   線種のキーワード（solid など）
 *
 * これ以外の語が値に現れたら落ちる。`1px` も `#fff` も等しく落ちる。
 * **色を持ちうるプロパティは、幅も含めて丸ごとトークン由来であること**を要求している。
 *
 * ### この検査が原理的に見逃す範囲（教訓5）
 *
 *   - **色以外の次元の生値。** `opacity: 0.88` `letter-spacing: 0.08em` は
 *     トークンを経由していないが、この検査は永久に発火しない。
 *     不透明度・字送り・行長は**スケールを持つべきかどうかすら決めていない**次元であり、
 *     決まっていないものを検査で縛ることはできない（記録は docs/experiments/sample-page.md）
 *   - 色を持ちうるプロパティの一覧（COLORISH）に無いプロパティ。
 *     `accent-color` のように後から増えたものは、足すまで見えない
 *   - JS で組み立てた色。このページに script は1つも無いが、置けば見えなくなる
 *   - `--sg-*` という名前で利用側が定義した別物（名前表と照合するので落ちるが、
 *     `--x: #fff` のような別名の生値は追えない）
 *
 * ## 陰性対照
 *
 * 違反が 0 件であることと、検出器が壊れていることは区別がつかない（教訓2）。
 * 実行のたびに、意図的な違反を含むフィクスチャへ同じ検出器を当て、
 * **発火しなければこの検査自体を失敗させる。**
 *
 * ## 集計
 *
 * 落とすためではなく**観測のため**に、使った変数を層ごとに数えて出す。
 * セマンティックが無い次元（radius / duration / border-width / 内部の余白）を
 * 何回踏んだかが、セマンティックを足すかどうかの判断材料になる（原則7）。
 * 記録は docs/experiments/sample-page.md。
 */
import { existsSync, readFileSync } from 'node:fs';

const PAGE = 'apps/docs/src/sample-page.html';
const LAYERS = 'packages/tokens/dist/tokens.layers.json';

/* ============================================================
   検出器（フィクスチャにも実ファイルにも同じものを当てる）
   ============================================================ */

/** 色を持ちうるプロパティ。ここに無いものは値を見ない */
const COLORISH = (prop) =>
  prop === 'color' ||
  prop === 'background' ||
  prop === 'outline' ||
  prop === 'box-shadow' ||
  prop === 'fill' ||
  prop === 'stroke' ||
  prop.endsWith('-color') ||
  /^border(-(top|right|bottom|left|(inline|block)-(start|end)))?$/.test(prop);

/** 色を持ちうるプロパティの値に許す語。**狭いほど強い** */
const ALLOWED_VALUE = new Set([
  'transparent',
  'currentcolor',
  'inherit',
  'initial',
  'unset',
  'none',
  '0',
  'solid',
  'dashed',
  'dotted',
  'inset',
  // 値が複数並ぶとき、var() を取り除いた残りに区切りだけが残る。
  // **括弧の中の区切りは残さない。** rgba(0,0,0,.2) を語ごとに割らないため、
  // 分割は空白だけで行い、単独のコンマだけをここで許す
  ',',
]);

/** `var(--sg-…)` の中身。入れ子のフォールバックは使っていないので単純に取る */
const VAR_REF = /var\(\s*(--[a-z0-9-]+)\s*\)/gi;

/** 宣言を「プロパティ / 値 / 行」で切り出す。`<style>` の中と style 属性の両方から取る */
const declarations = (html) => {
  const out = [];
  const push = (text, offset) => {
    for (const m of text.matchAll(/([a-z-]+)\s*:\s*([^;{}]+)/gi)) {
      out.push({
        prop: m[1].toLowerCase(),
        value: m[2].trim(),
        line: html.slice(0, offset + m.index).split('\n').length,
      });
    }
  };
  // <style> ブロック。セレクタや @media は宣言の形に合わないので上の正規表現で落ちる
  for (const block of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    // コメントは検査しない。説明でプリミティブ名や生値に触れられなくなるため。
    // **長さを保って空白に置き換える。** 行番号がずれると指摘が別の行を指す
    const body = block[1].replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
    push(body, block.index + block[0].length - '</style>'.length - block[1].length);
  }
  for (const attr of html.matchAll(/\bstyle\s*=\s*"([^"]*)"/gi)) {
    push(attr[1], attr.index);
  }
  return out;
};

/** 生値の色（と、色を持ちうるプロパティに紛れた生値の寸法）を見つける */
const rawValues = (html) =>
  declarations(html).flatMap(({ prop, value, line }) => {
    if (!COLORISH(prop)) return [];
    // var(…) を取り除いた残りが、許可した語だけで構成されていること
    const rest = value.replace(VAR_REF, ' ').trim();
    const bad = rest
      .split(/\s+/)
      .filter(Boolean)
      .filter((t) => !ALLOWED_VALUE.has(t.toLowerCase()));
    return bad.length ? [{ line, prop, value, bad }] : [];
  });

/** ページが参照している `--sg-*` の名前（重複を保つ。回数が観測になる） */
const sgRefs = (html) => [...html.matchAll(VAR_REF)].map((m) => m[1]).filter((n) => n.startsWith('--sg-'));

/* ============================================================
   陰性対照 — 検出器が発火することを先に確かめる（教訓2）
   ============================================================ */

const FIXTURE = `
<style>
  .a { color: #fff; }
  .b { border: 1px solid var(--sg-color-border-default); }
  .c { background: var(--sg-color-bg-page); }
</style>
<div style="background: rgba(0,0,0,.2)"></div>
`;

const fired = rawValues(FIXTURE);
const expect = (cond, msg) => {
  if (!cond) {
    console.error(`陰性対照が期待どおりに動いていない: ${msg}`);
    console.error('検出器が壊れている可能性があるため、本体の検査に進まず失敗させる。');
    process.exit(1);
  }
};
expect(fired.some((v) => v.bad.includes('#fff')), '生の16進を検出できていない');
expect(fired.some((v) => v.bad.includes('rgba(0,0,0,.2)')), 'style 属性の rgba() を検出できていない');
expect(fired.some((v) => v.bad.includes('1px')), '色を持つプロパティに紛れた生の寸法を検出できていない');
expect(fired.length === 3, `許可した値まで落としている（${fired.length} 件）`);

/* ============================================================
   本体
   ============================================================ */

if (!existsSync(PAGE)) {
  console.error(`${PAGE} が無い。`);
  process.exit(1);
}
if (!existsSync(LAYERS)) {
  console.error(`${LAYERS} が無い。先に pnpm build:tokens を実行すること。`);
  process.exit(1);
}

const html = readFileSync(PAGE, 'utf8');
const layers = JSON.parse(readFileSync(LAYERS, 'utf8'));
const semantics = new Set(layers.semantics);
const primitives = new Set(layers.primitives);
const inputs = new Set(layers.inputs);

const violations = rawValues(html);
const refs = sgRefs(html);
const unknown = [...new Set(refs)].filter(
  (n) => !semantics.has(n) && !primitives.has(n) && !inputs.has(n),
);

/* --- 集計（落とすためではなく観測のため） --- */
const usedSemantics = new Set(refs.filter((n) => semantics.has(n)));
const unusedSemantics = [...semantics].filter((n) => !usedSemantics.has(n));
const primitiveCounts = new Map();
for (const n of refs.filter((x) => primitives.has(x))) {
  // --sg-space-3 → space、--sg-border-width-0 → border-width、--sg-radius-full → radius-full。
  // **末尾の数字だけを落とす。** 「どの次元を踏んだか」が知りたいので、
  // border-width を border に丸めると duration-loop と duration の区別も消える
  const category = n.replace(/^--sg-/, '').replace(/-\d+$/, '');
  primitiveCounts.set(category, (primitiveCounts.get(category) ?? 0) + 1);
}

console.log(`サンプルページ: ${PAGE}`);
console.log(`  参照している --sg-* : 延べ ${refs.length} 箇所 / 実数 ${new Set(refs).size} 個`);
console.log(
  `  セマンティック: ${usedSemantics.size} / ${semantics.size} 個を使用` +
    (unusedSemantics.length ? `（未使用: ${unusedSemantics.join(', ')}）` : '（全部使用）'),
);
console.log('  セマンティックが無く、プリミティブを直接踏んだ次元:');
if (primitiveCounts.size === 0) console.log('    なし');
for (const [category, count] of [...primitiveCounts].sort((a, b) => b[1] - a[1])) {
  console.log(`    ${category.padEnd(14)} 延べ ${count} 箇所`);
}

if (unknown.length) {
  console.error('\n名前表に無い --sg-* を参照している（打ち間違いか、消えた名前）:');
  for (const n of unknown) console.error(`  ${n}`);
}
if (violations.length) {
  console.error('\nトークン由来でない値がある:');
  for (const v of violations) {
    console.error(`  ${PAGE}:${v.line}  ${v.prop}: ${v.value}   ← ${v.bad.join(' ')}`);
  }
  console.error('\n色を持ちうるプロパティは、生成した変数だけで書くこと。');
}

if (unknown.length || violations.length) process.exit(1);
console.log('\n✓ 生値は無く、参照している名前はすべて名前表にある');
