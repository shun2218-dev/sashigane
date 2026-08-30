/**
 * 例から、ドキュメントサイトが要るものを生成する（決定6-4）。
 *
 * > ドキュメントサイトの描画・配信 JSON・型表は**すべてここ（例）から出す**（唯一の正）
 *
 * ## 出すもの
 *
 *   apps/docs/generated/examples.tsx   例を静的 import して並べた索引（描画に使う）
 *   apps/docs/generated/sources.json   例のソースそのもの（表示に使う）
 *   apps/docs/generated/props.json     型表（react-docgen-typescript）
 *
 * **すべて生成物なのでコミットしない**（原則1）。`apps/docs` の `prepare:` で作る。
 *
 * ## 手で並べない
 *
 * 索引を手で持つと、コンポーネントや例を足したときに**足し忘れた分だけ黙って展示されない。**
 * `check:component-examples` は「3つ揃っているか」を見るが、
 * **展示されているか**は見ない。ファイルシステムから導けば、その隙間が消える。
 *
 * ## 型表について
 *
 * cva の `VariantProps` はリテラルの union として取れる（決定6-4 で実測）。
 * **variant のキーに書いた JSDoc がそのまま説明になる**ので、
 * 型と説明をコンポーネントのソース1箇所に置ける。
 *
 * 取れないものが1つある。**`defaultVariants` の既定値は署名に現れない。**
 * cva の呼び出しの中にあるので、docgen からは見えない。
 * ここでは**取れないものを取れたことにしない**——出さない。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import docgen from 'react-docgen-typescript';

/**
 * **cwd ではなくこのファイルの位置から解く。**
 * `apps/docs` の `prepare:` から呼ばれるので、cwd はリポジトリ直下ではない。
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UI = join(ROOT, 'packages/ui/src');
const OUT = join(ROOT, 'apps/docs/generated');

if (!existsSync(UI)) {
  console.error(`${UI} がありません。`);
  process.exit(1);
}

/** `packages/ui/src/<name>/<name>.tsx` を持つディレクトリをコンポーネントとみなす */
const components = readdirSync(UI, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(UI, e.name, `${e.name}.tsx`)))
  .map((e) => e.name)
  .sort();

if (components.length === 0) {
  console.error(`${UI} にコンポーネントがありません。`);
  process.exit(1);
}

const parser = docgen.withCustomConfig(join(ROOT, 'packages/ui/tsconfig.json'), {
  savePropValueAsString: true,
  shouldExtractLiteralValuesFromEnum: true,
  shouldRemoveUndefinedFromOptional: true,
  // React が持ち込む数百の props（HTMLAttributes）を落とす。
  // **我々が定義した props だけを表に出す**
  propFilter: (prop) => !prop.parent || !/node_modules/.test(prop.parent.fileName),
});

const sources = {};
const props = {};
const imports = [];
const entries = [];

for (const name of components) {
  const exampleDir = join(UI, name, 'examples');
  const files = existsSync(exampleDir)
    ? readdirSync(exampleDir).filter((f) => f.endsWith('.tsx')).sort()
    : [];

  sources[name] = {};
  const states = [];
  for (const file of files) {
    const state = file.replace(/\.tsx$/, '');
    const ident = `${name}_${state}`.replace(/[^A-Za-z0-9_]/g, '_');
    sources[name][state] = readFileSync(join(exampleDir, file), 'utf8');
    imports.push(
      `import ${ident} from '${relative(OUT, join(exampleDir, file)).replace(/\\/g, '/')}';`,
    );
    states.push(`    { state: ${JSON.stringify(state)}, Example: ${ident} },`);
  }
  entries.push(`  ${JSON.stringify(name)}: [\n${states.join('\n')}\n  ],`);

  const [doc] = parser.parse(join(UI, name, `${name}.tsx`));
  if (!doc) {
    console.error(`${name} の型が読めません。既定エクスポートか名前付きエクスポートが要ります。`);
    process.exit(1);
  }
  props[name] = {
    displayName: doc.displayName,
    description: doc.description,
    props: Object.entries(doc.props).map(([propName, p]) => ({
      name: propName,
      type: p.type.name,
      required: p.required,
      description: p.description,
      // **既定値は出さない。** cva の defaultVariants は署名に現れないので、
      // ここに出る値は「引数のデフォルトが書かれているものだけ」になり、
      // 表として嘘になる（教訓2）
    })),
  };
}

mkdirSync(OUT, { recursive: true });

writeFileSync(
  join(OUT, 'examples.tsx'),
  `/* 生成物。手で編集しない。scripts/build-component-docs.mjs が作る（決定6-4）。 */\n` +
    `import type { ComponentType } from 'react';\n` +
    `${imports.join('\n')}\n\n` +
    `export const examples: Record<string, { state: string; Example: ComponentType }[]> = {\n` +
    `${entries.join('\n')}\n};\n`,
);
writeFileSync(join(OUT, 'sources.json'), `${JSON.stringify(sources, null, 2)}\n`);
writeFileSync(join(OUT, 'props.json'), `${JSON.stringify(props, null, 2)}\n`);

const exampleCount = Object.values(sources).reduce((n, s) => n + Object.keys(s).length, 0);
const propCount = Object.values(props).reduce((n, p) => n + p.props.length, 0);
console.log(
  `✓ コンポーネント ${components.length} 件・例 ${exampleCount} 件・props ${propCount} 件を ` +
    `${relative(ROOT, OUT)} へ生成`,
);
