import { HomeLayout } from 'fumadocs-ui/layouts/home';
import Link from 'next/link';
import { baseOptions } from '../layout.config';

export default function Page() {
  return (
    <HomeLayout {...baseOptions}>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="text-3xl font-bold">sashigane</h1>
        <p className="max-w-prose text-fd-muted-foreground">
          トークンが唯一の正であるデザインシステム。値は規則から生成する。
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link className="text-fd-primary underline" href="/docs">
            ドキュメント
          </Link>
          <Link className="text-fd-primary underline" href="/theme">
            テーマビルダー
          </Link>
          <Link className="text-fd-primary underline" href="/sample">
            サンプルページ
          </Link>
        </div>
      </main>
    </HomeLayout>
  );
}
