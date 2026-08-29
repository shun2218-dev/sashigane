/**
 * tokens.json からスケールを導出する。
 *
 * このファイルは値を持たない。持つのは規則だけである。
 * 値を足したくなったら、それは tokens.json に置くべき定数か、
 * さもなければ規則が足りていない。
 *
 * 根拠は docs/decisions.md。
 */
import tokens from './tokens.json' with { type: 'json' };

/** 分数。浮動小数リテラルを避けて決定の意味をそのまま持つ */
type Fraction = readonly [numerator: number, denominator: number];
const apply = ([n, d]: Fraction, v: number) => (v * n) / d;
const divide = ([n, d]: Fraction, v: number) => (v * d) / n;

/** 唯一の根本定数 */
export const root = tokens.root;

/** spacing.base = root ÷ 4 */
export const base = root / tokens.spacing.baseDivisor;

/**
 * spacing: base×2 以降、3/2 と 4/3 を交互に適用する。
 * 3/2 × 4/3 = 2 なので2段ごとに正確に倍になる。
 */
export const spacing: number[] = (() => {
  const ratios = tokens.spacing.alternatingRatios as unknown as readonly Fraction[];
  const out = [0, base];
  let v = base * 2;
  out.push(v);
  for (let i = 0; v < tokens.spacing.max; i++) {
    v = apply(ratios[i % ratios.length]!, v);
    out.push(v);
  }
  // 比率の並びが max にちょうど着地しない設定だと、宣言と違う最大値を黙って返す。
  // 教訓4「静かに失敗するものを疑う」より、生成器自身が検出する。
  if (out.at(-1) !== tokens.spacing.max) {
    throw new Error(
      `spacing の最大値が tokens.json の宣言と一致しません: ` +
        `宣言 ${tokens.spacing.max} / 生成 ${out.at(-1)}\n` +
        `  alternatingRatios の並びが max にちょうど着地する必要があります。`,
    );
  }
  return out;
})();

/** radius: spacing の max 以下の部分集合。full は段ではない */
export const radius: number[] = spacing.filter((v) => v <= tokens.radius.max);
export const radiusFull = tokens.radius.full;

/** font-size: アンカーは root。下は ÷9/8、上は ×5/4 */
export const fontSizeAnchor = tokens.fontSize.stepsBelow;
export const fontSize: number[] = (() => {
  const below = tokens.fontSize.ratioBelow as unknown as Fraction;
  const above = tokens.fontSize.ratioAbove as unknown as Fraction;
  const out: number[] = [];
  for (let i = tokens.fontSize.stepsBelow; i >= 1; i--) {
    let v = root;
    for (let k = 0; k < i; k++) v = divide(below, v);
    out.push(v);
  }
  out.push(root);
  let v = root;
  for (let i = 0; i < tokens.fontSize.stepsAbove; i++) {
    v = apply(above, v);
    out.push(v);
  }
  return out;
})();

/** line-height の系統。漸近線だけが異なり、係数は共通 */
export type LeadingFamily = keyof typeof tokens.lineHeight.asymptotes;
export const leadingFamilies = tokens.lineHeight.asymptotes;
export const lineHeightCoefficient = root / tokens.lineHeight.coefficientDivisor;

/**
 * line-height = 漸近線 + (root ÷ 2) / size
 *
 * サイズから導出される従属値であり、独立したスケールではない。
 * コンポーネントが選べるのは系統だけで、値は選べない（決定1-4）。
 */
export const lineHeight = (size: number, family: LeadingFamily = 'ui'): number =>
  leadingFamilies[family] + lineHeightCoefficient / size;

export const letterSpacingCoefficient = tokens.letterSpacing.coefficient;

