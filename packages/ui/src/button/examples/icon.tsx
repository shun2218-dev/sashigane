import { Button } from '../button.tsx';
import { IconX } from '../../icon/icon.tsx';

/**
 * **アイコンと一緒に使う。**
 *
 * アイコンは Icon で包んである。**図案は lucide から来る。**
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
 * 行の高さに合わせると、正方形になり、文字のボタンとも高さが揃う。
 * Icon の既定がその大きさなので、**何も指定しなければ揃う。**
 *
 * 小さい段を選ぶと器も小さくなる。下の列で見比べられる。
 */
export default function Icon() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button>
          <IconX />
          文字と一緒に
        </Button>
        <Button variant="outline">
          <IconX />
          枠の中でも
        </Button>
        <Button iconOnly aria-label="閉じる">
          <IconX />
        </Button>
        <Button iconOnly variant="outline" tone="danger" aria-label="削除する">
          <IconX />
        </Button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button>文字だけ</Button>
        <Button iconOnly aria-label="小さいアイコン">
          <IconX size="sm" />
        </Button>
        <span>← 行の高さより小さいと、器も小さくなります</span>
      </div>
    </div>
  );
}
