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
  colorPrimitiveVars,
  colorSemanticVars,
  generatePalette,
  primitiveVars,
  tokenLayers,
  typographySemanticVars,
} from '../src/index.ts';

const palette = generatePalette({ L: 0.6, C: 0.1, H: 220 });
const layers = tokenLayers(palette);

/** 生成した CSS 行から宣言名を数える。layers.ts の実装とは独立に書く */
const countDeclarations = (lines: string[]) =>
  lines.filter((l) => /^\s*--sg-[a-z0-9-]+\s*:/.test(l)).length;

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
    const declared =
      countDeclarations(primitiveVars()) +
      countDeclarations(colorPrimitiveVars(palette)) +
      countDeclarations(typographySemanticVars()) +
      countDeclarations(colorSemanticVars('light', palette));

    expect(layers.primitives.length + layers.semantics.length).toBe(declared);
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
});
