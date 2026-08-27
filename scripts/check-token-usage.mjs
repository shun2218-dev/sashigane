/**
 * コンポーネントがセマンティックしか参照していないことを検査する（原則3）。
 *
 * 検査するのは2つ。
 *   1. プリミティブ（`--sg-space-3` など）を参照していないこと
 *   2. Tailwind の任意値記法（`p-[20px]`）を使っていないこと
 *
 * ## 1 の判定方法 — 名前の形ではなく生成器の事実で判定する
 *
 * 決定2-3 は当初「`--sg-{category}-{数字}` がプリミティブ、`--sg-{category}-{単語}` が
 * セマンティック」という**1つの正規表現で判別できる**としていた。
 * 実際の出力に当てたところ両方向に破れていた（docs/agent-failures.md）。
 *
 *   偽陽性  --sg-text-heading-1 … 3、--sg-color-chart-1 … 5
 *   偽陰性  --sg-radius-full
 *
 * そこで**生成器が出す名前表**（`dist/tokens.layers.json`）を唯一の正とし、
 * 「セマンティックに載っている名前だけを許す」形で判定する。教訓5 の許可リスト方式。
 * 表に無い `--sg-*` は、プリミティブでも打ち間違いでも等しく落ちる。
 *
 * **差し込み口（inputs）も許す**（決定2-7）。書体名を差すのは利用側の正当な行為で、
 * これを落とすと `--sg-font-brand-*` が使えない。逆に書体スタックそのもの
 * （`--sg-font-stack-*`）はプリミティブなので落ちる。役割を経由させるため。
 *
 * ## 2 の判定方法
 *
 * 決定3-1 により `--spacing: initial` でスケール外の数値クラス（`p-5` 等）は
 * **構造的に生成されなくなった。** ただし抜け道は任意値記法だけではない。
 *
 * v4 には**テーマを参照しない素の数値ユーティリティ**があり、`@theme` では止まらない。
 * `duration-137` `delay-137` `z-42` `opacity-37` `rotate-17` `order-9` `grid-cols-13` など。
 * `duration-137` は決定1-6 のスケールを素通りする。**`p-5` と同じ性質の穴である。**
 *
 * **この検査もそれらを見逃す。** 下の許可集合は括弧を弾くだけなので、
 * 括弧を持たない `duration-137` は通る。対処は Issue #55 で検討する（教訓5）。
 * class 属性のトークンを「英数字と記号の許可集合」に照らし、`[` `]` `(` `)` を
 * 含むものを落とす。禁止する記法を列挙するのではなく、許す形以外を落とす。
 *
 * ## この検査が原理的に見逃す範囲（教訓5）
 *
 *   - 実行時に組み立てられる class 名。`${...}` を含む部分は静的に読めないため
 *     取り除いてから検査する。clsx / cva の変数経由も同様に見えない
 *   - CSS-in-JS、`style` 属性に直接書いた生値。トークンを経由しないので `--sg-` が現れない
 *   - 消費側が自分で `--sg-*` を**定義**した場合は「表に無い名前」として落ちるが、
 *     `--brand-blue: #3b82f6` のような別名の生値は検出できない
 *   - `className={…}` の式の中に閉じ括弧を含む文字列がある場合、式として読めないので飛ばす
 *   - 除外したファイル（下記 EXCLUDED）
 *
 * 逆に**過剰に検出する**ものが1つある。コメントに書いた `--sg-space-3` も違反として落ちる。
 * コメントだけを除くには言語ごとのパーサが要り、割に合わない。
 * 説明でプリミティブ名に触れたい場合は `--sg-space-N` のように書く。
 * **末尾が `-` で終わる一致は名前として扱わない**ので、この書き方は落ちない（Issue #63）。
 * 逃げ道が実際に効くことは陰性対照で確かめている。
 *
 * ## 検査対象は「追跡下」のファイルである
 *
 * `git ls-files` を対象にしているので、**`git add` していないファイルは検査に入らない。**
 * 生成物や作業中のファイルまで検査したくないので性質としては正しいが、
 * **「手元で緑」と「CI で緑」がずれる原因になる。**
 * Issue #63 はこれで見逃した。新しいファイルを足したら、先に `git add` する。
 *
 * ## 陰性対照
 *
 * 現時点で Tailwind を使う消費者は存在せず、2 の検出は 0 件になる。
 * **「0 件」は検査が機能していないことと区別がつかない**（教訓2）。
 * そこで実行のたびに、意図的な違反を含むフィクスチャに検出器を当て、
 * 発火することを確かめてから本体を走らせる。発火しなければこの検査自体が失敗する。
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

/* ============================================================
   検査対象
   ============================================================ */

