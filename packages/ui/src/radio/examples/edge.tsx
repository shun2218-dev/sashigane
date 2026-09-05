import { Field } from '../../field/field.tsx';
import { Radio } from '../radio.tsx';
import { RadioGroup } from '../radio-group.tsx';

/**
 * エッジケース。**押せない選択肢と、群れに対する誤り。**
 *
 * 誤りは**群れに付く。** 選ばれていないのは選択肢1つの問題ではないので、
 * 1つずつに赤い線を引いても、どれを直せばよいか伝わらない。
 */
export default function Edge() {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <RadioGroup id="radio-ship" label="送り方" error="どれか選んでください">
        <Field layout="inline" id="radio-ship-a" label="ふつう">
          <Radio name="radio-ship-choice" value="a" />
        </Field>
        <Field layout="inline" id="radio-ship-b" label="急ぎ">
          <Radio name="radio-ship-choice" value="b" />
        </Field>
        <Field layout="inline" id="radio-ship-c" label="いまは選べない">
          <Radio name="radio-ship-choice" value="c" disabled />
        </Field>
      </RadioGroup>
    </div>
  );
}
