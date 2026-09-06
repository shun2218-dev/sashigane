/**
 * 配信 JSON が**コピー先で成立する**ことを検査する（原則6）。
 *
 * 見るのは2つである。
 *
 *   **依存の閉じ**  1件ずつ入れたとき、参照先が全部揃うか
 *   **型の成立**    全部入れた木が、そのままコンパイルできるか
 *
 * ## なぜ1件ずつと全部の両方を見るのか
 *
 * 全部入れて1回コンパイルするだけだと、**依存の書き漏れが隠れる。**
 * 他の item が持ってきたファイルで解決してしまうためである。
 *
 * 逆に閉じだけを見ると、**型が合っているかは分からない。**
 * 1件ずつコンパイルすると 20 回近く走るので、
 * **閉じは静的に、型は全部入りで1回**という分け方にしている。
 *
 * ## 検出器に先に当てる（教訓2）
 *
 * 0 件という結果を、検査が壊れている状態と区別できるようにするため、
 * 毎回まず意図的に壊した item へ当てて、発火することを確かめる。
 */
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'apps/docs/public/r');
/*
  作業場は **packages/ui の下**に置く。依存（react の型・cva・lucide）を
  解決できる場所である必要があり、pnpm では根の node_modules に無い。

  コピー先も同じ状態である——`shadcn add` は item の dependencies を
  入れてから置くので、**同じ依存が揃った場所でコンパイルできるか**を見ている。
*/
const WORK = join(ROOT, 'packages/ui/.registry-check');

if (!existsSync(OUT)) {
  console.error(`${OUT} がありません。先に pnpm build:registry を実行してください。`);
  process.exit(1);
}

