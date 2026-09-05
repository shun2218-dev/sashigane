'use client';

/*
  **例そのものをクライアント側にする。** Toaster はクライアント側の部品である。
*/
import { Button } from '../../button/button.tsx';
import { Toaster } from '../toast.tsx';
import { showToast } from '../toast-store.ts';

/**
 * エッジケース。**消えないものと、長い文言と、積み重なり。**
 *
 * 既定は滞在の段のまん中（4000ms）である。読み終わるまで残したいものは
 * `duration: null` を渡す。**ポインタが乗っている間は消えない。**
 */
export default function Edge() {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Button onClick={() => showToast({ message: '押すまで消えません', duration: null })}>
        消えないものを出す
      </Button>
      <Button
        variant="ghost"
        onClick={() =>
          showToast({
            message:
              '折り返さずには収まりきらないほど長い通知を出したときに、どこで折り返るのかを見るための文言です',
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
