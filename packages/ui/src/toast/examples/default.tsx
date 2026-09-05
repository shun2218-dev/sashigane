'use client';

/*
  **例そのものをクライアント側にする。** Toaster はクライアント側の部品で、
  出す操作（関数）もサーバ側からは渡せない。
*/
import { Button } from '../../button/button.tsx';
import { Toaster } from '../toast.tsx';
import { showToast } from '../toast-store.ts';

/**
 * 通常。**出すのはただの関数呼び出し。**
 *
 * 置き場は React の外にあるので、深いところからでも
 * React の外（読み込みの失敗処理など）からでも呼べる。
 */
export default function Default() {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Button onClick={() => showToast({ message: '保存しました', tone: 'success' })}>
        保存する
      </Button>
      <Button
        variant="ghost"
        onClick={() => showToast({ message: '送信できませんでした', tone: 'danger' })}
      >
        失敗させる
      </Button>
      <Toaster />
    </div>
  );
}
