/**
 * `tokens.scss` — SCSS 変数。
 *
 * pylabo が SCSS なので必要になる。CSS 変数を参照する形にしており、
 * **テーマの切り替えは実行時に効く。** SCSS のコンパイル時に値を焼き込むと
 * 暗色モードが成立しなくなる。
 *
 * **出すのはセマンティックだけ。** プリミティブは参照禁止なので SCSS 変数にもしない（原則3）。
 */
import type { Palette } from '../color/palette.ts';
import { colorSemanticVars } from './color-vars.ts';
import { outputHeader } from './header.ts';
import { typographySemanticVars } from './primitives.ts';

const toScssVar = (line: string): string | null => {
  const m = /^\s*--sg-([a-z0-9-]+):\s*(.+);$/.exec(line);
  return m ? `$sg-${m[1]}: var(--sg-${m[1]});` : null;
};

export const toScss = (palette: Palette): string =>
  [
    ...outputHeader('line', 'SCSS 変数。', palette, [
      'tokens.css を先に読み込むこと。値は CSS 変数を参照するので、',
      '暗色モードの切り替えが実行時に効く。コンパイル時に焼き込まない。',
      '出すのはセマンティックだけ（原則3）。',
    ]),
    '',
    ...[...typographySemanticVars(), ...colorSemanticVars('light', palette)]
      .map(toScssVar)
      .filter((v): v is string => v !== null),
    '',
  ].join('\n');
