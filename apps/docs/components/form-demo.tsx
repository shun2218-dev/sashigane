'use client';

import { Button, Field, Input } from '@sashigane/ui';
import { useForm } from 'react-hook-form';
import { previewProps } from './preview.tsx';

/**
 * **react-hook-form と組んだ、実際に動くフォーム。**
 *
 * 「どのライブラリとも組める」と書くだけでは、**組めなくなっても気づけない。**
 * ここは飾りではなく、押すと本当に検証が走る。
 *
 * このリポジトリは `react-hook-form` に依存していない——
 * **この展示だけが依存している。** `packages/ui` の側は標準の props しか受け取らない。
 */
export function FormDemo() {
  const {
    register,
    handleSubmit,
    formState: { errors, dirtyFields },
    reset,
  } = useForm<{ mail: string; note: string }>({
    /*
     * **打っている最中に検証する。** ここは満たしていることの表示を見せる場所で、
     * それは**入力中に切り替わるためにある。**
     *
     * 以前は送信が一度成功するまで緑にならなかった。
     * **ページを開き直すと出ない**ので、見せたいものが見えていなかった。
     */
    mode: 'onChange',
  });

  return (
    <form
      // 送っても何処へも行かない。**検証が走ることだけを見せる**
      onSubmit={handleSubmit(() => {})}
      noValidate
      {...previewProps('flex max-w-sm flex-col gap-4')}
    >
      <Field
        id="demo-mail"
        label="メールアドレス"
        description="仕事用のものを入れてください"
        error={errors.mail?.message}
        // 打ち始めてから緑にする。**空の欄が最初から満たしていることにならない**
        valid={!errors.mail && !!dirtyFields.mail}
        required
      >
        <Input
          type="email"
          placeholder="you@example.com"
          {...register('mail', {
            required: '入力してください',
            pattern: { value: /.+@.+\..+/, message: 'この形では受け取れません' },
          })}
        />
      </Field>

      <Field id="demo-note" label="備考" description="空でも構いません">
        <Input placeholder="任意" {...register('note')} />
      </Field>

      <div className="flex gap-2">
        <Button type="submit">送信する</Button>
        <Button type="button" variant="ghost" onClick={() => reset()}>
          戻す
        </Button>
      </div>
    </form>
  );
}
