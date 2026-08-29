/**
 * 生成した Tailwind アダプタが、実験で確認した挙動を実際に満たすことを検査する。
 *
 * 実験（docs/experiments/tailwind-v4-spacing.md）は「Tailwind v4 の仕様を確かめる」ものだった。
 * こちらは「**我々が生成したアダプタが期待どおりのユーティリティを出すか**」の回帰テストで、
 * 目的が違う。仕様が変わればここが落ちる。
 *
 * 検査できる範囲: 生成されるユーティリティの有無と、写像が参照する名前の実在。
 * 検査できない範囲: 実ブラウザでの見え方、任意値記法（p-[20px]）の抑止は
 *   構造では不可能で lint の担当（決定3-1）。
 *
 * ## 名前の実在を見る理由（自己レビュー B1）
 *
 * アダプタの写像は**手書きの `--sg-*` 名**である（色10件 + status/chart + 書体7件）。
 * 1文字誤ると `.font-body { font-family: var(--sg-text-body-familyy) }` が生成され、
 * **未定義の変数なので宣言が無効になり、継承した書体で表示される。**
 * Tailwind は何も言わず、ユーティリティ自体は存在するので上の検査も通る。
 * 「それらしく見える」ため目視でも気づけない（教訓4）。
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const dist = resolve('packages/tokens/dist');
for (const f of ['tokens.css', 'theme.css']) {
  if (!existsSync(join(dist, f))) {
    console.error(`${f} がありません。先に pnpm build:tokens を実行してください。`);
    process.exit(1);
  }
}

const dir = mkdtempSync(join(tmpdir(), 'sashigane-tw-'));
writeFileSync(
  join(dir, 'content.html'),
  `<div class="
    p-0 p-1 p-2 p-3 p-4 p-6 p-8 p-12 p-16 p-24
    duration-100 duration-141.4 duration-1000 delay-200 outline-2 ring-2
    p-5 p-7 p-9 p-20
    bg-red-500 bg-blue-500 bg-accent bg-danger bg-page bg-surface bg-inset
    max-w-6xl max-w-md w-2xl min-w-md
    font-medium font-bold font-light
    blur-sm backdrop-blur-md drop-shadow-lg text-shadow-lg inset-shadow-sm
    perspective-normal aspect-video aspect-square
    sm:p-4 md:p-4 lg:p-4 xl:p-4 2xl:p-4
    p-surface px-page gap-section p-page m-section
    text-body text-caption text-display text-lg text-2xl
    leading-tight leading-7 leading-normal
    rounded-sm rounded-lg rounded-xl rounded-2xl rounded-full rounded-md rounded-3xl
    shadow-lg ease-out
    font-body font-display font-label font-numeric font-code
    font-sans font-mono font-serif
    bg-sequential-1 bg-sequential-10 bg-sequential-11
  "></div>`,
);
writeFileSync(
  join(dir, 'in.css'),
  `@import "${join(dist, 'tokens.css')}";\n@import "${join(dist, 'theme.css')}";\n@source "${join(dir, 'content.html')}";\n`,
);
execFileSync('node_modules/.bin/tailwindcss', ['-i', join(dir, 'in.css'), '-o', join(dir, 'out.css')], {
  stdio: 'pipe',
});
const out = readFileSync(join(dir, 'out.css'), 'utf8');
/** 生成された CSS 中のクラスセレクタ。`:` `.` `/` `[` は CSS 側でエスケープされる */
const cssEscape = (cls) => cls.replace(/[-]/g, '\\-').replace(/[:./[\]()]/g, '\\\\$&');
const has = (cls) => new RegExp(`^\\s*\\.${cssEscape(cls)}\\s*\\{`, 'm').test(out);

