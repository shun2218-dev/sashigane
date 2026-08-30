import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { examples } from '../generated/examples';
import props from '../generated/props.json';
import sources from '../generated/sources.json';

/**
 * コンポーネントの展示。**中身は全部、例と型から出る**（決定6-4）。
 *
 * ここに書いてあるのは並べ方だけで、**何を並べるかは `packages/ui` の例が決める。**
 * 索引は `scripts/build-component-docs.mjs` がファイルシステムから作るので、
 * 例を足せば自動で索引と型表に入る。
 *
 * **ただし展示ページ（`content/docs/components/<name>.mdx`）と `meta.json` の
 * `pages` は手で書く。** ページ本文には設計の説明を書くので生成していない。
 * 足し忘れると**索引には入るのに展示されない**ので、
 * `check:component-examples` が両方を検査する（自己レビュー J1・J2）。
 *
 * プレビューの CSS は `<link href="/preview.css">` で読む（`app/docs/layout.tsx`）。
 * 外枠の Tailwind にアダプタは入れられない（決定6-4）ので別ビルドになっており、
 * その出力は `data-sg-preview` の中だけに効く。
 */
type PropRow = { name: string; type: string; required: boolean; description: string };
type Doc = { displayName: string; description: string; props: PropRow[] };

/**
 * 状態の見出し。**載っていないものはファイル名がそのまま出る。**
 * 追加の例は自由に置けるので、ここに無いことを異常としない。
 */
const STATE_LABEL: Record<string, string> = {
  default: '通常',
  empty: '空',
  edge: 'エッジケース',
  'as-child': '要素の差し替え',
  parts: '中の区画',
  icon: 'アイコン',
  loading: '読み込み中',
};

/**
 * 必須の3状態。**追加の例と混ぜて並べない。**
 *
 * この3つは「このコンポーネントの3状態」という契約で、
 * 追加は**説明のために置いたもの**である。同じ見出しで並べると、
 * 追加が3状態のうちの1つに見える。**増えるほど混ざる。**
 */
const REQUIRED = ['default', 'empty', 'edge'];

/**
 * 型表の説明は **JSDoc の素の文字列**である。**印を解いてから出す。**
 *
 * 解かないと `**必須である。**` のように記号がそのまま並ぶ。
 * **エラーは出ず、読みにくくなるだけ**なので、画面を見るまで気づけない
 * （実際、しばらく気づかなかった）。
 *
 * 解くのは強調（`**`）と組（`` ` ``）の2つだけである。
 * JSDoc に書いているのはその2つで、**それ以上を解くと Markdown の実装を持つことになる。**
 */
const inline = (text: string) =>
  text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    const key = `${i}-${part}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={key} className="text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={key}>{part}</span>;
  });

export function ComponentDemo({ name }: { name: string }) {
  const list = examples[name];
  const doc = (props as Record<string, Doc>)[name];
  const source = (sources as Record<string, Record<string, string>>)[name];
  if (!list || !doc || !source) {
    // **黙って空を返さない。** 例が無いことは展示されないことを意味する（決定6-4）
    throw new Error(`${name} の例か型が生成されていません。pnpm prepare:docs-data を実行してください。`);
  }

  const required = list.filter(({ state }) => REQUIRED.includes(state));
  const extra = list.filter(({ state }) => !REQUIRED.includes(state));

  const show = ({ state, Example }: (typeof list)[number]) => (
    <section key={state} className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-fd-muted-foreground">
        {STATE_LABEL[state] ?? state}
        <code className="ms-2 text-xs">{state}.tsx</code>
      </h3>
      {/*
        **表示とソースを並べず、切り替える。** 並べるとページが縦に伸び、
        例が増えるほど見比べにくくなる。

        器は fumadocs のものを使う。**この器を自分で組む理由が無い**——
        組むと、サイトの他の場所と見た目が揃わなくなる。
      */}
      <Tabs items={['表示', 'ソース']}>
        <Tab value="表示">
          {/*
            例の描画。**面の文脈を page に置く**ので、中の Card が1段深くなる（決定5-12）。

            `data-sg-preview` はプレビュー用 CSS の効く範囲である。
            この目印の中だけに限定していないと、preflight と汎用ユーティリティが
            サイト外枠に当たり、外枠側の変種を後勝ちで潰す
            （`scripts/scope-preview-css.mjs`）。
          */}
          <div data-sg-preview data-sg-surface="page" className="flex flex-col gap-4">
            <Example />
          </div>
        </Tab>
        <Tab value="ソース">
          {/* 色分けは fumadocs が持っている。**素の pre で出すと読みにくい** */}
          <DynamicCodeBlock lang="tsx" code={source[state] ?? ''} />
        </Tab>
      </Tabs>
    </section>
  );

  return (
    <div className="not-prose flex flex-col gap-10">
      <h2 className="text-base font-semibold">3つの状態</h2>
      <p className="-mt-8 text-sm text-fd-muted-foreground">
        通常・空・エッジケースの3つは、どのコンポーネントにも必ずあります。
      </p>
      {required.map(show)}

      {extra.length > 0 ? (
        <>
          <h2 className="text-base font-semibold">使い方</h2>
          <p className="-mt-8 text-sm text-fd-muted-foreground">
            3つの状態とは別に、説明のために置いている例です。
          </p>
          {extra.map(show)}
        </>
      ) : null}

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-fd-muted-foreground">props</h3>
        {/*
          型表も fumadocs のものを使う。**必須かどうかの出し方も向こうが持っている**——
          自分で組むと、名前の後ろに `?` を付ける流儀を自分で決めることになる。
        */}
        <TypeTable
          type={Object.fromEntries(
            doc.props.map((p) => [
              p.name,
              { type: p.type, required: p.required, description: inline(p.description) },
            ]),
          )}
        />
        <p className="text-xs text-fd-muted-foreground">
          型と説明はコンポーネントのソースから抽出しています。
          <strong>既定値は出していません</strong>——cva の <code>defaultVariants</code> は
          署名に現れないので、表に出すと「引数のデフォルトが書かれているものだけ」になり、嘘になります。
        </p>
      </section>
    </div>
  );
}
