/**
 * Tailwind のクラス名に当てる規則。**2つの検査が共有する。**
 *
 *   check:token-usage        ソースの class 属性と @apply を読む（書き方を見る）
 *   check:component-classes  生成された CSS のセレクタを読む（出力を見る）
 *
 * **写しを作らない。** 同じ規則が2箇所にあると、片方だけ直したときに
 * 「片道だけが安全」になる。面（決定5-12）でも hover（決定5-13）でも
 * 不透明度（決定1-15）でも退けてきた形である。
 *
 * ここにあるのは**判定だけ**で、どこから文字列を取るかは呼ぶ側が決める。
 */
import { readFileSync } from 'node:fs';

/**
 * class トークンとして許す形。
 * 英数字と、Tailwind が修飾に使う記号だけ。**許可リストは狭いほど強い**ので、
 * 使われる根拠のある記号しか入れない。`[` `]` `(` `)` は当然入っていない。
 *
 *   @ コンテナ変種   : 変種の区切り   / 不透明度・分数   . 小数   ! important   * 全子要素   - 負値
 */
export const ALLOWED_CLASS_TOKEN = /^[A-Za-z0-9_@:.\/!*-]+$/;

/**
 * スケールを持つ次元の**素の数値ユーティリティ**（決定3-5、Issue #55）。
 *
 * v4 には**テーマを参照しない素の数値**があり、`--*: initial` では止まらない。
 * `duration-137` は決定1-6 のスケールを、`border-4` は決定1-7 のスケールを素通りする。
 * `p-5` と同じ性質の穴だが、**`@theme` では構造的に止められない。lint でしか塞げない。**
 *
 * 対象は**スケールを持つ次元だけ**である。`z-42` `order-9` `grid-cols-13`
 * `rotate-17` `scale-77` `skew-9` `col-span-13` `row-span-7` `aspect-3/4` は
 * スケールを持っていない次元であり、トークンの管轄ではない（原則7。観測してから決める）。
 * **`opacity-*` はここではなく FORBIDDEN_BARE が見る。** 観測してから決めた結果が
 * 「持たない」だった次元で、段の外の値ではなく次元そのものを弾く（決定1-15）。
 *
 * 許す数値は**生成した theme.css から取る。** 手で並べると写像を増やしたときにずれる。
 */
export const SCALED_BARE = [
  {
    // border-4 / border-t-4 / border-x-4 …。方向つきも同じ名前空間を使う（実測）
    re: /^border(?:-[trblxyse])?-(\d+(?:\.\d+)?)$/,
    namespace: /^\s*--border-width-([0-9.\\\\]+)\s*:/gm,
    dimension: 'border-width（決定1-7）',
  },
  {
    re: /^duration-(\d+(?:\.\d+)?)$/,
    namespace: /^\s*--transition-duration-([0-9.\\\\]+)\s*:/gm,
    dimension: 'duration（決定1-6）',
  },
  {
    re: /^delay-(\d+(?:\.\d+)?)$/,
    namespace: /^\s*--transition-delay-([0-9.\\\\]+)\s*:/gm,
    dimension: 'duration（決定1-6）',
  },
  {
    re: /^outline-(\d+(?:\.\d+)?)$/,
    namespace: /^\s*--outline-width-([0-9.\\\\]+)\s*:/gm,
    dimension: 'border-width（決定1-7）',
  },
  {
    re: /^ring-(\d+(?:\.\d+)?)$/,
    namespace: /^\s*--ring-width-([0-9.\\\\]+)\s*:/gm,
    dimension: 'border-width（決定1-7）',
  },
];

/**
 * **持たないと決めた次元の素の数値ユーティリティ**（決定1-15）。
 *
 * `SCALED_BARE` は「スケールを持つ次元の、段の外の値」を弾く。こちらは逆で、
 * **スケールを持たないと決めた次元そのもの**を弾く。
 *
 * 不透明度がそれである。中間の値は「色を薄める」ことであり、前景と背景を同時に
 * 下地へ寄せるのでコントラスト保証の外へ出る（決定1-15）。
 *
 * **素の CSS の経路とそろえるために要る。** `check:sample-page` が
 * `opacity: 0.88` を落とすのに `opacity-88` が書けると、
 * **同じものに2つの道があって片方だけが安全**という形になる。
 *
 * `opacity-0` と `opacity-100` は「見えない / 見える」であって薄めではないので許す。
 */
export const FORBIDDEN_BARE = [
  {
    re: /^opacity-(\d+)$/,
    allow: (v) => v === '0' || v === '100',
    dimension: '不透明度（決定1-15）',
  },
];

/**
 * **`0` はスケールの外の値ではない。**「無し」である。
 *
 * `border-0` `ring-0` は境界や輪郭を消す書き方で、`--sg-space-0: 0` が段として
 * 存在するのと同じ性質を持つ。段の外の値を弾く検査が、**消す手段まで奪ってはいけない。**
 */
export const IS_ABSENCE = (value) => Number(value) === 0;

/** 変種（`md:` `hover:`）と負号を落として、素のユーティリティ名だけにする */
export const bareName = (token) => token.split(':').pop().replace(/^-/, '');

