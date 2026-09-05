'use client';

/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **依存は持たない。** 素の HTML にタブは無いが、
 * 作るのに要るのはブラウザが持っているものだけである——
 * `button` と、焦点の移動と、鍵盤の催し。
 *
 * ## 焦点が入るのは1つだけ（roving tabindex）
 *
 * 全部が tab 順に入ると、**タブの数だけ Tab キーを押すことになる。**
 * 選ばれているものだけを `tabIndex=0` にし、**中の移動は矢印で行う。**
 *
 * ## 矢印で移った先は、すぐ開く
 *
 * WAI-ARIA はどちらも認めているが、**中身がその場にあるなら開く側**を勧めている。
 * この部品は中身を先に描いているので、開くのに待ちが無い。
 *
 * 押して初めて開く形（`activation="manual"`）も持つ。
 * **中身の読み込みに時間がかかるとき**は、矢印で移るだけで毎回読み込むことになる。
 *
 * ## 名前は利用側が渡す
 *
 * 結びつけ（`aria-controls` / `aria-labelledby`）に安定した名前が要る。
 * `useId` で作ることもできるが、**利用側が中身を別の場所から指したいとき**に
 * 名前が分からなくなる。
 * ─────────────────────────────────────────────
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';

interface TabsState {
  /** いま選ばれているものの値 */
  value: string;
  select: (value: string) => void;
  /** 結びつけの名前を作る。**tab と panel で同じ規則を使う** */
  idOf: (value: string, part: 'tab' | 'panel') => string;
  /** 矢印で移った先をすぐ開くか */
  automatic: boolean;
  /**
   * まだ何も選ばれていなければ、これを選ぶ。
   *
   * **並びの最初を選ぶために要る。** 器は子の顔ぶれを知らないので、
   * 最初のタブが自分で名乗り出る。
   */
  claimFirst: (value: string) => void;
}

const Ctx = createContext<TabsState | null>(null);

const useTabs = (): TabsState => {
  const ctx = useContext(Ctx);
  // **枠の外で使うと、何も起きないまま黙る。** 気づけるようにする
  if (!ctx) throw new Error('Tabs の中で使ってください');
  return ctx;
};

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /**
   * 結びつけに使う名前。**同じ画面に2つ置くときは別の名前を渡す。**
   *
   * `aria-controls` と `aria-labelledby` がこれを元に作られる。
   */
  id: string;
  /** 最初に選ばれているもの。渡さなければ**最初のタブ** */
  defaultValue?: string;
  /**
   * 矢印で移った先を、すぐ開くか。
   *
   * `automatic`（既定）は移った先をすぐ開く。**中身がその場にあるならこちら。**
   * `manual` は押して初めて開く。**読み込みに時間がかかるとき**に使う——
   * すぐ開く形だと、矢印で通り過ぎるだけで毎回読み込むことになる。
   */
  activation?: 'automatic' | 'manual';
  /** 選ばれたものが変わったとき */
  onValueChange?: (value: string) => void;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * タブ。**中身を切り替えて見せる。**
 *
 * ```tsx
 * <Tabs id="設定" defaultValue="表示">
 *   <TabsList label="設定の種類">
 *     <TabsTrigger value="表示">表示</TabsTrigger>
 *     <TabsTrigger value="通知">通知</TabsTrigger>
 *   </TabsList>
 *   <TabsPanel value="表示">表示の設定</TabsPanel>
 *   <TabsPanel value="通知">通知の設定</TabsPanel>
 * </Tabs>
 * ```
 *
 * ## 中身は先に描かれる
 *
 * 選ばれていないものも DOM にある（隠れているだけ）。
 * **検索で見つかり、印刷にも出る。** 描かないようにしたいなら、
 * 利用側が中身の側で決める。
 */
export function Tabs({
  id,
  defaultValue,
  activation = 'automatic',
  onValueChange,
  className,
  children,
  ...props
}: TabsProps) {
  const [value, setValue] = useState(defaultValue ?? '');
  const select = useCallback(
    (next: string) => {
      setValue(next);
      onValueChange?.(next);
    },
    [onValueChange],
  );
  const idOf = useCallback(
    (v: string, part: 'tab' | 'panel') => `${id}-${part}-${v}`,
    [id],
  );
  /*
    **最初のタブが自分で名乗り出る。** 器は子の顔ぶれを知らないので、
    `defaultValue` を渡さなかったときに何を選べばよいか分からない。

    既に選ばれていれば何もしない——**2つめ以降が上書きしない。**
  */
  const claimFirst = useCallback((next: string) => {
    setValue((current) => current || next);
  }, []);

  const classes = 'flex flex-col gap-3';
  return (
    <Ctx.Provider
      value={{ value, select, idOf, automatic: activation === 'automatic', claimFirst }}
    >
      <div
        data-sg-component="tabs"
        className={className ? `${classes} ${className}` : classes}
        {...props}
      >
        {children}
      </div>
    </Ctx.Provider>
  );
}

export interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
  /** 何の並びかの名前。**読み上げが「何のタブか」を言えるようにする** */
  label: string;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * タブの並び。**矢印で移れる。**
 *
 * `Home` で先頭、`End` で末尾。**端では折り返す**——
 * 数が多いとき、端から端へ戻るのに全部通らずに済む。
 */
export function TabsList({ label, className, ...props }: TabsListProps) {
  const { automatic, select } = useTabs();
  const ref = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (!keys.includes(e.key)) return;
      const tabs = [...(ref.current?.querySelectorAll('[role="tab"]') ?? [])].filter(
        (t) => !(t as HTMLButtonElement).disabled,
      ) as HTMLButtonElement[];
      if (tabs.length === 0) return;
      e.preventDefault();
      const here = tabs.indexOf(document.activeElement as HTMLButtonElement);
      const to =
        e.key === 'Home'
          ? 0
          : e.key === 'End'
            ? tabs.length - 1
            : // **端では折り返す。** 端から端へ戻るのに全部通らずに済む
              (here + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      const next = tabs[to];
      if (!next) return;
      next.focus();
      // すぐ開く形では、移った先がそのまま選ばれる
      if (automatic) select(next.dataset.value ?? '');
    },
    [automatic, select],
  );

  const classes = 'flex items-center gap-1 border-b-1 border-border';
  return (
    <div
      ref={ref}
      data-sg-component="tabs-list"
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={className ? `${classes} ${className}` : classes}
      {...props}
    />
  );
}

export interface TabsTriggerProps extends Omit<HTMLAttributes<HTMLButtonElement>, 'value'> {
  /** どの中身に結びつくか */
  value: string;
  disabled?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * タブ1つ。**押すと中身が変わる。**
 *
 * **選ばれているものだけが tab 順に入る。** 全部入ると、
 * タブの数だけ Tab キーを押すことになる。
 */
export function TabsTrigger({ value, className, ...props }: TabsTriggerProps) {
  const { value: selected, select, idOf, claimFirst } = useTabs();
  // 何も選ばれていなければ、最初のものが選ばれる
  useEffect(() => claimFirst(value), [claimFirst, value]);
  const on = selected === value;
  /*
    **選ばれていることを、下の線と文字の濃さで表す。** 色だけで伝えない——
    `aria-selected` が読み上げに届き、線が見た目に届く。
  */
  const classes = on
    ? 'cursor-pointer border-b-2 border-accent-mark px-3 py-2 text-body text-default'
    : 'cursor-pointer border-b-2 border-transparent px-3 py-2 text-body text-muted';
  return (
    <button
      type="button"
      data-sg-component="tabs-trigger"
      data-value={value}
      role="tab"
      id={idOf(value, 'tab')}
      aria-selected={on}
      aria-controls={idOf(value, 'panel')}
      // **選ばれているものだけが tab 順に入る**（roving tabindex）
      tabIndex={on ? 0 : -1}
      onClick={() => select(value)}
      className={className ? `${classes} ${className}` : classes}
      {...props}
    />
  );
}

export interface TabsPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** どのタブに結びつくか */
  value: string;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * 中身1つ。**選ばれていないときは隠れる。**
 *
 * 消さずに隠す。**検索で見つかり、印刷にも出る。**
 */
export function TabsPanel({ value, className, ...props }: TabsPanelProps) {
  const { value: selected, idOf } = useTabs();
  const on = selected === value;
  const classes = 'text-body';
  return (
    <div
      data-sg-component="tabs-panel"
      role="tabpanel"
      id={idOf(value, 'panel')}
      aria-labelledby={idOf(value, 'tab')}
      hidden={!on}
      /*
        **中身に焦点を入れられるようにする。** 中に押せるものが無いとき、
        鍵盤だけの利用者は中身を読む場所へ行けない。
      */
      tabIndex={on ? 0 : undefined}
      className={className ? `${classes} ${className}` : classes}
      {...props}
    />
  );
}
