import { Radio } from '../radio.tsx';

/**
 * 空。**グループもラベルも無い、ラジオ1つだけ。**
 *
 * この形は**実際には使い道が無い。** 同じ `name` の相手がいないと、
 * 一度入れたものを外せない——ラジオには外す操作が無いためである。
 *
 * 置けてしまうことを隠さずに出しておく。
 */
export default function Empty() {
  return <Radio aria-label="ひとつだけ" name="radio-alone" value="only" />;
}
