/*
  コンポーネントの入口。Card → Button → Badge → Separator → Table の順に足していく。
  Spinner はその順序の外で足した。ボタンの読み込み中の表示に要る。
*/
export { Button, type ButtonProps } from './button/index.ts';
export {
  Card,
  type CardProps,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  type CardPartProps,
} from './card/index.ts';
export { Spinner, type SpinnerProps } from './spinner/index.ts';
