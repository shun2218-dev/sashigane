/**
 * 色システムの不変条件。
 *
 * 最も重要なのは「全色相を primary にして生成しても、コントラスト保証が成立する」こと。
 * 特定の1色で通ることには意味がない。利用者は任意の色を選ぶ（決定5-1）。
 *
 * 経緯: 明度の端点を固定値で持っていた時期に、保証が3度破れた。
 * いずれもこの網羅テストが検出した。docs/agent-failures.md を参照。
 */
import { describe, expect, it } from 'vitest';
import tokens from '../src/tokens.json' with { type: 'json' };
import {
  contrastBetween,
  generatePalette,
  hexToOklch,
  hueDistance,
  inSrgbGamut,
  maxSafeChroma,
  minPerceptualDistance,
  oklchToLinearRgb,
  resolveStatusHues,
  statusNames,
  steps,
  verifyPalette,
  type Palette,
} from '../src/index.ts';

const cfg = tokens.color;
const g = cfg.guarantees;

/** 全色相。間引かない。1パレット約 22ms で全体 8 秒程度 */
const ALL_HUES = Array.from({ length: 360 }, (_, i) => i);
const palettes = ALL_HUES.map((H) => ({ H, pal: generatePalette({ L: 0.6, C: 0.1, H }) }));

const allRamps = (p: Palette) => [
  p.primary,
  ...statusNames.map((n) => p.status[n]),
  ...p.categorical,
];

describe('コントラスト保証（決定5-2）', () => {
  for (const [side, surfaceStep] of [
    ['明色の面', g.lightSurfaceStep],
    ['暗色の面', g.darkSurfaceStep],
  ] as const) {
    const reqs = side === '明色の面' ? g.light : g.dark;
    for (const req of reqs) {
      it(`${side}(${surfaceStep}) に対し、段 ${req.step} が全360色相で ${req.min}:1 以上`, () => {
        let worst = { ratio: Number.POSITIVE_INFINITY, H: -1, hue: -1 };
        for (const { H, pal } of palettes) {
          const bg = pal.neutral.byStep[surfaceStep]!;
          for (const ramp of allRamps(pal)) {
            const ratio = contrastBetween(ramp.byStep[req.step]!, bg);
            if (ratio < worst.ratio) worst = { ratio, H, hue: ramp.hue };
          }
        }
        expect(
          worst.ratio,
          `最悪は primary=${worst.H}° のときの色相 ${worst.hue.toFixed(0)}°`,
        ).toBeGreaterThanOrEqual(req.min);
      });
    }
  }

  it('拘束条件はちょうど境界に着地する（余分に暗くしていない）', () => {
    // 端点を要件ぎりぎりまで動かしているので、最悪ケースは目標値に一致するはず。
    // 大きく上回っていたら、解が効かず固定値に戻っている疑いがある。
    let worst = Number.POSITIVE_INFINITY;
    for (const { pal } of palettes) {
      const bg = pal.neutral.byStep[g.lightSurfaceStep]!;
      for (const ramp of allRamps(pal)) {
        worst = Math.min(worst, contrastBetween(ramp.byStep[500]!, bg));
      }
    }
    expect(worst).toBeCloseTo(4.5, 2);
  });
});

describe('sRGB 色域（決定5-3）', () => {
  it('生成した全ての色が sRGB に収まる', () => {
    for (const { H, pal } of palettes) {
      for (const ramp of [...allRamps(pal), pal.neutral]) {
        for (const step of steps) {
          const c = ramp.byStep[step]!;
          expect(inSrgbGamut(oklchToLinearRgb(c)), `primary=${H}° step=${step}`).toBe(true);
        }
      }
    }
  });
});

