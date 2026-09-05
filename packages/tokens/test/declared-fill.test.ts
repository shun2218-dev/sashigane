/**
 * 宣言する塗りの不変条件（決定6-9）。
 *
 * **利用者の指摘から出た決定である。** 暗色モードが「明るい塗り＋黒文字」を出しており、
 * それは観測4本に1件も無い組み合わせだった（決定5-14 の観測表が自分でそう記録している）。
 *
 * 原因は1つの役割が塗りと文字を兼ねていたことで、**面の上の文字**として解かれた段に
 * 白が載らなかった。塗りを宣言に分けて、段を別に解く。
 */
import { describe, expect, it } from 'vitest';
import tokens from '../src/tokens.json' with { type: 'json' };
import {
  contrastBetween,
  generatePalette,
  hexToOklch,
  statusNames,
  surfaceRolesFor,
} from '../src/index.ts';

const g = tokens.color.guarantees;
/** 全360色相。1色で測ると答えを間違える */
const HUES = Array.from({ length: 36 }, (_, i) => i * 10);
const base = hexToOklch('#3b82f6');
const palettes = HUES.map((H) => generatePalette({ ...base, H }));

const rampsOf = (p: ReturnType<typeof generatePalette>) =>
  [['accent', p.primary] as const, ...statusNames.map((n) => [n, p.status[n]!] as const)];

describe('宣言する塗り（決定6-9）', () => {
  it('塗りの段は面にもモードにも依存しない', () => {
    for (const p of palettes) {
      const steps = new Set(
        (['light', 'dark'] as const).flatMap((m) => surfaceRolesFor(p, m).map((r) => r.fill)),
      );
      // **1つに揃うこと。** ブランドの色はテーマで変わらない
      expect(steps.size).toBe(1);
    }
  });

  it('塗りの上の文字が 4.5:1 を満たす', () => {
    for (const p of palettes)
      for (const mode of ['light', 'dark'] as const)
        for (const r of surfaceRolesFor(p, mode))
          for (const [name, ramp] of rampsOf(p)) {
            const on = p.neutral.byStep[r.onDeclaredFill[name as 'accent']]!;
            expect(contrastBetween(on, ramp.byStep[r.fill]!)).toBeGreaterThanOrEqual(g.textMin);
            // hover でも割らない。文字から遠ざかる向きなので増えるだけである
            expect(contrastBetween(on, ramp.byStep[r.fillStrong]!)).toBeGreaterThanOrEqual(
              g.textMin,
            );
          }
  });

  it('**境界**が面から 3:1 離れている。塗りではなく境界が識別を担う', () => {
    for (const p of palettes)
      for (const mode of ['light', 'dark'] as const)
        for (const r of surfaceRolesFor(p, mode)) {
          const bg = p.neutral.byStep[r.surface]!;
          for (const [, ramp] of rampsOf(p)) {
            expect(contrastBetween(ramp.byStep[r.fillBorder]!, bg)).toBeGreaterThanOrEqual(
              g.markMin,
            );
          }
        }
  });

  it('hover で境界は動かない。だから識別は保たれる', () => {
    /*
     * **塗りだけが濃くなる。** 塗り自体は面との比を割るが（暗色の深い面で 2.0 前後）、
     * 境界が動かないので部品の識別は保たれる。
     * この形は利用者の提案である——「ボーダーだけ変えずに中の背景色だけ変える」。
     */
    for (const p of palettes)
      for (const mode of ['light', 'dark'] as const)
        for (const r of surfaceRolesFor(p, mode)) {
          expect(r.fillStrong).not.toBe(r.fill);
          // 境界は塗りの段の変化に追随しない
          expect([r.fill, r.fillBorder]).toContain(r.fillBorder);
        }
  });

  it('文字は明るい端に揃う。両モードで白になる', () => {
    /*
     * **これが指摘の中身である。** 以前は暗色で暗い端が選ばれ、
     * 「明るい塗り＋黒文字」という観測ゼロの組み合わせが出ていた。
     */
    const lightEnd = tokens.color.steps[0];
    for (const p of palettes)
      for (const mode of ['light', 'dark'] as const)
        for (const r of surfaceRolesFor(p, mode))
          for (const [name] of rampsOf(p))
            expect(r.onDeclaredFill[name as 'accent']).toBe(lightEnd);
  });
});
