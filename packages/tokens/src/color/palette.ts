/**
 * primary 1色からパレット全体を生成する。
 *
 * 色は静的な値の集合ではない。利用者が primary を選ぶと、
 * セマンティックまで含めた全段がここで導出される（決定5-1）。
 *
 * 生成結果は提案であり、人間が編集できる。
 * ただし保証が崩れる入力・編集には警告を返す。警告を握りつぶさないこと。
 */
import tokens from '../tokens.json' with { type: 'json' };
import {
  contrastRatio,
  hueDistance,
  inSrgbGamut,
  oklchToLinearRgb,
  relativeLuminance,
  shortestHueDelta,
  type Oklch,
} from './oklch.ts';

const cfg = tokens.color;

export type Step = (typeof cfg.steps)[number];
export const steps: readonly number[] = cfg.steps;

export type StatusName = keyof typeof cfg.statusHues.canonical;
export const statusNames = Object.keys(cfg.statusHues.canonical) as StatusName[];

export interface Warning {
  code:
    | 'primary-chroma-unreachable'
    | 'primary-lightness-shifted'
    | 'status-too-close-to-primary'
    | 'contrast-below-target';
  message: string;
  detail?: Record<string, number | string>;
}

/**
 * 段 → 明度。anchorStep を anchorL に固定し、上下をそれぞれ等間隔で埋める。
 *
 * 等間隔ではなく折れ線にしているのは、anchorL が
 * 「明色の面に対し最悪色相でも本文 4.5:1」の境界だからである（決定5-2）。
 * 保証境界を段の定義に含めることで、コントラストが構造的に決まる。
 */
export const lightnessesFor = (anchorL: number, bottom: number): number[] => {
  const { top, anchorStep } = cfg.lightness;
  const a = cfg.steps.indexOf(anchorStep as Step);
  return cfg.steps.map((_, i) =>
    i <= a
      ? top - ((top - anchorL) / a) * i
      : anchorL - ((anchorL - bottom) / (cfg.steps.length - 1 - a)) * (i - a),
  );
};

/** tokens.json の既定アンカーによる段。生成時は palette ごとに解き直す */
export const lightnessForStep = (step: number): number => {
  const i = cfg.steps.indexOf(step as Step);
  if (i < 0) throw new Error(`未定義の段です: ${step}`);
  return lightnessesFor(cfg.lightness.anchorInitial, cfg.lightness.bottomInitial)[i]!;
};

/**
 * 与えた色相すべてが sRGB に収まる最大の彩度を二分探索で求める。
 *
 * 全360色相ではなく実際に定義する色相に限定するのは、
 * 全色相を要求すると彩度が最も狭い色相に引きずられて全体がくすむため（決定5-3）。
 */
export const maxSafeChroma = (L: number, hues: readonly number[]): number => {
  let lo = 0;
  let hi = 0.4;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const ok = hues.every((H) => inSrgbGamut(oklchToLinearRgb({ L, C: mid, H })));
    if (ok) lo = mid;
    else hi = mid;
  }
  return lo;
};

/**
 * status の色相。意味で固定した基準から primary へ引き寄せるが、
 * 上限を設けて意味を守る。近づきすぎた場合は逆に離す（決定5-4）。
 */
export const resolveStatusHues = (
  primaryH: number,
): { hues: Record<StatusName, number>; warnings: Warning[] } => {
  const { canonical, maxPull, pullRatio, minSeparation } = cfg.statusHues;
  const warnings: Warning[] = [];
  const hues = {} as Record<StatusName, number>;

  for (const name of statusNames) {
    const base = canonical[name];
    const pull = shortestHueDelta(base, primaryH) * pullRatio;
    let h = (base + Math.max(-maxPull, Math.min(maxPull, pull)) + 360) % 360;

    // primary に近すぎるなら、許容域の中で最も離れる位置へ動かす
    if (hueDistance(h, primaryH) < minSeparation) {
      const candidates = [base - maxPull, base + maxPull].map((v) => (v + 360) % 360);
      h = candidates.reduce((best, c) =>
        hueDistance(c, primaryH) > hueDistance(best, primaryH) ? c : best,
      );
      if (hueDistance(h, primaryH) < minSeparation) {
        warnings.push({
          code: 'status-too-close-to-primary',
          message:
            `primary の色相が ${name} と近すぎます（角距離 ${hueDistance(h, primaryH).toFixed(0)}°）。` +
            `${name} と primary が見分けにくくなります。`,
          detail: { status: name, statusHue: h, primaryHue: primaryH },
        });
      }
    }
    hues[name] = h;
  }
  return { hues, warnings };
};

