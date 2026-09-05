'use client';

/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **`type` を入れ替えるだけである。** 枠を差し替えない。
 *
 * 状態で枠の有無を変えると React が中身を作り直し、**打っている最中に
 * フォーカスが外れて文字が入らなくなる**（過去に踏んでいる）。
 * ここは同じ `input` 要素の属性だけが変わるので、作り直しが起きない。
 * **テストが打ちながら切り替えて測っている。**
 *
 * ## 見た目は Input から借りる
 *
 * 線も箱も `input/input.tsx` の `frameClass` と `control` を使う。
 * **写しを作ると、片方だけ直したときにずれる。**
 *
 * ## 満たしている印と場所を分ける
 *
 * `Field` は満たしているとき、印を欄の末尾に重ねる。切り替えのボタンも末尾にある。
 * **そのままだと重なる**ので、満たしているときだけボタンを内側へ寄せる。
 * ─────────────────────────────────────────────
 */
import { useState } from 'react';
import type { InputHTMLAttributes, Ref } from 'react';
import { control, frameClass } from '../input/input.tsx';
import { stateOf } from '../internal/ring.ts';
import { IconEye, IconEyeOff } from '../icon/icon.tsx';

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * 満たしていることを示す。**誤りとは別の仕組みで受け取る**（Input と同じ）。
   */
  valid?: boolean;
  /**
   * 見せる／隠すのラベル。**利用側の言葉に差し替えられる。**
   *
   * 既定は日本語である。この系の文言はどれも日本語なので、そこに揃えている。
   */
  showLabel?: string;
  hideLabel?: string;
  ref?: Ref<HTMLInputElement>;
}

/**
 * パスワードの入力欄。**打った文字を確かめられる。**
 *
 * ## `type` を入れ替える
 *
 * `type` は CSS では変えられない。**この部品は状態を持つ**ので、
 * サーバ側では描けない。
 *
 * 入れ替えるのは同じ要素の属性だけである。枠ごと差し替えると、
 * **打っている最中にフォーカスが外れる。**
 *
 * ## 見せている状態を隠さない
 *
 * ボタンのラベルが「見せる」から「隠す」に変わる。
 * **読み上げはラベルの変化で状態を知る**ので、`aria-pressed` は重ねない。
 *
 * ## 中身は覚えない
 *
 * 値は利用側が持つ。**この部品が覚えるのは「見せているかどうか」だけ**である。
 * 切り替えはフォームを送らない（`type="button"`）。
 */
export function PasswordInput({
  valid,
  className,
  showLabel = 'パスワードを表示',
  hideLabel = 'パスワードを隠す',
  ...props
}: PasswordInputProps) {
  const [shown, setShown] = useState(false);
  // 式の中で組み立てない。cva の呼び出しを補間の中へ直接置くと、
  // 静的解析の検査が読み切れずに落ちる
  const state = stateOf(valid, props['aria-invalid']);
  const outer = frameClass(state);
  /*
   * **`control` には `none` を渡す。** `valid` のときの `pe-8` は
   * 「印の場所を欄の中に空ける」ためのものだが、ここでは印もボタンも
   * 欄の**外**（枠の並びと重ね）にある。渡すと使われない余白が中に増える。
   */
  const inner = control({ state: 'none' });
  // 満たしているとき、印がボタンの上に来る。ボタンを内側へ寄せて場所を分ける
  /*
   * 満たしているときの寄せ幅は、印の位置から決まる。**当てずっぽうではない。**
   * Field の印は末尾から 12px の位置に 16px で置かれるので、
   * 末尾から 28px までを占める。ボタンはその外側へ出す必要がある。
   * 24px では 4px 重なった（測ってある）。
   */
  const button = valid ? 'me-8 shrink-0 px-2 text-muted' : 'shrink-0 px-2 text-muted';
  return (
    <div
      data-sg-component="password-input-frame"
      className={className ? `${outer} ${className}` : outer}
    >
      <input
        data-sg-component="password-input"
        data-sg-surface="inset"
        type={shown ? 'text' : 'password'}
        className={inner}
        {...props}
      />
      <button
        type="button"
        data-sg-component="password-input-toggle"
        data-sg-interactive=""
        aria-label={shown ? hideLabel : showLabel}
        disabled={props.disabled}
        className={button}
        onClick={() => setShown((v) => !v)}
      >
        {shown ? <IconEyeOff size="sm" /> : <IconEye size="sm" />}
      </button>
    </div>
  );
}
