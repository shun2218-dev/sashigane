'use client';

/*
  **例そのものをクライアント側にする。** Toaster はクライアント側の部品である。
*/
import { Button } from '../../button/button.tsx';
import { Toaster } from '../toast.tsx';
import { showToast } from '../toast-store.ts';

/**
 * エッジケース。**自動で消えるものと、長い文言と、積み重なり。**
 *
 * 自動で消すのは `duration` を渡したときだけである。
 * 渡したときも、**ポインタが乗っている間は消えない。**
 */
export default function Edge() {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Button onClick={() => showToast({ message: '3秒で消えます', duration: 3000 })}>
        消えるものを出す
      </Button>
      <Button
        variant="ghost"
        onClick={() =>
          showToast({
            message:
              '折り返さずには収まりきらないほど長い知らせを出したときに、どこで折り返るのかを見るための文言です',
          })
        }
      >
        長いものを出す
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          showToast({ message: '1つめ' });
          showToast({ message: '2つめ' });
          showToast({ message: '3つめ', tone: 'success' });
        }}
      >
        まとめて出す
      </Button>
      <Toaster />
    </div>
  );
}
