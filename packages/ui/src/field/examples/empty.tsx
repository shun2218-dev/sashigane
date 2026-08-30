import { Input } from '../../input/input.tsx';
import { Field } from '../field.tsx';

/**
 * 空。**説明も誤りも無いとき。**
 *
 * 札と入力だけが残る。**空の段落を置かない**——
 * 置くと、何も書かれていない行が読み上げに出る。
 */
export default function Empty() {
  return (
    <div style={{ maxWidth: 360 }}>
      <Field id="empty" label="札と入力だけ">
        <Input />
      </Field>
    </div>
  );
}
