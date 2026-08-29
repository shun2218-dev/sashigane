/**
 * 塗りの状態変化（決定5-15）と、不透明度を持たないこと（決定1-15）の不変条件。
 *
 * **退けた案のほうを測る。** 「不透明度で薄めると保証が割れる」は決定の根拠そのものなので、
 * 実際に薄めて割れることを確かめる。割れなくなったら決定の前提が変わっている。
 */
import { describe, expect, it } from 'vitest';
import tokens from '../src/tokens.json' with { type: 'json' };
import {
  contrastBetween,
  contrastRatio,
  depthOf,
  generatePalette,
  hexToOklch,
  oklchToLinearRgb,
  relativeLuminance,
  fillRampNames,
  statusNames,
  steps,
  surfaceNames,
  surfaceRolesFor,
  toTokensCss,
  type Oklch,
} from '../src/index.ts';

const g = tokens.color.guarantees;
const y = (c: Oklch) => relativeLuminance(oklchToLinearRgb(c));
const palettes = Array.from({ length: 360 }, (_, H) =>
  generatePalette({ L: 0.55, C: 0.15, H }),
);
const sample = generatePalette(hexToOklch('#3b82f6'));
const namedDepths = [...new Set(surfaceNames.map(depthOf))].sort();

/** 要素に opacity をかけると、前景も背景も同じ率で下地へ寄る */
const faded = (fg: number, bg: number, alpha: number) => alpha * fg + (1 - alpha) * bg;

describe('塗りの1段強い段（決定5-15）', () => {
  it('塗りの上の文字は、通常の塗りより余裕が増える', () => {
    for (const mode of ['light', 'dark'] as const) {
      for (const p of palettes) {
        for (const d of namedDepths) {
          const r = surfaceRolesFor(p, mode)[d]!;
          for (const [name, ramp] of [
            ['accent', p.primary],
            ...statusNames.map((n) => [n, p.status[n]!] as const),
          ] as const) {
            const on = p.neutral.byStep[r.onFill[name]]!;
            const normal = contrastBetween(on, ramp.byStep[r.colorText]!);
            const strong = contrastBetween(on, ramp.byStep[r.colorStrong]!);
            expect(normal).toBeGreaterThanOrEqual(g.textMin);
            expect(strong, `${mode} depth${d} ${name}`).toBeGreaterThan(normal);
          }
        }
      }
    }
  });

  it('塗り自体も、面に対して通常より強くなる', () => {
    for (const mode of ['light', 'dark'] as const) {
      for (const p of palettes) {
        for (const d of namedDepths) {
          const r = surfaceRolesFor(p, mode)[d]!;
          const bg = p.neutral.byStep[r.surface]!;
          expect(
            contrastBetween(p.primary.byStep[r.colorStrong]!, bg),
          ).toBeGreaterThan(contrastBetween(p.primary.byStep[r.colorText]!, bg));
        }
      }
    }
  });

  it('名前を持つ面では、1段動かす先が必ず存在する', () => {
    for (const mode of ['light', 'dark'] as const) {
      for (const p of palettes) {
        for (const d of namedDepths) {
          const r = surfaceRolesFor(p, mode)[d]!;
          expect(r.colorStrong, `${mode} depth${d}`).not.toBe(r.colorText);
        }
      }
    }
  });

  it('塗りを持つランプすべてに出る（規則が同一のランプ間で非対称を作らない）', () => {
    const css = toTokensCss(sample);
    for (const r of fillRampNames) {
      expect(css, `--sg-color-${r}-strong`).toContain(`--sg-color-${r}-strong:`);
      // 塗りの上の文字も同じ一覧に沿って出ている（決定5-14）
      expect(css, `--sg-color-on-${r}`).toContain(`--sg-color-on-${r}:`);
    }
    // 中間色は面であって塗りではないので出ない
    expect(css).not.toContain('--sg-color-neutral-strong:');
  });
});

