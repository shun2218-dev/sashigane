import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export const baseOptions: BaseLayoutProps = {
  nav: { title: 'sashigane' },
  links: [
    { text: 'ドキュメント', url: '/docs' },
    { text: 'テーマビルダー', url: '/theme' },
    { text: 'デモ', url: '/demo' },
  ],
  githubUrl: 'https://github.com/shun2218-dev/sashigane',
};
