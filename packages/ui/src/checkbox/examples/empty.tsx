import { Checkbox } from '../checkbox.tsx';

/**
 * 空。**札も説明も無い。**
 *
 * 表の行を選ぶような、**札を置く場所が無い**場面がある。
 * そのときは `aria-label` で名前を渡す——名前が無いと読み上げが「チェックボックス」としか言わない。
 */
export default function Empty() {
  return <Checkbox aria-label="この行を選ぶ" />;
}
