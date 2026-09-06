'use client';

/*
  **例そのものをクライアント側にする。** 選んだ日を覚えるのに状態が要る。
*/
import { useState } from 'react';
import { ja } from 'react-day-picker/locale';
import { Calendar } from '../calendar.tsx';

/**
 * 通常。**1日を選ぶ。**
 *
 * 言語は利用側が渡す。**既定を持たない**——月名も曜日名も週の開始も、
 * ブランドの選択だからである。
 */
export default function Default() {
  const [selected, setSelected] = useState<Date | undefined>(new Date(2026, 8, 15));
  return (
    <Calendar mode="single" locale={ja} selected={selected} onSelect={setSelected} />
  );
}
