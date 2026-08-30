import { Input } from '../../input/input.tsx';
import { Textarea } from '../../textarea/textarea.tsx';
import { Field } from '../field.tsx';

/**
 * エッジケース。**誤りと説明が両方あるとき、必須のとき。**
 *
 * 両方あるときは**両方が読み上げに届く**——片方だけにすると、
 * もう片方が黙る。
 *
 * 必須の印は記号だけでは読み上げに届かないので、**文字も一緒に置く。**
 *
 * 規則は持たない。**誤りの文言を受け取るだけ**である——
 * 走らせるのは利用側で、どのライブラリとも組める。
 */
export default function Edge() {
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 360 }}>
      <Field
        id="edge-mail"
        label="メールアドレス"
        description="仕事用のものを入れてください"
        error="この形では受け取れません"
        required
      >
        <Input type="email" defaultValue="not-an-email" />
      </Field>
      <Field id="edge-note" label="備考" description="何行でも構いません">
        <Textarea rows={4} placeholder="長い文章もここに" />
      </Field>
    </div>
  );
}
