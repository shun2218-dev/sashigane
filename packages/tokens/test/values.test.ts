/**
 * JS へ出す値の不変条件。
 *
 * この出力は tokens.css と同じ内容を別の形で持つ**二重管理**である。
 * ずれを検出する検査は `scripts/check-token-values.mjs` が持つ（出力どうしを突き合わせる）。
 * ここで見るのは、出力そのものが満たすべき性質。
 */
import { describe, expect, it } from 'vitest';
import {
  colorRequirements,
  colorWithoutRequirement,
  contrastBetween,
  generatePalette,
  hexToOklch,
  steps,
  tokenLayers,
  tokenValues,
} from '../src/index.ts';

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
    // 連続帯の中央だけは構造的に動かない。両モードが同じランプを逆向きに
    // たどるので、真ん中の1本だけが同じ段を指す（決定5-11）。
    // **一律に sequential を除外しない。** 動かないのは中央の1本だけで、
    // 他が動かなくなったらそれは暗色ブロックの素通りである
    const fixed = `--sg-color-sequential-${(steps.length - 1) / 2}`;
    const same = Object.entries(values.light).filter(
      ([name, v]) => name.startsWith('--sg-color-') && values.dark[name] === v,
    );
    expect(same.map(([n]) => n)).toEqual([fixed]);
  });
});

/**
 * 16進に落としても保証が成立すること（決定2-6 改訂、Issue #52）。
 *
 * 決定5-2 は端点を要件**ちょうど**まで解くので余裕がゼロである。
 * `tokens.css` は `oklch()` をそのまま出すので影響しないが、
 * `tokens.js` は16進に丸めるため、境界の段が**丸めた瞬間だけ**割ることがあった。
 */
describe('JS へ出す値の保証（決定2-6 改訂）', () => {
  /** 全色相ぶんの値を1度だけ作る。tokenValues は出力を丸ごと組むので重い */
  const all = Array.from({ length: 360 }, (_, H) => {
    const pal = generatePalette({ L: 0.6, C: 0.1, H });
    return { H, pal, values: tokenValues(pal) };
  });

  it('ページ地に対する要件を、16進のままで満たす — 全360色相', () => {
    for (const { H, pal, values: v } of all) {
      for (const mode of ['light', 'dark'] as const) {
        const bg = hexToOklch(v[mode]['--sg-color-bg-page']!);
        for (const [name, min] of colorRequirements(mode, pal)) {
          const hex = v[mode][name];
          if (hex === undefined) continue;
          expect(
            contrastBetween(hexToOklch(hex), bg),
            `${mode} / ${name} / primary=${H}°`,
          ).toBeGreaterThanOrEqual(min);
        }
      }
    }
  }, 60_000);

  /**
   * **分類漏れを捕まえる。** 要件の表に載っていない色が「要件無し」として
   * 明示されていなければ落ちる。役割を足したときに、静かに保証の外へ出ることを防ぐ
   */
  it('すべての色のセマンティックが、要件あり／要件無しのどちらかに分類されている', () => {
    for (const mode of ['light', 'dark'] as const) {
      const required = colorRequirements(mode, palette);
      const names = Object.keys(values[mode]).filter((n) => n.startsWith('--sg-color-'));
      const unclassified = names.filter(
        (n) => !required.has(n) && !colorWithoutRequirement(n),
      );
      expect(unclassified, `${mode}: 分類されていない色の役割`).toEqual([]);
    }
  });
});
