import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '../layout.config';
import { ThemeBuilder } from './ThemeBuilder';
import './theme-builder.css';

export const metadata = {
  title: 'テーマビルダー — sashigane',
  description: '色相を1つ選ぶと、規則からスケール全体が生成される',
};

export default function Page() {
  return (
    <HomeLayout {...baseOptions}>
      <div className="theme-builder">
        <ThemeBuilder />
      </div>
    </HomeLayout>
  );
}
