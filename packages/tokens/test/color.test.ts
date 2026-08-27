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
  depthOf,
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
  surfaceNames as surfaceNamesAll,
  surfaceRolesFor,
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

describe('面ごとのコントラスト保証（決定5-12）', () => {
  // 4つ目は名前を持たない段である（決定5-13）。inset の hover の行き先で、
  // data-sg-surface では名乗れない。**検査の対象からは外さない。**
  const surfaceNames = ['page', 'surface', 'inset', 'hover(inset)'] as const;

  for (const mode of ['light', 'dark'] as const) {
    const surfaces = mode === 'light' ? g.surfaces.light : g.surfaces.dark;

    surfaces.forEach((surfaceStep, depth) => {
      const where = `${mode} / ${surfaceNames[depth]}(${surfaceStep})`;

      it(`${where}: 文字の3段がすべて ${g.textMin}:1 以上 — 全360色相`, () => {
        let worst = { ratio: Number.POSITIVE_INFINITY, H: -1, role: '' };
        for (const { H, pal } of palettes) {
          const roles = surfaceRolesFor(pal, mode)[depth]!;
          const bg = pal.neutral.byStep[surfaceStep]!;
          for (const [role, step] of Object.entries(roles.text)) {
            const ratio = contrastBetween(pal.neutral.byStep[step]!, bg);
            if (ratio < worst.ratio) worst = { ratio, H, role };
          }
        }
        expect(worst.ratio, `最悪は primary=${worst.H}° の ${worst.role}`).toBeGreaterThanOrEqual(
          g.textMin,
        );
      });

      it(`${where}: 色つきの文字が ${g.textMin}:1、マークが ${g.markMin}:1 以上 — 全360色相`, () => {
        let worstText = { ratio: Number.POSITIVE_INFINITY, H: -1 };
        let worstMark = { ratio: Number.POSITIVE_INFINITY, H: -1 };
        for (const { H, pal } of palettes) {
          const roles = surfaceRolesFor(pal, mode)[depth]!;
          const bg = pal.neutral.byStep[surfaceStep]!;
          const colored = [pal.primary, ...statusNames.map((n) => pal.status[n]!)];
          for (const ramp of colored) {
            const t = contrastBetween(ramp.byStep[roles.colorText]!, bg);
            if (t < worstText.ratio) worstText = { ratio: t, H };
            const m = contrastBetween(ramp.byStep[roles.colorMark]!, bg);
            if (m < worstMark.ratio) worstMark = { ratio: m, H };
          }
        }
        expect(worstText.ratio, `文字の最悪は primary=${worstText.H}°`).toBeGreaterThanOrEqual(
          g.textMin,
        );
        expect(worstMark.ratio, `マークの最悪は primary=${worstMark.H}°`).toBeGreaterThanOrEqual(
          g.markMin,
        );
      });

      it(`${where}: 系列色を配れるなら全系列が ${g.markMin}:1 以上 — 全360色相`, () => {
        let worst = { ratio: Number.POSITIVE_INFINITY, H: -1 };
        let assigned = 0;
        for (const { H, pal } of palettes) {
          const roles = surfaceRolesFor(pal, mode)[depth]!;
          if (roles.series === null) continue;
          assigned++;
          const bg = pal.neutral.byStep[surfaceStep]!;
          roles.series.forEach((step, i) => {
            const ratio = contrastBetween(pal.categorical[i]!.byStep[step]!, bg);
            if (ratio < worst.ratio) worst = { ratio, H };
          });
        }
        // 配れない面（暗色の inset）は段が足りず null になる。そこは検査対象外
        if (assigned === 0) return;
        expect(worst.ratio, `最悪は primary=${worst.H}°`).toBeGreaterThanOrEqual(g.markMin);
      });
    });

    it(`${mode}: 面が深くなるほど、文字の段は面から遠ざかる（弱くならない）`, () => {
      for (const { H, pal } of palettes) {
        const rows = surfaceRolesFor(pal, mode);
        const away = (step: number) =>
          mode === 'light' ? steps.indexOf(step) : steps.length - 1 - steps.indexOf(step);
        for (let d = 1; d < rows.length; d++) {
          expect(
            away(rows[d]!.text.faint),
            `primary=${H}° の faint が ${surfaceNames[d]} で浅くなった`,
          ).toBeGreaterThanOrEqual(away(rows[d - 1]!.text.faint));
        }
      }
    });
  }
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

describe('中性色の色相（決定5-6）', () => {
  /**
   * OKLab 上の距離。Oklch は OKLab の極座標なので、変換せずにそのまま計算できる。
   * 尺度は決定5-8（色覚特性）で使っているものと同じ。
   */
  const distance = (a: { L: number; C: number; H: number }, b: { L: number; C: number; H: number }) => {
    const xy = (c: typeof a) => [c.C * Math.cos((c.H * Math.PI) / 180), c.C * Math.sin((c.H * Math.PI) / 180)];
    const [ax, ay] = xy(a);
    const [bx, by] = xy(b);
    return Math.hypot(a.L - b.L, ax! - bx!, ay! - by!);
  };

  it('中性色は primary の色相を受け継ぐ', () => {
    for (const { H, pal } of palettes) {
      expect(pal.neutral.hue, `primary=${H}°`).toBeCloseTo(H, 6);
    }
  });

  /**
   * **この決定が無害である条件そのものを検査する。**
   *
   * 決定5-6 は当初「観測した4本の中間色がすべて純グレーではなかった」を根拠にしていたが、
   * 実測すると色相の一致まで支持していたのは1本だけだった
   * （docs/experiments/neutral-hue.md）。
   *
   * それでも決定が正しいのは、**中性色の彩度が低く、色相の選択が
   * 「グレーである」ことを変えない**ためである。
   * 彩度を上げる変更が入るとこの前提は崩れるので、構造の側を検査する。
   *
   * 閾値に識別色の minDistance を借りているのは、**上限の主張だから**である。
   * 「中性色の色相選択が生む差は、識別色として区別できる最小の差を決して上回らない」
   * = 色相が情報を担う大きさにならない、という意味。
   *
   * **「見えない」という意味ではない。** 0.08 は隣り合う面の差が見えるかの閾ではなく、
   * 実際 0.018 程度から隣接比較では見える（目視の記録は実験記録に置いた）。
   */
  it('色相の選択が識別色として区別できる大きさに届かない', () => {
    for (const { H, pal } of palettes) {
      for (const s of steps) {
        const c = pal.neutral.byStep[s]!;
        // 最も遠い選択（180° 反対）でも識別閾（決定5-5 の minDistance）未満に収まる
        const opposite = { L: c.L, C: c.C, H: (c.H + 180) % 360 };
        expect(
          distance(c, opposite),
          `primary=${H}° の中性色 段${s}（C=${c.C.toFixed(4)}）`,
        ).toBeLessThan(cfg.categorical.minDistance);
      }
    }
  });
});

describe('status は色だけでは判別できない（決定5-9）', () => {
  /*
   * これは「良い値」を検査するテストではない。**既知の限界を可視化するためのもの。**
   *
   * status 4色は色覚特性下で ΔE が 0.01 を下回り、2型色覚では
   * danger・warning・success がほぼ同一の色になる。
   * danger 25° と warning 70° は赤と黄で、色相を離せば意味が壊れる（決定5-4）。
   *
   * したがって status は**色以外の手がかり（アイコン・テキスト）を必須**とする。
   * 色の識別性を上げることは補助にしかならない（WCAG 1.4.1）。
   *
   * この値が大きく変わったら、決定5-9 の前提が変わったということなので
   * docs を更新すること。**通すために期待値を書き換えない。**
   */
  it('色覚特性下で status を色だけで判別することはできない', () => {
    let worst = Number.POSITIVE_INFINITY;
    for (const { pal } of palettes) {
      worst = Math.min(
        worst,
        minPerceptualDistance(statusNames.map((n) => pal.status[n].byStep[500]!)),
      );
    }
    // 識別色に課している 0.08 には遠く及ばない
    expect(worst).toBeLessThan(0.02);
    // 0 ではない（色は補助としては効いている）
    expect(worst).toBeGreaterThan(0);
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

describe('面の役割の追加（決定5-13）', () => {
  const g2 = tokens.color.guarantees;

  for (const mode of ['light', 'dark'] as const) {
    const surfaces = mode === 'light' ? g2.surfaces.light : g2.surfaces.dark;
    /** 面から遠ざかる向きの距離。境界の4段はこの順に並んでいなければならない */
    const away = (step: number) =>
      mode === 'light' ? steps.indexOf(step) : steps.length - 1 - steps.indexOf(step);

    it(`${mode}: 境界の4段は面から遠ざかる順に並ぶ（gridline < subtle < default < strong）`, () => {
      for (const { H, pal } of palettes) {
        surfaces.forEach((surfaceStep, depth) => {
          const r = surfaceRolesFor(pal, mode)[depth]!;
          const ladder = [r.gridline, r.border.subtle, r.border.default, r.border.strong];
          const where = `primary=${H}° / ${mode} 面${surfaceStep}`;
          expect(away(r.gridline), `${where}: gridline が面より内側`).toBeGreaterThan(
            away(surfaceStep),
          );
          for (let i = 1; i < ladder.length; i++) {
            expect(away(ladder[i]!), `${where}: 境界の段が逆転した`).toBeGreaterThan(
              away(ladder[i - 1]!),
            );
          }
        });
      }
    });
  }

  it('名前を持つ面には必ず hover の行き先がある', () => {
    for (const mode of ['light', 'dark'] as const) {
      const rows = surfaceRolesFor(palettes[0]!.pal, mode);
      for (const name of surfaceNamesAll) {
        expect(rows[depthOf(name) + 1], `${mode} / ${name} に hover の行き先が無い`).toBeDefined();
      }
    }
  });

  /**
   * **梯子が4段で止まる根拠を、文章ではなく検査で持つ。**
   *
   * 5段目を足せる状態になったら（ランプの段数を増やしたときなど）この検査が落ちる。
   * 落ちたら「もう1段置ける」という意味なので、決定5-13 を読み直すことになる。
   */
  it('梯子の5段目は成立しない（明色は text.default が割り、暗色は段が足りない）', () => {
    // **1色で測っても答えにならない。** 色相によっては 4.5 を満たしてしまう
    // （primary=314° で 4.52）。保証は全色相で成立していなければ意味がないので、
    // ここで見るのは最悪色相である（決定5-1、教訓2）
    let worst = { ratio: Number.POSITIVE_INFINITY, H: -1 };
    for (const { H, pal } of palettes) {
      const ratio = contrastBetween(pal.neutral.byStep[900]!, pal.neutral.byStep[400]!);
      if (ratio < worst.ratio) worst = { ratio, H };
    }
    expect(
      worst.ratio,
      `明色の面400 が全色相で 4.5 を満たした（最悪は primary=${worst.H}°）`,
    ).toBeLessThan(g2.textMin);

    // 暗色 面600 は default(段100) より浅い段が 50 しか無く、muted と faint を置けない。
    // こちらは色相に依らない構造の話
    expect(steps.filter((s) => s < 100).length, '暗色の面600 に文字の3段を置ける').toBeLessThan(2);
  });
});