/** 消費側のソースとして扱う拡張子 */
const TARGET_EXT = /\.(css|scss|html|tsx|jsx|ts|js|mts|mjs)$/;

/**
 * 対象から外すもの。**理由の書けない除外を足さない。**
 * 対象は「追跡下の全ソース」であり、ここに列挙したものだけを引く。
 * **追跡されたファイルは自動的に検査に入る。** 未追跡のものは入らない（上記）。
 */
const EXCLUDED = [
  {
    re: /^packages\/tokens\//,
    why: 'トークンの生成器そのもの。プリミティブ名を書くのが仕事である',
  },
  {
    re: /^scripts\//,
    why: 'この検査自身が陰性対照として違反文字列を持つ',
  },
  {
    re: /^apps\/docs\/src\/sample-page\.html$/,
    why:
      '生成した変数を使い切って見せるためのサンプルであり、コンポーネントではない（Issue #61）。' +
      'radius / duration / border-width / コンポーネント内部の余白にはセマンティックが無く（原則7）、' +
      '踏まずに LP を組むことができない。**踏んだ回数は check:sample-page が集計しており、' +
      'それ自体がセマンティックを足すかどうかの観測になる。** ' +
      '生値の色が混ざっていないことは check:sample-page が別途検査する',
  },
  {
    re: /^apps\/docs\/public\/standalone\.html$/,
    why:
      'tokens.css が単体で成立することを目で確かめる検査用フィクスチャであり、コンポーネントではない。' +
      'プリミティブが解決することを見るのが目的そのもの。' +
      'また spacing / radius / duration のセマンティックは実需要が観測されるまで定義しないと決めており（原則3・原則7）、現時点で代替が存在しない',
  },
];

/* ============================================================
   検出器（フィクスチャにも実ファイルにも同じものを当てる）
   ============================================================ */

/**
 * ソース中に現れる `--sg-*` の名前。
 *
 * **末尾が `-` の一致は捨てる**（`isName` を通す）。`--sg-space-N` `--sg-font-stack-*`
 * `--sg-space-{段}` のような**説明のための書き方**は、手前までが一致して
 * `--sg-space-` という名前を作り、表に無いので `unknown` で落ちていた。
 * 文書が案内している逃げ道が機能していなかった（Issue #63）。
 *
 * `--sg-space-` は宣言としてありえない形なので、名前として扱わないのが素直である。
 * **切り詰めない。** `--sg-space` に丸めると、それはそれで表に無い名前になる。
 */
const SG_NAME = /--sg-[a-z0-9-]+/g;

/** 宣言としてありえる形か。末尾が `-` のものは説明のための書き方である */
const isName = (n) => !n.endsWith('-');

/** class / className の始まり。値の切り出しは classValues() が続きを読む */
const CLASS_ATTR_HEAD = /\b(?:class|className)\s*=\s*/g;

/** 文字列リテラル。エスケープを跨ぐ */
const STRING_LITERAL = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;

/** SCSS / CSS 側の Tailwind 呼び出し */
const APPLY = /@apply\s+([^;{}]+)/g;

/** 実行時に埋まる部分。静的には読めない（見逃す範囲） */
const INTERPOLATION = /\$\{[^}]*\}/g;

/**
 * class トークンとして許す形。
 * 英数字と、Tailwind が修飾に使う記号だけ。**許可リストは狭いほど強い**ので、
 * 使われる根拠のある記号しか入れない。`[` `]` `(` `)` は当然入っていない。
 *
 *   @ コンテナ変種   : 変種の区切り   / 不透明度・分数   . 小数   ! important   * 全子要素   - 負値
 */