/**
 * letter-spacing = coefficient × (root / size − 1)  （単位は em、決定1-9）
 *
 * line-height（決定1-4）と**同じ 1/size の形**である。字間も行高と同じく
 * サイズからの従属値であって、独立したスケールではない。
 *
 * 本文サイズ（root）で 0 になる。**補正は本文からの差として定義される。**
 * 小さい段は正（詰まって見えるので開ける）、大きい段は負（開いて見えるので詰める）。
 * size → ∞ の漸近線は −coefficient で、これが**システムが与える最大の詰め**である。
 *
 * `coefficient` は root から導けない。duration（決定1-6）と同じく独自のアンカーを持つ。
 */
export const letterSpacing = (size: number): number =>
  letterSpacingCoefficient * (root / size - 1);

/**
 * 大文字化の加算項（決定1-9）。**サイズと直交するので段を持たない。**
 *
 * 大文字は字面が詰まって見えるため字間を開ける必要がある。
 * サイズ側の項と**足して**使う（`calc()`）。
 */
export const letterSpacingCaps = tokens.letterSpacing.caps;

/**
 * 幾何数列。doublesEverySteps 段で正確に倍になる。
 *
 * `(2 ** (1/n)) ** i` ではなく `2 ** (i/n)` で計算する。
 * 前者は無理数の累乗を重ねるため倍になる地点で誤差が出る
 * （200ms の2段下が 99.99999999999999 になった）。
 * 後者は i が n の倍数のとき指数が整数になり、誤差なく倍が出る。
 */
const geometric = (c: {
  anchor: number;
  doublesEverySteps: number;
  below: number;
  above: number;
}): number[] => {
  const out: number[] = [];
  for (let i = -c.below; i <= c.above; i++) {
    out.push(c.anchor * 2 ** (i / c.doublesEverySteps));
  }
  return out;
};

/** duration: 遷移とループは知覚上の制約が違うので別スケール（決定1-6） */
export const durationTransition = geometric(tokens.duration.transition);
export const durationLoop = geometric(tokens.duration.loop);

/** border-width: px 固定出力（決定1-7） */
export const borderWidth: number[] = [...tokens.borderWidth.values];

/**
 * 密度の段（決定1-12）。**骨格の余白だけが動く。**
 *
 * `compact` は既定より1段浅く、`comfortable` は1段深い段を指す。
 * ランプは変えず参照する段をずらすだけで、面の文脈（決定5-12）と同じ形である。
 */
export const densityLevels = ['compact', 'default', 'comfortable'] as const;
export type DensityLevel = (typeof densityLevels)[number];

export type SpaceRole = keyof typeof tokens.spacing.roles & string;
export const spaceRoles: SpaceRole[] = Object.keys(tokens.spacing.roles).filter(
  (k) => !k.startsWith('$'),
) as SpaceRole[];

/**
 * 役割と密度から、参照する spacing の段（index）を解く。
 * スケールの端は超えない。端で頭打ちになるのは、無い段を指すよりましである。
 */
export const spaceStepFor = (role: SpaceRole, density: DensityLevel): number => {
  const base = tokens.spacing.roles[role] as number;
  const shift = densityLevels.indexOf(density) - densityLevels.indexOf('default');
  return Math.min(Math.max(base + shift, 0), spacing.length - 1);
};

/**
 * breakpoint（決定1-10）。**root から導出できない3つ目の次元。**
 *
 * 画面幅は組版ではなく機器の寸法で決まるので、`root = 16px` は何も言わない。
 * 時間（決定1-6）・書体（決定1-11）と同じ例外として明示する。
 *
 * **CSS 変数はメディアクエリの中で使えない。** ここで出す値が効くのは
 * Tailwind アダプタ（ビルド時に読まれる）で、素の CSS の利用者は値を直接書く。
 */
export type BreakpointName = keyof typeof tokens.breakpoint.steps;
export const breakpointNames = Object.keys(tokens.breakpoint.steps) as BreakpointName[];
export const breakpoint = (name: BreakpointName): number =>
  tokens.breakpoint.steps[name];
export const breakpointUnit = tokens.breakpoint.unit;

