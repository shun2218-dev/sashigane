/**
 * **AI が読む形と、ページの絵が実際に出ていること**を検査する。
 *
 * ## なぜ要るのか
 *
 * どちらも**静かに壊れる**（教訓4）。
 *
 *   - 索引が空でも経路は 200 を返す
 *   - 展示の差し込みが展開されないと、`<ComponentDemo name="badge" />` の
 *     1行だけが残る。**Markdown としては正しく、読む側にだけ意味が無い**
 *   - 絵の生成が落ちても、それらしい大きさの応答が返りうる
 *
 * ## 何を見るか
 *
 *   1. 索引が全ページを挙げていること
 *   2. **全ページ**の Markdown が返り、**展示の差し込みが例のソースに展開されている**こと。
 *      **例のソースが古くないこと**も見る——生成物を読むので、生成を忘れても落ちない
 *   3. 記号が実体参照へ逃げていないこと
 *   4. 絵が PNG として返ること
 *   5. **無いページは 404 になること**
 *   6. **型表に生の記号が残っていないこと**（決定6-4）
 *
 * 5 が要る。1〜4 だけだと、**何を頼んでも同じものを返す壊れ方**を通してしまう。
 *
 * ## 6 は画面を見るまで気づけなかった
 *
 * 型表の説明は **JSDoc の素の文字列**である。解かずに出すと
 * `**必須である。**` のように記号がそのまま並ぶ。
 * **エラーは出ず、読みにくくなるだけ**なので、しばらく気づかなかった。
 *
 * ## 何を見ないか（教訓5）
 *
 *   - **文面の質。** 読んで分かるかは機械では見えない
 *   - **絵の見た目。** PNG であること以上は測らない
 *
 * ## 先にビルドが要る
 *
 * `next start` は `.next` を読む。CI では apps/docs のビルドの後に置いてある。
 */
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = 3212;
const BASE = `http://localhost:${PORT}`;
const DOCS = 'apps/docs/content/docs';

/** 展示ページの一覧。**手で持たない**——増減に追随させる */
const componentPages = readdirSync(join(DOCS, 'components'))
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => f.replace(/\.mdx$/, ''))
  .sort();