/** [クラス, 生成されるべきか, 理由] */
const EXPECTATIONS = [
  ['p-4', true, 'スケールにある段（--sg-space-4 = 16px）'],
  ['p-6', true, 'スケールの 24px。Tailwind の倍数規約では 6（決定3-3）'],
  ['p-24', true, 'スケールの 96px'],
  ['p-5', false, 'スケールに無い 20px。動的生成が止まっていること（決定3-1）'],
  ['p-7', false, 'スケールに無い 28px'],
  ['p-20', false, 'スケールに無い 80px'],
  ['bg-red-500', false, '素の Tailwind の色。名前空間のリセット漏れの検出（決定3-3）'],
  ['bg-blue-500', false, '素の Tailwind の色'],
  ['bg-accent', true, 'セマンティックの写像'],
  ['bg-danger', true, 'セマンティックの写像'],
  ['text-on-accent', true, '塗りの上に載せる文字（決定5-14）'],
  ['text-on-danger', true, '状態色の塗りの上に載せる文字（決定5-14）'],
  ['bg-page', false, '面は写像しない。data-sg-surface で作る（決定5-12）'],
  ['bg-surface', false, '面は写像しない。塗るだけの道を残すと保証が静かに崩れる'],
  ['bg-inset', false, '面は写像しない'],
  ['bg-overlay', false, '面は写像しない。overlay も data-sg-surface で作る（決定5-13）'],
  ['bg-hover', false, 'hover の面も写像しない。data-sg-interactive で作る（決定5-13）'],
  ['border-border-strong', true, '境界の第3段。hover 以外の強調で使う（決定5-13）'],
  ['bg-chart-gridline', true, 'UI の境界より薄い第4の段（決定5-13）'],
  ['text-body', true, 'セマンティック役割名（決定3-3）'],
  ['text-lg', false, '素の t シャツ語彙。値が一致しないので写像していない'],
  ['text-2xl', false, '素の t シャツ語彙'],
  ['leading-tight', false, '行高の上書き手段が消えていること（決定1-4）'],
  ['tracking-tight', false, '素の t シャツ語彙。字間はサイズから導出される（決定1-9）'],
  ['tracking-wide', false, '素の t シャツ語彙'],
  ['tracking-caps', true, '大文字化の加算項。サイズと直交する唯一の字間（決定1-9）'],
  ['leading-7', false, '--spacing 由来の動的な行高も消えていること'],
  ['rounded-sm', true, '4px。素の Tailwind と値が一致する'],
  ['rounded-2xl', true, '16px。素の Tailwind と値が一致する'],
  ['rounded-full', true, 'ピルは段ではなく別カテゴリ（決定1-5）'],
  ['rounded-md', false, '6px。対応する段が無いので定義していない'],
  /* border-width（決定1-7）。名前は px に合わせるので素の Tailwind と値が一致する */
  ['border-1', true, 'スケールの 1px'],
  ['border-2', true, 'スケールの 2px'],
  ['border-3', true, 'スケールの 3px'],
  ['border-t-3', true, '方向つきも同じ名前空間を使う（実測）'],
  /*
   * **border-4 は生成されてしまう。** 段の外の素の数値は @theme では止められない。
   * ここは「生成されない」ことを期待できない。塞ぐのは check:token-usage（決定3-5）
   */
  ['border-4', true, '段の外だが Tailwind が素の px で作る。lint でしか塞げない'],
  /* 幅は border-width と同じ次元。決定1-7 が「2 = フォーカスリング」と書いている */
  ['outline-2', true, 'フォーカスリングの幅（決定1-7）'],
  ['ring-2', true, 'フォーカスリングの幅（決定1-7）'],
  /* duration（決定1-6）。名前は ms に合わせる。**小数の鍵も使える**（実測） */
  ['duration-100', true, '遷移スケールの下端'],
  ['duration-141.4', true, '√2 刻みの段。小数の鍵が使える'],
  ['duration-1000', true, 'ループスケールの中央'],
  ['delay-200', true, '写像していないので素の 200ms。観測ゼロ（原則7）。lint が弾く'],
  ['rounded-3xl', false, '24px。対応する段が無い'],
  ['shadow-lg', false, '影は未実装。名前空間をリセットしている'],
  /*
   * 動き（決定1-14）。**animate-* は1つも写像しない。**
   * 骨組み表示は data-sg-skeleton で作る。ユーティリティも用意すると、
   * Tailwind の経路だけが prefers-reduced-motion を尊重しなくなる
   */
  ['animate-skeleton', false, '骨組み表示は data-sg-skeleton で作る（決定1-14）'],
  ['animate-pulse', false, '素の Tailwind の動き。名前空間をリセットしている'],
  ['animate-spin', false, '観測1本。原則7 の3回に届かない'],
  ['motion-reduce:animate-none', true, '変種なので素で通る。トークンの写像ではない'],
  ['ease-in-out', true, 'CSS の組み込み語をそのまま戻した（値は持たない）'],
  ['ease-linear', true, '静的ユーティリティ。リセットの影響を受けない'],
  ['font-body', true, '書体のセマンティック役割（決定1-11）'],
  ['font-display', true, '書体のセマンティック役割'],
  ['font-label', true, '書体のセマンティック役割'],
  ['font-numeric', true, 'サイズと直交する書体役割'],
  ['font-code', true, 'サイズと直交する書体役割'],
  ['font-sans', false, '素の Tailwind の書体。--font-* のリセット漏れの検出'],
  ['font-mono', false, '素の Tailwind の書体'],
  ['font-serif', false, '素の Tailwind の書体'],
  ['bg-sequential-1', true, '連続値の色帯。離散系列とは別の役割（決定5-11）'],
  ['bg-sequential-10', true, '帯の反対の端。面の段を除いた10段'],
  ['bg-sequential-11', false, '10段しかない。存在しない段は名前も存在しない'],

  /* ---- 列挙し忘れていた名前空間（#44）。--*: initial で落ちること ----
   *
   * 以前はリセットを10個手で並べており、ここに挙げた9つの名前空間が
   * **素の Tailwind の値のまま通っていた。** 検査も手書きの期待値表だったので、
   * 列挙していない名前空間は検査対象にすらならなかった（教訓5）。
   */
  ['max-w-6xl', false, '--container-*。素の Tailwind の 72rem が通っていた'],
  ['max-w-md', false, '--container-*'],
  ['w-2xl', false, '--container-*'],
  ['min-w-md', false, '--container-*'],
  /* 太さ（決定1-13）。素の t シャツ語彙は落とし、役割名だけを出す */
  ['font-bold', false, '素の t シャツ語彙。太さは役割で書く（決定1-13）'],
  ['font-medium', false, '素の t シャツ語彙'],
  ['font-light', false, '素の t シャツ語彙。300 は観測ゼロ'],
  ['font-base', true, '太さの役割。既定 400'],
  ['font-emphasis', true, '太さの役割。既定 500'],
  ['font-heading', true, '太さの役割。既定 600'],
  ['font-strong', true, '太さの役割。既定 700'],
  ['blur-sm', false, '--blur-*。elevation と同じく未実装（決定1-8）'],
  ['backdrop-blur-md', false, '--blur-*'],
  ['drop-shadow-lg', false, '--drop-shadow-*'],
  ['text-shadow-lg', false, '--text-shadow-*'],
  ['inset-shadow-sm', false, '--inset-shadow-*'],
  ['perspective-normal', false, '--perspective-*'],
  ['aspect-video', false, '--aspect-*。媒体の比率であってトークンではない'],
  ['aspect-square', true, '静的ユーティリティ（aspect-ratio: 1/1）。テーマ由来ではないので落ちない'],

  /* breakpoint は写像する。--*: initial は responsive variant も落とすので、
     写像しないと sm: が1つも書けなくなる（決定1-10） */
  ['sm:p-4', true, 'breakpoint を写像している（決定1-10）'],
  ['md:p-4', true, 'breakpoint を写像している'],
  ['lg:p-4', true, 'breakpoint を写像している'],
  ['xl:p-4', true, 'breakpoint を写像している'],
  ['2xl:p-4', false, '4段しか持たない。存在しない段は名前も存在しない'],

  /* 骨格の余白の役割（決定1-12）。密度で段が動くので、値ではなく役割で書く */
  ['p-surface', true, '面の内側。密度で段が動く'],
  ['px-page', true, 'ページの左右余白'],
  ['gap-section', true, 'セクション間の縦リズム'],
  ['p-page', true, 'spacing 名前空間なので方向を問わず使える'],
  ['m-section', true, 'margin にも同じ役割が使える'],
];

