/**
 * tokens.css の構造。
 *
 * 明色モード・暗色モードの切り替え方は、**利用側が固定できることまで含めて**規則である
 * （決定5-10）。Phase 2 で ichirizuka（明色専用の紙のデザイン）へ導入したとき、
 * OS が暗色設定だと写像した変数だけが暗色へ飛び、生値のまま残った箇所と混ざって壊れた。
 * `[data-theme="dark"]` はあるのに `[data-theme="light"]` が無く、固定する手段が無かった。
 *
 * ここで検査するのは「出ていること」と「順序でメディアクエリに勝てること」。
 * **実ブラウザでの解決は別途目視で確認する**（記録は PR）。詳細度と順序の話なので
 * 静的検査だけでは効くことを証明できない。
 */
import { describe, expect, it } from 'vitest';
import { colorSemanticVars, generatePalette, toTokensCss } from '../src/index.ts';

const palette = generatePalette({ L: 0.6, C: 0.1, H: 220 });
const css = toTokensCss(palette);

const blockOf = (selector: string) => {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return null;
  return { at: start, body: css.slice(start, css.indexOf('\n}', start)) };
};

describe('tokens.css のテーマ切り替え', () => {
  it('両方向の固定手段が出ている', () => {
    expect(blockOf('[data-theme="light"]')).not.toBeNull();
    expect(blockOf('[data-theme="dark"]')).not.toBeNull();
  });

  it('固定用のブロックはメディアクエリより後にある（同じ詳細度なので順序で勝つ）', () => {
    const media = css.indexOf('@media (prefers-color-scheme: dark)');
    expect(media).toBeGreaterThan(-1);
    expect(blockOf('[data-theme="light"]')!.at).toBeGreaterThan(media);
    expect(blockOf('[data-theme="dark"]')!.at).toBeGreaterThan(media);
  });

  it('固定用のブロックの中身が :root / メディアクエリと一致する', () => {
    const declarations = (body: string) =>
      body
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('--sg-'));

    expect(declarations(blockOf('[data-theme="light"]')!.body)).toEqual(
      colorSemanticVars('light', palette).map((l) => l.trim()),
    );
    expect(declarations(blockOf('[data-theme="dark"]')!.body)).toEqual(
      colorSemanticVars('dark', palette).map((l) => l.trim()),
    );
  });
});
