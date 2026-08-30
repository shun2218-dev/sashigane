import { examples } from '../generated/examples';
import props from '../generated/props.json';
import sources from '../generated/sources.json';

/**
 * コンポーネントの展示。**中身は全部、例と型から出る**（決定6-4）。
 *
 * ここに書いてあるのは並べ方だけで、**何を並べるかは `packages/ui` の例が決める。**
 * 索引は `scripts/build-component-docs.mjs` がファイルシステムから作るので、
 * 例を足せば自動で出る。**手で並べる場所はどこにも無い。**
 *
 * プレビューの CSS は `<link href="/preview.css">` で読む（`app/docs/layout.tsx`）。
 * chrome の Tailwind にアダプタは入れられない（決定6-4）。
 */
type PropRow = { name: string; type: string; required: boolean; description: string };
type Doc = { displayName: string; description: string; props: PropRow[] };

const STATE_LABEL: Record<string, string> = {
  default: '通常',
  empty: '空',
  edge: 'エッジケース',
};

export function ComponentDemo({ name }: { name: string }) {
  const list = examples[name];
  const doc = (props as Record<string, Doc>)[name];
  const source = (sources as Record<string, Record<string, string>>)[name];
  if (!list || !doc || !source) {
    // **黙って空を返さない。** 例が無いことは展示されないことを意味する（決定6-4）
    throw new Error(`${name} の例か型が生成されていません。pnpm prepare:docs-data を実行してください。`);
  }

  return (
    <div className="not-prose flex flex-col gap-10">
      {list.map(({ state, Example }) => (
        <section key={state} className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-fd-muted-foreground">
            {STATE_LABEL[state] ?? state}
            <code className="ms-2 text-xs">{state}.tsx</code>
          </h3>
          {/* 例の描画。**面の文脈を page に置く**ので、中の Card が1段深くなる（決定5-12） */}
          <div
            data-sg-surface="page"
            className="flex flex-col gap-4 rounded-lg border border-fd-border p-6"
          >
            <Example />
          </div>
          <details>
            <summary className="cursor-pointer text-sm text-fd-muted-foreground">ソース</summary>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-fd-muted p-4 text-xs">
              <code>{source[state]}</code>
            </pre>
          </details>
        </section>
      ))}

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-fd-muted-foreground">props</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fd-border text-left">
                <th className="py-2 pe-4 font-medium">名前</th>
                <th className="py-2 pe-4 font-medium">型</th>
                <th className="py-2 font-medium">説明</th>
              </tr>
            </thead>
            <tbody>
              {doc.props.map((p) => (
                <tr key={p.name} className="border-b border-fd-border align-top">
                  <td className="py-2 pe-4 font-mono text-xs">
                    {p.name}
                    {p.required ? '' : '?'}
                  </td>
                  <td className="py-2 pe-4 font-mono text-xs">{p.type}</td>
                  <td className="py-2 whitespace-pre-line">{p.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-fd-muted-foreground">
          型と説明はコンポーネントのソースから抽出しています。
          <strong>既定値は出していません</strong>——cva の <code>defaultVariants</code> は
          署名に現れないので、表に出すと「引数のデフォルトが書かれているものだけ」になり、嘘になります。
        </p>
      </section>
    </div>
  );
}