/**
 * 識別色。primary から等間隔に配り、status の周囲を避ける（決定5-5）。
 * 避ける際は禁止帯の近い方の縁へ寄せる。
 */
export const resolveCategoricalHues = (
  primaryH: number,
  statusHues: readonly number[],
): number[] => {
  const { count, avoidRadius } = cfg.categorical;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    let h = (primaryH + (360 / count) * i) % 360;
    for (const s of statusHues) {
      const d = shortestHueDelta(s, h);
      if (Math.abs(d) < avoidRadius) {
        h = (s + (d >= 0 ? avoidRadius : -avoidRadius) + 360) % 360;
      }
    }
    out.push(h);
  }
  return out;
};

export interface Ramp {
  hue: number;
  /** 段 → 色 */
  byStep: Record<number, Oklch>;
}

const buildRamp = (
  hue: number,
  lightness: readonly number[],
  chromaByStep: readonly number[],
): Ramp => ({
  hue,
  byStep: Object.fromEntries(
    cfg.steps.map((s, i) => [s, { L: lightness[i]!, C: chromaByStep[i]!, H: hue }]),
  ),
});

/** 1つのパレットを構成する全ランプの色相を、彩度セットごとに束ねたもの */
interface HueSets {
  primary: number[];
  status: number[];
  categorical: number[];
  all: number[];
}

/**
 * ある anchorL のときの、全ランプの彩度と中間色の面を求める。
 *
 * 彩度はセット単位で決まる（決定5-3）ので、アンカーを解くときも
 * **実際に使われる彩度**で評価しなければならない。
 * ここを共通彩度で評価していた時期があり、セット単位に変えた瞬間に保証が破れた
 * （網羅テストが検出した）。
 */
const resolveChroma = (lightness: readonly number[], hues: HueSets) => {
  const chromaFor = (hs: readonly number[]) =>
    lightness.map((L) => maxSafeChroma(L, hs));
  return {
    primary: chromaFor(hues.primary),
    status: chromaFor(hues.status),
    categorical: chromaFor(hues.categorical),
    neutral: chromaFor(hues.all).map((c) => c * cfg.chroma.neutralRatio),
  };
};

type Requirement = { readonly step: number; readonly min: number };

/**
 * 指定した面に対して、要件をすべて満たす最悪コントラストの余裕を返す。
 * 正なら全要件を満たしている。
 */
const marginFor = (
  lightness: readonly number[],
  hues: HueSets,
  surfaceStep: number,
  reqs: readonly Requirement[],
): number => {
  const c = resolveChroma(lightness, hues);
  const si = cfg.steps.indexOf(surfaceStep as Step);
  const surface = { L: lightness[si]!, C: c.neutral[si]!, H: hues.primary[0]! };
  let margin = Number.POSITIVE_INFINITY;
  for (const req of reqs) {
    const i = cfg.steps.indexOf(req.step as Step);
    for (const [set, chroma] of [
      [hues.primary, c.primary],
      [hues.status, c.status],
      [hues.categorical, c.categorical],
    ] as const) {
      for (const H of set) {
        const ratio = contrastBetween({ L: lightness[i]!, C: chroma[i]!, H }, surface);
        margin = Math.min(margin, ratio - req.min);
      }
    }
  }
  return margin;
};

/**
 * 明度の端点を、要件をすべて満たすぎりぎりまで動かす。
 *
 * 端点を固定値で持つことはできない。面は純白でも純黒でもなく、
 * その明るさも彩度も primary に依存し、彩度はセット単位でも変わるため、
 * 生成のたびに解き直す必要がある。
 *
 * 経緯: 純白に対する境界を固定値で持っていて保証が破れ、
 * 明色側だけ解いて暗色側が破れ、要件を1つだけ見て別の要件が破れた。
 * **3回とも網羅テストが検出した。** 要件は表で持ち、全部同時に満たす形にした。
 */
const solveEndpoint = (
  build: (endpoint: number) => number[],
  hues: HueSets,
  surfaceStep: number,
  reqs: readonly Requirement[],
  range: readonly [number, number],
  /** 端点を小さくするほどコントラストが上がるなら true */
  darkerIsBetter: boolean,
): number => {
  let [lo, hi] = range;
  for (let i = 0; i < 36; i++) {
    const mid = (lo + hi) / 2;
    const ok = marginFor(build(mid), hues, surfaceStep, reqs) >= 0;
    if (darkerIsBetter) ok ? (lo = mid) : (hi = mid);
    else ok ? (hi = mid) : (lo = mid);
  }
  return darkerIsBetter ? lo : hi;
};

