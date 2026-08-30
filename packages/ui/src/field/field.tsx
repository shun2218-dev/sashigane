/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **`id` を必須にしてある。** 自動で作る道は取らなかった——
 * 安定した名前を作るには `useId` が要り、**この部品がクライアント側になる。**
 * いまの部品はどれもサーバ側で描ける。
 *
 * 必須にしたことで、**書き忘れが型で止まる。** 忘れたまま描かれると、
 * 見た目は正常なのに読み上げが札と入力を結べない。
 *
 * **配線は Slot で子へ移す。** 子が1つだけという制約は `asChild` と同じ形で、
 * 仕組みも共有している——移し方が2つになると、壊れるまで誰も気づかない。
 *
 * **説明でクラス名に触れるときは `{}` で囲む。**
 * ─────────────────────────────────────────────
 */
import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { IconCheck } from '../icon/icon.tsx';
import { Slot } from '../internal/slot.tsx';

/**
 * 入力ひとつぶんの区画。**札・説明・誤りを、入力に結びつける。**
 *
 * ## 結びつけを利用側に書かせない
 *
 * 札と入力、説明と入力、誤りと入力。**どれも忘れると読み上げだけが黙る。**
 * 見た目は正常なので、書き忘れても気づけない。
 *
 * ここが `id` から全部の関連付けを作る。**利用側は `id` を1つ渡すだけ**である。
 *
 * ## バリデーションは持たない
 *
 * 規則を走らせる仕組みは持っていない。**誤りの文言を受け取るだけ**である。
 *
 * どのライブラリとも組める——受け取るのは標準の props だけで、
 * react-hook-form でも素の `FormData` でも同じように使える。
 */
export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /**
   * 入力の `id`。**必須である。**
   *
   * ここから説明と誤りの `id` も導く。自動で作らないのは、
   * 作るとこの部品がクライアント側になるためである。
   */
  id: string;
  /** 札。**入力に結びつく** */
  label: ReactNode;
  /** 入力の下に出す説明。読み上げにも渡る */
  description?: ReactNode;
  /**
   * 誤りの文言。**渡すと入力が「誤り」を名乗る。**
   *
   * 規則は持たない——**走らせるのは利用側**である。
   */
  error?: ReactNode;
  /** 入力が要るかどうか。**札にも入力にも届く** */
  required?: boolean;
  /**
   * 満たしていること。**印と境界で表す。**
   *
   * 誤りと同時には使えない。**両方は成り立たない**ので、誤りが勝つ。
   *
   * 誤りには `aria-invalid` という標準の属性があるが、
   * **満たしていることを表す属性は無い。** そこだけ形が違うのはそのためである。
   */
  valid?: boolean;
  /** 入力そのもの。**要素1つだけ** */
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export function Field({
  id,
  label,
  description,
  error,
  required = false,
  valid = false,
  className,
  children,
  ...props
}: FieldProps) {
  // **両方は成り立たない。** 誤りが勝つ
  const showValid = valid && !error;
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  // **両方あるときは両方渡す。** 片方だけにすると、もう片方が読み上げに届かない
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  const classes = 'flex flex-col gap-1';
  return (
    <div
      data-sg-component="field"
      className={className ? `${classes} ${className}` : classes}
      {...props}
    >
      <label data-sg-component="field-label" className="text-label" htmlFor={id}>
        {label}
        {required ? (
          // 記号だけでは読み上げに届かない。**文字も一緒に置く**
          <span className="text-danger" aria-hidden="true">
            {' *'}
          </span>
        ) : null}
        {required ? <span className="sr-only">（必須）</span> : null}
      </label>

      {/*
        配線を子へ移す。**利用側が書き忘れる余地を作らない。**

        満たしているときは印を重ねるので、**入力を包む。**
        包むのはそのときだけである——常に包むと、
        中身の無い器が全部の欄に増える。
      */}
      {showValid ? (
        <div className="relative flex flex-col">
          <Slot id={id} required={required} aria-describedby={describedBy} valid>
            {children}
          </Slot>
          {/*
            印は読み上げから隠れている。**満たしていることは境界が伝える**——
            印を読ませても「チェック」としか言わない。

            ここで `aria-hidden` を書いていないのは、**Icon の既定がそうだから**である。
            書くと同じことが2箇所に並び、片方だけ直したときにずれる。
            **重複を外したとき、壊し方が1件も落ちなくなって気づいた。**
          */}
          <IconCheck size="sm" className="pointer-events-none absolute end-3 top-3 text-success" />
        </div>
      ) : (
        <Slot
          id={id}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
        >
          {children}
        </Slot>
      )}

      {description ? (
        <p data-sg-component="field-description" id={descriptionId} className="text-caption text-muted">
          {description}
        </p>
      ) : null}

      {error ? (
        <p data-sg-component="field-error" id={errorId} className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
