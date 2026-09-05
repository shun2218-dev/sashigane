import { Textarea } from '../textarea.tsx';

/**
 * 空。**中身もラベルも無いとき。**
 *
 * 単体で置くとラベルとの結びつけが無い。**読み上げは「編集欄」としか言わない**ので、
 * 実際には Field と一緒に使う。ここでは枠そのものの見た目を見る。
 */
export default function Empty() {
  return (
    <div style={{ maxWidth: 360 }}>
      <Textarea aria-label="ラベルの無い入力" rows={3} />
    </div>
  );
}
