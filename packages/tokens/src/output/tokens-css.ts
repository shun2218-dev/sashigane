/**
 * `tokens.css` — フレームワークに一切依存しない CSS 変数の定義。
 *
 * **これだけを読み込めば動くことが、原則4（依存は一方通行）の実証になる。**
 * React も Tailwind も無い素の HTML で変数が解決することを CI が検査する。
 */
import type { Palette } from '../color/palette.ts';
import { colorPrimitiveVars, colorSemanticVars } from './color-vars.ts';
import { primitiveVars, typographySemanticVars } from './primitives.ts';

export const toTokensCss = (palette: Palette): string =>
  [
    '/* sashigane — 生成物。手で編集しない。',
    '   規則と根拠は docs/decisions.md を参照。',
    '   --sg-{category}-{数字} はプリミティブで、コンポーネントからの参照は禁止（原則3）。 */',
    ':root {',
    ...primitiveVars(),
    '',
    ...colorPrimitiveVars(palette),
    '',
    '  /* ここからセマンティック（参照可） */',
    ...typographySemanticVars(),
    '',
    ...colorSemanticVars('light', palette),
    '}',
    '',
    '@media (prefers-color-scheme: dark) {',
    '  :root {',
    ...colorSemanticVars('dark', palette).map((l) => `  ${l}`),
    '  }',
    '}',
    '',
    '/* 明示的な指定は OS の設定より優先する。',
    '   両方向を出すのは、明色専用・暗色専用のアプリが固定できるようにするため（決定5-10）。',
    '   :root と同じ詳細度なので、順序でメディアクエリに勝つ。 */',
    '[data-theme="light"] {',
    ...colorSemanticVars('light', palette),
    '}',
    '',
    '[data-theme="dark"] {',
    ...colorSemanticVars('dark', palette),
    '}',
    '',
  ].join('\n');
