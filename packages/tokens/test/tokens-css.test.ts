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
import {
  colorSemanticVars,
  densityLevels,
  generatePalette,
  spaceRoles,
  spacingSemanticVars,
  toTokensCss,
} from '../src/index.ts';

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

  it('どのテーマブロックも color-scheme を伴う', () => {
    // CSS 変数はスクロールバーやフォームコントロールへ届かない。
    // これが無いと、暗色に切り替えても明色のスクロールバーが暗い面の上に出る（自己レビュー B1）
    expect(blockOf('[data-theme="light"]')!.body).toContain('color-scheme: light;');
    expect(blockOf('[data-theme="dark"]')!.body).toContain('color-scheme: dark;');

    const root = css.slice(css.indexOf(':root {'), css.indexOf('\n}'));
    expect(root).toContain('color-scheme: light;');

    const media = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
    expect(media.slice(0, media.indexOf('\n}'))).toContain('color-scheme: dark;');
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

describe('tokens.css の密度（決定1-12）', () => {
  it('3段すべての固定手段が出ている', () => {
    for (const level of densityLevels) {
      expect(css, level).toContain(`[data-sg-density="${level}"] {`);
    }
  });

  it('固定用のブロックはメディアクエリより後にある（同じ詳細度なので順序で勝つ）', () => {
    const media = css.indexOf('@media (width <');
    expect(media, '密度のメディアクエリが無い').toBeGreaterThan(-1);
    for (const level of densityLevels) {
      expect(css.indexOf(`[data-sg-density="${level}"] {`), level).toBeGreaterThan(media);
    }
  });

  it('固定用のブロックの中身が生成器と一致する', () => {
    for (const level of densityLevels) {
      const block = blockOf(`[data-sg-density="${level}"]`);
      expect(block, level).not.toBeNull();
      const declarations = block!.body
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('--'));
      expect(declarations, level).toEqual(
        spacingSemanticVars(level).map((l) => l.trim()),
      );
    }
  });

  it('狭い画面の既定が compact と一致する（２つの経路が食い違わない）', () => {
    const start = css.indexOf('@media (width <');
    const body = css.slice(start, css.indexOf('\n}', start));
    for (const line of spacingSemanticVars('compact')) {
      expect(body, line.trim()).toContain(line.trim());
    }
  });

  it('骨格の役割だけが出ている（コンポーネント内部の余白は密度で動かさない）', () => {
    expect(spaceRoles).toEqual(['page', 'section', 'surface']);
  });
});