const ALLOWED_CLASS_TOKEN = /^[A-Za-z0-9_@:.\/!*-]+$/;

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/**
 * class の値を、text 内での位置つきで切り出す。
 *
 *   class="…"          属性値そのもの
 *   className={ … }    **式の中の文字列リテラルを全部拾う**
 *
 * 式を丸ごと見るのは `className={clsx('p-4', cond && 'p-[7px]')}` のように
 * ヘルパー呼び出しの中へリテラルで書かれた場合を捕まえるため。
 * 引用符が波括弧の直後に来る形だけを見ていたときは、これを見逃していた（自己レビュー B1）。
 *
 * 変数を経由した class 名（`const c = 'p-[7px]'` を渡す）は静的に読めないので依然として見逃す。
 */
const classValues = (text) => {
  const out = [];
  for (const head of text.matchAll(CLASS_ATTR_HEAD)) {
    const start = head.index + head[0].length;
    const ch = text[start];

    if (ch === '{') {
      // 対応する } を探す。テンプレートリテラルの ${ } も釣り合うので同じ数え方で足りる
      let depth = 0;
      let end = -1;
      for (let j = start; j < text.length; j++) {
        if (text[j] === '{') depth += 1;
        else if (text[j] === '}') {
          depth -= 1;
          if (depth === 0) {
            end = j;
            break;
          }
        }
      }
      // 閉じ括弧が見つからない場合（文字列の中に { がある等）は式として読めない。
      // 誤検出を出すより見逃す方を選ぶ。範囲は冒頭に申告してある
      if (end === -1) continue;
      for (const lit of text.slice(start, end + 1).matchAll(STRING_LITERAL)) {
        out.push({ raw: lit[2], at: start + lit.index + 1 });
      }
    } else if (ch === '"' || ch === "'") {
      const close = text.indexOf(ch, start + 1);
      if (close !== -1) out.push({ raw: text.slice(start + 1, close), at: start + 1 });
    }
  }
  return out;
};

/** 1. プリミティブ参照 / 表に無い名前 */
const findTokenViolations = (text, allowed, primitives) => {
  const out = [];
  for (const m of text.matchAll(SG_NAME)) {
    const name = m[0];
    // 説明のための書き方（--sg-space-N など）。宣言としてありえない形なので見ない
    if (!isName(name)) continue;
    if (allowed.has(name)) continue;
    out.push({
      kind: primitives.has(name)
        ? 'primitive'
        : internals.has(name)
          ? 'internal'
          : 'unknown',
      line: lineOf(text, m.index),
      what: name,
    });
  }
  return out;
};

/** 2. Tailwind の任意値記法 */
const findClassViolations = (text) => {
  const out = [];
  const scan = (raw, at) => {
    // 補間は取り除くが、**長さは保つ**。トークンの位置がずれると行番号がずれる（自己レビュー B2）
    const readable = raw.replace(INTERPOLATION, (m) => ' '.repeat(m.length));
    for (const token of readable.matchAll(/\S+/g)) {
      if (ALLOWED_CLASS_TOKEN.test(token[0])) continue;
      out.push({ kind: 'arbitrary', line: lineOf(text, at + token.index), what: token[0] });
    }
  };
  for (const v of classValues(text)) scan(v.raw, v.at);
  for (const m of text.matchAll(APPLY)) scan(m[1], m.index + m[0].indexOf(m[1]));
  return out;
};

const findAll = (text, allowed, primitives, internals) => [
  ...findTokenViolations(text, allowed, primitives),
  ...findClassViolations(text),
];

/* ============================================================
   名前表を読む
   ============================================================ */