/**
 * 生成した theme.css から、判定に要る事実を読む。
 * **手で並べない。** 写像を増やしたときにずれる。
 */
export const rulesFrom = (themeCssPath) => {
  const themeCss = readFileSync(themeCssPath, 'utf8');

  /**
   * 色の役割の名前。**`@utility` の宣言から取る**（決定6-10）。
   *
   * 以前は `@theme` の `--color-*` から取っていたが、色を `@theme` に載せるのをやめた。
   * 載せると1つの役割から 23 個のユーティリティが生成され、**決定3-2 が禁じた
   * アルファ修飾子まで作られる**ためである。
   *
   * `@utility text-accent {` → `accent`。同じ名前が複数の接頭辞で出るので重複を落とす。
   * これに `/` 修飾子が付いた形（`text-accent/50`）を落とす。
   *
   * **生成されなくなっても、書けてしまうことに変わりはない。**
   * 書いても何も起きず、エラーも出ない（教訓4）ので、ソースの側で落とす価値はむしろ増えた。
   */
  const colorNames = [
    ...new Set(
      [...themeCss.matchAll(/^@utility\s+(?:bg|text|border|outline|fill|stroke)-([a-z0-9-]+)\s*\{/gm)].map(
        (m) => m[1],
      ),
    ),
  ];

  const scaledAllowed = SCALED_BARE.map((r) => ({
    ...r,
    // 鍵の小数点は CSS の識別子としてエスケープされている（--transition-duration-141\.4）。
    // クラス名の側は `duration-141.4` なので、突き合わせる前に外す
    allowed: new Set([...themeCss.matchAll(r.namespace)].map((m) => m[1].replace(/\\/g, ''))),
  }));

  /**
   * **アルファ修飾子は色の値を変える**（決定3-2 改訂）。
   *
   * `text-accent/50` は `color-mix(in oklab, var(--color-accent) 50%, transparent)` に
   * 展開され、前景だけが下地へ寄る。**`opacity: 0.5` と結果は同じ**である。
   * 決定1-15 の測定によれば、どの役割も 4.5:1 を割らない α は 1.000 なので、
   * `/99` でも割る。生成器が解いた値が、利用側の1文字で別の値になる。
   *
   * **分数と区別する。** `w-1/2` `aspect-3/4` `top-1/2` の `/` は分数であって
   * アルファではない。`/` の手前が**写像した色の役割名で終わっているか**で判定する。
   * 禁止する記号を並べるのではなく、**色の役割を列挙して当てる**（教訓5）。
   *
   * **角括弧つき（`bg-danger/[0.15]`）はここへ届かない。** `ALLOWED_CLASS_TOKEN` が
   * `[` を許さないので、手前の `arbitrary` が捕まえて先に返る。
   */
  const alphaModifier = (name) => {
    const at = name.lastIndexOf('/');
    if (at === -1) return null;
    if (!/^\d{1,3}$/.test(name.slice(at + 1))) return null;
    const head = name.slice(0, at);
    return colorNames.some((c) => head === c || head.endsWith(`-${c}`));
  };

  /**
   * class トークン1つを判定する。違反なら種類つきで返し、問題なければ空配列。
   *
   * **1つのトークンを2種類の違反として二重に報告しない。**
   * いまの規則では重ならないが、重ならないことを規則の中身に依存させない。
   */
  const classify = (token) => {
    if (!ALLOWED_CLASS_TOKEN.test(token)) return [{ kind: 'arbitrary', what: token }];

    const name = bareName(token);
    if (alphaModifier(name)) return [{ kind: 'alpha', what: token }];

    const out = [];
    for (const rule of FORBIDDEN_BARE) {
      const m = rule.re.exec(name);
      if (!m || rule.allow(m[1])) continue;
      out.push({ kind: 'no-scale', what: token, dimension: rule.dimension });
    }
    for (const rule of scaledAllowed) {
      const m = rule.re.exec(name);
      if (!m || rule.allowed.has(m[1]) || IS_ABSENCE(m[1])) continue;
      out.push({ kind: 'bare-number', what: token, dimension: rule.dimension });
    }
    return out;
  };

  return { classify, colorNames, scaledAllowed };
};

/** 違反の種類ごとの説明。**2つの検査で同じ言葉を使う** */
export const CLASS_MESSAGE = {
  arbitrary: 'Tailwind の任意値記法です。スケール外の値を書けてしまいます（決定3-1）',
  'bare-number':
    'テーマを参照しない素の数値ユーティリティです。スケールを素通りします（決定3-5）。' +
    'この形は @theme では止められないので、ここでしか塞げません',
  alpha:
    'アルファ修飾子は色の値を変えます（決定3-2 改訂、Issue #85）。前景に付ければ opacity と' +
    '同じ壊れ方をし（決定1-15）、塗りに付ければ前景が面の文脈のまま残ります（決定5-12）。' +
    '生成器が解いた段をそのまま使ってください',
  'no-scale':
    '不透明度はスケールを持ちません（決定1-15）。中間の値は前景と背景を同時に下地へ寄せるので、' +
    'コントラスト保証の外へ出ます。塗りの状態変化は bg-accent-strong / bg-danger-strong、' +
    '面の状態変化は data-sg-interactive で表します（決定5-13・5-15）',
};
