/**
 * ドキュメントサイトの検索が**実際に引けること**を検査する。
 *
 * ## なぜ要るのか
 *
 * 検索は**静かに壊れる**（教訓4）。索引が空でも経路は 200 を返し、
 * 画面には「見つかりません」と出るだけである。
 * **入力に対して結果が無いことと、索引が空であることは、見た目で区別がつかない。**
 *
 * 索引はページから作っている（`createFromSource`）ので、
 * ページの構造化データが出なくなると中身だけが消える。**型は通る。**
 *
 * ## 何を見るか
 *
 *   1. 和文で引けること（語の切り出しが和文に効いていること）
 *   2. 英字で引けること
 *   3. **無い語では 0 件になること**
 *
 * 3 が要る。1 と 2 だけだと、**全件を返す壊れ方**を通してしまう。
 * 1・2 と 3 は互いの対照になっている——
 * どちらか片方だけが成立する状態は作れない（教訓2）。
 *
 * ## 何を見ないか（教訓5）
 *
 *   - **並び順。** 何が上に来るべきかは機械では決められない
 *   - **抜粋の切り出し方。** 読みやすさは読まないと分からない
 *   - **画面。** ここが見るのは経路だけである
 *
 * ## 先にビルドが要る
 *
 * `next start` は `.next` を読む。CI では apps/docs のビルドの後に置いてある。
 */
import { spawn } from 'node:child_process';

const PORT = 3210;
const BASE = `http://localhost:${PORT}`;

/** 引く語と、結果に必ず含まれていてほしい URL */
const QUERIES = [
  { q: 'トークン', want: '/docs', why: '和文' },
  { q: 'Button', want: '/docs/components/button', why: '英字' },
];

/** **無い語。** 全件を返す壊れ方を捕まえるための対照 */
const ABSENT = 'zzzqqqxxnotawordanywhere';

const server = spawn('pnpm', ['--filter', '@sashigane/docs', 'exec', 'next', 'start', '--port', String(PORT)], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverLog = '';
server.stdout.on('data', (b) => (serverLog += b));
server.stderr.on('data', (b) => (serverLog += b));

const stop = () => {
  if (!server.killed) server.kill('SIGTERM');
};
process.on('exit', stop);

const fail = (message) => {
  console.error(message);
  if (serverLog.trim()) console.error(`\n--- サーバの出力 ---\n${serverLog.trim()}`);
  stop();
  process.exit(1);
};

/** 起動を待つ。**待てなかったら落とす。** 起動していないことを 0 件と混ぜない */
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

const search = async (q) => {
  const res = await fetch(`${BASE}/api/search?query=${encodeURIComponent(q)}`);
  if (!res.ok) fail(`検索の経路が ${res.status} を返しました（query=${q}）。`);
  const json = await res.json();
  if (!Array.isArray(json)) fail(`検索の結果が配列ではありません（query=${q}）: ${typeof json}`);
  return json;
};

await waitReady();

const problems = [];

for (const { q, want, why } of QUERIES) {
  const results = await search(q);
  if (results.length === 0) {
    problems.push(`「${q}」（${why}）が 0 件。**索引が空か、語の切り出しが効いていません。**`);
    continue;
  }
  if (!results.some((r) => r.url === want)) {
    problems.push(
      `「${q}」（${why}）の結果に ${want} がありません（${results.length} 件: ` +
        `${[...new Set(results.map((r) => r.url))].slice(0, 5).join(' ')}）`,
    );
  }
}

const absent = await search(ABSENT);
if (absent.length > 0) {
  problems.push(
    `無い語「${ABSENT}」が ${absent.length} 件返りました。` +
      '**問い合わせに関係なく返っています。** 上の 2 件が通っても、検索できている証拠になりません。',
  );
}

stop();

if (problems.length) {
  console.error('検索が期待どおりに引けません。\n');
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error(
    '\n索引は apps/docs/app/api/search/route.ts が `source` から作っています。' +
      '\nページの構造化データが出なくなると、**型は通ったまま中身だけが消えます。**',
  );
  process.exit(1);
}

console.log(`✓ 対照 1 件が期待どおり（無い語「${ABSENT}」は 0 件）`);
console.log(`✓ ${QUERIES.map((x) => `「${x.q}」`).join('と')}が引け、期待する URL を含む`);
