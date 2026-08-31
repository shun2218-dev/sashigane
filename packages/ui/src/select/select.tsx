'use client';

/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **このリポジトリで唯一、クライアント側でしか描けない部品である。**
 * 素の `select` は一覧の見た目を OS が描くため、揃えられない。
 * 揃える代わりに、キーボード・焦点・位置決めを全部こちらで持つことになった。
 *
 * ## 値の出どころは隠した `select` 1つだけ
 *
 * 見えている部分は `button` と `ul` で、**値を持っていない。**
 * 値は隠した素の `select` にあり、選んだときは
 * **本物の change を投げて**そこへ書き込む。
 *
 * こうしないと、素のフォーム（`FormData`）と `register()` のどちらも動かない。
 *
 * ## 焦点は引き金から動かさない
 *
 * 選択肢に焦点を移すと、開閉のたびに焦点の行き先を管理することになる。
 * 焦点は `button` に置いたまま、**いまどれを指しているかは
 * `aria-activedescendant`** で伝える。
 *
 * 選択肢を押したときに焦点が飛ばないよう、`onMouseDown` で既定を止めている。
 * 止めないと `button` から焦点が外れ、**押す前に一覧が閉じる。**
 *
 * ## 一覧は箱の中に置いている
 *
 * `body` へ飛ばしていない。飛ばすと**面の入れ子から外れ**、
 * 展示のプレビュー用 CSS（`[data-sg-preview]` の中だけに効く）からも外れる。
 *
 * 代償は、**`overflow` を持つ祖先があると切り取られる**ことである。
 * 実際、展示の器（fumadocs の Tabs）が切っていた。
 *
 * ## 隠した `select` は読み上げから隠す
 *
 * 隠さないと、同じ選択肢が2回読まれる。
 * `tabIndex={-1}` も要る——**`Tab` で見えない部品に入ってしまう。**
 * ─────────────────────────────────────────────
 */
import { useEffect, useId, useRef, useState } from 'react';
import type { FocusEventHandler, ChangeEventHandler, Ref } from 'react';
import { IconChevronDown } from '../icon/icon.tsx';
import { ring, stateOf } from '../internal/ring.ts';

/** 選択肢1つ。**値と札は別**——値は送る文字列で、札は人が読む文字列である */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  /** 選択肢。**空でも描ける**（「選べるものがありません」と出る） */
  options: SelectOption[];
  /** フォームに送るときの名前。**隠した `select` に付く** */
  name?: string;
  /** 値を利用側が持つとき。**渡すとこちらは状態を持たない** */
  value?: string;
  /** 最初の値。**利用側が値を持たないとき** */
  defaultValue?: string;
  /**
   * 値が変わったとき。**隠した `select` の change である。**
   *
   * `register()` が返す `onChange` をそのまま渡せる。
   */
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  /**
   * 焦点が外れたとき。**隠した `select` の focusout として投げる。**
   *
   * `register()` が返す `onBlur` をそのまま渡せる。
   */
  onBlur?: FocusEventHandler<HTMLSelectElement>;
  /** 何も選ばれていないときに出す文言 */
  placeholder?: string;
  /** 押せるかどうか */
  disabled?: boolean;
  /** 入力が要るかどうか。**Field が渡す** */
  required?: boolean;
  /**
   * 満たしていることを示す。**誤りとは別の仕組みで受け取る。**
   *
   * 誤りには `aria-invalid` という標準の属性があるが、
   * **満たしていることを表す属性は無い**ので、props で受け取るしかない。
   */
  valid?: boolean;
  /** 引き金の `id`。**Field が渡す** */
  id?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  className?: string;
  /** 隠した `select` を指す。**`register()` の ref がここへ来る** */
  ref?: Ref<HTMLSelectElement>;
}

/** 打った文字で選択肢を探す時間。**離れて打ったら別の言葉として扱う** */
const TYPE_AHEAD_MS = 500;

