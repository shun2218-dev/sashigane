import { Tabs, TabsList, TabsPanel, TabsTrigger } from '../tabs.tsx';

/**
 * エッジケース。**押せないタブと、押して初めて開く形。**
 *
 * 押せないタブは矢印でも飛ばされる。**止まれるのに開けないのは嘘である。**
 *
 * `manual` は押して初めて開く。**中身の読み込みに時間がかかるとき**に使う——
 * すぐ開く形だと、矢印で通り過ぎるだけで毎回読み込むことになる。
 */
export default function Edge() {
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 420 }}>
      <Tabs id="edge-disabled">
        <TabsList label="押せないものがある並び">
          <TabsTrigger value="a">使える</TabsTrigger>
          <TabsTrigger value="b" disabled>
            使えない
          </TabsTrigger>
          <TabsTrigger value="c">これも使える</TabsTrigger>
        </TabsList>
        <TabsPanel value="a">1つめの中身</TabsPanel>
        <TabsPanel value="b">2つめの中身</TabsPanel>
        <TabsPanel value="c">3つめの中身</TabsPanel>
      </Tabs>

      <Tabs id="edge-manual" activation="manual">
        <TabsList label="押して初めて開く並び">
          <TabsTrigger value="x">1つめ</TabsTrigger>
          <TabsTrigger value="y">2つめ</TabsTrigger>
        </TabsList>
        <TabsPanel value="x">矢印で移っても、押すまで開きません。</TabsPanel>
        <TabsPanel value="y">こちらも同じです。</TabsPanel>
      </Tabs>
    </div>
  );
}
