/**
 * 色覚特性のシミュレーションと、色の見分けやすさの測定。
 *
 * 識別色は色相環に等間隔で配るが、**二色覚では色相軸が潰れる。**
 * 明度も彩度も同じにしたまま色相だけ変えた5系列は、2型色覚のもとで
 * 最小 ΔE が 0.003（実質同一）まで落ちることを実測した。
 * docs/experiments/color-vision.md を参照。
 *
 * 変換行列は Machado, Oliveira, Fernandes (2009) の severity 1.0。
 * 線形 RGB に対して適用する。
 *
 * 妥当性は既知の挙動で確認済み。
 *   2型で赤と緑の ΔE が 0.415 → 0.086 に落ちる
 *   3型で青と黄の ΔE が 0.489 → 0.323 に落ちる
 *   2型でも赤と青は 0.430 → 0.362 と残る
 */
import { oklchToLinearRgb, type LinearRgb, type Oklch } from './oklch.ts';

export type VisionType = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia';

type Matrix = readonly (readonly [number, number, number])[];

const MATRICES: Record<VisionType, Matrix> = {
  normal: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

export const visionTypes = Object.keys(MATRICES) as VisionType[];

export const simulateVision = (rgb: LinearRgb, type: VisionType): LinearRgb => {
  const m = MATRICES[type];
  return [
    m[0]![0] * rgb[0] + m[0]![1] * rgb[1] + m[0]![2] * rgb[2],
    m[1]![0] * rgb[0] + m[1]![1] * rgb[1] + m[1]![2] * rgb[2],
    m[2]![0] * rgb[0] + m[2]![1] * rgb[1] + m[2]![2] * rgb[2],
  ];
};

/** 知覚距離を測るための OKLab。色相ではなく L/a/b のユークリッド距離で見る */
const toOklab = (rgb: LinearRgb): [number, number, number] => {
  const c = (v: number) => Math.min(1, Math.max(0, v));
  const R = c(rgb[0]);
  const G = c(rgb[1]);
  const B = c(rgb[2]);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

/**
 * 色の集合が、通常の色覚と3種の二色覚のすべてで互いに見分けられるかの指標。
 * 返すのは**最も近い2色の距離**。大きいほど良い。
 *
 * 較正の基準:
 *   Okabe-Ito 5色（色覚配慮設計の定番）  0.086
 *   shadcn chart-1..5                    0.047
 *   Tailwind 500 を5色                   0.009
 */
export const minPerceptualDistance = (colors: readonly Oklch[]): number => {
  let worst = Number.POSITIVE_INFINITY;
  for (const type of visionTypes) {
    const labs = colors.map((c) => toOklab(simulateVision(oklchToLinearRgb(c), type)));
    for (let i = 0; i < labs.length; i++) {
      for (let j = i + 1; j < labs.length; j++) {
        const a = labs[i]!;
        const b = labs[j]!;
        worst = Math.min(worst, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
      }
    }
  }
  return worst;
};
