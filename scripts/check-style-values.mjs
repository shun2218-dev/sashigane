/**
 * `style` 属性に**生の値**を書いていないことを検査する（原則1、Issue #258）。
 *
 * ## なぜ検査するのか
 *
 * `check:token-usage` は `class=` の位置から読む。**`style` は読まない。**
 * それはあの検査自身の「原理的に見逃す範囲」に最初から書いてある——
 * 書いてあるとおりに素通りした（docs/agent-failures.md の 2026-09-11）。
 *
 * デモのモーダルに `style={{ maxWidth: 460 }}` と書き、**検査は全部緑だった。**
 * 同じページのフッタは利用者に「色も寸法も、生の値を1つも書いていません」と言っており、
 * **その文が偽になっていた。** 見つけたのは自己レビューである。
 *
 * **書いた時点と読む時点は別である。** 限界を文書に書き残しても、
 * 書く側がそれを思い出す保証は無い（教訓3——機械的に検査できるものは検査にする）。
 *
 * ## 判定の形 — 許可するものを列挙する（教訓5）
 *
 * 「生値を禁止する」形にすると、`#fff` も `16` も `calc()` も `color-mix()` も、
 * 列挙し忘れた分だけ黙って通る。そこで**許す形だけを並べ、それ以外を落とす。**
 *
 *   var(--sg-{セマンティック})   名前表に載っているもの（差し込み口を含む）
 *   キーワード                   'grid' 'visible' 'space-between' など、英小文字とハイフンだけ
 *   0 / undefined                寸法でも色でもない
 *   `--sg-*` を鍵にした値        **差し込み口へ流す形**（名前表に載っているものだけ）
 *
 * 差し込み口を許すのは決定2-7 と同じ理由である。Toast のゲージは滞在時間を
 * `--sg-gauge-duration` へ流しており、**これはトークンを経由する正しい書き方**である。
 * 名前表と照合するので、打ち間違えた `--sg-guage-duration` は落ちる。
 *
 * ## 例（`examples/`）は対象から外している
 *
 * 81 ファイル中 60 ファイルが `gap: 16` `maxWidth: 360` のような**骨組み**を持つ。
 * これは部品の使い方ではなく、**例を並べるための足場**である。
 *
 * **外したことで見えなくなるものがある。** 例のソースはサイトの「ソース」タブに
 * そのまま出るので、**利用者はそこで生の値を見る。** 範囲を広げるなら、
 * 先に 60 ファイルの骨組みをクラスへ移すことになる。
 *
 * ## この検査が原理的に見逃す範囲（教訓5）
 *
 *   - **除外した場所**（下記 EXCLUDED）。例・Satori で描く画像・テーマビルダー
 *   - **HTML の文字列に書いた `style="..."`。** JSX の `style={...}` だけを見ている。
 *     生成器が出すサンプルの HTML はこの形で、`check:sample-page` が別に見ている
 *   - **別の場所で組み立てた値。** `const s = { maxWidth: 460 }` を `style={s}` に渡すと、
 *     `style=` の位置にはオブジェクトが無いので値まで辿れない。**辿れないことは報告する**
 *     （読めない値として落とす）が、変数の定義側までは見に行かない
 *   - **未追跡のファイル**（`git ls-files` が対象）。新しいファイルは先に `git add` する
 *   - CSS-in-JS のライブラリ。いまは使っていない
 *
 * ## 過剰に検出するもの
 *
 * **読めない値は落とす。** 変数・関数呼び出し・三項・テンプレート・展開（`...`）は、
 * 中身が生の値かどうかを静的に決められない。
 * **通す側に倒すと、いちばん通しやすい書き方が素通りになる**ので、落とす側に倒した。
 *
 * 正当な用があって落ちたときは、**差し込み口（`--sg-*`）へ流す**か、
 * 理由を書いて EXCLUDED に足す。**理由の書けない除外を足さない。**
 *
 * ## 対照（教訓2）
 *
 * 違反 0 件と、検出器が壊れていることは区別がつかない。実行のたびに、
 * **落ちるべき書き方**と**通すべき書き方**の両方をフィクスチャに当てる。
 * どちらかが外れたら、この検査自体を失敗させる。
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const LAYERS = 'packages/tokens/dist/tokens.layers.json';

/* ============================================================
   検査対象
   ============================================================ */