const LAYERS = 'packages/tokens/dist/tokens.layers.json';
if (!existsSync(LAYERS)) {
  console.error(`${LAYERS} がありません。先に pnpm build:tokens を実行してください。`);
  process.exit(1);
}
const layers = JSON.parse(readFileSync(LAYERS, 'utf8'));
const semantics = new Set(layers.semantics);
/**
 * トークン層が自分の仕掛けのために宣言する名前（決定5-13）。参照は禁止。
 * **「名前表に無い」ではなく「参照してはいけない」として報告する。**
 * 打ち間違いと混ざると、直し方が分からない
 */
const internals = new Set(layers.internals);
const primitives = new Set(layers.primitives);
const inputs = new Set(layers.inputs);

if (
  semantics.size === 0 ||
  primitives.size === 0 ||
  inputs.size === 0 ||
  internals.size === 0
) {
  console.error(`${LAYERS} の層が空です。生成器が壊れています。`);
  process.exit(1);
}

/** 消費側が書いてよい名前。セマンティック ∪ 差し込み口（決定2-7） */
const allowed = new Set([...semantics, ...inputs]);

/* ============================================================
   陰性対照 — 検出器が発火することを毎回確かめる（教訓2）
   ============================================================ */

const FIXTURES = [
  // 落ちるべきもの
  { text: 'a { padding: var(--sg-space-3); }', expect: 'primitive' },
  { text: 'a { border-radius: var(--sg-radius-full); }', expect: 'primitive' },
  // 決定1-11: 書体スタックはプリミティブ。役割（--sg-text-*-family）を経由させる
  { text: 'a { font-family: var(--sg-font-stack-mono); }', expect: 'primitive' },
  { text: 'a { color: var(--sg-color-text-mutedd); }', expect: 'unknown' },
  // 決定5-13: hover の控えは内部の値。参照すると hover していない要素に hover の色が乗る
  { text: 'a { color: var(--sg-color-hover-text-default); }', expect: 'internal' },
  { text: 'a { background: var(--sg-color-hover-bg); }', expect: 'internal' },
  { text: '<div class="p-[20px]">', expect: 'arbitrary' },
  { text: '<div class="[mask-type:luminance]">', expect: 'arbitrary' },
  { text: '<div class="bg-(--sg-color-accent)">', expect: 'arbitrary' },
  { text: '.card { @apply gap-[7px]; }', expect: 'arbitrary' },
  { text: 'const c = <b className={"text-[13px]"} />', expect: 'arbitrary' },
  // 自己レビュー B1: ヘルパー呼び出しの中のリテラル
  { text: 'const c = <b className={clsx("p-4", on && "p-[7px]")} />', expect: 'arbitrary' },
  { text: 'const c = <b className={`p-4 ${x} gap-[9px]`} />', expect: 'arbitrary' },
  // 自己レビュー B2: 複数行にまたがる class リストで行番号がずれない
  { text: '<div\n  class="p-4\n    gap-[9px]"\n/>', expect: 'arbitrary', line: 3 },

  // 通るべきもの
  { text: 'a { color: var(--sg-color-text-muted); }', expect: null },
  /*
   * 決定1-12 の骨格の余白。**名前表への足し忘れをここで捕まえる。**
   * 実際、定義した直後は tokenLayers() に足し忘れており、参照すると unknown で
   * 弾かれる状態だった。唯一の利用箇所が検査対象外のフィクスチャだったため、
   * check:token-usage は緑のままだった（教訓2）。
   */
  { text: 'a { padding: var(--sg-space-surface); }', expect: null },
  { text: 'a { padding-inline: var(--sg-space-page); }', expect: null },
  { text: 'a { gap: var(--sg-space-section); }', expect: null },
  // 決定2-3 の正規表現が誤検出していた2件
  { text: 'h1 { font-size: var(--sg-text-heading-1); }', expect: null },
  { text: 'svg { fill: var(--sg-color-chart-1); }', expect: null },
  { text: '<div class="p-4 bg-danger hover:bg-danger/80 md:p-6">', expect: null },
  { text: 'const c = <b className={`p-4 ${extra}`} />', expect: null },
  /*
   * Issue #63: **文書が案内している逃げ道が実際に効くこと。**
   * 直す前はどれも手前まで一致して `--sg-space-` `--sg-font-stack-` を作り、
   * 表に無い名前として落ちていた。「落ちないこと」の対照が無かったので静かに壊れていた
   */
  { text: '/* 説明: --sg-space-N は段の番号 */', expect: null },
  { text: '/* 書体スタック --sg-font-stack-* はプリミティブ */', expect: null },
  { text: '// 余白は --sg-space-{段} で参照する', expect: null },
  // 決定2-7: 差し込み口へ書体名を差すのは利用側の正当な行為
  { text: ':root { --sg-font-brand-body-latin: var(--font-inter); }', expect: null },
  { text: 'p { font-family: var(--sg-text-body-family); }', expect: null },
];

