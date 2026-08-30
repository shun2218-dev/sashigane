import { playwright } from '@vitest/browser-playwright';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * テストは2つに分かれる（決定6-6）。
 *
 * | | 走る場所 | 測るもの |
 * |---|---|---|
 * | `tokens` | Node | スケールの不変条件。値と規則の一致 |
 * | `ui` | **実ブラウザ** | props の写像・設計の不変条件・**トークンの保証** |
 *
 * ## なぜコンポーネントを実ブラウザで走らせるか
 *
 * Card で保証したいことの中心は、**`data-sg-surface` が背景と前景を同時に切り替えること**
 * である（決定5-12）。決定5-12 は「面を塗ったのに前景が浅いまま」という穴への対処で、
 * **塗るだけの道を塞ぐことが目的**だった。
 *
 * **jsdom はこれを測れない。** CSS を解決しないので、
 * 「クラスが付いている」ことしか言えず、「色が変わった」ことは言えない。
 *
 * そして `development-process.md` はこう書いている。
 *
 * > それを測るには、**手元で検出できない失敗**を CI が持つ必要がある
 * > （実ブラウザでの見え方、視覚回帰）。**いまは持っていない。**
 *
 * これはその穴の一部を埋める。
 *
 * ## トークンの生成物が要る
 *
 * `ui` のテストは `packages/tokens/dist` を読む（生成した CSS を実際に当てるため）。
 * **`pnpm build:tokens` が先に要る。** CI もその順にしてある。
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'tokens',
          include: ['packages/tokens/test/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        // Tailwind を通すのは、**利用側と同じ経路で CSS を作るため**である。
        // 事前ビルドした CSS を読み込むと、テストが「そのとき生成された CSS」を
        // 見ていることになり、いま書いたクラスが実際に解決するかを測れない
        plugins: [react(), tailwindcss()],
        test: {
          name: 'ui',
          include: ['packages/ui/src/**/*.test.tsx'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
