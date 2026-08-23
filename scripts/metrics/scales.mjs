/**
 * スケールの単一の正。
 *
 * docs/decisions.md の生成規則をコードにしたもの。
 * 他のスクリプトはスケールをリテラルで持たず、必ずここから import する。
 *
 * 理由: 当初 extract-observed-values.mjs が font-size を8段のまま持ち続け、
 * 決定1-3 の改訂（11段）に追随せずドリフトした。
 * 「トークンが唯一の正」を掲げる以上、検証スクリプト側にも正が複数あってはならない。
 */

/** 唯一の根本定数 */
export const root = 16;

/** spacing.base = root ÷ 4 */
export const base = root / 4;

/**
 * spacing: base×2 以降、×3/2 と ×4/3 を交互に適用する。
 * 3/2 × 4/3 = 2 なので2段ごとに正確に倍になる。
 */
export const spacing = (() => {
  const out = [0, base];
  let v = base * 2;
  out.push(v);
  const ratios = [3 / 2, 4 / 3];
  for (let i = 0; v < 96; i++) {
    v *= ratios[i % 2];
    out.push(v);
  }
  return out;
})();

/** radius: spacing の 0〜16 の部分集合。full は段ではないので含めない */
export const radius = spacing.filter((v) => v <= 16);
export const radiusFull = 9999;

/** font-size: アンカー root、下 ÷1.125 が3段、上 ×1.25 が7段 */
export const fontSizeStepsBelow = 3;
export const fontSizeStepsAbove = 7;
export const fontSize = (() => {
  const out = [];
  for (let i = fontSizeStepsBelow; i >= 1; i--) out.push(root / 1.125 ** i);
  out.push(root);
  for (let i = 1; i <= fontSizeStepsAbove; i++) out.push(root * 1.25 ** i);
  return out;
})();
/** アンカーの index */
export const fontSizeAnchor = fontSizeStepsBelow;

/** line-height の漸近線。係数 root÷2 は3系統で共通 */
export const leadingFamilies = { display: 0.8, ui: 1.0, prose: 1.2 };
export const lineHeight = (size, family = 'ui') =>
  leadingFamilies[family] + root / 2 / size;

/** duration: 遷移はアンカー200ms、ループはアンカー1000ms。いずれも比率 √2 */
const geometric = (anchor, ratio, below, above) => {
  const out = [];
  for (let i = -below; i <= above; i++) out.push(anchor * ratio ** i);
  return out;
};
export const durationTransition = geometric(200, Math.SQRT2, 2, 2);
export const durationLoop = geometric(1000, Math.SQRT2, 1, 1);

/** border-width: px 固定出力（決定1-1 の例外） */
export const borderWidth = [1, 2, 3];

/** elevation の高さ */
export const elevation = [0, 1, 2, 3];

/**
 * 生成規則が docs/decisions.md に記載した値を実際に生成することの自己検査。
 *
 * 理由: spacing の生成規則を2度、言葉としては筋が通るが実際には
 * 違う値を生成する形で書いた（docs/agent-failures.md 参照）。
 * 規則を書き換えたときに黙って別の値が出ることを防ぐ。
 *
 * この期待値は「規則から導いた値」ではなく「規則が正しいことの証人」である。
 * 期待値を書き換えて通すのは、規則の誤りを隠すことに等しい。
 */
const expect = (name, actual, wanted) => {
  const a = JSON.stringify(actual);
  const w = JSON.stringify(wanted);
  if (a !== w) {
    throw new Error(
      `スケール生成規則が期待値と一致しません: ${name}\n  生成: ${a}\n  期待: ${w}`,
    );
  }
};

expect('spacing', spacing, [0, 4, 8, 12, 16, 24, 32, 48, 64, 96]);
expect('radius', radius, [0, 4, 8, 12, 16]);
expect('font-size 段数', fontSize.length, 11);
expect('font-size アンカー', fontSize[fontSizeAnchor], root);
expect('duration 遷移', durationTransition.map((v) => +v.toFixed(1)), [100, 141.4, 200, 282.8, 400]);
expect('duration ループ', durationLoop.map((v) => +v.toFixed(1)), [707.1, 1000, 1414.2]);

// font-size の比率が厳密に保たれていること
fontSize.forEach((v, i) => {
  if (i === 0) return;
  const wanted = i <= fontSizeAnchor ? 1.125 : 1.25;
  if (Math.abs(v / fontSize[i - 1] - wanted) > 1e-9) {
    throw new Error(`font-size の比率が崩れています: index ${i - 1}→${i}`);
  }
});

// radius が減算について閉じていること
for (const outer of radius) {
  for (const pad of spacing) {
    if (pad > 0 && outer - pad >= 0 && !radius.includes(outer - pad)) {
      throw new Error(`radius の減算閉包が壊れています: ${outer} - ${pad}`);
    }
  }
}

// spacing の隣接比が 3/2 と 4/3 を交互に取ること
spacing.slice(2).forEach((v, i, a) => {
  if (i === 0) return;
  const wanted = i % 2 === 1 ? 3 / 2 : 4 / 3;
  if (Math.abs(v / a[i - 1] - wanted) > 1e-9) {
    throw new Error(`spacing の隣接比が崩れています: index ${i - 1}→${i}`);
  }
});

// line-height が単調減少すること
fontSize.forEach((v, i) => {
  if (i > 0 && lineHeight(v) >= lineHeight(fontSize[i - 1])) {
    throw new Error(`line-height が単調減少していません: index ${i}`);
  }
});
