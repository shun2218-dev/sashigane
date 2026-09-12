import type { ReactNode } from 'react';
import { previewProps } from '../../../components/preview';
import { ShopChrome } from './shop-chrome';
import { SHOP_SCOPE, shopThemeCss } from './theme';

/**
 * コンポーネントを組み合わせたデモの器。
 *
 * ## ドキュメントサイトの外枠を使わない
 *
 * fumadocs の HomeLayout は本文の幅を狭く決めている。**店として現実味のある
 * 画面にならない**ので、外枠は `ShopChrome` が自分で持つ。
 *
 * ## `link` と属性の両方が要る
 *
 * 中身は sashigane のユーティリティで書いてある。それは `preview.css` という
 * 別ビルドから来て、出力を `[data-sg-preview]` の中へ限定してある。
 *
 * **片方だけ欠けても、エラーは出ない。** 面や淡い塗りは属性で塗るので
 * `tokens.css` から来る——**一部だけ効いて、残りが素のまま出る。**
 * 画面を見るまで気づけない。実際、揃えるまで色が付かなかった。
 *
 * ## 色は店のもの
 *
 * ドキュメントサイトの青をそのまま使うと、コーヒーの店には見えない。
 * **プリミティブだけを差し替えて、店の色から全部を導かせる**（`theme.ts`）。
 */
export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/preview.css" />
      {/*
        **店のブランド色をここで差し込む。** プリミティブだけを上書きするので、
        面も塗りも淡い塗りも境界も、名前の参照をたどって全部追随する。
        役割の対応表は1つも書き換えていない。
      */}
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: 生成器が出した CSS をそのまま置く */}
      <style dangerouslySetInnerHTML={{ __html: shopThemeCss() }} />
      <div {...previewProps('')} {...{ [SHOP_SCOPE]: '' }}>
        <ShopChrome>{children}</ShopChrome>
      </div>
    </>
  );
}
