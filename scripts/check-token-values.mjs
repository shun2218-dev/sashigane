/**
 * tokens.js の値が tokens.css とずれていないことを検査する。
 *
 * 同じセマンティックが2つの生成物に別の形で出る。**二重管理そのもの**なので、
 * 一致を機械的に確かめないと片方だけ直したときに静かにずれる。
 * これは Phase 2 で ichirizuka に実際に起きた失敗の形である
 * （凡例は CSS、データは JS。片方だけ新しくなって色が食い違った）。
 *
 * 検査は**生成器ではなく出力された CSS のテキストから**値を組み立てて突き合わせる。
 * 両方を palette から作ると同じコードを2回通すだけになり、ずれを検出できない。
 *
 * 16進への変換と var() フォールバックの展開だけは packages/tokens の実装を借りる。
 * ここで sRGB 変換や CSS の入れ子解析を書き直すと、**その正しさを検査する検査**が
 * 要ることになり、正が2つになる。
 *
 * 検査できないこと:
 *   - 変換そのものの誤り（上記の理由で共有している）
 *   - tokens.css と tokens.js が同じ palette から出ていること
 *     （build.mjs が1回の実行で両方を書くので、構造上ずれない）
 */
import { existsSync, readFileSync } from 'node:fs';
import { hexToOklch, oklchContrast, toHex } from '../packages/tokens/src/color/oklch.ts';
import { expandVarFallbacks } from '../packages/tokens/src/output/values.ts';
import { colorRequirements } from '../packages/tokens/src/output/color-vars.ts';
import { generatePalette } from '../packages/tokens/src/color/palette.ts';

/**
 * 要件の表を作るための primary は、**生成物のヘッダから取る。**
 *
 * 定数を書き写すと `build.mjs` とずれても誰も気づかない（二重管理）。
 * ヘッダには段500 の色が書いてあり、決定5-1 のとおり**受け継ぐのは色相だけ**なので、
 * それを入力にすれば同じ役割の割り当てが解かれる。
 */
