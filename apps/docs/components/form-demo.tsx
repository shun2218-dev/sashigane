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
    formState: { errors, isSubmitSuccessful },
    reset,
  } = useForm<{ mail: string; note: string }>({ mode: 'onBlur' });

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
        valid={isSubmitSuccessful && !errors.mail}
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
