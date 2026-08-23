const near=(v,a)=>a.reduce((x,y)=>Math.abs(y-v)<Math.abs(x-v)?y:x);
const dev=(v,a)=>Math.abs((near(v,a)-v)/v*100);
const cov=(vals,scale,tol)=>{const ok=vals.filter(v=>dev(v,scale)<=tol);return `${ok.length}/${vals.length} (${(ok.length/vals.length*100).toFixed(0)}%)  外れ: ${vals.filter(v=>dev(v,scale)>tol).join(', ')||'なし'}`;};

const FS=[9.5,10.5,11,11.5,12,12.5,13,13.5,14,14.5,15,16,16.5,17,18,19,20,21,22,24,26,27,30,32,34,36,38,40,42,48,54,66,74,76,100,132];
const cur=[11.24,12.64,14.22,16,20,25,31.25,39.06];
const ext=[...cur,48.83,61.04,76.29];
console.log('font-size 現行8段  ±5%:', cov(FS,cur,5));
console.log('font-size 拡張11段 ±5%:', cov(FS,ext,5));
console.log('font-size 拡張11段 ±8%:', cov(FS,ext,8));
console.log('font-size 拡張(132除く) ±8%:', cov(FS.filter(v=>v!==132),ext,8));

const SP=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,20,22,24,26,28,30,32,34,36,38,40,44,48,52,56,64,90,96,110];
const sp=[0,4,8,12,16,24,32,48,64,96];
console.log('\nspacing 現行 ±12%:', cov(SP,sp,12));
console.log('spacing 現行 ±20%:', cov(SP,sp,20));
console.log('spacing 4px以上のみ ±20%:', cov(SP.filter(v=>v>=4),sp,20));

// 行送り3系統のあてはめ
const obs=[[132,0.82],[54,1.0],[42,1.0],[38,1.05],[32,1.05],[26,1.15]];
console.log('\n=== display系統 a=0.8, b=10 ===');
for(const [s,o] of obs){const f=0.8+10/s;console.log(`  ${String(s).padStart(4)}px 実測${o}  式${f.toFixed(3)}  差${((f-o)/o*100).toFixed(1)}%`);}
console.log('=== prose系統 a=1.2, b=8 ===');
for(const [s,o] of [[16,1.8],[13.5,1.8],[15,1.6],[13.5,1.6],[12.5,1.65],[12.5,1.7]]){const f=1.2+8/s;console.log(`  ${String(s).padStart(4)}px 実測${o}  式${f.toFixed(3)}  差${((f-o)/o*100).toFixed(1)}%`);}
