import { Breadcrumb, BreadcrumbItem } from '../breadcrumb.tsx';

/**
 * 通常。**区切りは書かない。Breadcrumb が入れる。**
 *
 * 末尾がいま居る場所である。`aria-current="page"` はBreadcrumb が付けるので、
 * **階層を組み替えても付け替え忘れが起きない。**
 */
export default function Default() {
  return (
    <Breadcrumb>
      <BreadcrumbItem href="/">ホーム</BreadcrumbItem>
      <BreadcrumbItem href="/docs">ドキュメント</BreadcrumbItem>
      <BreadcrumbItem href="/docs/components">コンポーネント</BreadcrumbItem>
      <BreadcrumbItem>パンくずリスト</BreadcrumbItem>
    </Breadcrumb>
  );
}