const selfTestFailures = [];
for (const f of FIXTURES) {
  const found = findAll(f.text, allowed, primitives, internals);
  const kinds = found.map((v) => v.kind);
  const ok = f.expect === null ? kinds.length === 0 : kinds.includes(f.expect);
  if (!ok) {
    selfTestFailures.push(
      `期待 ${f.expect ?? '検出なし'} / 実際 ${kinds.length ? kinds.join(',') : '検出なし'}: ${f.text}`,
    );
    continue;
  }
  // 行番号を指定したフィクスチャは、位置まで合っていることを見る
  if (f.line !== undefined && found[0]?.line !== f.line) {
    selfTestFailures.push(`期待 ${f.line} 行目 / 実際 ${found[0]?.line} 行目: ${f.text}`);
  }
}

if (selfTestFailures.length) {
  console.error('陰性対照に失敗しました。**この検査は機能していません。**\n');
  for (const m of selfTestFailures) console.error(`  ✗ ${m}`);
  console.error('\n検出器を直してください。0 件という結果は信用できません（教訓2）。');
  process.exit(1);
}

/* ============================================================
   本体
   ============================================================ */

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && TARGET_EXT.test(f))
  .filter((f) => !EXCLUDED.some((e) => e.re.test(f)));

const violations = [];
for (const file of files) {
  // 追跡されているが作業ツリーには無い（削除の途中など）。検査失敗ではなく飛ばす
  if (!existsSync(file)) continue;
  for (const v of findAll(readFileSync(file, 'utf8'), allowed, primitives, internals)) {
    violations.push({ file, ...v });
  }
}

const MESSAGE = {
  primitive: 'プリミティブを参照しています。コンポーネントはセマンティックのみ参照できます（原則3）',
  unknown:
    '生成器が出力しない名前です。打ち間違いか、消費側で独自に定義した変数です' +
    '（書体名を差す口は --sg-font-brand-* だけです）',
  internal:
    'トークン層が自分の仕掛けのために宣言している値です。参照すると hover していない要素に' +
    ' hover の色が乗ります。hover の面は data-sg-interactive で作ります（決定5-13）',
  arbitrary: 'Tailwind の任意値記法です。スケール外の値を書けてしまいます（決定3-1）',
};

if (violations.length) {
  console.error('トークンの使い方に違反があります。\n');
  for (const v of violations) {
    console.error(`  ✗ ${v.file}:${v.line}  ${v.what}`);
    console.error(`    ${MESSAGE[v.kind]}\n`);
  }
  console.error(
    `許可されるのはセマンティック ${semantics.size} 個と差し込み口 ${inputs.size} 個のみ（${LAYERS}）。`,
  );
  process.exit(1);
}

// 「発火した」件数と「落ちなかった」件数を分けて出す。混ぜると、
// 通るべきものだけが増えても件数が伸びて、対照が効いているように見える（教訓2）
const fires = FIXTURES.filter((f) => f.expect !== null).length;
console.log(
  `✓ 陰性対照 ${fires} 件が期待どおり発火し、通るべき ${FIXTURES.length - fires} 件は落ちなかった`,
);
console.log(
  `✓ プリミティブ参照なし（許可: セマンティック ${semantics.size} 個 + 差し込み口 ${inputs.size} 個）`,
);
console.log(`✓ Tailwind の任意値記法なし`);
console.log(`\n${files.length} ファイルを検査（除外 ${EXCLUDED.length} 規則）`);
