/**
 * 層の名前表の不変条件。
 *
 * この表は `scripts/check-token-usage.mjs` が「参照してよい名前の集合」として読む。
 * **表が壊れると lint は静かに緩む**（教訓4）。プリミティブが表から漏れれば
 * その参照は素通りし、セマンティックが漏れれば正しいコードが落ちる。
 *
 * 経緯: 当初は正規表現で層を判別する決定だったが、実際の出力に当てると
 * 両方向に破れていた（docs/agent-failures.md、決定2-3 の改訂）。
 * その2件をここで回帰検査する。
 */
import { describe, expect, it } from 'vitest';
import {
  colorSemanticVars,
  fontInputNames,
  generatePalette,
  toTokensCss,
  tokenLayers,
  tokenValues,
  typographySemanticVars,
  densityLevels,
  spaceRoles,
  spacingSemanticVars,
} from '../src/index.ts';

const palette = generatePalette({ L: 0.6, C: 0.1, H: 220 });
const layers = tokenLayers(palette);

describe('層の名前表', () => {
  it('両層とも空ではない', () => {
    expect(layers.primitives.length).toBeGreaterThan(0);
    expect(layers.semantics.length).toBeGreaterThan(0);
  });

  it('プリミティブとセマンティックは互いに素である', () => {
    const semantics = new Set(layers.semantics);
    expect(layers.primitives.filter((n) => semantics.has(n))).toEqual([]);
  });

  it('表は tokens.css が宣言する変数を1つ残らず覆う', () => {
    /*
     * **生成した CSS そのものから取る。** 各 *Vars() の呼び出しを数え上げる形だと、
     * tokens.css が別経路で足した宣言（決定5-13 の hover の控えなど）を数え落とす。
     * 数え落としても両辺が同じだけ減るので、**検査は緑のまま通ってしまう**（教訓2）。
     */
    const declared = new Set(
      [...toTokensCss(palette).matchAll(/^\s*(--sg-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]!),
    );
    const table = new Set([...layers.primitives, ...layers.semantics, ...layers.internals]);
    expect([...declared].filter((n) => !table.has(n)), '表に無い宣言').toEqual([]);
    expect([...table].filter((n) => !declared.has(n)), '宣言が無い表の名前').toEqual([]);
  });

  it('内部の値は空ではなく、他のどの層とも互いに素である（決定5-13）', () => {
    const semantics = new Set(layers.semantics);
    const primitives = new Set(layers.primitives);
    const inputs = new Set(layers.inputs);
    expect(layers.internals.length).toBeGreaterThan(0);
    expect(layers.internals.filter((n) => semantics.has(n)), 'セマンティックと重複').toEqual([]);
    expect(layers.internals.filter((n) => primitives.has(n)), 'プリミティブと重複').toEqual([]);
    expect(layers.internals.filter((n) => inputs.has(n)), '差し込み口と重複').toEqual([]);
  });

  it('内部の値は tokens.js にも tokens.d.ts にも出ない（決定5-13）', () => {
    const internals = new Set(layers.internals);
    for (const theme of ['light', 'dark'] as const) {
      expect(Object.keys(tokenValues(palette)[theme]).filter((n) => internals.has(n))).toEqual([]);
    }
  });

  it('セマンティックの名前は light と dark で同一である（値だけが切り替わる）', () => {
    const names = (mode: 'light' | 'dark') =>
      colorSemanticVars(mode, palette)
        .flatMap((l) => /^\s*(--sg-[a-z0-9-]+)\s*:/.exec(l) ?? [])
        .slice(1);

    expect(names('dark')).toEqual(names('light'));
  });

  it('重複した名前を含まない', () => {
    for (const list of [layers.primitives, layers.semantics]) {
      expect(new Set(list).size).toBe(list.length);
    }
  });

  /* ---------- 決定2-3 の正規表現が破れた2件の回帰検査 ---------- */

  it('数字で終わるセマンティックがプリミティブ扱いされない', () => {
    for (const name of [
      '--sg-text-heading-1',
      '--sg-text-heading-2',
      '--sg-text-heading-3',
      '--sg-color-chart-1',
    ]) {
      expect(layers.semantics).toContain(name);
      expect(layers.primitives).not.toContain(name);
    }
  });

  it('単語で終わるプリミティブがセマンティック扱いされない', () => {
    expect(layers.primitives).toContain('--sg-radius-full');
    expect(layers.semantics).not.toContain('--sg-radius-full');
  });

  /* ---------- 第3の種別: 差し込み口（決定2-7） ---------- */

  describe('差し込み口', () => {
    it('空ではなく、他の2層と互いに素である', () => {
      expect(layers.inputs.length).toBeGreaterThan(0);
      const others = new Set([...layers.primitives, ...layers.semantics]);
      expect(layers.inputs.filter((n) => others.has(n))).toEqual([]);
    });

    it('生成器が知っている口と過不足なく一致する', () => {
      expect(layers.inputs).toEqual([...fontInputNames()].sort());
    });

    it('tokens.css に宣言が無く、かつ参照はされている', () => {
      const css = toTokensCss(palette);
      for (const name of layers.inputs) {
        // 宣言すると var() のフォールバックが効かず、差していない口が空で解決される
        expect(new RegExp(`^\\s*${name}\\s*:`, 'm').test(css), name).toBe(false);
        expect(css, name).toContain(`var(${name},`);
      }
    });
  });
});

describe('骨格の余白の名前（決定1-12）', () => {
  it('名前表のセマンティックに入っている', () => {
    // 足し忘れると、定義した役割を参照した時点で lint に unknown で弾かれる。
    // 実際に一度そうなった（唯一の利用箇所が検査対象外だったので緑のままだった）
    for (const role of spaceRoles) {
      expect(layers.semantics, role).toContain(`--sg-space-${role}`);
    }
  });

  it('密度が変わっても名前は変わらない（値だけが切り替わる）', () => {
    const names = (level: (typeof densityLevels)[number]) =>
      spacingSemanticVars(level).map((l) => l.split(':')[0]!.trim());
    for (const level of densityLevels) {
      expect(names(level), level).toEqual(names('default'));
    }
  });

  it('プリミティブの段とは別の名前である', () => {
    for (const role of spaceRoles) {
      expect(layers.primitives).not.toContain(`--sg-space-${role}`);
    }
  });
});
