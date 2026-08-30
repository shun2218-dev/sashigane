/**
 * ドキュメントサイトの開発サーバ。**プレビュー用 CSS を作り直しながら動かす。**
 *
 * ## なぜ要るのか
 *
 * プレビュー用 CSS は Next.js のビルドの外で作っている（決定6-4）。
 * **Next.js はこのファイルを知らないので、コンポーネントを直しても作り直さない。**
 *
 * 結果、**画面だけが古いまま**になる。エラーは出ず、
 * クラスが未生成なぶんが黙って落ちるだけである（教訓4）。
 *
 * 実際、利用者から「エラーの outline が danger になっていない」と指摘された。
 * **CSS が古かった**——計算値で測ると新しい色が出ていた。
 *
 * ## 何を見るか
 *
 *   - `packages/ui/src` — クラスを書く場所
 *   - `packages/tokens/dist/theme.css` — 出るクラスを決める場所
 *
 * 変更が続けて来るので**まとめてから1回だけ作り直す。**
 */
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';

const UI = new URL('../packages/ui/src', import.meta.url).pathname;
const THEME = new URL('../packages/tokens/dist/theme.css', import.meta.url).pathname;

/** 作り直しに使う入口。**`prepare:preview-css` と同じもの**を呼ぶ */
const rebuild = () =>
  new Promise((resolve) => {
    const child = spawn('pnpm', ['run', 'prepare:preview-css'], { stdio: 'inherit' });
    child.on('exit', resolve);
  });

let timer = null;
let running = false;
let queued = false;

const schedule = () => {
  clearTimeout(timer);
  // 変更は続けて来る。**まとめてから1回だけ作り直す**
  timer = setTimeout(async () => {
    if (running) {
      queued = true;
      return;
    }
    running = true;
    console.log('\n[preview.css] コンポーネントが変わったので作り直します');
    await rebuild();
    running = false;
    if (queued) {
      queued = false;
      schedule();
    }
  }, 150);
};

for (const target of [UI, THEME]) {
  try {
    watch(target, { recursive: true }, schedule);
  } catch (error) {
    // **黙って諦めない。** 見張れていないことは、画面が古くなることを意味する
    console.error(`[preview.css] ${target} を見張れません: ${String(error)}`);
    console.error('コンポーネントを直したら pnpm prepare:preview-css を手で実行してください。');
  }
}

const next = spawn('pnpm', ['exec', 'next', 'dev'], { stdio: 'inherit' });
next.on('exit', (code) => process.exit(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => next.kill(signal));
}
