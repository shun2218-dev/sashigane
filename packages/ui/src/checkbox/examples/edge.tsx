import { Field } from '../../field/field.tsx';
import { Checkbox } from '../checkbox.tsx';

/**
 * エッジケース。**押せないときと、誤りのとき。**
 *
 * 押せないときは塗りの段が落ちる。`data-sg-fill` は宣言なので CSS では
 * 差し替えられないが、**`disabled` は描くときに分かる。**
 *
 * 誤りのときは線が変わる。**線だけで伝えない**——文言も一緒に出す。
 */
export default function Edge() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Field layout="inline" id="checkbox-off" label="押せない">
        <Checkbox disabled />
      </Field>
      <Field layout="inline" id="checkbox-off-on" label="押せない・入っている">
        <Checkbox disabled defaultChecked />
      </Field>
      <Field layout="inline" id="checkbox-bad" label="同意する" error="同意が要ります" required>
        <Checkbox />
      </Field>
      <Field layout="inline" id="checkbox-ok" label="同意する" valid>
        <Checkbox defaultChecked />
      </Field>
    </div>
  );
}