/** JSX を書きうる拡張子。`style={...}` はここにしか現れない */
const TARGET_EXT = /\.(tsx|jsx|ts|js|mts|mjs)$/;

/**
 * 対象から外すもの。**理由の書けない除外を足さない。**
 * 追跡下のソースが対象で、ここに列挙したものだけを引く。
 */
const EXCLUDED = [
  {
    re: /^packages\/ui\/src\/[^/]+\/examples\//,
    why:
      '例の骨組み。部品の使い方ではなく、例を並べるための足場である（`gap: 16` `maxWidth: 360`）。' +
      '**ただしソースはサイトの「ソース」タブに出る。** 範囲に入れるなら、' +
      '先に 60 ファイルの骨組みをクラスへ移すことになる（Issue #258 で外すと決めた）',
  },
  {
    re: /\.test\.tsx?$/,
    why: 'テストは測るために生の値を置く。落とすと測れなくなる',
  },
  {
    re: /^scripts\//,
    why: 'この検査自身が対照として違反文字列を持つ',
  },
  {
    re: /^packages\/tokens\//,
    why: 'トークンの生成器そのもの。生成する文字列の中に style を持つ（check:sample-page が別に見ている）',
  },
  {
    re: /^apps\/docs\/app\/og\/|^apps\/docs\/app\/apple-icon\.tsx$/,
    why:
      'Satori で画像を描く。**クラスも CSS 変数も解決されない**ので、値を直接書くしかない。' +
      '色がトークンの段とずれていないことは check:brand が見ている',
  },
  {
    re: /^apps\/docs\/app\/theme\//,
    why: '利用者が選んだ色をその場で塗って見せる画面。塗る色そのものが入力である',
  },
];

/* ============================================================
   検出器（フィクスチャにも実ファイルにも同じものを当てる）
   ============================================================ */

/**
 * `text` の `open` の位置から、対応する閉じ括弧の**次**の位置を返す。
 *
 * 文字列・テンプレート・注釈の中の括弧は数えない。**数え落とすと、
 * 途中で切れた断片を値として読むことになる。**
 */
const matchBrace = (text, open) => {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '/' && next === '/') {
      i = text.indexOf('\n', i);
      if (i === -1) return -1;
      continue;
    }
    if (c === '/' && next === '*') {
      i = text.indexOf('*/', i + 2);
      if (i === -1) return -1;
      i += 1;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      i += 1;
      for (; i < text.length; i += 1) {
        if (text[i] === '\\') {
          i += 1;
          continue;
        }
        if (text[i] === quote) break;
        /* テンプレートの `${}` は中に括弧を持つので、そこだけ追いかける */
        if (quote === '`' && text[i] === '$' && text[i + 1] === '{') {
          const end = matchBrace(text, i + 1);
          if (end === -1) return -1;
          i = end - 1;
        }
      }
      continue;
    }
    if (c === '{') depth += 1;
    if (c === '}') {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
};

/** 深さ0のところで区切る。区切り文字は `,`（要素）と `:`（鍵と値） */
const splitTop = (text, separator) => {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      i += 1;
      for (; i < text.length; i += 1) {
        if (text[i] === '\\') {
          i += 1;
          continue;
        }
        if (text[i] === quote) break;
        if (quote === '`' && text[i] === '$' && text[i + 1] === '{') {
          const end = matchBrace(text, i + 1);
          if (end === -1) break;
          i = end - 1;
        }
      }
      continue;
    }
    if (c === '{' || c === '(' || c === '[') depth += 1;
    if (c === '}' || c === ')' || c === ']') depth -= 1;
    if (depth === 0 && c === separator) {
      out.push(text.slice(start, i));
      start = i + 1;
      if (separator === ':') {
        out.push(text.slice(start));
        return out;
      }
    }
  }
  out.push(text.slice(start));
  return out;
};