/** `@sashigane/slot` → `slot`。**素の名前は shadcn 自身のレジストリを指す** */
const localName = (dep) => dep.replace(/^@[^/]+\//, '');

const items = new Map();
for (const file of readdirSync(OUT).filter((f) => f.endsWith('.json') && f !== 'registry.json')) {
  const item = JSON.parse(readFileSync(join(OUT, file), 'utf8'));
  items.set(item.name, item);
}

const errors = [];

/* ---------- 形 ---------- */

for (const [name, item] of items) {
  if (!item.type) errors.push(`${name}: type がありません`);
  if (!Array.isArray(item.files)) errors.push(`${name}: files がありません`);
  for (const f of item.files ?? []) {
    if (!f.path || typeof f.content !== 'string') errors.push(`${name}: files の形が違います`);
    if (f.content === '') errors.push(`${name}: ${f.path} が空です`);
  }
  for (const dep of item.registryDependencies ?? []) {
    if (!dep.startsWith('@')) {
      errors.push(
        `${name}: 依存に名前空間がありません: ${dep}` +
          '（素の名前は shadcn 自身のレジストリを指すので、CLI が別物を探しに行く）',
      );
    }
    if (!items.has(localName(dep))) {
      errors.push(`${name}: 知らない item を参照しています: ${dep}`);
    }
  }
}

/* ---------- 追跡外のものが混ざっていないこと ---------- */

/*
  生成器は git に聞かずにファイルを歩く（配信先に `.git` が無いことがある）。
  **追跡外のものが混ざらないこと**は、git のあるここで見る。
*/
const trackedNames = new Set(
  execSync('git ls-files packages/ui/src', { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map((f) => f.split('/').pop()),
);

for (const [name, item] of items) {
  if (item.type !== 'registry:ui' && item.type !== 'registry:lib') continue;
  for (const f of item.files ?? []) {
    const base = f.path.split('/').pop();
    if (!trackedNames.has(base)) {
      errors.push(`${name}: 追跡外のファイルを配ろうとしています: ${f.path}`);
    }
  }
}

/* ---------- 依存の閉じ ---------- */

/** その item を入れたときに置かれるファイルの一覧（依存を辿って集める） */
const closureOf = (name, seen = new Set()) => {
  if (seen.has(name)) return new Map();
  seen.add(name);
  const item = items.get(name);
  const files = new Map();
  for (const f of item.files ?? []) files.set(f.target ?? f.path, f.content);
  for (const dep of item.registryDependencies ?? []) {
    for (const [p, c] of closureOf(localName(dep), seen)) files.set(p, c);
  }
  return files;
};

/** `@/components/ui/button` → `components/ui/button` */
const ALIAS = /from '@\/([^']+)'/g;

/** 参照先が閉じの中にあるか。**拡張子はソースが持っていない** */
const unresolved = (files) => {
  const missing = [];
  for (const [path, content] of files) {
    for (const [, spec] of content.matchAll(ALIAS)) {
      const found = ['.ts', '.tsx', ''].some((ext) => files.has(`${spec}${ext}`));
      if (!found) missing.push(`${path} → @/${spec}`);
    }
  }
  return missing;
};

// 対照。**発火することを確かめてから 0 件と言う**（教訓2）
const brokenClosure = new Map([
  ['components/ui/a.tsx', "import { B } from '@/components/ui/b';\n"],
]);
if (unresolved(brokenClosure).length === 0) {
  console.error('陽性対照が落ちた: 参照先の無い import を見逃した');
  process.exit(1);
}
const wholeClosure = new Map([
  ['components/ui/a.tsx', "import { B } from '@/components/ui/b';\n"],
  ['components/ui/b.tsx', 'export const B = 1;\n'],
]);
if (unresolved(wholeClosure).length > 0) {
  console.error('陰性対照が発火した: 揃っている閉じを欠けと報告した');
  process.exit(1);
}

for (const [name] of items) {
  const missing = unresolved(closureOf(name));
  for (const m of missing) {
    errors.push(`${name} を1件だけ落とすと参照先が足りません: ${m}`);
  }
}

/* ---------- 仕組みは見た目を連れてこない（決定6-27 改訂） ---------- */

/**
 * **hook を入れたときに、部品が付いてこないこと。**
 *
 * hooks を切り出した理由は「見た目を使わずに仕組みだけ使う場面がある」である。
 * hook から部品への import が1本入るだけで、**閉じに部品が混ざり、理由が消える。**
 * 閉じは揃ったままなので、**依存の検査では捕まらない。**
 *
 * 置き場所で見る。`registry:hook` の閉じに `components/ui/` のファイルが
 * 現れたら、そこで見た目を連れてきている。
 */
const dragsUi = (files) => [...files.keys()].filter((p) => p.startsWith('components/ui/'));

// 対照（教訓2）
if (dragsUi(new Map([['hooks/use-x.ts', ''], ['components/ui/x.tsx', '']])).length === 0) {
  console.error('陽性対照が落ちた: 仕組みが見た目を連れているのを見逃した');
  process.exit(1);
}
if (dragsUi(new Map([['hooks/use-x.ts', ''], ['lib/store.ts', '']])).length > 0) {
  console.error('陰性対照が発火した: 見た目を連れていない閉じを連れていると報告した');
  process.exit(1);
}

const hooks = [...items].filter(([, i]) => i.type === 'registry:hook');
for (const [name] of hooks) {
  for (const p of dragsUi(closureOf(name))) {
    errors.push(`${name} を入れると見た目が付いてきます: ${p}`);
  }
}

/* ---------- 部品は自分の仕組みを引く（決定6-27 改訂） ---------- */

/**
 * **`modal.tsx` は `use-modal.ts` を import していない。**
 * 依存を import から数えているので、放っておくと部品から hook が消える。
 *
 * 例も型表も `useModal` で書いてあるので、**部品だけ入れた利用者は
 * 書いてあるとおりに書けない。** 明示的に引いていることをここで見る。
 */
for (const [hookName] of hooks) {
  const owner = hookName.replace(/^use-/, '');
  if (!items.has(owner)) continue;
  const deps = (items.get(owner).registryDependencies ?? []).map(localName);
  if (!deps.includes(hookName)) {
    errors.push(`${owner} が ${hookName} を引いていません（部品だけ入れると仕組みが来ません）`);
  }
}

/* ---------- ページが依存を隠していないこと（Issue #252） ---------- */

/**
 * **配信 JSON が持つ依存は、そのコンポーネントのページに名前が出ていること。**
 *
 * カルーセルのページは「依存を1つ持ちます（`embla-carousel-react`）」と書いていたが、
 * 実際には `embla-carousel-autoplay` も入る。**入れた人は名前も知らないまま
 * パッケージが1つ増える。**
 *
 * ## 向きに注意する
 *
 * 逆（ページに出た名前が依存であること）は検査できない。ページは
 * `react-hook-form` のような**依存ではない相手**にも触れる——「組めます」という話で、
 * 依存として配ってはいない。**名前が出ていることは依存の証拠にならない。**
 *
 * ## この検査が見ていないこと（教訓5）
 *
 * **推移的な依存は見ない。** `react-day-picker` が `date-fns` を連れてくることは
 * 配信 JSON に現れない。ページが「3つ」と数えているのはそちらを含めた数で、
 * **1つの規則で正しく数えられない**ので、個数そのものは照合しない。
 */
const DOCS = join(ROOT, 'apps/docs/content/docs/components');
const INSTALL_PAGE = join(ROOT, 'apps/docs/content/docs/install.mdx');

/**
 * **導入ページでまとめて案内している依存。** ページごとには求めない。
 *
 * `class-variance-authority` はほぼ全部のコンポーネントに付くので、
 * 25 ページに同じ断りを並べても読む人の役に立たない。
 *
 * **除外の根拠そのものを検査する。** 導入ページから名前が消えたら、
 * どこにも書かれていないことになるので落とす。
 */
const COMMON_DEPS = ['class-variance-authority'];
/** 依存を持つが、ページを持たないもの。**理由と一緒に並べる**（教訓5） */
const NO_PAGE = {
  ring: '共有物であってコンポーネントではない。展示ページを持たない',
};

const depErrors = [];
{
  // **除外の根拠を確かめる。** 導入ページから消えたら、どこにも書かれていない
  const installText = existsSync(INSTALL_PAGE) ? readFileSync(INSTALL_PAGE, 'utf8') : '';
  for (const d of COMMON_DEPS) {
    if (!installText.includes(d)) {
      depErrors.push(
        `${d} をページごとの検査から外していますが、導入ページに名前がありません。\n` +
          '    まとめて案内しているという前提が崩れています。',
      );
    }
  }
}
for (const [name, item] of items) {
  // 配信 JSON の時点で react / react-dom は除いてある
  const deps = [...(item.dependencies ?? [])].filter((d) => !COMMON_DEPS.includes(d));
  if (deps.length === 0 || NO_PAGE[name]) continue;
  const page = join(DOCS, `${name}.mdx`);
  if (!existsSync(page)) {
    depErrors.push(`${name} が依存 ${deps.join(' ')} を持つのに、展示ページがありません`);
    continue;
  }
  const text = readFileSync(page, 'utf8');
  for (const d of deps) {
    if (!text.includes(d)) {
      depErrors.push(
        `${name} は ${d} に依存しているのに、ページに名前が出ていません。\n` +
          '    入れた人は名前も知らないままパッケージが増えます。',
      );
    }
  }
}

// 対照（教訓2）。**発火することを確かめてから 0 件と言う**
if (!'このページは embla-carousel-react だけを挙げている'.includes('embla-carousel-react')) {
  console.error('陽性対照が落ちた: 文字列の照合が壊れている');
  process.exit(1);
}
if ('このページは embla-carousel-react だけを挙げている'.includes('embla-carousel-autoplay')) {
  console.error('陰性対照が発火した: 出ていない名前を出ていると報告した');
  process.exit(1);
}

if (depErrors.length) {
  console.error('ページが依存を隠しています（Issue #252）。\n');
  for (const e of depErrors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

/* ---------- 型の成立 ---------- */

rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });

const files = closureOf('base');
if (files.size === 0) errors.push('base の閉じが空です');

for (const [path, content] of files) {
  const full = join(WORK, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

writeFileSync(
  join(WORK, 'tsconfig.json'),
  `${JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        jsx: 'react-jsx',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        baseUrl: '.',
        paths: { '@/*': ['./*'] },
      },
      include: ['**/*.ts', '**/*.tsx'],
    },
    null,
    2,
  )}\n`,
);

let typeOk = true;
try {
  execFileSync('npx', ['tsc', '-p', join(WORK, 'tsconfig.json')], { stdio: 'pipe' });
} catch (e) {
  typeOk = false;
  errors.push(
    'コピー先の木がコンパイルできません:\n' +
      `${e.stdout?.toString() ?? ''}${e.stderr?.toString() ?? ''}`,
  );
}

/* ============================================================
   npm の依存が、そのまま入れられる名前であること
   ============================================================ */

/**
 * `dependencies` はコピー先で **`npm install` に渡る。**
 * 副経路（`react-day-picker/locale`）を書くと**そこで落ちる。**
 *
 * 実際に一度載った。生成器が**説明の中の import まで数えていた**ためで、
 * 自作の検査も CLI も通したあとの配信物に入っていた。
 *
 * 見るのは形だけである。**実在するかは見ない**——ネットワークが要る。
 */
const PACKAGE_NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

// 対照。**発火することを確かめてから 0 件と言う**（教訓2）
const nameControls = [
  ['副経路', 'react-day-picker/locale', false],
  ['スコープつきの副経路', '@date-fns/tz/utc', false],
  ['素の名前', 'react-day-picker', true],
  ['スコープつき', '@date-fns/tz', true],
];
for (const [label, spec, shouldPass] of nameControls) {
  if (PACKAGE_NAME.test(spec) !== shouldPass) {
    console.error(`対照が期待どおりでない: ${label}`);
    process.exit(1);
  }
}

const badNames = [];
for (const [name, item] of items) {
  for (const dep of item.dependencies ?? []) {
    if (!PACKAGE_NAME.test(dep)) badNames.push(`${name}: ${dep}`);
  }
}
for (const bad of badNames) {
  errors.push(`npm に渡せない依存の名前: ${bad}`);
}

/* ---------- 結果 ---------- */

if (errors.length) {
  console.error('レジストリの配信物がコピー先で成立しません。\n');
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(
    '\n参照先が足りない場合は registryDependencies の書き漏れです。' +
      '\n生成しているのは scripts/build-registry.mjs です。',
  );
  process.exit(1);
}

console.log(
  '✓ 対照 8 件が期待どおり（参照先の欠け・揃っている閉じ・依存の名前 4 件・' +
    '仕組みが連れる／連れない 2 件）',
);
console.log('✓ npm の依存がすべて、そのまま入れられる名前である（副経路が混ざっていない）');
console.log(`✓ ${items.size} 件それぞれについて、単体で入れたときの参照先が揃っている`);
console.log('✓ 依存を持つコンポーネントは、そのページに依存の名前が出ている');
console.log(
  `✓ 仕組み ${hooks.length} 件は、入れても見た目が付いてこない。` +
    '対応する部品は仕組みを引いている',
);
console.log(
  typeOk ? `✓ 全部入れた木（${files.size} ファイル）がそのままコンパイルできる` : '',
);
