/**
 * ブランドの色が、トークンの段とずれていないことを見る（Issue #184）。
 *
 * ## なぜ検査が要るか
 *
 * `apps/docs/lib/brand.ts` は色を**凍結**している。導出すると、スケールや既定色を
 * 触ったときに**ブランドの絵が黙って変わる**ためである（原則2 が書体名について
 * 言っているのと同じ立場）。
 *
 * 凍結の代償は、**トークン側が動いたときに黙ってずれること**である。
 * ここで落とす。**ロゴが勝手に変わるのではなく、検査が落ちる。**
 *
 * 実際、最初に凍結した3つが間違っていた——ブラウザで測った chrome の地の色を
 * トークンの値だと取り違えていた。**目で確かめるだけでは足りない。**
 *
 * ## 対照を先に当てる（教訓2）
 *
 * 0 件は「合っている」と「検査が壊れている」の区別がつかない。
 * わざとずらした値を1つ通して、**発火することを確かめてから**結果を出す。
 *
 * `dist/tokens.js` を読むので、先に `pnpm build:tokens` が要る。
 */
import { readFileSync } from 'node:fs';
import { tokens } from '../packages/tokens/dist/tokens.js';
import { MARK_PATH, MARK_PATH_PLAIN } from '../apps/docs/lib/mark.ts';

const SRC = 'apps/docs/lib/brand.ts';

/**
 * 追跡下に置いた SVG。**生成していない**（利用者の判断）ので、
 * `mark.ts` とずれても誰も気づかない。**形もここで突き合わせる。**
 */
const SVGS = [
  ['apps/docs/public/logo.svg', MARK_PATH],
  ['apps/docs/public/icon.svg', MARK_PATH_PLAIN],
];

/** ブランドの名前 → トークンの名前とモード。**対応表はここ1つだけ** */
const EXPECTED = {
  brandFill: ['light', '--sg-color-accent'],
  onBrandFill: ['light', '--sg-color-on-accent'],
  darkSurface: ['dark', '--sg-color-bg-page'],
  darkAccent: ['dark', '--sg-color-accent'],
  darkText: ['dark', '--sg-color-text-default'],
  darkMuted: ['dark', '--sg-color-text-muted'],
};

/** `export const 名前 = '#xxxxxx';` を拾う */
const parse = (source) =>
  Object.fromEntries(
    [...source.matchAll(/export const (\w+)\s*=\s*'(#[0-9a-f]{6})'/g)].map((m) => [m[1], m[2]]),
  );

const compare = (found) => {
  const problems = [];
  for (const [name, [mode, token]] of Object.entries(EXPECTED)) {
    const want = tokens[mode][token];
    if (want === undefined) {
      problems.push(`${name}: トークン ${token}（${mode}）が見つからない`);
      continue;
    }
    if (found[name] === undefined) {
      problems.push(`${name}: ${SRC} に見つからない`);
      continue;
    }
    if (found[name] !== want) {
      problems.push(`${name}: ${found[name]} だが ${token}（${mode}）は ${want}`);
    }
  }
  return problems;
};

const source = readFileSync(SRC, 'utf8');
const found = parse(source);

// 陰性対照。**わざとずらしたものが落ちなければ、検査自体が壊れている**
const fixture = { ...found, darkAccent: '#000000' };
if (compare(fixture).length === 0) {
  console.error('✗ 対照が発火しない。検査が機能していない');
  process.exit(1);
}

// 陽性対照。**合っているものが通ることも確かめる**（教訓2）
if (compare(Object.fromEntries(
  Object.entries(EXPECTED).map(([n, [mode, t]]) => [n, tokens[mode][t]]),
)).length > 0) {
  console.error('✗ 一致しているはずの組が落ちる。検査が機能していない');
  process.exit(1);
}

const problems = compare(found);

/**
 * SVG が `mark.ts` の形をそのまま持っていること。
 *
 * **数を見る。** 「含む」で見ていた時期があるが、**2枚のうち1枚が壊れても通った**——
 * もう1枚が一致していれば `includes` は真になる。マークは2枚組みなので、**必ず2回**である。
 */
const occurrences = (haystack, needle) => haystack.split(needle).length - 1;
for (const [file, want] of SVGS) {
  const n = occurrences(readFileSync(file, 'utf8'), want);
  if (n !== 2) problems.push(`${file}: mark.ts の形が ${n} 回（2枚組みなので 2 回のはず）`);
}

/**
 * 追跡下の SVG の色。**16進で書いてあり、ここも凍結されている。**
 *
 * ファイルとして単体で読まれる（README・外部）ので、継承する相手がいない。
 * `currentColor` にしていた時期があるが、**GitHub は `<img>` で描くので黒く潰れた。**
 * React の部品（`components/mark.tsx`）は継承のままである——あちらには相手がいる。
 */
for (const [file] of SVGS) {
  const svg = readFileSync(file, 'utf8');
  for (const mode of ['light', 'dark']) {
    const want = tokens[mode]['--sg-color-accent'];
    if (!svg.includes(want)) problems.push(`${file}: ${mode} の ${want} が無い`);
  }
}

if (problems.length > 0) {
  console.error(`✗ ${SRC} の色がトークンとずれています`);
  for (const p of problems) console.error(`  ${p}`);
  console.error('\n  ブランドの色は凍結してある。トークン側が動いたらここも直す。');
  process.exit(1);
}

// 形の対照。**1枚だけ壊した SVG が落ちることを確かめる**（教訓2）
for (const [file, want] of SVGS) {
  const broken = readFileSync(file, 'utf8').replace(want, 'M0 0Z');
  if (occurrences(broken, want) === 2) {
    console.error(`✗ 形の対照が発火しない（${file}）`);
    process.exit(1);
  }
}

console.log(`✓ 対照が期待どおり（発火 1・通過 1）`);
console.log(`✓ ブランドの色 ${Object.keys(EXPECTED).length} 件がトークンの段と一致`);
console.log(`✓ 追跡下の SVG ${SVGS.length} 件が mark.ts の形と一致`);