/** `style={` … `}` の中身を集める */
const styleExpressions = (text) => {
  const out = [];
  const re = /style=\{/g;
  let m = re.exec(text);
  while (m) {
    const open = m.index + 'style='.length;
    const end = matchBrace(text, open);
    if (end !== -1) out.push(text.slice(open, end));
    m = re.exec(text);
  }
  return out;
};

/** 式の中のオブジェクトを集める。三項や `as CSSProperties` を挟んでいてもよい */
const objectsIn = (expression) => {
  const out = [];
  /* 外側の `{ … }` は style={…} の括弧そのものなので、その中を見る */
  const inner = expression.slice(1, -1);
  for (let i = 0; i < inner.length; i += 1) {
    if (inner[i] !== '{') continue;
    const end = matchBrace(inner, i);
    if (end === -1) break;
    out.push(inner.slice(i + 1, end - 1));
    i = end - 1;
  }
  return out;
};

const unquote = (text) => {
  const t = text.trim();
  const m = t.match(/^(['"])(.*)\1$/);
  return m ? m[2] : t;
};

/** 鍵。`maxWidth` `'--sg-x'` `['--sg-x']` のどれでも同じ形に均す */
const keyOf = (raw) => {
  const t = raw.trim();
  const bracket = t.match(/^\[(.*)\]$/);
  return unquote(bracket ? bracket[1] : t);
};

/**
 * 値を見て、落とす理由を返す。**通るものは `null`。**
 *
 * `allowed` は名前表のセマンティックと差し込み口。
 */
const judge = (key, value, allowed) => {
  const v = value.trim();
  /* 差し込み口へ流す形。名前表に載っているものだけ */
  if (key.startsWith('--')) {
    return allowed.has(key) ? null : `差し込み口 ${key} は名前表に無い`;
  }
  if (v === '0' || v === 'undefined') return null;
  /* キーワード。寸法でも色でもないので、決定を持たない */
  if (/^(['"])[a-z][a-z-]*\1$/.test(v)) return null;
  const ref = v.match(/^(['"])\s*var\(\s*(--[a-z0-9-]+)\s*\)\s*\1$/);
  if (ref) {
    return allowed.has(ref[2]) ? null : `${ref[2]} は名前表のセマンティックに無い`;
  }
  if (/^(['"`])/.test(v) || /^-?[0-9]/.test(v)) return `生の値 ${v}`;
  return `読めない値 ${v}（変数・呼び出し・三項・展開は中身を辿れない）`;
};

/** ソース全文から違反を集める */
const findViolations = (text, allowed) => {
  const out = [];
  for (const expression of styleExpressions(text)) {
    const objects = objectsIn(expression);
    if (objects.length === 0) {
      out.push({ key: 'style', why: `オブジェクトが無い（${expression.replace(/\s+/g, ' ').slice(0, 40)}）` });
      continue;
    }
    for (const body of objects) {
      for (const entry of splitTop(body, ',')) {
        if (!entry.trim()) continue;
        const [rawKey, rawValue] = splitTop(entry, ':');
        if (rawValue === undefined) {
          out.push({ key: entry.trim(), why: '鍵と値に分けられない（展開は中身を辿れない）' });
          continue;
        }
        const key = keyOf(rawKey);
        const why = judge(key, rawValue, allowed);
        if (why) out.push({ key, why });
      }
    }
  }
  return out;
};

/* ============================================================
   名前表
   ============================================================ */

if (!existsSync(LAYERS)) {
  console.error(`${LAYERS} がありません。先に pnpm build:tokens を実行してください。`);
  process.exit(1);
}

const layers = JSON.parse(readFileSync(LAYERS, 'utf8'));
const allowed = new Set([...layers.semantics, ...layers.inputs]);
if (layers.semantics.length === 0 || layers.inputs.length === 0) {
  console.error('名前表が空です。生成が壊れています。');
  process.exit(1);
}

/* ============================================================
   対照 — 落ちる側と通る側の両方を当てる（教訓2）
   ============================================================ */

const SEMANTIC = '--sg-color-accent';
const INPUT = '--sg-gauge-duration';
const PRIMITIVE = layers.primitives[0];
for (const [name, set] of [
  [SEMANTIC, allowed],
  [INPUT, allowed],
]) {
  if (!set.has(name)) {
    console.error(`対照が使う名前 ${name} が名前表にありません。対照を書き直してください。`);
    process.exit(1);
  }
}

/** 落ちるべき書き方 */
const FIRES = [
  ['生の寸法', 'style={{ maxWidth: 460 }}'],
  ['単位つきの生の寸法', "style={{ gap: '16px' }}"],
  ['生の色', "style={{ color: '#fff' }}"],
  ['プリミティブ参照', `style={{ color: 'var(${PRIMITIVE})' }}`],
  ['名前表に無い差し込み口', "style={{ '--sg-guage-duration': '200ms' }}"],
  ['変数', 'style={{ padding: gap }}'],
  ['展開', 'style={{ ...outside }}'],
  ['オブジェクトを渡さない', 'style={outside}'],
];

/** 通すべき書き方。**落ちる側だけを並べると、通すはずのものが落ちても気づけない**（教訓2） */
const PASSES = [
  ['キーワード', "style={{ display: 'grid', justifyContent: 'space-between' }}"],
  ['セマンティック参照', `style={{ color: 'var(${SEMANTIC})' }}`],
  ['差し込み口へ流す', `style={{ '${INPUT}': \`\${duration}ms\` }}`],
  ['0 と undefined', 'style={{ margin: 0, opacity: undefined }}'],
  ['三項ごしの差し込み口', `style={n ? ({ '${INPUT}': '200ms' }) : undefined}`],
];

for (const [name, source] of FIRES) {
  if (findViolations(source, allowed).length === 0) {
    console.error(`対照が外れた: 「${name}」を落とせていない\n  ${source}`);
    process.exit(1);
  }
}
for (const [name, source] of PASSES) {
  const found = findViolations(source, allowed);
  if (found.length > 0) {
    console.error(`対照が外れた: 「${name}」を落としている\n  ${source}\n  → ${found[0].why}`);
    process.exit(1);
  }
}

/* ============================================================
   本体
   ============================================================ */

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && TARGET_EXT.test(f))
  .filter((f) => !EXCLUDED.some((e) => e.re.test(f)))
  .filter((f) => existsSync(f));

if (files.length === 0) {
  console.error('検査対象が1件もありません。対象の集め方が壊れています。');
  process.exit(1);
}

const violations = [];
for (const file of files) {
  for (const v of findViolations(readFileSync(file, 'utf8'), allowed)) {
    violations.push({ file, ...v });
  }
}

if (violations.length > 0) {
  console.error('style 属性に生の値があります（原則1、Issue #258）。\n');
  for (const v of violations) console.error(`  ✗ ${v.file}  ${v.key}: ${v.why}`);
  console.error(
    '\n許されるのは次の形だけです。' +
      `\n  var(--sg-{セマンティック})   名前表のセマンティック ${layers.semantics.length} 個と差し込み口 ${layers.inputs.length} 個` +
      "\n  キーワード                   'grid' のように英小文字とハイフンだけのもの" +
      '\n  0 / undefined' +
      '\n  `--sg-*` を鍵にした値        差し込み口へ流す形' +
      '\n\nクラスで書けるものはクラスで書いてください。' +
      '\n正当な用があって落ちた場合は、理由を書いて EXCLUDED に足します。',
  );
  process.exit(1);
}

console.log(
  `✓ style に生の値なし（対照 ${FIRES.length + PASSES.length} 件が期待どおり：` +
    `落ちる側 ${FIRES.length}・通る側 ${PASSES.length}）`,
);
console.log(`${files.length} ファイルを検査（除外 ${EXCLUDED.length} 規則。例は対象外）`);
