/**
 * 配信 JSON が**落ちた先で成立する**ことを検査する（原則6）。
 *
 * 見るのは2つである。
 *
 *   **依存の閉じ**  1件ずつ落としたとき、参照先が全部揃うか
 *   **型の成立**    全部落とした木が、そのままコンパイルできるか
 *
 * ## なぜ1件ずつと全部の両方を見るのか
 *
 * 全部落として1回コンパイルするだけだと、**依存の書き漏れが隠れる。**
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

  落ちた先も同じ状態である——`shadcn add` は item の dependencies を
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

/** その item を落としたときに置かれるファイルの一覧（依存を辿って集める） */
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
    '落ちた先の木がコンパイルできません:\n' +
      `${e.stdout?.toString() ?? ''}${e.stderr?.toString() ?? ''}`,
  );
}

/* ============================================================
   npm の依存が、そのまま入れられる名前であること
   ============================================================ */

/**
 * `dependencies` は落ちた先で **`npm install` に渡る。**
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
  console.error('レジストリの配信物が落ちた先で成立しません。\n');
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(
    '\n参照先が足りない場合は registryDependencies の書き漏れです。' +
      '\n生成しているのは scripts/build-registry.mjs です。',
  );
  process.exit(1);
}

console.log('✓ 対照 6 件が期待どおり（参照先の欠け・揃っている閉じ・依存の名前 4 件）');
console.log('✓ npm の依存がすべて、そのまま入れられる名前である（副経路が混ざっていない）');
console.log(`✓ ${items.size} 件それぞれについて、単体で落としたときの参照先が揃っている`);
console.log(
  typeOk ? `✓ 全部落とした木（${files.size} ファイル）がそのままコンパイルできる` : '',
);