describe('淡い塗り（決定5-16）', () => {
  it('その色自身が、自分の淡い塗りの上で 4.5:1 を満たす', () => {
    for (const mode of ['light', 'dark'] as const) {
      for (const p of palettes) {
        for (const d of namedDepths) {
          const r = surfaceRolesFor(p, mode)[d]!;
          for (const ramp of [p.primary, ...statusNames.map((n) => p.status[n]!)]) {
            const fill = ramp.byStep[r.colorSubtle]!;
            expect(
              contrastBetween(ramp.byStep[r.onSubtle]!, fill),
              `${mode} depth${d}`,
            ).toBeGreaterThanOrEqual(g.textMin);
          }
        }
      }
    }
  });

  it('解き直さないと割る（観測どおりの「淡い塗り＋その色の文字」は成立しない）', () => {
    /**
     * **退けた案のほうを測る。** `--sg-color-{名前}` をそのまま淡い塗りに載せると
     * どうなるかを確かめる。割らなくなったら、段を解き直す理由が消えている。
     */
    let worst = Infinity;
    for (const p of palettes) {
      const r = surfaceRolesFor(p, 'light')[0]!;
      for (const ramp of [p.primary, ...statusNames.map((n) => p.status[n]!)]) {
        worst = Math.min(
          worst,
          contrastBetween(ramp.byStep[r.colorText]!, ramp.byStep[r.colorSubtle]!),
        );
      }
    }
    expect(worst).toBeLessThan(g.textMin);
  });

  it('中間色は text-default だけが載る（muted と faint は割る）', () => {
    let worstDefault = Infinity;
    let worstMuted = Infinity;
    for (const mode of ['light', 'dark'] as const) {
      for (const p of palettes) {
        for (const d of namedDepths) {
          const r = surfaceRolesFor(p, mode)[d]!;
          for (const ramp of [p.primary, ...statusNames.map((n) => p.status[n]!)]) {
            const fill = ramp.byStep[r.colorSubtle]!;
            worstDefault = Math.min(
              worstDefault,
              contrastBetween(p.neutral.byStep[r.text.default]!, fill),
            );
            worstMuted = Math.min(
              worstMuted,
              contrastBetween(p.neutral.byStep[r.text.muted]!, fill),
            );
          }
        }
      }
    }
    expect(worstDefault).toBeGreaterThanOrEqual(g.textMin);
    // **申告した制約そのもの。** 載せられるようになったら決定を見直す
    expect(worstMuted).toBeLessThan(g.textMin);
  });

  it('淡い塗りは面のすぐ外側の段。深い面では一緒に動く', () => {
    for (const mode of ['light', 'dark'] as const) {
      const order = mode === 'light' ? [...steps] : [...steps].reverse();
      const seen = new Set<number>();
      for (const d of namedDepths) {
        const r = surfaceRolesFor(sample, mode)[d]!;
        // **一致ではなく規則を検査する。** gridline と同じ値になるのは
        // 同じ式から来ているからで、値を突き合わせても原因は固定できない
        expect(r.colorSubtle).toBe(order[order.indexOf(r.surface) + 1]);
        seen.add(r.colorSubtle);
      }
      // 面ごとに違う段を指す（page と surface で同じ段になっていない）
      expect(seen.size).toBe(namedDepths.length);
    }
  });

  it('塗りを持つランプすべてに出る', () => {
    const css = toTokensCss(sample);
    for (const r of fillRampNames) {
      expect(css, `--sg-color-${r}-subtle`).toContain(`--sg-color-${r}-subtle:`);
      expect(css, `--sg-color-on-${r}-subtle`).toContain(`--sg-color-on-${r}-subtle:`);
    }
    expect(css).not.toContain('--sg-color-neutral-subtle:');
  });
});

describe('不透明度で薄めると保証が割れる（決定1-15 の根拠）', () => {
  it('塗りに opacity をかけると、塗りの上の文字が 4.5:1 を割る', () => {
    // サンプルページが実際に書いていた値。**最悪の色相で判定する**（決定5-1）
    const WAS = 0.88;
    const worstAt = (alpha: number) => {
      let worst = Infinity;
      for (const p of palettes) {
        const r = surfaceRolesFor(p, 'light')[0]!;
        const page = y(p.neutral.byStep[r.surface]!);
        for (const [name, ramp] of [
          ['accent', p.primary],
          ...statusNames.map((n) => [n, p.status[n]!] as const),
        ] as const) {
          const fill = y(ramp.byStep[r.colorText]!);
          const on = y(p.neutral.byStep[r.onFill[name as 'accent']]!);
          worst = Math.min(
            worst,
            contrastRatio(faded(fill, page, alpha), faded(on, page, alpha)),
          );
        }
      }
      return worst;
    };
    expect(worstAt(WAS)).toBeLessThan(g.textMin);
    // 薄めなければ満たしている（検査が動いていることの確認。教訓2）
    expect(worstAt(1)).toBeGreaterThanOrEqual(g.textMin);
  });

  it('薄められる幅はゼロである（どの役割も割らない α は 1.000）', () => {
    /**
     * 役割ごとに「これ以上薄めると要件を割る」下限の α を二分探索し、
     * **全色相・全モードでの最大**を取る。それがこのシステムで安全に使える唯一の α である。
     *
     * 決定5-2 が端点をちょうど 4.500 に解いているので、`accent` は最悪の色相で
     * 余裕がゼロになる。**1% も薄められない。**
     */
    let need = 0;
    for (const mode of ['light', 'dark'] as const) {
      for (const p of palettes) {
        const r = surfaceRolesFor(p, mode)[0]!;
        const bg = y(p.neutral.byStep[r.surface]!);
        const checks: [Oklch, number][] = [
          [p.neutral.byStep[r.text.muted]!, g.textMin],
          [p.neutral.byStep[r.text.faint]!, g.textMin],
          [p.primary.byStep[r.colorText]!, g.textMin],
          [p.primary.byStep[r.colorMark]!, g.markMin],
          ...statusNames.map(
            (n) => [p.status[n]!.byStep[r.colorText]!, g.textMin] as [Oklch, number],
          ),
        ];
        for (const [fg, min] of checks) {
          let lo = 0;
          let hi = 1;
          for (let i = 0; i < 30; i++) {
            const m = (lo + hi) / 2;
            if (contrastRatio(faded(y(fg), bg, m), bg) >= min) hi = m;
            else lo = m;
          }
          need = Math.max(need, hi);
        }
      }
    }
    expect(need).toBeGreaterThan(0.999);
  });

  it('トークン層に中間の不透明度が1つも無い', () => {
    const css = toTokensCss(sample);
    const found = [...css.matchAll(/opacity:\s*([\d.]+)/g)].map((m) => m[1]!);
    // 0 と 1 は「見えない / 見える」であって薄めではない
    expect(found.filter((v) => v !== '0' && v !== '1')).toEqual([]);
  });

  it('骨組みの明滅は色で解いている（決定1-14 改訂）', () => {
    const css = toTokensCss(sample);
    expect(css).toContain('@keyframes skeleton {');
    expect(css).toContain('50% { background-color: var(--sg-color-deeper-bg); }');
    // 0% / 100% を書かない。書くと面の色を変数として出す必要が生まれる（決定5-12 改訂）
    expect(css).not.toContain('0%, 100% {');
  });
});
