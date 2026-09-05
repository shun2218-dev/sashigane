import { Field } from '../../field/field.tsx';
import { Input } from '../input.tsx';

/**
 * 通常。**凹んだ面を宣言している。**
 *
 * 入力欄は地であって塗りではない。背景と文字が対で決まるので、塗るだけの道が無い。
 *
 * 札との結びつけは Field が作る。単体でも置けるが、
 * **そのときは結びつけを利用側が書くことになる。**
 */
export default function Default() {
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
      <Field id="input-default" label="札のあるもの">
        <Input />
      </Field>
    </div>
  );
}
