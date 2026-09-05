/**
 * 連続値の色帯の不変条件（決定5-11）。
 *
 * この帯の目的は**順序が読めること**である。段が見分けられるかではない。
 * したがって検査するのは知覚明度の単調性で、**二色覚3種を含めて**見る。
 *
 * 経緯: 当初は viridis 相当の多色相にする方針だった。明度に沿って色相を回すと
 * 二色覚のもとで単調性が壊れることを測って分かり、単一色相へ切り替えた。
 * **その測定をここで回帰検査にしている。** 記録は docs/experiments/sequential.md。
 */
import { describe, expect, it } from 'vitest';
import {
  colorSemanticVars,
  surfaceContextVars,
  contrastBetween,
  generatePalette,
  maxSafeChroma,
  oklchToLinearRgb,
  simulateVision,
  statusNames,
  steps,
  visionTypes,
  type Palette,
} from '../src/index.ts';

/** 二色覚を通した後の知覚明度（OKLab の L） */
const perceivedLightness = (rgb: readonly [number, number, number]): number => {
  const l = Math.cbrt(0.4122214708 * rgb[0] + 0.5363325363 * rgb[1] + 0.0514459929 * rgb[2]);
  const m = Math.cbrt(0.2119034982 * rgb[0] + 0.6806995451 * rgb[1] + 0.1073969566 * rgb[2]);
  const s = Math.cbrt(0.0883024619 * rgb[0] + 0.2817188376 * rgb[1] + 0.6299787005 * rgb[2]);
  return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
};

/**
 * セマンティックの参照をたどって、帯の色そのものを取り出す。
 *
 * **どのランプを指しているかを決め打ちしない。** 「primary の段」と決め打つと、
 * 色相を回す実装に変えたときに抽出が外れ、**単調性の検査が空振りして緑になる**（教訓2）。
 */
const rampsOf = (palette: Palette): Record<string, Palette['primary']> => ({
  neutral: palette.neutral,
  primary: palette.primary,
  ...Object.fromEntries(statusNames.map((n) => [n, palette.status[n]!])),
  ...Object.fromEntries(palette.categorical.map((r, i) => [`series-${i + 1}`, r])),
});

const band = (mode: 'light' | 'dark', palette: Palette) => {
  const ramps = rampsOf(palette);
  return colorSemanticVars(mode, palette)
    .flatMap((line) => {
      const m = /--sg-color-sequential-(\d+): var\(--sg-([a-z0-9-]+)-(\d+)\)/.exec(line);
      return m ? [{ index: Number(m[1]), ramp: m[2]!, step: Number(m[3]) }] : [];
    })
    .sort((a, b) => a.index - b.index)
    .map(({ ramp, step }) => {
      const color = ramps[ramp]?.byStep[step];
      if (!color) throw new Error(`帯が未知のランプを指しています: --sg-${ramp}-${step}`);
      return color;
    });
};

/**
 * 帯の順序が読めなくなる箇所を数える。**両モードで向きが逆**なのが正しい。
 * 検出器はここ1つで、実際の帯にも陰性対照にも同じものを当てる。
 */
const monotonicityViolations = (
  colors: readonly { L: number; C: number; H: number }[],
  mode: 'light' | 'dark',
): string[] => {
  const out: string[] = [];
  for (const vision of visionTypes) {
    const ls = colors.map((c) => perceivedLightness(simulateVision(oklchToLinearRgb(c), vision)));
    for (let i = 1; i < ls.length; i++) {
      const delta = mode === 'light' ? ls[i - 1]! - ls[i]! : ls[i]! - ls[i - 1]!;
      if (delta <= 0) out.push(`${vision} 段${i}→${i + 1} Δ=${delta.toFixed(4)}`);
    }
  }
  return out;
};

/** 全色相を試す。特定の1色で通ることに意味はない（決定5-1） */
const HUES = Array.from({ length: 36 }, (_, i) => i * 10);

