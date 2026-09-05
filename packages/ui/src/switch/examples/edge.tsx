import { Field } from '../../field/field.tsx';
import { Switch } from '../switch.tsx';

/**
 * エッジケース。**押せないときと、誤りのとき。**
 *
 * 押せないときは塗りの段が落ちる。**不透明度では表さない。**
 */
export default function Edge() {
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
      <Field layout="inline" id="switch-disabled-on" label="押せない（入っている）">
        <Switch name="a" defaultChecked disabled />
      </Field>
      <Field layout="inline" id="switch-disabled-off" label="押せない（切れている）">
        <Switch name="b" disabled />
      </Field>
      <Field layout="inline" id="switch-error" label="誤りのあるもの" error="ここは変えられません">
        <Switch name="c" />
      </Field>
    </div>
  );
}
