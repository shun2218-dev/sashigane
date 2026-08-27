/**
 * 書体の不変条件（決定1-11）。
 *
 * この次元だけは値を導出できない。したがって検査できるのは**値ではなく構造**である。
 *   - 役割がサイズ・行高・書体を欠かさず持つこと
 *   - 差し込み口が必ずフォールバックを伴うこと（欠けると宣言ごと無効になる。教訓4）
 *   - 欧文 → 和文 → generic の順序
 *   - display の既定が body の口に落ちること
 *
 * **実ブラウザでの解決は別途目視する**（記録は PR）。静的検査では
 * 「差した書体が実際に当たる」ことは証明できない。
 */
import { describe, expect, it } from 'vitest';
import {
  FONT_ROLES,
  TEXT_ROLES,
  fontInputName,
  fontSlots,
  fontStack,
  fontStackNames,
  fontStackVars,
  fontSize,
  generatePalette,
  letterSpacing,
  letterSpacingCaps,
  letterSpacingCoefficient,
  root,
  tokenLayers,
  typographySemanticVars,
} from '../src/index.ts';

const semantics = typographySemanticVars();
const declared = (lines: string[]) =>
  lines.flatMap((l) => /^\s*(--sg-[a-z0-9-]+)\s*:/.exec(l)?.[1] ?? []);
const names = new Set(declared(semantics));

/** 括弧の外にあるカンマで分ける。入れ子の var() を割らない */
const topLevelParts = (value: string): string[] => {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth += 1;
    else if (value[i] === ')') depth -= 1;
    else if (value[i] === ',' && depth === 0) {
      out.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(value.slice(start).trim());
  return out;
};

describe('書体スタックの構造', () => {
  it('欧文 → 和文 → generic の順に並び、generic で終わる', () => {
    for (const stack of fontStackNames) {
      const parts = topLevelParts(fontStack(stack));
      // 口の数 + generic
      expect(parts, stack).toHaveLength(fontSlots.length + 1);
      fontSlots.forEach((slot, i) => {
        expect(parts[i], `${stack}.${slot}`).toContain(fontInputName(stack, slot));
      });
      expect(parts.at(-1), stack).toMatch(/^[a-z-]+$/);
    }
  });

  it('すべての var() がフォールバックを伴う（欠けると font-family 宣言ごと無効になる）', () => {
    for (const stack of fontStackNames) {
      for (const m of fontStack(stack).matchAll(/var\(\s*(--sg-[a-z0-9-]+)\s*([,)])/g)) {
        expect(m[2], `${stack} の ${m[1]}`).toBe(',');
      }
    }
  });

  it('display の既定は body の口へ落ちる（本文だけ差した見出しが system 書体に残らない）', () => {
    const display = fontStack('display');
    for (const slot of fontSlots) {
      expect(display).toContain(fontInputName('display', slot));
      expect(display).toContain(fontInputName('body', slot));
    }
  });

  it('差し込み口は宣言しない（宣言するとフォールバックが効かない）', () => {
    const declaredInPrimitives = new Set(declared(fontStackVars()));
    for (const stack of fontStackNames) {
      for (const slot of fontSlots) {
        expect(declaredInPrimitives).not.toContain(fontInputName(stack, slot));
      }
    }
  });
});

describe('タイポグラフィの役割', () => {
  it('サイズ役割はサイズ・行高・字間・書体の4点を欠かさない', () => {
    for (const r of TEXT_ROLES) {
      expect(names, r.name).toContain(`--sg-text-${r.name}`);
      expect(names, r.name).toContain(`--sg-text-${r.name}-leading`);
      expect(names, r.name).toContain(`--sg-text-${r.name}-tracking`);
      expect(names, r.name).toContain(`--sg-text-${r.name}-family`);
    }
  });

  it('書体だけの役割は段を持たない（サイズと直交する印）', () => {
    for (const r of FONT_ROLES) {
      expect(names, r.name).toContain(`--sg-text-${r.name}-family`);
      expect(names, r.name).not.toContain(`--sg-text-${r.name}`);
      expect(names, r.name).not.toContain(`--sg-text-${r.name}-leading`);
      expect(names, r.name).not.toContain(`--sg-text-${r.name}-tracking`);
    }
  });

  it('numeric は等幅数字の指定を必ず伴う（書体だけ当てても桁は揃わない）', () => {
    for (const r of FONT_ROLES.filter((x) => x.tabular)) {
      expect(names).toContain(`--sg-text-${r.name}-variant`);
    }
  });

  it('セマンティックはスタックを参照し、スタックはプリミティブである', () => {
    const layers = tokenLayers(generatePalette({ L: 0.6, C: 0.1, H: 220 }));
    for (const line of semantics.filter((l) => l.includes('-family:'))) {
      const ref = /var\((--sg-font-stack-[a-z]+)\)/.exec(line);
      expect(ref, line).not.toBeNull();
      expect(layers.primitives).toContain(ref![1]);
      expect(layers.semantics).not.toContain(ref![1]);
    }
  });
});

/**
 * letter-spacing（決定1-9）。行高と同じくサイズからの従属値である。
 *
 * **`coefficient` は root から導けない**（原則2 の4つ目の例外）ので、
 * 値そのものではなく**規則が満たすべき性質**を検査する。
 */
describe('letter-spacing（決定1-9）', () => {
  it('本文サイズ（root）でちょうど 0 になる', () => {
    expect(letterSpacing(root)).toBe(0);
  });

  it('サイズが大きいほど小さくなる（単調。等しい段が無い）', () => {
    const values = fontSize.map((v) => letterSpacing(v));
    for (let i = 1; i < values.length; i++) {
      expect(values[i]!, `段${i}`).toBeLessThan(values[i - 1]!);
    }
  });

  it('本文より小さい段は正、大きい段は負', () => {
    for (const size of fontSize) {
      const v = letterSpacing(size);
      if (size < root) expect(v, `${size}px`).toBeGreaterThan(0);
      if (size > root) expect(v, `${size}px`).toBeLessThan(0);
    }
  });

  /**
   * 漸近線は −coefficient である。**どの段もそこには届かない。**
   * 届いてしまうなら、それは 1/size の形が壊れているということになる。
   */
  it('詰めは漸近線（−coefficient）を超えない', () => {
    for (const size of fontSize) {
      expect(letterSpacing(size), `${size}px`).toBeGreaterThan(-letterSpacingCoefficient);
    }
  });

  it('大文字化の加算項は段を持たず、1つだけ出る', () => {
    expect([...names].filter((n) => n.startsWith('--sg-tracking-'))).toEqual([
      '--sg-tracking-caps',
    ]);
    expect(letterSpacingCaps).toBeGreaterThan(0);
  });
});
