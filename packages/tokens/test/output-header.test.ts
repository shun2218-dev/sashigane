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
  UNRELEASED,
  VERSION,
  docsUrl,
  generatePalette,
  producedBy,
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
      expect(gen(palette).slice(0, 800), name).toContain(docsUrl());
    }
  });

  it('在り処は絶対 URL である（配布先にリポジトリは無い）', () => {
    expect(docsUrl()).toMatch(/^https:\/\//);
  });

  /**
   * バージョンの扱い（決定4-6）。**利用側が持っているのはスナップショットである。**
   * 在り処が `HEAD` を指したままだと、手元の CSS には無い決定を読むことになる。
   */
  it('リリース済みなら在り処をタグに固定し、未リリースなら HEAD を指す', () => {
    expect(docsUrl('1.2.3')).toContain('/tree/v1.2.3/docs');
    expect(docsUrl(UNRELEASED)).toContain('/tree/HEAD/docs');
  });

  it('すべての生成物がバージョンを書く（落ちた先で分かる唯一の手がかり）', () => {
    for (const [name, gen] of Object.entries(OUTPUTS)) {
      expect(gen(palette).slice(0, 800), name).toContain(producedBy());
    }
  });

  /**
   * **リリース済みの経路は普段1度も実行されない**（自己レビュー B3）。
   * `version` は `0.0.0` のまま長く続き、最初のタグを切る日に初めて動く。
   * そこで初めて壊れていると分かる形にしない。
   */
  it('リリース済みのヘッダは、ツール名とバージョンを離さずに書く', () => {
    const released = outputHeader('line', 'x', palette, [], '1.2.3').join('\n');
    expect(released).toContain('@sashigane/tokens v1.2.3 が生成する。');
    expect(released).toContain('/tree/v1.2.3/docs');

    const unreleased = outputHeader('line', 'x', palette, [], UNRELEASED).join('\n');
    expect(unreleased).toContain('@sashigane/tokens（未リリース）が生成する。');
    expect(unreleased).toContain('/tree/HEAD/docs');
  });

  /**
   * **バージョンだけを探す検査は書けない。** リリース済みのときに在り処の URL へ
   * 一致してしまうためである（`check-output-header.mjs` の陰性対照が捕まえた）。
   */
  it('バージョンだけでは、在り処の URL と区別がつかない', () => {
    const released = outputHeader('line', 'x', palette, [], '1.2.3').join('\n');
    const withoutLine = released.replace(producedBy('1.2.3'), '');
    expect(withoutLine).not.toContain('@sashigane/tokens v1.2.3');
    // それでも v1.2.3 は URL の中に残っている
    expect(withoutLine).toContain('v1.2.3');
  });

  it('バージョンの出所は1箇所（トークン層の中。原則1・原則4）', async () => {
    const pkg = await import('../package.json', { with: { type: 'json' } });
    expect(VERSION).toBe(pkg.default.version);
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
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
