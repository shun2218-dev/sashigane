/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * 群れの札。**`fieldset` と `legend` でしか作れない。**
 * `div` に `aria-label` を足す形も動くが、
 * **`legend` は選択肢を読むたびに読み上げが群れの札を添える。**
 *
 * ## 配線は Field と同じ形にしてある
 *
 * `id` を必須にし、そこから説明と誤りの `id` を導く。
 * **自動で作る道は取っていない**——`useId` が要り、この部品がクライアント側になる。
 *
 * ## `name` は配っていない
 *
 * 配るには文脈（context）が要り、**クライアント側の部品になる。**
 * いまはどの部品もサーバ側で描ける。利用側が各 Radio に同じ `name` を書く。
 * ─────────────────────────────────────────────
 */
import type { FieldsetHTMLAttributes, ReactNode, Ref } from 'react';

export interface RadioGroupProps
  extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, 'children'> {
  /**
   * 群れの `id`。**必須である。**
   *
   * ここから説明と誤りの `id` も導く。自動で作らないのは、
   * 作るとこの部品がクライアント側になるためである。
   */
  id: string;
  /** 群れの札。**`legend` になる** */
  label: ReactNode;
  /** 選択肢の下に出す説明。読み上げにも渡る */
  description?: ReactNode;
  /**
   * 誤りの文言。**渡すと群れが「誤り」を名乗る。**
   *
   * 規則は持たない——**走らせるのは利用側**である。
   */
  error?: ReactNode;
  /** 選択肢。**Field で包んだ Radio を並べる** */
  children: ReactNode;
  ref?: Ref<HTMLFieldSetElement>;
}

/**
 * ラジオの群れ。**群れの札と、群れに対する説明・誤りを持つ。**
 *
 * ## 群れの札が要る理由
 *
 * 1つずつの札（「ふつう」「大きい」）だけでは、
 * **何についての選択なのかが読み上げに出ない。**
 *
 * ## バリデーションは持たない
 *
 * 規則を走らせる仕組みは持っていない。**誤りの文言を受け取るだけ**である。
 */
export function RadioGroup({
  id,
  label,
  description,
  error,
  className,
  children,
  ...props
}: RadioGroupProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  // **両方あるときは両方渡す。** 片方だけにすると、もう片方が読み上げに届かない
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  const classes = 'flex flex-col gap-2';
  return (
    <fieldset
      id={id}
      data-sg-component="radio-group"
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      className={className ? `${classes} ${className}` : classes}
      {...props}
    >
      <legend data-sg-component="radio-group-label" className="text-label">
        {label}
      </legend>
      {children}

      {description ? (
        <p data-sg-component="radio-group-description" id={descriptionId} className="text-caption text-muted">
          {description}
        </p>
      ) : null}

      {error ? (
        <p data-sg-component="radio-group-error" id={errorId} className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
