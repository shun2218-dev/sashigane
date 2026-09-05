/**
 * 浮きの不変条件（決定1-8、2026-08-29 改訂）。
 *
 * **決定を改訂した根拠は測定である。** その測定をここに置く。
 * 文書に数字を書いておくだけだと、規則を変えたときに数字だけが取り残される（教訓3）。
 *
 * 検査するのは主に「なぜ暗色で影を使わないか」である。
 * 影を出しても見えないこと、明度差分を足すと保証が割れることを、
 * **実際に足してみて確かめる。** 「そう書いてあるから」では再発を止められない。
 */
import { describe, expect, it } from 'vitest';
import tokens from '../src/tokens.json' with { type: 'json' };
import {
  contrastBetween,
  contrastRatio,
  depthOf,
  elevationGeometry,
  elevationHeight,
  elevationOutline,
  elevationRoles,
  generatePalette,
  hexToOklch,
  oklchToLinearRgb,
  relativeLuminance,
  shadowInkFor,
  spacing,
  statusNames,
  surfaceNames,
  surfaceRolesFor,
  toTokensCss,
  type Oklch,
} from '../src/index.ts';

const g = tokens.color.guarantees;
const y = (c: Oklch) => relativeLuminance(oklchToLinearRgb(c));

/** 全色相。特定の1色で通ることには意味がない（決定5-1） */
const palettes = Array.from({ length: 360 }, (_, H) =>
  generatePalette({ L: 0.55, C: 0.15, H }),
);
const sample = generatePalette(hexToOklch('#3b82f6'));

/**
 * 影や輪郭が落ちる相手は**名乗れる面だけ**である（page / surface / inset / overlay）。
 * 梯子の最深段は `data-sg-surface` で名乗れず、hover の行き先としてしか存在しない（決定5-13）。
 */
const namedDepths = [...new Set(surfaceNames.map(depthOf))].sort();

describe('影の幾何（決定1-8）', () => {
  it('オフセットもぼかしも h に比例する', () => {
    for (const h of [0, 1, 2, 3]) {
      const { offset, blur } = elevationGeometry(h);
      expect(offset).toBe(h * elevationGeometry(1).offset);
      expect(blur).toBe(h * elevationGeometry(1).blur);
    }
  });

  it('ぼかしはオフセットの blurRatio 倍（光源の形）', () => {
    for (const h of [1, 2, 3]) {
      const { offset, blur } = elevationGeometry(h);
      expect(blur).toBe(offset * tokens.elevation.blurRatio);
    }
  });

  it('h = 0 は影を持たない', () => {
    expect(elevationGeometry(0)).toEqual({ offset: 0, blur: 0 });
  });

  it('値は全部 spacing の段に載る（新しい長さの定数を持ち込んでいない）', () => {
    for (const h of [0, 1, 2, 3]) {
      const { offset, blur } = elevationGeometry(h);
      expect(spacing, `h=${h} のオフセット ${offset}`).toContain(offset);
      expect(spacing, `h=${h} のぼかし ${blur}`).toContain(blur);
    }
  });
});

describe('影の濃さは色システムから解く（決定1-8 改訂）', () => {
  it('合成すると、ちょうど1段深い面の相対輝度になる', () => {
    const [page, next] = g.surfaces.light;
    for (const p of palettes) {
      const { color, alpha } = shadowInkFor(p);
      const bg = y(p.neutral.byStep[page!]!);
      expect(alpha * y(color) + (1 - alpha) * bg).toBeCloseTo(
        y(p.neutral.byStep[next!]!),
        12,
      );
    }
  });

  it('影の色は純黒ではなく、中間色ランプの暗端（primary の色相を持つ）', () => {
    for (const p of palettes) {
      const { color } = shadowInkFor(p);
      expect(color).toBe(p.neutral.byStep[tokens.color.steps.at(-1)!]!);
      expect(color.C).toBeGreaterThan(0);
    }
  });

  it('高さでも面の深さでも変えないが、できる影の対比は狭い範囲に収まる', () => {
    const ratios: number[] = [];
    for (const p of palettes) {
      const { color, alpha } = shadowInkFor(p);
      for (const roles of surfaceRolesFor(p, 'light')) {
        const bg = y(p.neutral.byStep[roles.surface]!);
        ratios.push(contrastRatio(bg, alpha * y(color) + (1 - alpha) * bg));
      }
    }
    // page で解いた1つの値を全段で使っても、影の見え方は 1.28〜1.31 に収まる
    expect(Math.min(...ratios)).toBeGreaterThan(1.26);
    expect(Math.max(...ratios)).toBeLessThan(1.32);
  });
});

