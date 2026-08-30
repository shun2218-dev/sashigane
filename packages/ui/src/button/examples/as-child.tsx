import { Button } from '../button.tsx';

/**
 * **見た目はボタン、中身はリンク。**
 *
 * `asChild` を付けると、この器は要素を1つも作らず、
 * クラスと属性を子へ移して子だけを描く。
 * ここで実際に描かれているのは `<a>` だけで、`<button>` は存在しない。
 *
 * 子は押せる要素1つだけである。
 * 複数の中身をまとめるときは、その要素の**内側**に入れる——
 * 外側を `div` で包むと、押せない `div` がボタンの見た目になる。
 *
 * 押せない状態は同時に使えない。`disabled` は `button` の機能で、
 * リンクに付けても何も起きないまま沈んだ見た目だけが残るためである。
 */
export default function AsChild() {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Button asChild>
        <a href="#as-child">塗りのリンク</a>
      </Button>
      <Button asChild variant="outline" tone="info">
        <a href="#as-child">枠のリンク</a>
      </Button>
      <Button asChild variant="ghost">
        {/* 中身が複数でも、まとめる先はリンクの内側にする */}
        <a href="#as-child">
          <span aria-hidden="true">↗</span>
          <span>アイコンと文字</span>
        </a>
      </Button>
    </div>
  );
}
