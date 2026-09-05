import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Mark } from '../components/mark';

export const baseOptions: BaseLayoutProps = {
  /**
   * マークは色を持たない（`currentColor`）。**ここで色を決める。**
   *
   * `--sg-color-accent` は明暗で段が変わるので（決定5-2）、
   * **1つ書けば両方に効く。** 文字はナビの色のまま残す。
   */
  nav: {
    title: (
      <>
        <span style={{ display: 'flex', color: 'var(--sg-color-accent)' }}>
          <Mark size={20} />
        </span>
        sashigane
      </>
    ),
  },
  links: [
    { text: 'ドキュメント', url: '/docs' },
    { text: 'テーマビルダー', url: '/theme' },
    { text: 'デモ', url: '/demo' },
  ],
  githubUrl: 'https://github.com/shun2218-dev/sashigane',
};
