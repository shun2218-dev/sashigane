/**
 * `tokens.js` — セマンティックの**解決済みの値**。
 *
 * ## なぜ要るのか
 *
 * **CSS 変数は、JS が値として色を計算する場所に届かない。**
 * 観測した4本のうち3本が JS 側に色の値を持っており、理由がそれぞれ違う。
 *
 *   ichirizuka  心拍 → 色の補間を実行時に計算する
 *   holosphere  OG 画像を Node 上で描く。**ブラウザもカスケードも存在しない**
 *   pylabo      講座ごとの識別色がデータに紐づく
 *
 * holosphere のケースは「実行時に CSS から読む」形では塞がらない。
 * 詳細は docs/experiments/phase2-ichirizuka.md の穴7。
 *
 * ## 本質的な制約
 *
 * **これは生成時点の写しであって、実行時のテーマ切り替えに追随しない。**
 * CSS が届く場所では CSS 変数を使う。この出力は「CSS の代わり」ではなく
 * 「CSS が届かない場所のための別経路」である。出力自身の先頭にもそう書く。
 *
 * ## 鍵の形（決定2-6 の改訂）
 *
 * **CSS 変数名をそのまま鍵にする。** 当初の決定はハイフンで機械的にネストする
 * （`tokens.color.bg.danger.hover`）と書いていたが、実際の名前に当てると
 * **40件中13件が衝突した。** `--sg-color-danger` と `--sg-color-danger-mark` が
 * 共存するため、`color.danger` が文字列とオブジェクトの両方を要求される。
 *
 * 鍵を CSS 変数名にすれば衝突が原理的に起きず、`SemanticToken` 型とも
 * `var()` に渡す文字列とも一致する。**語彙が1つで済む。**
 *
 * ## 書体の値について
 *
 * 書体スタックは `var(--sg-font-brand-*, 既定)` を含む（決定1-11）。
 * JS には var() を解決する仕組みが無いので、**差し込み口が未定義のときの既定へ展開する。**
 * 利用側が口へ書体名を差しても、この出力は追随しない。
 * 上の「生成時点の写し」という制約が、書体では**差す前の姿**という形で現れる。
 */
import type { Palette } from '../color/palette.ts';
import { hexToOklch, oklchContrast, toHex, type Oklch } from '../color/oklch.ts';
import { colorPrimitiveVars, colorRequirements, colorSemanticVars } from './color-vars.ts';
import { outputHeader } from './header.ts';
import {
  primitiveVars,
  spacingSemanticVars,
  typographySemanticVars,
} from './primitives.ts';

export type Theme = 'light' | 'dark';
export type TokenValues = Record<Theme, Record<string, string>>;

const DECLARATION = /^\s*(--sg-[a-z0-9-]+):\s*(.+);$/;

/**
 * 自分が出した `oklch(L C H)` を読み戻す。
 *
 * 色の値を palette から作り直すのではなく生成済みの行を読むのは、
 * **名前と段の対応を colorPrimitiveVars 1箇所に閉じておくため**である。
 * 対応表を2箇所に持つと、片方だけ直したときに静かにずれる。
 */
const parseOklch = (value: string): { color: Oklch; alpha?: number } | null => {
  const m = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/.exec(value.trim());
  if (!m) return null;
  return {
    color: { L: Number(m[1]), C: Number(m[2]), H: Number(m[3]) },
    // 透過を持つのは影の色だけである（決定1-8 改訂）。16進では8桁になる
    alpha: m[4] === undefined ? undefined : Number(m[4]),
  };
};

/**
 * `var(--x, 既定)` を既定へ展開する。**入れ子も展開する**（display は body の口へ落ちる）。
 *
 * JS 側に var() を残すと、値として使った先で静かに壊れる。
 * フォールバックの無い var() は展開しようがないので**生成器が落ちる。**
 * 「解決できなかったので素通しした」を成功として扱わない（教訓2）。
 */
