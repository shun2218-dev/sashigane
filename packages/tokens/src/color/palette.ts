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
import { minPerceptualDistance } from './cvd.ts';
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

/**
 * パレットを構成する色相を、彩度の決め方ごとに束ねたもの。
 *
 * primary と status は**それぞれ単独**で彩度を取る。
 * status をセット内で揃えていた時期があったが、共通値を引き下げているのは
 * warning（黄系）だけで、実際に損をするのは danger だけだった。
 * `#a84b53` は危険を伝える色として弱い（決定5-3 の再改訂）。
 *
 * 識別色は**セット内で共通**のまま。系列は互いに対等であるべきで、
 * 特定の系列だけ強く見える理由がない。
 */
interface HueSets {
  /** 単独で彩度を取る色相（primary と status） */
  solo: number[];
  /** セット内で彩度を揃える色相（識別色） */
  shared: number[];
  /** 中間色の彩度を決めるための全色相 */
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
  const chromaFor = (hs: readonly number[]) => lightness.map((L) => maxSafeChroma(L, hs));
  const shared = chromaFor(hues.shared);
  return {
    /**
     * 単独で彩度を取る色相 → その彩度。
     *
     * 色相をキーにした1つの Map にまとめてはならない。
     * 識別色の1本目は primary と同じ色相なので、キーが衝突して
     * **primary が識別色の（低い）彩度で上書きされる。**
     * 同じ色相でも別のランプなら別の彩度を持つ。
     */
    solo: new Map<number, number[]>(hues.solo.map((h) => [h, chromaFor([h])])),
    /** 識別色はセット内で共通の彩度 */
    shared,
    sharedHues: hues.shared,
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
  const surface = { L: lightness[si]!, C: c.neutral[si]!, H: hues.solo[0]! };
  let margin = Number.POSITIVE_INFINITY;
  for (const req of reqs) {
    const i = cfg.steps.indexOf(req.step as Step);
    // 各ランプを**実際に使う彩度**で評価する。
    // 共通彩度で評価していた時期があり、彩度の決め方を変えた瞬間に保証が破れた
    const check = (H: number, C: number) => {
      margin = Math.min(margin, contrastBetween({ L: lightness[i]!, C, H }, surface) - req.min);
    };
    for (const [H, chroma] of c.solo) check(H, chroma[i]!);
    for (const H of c.sharedHues) check(H, c.shared[i]!);
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

/**
 * 識別色の各系列にどの段を割り当てるかを、色覚特性下での見分けやすさが
 * 最大になるように選ぶ（決定5-8）。
 *
 * 5系列を同じ段（＝同じ明度・同じ彩度）で並べると、違いが色相しかない。
 * 二色覚では色相軸が潰れるため、2型色覚下で最小 ΔE が 0.003 まで落ちる。
 * 段をずらすと明度で見分けられるようになる。
 *
 * 候補は 5! = 120 通り。全部試して最良を採る（約 0.5ms）。
 * 探索であって恣意ではない。同じ入力からは必ず同じ結果が出る。
 */
const bestStepAssignment = (
  ramps: readonly Ramp[],
  candidates: readonly number[],
): number[] => {
  const permutations = (xs: readonly number[]): number[][] =>
    xs.length <= 1
      ? [[...xs]]
      : xs.flatMap((x, i) =>
          permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((rest) => [x!, ...rest]),
        );
  let best: number[] = [...candidates];
  let bestScore = -1;
  for (const perm of permutations(candidates)) {
    const score = minPerceptualDistance(ramps.map((r, i) => r.byStep[perm[i]!]!));
    if (score > bestScore) {
      bestScore = score;
      best = perm;
    }
  }
  return best;
};

export interface Palette {
  /** 生成のたびに解き直したアンカー段の明度 */
  anchorLightness: number;
  /** 生成のたびに解き直した下端の明度 */
  bottomLightness: number;
  /** 識別色の系列 i がマークに使う段。色覚特性下の見分けやすさで決まる（決定5-8） */
  categoricalSteps: { light: number[]; dark: number[] };
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
    solo: [primary.H, ...statusList],
    shared: categorical,
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
  const soloChroma = (h: number) => chroma.solo.get(h)!;

  // 入力の色が規則の出力でどれだけ再現できるかを確かめる
  const nearest = cfg.steps.reduce((best, s, i) =>
    Math.abs(lightnesses[i]! - primary.L) <
    Math.abs(lightnesses[cfg.steps.indexOf(best as Step)]! - primary.L)
      ? s
      : best,
  );
  const nearestIndex = cfg.steps.indexOf(nearest as Step);
  const dC = primary.C - soloChroma(primary.H)[nearestIndex]!;
  const dL = Math.abs(primary.L - lightnesses[nearestIndex]!);
  if (dC > cfg.warnings.primaryChromaExcess) {
    warnings.push({
      code: 'primary-chroma-unreachable',
      message:
        `選んだ色の彩度（${primary.C.toFixed(3)}）は、この明度で sRGB に収まる上限` +
        `（${soloChroma(primary.H)[nearestIndex]!.toFixed(3)}）を超えています。くすんだ色で生成されます。`,
      detail: { requested: primary.C, available: soloChroma(primary.H)[nearestIndex]!, step: nearest },
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

  const categoricalRamps = categorical.map((h) => buildRamp(h, lightnesses, chroma.shared));

  return {
    anchorLightness: anchorL,
    bottomLightness: bottomL,
    lightnesses,
    primary: buildRamp(primary.H, lightnesses, soloChroma(primary.H)),
    neutral: buildRamp(primary.H, lightnesses, chroma.neutral),
    status: Object.fromEntries(
      statusNames.map((n) => [n, buildRamp(statusHues[n], lightnesses, soloChroma(statusHues[n]))]),
    ) as Record<StatusName, Ramp>,
    categorical: categoricalRamps,
    categoricalSteps: {
      light: bestStepAssignment(categoricalRamps, cfg.categorical.lightSteps),
      dark: bestStepAssignment(categoricalRamps, cfg.categorical.darkSteps),
    },
    warnings,
  };
};

/**
 * パレットがコントラスト保証を満たしているかを検査する。
 *
 * 生成直後は必ず満たすが、**人間が編集したあとは満たすとは限らない。**
 * テーマビルダーはユーザーが値をいじるたびにこれを呼び、警告を出す。
 * 生成物は提案であって強制ではないが、保証が崩れたことは知らせる必要がある（決定5-1）。
 */
export const verifyPalette = (palette: Palette): Warning[] => {
  const warnings: Warning[] = [];
  const ramps: [string, Ramp][] = [
    ['primary', palette.primary],
    ...statusNames.map((n) => [n, palette.status[n]] as [string, Ramp]),
    ...palette.categorical.map((r, i) => [`categorical-${i + 1}`, r] as [string, Ramp]),
  ];
  for (const [side, surfaceStep, reqs] of [
    ['明色', cfg.guarantees.lightSurfaceStep, cfg.guarantees.light],
    ['暗色', cfg.guarantees.darkSurfaceStep, cfg.guarantees.dark],
  ] as const) {
    const surface = palette.neutral.byStep[surfaceStep];
    if (!surface) continue;
    for (const req of reqs) {
      for (const [name, ramp] of ramps) {
        const fg = ramp.byStep[req.step];
        if (!fg) continue;
        const ratio = contrastBetween(fg, surface);
        if (ratio < req.min) {
          warnings.push({
            code: 'contrast-below-target',
            message:
              `${name} の段 ${req.step} が${side}の面に対して ${ratio.toFixed(2)}:1 しかありません` +
              `（必要: ${req.min}:1）。この組み合わせは読めない可能性があります。`,
            detail: { ramp: name, step: req.step, surface: surfaceStep, ratio, required: req.min },
          });
        }
      }
    }
  }
  return warnings;
};

/** 前景と背景のコントラスト比。テーマビルダーの警告と CI の両方で使う */
export const contrastBetween = (fg: Oklch, bg: Oklch): number =>
  contrastRatio(
    relativeLuminance(oklchToLinearRgb(fg)),
    relativeLuminance(oklchToLinearRgb(bg)),
  );

/**
 * 面ごとの、役割が参照する段（決定5-12）。
 *
 * **保証は面の1段目でしか成立しない**ことが Phase 2 の2本目で分かった
 * （docs/experiments/phase2-holosphere.md）。端点を解く相手を深い面に変えても解は無い。
 * 明色は濃いアンカーを、暗色は明るい段400を要求して両立しないためで、これは測って確かめた。
 *
 * ランプ自体は変えない。**面が1段深くなるごとに、役割が参照する段も深い側へずらす。**
 * 必要な段はすべて既存の11段の中にある。
 */
export interface SurfaceRoles {
  /** この面が使う中間色の段 */
  surface: number;
  text: { default: number; muted: number; faint: number };
  border: { subtle: number; default: number };
  /** 色つきランプのうち、文字に使う段（4.5:1） */
  colorText: number;
  /** 色つきランプのうち、マークに使う段（3:1）。決定5-7 */
  colorMark: number;
  /**
   * 識別色の系列ごとの段。**面が深いと段が足りず null になる。**
   *
   * 暗色の inset では 3:1 を満たす段が4つしか残らず、5系列を配れない。
   * null の面では変数を出さないので、親の面の値をそのまま継承する。
   * **チャートを inset に載せることは保証しない**（決定5-12）。
   */
  series: number[] | null;
}

/** 面から遠ざかる向きに並べた段。明色は濃くなる向き、暗色は明るくなる向き */
const awayFromSurface = (mode: 'light' | 'dark'): number[] =>
  mode === 'light' ? [...cfg.steps] : [...cfg.steps].reverse();

/** ランプのどれか1つでも要件を割ったら不合格。最悪ケースで判定する */
const meets = (
  step: number,
  surface: Oklch,
  min: number,
  ramps: readonly Ramp[],
): boolean => ramps.every((r) => contrastBetween(r.byStep[step]!, surface) >= min);

export const surfaceRolesFor = (
  palette: Palette,
  mode: 'light' | 'dark',
): SurfaceRoles[] => {
  const g = cfg.guarantees;
  const surfaces = mode === 'light' ? g.surfaces.light : g.surfaces.dark;
  const order = awayFromSurface(mode);
  const colored: Ramp[] = [palette.primary, ...statusNames.map((n) => palette.status[n])];
  const neutral = [palette.neutral];
  const baseSeries =
    mode === 'light' ? cfg.categorical.lightSteps : cfg.categorical.darkSteps;

  return surfaces.map((surfaceStep, depth) => {
    const bg = palette.neutral.byStep[surfaceStep]!;
    /** 面より外側にある段だけを候補にする。面より内側は必ず沈む */
    const outward = order.slice(order.indexOf(surfaceStep) + 1);
    const shallowest = (min: number, ramps: readonly Ramp[], after = -1): number =>
      outward.find((s) => order.indexOf(s) > after && meets(s, bg, min, ramps)) ??
      outward[outward.length - 1]!;

    const faint = shallowest(g.textMin, neutral);
    const muted = shallowest(g.textMin, neutral, order.indexOf(faint));
    const colorText = shallowest(g.textMin, colored);

    /**
     * マークは文字の段より**1段明るい側**を取る（決定5-7）。明色でも暗色でも同じ向きで、
     * 暗色ではコントラストがむしろ上がる。要件（3:1）を満たす最も浅い段ではない。
     *
     * 最小を満たす段を取ると明色で段500 になり、テーマビルダーで目視したとき
     * チャート系列が全部くすんで見分けられなかった。このランプは明るい段ほど彩度が乗る。
     * **数値では気づけなかった判断**なので、規則の側に残す。
     */
    const markStep = (textStep: number): number => {
      const i = cfg.steps.indexOf(textStep as Step) - 1;
      const candidate = cfg.steps[Math.max(i, 0)]!;
      return meets(candidate, bg, g.markMin, colored) ? candidate : textStep;
    };

    /** 境界は装飾なので要件を持たない。面と一緒に深い側へずらす */
    const shift = (step: number): number =>
      order[Math.min(order.indexOf(step) + depth, order.length - 1)]!;

    /**
     * 系列色は面の深さだけ候補をずらして、色覚特性下の割り当てを解き直す（決定5-8）。
     * ずらした候補がランプの端をはみ出す面では配れないので null を返す。
     */
    const shifted = baseSeries.map((s) => order.indexOf(s) + depth);
    const series =
      shifted.every((i) => i < order.length) && new Set(shifted).size === shifted.length
        ? bestStepAssignment(
            palette.categorical,
            shifted.map((i) => order[i]!),
          )
        : null;

    return {
      surface: surfaceStep,
      /** 文字の最も強い段は面によらず動かさない。どの面でも要件を満たす */
      text: { default: mode === 'light' ? 900 : 100, muted, faint },
      border: {
        subtle: shift(mode === 'light' ? 200 : 800),
        default: shift(mode === 'light' ? 300 : 700),
      },
      colorText,
      colorMark: markStep(colorText),
      series,
    };
  });
};
