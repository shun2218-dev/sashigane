import { colorPrimitiveVars, generatePalette, hexToOklch } from '@sashigane/tokens';

/**
 * 店のブランド色。**焙煎した豆の色である。**
 *
 * ## 絵を色に合わせるのではなく、色をコンセプトに合わせる
 *
 * ドキュメントサイトの青をそのまま使うと、**コーヒーの店には見えない。**
 * このシステムは「ブランド色を1つ選べば、そこから全部を導く」という作りなので、
 * **店には店の色を選ばせるのが正しい使い方**である。
 *
 * ## 差し替えるのはプリミティブだけ
 *
 * セマンティックの層は `var(--sg-{ランプ}-{段})` のように**名前で参照している。**
 * だからプリミティブを上書きすれば、面も塗りも淡い塗りも境界も、**全部追随する。**
 * 役割の対応表（どの段を指すか）は1つも書き換えない。
 *
 * status の色相も primary へ引き寄せられる（決定5-4）ので、
 * 在庫の緑や注意の橙も、この茶色に合った並びになる。
 *
 * ## 明暗の両方が一度に入る
 *
 * プリミティブは `:root` に1組あるだけで、明暗で切り替わるのは
 * **役割がどの段を指すか**である。だからここを差し替えると両方に効く。
 */
export const SHOP_PRIMARY = '#8a5a2b';

/** 店の中だけに当てる目印 */
export const SHOP_SCOPE = 'data-sg-shop';

/**
 * 店のプリミティブ。**`[data-sg-shop]` の中だけに当てる。**
 *
 * 生成器が出す行をそのまま使う。手で書くと、規則を直したときにここだけ古くなる。
 */
export const shopPalette = () => generatePalette(hexToOklch(SHOP_PRIMARY));

export const shopThemeCss = () =>
  `[${SHOP_SCOPE}] {\n${colorPrimitiveVars(shopPalette())
    .filter((line) => line.trim().startsWith('--'))
    .join('\n')}\n}`;
