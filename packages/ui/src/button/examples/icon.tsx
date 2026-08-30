import { Button } from '../button.tsx';

/**
 * **アイコンと一緒に使う。**
 *
 * アイコンは持っていない。**利用側が好きなものを子として置く。**
 * ここでは説明のために素の SVG を書いている。
 *
 * 文字と並べるときは、アイコンを読み上げから隠す——
 * **文字が既に同じことを言っている**ので、二重に読まれる。
 *
 * アイコンだけのときは逆で、**名前を別に与えないと読み上げに渡すものが無い。**
 * `aria-label` か `aria-labelledby` を型で必須にしてある。
 *
 * ## アイコンの大きさは行の高さに合わせる
 *
 * 上下の余白は文字のときと同じなので、**中身の高さがそのまま器の高さの差になる。**
 * 行の高さ（`size-6` = 24px）に合わせると、正方形になり、文字のボタンとも高さが揃う。
 * **この例でも `size-6` を当てている**——案内している書き方と、見せる書き方をそろえるため。
 *
 * 小さいアイコンを入れると器も小さくなる。下の列で見比べられる。
 */
const path = 'M4 4l16 16M20 4l-16 16';

/**
 * 行の高さと同じ大きさ。**`size-6` を当てる。**
 *
 * 寸法を属性ではなくクラスで書いているのは、
 * **利用側が段の外の値を書けないようにする**ためである。
 */
const Close = () => (
  <svg className="size-6" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d={path} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** 行の高さより小さい。**器も小さくなる** */
const SmallClose = () => (
  <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d={path} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default function Icon() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button>
          <Close />
          文字と一緒に
        </Button>
        <Button variant="outline">
          <Close />
          枠の中でも
        </Button>
        <Button iconOnly aria-label="閉じる">
          <Close />
        </Button>
        <Button iconOnly variant="outline" tone="danger" aria-label="削除する">
          <Close />
        </Button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button>文字だけ</Button>
        <Button iconOnly aria-label="小さいアイコン">
          <SmallClose />
        </Button>
        <span>← 行の高さより小さいと、器も小さくなります</span>
      </div>
    </div>
  );
}