const failures = [];

/* ---------- 写像が参照する --sg-* がすべて実在すること（自己レビュー B1） ----------
 *
 * 許すのは tokens.css が宣言している名前と、利用側が差す口（決定2-7）の2種。
 * 口は宣言が無いのが正常なので、名前表から取る。
 */
let mappedNames = 0;
{
  const themeCss = readFileSync(join(dist, 'theme.css'), 'utf8');
  const tokensCss = readFileSync(join(dist, 'tokens.css'), 'utf8');
  const layersPath = join(dist, 'tokens.layers.json');
  if (!existsSync(layersPath)) {
    console.error(`${layersPath} がありません。先に pnpm build:tokens を実行してください。`);
    process.exit(1);
  }
  const known = new Set([
    ...[...tokensCss.matchAll(/^\s*(--sg-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]),
    ...JSON.parse(readFileSync(layersPath, 'utf8')).inputs,
  ]);
  const referenced = new Set(
    [...themeCss.matchAll(/var\(\s*(--sg-[a-z0-9-]+)/g)].map((m) => m[1]),
  );
  mappedNames = referenced.size;
  if (referenced.size === 0) {
    failures.push('theme.css が --sg-* を1つも参照していない。@theme inline の写像が空');
  }
  for (const name of referenced) {
    if (!known.has(name)) {
      failures.push(
        `theme.css が tokens.css に無い ${name} を参照している。` +
          '未定義の変数は宣言を無効にするだけで、エラーにならない',
      );
    }
  }
}

/* ---------- 利用側がアプリ固有の寸法を足せること（決定1-10） ----------
 *
 * 決定1-10 は container 幅などのアプリ固有寸法を**利用側の責務**としている。
 * `--*: initial` は素の Tailwind の名前も落とすので、
 * **利用側が自分で名前を足す道が実際に通ることを確かめておく。**
 *
 * ここが落ちたら、決定1-10 が言う「利用側の責務」を果たす手段が無くなっている。
 */
{
  /*
   * **主検査とは別のディレクトリに置く。** Tailwind は入力 CSS と同じ
   * ディレクトリを自動走査するので、同居させると互いのフィクスチャを拾う。
   * この検査を書く途中で、実際に自動走査による汚染へ2度引っかかった。
   */
  const consumerDir = mkdtempSync(join(tmpdir(), 'sashigane-tw-consumer-'));
  writeFileSync(
    join(consumerDir, 'consumer.html'),
    `<div class="
      p-4 p-5
      w-sidebar max-w-content
      h-chart max-h-scroll
    "></div>`,
  );
  writeFileSync(
    join(consumerDir, 'consumer.css'),
    `@import "${join(dist, 'tokens.css')}";\n` +
      `@import "${join(dist, 'theme.css')}" source(none);\n` +
      // 幅は --container-*、高さは --spacing-* に足す。
      // **高さ専用の名前空間は v4 に存在しない**（実測）
      '@theme {\n' +
      '  --container-content: 72rem;\n' +
      '  --container-sidebar: 16rem;\n' +
      '  --spacing-chart: 21.25rem;\n' +
      '  --spacing-scroll: 16rem;\n' +
      '}\n' +
      `@source "${join(consumerDir, 'consumer.html')}";\n`,
  );
  execFileSync(
    'node_modules/.bin/tailwindcss',
    ['-i', join(consumerDir, 'consumer.css'), '-o', join(consumerDir, 'consumer.out.css')],
    { stdio: 'pipe' },
  );
  const consumerOut = readFileSync(join(consumerDir, 'consumer.out.css'), 'utf8');
  const consumerHas = (cls) =>
    new RegExp(`^\\s*\\.${cssEscape(cls)}\\s*\\{`, 'm').test(consumerOut);

  for (const cls of ['w-sidebar', 'max-w-content', 'h-chart', 'max-h-scroll']) {
    if (!consumerHas(cls)) {
      failures.push(
        `利用側が @theme で足した ${cls} が生成されない。` +
          'アプリ固有寸法を利用側の責務とする決定1-10 が成立しない',
      );
    }
  }
  // 足せることと、こちらの制約が緩むことは別である
  if (consumerHas('p-5')) {
    failures.push('利用側が寸法を足すと p-5 まで書けるようになっている（決定3-1 が壊れた）');
  }
  if (!consumerHas('p-4')) {
    failures.push('利用側が @theme を足すとこちらの spacing が消える');
  }
}

/* ---------- 出力の theme レイヤーに、我々が写像していない変数が無いこと ----------
 *
 * 上の EXPECTATIONS は「このクラスが出ないこと」を並べた**禁止リスト**である。
 * 並べ忘れたものは検査対象にならない（教訓5）。
 *
 * こちらは許可リスト。Tailwind が出力する `@layer theme` の中身を、
 * **アダプタが宣言した名前の集合と突き合わせる。**
 * リセットが効いていなければ素の Tailwind の変数がここに現れる。
 */
{
  const themeCss = readFileSync(join(dist, 'theme.css'), 'utf8');
  const declared = new Set(
    [...themeCss.matchAll(/^\s*(--[a-z0-9-]+(?:--[a-z0-9-]+)?)\s*:/gm)].map((m) => m[1]),
  );
  declared.delete('--*');
  const layer = /@layer theme\s*\{([\s\S]*?)\n\}/.exec(out);
  if (!layer) {
    failures.push('出力に @layer theme が無い。アダプタの写像が空の可能性がある');
  } else {
    const emitted = [
      ...new Set(
        [...layer[1].matchAll(/(--[a-z0-9-]+(?:--[a-z0-9-]+)?)\s*:/g)].map((m) => m[1]),
      ),
    ];
    for (const name of emitted) {
      if (!declared.has(name)) {
        failures.push(
          `theme レイヤーに ${name} が出ている。アダプタは宣言していないので、` +
            'リセットが効いていない（素の Tailwind の値が残っている）',
        );
      }
    }
    if (emitted.length === 0) {
      failures.push('theme レイヤーが空。写像が1件も効いていない');
    }
  }
}

/* ---------- breakpoint が静的な長さで出ていること（教訓4） ----------
 *
 * 他の名前空間と揃えて `--breakpoint-sm: var(--sg-breakpoint-sm)` と書くと、
 * Tailwind は `@media (width >= var(--sg-breakpoint-sm))` を出す。
 * **これは無効な CSS で、ブラウザはメディアクエリごと無視する。**
 * ユーティリティ自体は生成されるので上の EXPECTATIONS は通ってしまい、
 * 見た目も「レスポンシブが効かない」だけなので気づけない。
 */
{
  const mediaQueries = [...out.matchAll(/@media\s*\([^)]*width[^)]*\)/g)].map((m) => m[0]);
  if (mediaQueries.length === 0) {
    failures.push('responsive variant のメディアクエリが1つも出ていない');
  }
  for (const q of mediaQueries) {
    if (q.includes('var(')) {
      failures.push(
        `メディアクエリが CSS 変数を参照している: ${q}。` +
          '無効な CSS なのでブラウザは無視する。--breakpoint-* は値を直接書くこと',
      );
    }
  }
}

