/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * このブロックは JSDoc ではないので、型表には出ない。
 * **利用者に届く文面（JSDoc・例・展示ページ）には内部の参照を書かない。**
 * 番号だけ書かれても、読む側には辿る先が無い。
 *
 * 設計の経緯・退けた案・測定は、**sashigane 本体のリポジトリの設計記録**にある
 * （面は文脈である／hover は面の文脈である／浮きは暗色では輪郭になる、あたり）。
 *
 * **パスでは書かない。** このファイルはレジストリ配信で利用側リポジトリへ落ちるので、
 * リポジトリ相対のパスは落ちた先で必ず壊れる。書くなら絶対 URL にする。
 * 同じ穴を生成物のヘッダで一度踏んでおり、そちらは絶対 URL で解いてある。
 *
 * ## 踏みやすい罠が2つある
 *
 * **境界の役割は `border-border` である。** `border-{default}` は文字色を指す。
 * どちらも生成されるので、**検査は取り違えを捕まえない。**
 * 検査が見ているのは「クラスがトークンに解決すること」であって、
 * 「意図した役割を指していること」ではない。
 *
 * **説明でクラス名に触れるときは `{}` で囲む。** 囲まないと Tailwind が候補として拾い、
 * 使っていない規則が生成 CSS に残る。
 * ─────────────────────────────────────────────
 */
import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { Slot } from '../internal/slot.tsx';

/** 面の既定。**1箇所だけに書く。** 散らすと、片方だけ直したときにずれる */
const DEFAULT_SURFACE = 'surface';

/**
 * 面を1つ作る器。
 *
 * ## 面は塗らずに宣言する
 *
 * このコンポーネントは背景色を1つも書かない。
 * 背景・文字色・境界色は、すべて `data-sg-surface` の宣言から来る。
 *
 * 背景だけを塗る方法を用意していないのは、**塗れてしまうと前景が親の面のまま残り、
 * 読みにくい組み合わせができてもエラーにならない**ためである。
 *
 * ## hover も塗らない
 *
 * `interactive` は面の文脈を1段深くするだけで、背景を直接塗らない。
 * 背景だけを深くすると前景が置き去りになるので、塗る道は用意していない。
 *
 * ## 器が div とは限らない
 *
 * 記事なら `article`、区画なら `section`、カード全体がリンクなら `a` になる。
 * `asChild` を付けると**この器は要素を1つも作らず**、
 * クラスと属性を子へ移して**子だけを描く。**
 */
const card = cva('p-surface rounded-sm border-1 border-border', {
  variants: {
    /**
     * 面の種類。
     *
     * `surface` は通常の器、`overlay` は他の要素に重なるもの。
     * 入力欄やコードブロックの地に使う「凹んだ面」は別の役割なので、ここには無い。
     */
    surface: {
      surface: '',
      overlay: '',
    },
    /**
     * 浮き。**既定は `none`。**
     *
     * 影を既定にしていないのは、影と角丸を使わない設計が実在するためである。
     * 暗色では影ではなく輪郭として出る——暗い地の上で影はほとんど見えないので、
     * 段の差で表している。
     */
    elevation: {
      none: '',
      raised: 'shadow-raised',
      overlay: 'shadow-overlay',
      front: 'shadow-front',
    },
  },
  /*
   * `overlay` は `surface` と同じ深さに置いてあるので、浮きが無いと暗色で下地と同化する。
   * そのため「浮きを付けられる」ではなく「**浮き無しでは組み立てられない**」形にしてある。
   * `elevation` を明示すれば上書きできるが、省略したときに沈むことは無い。
   */
  compoundVariants: [{ surface: 'overlay', elevation: 'none', class: 'shadow-overlay' }],
  defaultVariants: { surface: DEFAULT_SURFACE, elevation: 'none' },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof card> {
  /**
   * hover 中だけ面の文脈を1段深くする。
   *
   * 背景だけを塗る方法は用意していない。前景も一緒に切り替わる。
   */
  interactive?: boolean;
  /**
   * 器を作らず、クラスと属性を子へ移す。**子は要素1つだけ。**
   *
   * `article` や `section` にしたいとき、カード全体をリンクにしたいときに使う。
   */
  asChild?: boolean;
  children?: ReactNode;
  /**
   * 描いた要素を受け取る。`asChild` のときは**子の要素**が届く——
   * 器を作らないためである。子の側にも `ref` があれば**両方に配られる。**
   */
  ref?: Ref<HTMLElement>;
}

/**
 * 面を1つ作る器。**色は1つも書かない。**
 *
 * 背景も文字色も境界色も、`data-sg-surface` の宣言から来る。hover も塗らずに宣言する。
 */
export function Card({
  surface,
  elevation,
  interactive = false,
  asChild = false,
  className,
  ...props
}: CardProps) {
  // 式の中で組み立てない。cva の呼び出しを補間の中へ直接置くと、
  // 静的解析の検査が読み切れずに落ちる
  const classes = card({ surface, elevation });
  const shared = {
    'data-sg-surface': surface ?? DEFAULT_SURFACE,
    'data-sg-interactive': interactive ? '' : undefined,
    className: className ? `${classes} ${className}` : classes,
    ...props,
  };
  if (asChild) return <Slot {...shared} />;
  /*
   * **ここだけ型を緩める。** props を分解した時点で `ref` の型が
   * `Ref<HTMLElement>`（`asChild` 側で受ける型）に広がる。
   * この枝は `asChild` が false なので、実際に届くのは `div` である。
   */
  return <div {...(shared as HTMLAttributes<HTMLDivElement>)} />;
}
