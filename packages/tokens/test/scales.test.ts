/**
 * スケールの不変条件。
 *
 * ここに書く期待値は「規則から導いた値」ではなく「規則が正しいことの証人」である。
 * テストを通すために期待値を書き換えるのは、規則の誤りを隠すことに等しい。
 * 値を変えるときは docs/decisions.md を先に更新すること。
 *
 * 経緯: spacing の生成規則を2度、言葉としては筋が通るが実際には違う値を生成する形で書いた。
 * docs/agent-failures.md の 2026-08-23 の記録を参照。
 */
import { describe, expect, it } from 'vitest';
import {
  base,
  borderWidth,
  durationLoop,
  durationTransition,
  elevation,
  fontSize,
  fontSizeAnchor,
  leadingFamilies,
  lineHeight,
  radius,
  radiusFull,
  root,
  spacing,
} from '../src/index.ts';

/** 浮動小数の比較。比率の検証には十分に厳しい値を使う */
const EPS = 1e-9;

describe('根本定数', () => {
  it('root は 16px', () => {
    expect(root).toBe(16);
  });

  it('spacing.base は root ÷ 4', () => {
    expect(base).toBe(root / 4);
    expect(base).toBe(4);
  });
});

describe('spacing（決定1-2）', () => {
  it('docs/decisions.md に記載した値と一致する', () => {
    expect(spacing).toEqual([0, 4, 8, 12, 16, 24, 32, 48, 64, 96]);
  });

  it('base×2 以降の隣接比が 3/2 と 4/3 を交互に取る', () => {
    const tail = spacing.slice(2);
    for (let i = 1; i < tail.length; i++) {
      const wanted = i % 2 === 1 ? 3 / 2 : 4 / 3;
      expect(tail[i]! / tail[i - 1]!).toBeCloseTo(wanted, 12);
    }
  });

  it('2段ごとに正確に倍になる', () => {
    for (let i = 4; i < spacing.length; i += 2) {
      expect(spacing[i]! / spacing[i - 2]!).toBeCloseTo(2, 12);
    }
  });

  it('意図的に除外した 20 / 40 を含まない', () => {
    expect(spacing).not.toContain(20);
    expect(spacing).not.toContain(40);
  });
});

describe('radius（決定1-5）', () => {
  it('spacing の 0〜16 の部分集合である', () => {
    expect(radius).toEqual([0, 4, 8, 12, 16]);
    expect(radius.every((v) => spacing.includes(v))).toBe(true);
  });

  it('減算について閉じている（内側 = 外側 − padding が成立する）', () => {
    for (const outer of radius) {
      for (const pad of spacing) {
        if (pad > 0 && outer - pad >= 0) {
          expect(radius, `${outer} − ${pad} が radius に無い`).toContain(outer - pad);
        }
      }
    }
  });

  it('full は段ではなく別カテゴリとして持つ', () => {
    expect(radius).not.toContain(radiusFull);
  });
});

describe('font-size（決定1-3）', () => {
  it('11段あり、アンカーが root', () => {
    expect(fontSize).toHaveLength(11);
    expect(fontSize[fontSizeAnchor]).toBe(root);
  });

  it('隣接比がアンカーを境に厳密に 9/8 と 5/4 を取る', () => {
    for (let i = 1; i < fontSize.length; i++) {
      const wanted = i <= fontSizeAnchor ? 9 / 8 : 5 / 4;
      expect(Math.abs(fontSize[i]! / fontSize[i - 1]! - wanted)).toBeLessThan(EPS);
    }
  });

  it('丸めていない（決定1-3: 丸めた瞬間に導出値でなくなる）', () => {
    expect(fontSize[0]).toBeCloseTo(11.2373, 4);
    expect(fontSize[10]).toBeCloseTo(76.2939, 4);
  });

  it('単調増加する', () => {
    for (let i = 1; i < fontSize.length; i++) {
      expect(fontSize[i]!).toBeGreaterThan(fontSize[i - 1]!);
    }
  });
});

describe('line-height（決定1-4）', () => {
  it('系統は display / ui / prose の3つで、漸近線だけが異なる', () => {
    expect(Object.keys(leadingFamilies).sort()).toEqual(['display', 'prose', 'ui']);
    expect(leadingFamilies).toEqual({ display: 0.8, ui: 1.0, prose: 1.2 });
  });

  it('本文 16px が ui 系統で 1.5 になる', () => {
    expect(lineHeight(root, 'ui')).toBe(1.5);
  });

  it('全段で単調減少する', () => {
    for (const family of ['display', 'ui', 'prose'] as const) {
      for (let i = 1; i < fontSize.length; i++) {
        expect(lineHeight(fontSize[i]!, family)).toBeLessThan(
          lineHeight(fontSize[i - 1]!, family),
        );
      }
    }
  });

  it('display 系統は 1.0 未満を生成できる（当初の式の欠陥がなおっている）', () => {
    expect(lineHeight(fontSize[10]!, 'display')).toBeLessThan(1.0);
  });

  it('系統間の差は漸近線の差に等しい（係数が共通である証明）', () => {
    for (const size of fontSize) {
      expect(lineHeight(size, 'prose') - lineHeight(size, 'ui')).toBeCloseTo(0.2, 12);
      expect(lineHeight(size, 'ui') - lineHeight(size, 'display')).toBeCloseTo(0.2, 12);
    }
  });
});

describe('duration（決定1-6）', () => {
  it('遷移スケールが記載した値と一致する', () => {
    expect(durationTransition.map((v) => +v.toFixed(1))).toEqual([100, 141.4, 200, 282.8, 400]);
  });

  it('ループスケールが記載した値と一致する', () => {
    expect(durationLoop.map((v) => +v.toFixed(1))).toEqual([707.1, 1000, 1414.2]);
  });

  it('どちらも2段で正確に倍になる', () => {
    for (const scale of [durationTransition, durationLoop]) {
      for (let i = 2; i < scale.length; i++) {
        expect(scale[i]! / scale[i - 2]!).toBeCloseTo(2, 12);
      }
    }
  });

  it('遷移スケールは知覚上の有効域（100〜400ms）に収まる', () => {
    expect(Math.min(...durationTransition)).toBeGreaterThanOrEqual(100);
    expect(Math.max(...durationTransition)).toBeLessThanOrEqual(400);
  });

  it('ループスケールは遷移スケールと重ならない', () => {
    expect(Math.min(...durationLoop)).toBeGreaterThan(Math.max(...durationTransition));
  });
});

describe('border-width / elevation', () => {
  it('border-width は 1 / 2 / 3', () => {
    expect(borderWidth).toEqual([1, 2, 3]);
  });

  it('elevation は h = 0〜3', () => {
    expect(elevation).toEqual([0, 1, 2, 3]);
  });
});
