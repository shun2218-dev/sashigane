'use client';

/*
  **例そのものをクライアント側にする。** Modal はクライアント側の部品なので、
  サーバ側から開け閉めの処理（関数）を渡せない。
*/
import { Button } from '../../button/button.tsx';
import { Modal } from '../modal.tsx';
import { useModal } from '../use-modal.ts';

/**
 * 通常。**開け閉めは `useModal` が持つ。**
 *
 * フォーカスの閉じ込め・後ろを触れなくすること・`Escape` で閉じること・
 * 閉じたときに元の場所へフォーカスが戻ることは、**すべてブラウザが持っている。**
 */
export default function Default() {
  const modal = useModal();
  return (
    <div>
      <Button onClick={modal.show}>開く</Button>
      <Modal
        open={modal.open}
        onClose={modal.hide}
        title="変更を保存しますか"
        style={{ maxWidth: 420 }}
        actions={
          <>
            <Button onClick={modal.hide}>保存する</Button>
            <Button variant="ghost" onClick={modal.hide}>
              やめる
            </Button>
          </>
        }
      >
        保存しないまま閉じると、書いた内容は消えます。
      </Modal>
    </div>
  );
}
