/**
 * 生成物のヘッダ（決定3-4）。
 *
 * 検査の本体は `scripts/check-output-header.mjs` が dist に対して持つ。
 * ここで見るのは**生成器の側の性質**で、dist を作らなくても壊れたと分かるもの。
 *
 * とくに「同じ入力から同じ出力が出る」ことは、ヘッダに生成日時を入れないという
 * 決定そのものである。入れた瞬間にここが落ちる。
 */
import { describe, expect, it } from 'vitest';
import {
  DOCS_URL,
  generatePalette,
  outputHeader,
  toScss,
  toThemeCss,
  toTokensCss,
  toTypeDefinitions,
  toValuesJs,
} from '../src/index.ts';

const palette = generatePalette({ L: 0.6, C: 0.1, H: 220 });
const OUTPUTS = {
  'tokens.css': toTokensCss,
  'theme.css': toThemeCss,
  'tokens.scss': toScss,
  'tokens.js': toValuesJs,
  'tokens.d.ts': toTypeDefinitions,
} as const;

describe('生成物のヘッダ', () => {
  it('同じ入力から同じ出力が出る（生成日時を入れていない）', () => {
    for (const [name, gen] of Object.entries(OUTPUTS)) {
      expect(gen(palette), name).toBe(gen(palette));
    }
  });

  it('すべての生成物が規則の在り処を絶対 URL で持つ', () => {
    for (const [name, gen] of Object.entries(OUTPUTS)) {
      expect(gen(palette).slice(0, 800), name).toContain(DOCS_URL);
    }
  });

  it('在り処は絶対 URL である（配布先にリポジトリは無い）', () => {
    expect(DOCS_URL).toMatch(/^https:\/\//);
  });

  it('コメントの書き方が2通りあり、どちらも先頭から始まる', () => {
    const block = outputHeader('block', 'x', palette);
    const line = outputHeader('line', 'x', palette);
    expect(block[0]).toBe('/*');
    expect(block.at(-1)).toBe(' */');
    expect(line.every((l) => l.startsWith('//'))).toBe(true);
  });

  it('primary の色相を書く（どの入力から出た生成物かが分かる）', () => {
    expect(outputHeader('line', 'x', palette).join('\n')).toContain('220.0°');
  });
});