describe('連続値の色帯', () => {
  const palette = generatePalette({ L: 0.6, C: 0.1, H: 220 });

  it('段数は明度スケールから面の1段を引いた数', () => {
    expect(band('light', palette)).toHaveLength(steps.length - 1);
    expect(band('dark', palette)).toHaveLength(steps.length - 1);
  });

  it('帯の最小段が面と見分けられる（値が最小のセルが消えない）', () => {
    // 面の段をそのまま帯に入れるとコントラストが 1.00 になり、
    // 値が最小のセルとデータが無いセルが区別できない（自己レビュー B1）
    for (const [mode, pageStep] of [
      ['light', steps[0]!],
      ['dark', steps.at(-1)!],
    ] as const) {
      const page = palette.neutral.byStep[pageStep]!;
      const first = band(mode, palette)[0]!;
      expect(contrastBetween(page, first), mode).toBeGreaterThan(1.1);
    }
  });

  it('帯の最小段が **どの面でも** 見分けられる（決定5-12）', () => {
    // page 固定で除いていた時期は、カードの上で帯の下端がちょうど 1.00 になっていた。
    // 除く段は面ごとに変わる
    const surfaces = { light: [50, 100, 200], dark: [950, 900, 800] } as const;
    for (const mode of ['light', 'dark'] as const) {
      surfaces[mode].forEach((surfaceStep, depth) => {
        const css = surfaceContextVars(mode, palette, depth).join('\n');
        const first = /--sg-color-sequential-1:\s*var\(--sg-primary-(\d+)\)/.exec(css);
        expect(first, `${mode} / 面${surfaceStep} に帯が出ていない`).not.toBeNull();
        const ratio = contrastBetween(
          palette.neutral.byStep[surfaceStep]!,
          palette.primary.byStep[Number(first![1])]!,
        );
        expect(ratio, `${mode} / 面${surfaceStep}`).toBeGreaterThan(1.1);
      });
    }
  });

  it('段数は面が変わっても10のまま（名前の顔ぶれが変わらない）', () => {
    for (const mode of ['light', 'dark'] as const) {
      for (const depth of [0, 1, 2]) {
        const n = surfaceContextVars(mode, palette, depth).filter((l) =>
          l.includes('--sg-color-sequential-'),
        ).length;
        expect(n, `${mode} / depth ${depth}`).toBe(steps.length - 1);
      }
    }
  });

  it('両モードとも同じランプを、面から遠ざかる向きにたどる（色を反転していない）', () => {
    // 除く段がモードで違う（明色は 50、暗色は 950）ので、単純な逆順にはならない。
    // 見るのは「同じ primary ランプの段を、面から遠い向きに並べている」こと
    const expected = (order: readonly number[]) =>
      order.slice(1).map((step) => palette.primary.byStep[step]!);
    expect(band('light', palette)).toEqual(expected(steps));
    expect(band('dark', palette)).toEqual(expected([...steps].reverse()));
  });

  it('帯は面に近い側から始まる（薄い＝小さい値）', () => {
    // 明色の面は段 50 側、暗色の面は段 950 側にある（決定5-2）。
    // その1段内側から始まる
    expect(band('light', palette)[0]).toBe(palette.primary.byStep[100]);
    expect(band('dark', palette)[0]).toBe(palette.primary.byStep[900]);
  });

  it('陰性対照: 退けた多色相の帯を当てると、この検査は発火する', () => {
    // 明度は同じ11段のまま、色相だけを 90° 回した帯（決定5-11 で測って退けた案）。
    // **これが緑になるなら、下の検査は何も見ていない**（教訓2）
    const rotated = (h0: number) =>
      palette.lightnesses.map((L, i) => {
        const H = (h0 + 90 * (i / (palette.lightnesses.length - 1))) % 360;
        return { L, C: maxSafeChroma(L, [H]), H };
      });
    const fired = HUES.filter((h) => monotonicityViolations(rotated(h), 'light').length > 0);
    expect(fired.length).toBeGreaterThan(0);
  });

  it('知覚明度が単調である — 全色相・全視覚型・両モード', () => {
    const broken: string[] = [];
    for (const H of HUES) {
      const p = generatePalette({ L: 0.6, C: 0.1, H });
      for (const mode of ['light', 'dark'] as const) {
        broken.push(...monotonicityViolations(band(mode, p), mode).map((v) => `H=${H} ${mode} ${v}`));
      }
    }
    expect(broken).toEqual([]);
  });

  it('離散系列とは別の名前で出る（混同すると「5系列で足りる」になる）', () => {
    const names = colorSemanticVars('light', palette).join('\n');
    expect(names).toContain('--sg-color-sequential-1:');
    expect(names).toContain('--sg-color-chart-1:');
  });
});