const primaryFromHeader = (text) => {
  const m = /段 500 は (#[0-9a-f]{6})/.exec(text);
  if (!m) {
    console.error('生成物のヘッダから primary を読めません。ヘッダの形が変わっています。');
    process.exit(1);
  }
  return m[1];
};

const DIST = 'packages/tokens/dist';
for (const f of ['tokens.css', 'tokens.js', 'tokens.layers.json']) {
  if (!existsSync(`${DIST}/${f}`)) {
    console.error(`${DIST}/${f} がありません。先に pnpm build:tokens を実行してください。`);
    process.exit(1);
  }
}

const css = readFileSync(`${DIST}/tokens.css`, 'utf8');
const layers = JSON.parse(readFileSync(`${DIST}/tokens.layers.json`, 'utf8'));

/* ---------- tokens.css から値を組み立てる ---------- */

/** セレクタのブロックを取り出す。@media の中は入れ子なので開始位置を指定して切る */
const blockAfter = (from) => {
  const start = css.indexOf('{', from);
  const end = css.indexOf('\n}', start);
  return css.slice(start, end);
};

const declarations = (block) => {
  const out = new Map();
  for (const m of block.matchAll(/(--sg-[a-z0-9-]+):\s*([^;]+);/g)) out.set(m[1], m[2].trim());
  return out;
};

// 透過を持つのは影の色だけである（決定1-8 改訂）。16進では8桁になる
const OKLCH = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/;
const asValue = (raw) => {
  const m = OKLCH.exec(raw);
  if (m) {
    const c = { L: Number(m[1]), C: Number(m[2]), H: Number(m[3]) };
    return m[4] === undefined ? toHex(c) : toHex(c, Number(m[4]));
  }
  // 書体スタックは差し込み口を含む。JS 側は既定へ展開した姿を持つ（決定1-11）
  return expandVarFallbacks(raw);
};

const root = declarations(blockAfter(css.indexOf(':root {')));
const darkBlock = declarations(blockAfter(css.indexOf('[data-theme="dark"] {')));

/** プリミティブは :root にしか出ない */
const primitives = new Map();
for (const name of layers.primitives) {
  const raw = root.get(name);
  if (raw === undefined) {
    console.error(`tokens.css にプリミティブ ${name} がありません。`);
    process.exit(1);
  }
  primitives.set(name, asValue(raw));
}

/**
 * 浮きは**長さの列 + プリミティブへの参照**でできている（決定1-8 改訂）。
 * 参照1つだけの値と同じ経路で解けるように、空白で切って要素ごとに解決する。
 *
 * 判定は**許可するものの列挙**にする（教訓5）。長さは数値と単位に限るので、
 * 書体スタック（カンマとフォールバックを含む）はここに入らず、下の経路へ落ちる。
 *
 * **生成器の resolve() を import しない。** この検査は tokens.css と tokens.js を
 * 突き合わせるものなので、両方を同じ関数で作ると突き合わせにならない。
 */
const ITEM = /^(0|-?[\d.]+(px|rem|em|ms|s)|var\(--sg-[a-z0-9-]+\))$/;

const resolveFrom = (block, name) => {
  const raw = block.get(name);
  if (raw === undefined) return undefined;
  const items = raw.split(/\s+/);
  if (items.every((item) => ITEM.test(item))) {
    return items
      .map((item) => {
        const ref = /^var\((--sg-[a-z0-9-]+)\)$/.exec(item);
        return ref ? primitives.get(ref[1]) : item;
      })
      .join(' ');
  }
  return asValue(raw);
};

const fromCss = {
  light: Object.fromEntries(layers.semantics.map((n) => [n, resolveFrom(root, n)])),
  // タイポグラフィは暗色ブロックに出ないので :root の値が生きる
  dark: Object.fromEntries(
    layers.semantics.map((n) => [n, resolveFrom(darkBlock, n) ?? resolveFrom(root, n)]),
  ),
};

/* ---------- tokens.js を読む ---------- */
const { tokens } = await import(`../${DIST}/tokens.js`);

/* ---------- 突き合わせ ---------- */
const errors = [];
let adjusted = 0;
const palette = generatePalette(hexToOklch(primaryFromHeader(css)));
const requirements = {
  light: colorRequirements('light', palette),
  dark: colorRequirements('dark', palette),
};
for (const theme of ['light', 'dark']) {
  const js = tokens[theme];
  if (!js) {
    errors.push(`tokens.js に ${theme} がありません。`);
    continue;
  }
  for (const name of layers.semantics) {
    const expected = fromCss[theme][name];
    if (expected === undefined) {
      errors.push(`tokens.css の ${theme} に ${name} がありません。`);
    } else if (js[name] !== expected) {
      /*
       * **要件を割った丸めだけは、ずれていてよい**（決定2-6 改訂、Issue #52）。
       * 決定5-2 は端点を要件ちょうどまで解くので、16進に落とすと境界の段が割ることがある。
       * その1件だけを寄せているので、次の3つを満たすなら正しいずれである。
       *
       *   1. 素直に丸めた値は要件を割っている
       *   2. tokens.js の値は要件を満たしている
       *   3. ずれは丸めで説明できる幅（RGB 各成分 4 段以内）に収まっている
       *
       * **3つとも見る。** 「違うが要件は満たす」だけを見ると、まったく別の色でも通る
       */
      const min = requirements[theme].get(name);
      const bg = js['--sg-color-bg-page'];
      const contrast = (h) => oklchContrast(hexToOklch(h), hexToOklch(bg));
      const channels = (h) => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
      const shift = Math.max(
        ...channels(js[name]).map((v, i) => Math.abs(v - channels(expected)[i])),
      );
      const ok =
        min !== undefined &&
        bg !== undefined &&
        contrast(expected) < min &&
        contrast(js[name]) >= min &&
        shift <= 4;
      if (!ok) {
        errors.push(
          `${theme} の ${name} がずれています: css=${expected} js=${js[name]}` +
            (min === undefined
              ? '（この役割は要件を持たないので、寄せてよい理由が無い）'
              : `（要件 ${min} / 素直な丸め ${contrast(expected).toFixed(3)} / js ${contrast(js[name]).toFixed(3)} / ずれ ${shift}）`),
        );
      } else {
        adjusted++;
      }
    }
  }
  for (const name of Object.keys(js)) {
    if (!layers.semantics.includes(name)) {
      errors.push(`tokens.js の ${theme} に、セマンティックでない ${name} が出ています。`);
    }
  }
}

if (errors.length) {
  console.error('tokens.js と tokens.css の値がずれています。\n');
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log(
  `✓ light / dark の ${layers.semantics.length} 件が tokens.css と一致` +
    (adjusted ? `（うち ${adjusted} 件は丸めで要件を割ったため寄せてある。決定2-6 改訂）` : ''),
);
console.log('✓ tokens.js にセマンティック以外の名前は出ていない');