const server = spawn('pnpm', ['--filter', '@sashigane/docs', 'exec', 'next', 'start', '--port', String(PORT)], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

let log = '';
server.stdout.on('data', (b) => (log += b));
server.stderr.on('data', (b) => (log += b));

const stop = () => {
  if (!server.killed) server.kill('SIGTERM');
};
process.on('exit', stop);

const fail = (message) => {
  console.error(message);
  if (log.trim()) console.error(`\n--- サーバの出力 ---\n${log.trim()}`);
  stop();
  process.exit(1);
};

/** 起動を待つ。**待てなかったら落とす。** 起動していないことを空と混ぜない */
const waitReady = async () => {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(BASE, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {
      /* まだ起きていない */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  fail(`${BASE} が 60 秒で起動しませんでした。先に apps/docs をビルドしてください。`);
};

await waitReady();

const problems = [];
const get = async (path) => {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, type: res.headers.get('content-type') ?? '', body: await res.text() };
};

/* --- 1. 索引 --- */
const index = await get('/llms.txt');
if (index.status !== 200) problems.push(`/llms.txt が ${index.status} を返しました`);
for (const name of componentPages) {
  if (!index.body.includes(`/docs/components/${name}`)) {
    problems.push(`/llms.txt に ${name} が載っていません`);
  }
}

/* --- 2〜3. 全ページぶんの Markdown --- */
if (componentPages.length === 0) {
  fail(`${DOCS}/components に展示ページがありません。検査対象が消えています。`);
}

/*
 * **1枚だけ見て済ませない**（自己レビュー U1）。
 * ページごとに差し込みの数も種類も違うので、
 * 1枚だけ見ると**別のページで展開が落ちても通る。**
 * 索引の側は全ページを見ているのに本文は1枚、という非対称だった。
 */
const pages = [];
for (const name of componentPages) {
  const page = await get(`/docs/components/${name}.md`);
  pages.push({ name, ...page });

  if (page.status !== 200) problems.push(`/docs/components/${name}.md が ${page.status} を返しました`);
  if (!page.type.includes('markdown')) {
    problems.push(`${name}.md の型が markdown ではありません: ${page.type}`);
  }
  if (page.body.trim().length < 200) {
    problems.push(`${name}.md の中身がほとんどありません（${page.body.length} 字）`);
  }
  if (page.body.includes('<ComponentDemo')) {
    problems.push(
      `${name}.md に展示の差し込みがそのまま残っています。` +
        '**Markdown としては正しく、読む側にだけ意味がありません。**',
    );
  }
  if (!page.body.includes('```tsx')) {
    problems.push(`${name}.md に例のソースがありません。このサイトは書き方を例に預けています`);
  }
  if (page.body.includes('&#x2A;')) {
    problems.push(`${name}.md の記号が実体参照へ逃げています（\`**\` が \`&#x2A;*\` になっています）`);
  }
}

/*
 * **例のソースが古くないこと**（自己レビュー U2）。
 * 差し込みの展開は生成物（`apps/docs/generated/sources.json`）を読む。
 * 生成を忘れても**落ちない**——古いソースが静かに配られる。
 * 元のファイルの中の一行が `.md` に出ていることで、鮮度を見る。
 */
for (const { name, body } of pages) {
  const example = join('packages/ui/src', name, 'examples/default.tsx');
  const line = readFileSync(example, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('export default function'));
  if (line && !body.includes(line)) {
    problems.push(
      `${name}.md の例のソースが古いか、出ていません（${example} の「${line}」が見つかりません）。` +
        ' pnpm docs:data を実行してください',
    );
  }
}

const [page] = pages;

/* --- 6. 型表に生の記号が残っていないこと --- */
for (const { name } of pages) {
  const html = await get(`/docs/components/${name}`);
  // 型表の升だけを見る。**本文の Markdown は fumadocs が解くので対象外**
  const table = html.body.slice(html.body.indexOf('<table'), html.body.indexOf('</table>'));
  if (table && /\*\*[^*<]+\*\*/.test(table)) {
    problems.push(
      `${name} の型表に生の記号が残っています（\`**\` が解かれていません）。` +
        ' JSDoc の印は apps/docs/components/component-demo.tsx が解きます',
    );
  }
}

/* --- 4. 絵 --- */
const og = await fetch(`${BASE}/og/docs/components/${page.name}/image.png`);
if (og.status !== 200) problems.push(`絵が ${og.status} を返しました（${page.name}）`);
if (!(og.headers.get('content-type') ?? '').includes('image/png')) {
  problems.push(`絵の型が PNG ではありません: ${og.headers.get('content-type')}`);
}
const bytes = (await og.arrayBuffer()).byteLength;
if (bytes < 5000) problems.push(`絵が小さすぎます（${bytes} バイト）。生成に失敗している可能性があります`);

/* --- 5. 対照。無いページ --- */
const absent = await get('/docs/components/zzz-not-a-page.md');
if (absent.status === 200) {
  problems.push(
    '無いページの .md が 200 を返しました。' +
      '**何を頼んでも同じものを返す壊れ方**を、上の検査では捕まえられません。',
  );
}

stop();

if (problems.length) {
  console.error('AI が読む形か、ページの絵が期待どおりではありません。\n');
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error(
    '\n索引と本文は apps/docs/lib のページ木から出ています。' +
      '\n展示の差し込みの展開は apps/docs/lib/llm-text.ts が行います。',
  );
  process.exit(1);
}

console.log(`✓ 対照 1 件が期待どおり（無いページの .md は ${absent.status}）`);
console.log(`✓ 索引が ${componentPages.length} 件の展示ページを挙げている`);
console.log(
  `✓ ${pages.length} 枚の .md すべてに例のソースが入り、差し込みも実体参照も残っていない`,
);
console.log('✓ 例のソースが元のファイルと一致している（生成が古くない）');
console.log(`✓ 絵が PNG として返る（${bytes} バイト）`);
console.log(`✓ ${pages.length} 枚の型表に生の記号が残っていない`);
