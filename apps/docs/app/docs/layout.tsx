import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { baseOptions } from '../layout.config';
import { source } from '../../lib/source';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout tree={source.pageTree} {...baseOptions}>
      {/*
        コンポーネントのプレビュー用 CSS。**chrome の Tailwind とは別ビルドである**（決定6-4）。
        アダプタを chrome のビルドに入れるとビルドが落ちるので、ここで読み込む。
        同名クラスの値が一致することは check:component-classes が見ている（決定6-5）。
      */}
      <link rel="stylesheet" href="/preview.css" />
      {children}
    </DocsLayout>
  );
}
