import { Separator } from '../separator.tsx';

/**
 * エッジケース。**縦向きは親の高さに広がる。**
 *
 * 親が高さを持たないと**見えない。** 下の2つを見比べられる。
 *
 * 意味のある区切り（話題が変わる、群が変わる）のときだけ飾りを外す。
 * 見た目は変わらない——**変わるのは読み上げに出るかどうかだけ**である。
 */
export default function Edge() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div>
        <p>親が高さを持つとき</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', height: 40 }}>
          <span>左</span>
          <Separator orientation="vertical" />
          <span>右</span>
        </div>
      </div>
      <div>
        <p>親が高さを持たないとき（線が出ません）</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Separator orientation="vertical" />
        </div>
      </div>
      <div>
        <p>意味のある区切り</p>
        <Separator decorative={false} />
      </div>
    </div>
  );
}
