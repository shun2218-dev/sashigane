'use client';

/*
  注文の入力。**このデモで最も入力が多い画面である。**

  Form が送信の失敗時に最初の誤りへフォーカスを移す。Field が関連付けを作る。
  Calendar で希望日を選び、Modal で最終確認をしてから送る。

  中身はカート（`cart.tsx`）から来る。**注文したらカートを空にする。**

  **本当には送らない。** 送っている見た目だけを見せる。
*/
import Link from 'next/link';
import { useState } from 'react';
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Calendar,
  Field,
  Form,
  FormActions,
  Input,
  List,
  ListItem,
  Modal,
  PasswordInput,
  Radio,
  RadioGroup,
  Separator,
  Textarea,
  useModal,
  useToast,
} from '@sashigane/ui';
import { useCart } from '../cart';
import { lineNote, yen } from '../data';
import { ShopWidth } from '../shop-chrome';

const PAY = [
  { value: 'card', label: 'クレジットカード' },
  { value: 'transfer', label: '銀行振込' },
  { value: 'cod', label: '代金引換（手数料 330円）' },
];

type Errors = Partial<Record<'name' | 'mail' | 'zip' | 'address', string>>;

export default function Checkout() {
  const confirm = useModal();
  const { show: showToast } = useToast();
  const { lines, clear } = useCart();
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [day, setDay] = useState<Date | undefined>();
  const [errors, setErrors] = useState<Errors>({});

  const total = lines.reduce((n, r) => n + r.unit * r.count, 0);

  /*
    **誤りは欄に渡す。** `Field` に `error` を渡すと入力に `aria-invalid` が付き、
    `Form` がそこへフォーカスを移す。

    自前の知らせで出すと、**どちらも起きない。** 文言は見えるが、
    読み上げは欄と結ばれず、フォーカスは送信ボタンに残る。実際、最初はそう書いていた。

    `required` は印を付けるだけで、**強制しない**（`Form` は `noValidate` が既定）。
    検証は利用側が書く。書かないと、空の欄のまま確認まで進む。
  */
  const check = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? '').trim();
    const next: Errors = {};
    if (!value('name')) next.name = 'お名前を入れてください';
    if (!value('mail')) next.mail = 'メールアドレスを入れてください';
    else if (!value('mail').includes('@')) next.mail = 'メールアドレスの形が正しくありません';
    if (!/^\d{7}$/.test(value('zip'))) next.zip = '7桁の数字で入れてください';
    if (!value('address')) next.address = '住所を入れてください';
    setErrors(next);
    if (Object.keys(next).length === 0) confirm.show();
  };

  const send = () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      confirm.hide();
      setDone(true);
      clear();
      showToast({ message: '注文を受け付けました', tone: 'success' });
    }, 1200);
  };

  if (done) {
    return (
      <ShopWidth className="flex flex-col gap-8 py-12">
        <Alert tone="success" title="ご注文ありがとうございました" live>
          受け取りの控えをメールでお送りしました。焙煎は明日行います。
        </Alert>
        <Button asChild>
          <Link href="/demo/shop">トップへ戻る</Link>
        </Button>
      </ShopWidth>
    );
  }

  /* **空のカートでは注文させない。** 合計 ¥0 の確認まで進めても意味が無い */
  if (lines.length === 0) {
    return (
      <ShopWidth className="flex flex-col gap-8 py-12">
        <Card surface="surface">
          <CardHeader>
            <CardTitle>カートが空なので、注文に進めません</CardTitle>
            <CardDescription>先に豆をカートに入れてください。</CardDescription>
          </CardHeader>
          <Button asChild>
            <Link href="/demo/shop/products">商品を見る</Link>
          </Button>
        </Card>
      </ShopWidth>
    );
  }

  return (
    <ShopWidth className="flex flex-col gap-8 py-12">
      <Breadcrumb label="いまいる場所">
        <BreadcrumbItem href="/demo/shop">トップ</BreadcrumbItem>
        <BreadcrumbItem href="/demo/shop/cart">カート</BreadcrumbItem>
        <BreadcrumbItem>注文</BreadcrumbItem>
      </Breadcrumb>

      <h1 className="text-heading-2 font-emphasis">注文</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <Form id="order" onSubmit={check} className="flex flex-col gap-4 lg:col-span-2">
          <h2 className="text-label font-emphasis">お届け先</h2>

          <Field id="name" label="お名前" required error={errors.name}>
            <Input name="name" autoComplete="name" />
          </Field>
          <Field
            id="mail"
            label="メールアドレス"
            description="控えをお送りします"
            required
            error={errors.mail}
          >
            <Input name="mail" type="email" autoComplete="email" />
          </Field>
          <Field id="zip" label="郵便番号" description="ハイフンなし" required error={errors.zip}>
            <Input name="zip" inputMode="numeric" autoComplete="postal-code" className="font-numeric" />
          </Field>
          <Field id="address" label="住所" required error={errors.address}>
            <Input name="address" autoComplete="street-address" />
          </Field>

          <Separator />

          <h2 className="text-label font-emphasis">お届け希望日</h2>
          <Calendar mode="single" selected={day} onSelect={setDay} />

          <Separator />

          <RadioGroup id="pay" label="お支払い方法" description="あとから変えられません">
            {PAY.map((p, i) => (
              <Field key={p.value} layout="inline" id={`pay-${p.value}`} label={p.label}>
                <Radio name="pay" value={p.value} defaultChecked={i === 0} />
              </Field>
            ))}
          </RadioGroup>

          <Field id="pass" label="パスワード" description="次回から入力を省けます">
            <PasswordInput name="pass" autoComplete="new-password" />
          </Field>

          <Field id="note" label="ご要望" description="空でも構いません">
            <Textarea name="note" rows={3} />
          </Field>

          <FormActions>
            <Button type="submit">内容を確認する</Button>
            <Button type="button" variant="ghost" asChild>
              <Link href="/demo/shop/cart">カートへ戻る</Link>
            </Button>
          </FormActions>
        </Form>

        <Card surface="surface" elevation="raised" className="h-fit">
          <CardHeader>
            <CardTitle>ご注文の内容</CardTitle>
          </CardHeader>
          <List separated>
            {lines.map((r) => (
              <ListItem key={r.key} separated>
                <span className="flex justify-between gap-4">
                  <span className="flex flex-col">
                    <span>
                      {r.product.name}
                      <span className="ms-1 text-caption text-muted">×{r.count}</span>
                    </span>
                    <span className="text-caption text-muted">{lineNote(r)}</span>
                  </span>
                  <span className="font-numeric">{yen(r.unit * r.count)}</span>
                </span>
              </ListItem>
            ))}
          </List>
          <Separator />
          <p className="flex justify-between gap-4 text-heading-2 font-emphasis">
            <span>合計</span>
            <span className="font-numeric">{yen(total)}</span>
          </p>
        </Card>
      </div>

      <Modal
        open={confirm.open}
        onClose={confirm.hide}
        title="この内容で注文しますか"
        actions={
          <>
            {/* **送信中の印は `Button` が持っている。** 手で並べると読み上げの状態が付かない */}
            <Button onClick={send} loading={sending}>
              注文する
            </Button>
            <Button variant="ghost" onClick={confirm.hide} disabled={sending}>
              戻る
            </Button>
          </>
        }
      >
        <p className="text-body">
          合計 <span className="font-numeric font-emphasis">{yen(total)}</span> を
          {day ? `${day.toLocaleDateString('ja-JP')} に` : 'ご指定なしで'}お届けします。
        </p>
        <p className="text-caption text-muted">これはデモです。実際には送信されません。</p>
      </Modal>
    </ShopWidth>
  );
}
