/**
 * docs/decisions.md に載っている数値表が、生成器の出力と一致することを検査する。
 *
 * 経緯: この検査の必要性は PR #2 の自己レビューで N1 として挙げ、
 * 「Phase 1 で対処する」と書いたまま3つの PR を持ち越した。
 * その間に同じクラスのドリフトが3回起きている
 * （スケール定義の3重複 / README との規則重複 / 教訓の反映漏れ）。
 *
 * 教訓3「機械的に検査できるものは、文書ではなく検査にする」の適用。
 *
 * 検査できる範囲: decisions.md の表の数値と、README の概要表の数値。
 * 検査できない範囲: 表以外の本文に埋め込まれた数値、および表の「意味」。
 *   規則の説明文が値と食い違っていても、この検査は通る（教訓5）。
 */
import { readFileSync } from 'node:fs';
import {
  durationLoop,
  durationTransition,
  fontSize,
  leadingFamilies,
  letterSpacing,
  letterSpacingCaps,
  letterSpacingCoefficient,
  lineHeight,
  breakpoint,
  breakpointNames,
  breakpointUnit,
  radius,
  root,
  spacing,
} from '../packages/tokens/src/index.ts';

const doc = readFileSync('docs/decisions.md', 'utf8');
const readme = readFileSync('README.md', 'utf8');
const errors = [];

/**
 * `| 3 | 16.0000 | 1.0000 |` のような行を拾う。
 * 行末までを含めて照合するので、列数が違う表と取り違えない。
 * （最初これを怠り、line-height 表の先頭2列を font-size 表として拾った）
 */
const rows = (valueColumns) => {
  const cell = '\\s*\\*{0,2}([\\d.]+)\\*{0,2}\\s*\\|';
  const re = new RegExp(`^\\|\\s*\\*{0,2}(\\d+)\\*{0,2}\\s*\\|${cell.repeat(valueColumns)}\\s*$`, 'gm');
  return [...doc.matchAll(re)].map((m) => m.slice(1).map(Number));
};

/* ---------- font-size 表: | index | px | rem | ---------- */
const fsRows = rows(2).filter((r) => r[0] < fontSize.length && r[1] > 5 && r[1] < 200);
if (fsRows.length !== fontSize.length) {
  errors.push(
    `font-size の表が ${fsRows.length} 行しか見つかりません（期待 ${fontSize.length} 行）。\n` +
      '  表の形式を変えた場合はこのスクリプトも直してください。',
  );
} else {
  for (const [i, px, rem] of fsRows) {
    const wantPx = +fontSize[i].toFixed(4);
    const wantRem = +(fontSize[i] / root).toFixed(4);
    if (px !== wantPx) errors.push(`font-size[${i}] の px: 表 ${px} / 生成器 ${wantPx}`);
    if (rem !== wantRem) errors.push(`font-size[${i}] の rem: 表 ${rem} / 生成器 ${wantRem}`);
  }
}

/* ---------- line-height 表: | index | px | display | ui | prose | ---------- */
const lhRows = rows(4).filter((r) => r[0] < fontSize.length);
if (lhRows.length !== fontSize.length) {
  errors.push(
    `line-height の表が ${lhRows.length} 行しか見つかりません（期待 ${fontSize.length} 行）。`,
  );
} else {
  const families = Object.keys(leadingFamilies);
  for (const [i, px, ...values] of lhRows) {
    if (+fontSize[i].toFixed(4) !== px) {
      errors.push(`line-height 表の ${i} 行目の px: 表 ${px} / 生成器 ${fontSize[i].toFixed(4)}`);
    }
    families.forEach((family, k) => {
      const want = +lineHeight(fontSize[i], family).toFixed(3);
      if (values[k] !== want) {
        errors.push(`line-height[${i}].${family}: 表 ${values[k]} / 生成器 ${want}`);
      }
    });
  }
}

/* ---------- letter-spacing 表: | index | ○○px | ○○em | ---------- */
/*
 * **単位を書いた形で照合する。** 数字だけの表にすると font-size 表（同じ列数）と
 * 見分けがつかず、rows(2) が両方拾って行数が合わなくなる。
 * 表の側に単位を残すのは読み手のためでもある（em は「サイズに対する比」なので、
 * px と並べないと大きさが分からない）。
 */
const lsRows = [
  ...doc.matchAll(/^\|\s*(\d+)\s*\|\s*([\d.]+)px\s*\|\s*(-?[\d.]+)(?:em)?\s*\|\s*$/gm),
].map((m) => [+m[1], +m[2], +m[3]]);

if (lsRows.length !== fontSize.length) {
  errors.push(
    `letter-spacing の表が ${lsRows.length} 行しか見つかりません（期待 ${fontSize.length} 行）。`,
  );
} else {
  for (const [i, px, em] of lsRows) {
    if (px !== +fontSize[i].toFixed(2)) {
      errors.push(`letter-spacing 表の ${i} 行目の px: 表 ${px} / 生成器 ${fontSize[i].toFixed(2)}`);
    }
    const want = +letterSpacing(fontSize[i]).toFixed(4);
    if (em !== want) errors.push(`letter-spacing[${i}]: 表 ${em} / 生成器 ${want}`);
  }
}

/* ---------- README の概要表 ---------- */
/*
 * README にも値を書いている（利用者が最初に見る場所なので、
 * リンクだけにせず実際の値を出す判断をした）。
 * decisions.md だけを検査していると README が黙って古くなるため、ここも見る。
 */
const readmeExpectations = [
  ['spacing', spacing.join(', ')],
  ['radius', radius.join(', ')],
  ['font-size の下端', fontSize[0].toFixed(2)],
  ['font-size の上端', fontSize.at(-1).toFixed(2)],
  ['font-size の段数', `（${fontSize.length}段）`],
  ['duration 遷移の下端', String(Math.round(durationTransition[0]))],
  ['duration 遷移の上端', String(Math.round(durationTransition.at(-1)))],
  ['duration ループの下端', String(Math.round(durationLoop[0]))],
  ['duration ループの上端', String(Math.round(durationLoop.at(-1)))],
  ['breakpoint', breakpointNames.map((n) => breakpoint(n)).join(', ') + breakpointUnit],
  ['letter-spacing の係数', `${letterSpacingCoefficient} × (root ÷ size`],
  ['letter-spacing の大文字化の加算項', `${letterSpacingCaps}em`],
];

for (const [label, text] of readmeExpectations) {
  if (!readme.includes(text)) {
    errors.push(`README.md に ${label} の記載が見つかりません: 「${text}」`);
  }
}

/* ---------- 結果 ---------- */
if (errors.length) {
  console.error('docs/decisions.md の数値表が生成器の出力と一致しません。\n');
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(
    '\n値を変えたなら docs/decisions.md を先に更新してください。\n' +
      '表の値は「規則から導いた値」ではなく「規則が正しいことの証人」です。',
  );
  process.exit(1);
}

console.log(`✓ font-size 表 ${fsRows.length} 行が生成器と一致`);
console.log(`✓ line-height 表 ${lhRows.length} 行 × ${Object.keys(leadingFamilies).length} 系統が生成器と一致`);
console.log(`✓ letter-spacing 表 ${lsRows.length} 行が生成器と一致`);
console.log(`✓ README の概要表 ${readmeExpectations.length} 項目が生成器と一致`);