describe('暗色で影を使わない理由を、実際に試して確かめる', () => {
  it('影という手段が機能しない（純黒・不透明でも 2:1 に届かない）', () => {
    for (const p of palettes) {
      for (const d of namedDepths) {
        const bg = y(p.neutral.byStep[surfaceRolesFor(p, 'dark')[d]!.surface]!);
        expect(contrastRatio(bg, 0)).toBeLessThan(2);
      }
    }
    // 対照。同じ計算が明色では大きな値を返す（検査が動いていることの確認。教訓2）
    for (const d of namedDepths) {
      const bg = y(sample.neutral.byStep[surfaceRolesFor(sample, 'light')[d]!.surface]!);
      expect(contrastRatio(bg, 0)).toBeGreaterThan(10);
    }
  });

  it('明度差分も持てない（最悪の色相では、面1段分の 1/100 も持ち上げられない）', () => {
    /**
     * 面を持ち上げられる余地を色相ごとに二分探索する。
     *
     * **最悪の色相で判定する。** 余地のある色相もあるが、elevation は利用者が選んだ
     * どの色でも成立しなければならない（決定5-1）。1つでも割る色相があれば、
     * 明度差分は elevation の手段として採れない。
     */
    let worstHeadroom = Infinity;
    let smallestLadder = Infinity;
    for (const p of palettes) {
      const roles = surfaceRolesFor(p, 'dark');
      const colored = [p.primary, ...statusNames.map((n) => p.status[n]!)];
      for (const d of namedDepths) {
        const here = p.neutral.byStep[roles[d]!.surface]!;
        smallestLadder = Math.min(
          smallestLadder,
          p.neutral.byStep[roles[d + 1]!.surface]!.L - here.L,
        );
        const checks: [Oklch, number][] = [
          [p.neutral.byStep[roles[d]!.text.muted]!, g.textMin],
          [p.neutral.byStep[roles[d]!.text.faint]!, g.textMin],
          ...colored.map((r) => [r.byStep[roles[d]!.colorText]!, g.textMin] as [Oklch, number]),
          ...colored.map((r) => [r.byStep[roles[d]!.colorMark]!, g.markMin] as [Oklch, number]),
        ];
        const ok = (delta: number) =>
          checks.every(([fg, min]) => contrastBetween(fg, { ...here, L: here.L + delta }) >= min);

        // 持ち上げる前は全部満たしている（検査が動いていることの確認。教訓2）
        expect(ok(0)).toBe(true);
        let lo = 0;
        let hi = 0.1;
        for (let i = 0; i < 24; i++) {
          const mid = (lo + hi) / 2;
          if (ok(mid)) lo = mid;
          else hi = mid;
        }
        worstHeadroom = Math.min(worstHeadroom, lo);
      }
    }
    expect(smallestLadder).toBeGreaterThan(0.06);
    expect(worstHeadroom).toBeLessThan(smallestLadder / 100);
  });
});

describe('暗色の輪郭（決定1-8 改訂）', () => {
  it('下地に対して見え、h の順に強くなる', () => {
    for (const p of palettes) {
      for (const roles of surfaceRolesFor(p, 'dark')) {
        const bg = p.neutral.byStep[roles.surface]!;
        const ratios = elevationRoles.map((r) =>
          contrastBetween(p.neutral.byStep[roles.border[elevationOutline(r)]]!, bg),
        );
        for (const r of ratios) expect(r).toBeGreaterThan(1.3);
        for (let i = 1; i < ratios.length; i++) {
          expect(ratios[i]!).toBeGreaterThan(ratios[i - 1]!);
        }
      }
    }
  });
});

describe('出力の形', () => {
  it('段はすべて役割として出る。高さの数字は CSS に出ない', () => {
    expect(elevationRoles).toEqual(['raised', 'overlay', 'front']);
    expect(elevationRoles.map(elevationHeight)).toEqual([1, 2, 3]);

    const css = toTokensCss(sample);
    for (const h of [0, 1, 2, 3]) {
      expect(css, `--sg-elevation-${h}`).not.toContain(`--sg-elevation-${h}:`);
    }
    /**
     * **h=0 だけは役割を持たない。** 影を書かなければ平坦なので、
     * 「何も無いことを表す変数」を出す意味が無い（`--sg-space-0: 0` とは違い、
     * box-shadow には `none` という語がある）。
     */
    expect(css).not.toContain('--sg-elevation-flat');
  });

  it('明色は影、暗色は輪郭。同じ名前で媒体が入れ替わる', () => {
    const css = toTokensCss(sample);
    const { offset, blur } = elevationGeometry(elevationHeight('raised'));
    expect(css).toContain(
      `--sg-elevation-raised: 0 ${offset}px ${blur}px var(--sg-shadow-ink);`,
    );
    expect(css).toMatch(
      /--sg-elevation-raised: 0 0 0 var\(--sg-border-width-0\) var\(--sg-neutral-\d+\);/,
    );
  });

  it('影の色は透過を持つ唯一のプリミティブである', () => {
    const css = toTokensCss(sample);
    const alpha = [...css.matchAll(/--sg-([a-z0-9-]+): oklch\([^)]* \/ [\d.]+\)/g)].map(
      (m) => m[1]!,
    );
    expect([...new Set(alpha)]).toEqual(['shadow-ink']);
  });
});