export const expandVarFallbacks = (value: string): string => {
  const at = value.indexOf('var(');
  if (at === -1) return value;

  let depth = 0;
  let close = -1;
  for (let i = at + 3; i < value.length; i++) {
    if (value[i] === '(') depth += 1;
    else if (value[i] === ')') {
      depth -= 1;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  if (close === -1) throw new Error(`var() の括弧が閉じていません: ${value}`);

  // 第1引数（変数名）と残り（フォールバック）を、入れ子を跨がない最初のカンマで分ける
  const inner = value.slice(at + 4, close);
  let commaDepth = 0;
  let comma = -1;
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '(') commaDepth += 1;
    else if (inner[i] === ')') commaDepth -= 1;
    else if (inner[i] === ',' && commaDepth === 0) {
      comma = i;
      break;
    }
  }
  if (comma === -1) {
    throw new Error(
      `フォールバックの無い var() は JS へ出せません: ${inner.trim()}\n` +
        '  差し込み口には必ず既定値を持たせてください（決定1-11）。',
    );
  }

  const fallback = expandVarFallbacks(inner.slice(comma + 1).trim());
  return value.slice(0, at) + fallback + expandVarFallbacks(value.slice(close + 1));
};

/** プリミティブの名前 → 最終的な値。色は16進にする（canvas や OG 画像が oklch を解さない） */
const primitiveValues = (palette: Palette): Map<string, string> => {
  const out = new Map<string, string>();
  for (const line of [...primitiveVars(), ...colorPrimitiveVars(palette)]) {
    const m = DECLARATION.exec(line);
    if (!m) continue;
    const oklch = parseOklch(m[2]!);
    out.set(m[1]!, oklch ? toHex(oklch.color, oklch.alpha) : expandVarFallbacks(m[2]!));
  }
  return out;
};

/**
 * セマンティックの値を作る要素。**許可するものを列挙する**（教訓5）。
 *
 * `var(--sg-x)` 1つだけの値と、影のように**長さの列 + 色の参照**でできた値の
 * 両方をここで受ける。長さは数値と単位に限るので、**色の直値はどう書いても通らない。**
 * 禁止リストにすると `#fff` は塞げても `rebeccapurple` が黙って通る。
 */
const ITEM = /^(0|-?[\d.]+(px|rem|em|ms|s)|var\(--sg-[a-z0-9-]+\))$/;

/**
 * プリミティブを透かした値。**覆い（スクリム）だけがこの形を使う。**
 *
 * 透ける値は `var()` の参照では作れない——参照した先の不透明度は変えられない。
 * **色の直値は通さないまま**である。混ぜる相手は `transparent` に限り、
 * 混ぜられる側はプリミティブの参照に限る。
 */
const MIX = /^color-mix\(in oklab, var\((--sg-[a-z0-9-]+)\) ([\d.]+)%, transparent\)$/;

/** 16進に不透明度を足す。`#rrggbb` → `#rrggbbaa` */
const withAlpha = (hex: string, alpha: number): string => {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
};

/** セマンティックの `var(--sg-x)` を1段だけ解決する */
const resolve = (lines: string[], primitives: Map<string, string>): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const line of lines) {
    const m = DECLARATION.exec(line);
    if (!m) continue;
    const mix = MIX.exec(m[2]!.trim());
    if (mix) {
      const base = primitives.get(mix[1]!);
      if (base === undefined) {
        throw new Error(`未定義のプリミティブを参照しています: ${mix[1]}`);
      }
      out[m[1]!] = withAlpha(base, Number(mix[2]) / 100);
      continue;
    }

    const items = m[2]!.trim().split(/\s+/);
    if (!items.every((item) => ITEM.test(item))) {
      // セマンティックはプリミティブへの参照と長さでしか組み立てていない。
      // それ以外が現れたら生成器の前提が変わっている
      throw new Error(`セマンティックの値に許可していない要素があります: ${line.trim()}`);
    }
    out[m[1]!] = items
      .map((item) => {
        const ref = /^var\((--sg-[a-z0-9-]+)\)$/.exec(item);
        if (!ref) return item;
        const value = primitives.get(ref[1]!);
        if (value === undefined) {
          throw new Error(`未定義のプリミティブを参照しています: ${ref[1]}`);
        }
        return value;
      })
      .join(' ');
  }
  return out;
};

