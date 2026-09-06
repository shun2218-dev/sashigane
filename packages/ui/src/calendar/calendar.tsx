'use client';

/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **暦は react-day-picker に乗せる。** 依存はこの部品を入れた利用者だけが持つ
 * （カルーセルと Embla の関係と同じ）。
 *
 * ## なぜ自作しなかったか
 *
 * 単一の日付だけなら `Intl.DateTimeFormat` と `Date` で足りる。
 * **範囲選択まで持つなら足りない**——升目の中の焦点移動、選択の申告、
 * 月を移ったときの読み上げが一気に増える。
 *
 * `react-aria-components` は最も強いが、直接7つ・推移的にさらに多数で、
 * **暦1つのために持つ依存の量ではない。**
 *
 * ## 向こうの CSS を読み込まない
 *
 * `react-day-picker/style.css` は**このスケールの外の値**を持つ（原則1）。
 * 代わりに `classNames` で部位ごとにクラスを差す。
 *
 * **差し忘れた部位は、素のまま出る。** 向こうの既定は `rdp-*` という
 * 名前だけで、当てる CSS がここには無い。エラーは出ないので、
 * **テストが部位ごとに色と寸法を測っている。**
 *
 * ## 言語は利用側が渡す
 *
 * 月名・曜日名・週の開始は言語で変わる。**既定を持たない**——
 * 書体名と同じで、**ブランドの選択であってシステムの選択ではない**（原則2）。
 * 渡さなければ向こうの既定（英語）になる。
 *
 * ## 月送りは Button を通す
 *
 * 暦は面（ページか surface）の上に乗るので、`ghost` の `text-accent` が
 * そのまま使える。**知らせの枠とは事情が違う**——あちらは淡い塗りの上だった。
 * ─────────────────────────────────────────────
 */
import { DayPicker } from 'react-day-picker';
import type { DayPickerProps } from 'react-day-picker';
import { Button } from '../button/button.tsx';
import { IconChevronLeft, IconChevronRight } from '../icon/icon.tsx';
import { FOCUS_RING } from '../internal/focus.ts';

/**
 * 日の升（`td`）。**塗りも角も境界も、ここに付く。**
 *
 * 向こうは選択・今日・範囲の印を**升の側**に付け、中の釦には
 * `day_button` のクラスしか渡さない。**塗りを釦に付けると、印が届かない。**
 *
 * **全部の升が透明な境界を持つ。** 今日だけが境界を持つ形にすると、
 * そこで箱が 2px ずれる。
 */
const DAY = 'size-8 rounded-sm border-1 border-transparent p-0 text-center';

/** 升の中の釦。**升いっぱいに広がる。** 線だけを自分で持つ */
const DAY_BUTTON =
  `flex size-full cursor-pointer items-center justify-center rounded-sm ${FOCUS_RING}`;

/**
 * 部位ごとのクラス。**向こうの既定を上書きする。**
 *
 * ここに無い部位は素のまま出る。**当てる CSS はここに無い**ので、
 * 見た目が崩れる形で現れる——エラーにはならない。
 */
const classNames = {
  root: 'w-fit',
  months: 'flex flex-wrap gap-6',
  month: 'flex flex-col gap-3',
  month_caption: 'flex h-8 items-center justify-center',
  caption_label: 'text-label font-emphasis text-default',
  nav: 'flex items-center justify-between gap-1',
  month_grid: 'border-collapse',
  weekday: 'size-8 text-caption font-body text-muted',
  day: DAY,
  day_button: DAY_BUTTON,
  /*
    **今日の境界は `!` で決める。** 升は全部 `border-transparent` を持つので、
    同じ特定度の `border-color` が2つ並ぶ——出力順に勝敗を委ねない。

    実際、付けずに出したとき**今日の印が透明のまま出ていた。**
    幅を測るテストは通っていた（幅は 1px のまま）。
  */
  today: 'border-accent-mark!',
  selected: 'bg-accent-strong text-on-accent',
  /*
    **範囲の端と中は同じ濃さにしない。** 端がどこか読めなくなる。

    中は `selected` も同時に当たる。**同じ特定度のクラスが並ぶので、
    出力順に勝敗を委ねない**（`ring.ts` が退けている形）——`!` で決める。
  */
  range_middle: 'bg-accent-subtle! text-on-accent-subtle! rounded-none!',
  /*
    端は外側だけ丸める。**中と繋がって1本に見える。**

    こちらは `!` が要らない——`rounded-r-*` は片側だけの規則で、
    `rounded-sm` とは別の名前空間に出る。**`rounded-none` は同じ名前空間なので要る。**
  */
  range_start: 'rounded-r-none',
  range_end: 'rounded-l-none',
  outside: 'text-faint',
  disabled: 'cursor-not-allowed text-faint',
  hidden: 'invisible',
} satisfies Partial<Record<string, string>>;

/**
 * 暦の props。**向こうのものをそのまま受ける。**
 *
 * 包み直すと、`mode` ごとに選択の型が変わる仕組み（`single` / `range` /
 * `multiple` で `selected` と `onSelect` の型が連動する）が消える。
 */
export type CalendarProps = DayPickerProps;

/**
 * 月送りの名前。**図案だけでは何の釦か読めない。**
 *
 * 文言は向こうが `locale` から作って `aria-label` で渡してくる。
 * ここにある既定は**空の名前を作らないため**だけのもので、通常は使われない。
 */
const navLabel = (label: string | undefined, fallback: string) => label ?? fallback;

/**
 * 暦。**日付を選ぶ。**
 *
 * ```tsx
 * <Calendar mode="single" selected={date} onSelect={setDate} />
 * ```
 *
 * ## 言語は渡してください
 *
 * 月名・曜日名・週の開始は言語で変わります。**既定を持っていません**——
 * 書体名と同じで、**ブランドの選択**だからです。
 *
 * ```tsx
 * import { ja } from 'react-day-picker/locale';
 *
 * <Calendar locale={ja} />
 * ```
 *
 * ## 向こうの CSS は読み込みません
 *
 * `react-day-picker/style.css` は**このスケールの外の値**を持ちます。
 * 読み込むと寸法と色が二重になります。
 *
 * ## 選び方は `mode` で決まります
 *
 * `single` は1日、`range` は範囲、`multiple` は飛び飛びの複数日です。
 */
export function Calendar(props: CalendarProps) {
  const { className, classNames: theirs, components, ...rest } = props;
  const classes = 'text-body';
  return (
    <DayPicker
      // **自分が何であるかを名乗る。** 見た目は持たない
      data-sg-component="calendar"
      className={className ? `${classes} ${className}` : classes}
      classNames={{ ...classNames, ...theirs }}
      components={{
        PreviousMonthButton: ({ 'aria-label': label, ...buttonProps }) => (
          <Button
            variant="ghost"
            iconOnly
            aria-label={navLabel(label, 'Previous month')}
            {...buttonProps}
          >
            <IconChevronLeft />
          </Button>
        ),
        NextMonthButton: ({ 'aria-label': label, ...buttonProps }) => (
          <Button
            variant="ghost"
            iconOnly
            aria-label={navLabel(label, 'Next month')}
            {...buttonProps}
          >
            <IconChevronRight />
          </Button>
        ),
        ...components,
      }}
      {...(rest as DayPickerProps)}
    />
  );
}
