const root=16, base=root/4;               // 4
// spacing: 0, base, そして base*2 から ×3/2 と ×4/3 を交互に適用
const spacing=(()=>{const o=[0,base];let v=base*2;o.push(v);const r=[3/2,4/3];for(let i=0;i<7;i++){v=v*r[i%2];o.push(v);}return o;})();
console.log('spacing:', JSON.stringify(spacing));
console.log('隣接比:', spacing.slice(2).map((v,i,a)=>i?(v/a[i-1]).toFixed(4):'-').join(' '));
console.log('2段ごとの比:', (spacing[4]/spacing[2]).toFixed(4), (spacing[6]/spacing[4]).toFixed(4), (spacing[8]/spacing[6]).toFixed(4), '(いずれも 2 = 3/2 × 4/3)');

const radius=spacing.filter(v=>v<=16);
console.log('\nradius:', JSON.stringify(radius));
let ok=true;
for(const o of radius) for(const p of spacing) { const d=o-p; if(d>=0&&p>0&&!radius.includes(d)){console.log(`  ✗ ${o}-${p}=${d}`);ok=false;} }
console.log('減算閉包:', ok?'✓ 全て閉じている':'✗');

const fs=[];for(let i=3;i>=1;i--)fs.push(root/1.125**i);fs.push(root);for(let i=1;i<=7;i++)fs.push(root*1.25**i);
const lh=(s,a)=>a+(root/2)/s;
console.log('\nidx | px      | rem     | lh:display | lh:ui  | lh:prose');
fs.forEach((s,i)=>console.log(`${String(i).padStart(3)} | ${s.toFixed(4).padStart(7)} | ${(s/root).toFixed(4)} | ${lh(s,0.8).toFixed(3).padStart(10)} | ${lh(s,1.0).toFixed(3)}  | ${lh(s,1.2).toFixed(3)}`));
console.log('line-height 単調減少:', fs.every((s,i)=>i===0||lh(s,1)<lh(fs[i-1],1))?'✓':'✗');

const g=(a,r,n,k)=>Array.from({length:n},(_,i)=>a*r**(i-k));
console.log('\nduration(遷移) 200ms√2:', g(200,Math.SQRT2,5,2).map(v=>v.toFixed(1)).join(', '));
console.log('duration(ループ) 1000ms√2:', g(1000,Math.SQRT2,3,1).map(v=>v.toFixed(1)).join(', '));
console.log('  実測700ms→707.1 (+1.0%) / 実測1000ms→1000 (完全一致)');
console.log('\nborder-width:', JSON.stringify([1,2,3]));
console.log('elevation h:', JSON.stringify([0,1,2,3]));