/** 16進を1段ずつ動かした近傍。半径 r まで、近い順に返す */
const neighbourHexes = (hex: string, r: number): string[] => {
  const n = Number.parseInt(hex.slice(1), 16);
  const base = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const out: { hex: string; d: number }[] = [];
  for (let dr = -r; dr <= r; dr++)
    for (let dg = -r; dg <= r; dg++)
      for (let db = -r; db <= r; db++) {
        const c = [base[0]! + dr, base[1]! + dg, base[2]! + db];
        if (c.some((v) => v < 0 || v > 255)) continue;
        out.push({
          hex: `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`,
          d: Math.abs(dr) + Math.abs(dg) + Math.abs(db),
        });
      }
  return out.sort((a, b) => a.d - b.d).map((x) => x.hex);
};

/**
 * **丸めで要件を割ったときだけ、最も近い満たす16進へ寄せる**（決定2-6 改訂、Issue #52）。
 *
 * 決定5-2 は端点を要件ちょうどまで解くので余裕がゼロである。`tokens.css` は `oklch()` を
 * そのまま出すので影響しないが、`tokens.js` は16進に丸めるため、境界ちょうどの段が
 * **16進に落とした瞬間だけ**要件を下回ることがある。全360色相で 12960 通りを測ると
 * 文字で 196 件（最悪 4.456）、マークは 0 件だった。
 *
 * **「丸めで対比を落とさない」ではない。** それだと半分の値が動く（実測 43560 件中 21560 件）。
 * 丸めは対比を上下どちらにも動かすので、**要件を割ったときだけ**倒す。
 */
const hexMeeting = (fg: string, bg: string, min: number): string => {
  const bgC = hexToOklch(bg);
  const ok = (h: string) => oklchContrast(hexToOklch(h), bgC) >= min;
  if (ok(fg)) return fg;
  for (let r = 1; r <= 4; r++) {
    const found = neighbourHexes(fg, r).find(ok);
    if (found) return found;
  }
  // 近傍4段で見つからないなら、丸めでは説明できないずれである。**黙って通さない**（教訓2）
  throw new Error(`16進で要件 ${min} を満たせません: fg=${fg} bg=${bg}`);
};

const enforceContrast = (
  colors: Record<string, string>,
  mode: 'light' | 'dark',
  palette: Palette,
): Record<string, string> => {
  const bg = colors['--sg-color-bg-page'];
  if (!bg) throw new Error('ページ地が解決できていません');
  const out = { ...colors };
  for (const [name, min] of colorRequirements(mode, palette)) {
    const cur = out[name];
    if (cur !== undefined) out[name] = hexMeeting(cur, bg, min);
  }
  return out;
};

export const tokenValues = (palette: Palette): TokenValues => {
  const primitives = primitiveValues(palette);
  const typography = resolve(typographySemanticVars(), primitives);
  /*
   * 骨格の余白は**既定の密度の値だけ**を出す（決定1-12）。
   * 面が page の値だけを出すのと同じ理由で、CSS が届かない場所に
   * 密度の切り替えは無い。テーマと違い、明色/暗色で値は変わらない。
   */
  const spacing = resolve(spacingSemanticVars('default'), primitives);
  return {
    light: {
      ...typography,
      ...spacing,
      ...enforceContrast(resolve(colorSemanticVars('light', palette), primitives), 'light', palette),
    },
    dark: {
      ...typography,
      ...spacing,
      ...enforceContrast(resolve(colorSemanticVars('dark', palette), primitives), 'dark', palette),
    },
  };
};

const entries = (map: Record<string, string>): string =>
  Object.entries(map)
    .map(([k, v]) => `    '${k}': '${v}',`)
    .join('\n');

export const toValuesJs = (palette: Palette): string => {
  const values = tokenValues(palette);
  return [
    ...outputHeader('line', 'セマンティックの解決済みの値。', palette, [
      '**生成時点の写しである。** 実行時のテーマ切り替えには追随しないので、',
      'CSS が届く場所では tokens.css の CSS 変数を使うこと。これは OG 画像の生成や',
      'データから色を計算する箇所のように、**CSS 変数が原理的に到達できない場所**',
      'のための別経路である。',
      '',
      '書体は「差し込み口が未定義のときの既定スタック」を出している。',
      '利用側が --sg-font-brand-* へ書体名を差しても、この値は追随しない。',
    ]),
    '',
    'export const tokens = {',
    '  light: {',
    entries(values.light),
    '  },',
    '  dark: {',
    entries(values.dark),
    '  },',
    '};',
    '',
    'export default tokens;',
    '',
  ].join('\n');
};
