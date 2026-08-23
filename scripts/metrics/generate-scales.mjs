/**
 * スケールを生成して表示する。
 * 値は @sashigane/tokens から来る。ここでは整形するだけ。
 *
 * 不変条件の検査は packages/tokens/test/scales.test.ts が担当する（pnpm test）。
 * このスクリプトは人が値を目で確認するためのものであり、検査ではない。
 */
import {
  root, base, spacing, radius, radiusFull,
  fontSize, fontSizeAnchor, lineHeight, leadingFamilies,
  durationTransition, durationLoop, borderWidth, elevation,
  fontStackNames, fontStack, numericVariant,
} from '../../packages/tokens/src/index.ts';

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

// 書体だけは「値」ではなく構造を見せる。差し込み口が未定義のときの姿である（決定1-11）
console.log('\n## font-family (値ではなく構造。書体名は利用側が差す)');
for (const stack of fontStackNames) {
  console.log(`  ${stack.padEnd(8)}: ${fontStack(stack)}`);
}
console.log(`  数値      : font-variant-numeric: ${numericVariant}`);
