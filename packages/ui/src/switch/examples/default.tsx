import { Field } from '../../field/field.tsx';
import { Switch } from '../switch.tsx';

/**
 * 通常。**押した瞬間に効くもの**に使う。
 *
 * 送信して初めて効くものはチェックボックスである。**見た目だけの違いではない。**
 */
export default function Default() {
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
      <Field layout="inline" id="switch-default" label="暗い配色にする">
        <Switch name="dark" defaultChecked />
      </Field>
      <Field layout="inline" id="switch-off" label="効果音を鳴らす">
        <Switch name="sound" />
      </Field>
    </div>
  );
}
