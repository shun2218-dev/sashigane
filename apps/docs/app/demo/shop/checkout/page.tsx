'use client';

/*
  注文の入力。**このデモで最も入力が多い画面である。**

  Form が送信の失敗時に最初の誤りへフォーカスを移す。Field が関連付けを作る。
  Calendar で希望日を選び、Modal で最終確認をしてから送る。

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
  Spinner,
  Textarea,
  useModal,
  useToast,
} from '@sashigane/ui';
import { PRODUCTS, yen } from '../data';

const PAY = [
  { value: 'card', label: 'クレジットカード' },
  { value: 'transfer', label: '銀行振込' },
  { value: 'cod', label: '代金引換（手数料 330円）' },
];

/** カートの中身。**デモなので固定である** */
const ITEMS = [
  { slug: 'yirgacheffe', count: 2 },
  { slug: 'house-blend', count: 1 },
];

export default function Checkout() {
  const confirm = useModal();
  const { show: showToast } = useToast();
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [day, setDay] = useState<Date | undefined>();
  const [error, setError] = useState<string | undefined>();

  const rows = ITEMS.flatMap((i) => {
    const p = PRODUCTS.find((x) => x.slug === i.slug);
    return p ? [{ ...i, product: p }] : [];
  });
  const total = rows.reduce((n, r) => n + r.product.price * r.count, 0);

  const check = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!String(data.get('mail') ?? '').includes('@')) {
      setError('メールアドレスの形が正しくありません');
      return;
    }
    setError(undefined);
    confirm.show();
  };

  const send = () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      confirm.hide();
      setDone(true);
      showToast({ message: '注文を受け付けました', tone: 'success' });
    }, 1200);
  };

  if (done) {
    return (
      <div className="flex flex-col gap-6">
        <Alert tone="success" title="ご注文ありがとうございました" live>
          受け取りの控えをメールでお送りしました。焙煎は明日行います。
        </Alert>
        <Button asChild>
          <Link href="/demo/shop">トップへ戻る</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb label="いまいる場所">
        <BreadcrumbItem href="/demo/shop">トップ</BreadcrumbItem>
        <BreadcrumbItem href="/demo/shop/cart">カート</BreadcrumbItem>
        <BreadcrumbItem>注文</BreadcrumbItem>
      </Breadcrumb>

      <h1 className="text-heading font-emphasis">注文</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <Form id="order" onSubmit={check} className="flex flex-col gap-4 lg:col-span-2">
          {error ? (
            <Alert tone="danger" title="送れませんでした" live>
              {error}
            </Alert>
          ) : null}

          <h2 className="text-label font-emphasis">お届け先</h2>

          <Field id="name" label="お名前" required>
            <Input name="name" autoComplete="name" />
          </Field>
          <Field id="mail" label="メールアドレス" description="控えをお送りします" required>
            <Input name="mail" type="email" autoComplete="email" />
          </Field>
          <Field id="zip" label="郵便番号" description="ハイフンなし" required>
            <Input name="zip" inputMode="numeric" autoComplete="postal-code" className="font-numeric" />
          </Field>
          <Field id="address" label="住所" required>
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
            {rows.map((r) => (
              <ListItem key={r.slug} separated>
                <span className="flex justify-between gap-4">
                  <span>
                    {r.product.name}
                    <span className="ms-1 text-caption text-muted">×{r.count}</span>
                  </span>
                  <span className="font-numeric">{yen(r.product.price * r.count)}</span>
                </span>
              </ListItem>
            ))}
          </List>
          <Separator />
          <p className="flex justify-between gap-4 text-heading font-emphasis">
            <span>合計</span>
            <span className="font-numeric">{yen(total)}</span>
          </p>
        </Card>
      </div>

      <Modal
        open={confirm.open}
        onClose={confirm.hide}
        title="この内容で注文しますか"
        style={{ maxWidth: 460 }}
        actions={
          <>
            <Button onClick={send} disabled={sending}>
              {sending ? <Spinner aria-label="送信中" /> : null}
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
    </div>
  );
}
