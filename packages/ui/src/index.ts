/*
  コンポーネントの入口。Card → Button → Badge → Separator → Table の順に足していく。
  Spinner はその順序の外で足した。ボタンの読み込み中の表示に要る。
*/
export { Badge, type BadgeProps } from './badge/index.ts';
export { Button, type ButtonProps } from './button/index.ts';
export { defineIcon, IconX, IconPlus, type IconProps } from './icon/index.ts';
export {
  Card,
  type CardProps,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  type CardPartProps,
} from './card/index.ts';
export { Separator, type SeparatorProps } from './separator/index.ts';
export { Spinner, type SpinnerProps } from './spinner/index.ts';
export {
  Table,
  type TableProps,
  TableRow,
  type TableRowProps,
  TableCell,
  type TableCellProps,
  TableHeaderCell,
  type TableHeaderCellProps,
} from './table/index.ts';
