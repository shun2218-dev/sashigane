/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * プレビューの器。**`data-sg-preview` を書く場所はここ1つだけである。**
 * `scripts/check-component-examples.mjs` が、他の場所で書かれていないか見ている。
 *
 * ## `not-prose` が要る
 *
 * サイトの外枠は本文に Typography を当てており、**`p` に 1.25em の余白**が付く。
 * コンポーネントは自分の間隔を `gap` で持っているので、そこへ本文用の余白が乗ると
 * **設計した間隔では出ない。**
 *
 * 実際に出た。フォームの説明文と誤りが入力から 20px 離れて見え、
 * 利用者から「離れすぎでは」と指摘された。Field の指定は 8px である。
 *
 * **忘れても壊れ方が静かである**——余白が広いだけで、エラーにはならない。
 * だから器を1つにして、書き忘れる場所を無くしてある。
 * ─────────────────────────────────────────────
 */

/**
 * プレビューの器に渡す props。**面の宣言・プレビュー用 CSS の範囲・本文スタイルの遮断**を
 * まとめて持つ。
 *
 * 器の要素は呼ぶ側が決める（`div` か `form` か）ので、要素ではなく props を返す。
 *
 * ```tsx
 * <div {...previewProps('flex flex-col gap-4')}>
 * ```
 */
export const previewProps = (className: string) =>
  ({
    'data-sg-preview': true,
    // 面の文脈を page に置く。中の Card が1段深くなる
    'data-sg-surface': 'page',
    className: `not-prose ${className}`,
  }) as const;