/* ============================================================
   elevation — 決定1-8（2026-08-29 改訂）
   ============================================================ */

/** elevation の高さ（決定1-8） */
export const elevation: number[] = Array.from(
  { length: tokens.elevation.maxHeight + 1 },
  (_, i) => i,
);

/**
 * 高さ h の影の幾何。**新しい長さの定数を持ち込まない。**
 *
 * 物理モデルは決定1-8 のまま——光源を上に置き、オフセットもぼかしも h に比例する。
 * オフセットの単位に `base`（= root ÷ 4）を取ると、出る値は
 * `4 / 8 / 12` と `8 / 16 / 24` で**全部 spacing の段に載る**（テストで確かめている）。
 *
 * `blurRatio` だけが新しい選択で、これは**光源の形**である
 * （ぼかし ÷ オフセット = 光源の大きさ ÷ 光源の横ずれ）。root からは導けない。
 */
export interface ElevationGeometry {
  /** 下方向のオフセット px。光源は上にある */
  offset: number;
  /** ぼかし px */
  blur: number;
}
export const elevationGeometry = (h: number): ElevationGeometry => ({
  offset: h * base,
  blur: h * base * tokens.elevation.blurRatio,
});

/**
 * 出す役割（決定1-8 改訂）。**高さの数字は出力しない。**
 *
 * elevation はモードで媒体が変わる（明色は影、暗色は輪郭）ので、
 * 値がモード非依存であるプリミティブ層に置けない。役割名でだけ出す。
 *
 * h=3（前面／モーダル）は出さない。roles.md のコンポーネント需要表に
 * ダイアログが無く、観測4本で3回以上書き直されたものに入っていない（原則7）。
 */
export type ElevationRole = keyof typeof tokens.elevation.roles;
export const elevationRoles = Object.keys(tokens.elevation.roles) as ElevationRole[];
export const elevationHeight = (role: ElevationRole): number =>
  tokens.elevation.roles[role].height;
/** 暗色モードでその役割が使う境界の段（`border.subtle` などの鍵） */
export const elevationOutline = (role: ElevationRole): 'subtle' | 'default' | 'strong' =>
  tokens.elevation.roles[role].outline as 'subtle' | 'default' | 'strong';

/* ============================================================
   font-family — root から導出できない次元（決定1-11）
   ============================================================ */

/**
 * スタックの中で書体名を差せる位置。順序がそのままフォールバックの順序になる。
 *
 * 型は defaults の鍵から取る。JSON の `slots` は**順序**だけを持ち、
 * 両者が食い違ったら生成器が落ちる（片方だけ足すと静かに欠ける。教訓4）。
 */
export type FontSlot = keyof typeof tokens.fontFamily.stacks.body.defaults;
export const fontSlots: readonly FontSlot[] = (() => {
  const declared = tokens.fontFamily.slots;
  const known = Object.keys(tokens.fontFamily.stacks.body.defaults);
  if (declared.length !== known.length || declared.some((s) => !known.includes(s))) {
    throw new Error(
      `fontFamily.slots が defaults の鍵と一致しません: ` +
        `slots ${declared.join(', ')} / defaults ${known.join(', ')}`,
    );
  }
  return declared as readonly FontSlot[];
})();

/** 書体スタックの種類。役割はここへ割り当てられる */
export type FontStack = keyof typeof tokens.fontFamily.stacks;
export const fontStackNames = Object.keys(tokens.fontFamily.stacks) as FontStack[];

/** 利用側が書体名を差す口の名前。**トークンは宣言しない**（宣言すると var() のフォールバックが効かない） */
export const fontInputName = (stack: FontStack, slot: FontSlot): string =>
  `--sg-font-brand-${stack}-${slot}`;