for (const [cls, expected, why] of EXPECTATIONS) {
  const actual = has(cls);
  if (actual !== expected) {
    failures.push(`${cls}: ${expected ? '生成されるはず' : '生成されないはず'}だが ${actual ? 'ある' : 'ない'} — ${why}`);
  }
}

/* font-numeric は書体と tabular が必ず対で出ること（決定1-11）。
   Tailwind v4.3.3 に --font-*--font-variant-numeric 修飾子は無く、
   font-feature-settings でしか束ねられない（docs/experiments/font-family.md） */
const numeric = /\.font-numeric\s*\{([^}]*)\}/m.exec(out)?.[1] ?? '';
if (!/font-family:\s*var\(--sg-text-numeric-family\)/.test(numeric)) {
  failures.push('font-numeric が --sg-text-numeric-family を参照していない');
}
if (!/font-feature-settings:\s*var\(--sg-font-feature-tabular\)/.test(numeric)) {
  failures.push('font-numeric に等幅数字の指定が伴っていない。書体だけが当たると桁が揃わない');
}

/*
 * **書体の役割と太さの役割が同じ font-* を取り合っていないこと**（決定1-13）。
 *
 * Tailwind では `--font-*`（書体）と `--font-weight-*`（太さ）が**どちらも
 * `font-{名前}` を作る。** 名前が衝突すると、片方が生成されないか、
 * 生成された規則の中身が入れ替わる。**どちらもエラーにならない**（教訓4）。
 *
 * クラスが「出たか」だけを見る EXPECTATIONS では捕まらないので、
 * **規則の中身**を見る。
 */
{
  const bodyOf = (cls) => /\{([^}]*)\}/.exec(out.slice(out.search(new RegExp(`^\\s*\\.${cls}\\s*\\{`, 'm'))))?.[1] ?? '';
  // **名前は生成物から取る。** 手で並べると、役割を増やしたときに検査から漏れる
  const themeCss = readFileSync(join(dist, 'theme.css'), 'utf8');
  const declared = (re) => [...themeCss.matchAll(re)].map((m) => m[1]);
  const weightNames = declared(/^\s*--font-weight-([a-z0-9-]+)\s*:/gm);
  // `--font-numeric--font-feature-settings` のような**修飾子**は名前ではない。
  // Tailwind の `--{名前空間}-{名前}--{プロパティ}` の形なので、`--` を含むものを外す
  const familyNames = declared(/^\s*--font-((?!weight-)[a-z0-9-]+)\s*:/gm).filter(
    (n) => !n.includes('--'),
  );
  if (weightNames.length === 0 || familyNames.length === 0) {
    failures.push('書体または太さの役割が theme.css に1つも無い');
  }
  for (const name of familyNames) {
    const b = bodyOf(`font-${name}`);
    if (!/font-family:/.test(b)) {
      failures.push(`font-${name} が書体を当てていない（太さの役割名と衝突した可能性）`);
    }
    if (/font-weight:/.test(b)) {
      failures.push(`font-${name} に太さが混ざっている。--font-weight-${name} と衝突している`);
    }
  }
  for (const name of weightNames) {
    const b = bodyOf(`font-${name}`);
    if (!/font-weight:/.test(b)) {
      failures.push(`font-${name} が太さを当てていない（書体の役割名と衝突した可能性）`);
    }
    if (/font-family:/.test(b)) {
      failures.push(`font-${name} に書体が混ざっている。--font-${name} と衝突している`);
    }
  }
}