export interface Palette {
  /** 生成のたびに解き直したアンカー段の明度 */
  anchorLightness: number;
  /** 生成のたびに解き直した下端の明度 */
  bottomLightness: number;
  lightnesses: readonly number[];
  primary: Ramp;
  neutral: Ramp;
  status: Record<StatusName, Ramp>;
  categorical: Ramp[];
  warnings: Warning[];
}

/**
 * primary から全パレットを生成する。
 *
 * 受け継ぐのは色相だけで、L と C は規則が決める（決定5-1）。
 * 入力の L / C が規則の出力と大きく離れる場合は警告する。
 */
export const generatePalette = (primary: Oklch): Palette => {
  const warnings: Warning[] = [];
  const { hues: statusHues, warnings: statusWarnings } = resolveStatusHues(primary.H);
  warnings.push(...statusWarnings);

  const statusList = statusNames.map((n) => statusHues[n]);
  const categorical = resolveCategoricalHues(primary.H, statusList);
  const allHues = [primary.H, ...statusList, ...categorical];

  // 彩度は「同じ場面に並ぶセット」単位で揃える（決定5-3）。
  // primary は単独で使われるので揃える相手がおらず、色相ごとの最大を取れる。
  // 全ランプで共通にすると #e879f9 が #875a8d になり、ブランド色として機能しない。
  const hueSets: HueSets = {
    primary: [primary.H],
    status: statusList,
    categorical,
    all: allHues,
  };
  const g = cfg.guarantees;
  // アンカーは下端に影響されないので先に解く
  const anchorL = solveEndpoint(
    (a) => lightnessesFor(a, cfg.lightness.bottomInitial),
    hueSets, g.lightSurfaceStep, g.light, [0.25, 0.8], true,
  );
  const bottomL = solveEndpoint(
    (b) => lightnessesFor(anchorL, b),
    hueSets, g.darkSurfaceStep, g.dark, [0.02, 0.4], true,
  );
  const lightnesses = lightnessesFor(anchorL, bottomL);
  const chroma = resolveChroma(lightnesses, hueSets);
  const { primary: primaryChroma, status: statusChroma, categorical: categoricalChroma, neutral: neutralChroma } = chroma;

  // 入力の色が規則の出力でどれだけ再現できるかを確かめる
  const nearest = cfg.steps.reduce((best, s, i) =>
    Math.abs(lightnesses[i]! - primary.L) <
    Math.abs(lightnesses[cfg.steps.indexOf(best as Step)]! - primary.L)
      ? s
      : best,
  );
  const nearestIndex = cfg.steps.indexOf(nearest as Step);
  const dC = primary.C - primaryChroma[nearestIndex]!;
  const dL = Math.abs(primary.L - lightnesses[nearestIndex]!);
  if (dC > cfg.warnings.primaryChromaExcess) {
    warnings.push({
      code: 'primary-chroma-unreachable',
      message:
        `選んだ色の彩度（${primary.C.toFixed(3)}）は、この明度で sRGB に収まる上限` +
        `（${primaryChroma[nearestIndex]!.toFixed(3)}）を超えています。くすんだ色で生成されます。`,
      detail: { requested: primary.C, available: primaryChroma[nearestIndex]!, step: nearest },
    });
  }
  if (dL > cfg.warnings.primaryLightnessExcess) {
    warnings.push({
      code: 'primary-lightness-shifted',
      message:
        `選んだ色の明度（${primary.L.toFixed(3)}）に一致する段がありません。` +
        `最も近い段 ${nearest}（${lightnesses[nearestIndex]!.toFixed(3)}）に丸められます。`,
      detail: { requested: primary.L, nearest: lightnesses[nearestIndex]!, step: nearest },
    });
  }

  return {
    anchorLightness: anchorL,
    bottomLightness: bottomL,
    lightnesses,
    primary: buildRamp(primary.H, lightnesses, primaryChroma),
    neutral: buildRamp(primary.H, lightnesses, neutralChroma),
    status: Object.fromEntries(
      statusNames.map((n) => [n, buildRamp(statusHues[n], lightnesses, statusChroma)]),
    ) as Record<StatusName, Ramp>,
    categorical: categorical.map((h) => buildRamp(h, lightnesses, categoricalChroma)),
    warnings,
  };
};

/** 前景と背景のコントラスト比。テーマビルダーの警告と CI の両方で使う */
export const contrastBetween = (fg: Oklch, bg: Oklch): number =>
  contrastRatio(
    relativeLuminance(oklchToLinearRgb(fg)),
    relativeLuminance(oklchToLinearRgb(bg)),
  );
