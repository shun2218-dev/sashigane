import { Tabs, TabsList, TabsPanel, TabsTrigger } from '../tabs.tsx';

/**
 * 通常。**矢印で移ると、移った先がすぐ開く。**
 *
 * 焦点が入るのは選ばれているものだけである。**全部が tab 順に入ると、
 * タブの数だけ Tab キーを押すことになる。**
 */
export default function Default() {
  return (
    <Tabs id="settings" style={{ maxWidth: 420 }}>
      <TabsList label="設定の種類">
        <TabsTrigger value="display">表示</TabsTrigger>
        <TabsTrigger value="notice">通知</TabsTrigger>
        <TabsTrigger value="account">アカウント</TabsTrigger>
      </TabsList>
      <TabsPanel value="display">画面の見え方を変えます。</TabsPanel>
      <TabsPanel value="notice">どんなときに知らせるかを決めます。</TabsPanel>
      <TabsPanel value="account">名前とパスワードを変えます。</TabsPanel>
    </Tabs>
  );
}
