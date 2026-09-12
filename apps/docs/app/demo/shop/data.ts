/*
  架空の商品。**この店にある全部である。**

  写真は `product-image.tsx` が `slug` で引く。
*/
export type Product = {
  slug: string;
  name: string;
  origin: string;
  price: number;
  roast: '浅煎り' | '中煎り' | '中深煎り' | '深煎り';
  notes: string[];
  stock: number;
  isNew: boolean;
  body: string;
};

export const PRODUCTS: Product[] = [
  {
    slug: 'yirgacheffe',
    name: 'エチオピア イルガチェフェ',
    origin: 'エチオピア',
    price: 1480,
    roast: '中深煎り',
    notes: ['柑橘', '紅茶', '蜂蜜'],
    stock: 24,
    isNew: true,
    body: '標高 2,000m の小規模農園。収穫から精製までを1つの区画で行っています。',
  },
  {
    slug: 'huila',
    name: 'コロンビア ウイラ',
    origin: 'コロンビア',
    price: 1280,
    roast: '中煎り',
    notes: ['カラメル', 'りんご'],
    stock: 8,
    isNew: false,
    body: '甘さの輪郭がはっきりしていて、ミルクにも負けません。',
  },
  {
    slug: 'antigua',
    name: 'グアテマラ アンティグア',
    origin: 'グアテマラ',
    price: 1380,
    roast: '深煎り',
    notes: ['チョコレート', 'くるみ'],
    stock: 0,
    isNew: false,
    body: '火山灰土壌で育った豆。深煎りでも酸が残ります。',
  },
  {
    slug: 'sidamo',
    name: 'エチオピア シダモ',
    origin: 'エチオピア',
    price: 1180,
    roast: '浅煎り',
    notes: ['ベリー', '花'],
    stock: 41,
    isNew: true,
    body: '浅煎りで華やかに。水出しにも向きます。',
  },
  {
    slug: 'toraja',
    name: 'インドネシア トラジャ',
    origin: 'インドネシア',
    price: 1580,
    roast: '深煎り',
    notes: ['土', 'スパイス', 'ダークチョコ'],
    stock: 12,
    isNew: false,
    body: '重さのある味。砂糖を入れても輪郭が消えません。',
  },
  {
    slug: 'kilimanjaro',
    name: 'タンザニア キリマンジャロ',
    origin: 'タンザニア',
    price: 1320,
    roast: '中煎り',
    notes: ['レモン', '黒糖'],
    stock: 5,
    isNew: false,
    body: '朝に飲むと目が覚める、はっきりした酸。',
  },
  {
    slug: 'blue-mountain',
    name: 'ジャマイカ ブルーマウンテン',
    origin: 'ジャマイカ',
    price: 4800,
    roast: '中煎り',
    notes: ['なめらか', '甘い余韻'],
    stock: 2,
    isNew: false,
    body: '角の無さで知られる豆。贈り物にも。',
  },
  {
    slug: 'geisha',
    name: 'パナマ ゲイシャ',
    origin: 'パナマ',
    price: 6800,
    roast: '浅煎り',
    notes: ['ジャスミン', '白桃'],
    stock: 0,
    isNew: true,
    body: '香りで選ぶ豆。浅煎りのまま、湯温を下げて淹れてください。',
  },
  {
    slug: 'house-blend',
    name: '深煎り堂ブレンド',
    origin: 'ブレンド',
    price: 980,
    roast: '中深煎り',
    notes: ['バランス', '毎日'],
    stock: 120,
    isNew: false,
    body: '毎日飲むためのブレンド。豆の構成は季節で変えています。',
  },
];

export const bySlug = (slug: string) => PRODUCTS.find((p) => p.slug === slug);

export const GRINDS = [
  { value: 'beans', label: '豆のまま', short: '豆のまま' },
  { value: 'medium', label: '中挽き（ドリップ）', short: '中挽き' },
  { value: 'fine', label: '細挽き（エスプレッソ）', short: '細挽き' },
];

/**
 * 量。**`factor` は 200g の値段に掛ける数である。**
 *
 * ラベルが値引きを約束しているので、**金額もそれに従わせる。**
 * 最初は量を選んでも金額が動かず、表示が嘘をついていた。
 */
export const SIZES = [
  { value: '200', label: '200g', short: '200g', factor: 1 },
  { value: '500', label: '500g（10% 引き）', short: '500g', factor: 2.5 * 0.9 },
  { value: '1000', label: '1kg（15% 引き）', short: '1kg', factor: 5 * 0.85 },
];

/** 毎月お届けの値引き。ラベルの「10% 引き」と揃える */
export const SUBSCRIBE_RATE = 0.9;

/** 商品の詳細で選ぶもの。**カートの行はこれごとに分かれる** */
export type CartOptions = { size: string; grind: string; subscribe: boolean; gift: boolean };

export const DEFAULT_OPTIONS: CartOptions = {
  size: '200',
  grind: 'beans',
  subscribe: false,
  gift: false,
};

/**
 * 1袋の値段。**詳細・カート・注文が同じ式を通る。**
 *
 * 画面ごとに書くと、どこかが値引きを忘れる。
 */
export const unitPrice = (product: Product, size: string, subscribe: boolean) =>
  Math.round(
    product.price *
      (SIZES.find((s) => s.value === size)?.factor ?? 1) *
      (subscribe ? SUBSCRIBE_RATE : 1),
  );

/** 行の中身を1行で。**同じ豆の行を見分けるために出す** */
export const lineNote = (o: CartOptions) =>
  [
    SIZES.find((s) => s.value === o.size)?.short,
    GRINDS.find((g) => g.value === o.grind)?.short,
    o.subscribe ? '毎月お届け' : null,
    o.gift ? 'ギフト包装' : null,
  ]
    .filter(Boolean)
    .join('・');

/**
 * カートの最初の中身。**訪れるたびにここから始まる**（`cart.tsx`）。
 *
 * 空から始めると、カートの画面を直接開いた人には空の状態しか見えない。
 */
export const SAMPLE_CART = [
  { slug: 'yirgacheffe', count: 2 },
  { slug: 'house-blend', count: 1 },
  { slug: 'toraja', count: 1 },
];

export const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`;

/** 在庫の見せ方。**数字だけでなく、状態としても伝える** */
export const stockTone = (stock: number) =>
  stock === 0 ? 'danger' : stock <= 10 ? 'warning' : 'success';

/**
 * 在庫の言い方。**具体的な数は出さない。**
 *
 * 「残り8袋」は、買う判断には要らない精度である。
 * 少ないことだけが伝わればよい。
 */
export const stockLabel = (stock: number) =>
  stock === 0 ? '在庫切れ' : stock <= 10 ? '残りわずか' : '在庫あり';
