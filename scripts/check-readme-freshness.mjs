/**
 * README がリリースに追いついていることを見る（Issue #197）。
 *
 * ## なぜ検査が要るか
 *
 * `v0.1.1` を出したあとも、README は「**まだインストールできません**」
 * 「コンポーネントは Card と Button の2つ」「タグはまだ1つも切っていません」のままだった。
 * **4つとも事実でなかった。**
 *
 * README は利用者が最初に読む面である。**古いと、動くものを動かないと言うことになる。**
 *
 * 手順に「README を直す」と書くだけでは、また追いつかなくなる（教訓3）。
 *
 * ## 測れるものだけを測る
 *
 * **「文章が最新か」は測れない。** 測れるのは数と状態である。
 *
 *   コンポーネントの数が、実際の数と一致すること
 *   リリース済みなのに「まだ入れられない」と言っていないこと
 *   配信元の URL が、導入手順のものと一致すること
 *
 * ## 対照を先に当てる（教訓2）
 *
 * 0 件は「合っている」と「検査が壊れている」の区別がつかない。
 * わざと古くした文面を通して、**発火することを確かめてから**結果を出す。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const README = 'README.md';
const UI = 'packages/ui/src';
const INSTALL = 'apps/docs/content/docs/install.mdx';
const PKG = 'packages/tokens/package.json';
const UNRELEASED = '0.0.0';

/** 部品の数。**`<name>/<name>.tsx` を持つディレクトリ**（生成器と同じ数え方） */
const componentCount = () =>
  readdirSync(UI, { withFileTypes: true }).filter(
    (e) => e.isDirectory() && existsSync(join(UI, e.name, `${e.name}.tsx`)),
  ).length;

/** 導入手順が書いている配信元。**README と2箇所に持つと静かにずれる** */
const registryUrl = () =>
  /"@sashigane":\s*"(https:\/\/[^/"]+)\/r\//.exec(readFileSync(INSTALL, 'utf8'))?.[1];

/** リリース済みかどうか。決定4-6 が `0.0.0` を未リリースと定めている */
const released = () => JSON.parse(readFileSync(PKG, 'utf8')).version !== UNRELEASED;

const check = (readme) => {
  const problems = [];

  const n = componentCount();
  if (!new RegExp(`コンポーネントは ${n} 個`).test(readme)) {
    problems.push(`コンポーネントの数（${n} 個）が README に書かれていません`);
  }

  if (released()) {
    for (const stale of ['まだインストールできません', 'タグはまだ1つも切っていません']) {
      if (readme.includes(stale)) {
        problems.push(`リリース済みなのに「${stale}」と書いています`);
      }
    }
  }

  const url = registryUrl();
  if (url && !readme.includes(url)) {
    problems.push(`配信元 ${url} が README に出てきません（導入手順と食い違います）`);
  }

  return problems;
};

const readme = readFileSync(README, 'utf8');

// 陰性対照。**古くした文面が落ちなければ、検査自体が壊れている**
const stale = readme
  .replace(new RegExp(`コンポーネントは ${componentCount()} 個`), 'コンポーネントは 2 個')
  .concat('\nまだインストールできません\n');
if (check(stale).length < 2) {
  console.error('✗ 対照が発火しない。検査が機能していない');
  process.exit(1);
}

// 陽性対照。**いまの README が通ることも確かめる**——通す側の対照が無いと、
// 検査を厳しくしすぎたときに気づけない（教訓2）
const problems = check(readme);
if (problems.length > 0) {
  console.error('README がリリースに追いついていません。');
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error('\n  README は利用者が最初に読む面です。リリースの一部として直してください。');
  process.exit(1);
}

console.log('✓ 対照が期待どおり（発火 2 件以上・通過 1）');
console.log(`✓ README がコンポーネント ${componentCount()} 個と配信元 ${registryUrl()} を書いている`);
