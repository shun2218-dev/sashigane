import { Tabs, TabsList, TabsPanel, TabsTrigger } from '../tabs.tsx';

/**
 * 空。**中身が無いとき。**
 *
 * タブは残り、中身の場所も残る。**枠ごと消えると、
 * 何かが失敗したのか、もともと無いのかが分からない。**
 */
export default function Empty() {
  return (
    <Tabs id="empty" style={{ maxWidth: 420 }}>
      <TabsList label="まだ何も無いもの">
        <TabsTrigger value="all">すべて</TabsTrigger>
      </TabsList>
      <TabsPanel value="all">まだ何もありません。</TabsPanel>
    </Tabs>
  );
}
