import { Breadcrumb, BreadcrumbItem } from '../breadcrumb.tsx';

/**
 * 通常。**区切りは書かない。器が入れる。**
 *
 * 末尾がいま居る場所である。`aria-current="page"` は器が付けるので、
 * **道筋を組み替えても付け替え忘れが起きない。**
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
