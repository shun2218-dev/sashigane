/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * `asChild` の中身。**コンポーネントではないので例も展示ページも持たない。**
 * 検査はコンポーネントを `<name>/<name>.tsx` で数えているため、ここは対象外である。
 *
 * ## 自前で持っている理由
 *
 * radix の Slot を入れれば同じことができるが、**このファイルは配布先へ落ちる。**
 * 落ちた先で依存が1つ増える。60 行で足りるものに依存を足していない。
 *
 * ## 移すときに気をつけること
 *
 * **`children` を移さない。** 移すと子が自分自身を子に持つ。
 * 呼び出し側で分解して落としてある。
 *
 * **行事は両方呼ぶ。** 片方だけにすると、渡した onClick が黙って消える。
 * **子を先に呼ぶ。** 子の側で `preventDefault` した結果を、こちらが見られる。
 * ─────────────────────────────────────────────
 */
import { cloneElement, isValidElement } from 'react';
import type { CSSProperties, ReactNode, Ref } from 'react';

type Props = Record<string, unknown>;

/** `onClick` のような行事の props。**両方呼ぶ対象** */
const isEventHandler = (key: string) => /^on[A-Z]/.test(key);

/** ref は callback でも object でもありうる。**両方に配る** */
const assignRef = (ref: unknown, node: unknown) => {
  if (typeof ref === 'function') (ref as (n: unknown) => void)(node);
  else if (ref && typeof ref === 'object') (ref as { current: unknown }).current = node;
};

const composeRefs =
  (own: unknown, child: unknown): Ref<unknown> =>
  (node: unknown) => {
    assignRef(own, node);
    assignRef(child, node);
  };

/**
 * 自分の props を子の props に混ぜる。**純粋な関数にしてある**——
 * 文字列で対照を当てられるようにするため。
 *
 * 既定は**子が勝つ。** 子は使う側が直接書いたものなので、
 * こちらの既定より意図が強い。次の3つだけ例外である。
 *
 *   - **class** — 連結する。こちらが先、子が後
 *   - **style** — 混ぜる。同じ鍵は子が勝つ
 *   - **行事と ref** — 両方に配る。**片方を捨てない**
 */
export const mergeSlotProps = (own: Props, child: Props): Props => {
  const merged: Props = { ...own, ...child };

  for (const key of Object.keys(own)) {
    const o = own[key];
    const c = child[key];

    if (isEventHandler(key)) {
      if (typeof o === 'function' && typeof c === 'function') {
        merged[key] = (...args: unknown[]) => {
          (c as (...a: unknown[]) => void)(...args);
          (o as (...a: unknown[]) => void)(...args);
        };
      }
    } else if (key === 'ref') {
      merged.ref = o && c ? composeRefs(o, c) : (c ?? o);
    } else if (key === 'className') {
      merged.className = [o, c].filter(Boolean).join(' ');
    } else if (key === 'style') {
      merged.style = { ...(o as CSSProperties), ...(c as CSSProperties) };
    }
  }

  return merged;
};

export interface SlotProps extends Props {
  children?: ReactNode;
}

/**
 * 子を1つだけ受け取り、自分の props を移して**その子だけを描く。**
 * 自分では要素を1つも作らない。
 */
export function Slot({ children, ...own }: SlotProps) {
  if (!isValidElement(children)) {
    // **黙って通さない。** 子が無い／複数あると、渡したクラスと属性が
    // どこにも付かないまま「それらしく」描画される
    throw new Error(
      'asChild を使うときは、要素を1つだけ子に置いてください。' +
        '複数の中身をまとめるときは、その要素の内側に入れてください——' +
        '外側を div で包むと、押せない div がボタンの見た目になります。',
    );
  }
  return cloneElement(children, mergeSlotProps(own, children.props as Props));
}
