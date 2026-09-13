/**
 * 画面に出た色の対比を測る。**実ブラウザでしか使えない。**
 *
 * ## なぜ計算値の文字列を解かないのか
 *
 * `getComputedStyle` は色を `oklch()` でも `lab()` でも `rgb()` でも返す。
 * 前の2つは知覚の明度で、WCAG の相対輝度ではない。
 * **書式ごとに解く式を持つと、書式が増えたときに黙って外れる。**
 *
 * 1px に塗って読めば、**ブラウザが解いた結果そのもの**が取れる。
 *
 * ## ここに1つだけ置く理由
 *
 * 口（Input / Textarea / PasswordInput / Select / Checkbox / Radio）は
 * **線だけで自分を示している**（決定6-58）。どれも同じ `ring` を共有しているが、
 * **共有していることは測れない。** だから6つそれぞれで対比を測る。
 *
 * 写しを6つ作ると、片方だけ直したときにずれる。**引く先を1つにする。**
 */

/**
 * 色を sRGB の3値に直す。**読めなければ落とす。**
 *
 * `fillStyle` は解けない値を**黙って無視する**（例外も出ず、前の値が残る）。
 * 番兵を先に置いて、塗った結果が番兵のままなら落とす（教訓4）。
 */
const toRgb = (color: string): [number, number, number] => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d の文脈が取れません');
  ctx.fillStyle = '#ff00ff';
  ctx.fillStyle = color;
  if (ctx.fillStyle === '#ff00ff') throw new Error(`色を読めません: ${color}`);
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r!, g!, b!];
};

const luminance = (color: string) => {
  const [r, g, b] = toRgb(color).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG の対比。順序は問わない */
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * 枠の線が、まわりの地に対して何対1かを返す。
 *
 * **WCAG 1.4.11 は、部品を識別するのに必要な部分に 3:1 を求める。**
 * 口は地を持たないので、識別しているのは線だけである。
 */
export const lineContrast = (frame: Element, ambient: Element) =>
  contrast(getComputedStyle(frame).outlineColor, getComputedStyle(ambient).backgroundColor);
