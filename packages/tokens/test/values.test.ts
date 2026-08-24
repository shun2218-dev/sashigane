/**
 * JS へ出す値の不変条件。
 *
 * この出力は tokens.css と同じ内容を別の形で持つ**二重管理**である。
 * ずれを検出する検査は `scripts/check-token-values.mjs` が持つ（出力どうしを突き合わせる）。
 * ここで見るのは、出力そのものが満たすべき性質。
 */
import { describe, expect, it } from 'vitest';
import { generatePalette, steps, tokenLayers, tokenValues } from '../src/index.ts';

const palette = generatePalette({ L: 0.6, C: 0.1, H: 220 });
const values = tokenValues(palette);
const layers = tokenLayers(palette);

describe('JS へ出す値', () => {
  it('鍵はセマンティックと過不足なく一致する', () => {
    for (const theme of ['light', 'dark'] as const) {
      expect(Object.keys(values[theme]).sort()).toEqual([...layers.semantics].sort());
    }
  });

  it('プリミティブは出さない（原則3）', () => {
    const primitives = new Set(layers.primitives);
    for (const theme of ['light', 'dark'] as const) {
      expect(Object.keys(values[theme]).filter((n) => primitives.has(n))).toEqual([]);
    }
  });

  it('解決済みの値であり var() が残っていない', () => {
    for (const theme of ['light', 'dark'] as const) {
      for (const [name, v] of Object.entries(values[theme])) {
        expect(v, name).not.toContain('var(');
      }
    }
  });

  it('色は16進で出す（canvas や OG 画像が oklch を解さない）', () => {
    for (const theme of ['light', 'dark'] as const) {
      for (const [name, v] of Object.entries(values[theme])) {
        if (!name.startsWith('--sg-color-')) continue;
        expect(v, name).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it('タイポグラフィは light と dark で同じ（テーマで変わるのは色だけ）', () => {
    for (const [name, v] of Object.entries(values.light)) {
      if (name.startsWith('--sg-color-')) continue;
      expect(values.dark[name], name).toBe(v);
    }
  });

  it('色は light と dark で必ず変わる（暗色ブロックが素通りしていない）', () => {
    // 連続帯の中央だけは構造的に動かない。段数が奇数で、暗色モードは
    // 同じランプを逆順にたどるだけだからである（決定5-11）。
    // **一律に sequential を除外しない。** 動かないのは中央の1本だけで、
    // 他が動かなくなったらそれは暗色ブロックの素通りである
    const fixed = `--sg-color-sequential-${Math.ceil(steps.length / 2)}`;
    const same = Object.entries(values.light).filter(
      ([name, v]) => name.startsWith('--sg-color-') && values.dark[name] === v,
    );
    expect(same.map(([n]) => n)).toEqual([fixed]);
  });
});
