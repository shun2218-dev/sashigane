/**
 * `tokens.d.ts` — 利用側で補完と型チェックを効かせるための型。
 *
 * **セマンティックの名前だけを出す。** プリミティブを型に出すと
 * 補完に現れてしまい、原則3（コンポーネントはセマンティックしか参照できない）が
 * 型の側から崩れる。
 *
 * ## 値の宣言について
 *
 * 一度 `export declare const semanticTokens` を出していたが、実装がどこにも無く、
 * 利用側が import すると型は通って実行時に壊れる状態だった。
 * 型定義が嘘をつくのは最悪の形なので、**実体が要るときに実装ごと足す**と決めていた。
 *
 * `tokens.js` を出すようになったので、その実体に対する宣言をここに置く。
 * **ファイル名が `index.d.ts` ではなく `tokens.d.ts` なのはそのため。**
 * TypeScript は `./tokens.js` の型を隣の `tokens.d.ts` に探しに来る。
 */
import type { Palette } from '../color/palette.ts';
import { colorSemanticVars } from './color-vars.ts';
import { typographySemanticVars } from './primitives.ts';

const nameOf = (line: string): string | null => {
  const m = /^\s*(--sg-[a-z0-9-]+):/.exec(line);
  return m ? m[1]! : null;
};

export const toTypeDefinitions = (palette: Palette): string => {
  const names = [...typographySemanticVars(), ...colorSemanticVars('light', palette)]
    .map(nameOf)
    .filter((v): v is string => v !== null);
  return [
    '// sashigane — 生成物。手で編集しない。',
    '',
    '/**',
    ' * 参照してよいトークン名。',
    ' * プリミティブ（--sg-{category}-{数字}）は意図的に含めていない。',
    ' * コンポーネントはセマンティックしか参照できない（原則3）。',
    ' */',
    'export type SemanticToken =',
    ...names.map((n) => `  | '${n}'`),
    '  ;',
    '',
    'export type Theme = \'light\' | \'dark\';',
    '',
    '/**',
    ' * tokens.js の実体に対する宣言。**生成時点の写しである。**',
    ' * 実行時のテーマ切り替えには追随しないので、CSS が届く場所では CSS 変数を使う。',
    ' */',
    'export declare const tokens: Record<Theme, Record<SemanticToken, string>>;',
    'export default tokens;',
    '',
  ].join('\n');
};