/**
 * スタック1段分の CSS 値。`var(口, 既定)` の形で、既定は次の3通りのいずれか。
 *
 *   1. 自分の defaults        … body / mono
 *   2. 継承元の口（入れ子）   … display は body に従う
 *   3. （無い場合は生成器が落ちる。空フォールバックは font-family 宣言を丸ごと無効にする）
 *
 * 2 が要るのは、**利用側が body だけ差したときに見出しが system-ui へ残らないようにする**ため。
 * 観測4本のうち専用の見出し書体を持つのは1本だけで、既定は「本文に従う」が正しい。
 */
const slotValue = (stack: FontStack, slot: FontSlot, seen: FontStack[] = []): string => {
  // 未知の名前と循環は、放っておくと TypeError か無限再帰になる。
  // 生成器の他の箇所（spacing の max 不一致）と同じく、何が食い違ったかを名指しして落とす
  if (!(stack in tokens.fontFamily.stacks)) {
    throw new Error(
      `書体スタック ${stack} は存在しません（inheritsFrom: ${[...seen, stack].join(' → ')}）`,
    );
  }
  if (seen.includes(stack)) {
    throw new Error(`書体スタックの継承が循環しています: ${[...seen, stack].join(' → ')}`);
  }

  const def = tokens.fontFamily.stacks[stack];
  const fallback =
    'defaults' in def
      ? def.defaults[slot]
      : slotValue(def.inheritsFrom as FontStack, slot, [...seen, stack]);
  if (!fallback) {
    // 教訓4。var(--x, ) は「空」を返し、font-family: , system-ui となって
    // 宣言ごと無効になる。**エラーにならないので生成器が落とす**
    throw new Error(`書体スタック ${stack} の ${slot} に既定値がありません`);
  }
  return `var(${fontInputName(stack, slot)}, ${fallback})`;
};

/**
 * 書体スタックの CSS 値。**欧文 → 和文 → generic の順序をトークン層が保証する。**
 *
 * 具体的な書体名は持たない。持てば、それはブランドの選択であってシステムの選択ではない。
 */
export const fontStack = (stack: FontStack): string =>
  [...fontSlots.map((slot) => slotValue(stack, slot)), tokens.fontFamily.stacks[stack].generic].join(
    ', ',
  );

/**
 * 数字を等幅で出す指定。**同じ事実の2つの符号化**を持つ。
 *
 * CSS は font-variant-numeric、Tailwind は font-feature-settings を使う。
 * Tailwind v4.3.3 に `--font-*--font-variant-numeric` 修飾子が無いため
 * （実測: docs/experiments/font-family.md）、アダプタ側は feature を参照する。
 */
/* ------------------------------------------------------------------
   font-weight — 決定1-13
   ------------------------------------------------------------------ */

/**
 * 太さの役割。**段ではなく役割で持つ。**
 *
 * 太さは root から導けない。そのうえ**使える段は書体が実装しているものに限られる。**
 * 可変フォントなら連続だが、静的フォントに無い段を指定すると合成太字になり、
 * 意図と違う見た目になる。**そして合成はエラーにならない**（教訓4）。
 *
 * そこで書体（決定1-11）と同じく**既定値つきの差し込み口**として持つ。
 * システムは意見を持つが、書体の実装に合わせて利用側が差し替えられる。
 */
export type FontWeightRole = keyof typeof tokens.fontWeight.roles;
export const fontWeightRoles = Object.keys(tokens.fontWeight.roles) as FontWeightRole[];

/** 利用側が太さを差す口。**トークンは宣言しない**（宣言すると var() のフォールバックが効かない） */
export const fontWeightInputName = (role: FontWeightRole): string =>
  `--sg-font-brand-weight-${role}`;

/** `var(口, 既定)` の形。既定は観測に基づく（決定1-13） */
export const fontWeight = (role: FontWeightRole): string =>
  `var(${fontWeightInputName(role)}, ${tokens.fontWeight.roles[role]})`;

export const numericVariant = tokens.fontFamily.numeric.variant;
export const numericFeature = tokens.fontFamily.numeric.feature;
