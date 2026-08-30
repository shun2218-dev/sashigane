import { Field } from '../../field/field.tsx';
import { Input } from '../input.tsx';

/**
 * エッジケース。**誤りのときと、押せないとき。**
 *
 * 誤りの境界は mark の段を使う。**文字ではないものに要る 3:1 を満たす段**で、
 * 役割としても合っている。
 *
 * 押せないときは文字が淡くなる。**不透明度では表さない。**
 */
export default function Edge() {
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
      <Field id="input-edge" label="誤りのあるもの" error="この形では受け取れません">
        <Input />
      </Field>
      <Field id="input-off" label="押せないもの">
        <Input disabled />
      </Field>
    </div>
  );
}
