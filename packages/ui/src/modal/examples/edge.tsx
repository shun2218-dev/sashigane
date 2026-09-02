'use client';

/*
  **例そのものをクライアント側にする。** Modal はクライアント側の部品なので、
  サーバ側から開け閉めの処理（関数）を渡せない。
*/
import { Button } from '../../button/button.tsx';
import { Field } from '../../field/field.tsx';
import { Input } from '../../input/input.tsx';
import { Modal } from '../modal.tsx';
import { useModal } from '../use-modal.ts';

/**
 * エッジケース。**中身が長く、入力があり、覆いを押すと閉じる。**
 *
 * 覆いで閉じるのは**指定したときだけ**である。押した場所が中か外かは
 * 座標で見分けることになり、取り違えると中を押したのに閉じる。
 */
export default function Edge() {
  const modal = useModal();
  return (
    <div>
      <Button onClick={modal.show}>長い窓を開く</Button>
      <Modal
        open={modal.open}
        onClose={modal.hide}
        closeOnBackdrop
        title="送り先を書き足す"
        style={{ maxWidth: 420 }}
        actions={<Button onClick={modal.hide}>閉じる</Button>}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <p>
            覆いを押しても閉じます。中身が画面より高いときは、この窓の中だけが巻き取られます——
            後ろは動きません。
          </p>
          <Field id="modal-to" label="送り先" required>
            <Input />
          </Field>
          <Field id="modal-note" label="ひとこと" description="空でも構いません">
            <Input />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
