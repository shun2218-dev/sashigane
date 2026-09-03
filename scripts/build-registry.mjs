/**
 * レジストリの配信 JSON を作る（原則6、決定4-1〜4-3）。
 *
 *   apps/docs/public/r/<name>.json   1件ずつ
 *   apps/docs/public/r/registry.json 索引
 *
 * **生成物なのでコミットしない**（原則1）。`.gitignore` に入れてある。
 *
 * ## 落ちた先での置き場所
 *
 * shadcn の慣例に合わせる。**利用側の `@/` に落ちる。**
 *
 *   registry:ui   → components/ui/<file>
 *   registry:lib  → lib/<file>
 *   registry:file → 指定した target
 *
 * ## import の書き換え
 *
 * ソースは相対パス（`../internal/slot.tsx`）で書いてある。
 * **落ちた先では階層が変わる**ので、置き場所から `@/` の形へ書き換える。
 *
 * 決定4-2 は「パッケージ内を `@sashigane/ui/...` に統一して置換する」形だったが、
 * 相対パスは**設定ゼロでどこでも解決する**（テスト・Next・tsc の3つ）。
 * 書き換えはここ1箇所で済むので、ソースの側は触っていない。
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const UI = 'packages/ui/src';
const OUT = 'apps/docs/public/r';
const TOKENS = 'packages/tokens/dist';

/** 落ちた先の置き場所。**型ごとに決まる** */
const TARGET_DIR = {
  'registry:ui': 'components/ui',
  'registry:lib': 'lib',
};

/**
 * 部品ではない共有物。**コンポーネントの数え方から外れる**ので、
 * ここに並べて `registry:lib` として配る。
 */
const LIB_ITEMS = {
  'internal/slot.tsx': 'slot',
  'internal/ring.ts': 'ring',
};

/** 落ちた先が持っていないもの。**react は利用側が既に持っている** */
const SKIP_DEPENDENCIES = new Set(['react', 'react-dom']);

const tracked = execSync(`git ls-files ${UI}`, { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const isSource = (f) =>
  (f.endsWith('.ts') || f.endsWith('.tsx')) &&
  !f.includes('/examples/') &&
  !f.endsWith('.test.tsx') &&
  !f.endsWith('/index.ts') &&
  f !== `${UI}/index.ts`;

const sources = tracked.filter(isSource);

/** ソースの相対パス（`button/button.tsx`）→ 属する item 名 */
const itemOf = new Map();
for (const file of sources) {
  const rel = relative(UI, file);
  itemOf.set(rel, LIB_ITEMS[rel] ?? rel.split('/')[0]);
}

/** item 名 → 型 */
const typeOf = (name) => (Object.values(LIB_ITEMS).includes(name) ? 'registry:lib' : 'registry:ui');

/** 落ちた先での import の書き方。**拡張子は落とす** */
const importPathFor = (rel) => {
  const item = itemOf.get(rel);
  const base = rel.split('/').pop().replace(/\.tsx?$/, '');
  return `${TARGET_DIR[typeOf(item)].replace(/^/, '@/')}/${base}`;
};

const IMPORT = /from '([^']+)'/g;

/** 1ファイル分の中身と、そこから見えた依存 */
const convert = (file) => {
  const rel = relative(UI, file);
  const raw = readFileSync(file, 'utf8');
  const registryDependencies = new Set();
  const dependencies = new Set();

  const content = raw.replace(IMPORT, (whole, spec) => {
    if (!spec.startsWith('.')) {
      if (!SKIP_DEPENDENCIES.has(spec)) dependencies.add(spec);
      return whole;
    }
    const target = relative(UI, resolve(dirname(file), spec));
    if (!itemOf.has(target)) {
      throw new Error(`${rel} が配らないファイルを参照しています: ${spec}`);
    }
    if (itemOf.get(target) !== itemOf.get(rel)) registryDependencies.add(itemOf.get(target));
    return `from '${importPathFor(target)}'`;
  });

  return {
    file: {
      path: `${TARGET_DIR[typeOf(itemOf.get(rel))]}/${rel.split('/').pop()}`,
      content,
      type: typeOf(itemOf.get(rel)),
    },
    registryDependencies,
    dependencies,
  };
};

/* ---------- 1件ずつの item ---------- */

const items = new Map();
for (const file of sources) {
  const rel = relative(UI, file);
  const name = itemOf.get(rel);
  const { file: entry, registryDependencies, dependencies } = convert(file);
  const item = items.get(name) ?? {
    name,
    type: typeOf(name),
    files: [],
    dependencies: new Set(),
    registryDependencies: new Set(),
  };
  item.files.push(entry);
  for (const d of dependencies) item.dependencies.add(d);
  for (const d of registryDependencies) item.registryDependencies.add(d);
  items.set(name, item);
}

/* ---------- トークン ---------- */

/**
 * トークンは CSS そのものを配る。
 *
 * 決定4-3 は `cssVars` だけで配る形だったが、**トークン層は変数だけではない**——
 * 面（`[data-sg-surface]`）・塗り・覆い・骨組み表示の keyframes を持つ。
 * `cssVars` は変数しか運べないので、ファイルとして配る。
 */
const tokenFiles = [
  ['tokens.css', 'styles/sashigane-tokens.css'],
  ['theme.css', 'styles/sashigane-theme.css'],
];

for (const [src] of tokenFiles) {
  if (!existsSync(join(TOKENS, src))) {
    console.error(`${join(TOKENS, src)} がありません。先に pnpm build:tokens を実行してください。`);
    process.exit(1);
  }
}

const tokensItem = {
  name: 'tokens',
  type: 'registry:file',
  files: tokenFiles.map(([src, target]) => ({
    path: target,
    content: readFileSync(join(TOKENS, src), 'utf8'),
    type: 'registry:file',
    target,
  })),
  dependencies: new Set(),
  registryDependencies: new Set(),
};

/* ---------- 全部入り ---------- */

const base = {
  name: 'base',
  type: 'registry:base',
  files: [],
  dependencies: new Set(),
  // **トークンも含む。** 部品だけ落ちても色が1つも無い
  registryDependencies: new Set(['tokens', ...items.keys()]),
};

/* ---------- 出力 ---------- */

const all = [tokensItem, ...items.values(), base];

const asJson = (item) => ({
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: item.name,
  type: item.type,
  ...(item.dependencies.size ? { dependencies: [...item.dependencies].sort() } : {}),
  ...(item.registryDependencies.size
    ? { registryDependencies: [...item.registryDependencies].sort() }
    : {}),
  files: item.files,
});

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const item of all) {
  writeFileSync(join(OUT, `${item.name}.json`), `${JSON.stringify(asJson(item), null, 2)}\n`);
}

writeFileSync(
  join(OUT, 'registry.json'),
  `${JSON.stringify(
    {
      $schema: 'https://ui.shadcn.com/schema/registry.json',
      name: 'sashigane',
      homepage: 'https://github.com/shun2218-dev/sashigane',
      items: all.map(asJson),
    },
    null,
    2,
  )}\n`,
);

const uiCount = [...items.values()].filter((i) => i.type === 'registry:ui').length;
const libCount = [...items.values()].filter((i) => i.type === 'registry:lib').length;
console.log(
  `✓ レジストリ ${all.length} 件を ${OUT} へ生成` +
    `（部品 ${uiCount} / 共有 ${libCount} / トークン 1 / 全部入り 1）`,
);