/**
 * いくつかから1つ選ぶ。
 *
 * ## 素の `select` ではありません
 *
 * 素のものは**一覧の見た目を OS が描く**ので揃いません。
 * 代わりにキーボード・焦点・位置決めをこちらで持っています。
 *
 * ## 値はフォームにそのまま載ります
 *
 * 見えている部分は値を持たず、**隠した素の `select`** が持ちます。
 * 選んだときは本物の change を投げるので、
 * `FormData` でも `react-hook-form` の `register()` でもそのまま動きます。
 *
 * ## 札は Field が付けます
 *
 * ```tsx
 * <Field id="plan" label="プラン">
 *   <Select options={[{ value: 'a', label: 'ふつう' }]} />
 * </Field>
 * ```
 */
export function Select({
  options,
  name,
  value,
  defaultValue,
  onChange,
  onBlur,
  placeholder = '選んでください',
  disabled = false,
  required = false,
  valid,
  id,
  className,
  ref,
  ...aria
}: SelectProps) {
  const generated = useId();
  const triggerId = id ?? `${generated}-trigger`;
  const listId = `${generated}-list`;
  const optionId = (index: number) => `${generated}-option-${index}`;

  const [open, setOpen] = useState(false);
  const [own, setOwn] = useState(defaultValue ?? '');
  const controlled = value !== undefined;
  const selected = controlled ? value : own;

  const selectedIndex = options.findIndex((o) => o.value === selected);
  const [active, setActive] = useState(selectedIndex < 0 ? 0 : selectedIndex);

  const nativeRef = useRef<HTMLSelectElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: '', at: 0 });

  const state = stateOf(valid, aria['aria-invalid']);
  // 式の中で組み立てない。cva の呼び出しを補間の中へ直接置くと、
  // 静的解析の検査が読み切れずに落ちる
  const outer = `${ring({ state })} relative flex w-full rounded-sm`;

  /**
   * 値を書き込む。**書いてから本物の change を投げる。**
   *
   * 投げないと、素のフォームには載るのに `onChange` が来ない——
   * `register()` は値の変化を知らないままになる。
   *
   * テキスト入力なら React の値の追跡をすり抜ける細工が要るが、
   * **`select` には要らない。** React は `select` の change をそのまま使う。
   * **細工を外して確かめた**——外しても検査は全部通った。
   */
  const commit = (next: string) => {
    const node = nativeRef.current;
    if (node) {
      node.value = next;
      node.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (!controlled) setOwn(next);
  };

  const pick = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    commit(option.value);
    setActive(index);
    setOpen(false);
  };

  /** 押せる選択肢へ動かす。**押せないものは飛ばす** */
  const move = (from: number, step: number) => {
    for (let i = from + step; i >= 0 && i < options.length; i += step) {
      if (!options[i]?.disabled) return i;
    }
    return from;
  };

  const firstEnabled = () => options.findIndex((o) => !o.disabled);
  const lastEnabled = () => {
    for (let i = options.length - 1; i >= 0; i -= 1) if (!options[i]?.disabled) return i;
    return 0;
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const key = event.key;

    if (!open) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        event.preventDefault();
        setOpen(true);
        return;
      }
    } else {
      if (key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        pick(active);
        return;
      }
      if (key === 'ArrowDown') {
        event.preventDefault();
        setActive(move(active, 1));
        return;
      }
      if (key === 'ArrowUp') {
        event.preventDefault();
        setActive(move(active, -1));
        return;
      }
      if (key === 'Home') {
        event.preventDefault();
        setActive(firstEnabled());
        return;
      }
      if (key === 'End') {
        event.preventDefault();
        setActive(lastEnabled());
        return;
      }
      if (key === 'Tab') {
        setOpen(false);
        return;
      }
    }

    /*
     * 打った文字で探す。**素の `select` が持っている操作である。**
     * 無いと、長い一覧で目当てのものへ辿り着けない。
     *
     * **かな漢字変換を通す文字では効かない。** 変換中の打鍵は `key` が
     * 文字にならない（`Process`）ので、ここへ届かない。
     * 素の `select` も同じなので、失っているものではない。
     */
    if (key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const now = event.timeStamp;
      const text = now - typed.current.at > TYPE_AHEAD_MS ? key : typed.current.text + key;
      typed.current = { text, at: now };
      const found = options.findIndex(
        (o) => !o.disabled && o.label.toLowerCase().startsWith(text.toLowerCase()),
      );
      if (found >= 0) {
        setActive(found);
        if (!open) pick(found);
      }
    }
  };

  /*
   * 外を押したら閉じる。**引き金の {blur} では足りない**——
   * 選択肢を押すときは焦点を動かさないようにしてあるので、{blur} が来ない。
   */
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (!frameRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const label = options.find((o) => o.value === selected)?.label;

  return (
    <div
      ref={frameRef}
      data-sg-component="select-frame"
      className={className ? `${outer} ${className}` : outer}
    >
      <button
        type="button"
        role="combobox"
        id={triggerId}
        data-sg-component="select"
        data-sg-surface="inset"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        // **開いている間だけ指す。** 閉じているのに指すと、読み上げが選択肢を読む
        aria-activedescendant={open ? optionId(active) : undefined}
        aria-required={required || undefined}
        disabled={disabled}
        className="flex w-full items-center justify-between gap-2 rounded-sm border-0 px-3 py-2 text-body outline-none"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          setOpen(false);
          /*
            **隠した `select` の focusout として投げる。**
            `register()` の onBlur は `event.target.name` を読むので、
            引き金の {blur} をそのまま渡すと名前が無い。
          */
          nativeRef.current?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
        }}
        {...aria}
      >
        {/* 選ばれていないときは淡い文字。**入っている文字と同じ濃さだと区別が付かない** */}
        <span className={label ? 'text-default' : 'text-faint'}>{label ?? placeholder}</span>
        <IconChevronDown size="sm" className={open ? 'rotate-180' : ''} />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={triggerId}
          data-sg-component="select-list"
          data-sg-surface="overlay"
          className="absolute top-full z-10 mt-1 max-h-screen w-full overflow-auto rounded-sm py-1 shadow-overlay"
        >
          {options.length === 0 ? (
            /*
              **選択肢の役割のまま出す。** 役割の無い要素を listbox の中に置くと、
              読み上げが数え方を見失う。
            */
            <li
              id={optionId(0)}
              role="option"
              aria-disabled="true"
              aria-selected="false"
              className="px-3 py-2 text-body text-faint"
            >
              選べるものがありません
            </li>
          ) : null}
          {options.map((option, index) => (
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              data-sg-component="select-option"
              aria-selected={option.value === selected}
              aria-disabled={option.disabled || undefined}
              /*
                **いま指しているものを地の色で示す。** 焦点は引き金にあるので、
                ブラウザは何も描いてくれない——印が無いと、
                矢印キーで動かしても画面上は何も起きていないように見える。

                淡い塗りは**その上の文字と対で生成されている**ので、
                塗っただけで前景が置き去りにならない。
              */
              className={
                option.disabled
                  ? 'px-3 py-2 text-body text-faint'
                  : index === active
                    ? 'cursor-pointer bg-accent-subtle px-3 py-2 text-body text-on-accent-subtle'
                    : 'cursor-pointer px-3 py-2 text-body'
              }
              // **焦点を動かさない。** 動くと引き金から外れ、押す前に閉じる
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(index)}
              onMouseEnter={() => !option.disabled && setActive(index)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      ) : null}

      {/*
        値の出どころ。**読み上げからは隠す**——隠さないと選択肢が2回読まれる。
        `tabIndex` も要る。無いと `Tab` で見えない部品に入る。
      */}
      <select
        ref={(node) => {
          nativeRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        name={name}
        required={required}
        disabled={disabled}
        defaultValue={defaultValue ?? ''}
        onChange={onChange}
        onBlur={onBlur}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      >
        <option value="" />
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
