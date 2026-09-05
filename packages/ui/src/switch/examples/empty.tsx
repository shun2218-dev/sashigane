import { Field } from '../../field/field.tsx';
import { Switch } from '../switch.tsx';

/**
 * 空。**切れているとき。**
 *
 * つまみは境界を持つので、地に沈まない。**塗りだけだと、
 * 凹んだ面の上で見えなくなる。**
 */
export default function Empty() {
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
      <Field layout="inline" id="switch-empty" label="まだ切れているもの">
        <Switch name="empty" />
      </Field>
    </div>
  );
}
