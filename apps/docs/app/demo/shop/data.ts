/*
  架空の商品。**この店にある全部である。**

  絵は持たない。**画像を置くと、トークンで組んでいないものが画面の大半を占める。**
  代わりに焙煎度を面の深さで見せる。
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

export const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`;

/** 在庫の見せ方。**数字だけでなく、状態としても伝える** */
export const stockTone = (stock: number) =>
  stock === 0 ? 'danger' : stock <= 10 ? 'warning' : 'success';

export const stockLabel = (stock: number) =>
  stock === 0 ? '在庫切れ' : stock <= 10 ? `残り${stock}袋` : '在庫あり';
