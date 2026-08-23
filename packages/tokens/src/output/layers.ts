/**
 * 層の名前表 — どの `--sg-*` がプリミティブで、どれがセマンティックか。
 *
 * **これは配布物ではなく検査用の出力である。** `scripts/check-token-usage.mjs` が
 * 「参照してよい名前の集合」として読む（原則3）。
 *
 * ## なぜ表が要るのか（決定2-3 の改訂）
 *
 * 当初は「`--sg-{category}-{数字}` がプリミティブ、`--sg-{category}-{単語}` が
 * セマンティック」という**1つの正規表現で層を判別できる**と決めていた。
 * 実際の出力に当てたところ、両方向に破れていた。
 *
 *   偽陽性  --sg-text-heading-1 … 3、--sg-color-chart-1 … 5   セマンティックだが数字で終わる
 *   偽陰性  --sg-radius-full                                  プリミティブだが単語で終わる
 *
 * 見出しレベルも系列番号も本質的に数字であり、名前を歪めてまで正規表現に
 * 合わせる理由がない。**名前の形ではなく、生成器が知っている事実で判定する。**
 * 経緯は docs/agent-failures.md、改訂後の決定は docs/decisions.md 決定2-3。
 *
 * 手書きの一覧は作らない（決定2-6）。各 `*Vars()` が出した CSS 行から名前を取り出す。
 */
import type { Palette } from '../color/palette.ts';
import { colorPrimitiveVars, colorSemanticVars } from './color-vars.ts';
import { primitiveVars, typographySemanticVars } from './primitives.ts';

export type TokenLayers = {
  /** コンポーネントからの参照は禁止（原則3） */
  primitives: string[];
  /** 参照可 */
  semantics: string[];
};

/** 生成した CSS 行から宣言されている変数名を取り出す。コメント行と空行は落ちる。 */
const declaredNames = (lines: string[]): string[] =>
  lines.flatMap((line) => {
    const m = /^\s*(--sg-[a-z0-9-]+)\s*:/.exec(line);
    return m ? [m[1]!] : [];
  });

export const tokenLayers = (palette: Palette): TokenLayers => ({
  primitives: [...declaredNames(primitiveVars()), ...declaredNames(colorPrimitiveVars(palette))].sort(),
  // セマンティックの名前は light / dark で同一。値だけが切り替わる（決定5-7）。
  // 同一であることは packages/tokens/test/layers.test.ts が検査する。
  semantics: [
    ...declaredNames(typographySemanticVars()),
    ...declaredNames(colorSemanticVars('light', palette)),
  ].sort(),
});
