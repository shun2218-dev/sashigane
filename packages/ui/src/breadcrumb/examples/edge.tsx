import { Breadcrumb, BreadcrumbItem } from '../breadcrumb.tsx';

/**
 * エッジケース。**長い道筋・区切りの差し替え・要素の差し替え。**
 *
 * 長いときは折り返す。**畳まない**——どれを畳むかは、
 * 道筋を作った側にしか決められない。
 */
export default function Edge() {
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 320 }}>
      <Breadcrumb label="長い道筋">
        <BreadcrumbItem href="/">ホーム</BreadcrumbItem>
        <BreadcrumbItem href="/a">設定</BreadcrumbItem>
        <BreadcrumbItem href="/a/b">アカウント</BreadcrumbItem>
        <BreadcrumbItem href="/a/b/c">通知の設定</BreadcrumbItem>
        <BreadcrumbItem>メールで知らせる条件</BreadcrumbItem>
      </Breadcrumb>

      <Breadcrumb label="区切りを変えた道筋" separator="›">
        <BreadcrumbItem href="/">ホーム</BreadcrumbItem>
        <BreadcrumbItem href="/docs">ドキュメント</BreadcrumbItem>
        <BreadcrumbItem>導入する</BreadcrumbItem>
      </Breadcrumb>

      <Breadcrumb label="要素を差し替えた道筋">
        <BreadcrumbItem asChild>
          <a href="/" data-router="next">
            ホーム
          </a>
        </BreadcrumbItem>
        <BreadcrumbItem asChild>
          <a href="/docs" data-router="next">
            ドキュメント
          </a>
        </BreadcrumbItem>
        <BreadcrumbItem asChild>
          <span data-router="next">いま見ているページ</span>
        </BreadcrumbItem>
      </Breadcrumb>
    </div>
  );
}