/*
 * **写像した段が我々の値を指していること**（決定1-7）。
 * 索引で写像すると border-2 が 3px になり、素の Tailwind と食い違う。
 * クラスが出たかだけでは分からないので中身を見る。
 */
for (const [cls, token] of [
  ['border-1', '--sg-border-width-0'],
  ['border-2', '--sg-border-width-1'],
  ['border-3', '--sg-border-width-2'],
  ['outline-2', '--sg-border-width-1'],
  ['ring-2', '--sg-border-width-1'],
  ['duration-100', '--sg-duration-0'],
  ['duration-141.4', '--sg-duration-1'],
  ['duration-1000', '--sg-duration-loop-1'],
]) {
  const body =
    /\{([^}]*)\}/.exec(
      out.slice(out.search(new RegExp(`^\\s*\\.${cssEscape(cls)}\\s*\\{`, 'm'))),
    )?.[1] ?? '';
  if (!new RegExp(`var\\(${token}\\)`).test(body)) {
    failures.push(`${cls} が ${token} を指していない。素の px のままか、段がずれている`);
  }
}

/*
 * **骨組み表示は tokens.css 側の1本だけ**であること（決定1-14）。
 * アダプタが animate-* を出すと、Tailwind の経路だけが
 * prefers-reduced-motion を尊重しなくなる。**出ていないことを見る。**
 */
{
  const themeCss = readFileSync(join(dist, 'theme.css'), 'utf8');
  if (/--animate-[a-z-]+\s*:/.test(themeCss)) {
    failures.push('アダプタが --animate-* を写像している。骨組み表示は data-sg-skeleton の1本にする');
  }
  if (/@keyframes/.test(themeCss)) {
    failures.push('アダプタが @keyframes を出している。tokens.css 側と重複する');
  }
}