describe('明度ランプ（決定5-2）', () => {
  it('段は 50〜950 の11段', () => {
    expect(steps).toEqual([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);
  });

  it('全色相で単調減少する', () => {
    for (const { H, pal } of palettes) {
      for (let i = 1; i < pal.lightnesses.length; i++) {
        expect(pal.lightnesses[i]!, `primary=${H}°`).toBeLessThan(pal.lightnesses[i - 1]!);
      }
    }
  });

  it('端点は primary ごとに解き直される（固定値ではない）', () => {
    const anchors = new Set(palettes.map((p) => p.pal.anchorLightness.toFixed(4)));
    const bottoms = new Set(palettes.map((p) => p.pal.bottomLightness.toFixed(4)));
    expect(anchors.size, 'アンカーが1値なら固定値に戻っている').toBeGreaterThan(1);
    expect(bottoms.size, '下端が1値なら固定値に戻っている').toBeGreaterThan(1);
  });
});

describe('status の色相（決定5-4）', () => {
  it('基準色相から maxPull 度を超えて動かない', () => {
    for (const { H, pal } of palettes) {
      for (const name of statusNames) {
        const canonical = cfg.statusHues.canonical[name];
        expect(
          hueDistance(pal.status[name].hue, canonical),
          `primary=${H}° の ${name}`,
        ).toBeLessThanOrEqual(cfg.statusHues.maxPull + 1e-9);
      }
    }
  });

  it('status 同士が最小角距離を保つ', () => {
    for (const { H, pal } of palettes) {
      for (const a of statusNames) {
        for (const b of statusNames) {
          if (a >= b) continue;
          expect(
            hueDistance(pal.status[a].hue, pal.status[b].hue),
            `primary=${H}° の ${a} と ${b}`,
          ).toBeGreaterThanOrEqual(cfg.statusHues.minSeparation);
        }
      }
    }
  });

  it('primary が status に近すぎるときは警告する', () => {
    // info の基準は 250°。そこへ寄せた primary は警告を出すはず
    const { warnings } = resolveStatusHues(250);
    expect(warnings.some((w) => w.code === 'status-too-close-to-primary')).toBe(true);
  });

  it('primary が status から遠ければ警告しない', () => {
    // 200° は danger(25) warning(70) success(150) info(250) のいずれからも十分遠い
    const { warnings } = resolveStatusHues(200);
    expect(warnings).toHaveLength(0);
  });
});

describe('彩度の決め方（決定5-3 再改訂）', () => {
  it('識別色はセット内で段ごとに彩度が一致する', () => {
    // 系列は互いに対等であるべきで、特定の系列だけ強く見える理由がない
    for (const { H, pal } of palettes) {
      for (const step of steps) {
        const catC = pal.categorical.map((r) => r.byStep[step]!.C);
        expect(new Set(catC.map((c) => c.toFixed(9))).size, `primary=${H}°`).toBe(1);
      }
    }
  });

  it('status は色相ごとに彩度が異なる', () => {
    // セット共通にしていたとき、共通値を引き下げるのは warning（黄系）だけで、
    // 実際に損をするのは danger だけだった。#a84b53 は危険色として弱い
    for (const { H, pal } of palettes) {
      const cs = statusNames.map((n) => pal.status[n].byStep[500]!.C.toFixed(6));
      expect(new Set(cs).size, `primary=${H}°`).toBeGreaterThan(1);
    }
  });

  it('danger は warning より彩度が高く取れる', () => {
    // 赤はこの明度で高い彩度を保てるが、黄は保てない。
    // セット共通だと赤が黄に合わせて削られていた
    for (const { H, pal } of palettes) {
      expect(
        pal.status.danger.byStep[500]!.C,
        `primary=${H}°`,
      ).toBeGreaterThan(pal.status.warning.byStep[500]!.C);
    }
  });

  it('中間色は全定義色相の共通彩度の neutralRatio 倍', () => {
    const pal = generatePalette({ L: 0.6, C: 0.1, H: 260 });
    const hues = [
      pal.primary.hue,
      ...statusNames.map((n) => pal.status[n].hue),
      ...pal.categorical.map((r) => r.hue),
    ];
    for (const [i, step] of steps.entries()) {
      const shared = maxSafeChroma(pal.lightnesses[i]!, hues);
      expect(pal.neutral.byStep[step]!.C).toBeCloseTo(shared * cfg.chroma.neutralRatio, 9);
    }
  });

  it('中間色は primary の色相で着色される（純グレーではない）', () => {
    const pal = generatePalette({ L: 0.6, C: 0.1, H: 260 });
    expect(pal.neutral.hue).toBe(260);
    expect(pal.neutral.byStep[400]!.C).toBeGreaterThan(0);
  });
});

describe('識別色（決定5-5）', () => {
  it('status の周囲 avoidRadius 度を避ける', () => {
    for (const { H, pal } of palettes) {
      for (const cat of pal.categorical) {
        for (const name of statusNames) {
          expect(
            hueDistance(cat.hue, pal.status[name].hue),
            `primary=${H}° の識別色 ${cat.hue.toFixed(0)}° と ${name}`,
          ).toBeGreaterThanOrEqual(cfg.categorical.avoidRadius - 1e-9);
        }
      }
    }
  });

  it('識別色どうしも互いに離れている', () => {
    // status との距離だけ検査していて、識別色どうしは偶然離れていただけだった。
    // 禁止帯を避ける処理で2色が同じ縁に寄せられれば、系列が見分けられなくなる。
    for (const { H, pal } of palettes) {
      const hues = pal.categorical.map((r) => r.hue);
      for (let i = 0; i < hues.length; i++) {
        for (let j = i + 1; j < hues.length; j++) {
          expect(
            hueDistance(hues[i]!, hues[j]!),
            `primary=${H}° の識別色 ${hues[i]!.toFixed(0)}° と ${hues[j]!.toFixed(0)}°`,
          ).toBeGreaterThanOrEqual(cfg.categorical.avoidRadius);
        }
      }
    }
  });

  it('色覚特性のもとでも系列が見分けられる（決定5-8）', () => {
    // 色相だけ変えた5系列は二色覚で潰れる。実測で 2型色覚下の最小 ΔE が 0.003 だった。
    // 閾値 0.08 は Okabe-Ito 5色（色覚配慮設計の定番）の実測 0.086 を基準にしている。
    for (const { H, pal } of palettes) {
      for (const mode of ['light', 'dark'] as const) {
        const stepsFor = pal.categoricalSteps[mode];
        const colors = pal.categorical.map((r, i) => r.byStep[stepsFor[i]!]!);
        expect(
          minPerceptualDistance(colors),
          `primary=${H}° の ${mode}（段 ${stepsFor.join(',')}）`,
        ).toBeGreaterThanOrEqual(cfg.categorical.minDistance);
      }
    }
  });

  it('系列に割り当てる段が重複しない', () => {
    for (const { H, pal } of palettes) {
      for (const mode of ['light', 'dark'] as const) {
        const stepsFor = pal.categoricalSteps[mode];
        expect(new Set(stepsFor).size, `primary=${H}° の ${mode}`).toBe(stepsFor.length);
      }
    }
  });

  it('系列に使う段が、面に対して 3:1 を満たす', () => {
    // マークは文字ではないので 3:1 で足りる（決定5-7）。段をずらしても割ってはいけない
    for (const { H, pal } of palettes) {
      for (const [mode, surfaceStep] of [
        ['light', g.lightSurfaceStep],
        ['dark', g.darkSurfaceStep],
      ] as const) {
        const bg = pal.neutral.byStep[surfaceStep]!;
        pal.categoricalSteps[mode].forEach((step, i) => {
          expect(
            contrastBetween(pal.categorical[i]!.byStep[step]!, bg),
            `primary=${H}° の ${mode} 系列${i + 1}（段${step}）`,
          ).toBeGreaterThanOrEqual(3);
        });
      }
    }
  });

  it('系列数は tokens.json のとおり', () => {
    expect(palettes[0]!.pal.categorical).toHaveLength(cfg.categorical.count);
  });
});

describe('編集後の検査（決定5-1）', () => {
  it('生成直後のパレットは警告を出さない', () => {
    for (const { H, pal } of palettes) {
      expect(verifyPalette(pal), `primary=${H}°`).toHaveLength(0);
    }
  });

  it('段を1つ明るく書き換えると警告が出る', () => {
    // 人間が編集したときに気づけることの確認。出ないなら検査が機能していない
    const pal = generatePalette({ L: 0.6, C: 0.1, H: 200 });
    const broken: Palette = {
      ...pal,
      primary: {
        ...pal.primary,
        byStep: { ...pal.primary.byStep, 500: { ...pal.primary.byStep[500]!, L: 0.85 } },
      },
    };
    const warnings = verifyPalette(broken);
    expect(warnings.some((w) => w.code === 'contrast-below-target')).toBe(true);
  });
});

describe('入力の再現性を警告する（決定5-1）', () => {
  it('sRGB で再現できないほど鮮やかな色には警告を出す', () => {
    // 純黄 #ffff00 は L=0.97 C=0.211。その明度で単一色相でも C=0.117 までしか取れない
    const pal = generatePalette(hexToOklch('#ffff00'));
    expect(pal.warnings.some((w) => w.code === 'primary-chroma-unreachable')).toBe(true);
  });

  it('一般的なブランド色は警告なしで再現できる（決定5-3 改訂の効果）', () => {
    // 彩度をセット単位にする前は #e879f9 が #875a8d になり、この警告が出ていた。
    // primary が単独で彩度を取れるようになったことで再現できる。
    const pal = generatePalette(hexToOklch('#e879f9'));
    expect(pal.warnings.some((w) => w.code === 'primary-chroma-unreachable')).toBe(false);
  });

  it('規則の出力に近い色には彩度の警告を出さない', () => {
    const base = generatePalette({ L: 0.6, C: 0.1, H: 200 });
    const reachable = base.primary.byStep[500]!;
    const pal = generatePalette(reachable);
    expect(pal.warnings.some((w) => w.code === 'primary-chroma-unreachable')).toBe(false);
  });
});
