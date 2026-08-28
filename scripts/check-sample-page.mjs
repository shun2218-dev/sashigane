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
 *   - **スケールを持たない次元の生値。** いまは `opacity: 0.88` だけである。
 *     持つべきかどうかすら決めていない次元を検査で縛ることはできない
 *     （記録は docs/experiments/sample-page.md）。
 *     **字送りはここから外れた。** 決定1-9 を確定させてスケールを持ったので、
 *     `font-size` / `line-height` / `font-family` と並べて検出対象に入れた（教訓3）。
 *     **太さも同じ理由で入った**（決定1-13）
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

/**
 * スケールを持つ組版の次元。**値はトークンだけで組めるはず**である。
 *
 * 字送りは決定1-9 を確定させるまで「スケールを持つべきかどうかすら決めていない」
 * 次元だったので、ここに入れられなかった。**入れられるようになったので入れる**（教訓3）。
 * 残っているのは `opacity` だけである。
 */
const TYPOGRAPHIC = (prop) =>
  prop === 'font-size' ||
  prop === 'line-height' ||
  prop === 'letter-spacing' ||
  prop === 'font-weight' ||
  prop === 'font-family';

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

/**
 * 組版のプロパティの値に許す語。**色より狭い。**
 *
 * `calc(` `+` `)` を許すのは、大文字化の加算項を足すため（決定1-9）。
 * 中身に数値が残ると `calc(1rem` のような形になって許可集合から外れるので、
 * 括弧を許しても生値は通らない。
 */
const ALLOWED_TYPO_VALUE = new Set(['inherit', 'initial', 'unset', '0', 'calc(', '+', ')']);

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

/** 生値（色と、スケールを持つ組版の次元）を見つける */
const rawValues = (html) =>
  declarations(html).flatMap(({ prop, value, line }) => {
    const allowed = COLORISH(prop)
      ? ALLOWED_VALUE
      : TYPOGRAPHIC(prop)
        ? ALLOWED_TYPO_VALUE
        : null;
    if (!allowed) return [];
    // var(…) を取り除いた残りが、許可した語だけで構成されていること
    const rest = value.replace(VAR_REF, ' ').trim();
    const bad = rest
      .split(/\s+/)
      .filter(Boolean)
      .filter((t) => !allowed.has(t.toLowerCase()));
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
  .d { letter-spacing: 0.08em; }
  .e { font-size: var(--sg-text-body); line-height: var(--sg-text-body-leading); }
  .f { letter-spacing: calc(var(--sg-text-label-tracking) + var(--sg-tracking-caps)); }
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
expect(
  fired.some((v) => v.bad.includes('0.08em')),
  '組版の次元の生値を検出できていない（決定1-9 で字送りはスケールを持った）',
);
/*
 * **通る側の対照。** 落ちるべきものだけを並べると、
 * 「通すはずの書き方が落ちるようになった」ことに気づけない（教訓2、Issue #63）。
 * とくに calc() は、加算項を足す唯一の書き方である
 */
expect(
  !fired.some((v) => v.prop === 'font-size' || v.prop === 'line-height'),
  'トークンだけで組んだ組版の宣言を落としている',
);
expect(
  !fired.some((v) => v.value.startsWith('calc(')),
  'calc() で加算項を足す書き方を落としている（決定1-9）',
);
expect(fired.length === 4, `許可した値まで落としている（${fired.length} 件）`);

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
/**
 * トークン層が自分の仕掛けのために宣言する名前（決定5-13）。
 * **名前表にはあるが参照してはいけない。** 名前表に無いもの（打ち間違い）とは別に扱う
 */
const internals = new Set(layers.internals);

const violations = rawValues(html);
const refs = sgRefs(html);
const unknown = [...new Set(refs)].filter(
  (n) => !semantics.has(n) && !primitives.has(n) && !inputs.has(n) && !internals.has(n),
);
const internalRefs = [...new Set(refs)].filter((n) => internals.has(n));

/*
 * 内部の値の検出も陰性対照を通す。**0 件を「踏んでいない」と読めるようにするため**（教訓2）。
 * 名前表が空だったり、内部の種別が消えたりすると、ここで落ちる
 */
{
  const probe = sgRefs('<div style="color: var(--sg-color-hover-text-default)"></div>');
  const fires = probe.filter((n) => internals.has(n));
  if (internals.size === 0 || fires.length !== 1) {
    console.error('陰性対照が期待どおりに動いていない: 内部の値の参照を検出できていない');
    console.error(`  名前表の内部 ${internals.size} 件 / 検出 ${fires.length} 件`);
    process.exit(1);
  }
}

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
if (internalRefs.length) {
  console.error('\nトークン層の内部の値を参照している（参照は禁止。決定5-13）:');
  for (const n of internalRefs) console.error(`  ${n}`);
  console.error('\nhover の面は data-sg-interactive で作る。控えを直接読むと、');
  console.error('hover していない要素に hover の色が乗る。');
}
if (violations.length) {
  console.error('\nトークン由来でない値がある:');
  for (const v of violations) {
    console.error(`  ${PAGE}:${v.line}  ${v.prop}: ${v.value}   ← ${v.bad.join(' ')}`);
  }
  console.error(
    '\n色を持ちうるプロパティと、スケールを持つ組版の次元' +
      '（font-size / line-height / letter-spacing / font-weight / font-family）は、\n' +
      '生成した変数だけで書くこと。加算が要る場合は calc() で足す（決定1-9）。',
  );
}

if (unknown.length || internalRefs.length || violations.length) process.exit(1);
console.log('\n✓ 生値は無く、参照している名前はすべて名前表にある（内部の値は踏んでいない）');
