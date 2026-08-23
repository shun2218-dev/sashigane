/**
 * `index.d.ts` — 利用側で補完と型チェックを効かせるための型。
 *
 * **セマンティックの名前だけを出す。** プリミティブを型に出すと
 * 補完に現れてしまい、原則3（コンポーネントはセマンティックしか参照できない）が
 * 型の側から崩れる。
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
    'export declare const semanticTokens: readonly SemanticToken[];',
    '',
  ].join('\n');
};
