/**
 * トークンを dist/ に書き出す。
 *
 * **生成物はコミットしない**（原則1）。dist/ は .gitignore 済みで、
 * 混入していないことを CI が検査する。
 *
 * primary は既定値。利用者はテーマビルダーで選び直す（決定5-1）。
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generatePalette,
  hexToOklch,
  toScss,
  toThemeCss,
  tokenLayers,
  toTokensCss,
  toTypeDefinitions,
  toValuesJs,
} from './src/index.ts';

/**
 * 既定の primary。利用者はテーマビルダーで選び直す。
 *
 * 警告が出ない色を選んでいる。#3b82f6（一般的な青）は info の色相と 18° しか離れず
 * status-too-close-to-primary が出る。**既定値が警告を出す状態で配布しない。**
 */
const DEFAULT_PRIMARY = '#0ea5e9';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, 'dist');

// 出力の顔ぶれが変わったときに古い生成物が残らないようにする。
// 消えたはずのファイルが dist に居座ると、検査も利用側も嘘を見る
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const palette = generatePalette(hexToOklch(DEFAULT_PRIMARY));
if (palette.warnings.length > 0) {
  console.warn(`既定の primary (${DEFAULT_PRIMARY}) に警告があります:`);
  for (const w of palette.warnings) console.warn(`  ⚠ [${w.code}] ${w.message}`);
}

const files = {
  'tokens.css': toTokensCss(palette),
  'theme.css': toThemeCss(palette),
  'tokens.scss': toScss(palette),
  // CSS が原理的に届かない場所（OG 画像の生成など）のための値。
  // 型は隣の tokens.d.ts が受け持つので、この2つはファイル名が対になっている
  'tokens.js': toValuesJs(palette),
  'tokens.d.ts': toTypeDefinitions(palette),

  // 配布物ではなく検査用。scripts/check-token-usage.mjs が
  // 「参照してよい名前の集合」として読む（原則3、決定2-3）。
  'tokens.layers.json': `${JSON.stringify(tokenLayers(palette), null, 2)}\n`,
};

for (const [name, content] of Object.entries(files)) {
  writeFileSync(join(dist, name), content, 'utf8');
  console.log(`  ${name.padEnd(18)} ${content.split('\n').length} 行`);
}
