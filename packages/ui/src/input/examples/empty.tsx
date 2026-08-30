import { Input } from '../input.tsx';

/**
 * 空。**中身も札も無いとき。**
 *
 * 単体で置くと札との結びつけが無い。**読み上げは「編集欄」としか言わない**ので、
 * 実際には Field と一緒に使う。ここでは器そのものの見た目を見る。
 */
export default function Empty() {
  return (
    <div style={{ maxWidth: 360 }}>
      <Input aria-label="札の無い入力" />
    </div>
  );
}
