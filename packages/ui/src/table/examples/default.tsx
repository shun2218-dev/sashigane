import { Table, TableCell, TableHeaderCell, TableRow } from '../table.tsx';

/**
 * 通常。**数字の列は右に寄り、桁の幅が揃う。**
 *
 * 揃えないと、上下の行で桁の位置がずれて読み比べられない。
 *
 * `thead` と `tbody` は素のまま書く。どちらにも当てるものが無いので、
 * **枠だけの部品を置いていない。**
 */
const rows = [
  { name: '5km', pace: '4:52', count: 128 },
  { name: '10km', pace: '5:04', count: 41 },
  { name: 'ハーフ', pace: '5:31', count: 7 },
];

export default function Default() {
  return (
    <Table>
      <thead>
        <TableRow>
          <TableHeaderCell>距離帯</TableHeaderCell>
          <TableHeaderCell numeric>最速ペース</TableHeaderCell>
          <TableHeaderCell numeric>本数</TableHeaderCell>
        </TableRow>
      </thead>
      <tbody>
        {rows.map((r) => (
          <TableRow key={r.name}>
            <TableCell>{r.name}</TableCell>
            <TableCell numeric>{r.pace}</TableCell>
            <TableCell numeric>{r.count}</TableCell>
          </TableRow>
        ))}
      </tbody>
    </Table>
  );
}
