import { Breadcrumb, BreadcrumbItem } from '../breadcrumb.tsx';

/**
 * 空。**いま居る場所しか無いとき。**
 *
 * 1つでも道筋は道筋である。**区切りは出ない**——
 * 器はあいだにしか入れないので、先頭に記号が浮くことがない。
 */
export default function Empty() {
  return (
    <Breadcrumb>
      <BreadcrumbItem>ホーム</BreadcrumbItem>
    </Breadcrumb>
  );
}
