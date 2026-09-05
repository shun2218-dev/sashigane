/*
 * ── 維持する側への覚書 ───────────────────────────────
 *
 * **絵柄は lucide から来る。** ここが持つのは寸法・読み上げの既定・名乗りだけである。
 *
 * `size` を通していない。lucide は `width` / `height` の**属性**で書くが、
 * こちらは `size-6` の**クラス**で書く。CSS は属性に勝つので、
 * **`size` を渡しても何も起きないまま消える**（測ってある）。
 * スケールの外の寸法を書かせないためでもある。
 *
 * **名乗りは絵柄の名前から導く。** lucide が `displayName` を持っている
 * （`X` / `ChevronDown`）ので、そこから `icon-x` / `icon-chevron-down` を作る。
 * **手で書かない**——書くと `IconX` と `'icon-x'` の2箇所に同じことが並び、
 * 片方だけ直したときに静かにずれる。
 *
 * 検査は `export const IconX = defineIcon(X)` の**対応**を見ている。
 * ─────────────────────────────────────────────
 */
import { cva, type VariantProps } from 'class-variance-authority';
import { Check, ChevronDown, Eye, EyeOff, Plus, X } from 'lucide-react';
import type { LucideIcon, LucideProps } from 'lucide-react';

/**
 * 大きさ。**段で持つ。**
 *
 * `className` で上書きする道は取らない。**同じ次元を上書きしたとき、
 * どちらが効くかをこのシステムは保証していない**——実際 `size-4` を渡しても
 * 既定の `size-6` に負ける。段にすれば、負ける形が生まれない。
 *
 * **縮まない**（`shrink-0`）——横に並べたときに潰れる。
 */
const icon = cva('shrink-0', {
  variants: {
    size: {
      /** **枠の中に収める。** チェックボックスの印のように、16px の箱へ入れる */
      xs: 'size-3',
      /** 小さい方。ラベルや表の行の中で使う */
      sm: 'size-4',
      /** 行の高さと同じ。文字やボタンと並べたときに揃う */
      md: 'size-6',
    },
  },
  defaultVariants: { size: 'md' },
});

/**
 * アイコンの props。**lucide のものをそのまま引き継ぐ。**
 *
 * lucide の `size` だけ通していない。**属性で渡してもクラスに負けて、
 * 何も起きないまま消える。** 大きさは段で選ぶ。
 */
export interface IconProps extends Omit<LucideProps, 'size'>, VariantProps<typeof icon> {}

/** `ChevronDown` → `chevron-down`。**絵柄の名前から名乗りを導く** */
const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/**
 * lucide のアイコンを、このシステムの形に包む。
 *
 * ## 既定は読み上げから隠す
 *
 * アイコンはたいてい**文字の隣にあり、同じことを言っている。**
 * 隠さないと二重に読まれる。
 *
 * 名前を渡したとき（`aria-label`）だけ、隠さない。
 *
 * ## 絵柄は選び直せる
 *
 * この関数は公開している。**ここに無いアイコンは、利用側が同じ形で包める。**
 *
 * ```tsx
 * import { Search } from 'lucide-react';
 * export const IconSearch = defineIcon(Search);
 * ```
 */
export function defineIcon(Source: LucideIcon) {
  // 絵柄の名前から導く。**手で書かない**——2箇所に同じことが並ぶと静かにずれる
  const name = `icon-${kebab(Source.displayName ?? 'unknown')}`;
  return function Icon({ size, className, ...props }: IconProps) {
    const named = props['aria-label'] !== undefined || props['aria-labelledby'] !== undefined;
    // 式の中で組み立てない。cva の呼び出しを補間の中へ直接置くと、
    // 静的解析の検査が読み切れずに落ちる
    const classes = icon({ size });
    return (
      <Source
        data-sg-component={name}
        // **既定は飾り。** 文字の隣で同じことを言っているので、二重に読ませない
        aria-hidden={named ? undefined : true}
        focusable="false"
        className={className ? `${classes} ${className}` : classes}
        {...props}
      />
    );
  };
}

/**
 * 閉じる。
 *
 * **絵柄は lucide のものである。** 寸法と読み上げの既定だけがこちらのものになる。
 */
export const IconX = defineIcon(X);

/** 足す。 */
export const IconPlus = defineIcon(Plus);

/** 下向きの矢印。**開く／閉じるを表す**（Accordion が使う） */
export const IconChevronDown = defineIcon(ChevronDown);

/** 印。**満たしていることを表す**（Field が使う） */
export const IconCheck = defineIcon(Check);

/** 目。**隠しているものを見せる**（PasswordInput が使う） */
export const IconEye = defineIcon(Eye);

/** 閉じた目。**見せているものを隠す** */
export const IconEyeOff = defineIcon(EyeOff);