/* preflight の既定書体が我々のものになっていること。
   --font-*: initial は素の Tailwind のスタックへ戻すので、差し替えないと
   本文だけがトークンの外側に残る。**エラーにならない**（教訓4） */
for (const [prop, token] of [
  ['--default-font-family', '--sg-text-body-family'],
  ['--default-mono-font-family', '--sg-text-code-family'],
]) {
  if (!new RegExp(`${prop}:\\s*var\\(${token}\\)|font-family:\\s*var\\(${token}`).test(out)) {
    failures.push(`preflight の ${prop} が ${token} になっていない`);
  }
}

/* --sg-* を直接参照しているか（@theme inline が効いているか） */
if (has('bg-accent') && !/\.bg-accent\s*\{[^}]*var\(--sg-color-accent\)/m.test(out)) {
  failures.push('bg-accent が --sg-* を直接参照していない。@theme inline が効いていない（決定3-2）');
}

if (failures.length) {
  console.error('Tailwind アダプタの検査に失敗しました。\n');
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`✓ 写像が参照する --sg-* ${mappedNames} 件がすべて実在する`);
console.log(`✓ ${EXPECTATIONS.length} 件のユーティリティが期待どおり`);
console.log('✓ セマンティックが --sg-* を直接参照している（@theme inline）');
