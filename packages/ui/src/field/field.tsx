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
 * **移し方は子を勝たせる。** つまり入力の側で `id` を書くと、
 * こちらが渡した `id` が消える。札は元の `id` を指したままなので、
 * **結びつきだけが静かに切れる。** 見た目は正常で、読み上げだけが黙る。
 * だから**重なるものが来たら投げる。**
 * `register()` が返す `name` / `onChange` / `onBlur` / `ref` は重ならない。
 *
 * **説明でクラス名に触れるときは `{}` で囲む。**
 * ─────────────────────────────────────────────
 */
import { isValidElement } from 'react';
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

/** 配線に使う props。**入力の側で書かれると、こちらが渡したものが消える** */
const WIRED = ['id', 'aria-describedby', 'aria-invalid'] as const;

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

  /*
   * **黙って通さない。** 移し方は子を勝たせるので、
   * 入力の側で配線を書かれると**こちらの配線が消える。**
   * 消えても見た目は正常で、読み上げだけが黙る。
   */
  if (isValidElement(children)) {
    const own = children.props as Record<string, unknown>;
    const taken = WIRED.filter((key) => own[key] !== undefined);
    if (taken.length > 0) {
      throw new Error(
        `Field の中の入力に ${taken.join(' / ')} を書かないでください。` +
          'これらは Field が札と誤りに結びつけるために渡します——' +
          '入力の側で書くと、こちらが渡したものが消えて結びつきだけが切れます。' +
          '見た目は正常なままなので気づけません。',
      );
    }
  }
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  // **両方あるときは両方渡す。** 片方だけにすると、もう片方が読み上げに届かない
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  /*
   * 間隔は入力の輪郭を見込んである。**輪郭は箱の外へ出る**ので、
   * 隙間をそのぶん食う。フォーカス中の誤りは 3px まで太るため、
   * 4px だと線が説明文にほとんど触れる。
   */
  const classes = 'flex flex-col gap-2';
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

        ## 器は状態によらず常に置く

        印を重ねるために入力を包む必要があるが、**包むのを満たしているときだけに
        していた。** 状態が変わるとその位置の要素の型が変わるので、
        **React が入力を作り直す。**

        入力中に誤りと満たしているが入れ替わると、**打っている最中に
        フォーカスが外れる。** 見た目には何も出ない——文字が入らなくなるだけである。
        `xxx@gmail.c` まで打ったところで切り替わり、その先が打てなくなっていた。

        **中身の無い器が増えるのを嫌って条件つきにしていた。** 代償が合っていない。
      */}
      <div className="relative flex flex-col">
        <Slot
          id={id}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          // **満たしていないときは渡さない。** `false` を渡すと、
          // 素の `input` を子に置いた利用側で不明な属性になる
          valid={showValid || undefined}
        >
          {children}
        </Slot>
        {/*
          印は読み上げから隠れている。**満たしていることは線が伝える**——
          印を読ませても「チェック」としか言わない。

          ここで `aria-hidden` を書いていないのは、**Icon の既定がそうだから**である。
          書くと同じことが2箇所に並び、片方だけ直したときにずれる。
          **重複を外したとき、壊し方が1件も落ちなくなって気づいた。**
        */}
        {showValid ? (
          <IconCheck size="sm" className="pointer-events-none absolute end-3 top-3 text-success" />
        ) : null}
      </div>

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
