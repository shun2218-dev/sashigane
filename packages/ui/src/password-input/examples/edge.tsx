import { Field } from '../../field/field.tsx';
import { PasswordInput } from '../password-input.tsx';

/**
 * エッジケース。**誤り・満たしている・押せない。**
 *
 * 満たしているときは印が末尾に重なる。**切り替えのボタンと場所がぶつかる**ので、
 * ボタンを内側へ寄せている。
 *
 * 押せないときはボタンも押せない。**中身が見えないのに切り替えだけ動くのは嘘である。**
 */
export default function Edge() {
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
      <Field id="password-error" label="誤りのあるもの" error="8文字以上にしてください">
        <PasswordInput defaultValue="短い" />
      </Field>
      <Field id="password-valid" label="満たしているもの" valid>
        <PasswordInput defaultValue="じゅうぶんに長い文字列" />
      </Field>
      <Field id="password-off" label="押せないもの">
        <PasswordInput defaultValue="かくれている" disabled />
      </Field>
    </div>
  );
}
