'use client';

/*
  **例そのものをクライアント側にする。** 範囲の選択に状態が要る。
*/
import { useState } from 'react';
import { ja } from 'react-day-picker/locale';
import type { DateRange } from 'react-day-picker';
import { Calendar } from '../calendar.tsx';

/**
 * エッジケース。**範囲・複数月・選べない日。**
 *
 * 範囲の端は濃く、あいだは淡い。**同じ濃さにすると端が読めない。**
 *
 * 選べない日は沈める。**押せるように見えて何も起きないものを作らない。**
 */
export default function Edge() {
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(2026, 8, 8),
    to: new Date(2026, 8, 17),
  });

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <Calendar
        mode="range"
        locale={ja}
        numberOfMonths={2}
        selected={range}
        onSelect={setRange}
      />

      <Calendar
        mode="single"
        locale={ja}
        defaultMonth={new Date(2026, 8, 1)}
        disabled={{ dayOfWeek: [0, 6] }}
      />
    </div>
  );
}
