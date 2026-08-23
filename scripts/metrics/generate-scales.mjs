/**
 * スケールを生成して表示する。
 * 値は scripts/metrics/scales.mjs から来る。ここでは整形するだけ。
 *
 * scales.mjs は import された時点で不変条件を自己検査するため、
 * このスクリプトが正常終了すること自体が検査の合格を意味する。
 */
import {
  root, base, spacing, radius, radiusFull,
  fontSize, fontSizeAnchor, lineHeight, leadingFamilies,
  durationTransition, durationLoop, borderWidth, elevation,
} from './scales.mjs';

const f = (v, d = 4) => v.toFixed(d).padStart(d + 4);

console.log(`root = ${root}px   spacing.base = root ÷ 4 = ${base}px\n`);

console.log('## spacing');
console.log(' ', JSON.stringify(spacing));
console.log('  隣接比:', spacing.slice(3).map((v, i, a) => (i ? (v / a[i - 1]).toFixed(4) : (spacing[3] / spacing[2]).toFixed(4))).join(' '));
console.log('  2段ごとの比:', [4, 6, 8].map((i) => (spacing[i] / spacing[i - 2]).toFixed(4)).join(' '), '(= 3/2 × 4/3)');

console.log('\n## radius');
console.log(' ', JSON.stringify(radius), `+ full(${radiusFull})`);

console.log('\n## font-size / line-height');
console.log('idx |       px |      rem |   display |        ui |     prose');
fontSize.forEach((s, i) => {
  const mark = i === fontSizeAnchor ? '*' : ' ';
  console.log(
    `${String(i).padStart(2)}${mark} | ${f(s)} | ${f(s / root)} | ` +
      Object.keys(leadingFamilies).map((k) => f(lineHeight(s, k), 3)).join(' | '),
  );
});
console.log('  * = アンカー');

console.log('\n## duration');
console.log('  遷移  :', durationTransition.map((v) => v.toFixed(1)).join(', '), 'ms');
console.log('  ループ:', durationLoop.map((v) => v.toFixed(1)).join(', '), 'ms');

console.log('\n## border-width (px 固定)');
console.log(' ', JSON.stringify(borderWidth));

console.log('\n## elevation (高さ h)');
console.log(' ', JSON.stringify(elevation));
