// smoke122: เมทริกซ์ "📊 บิลทั้งเดือน · ทุกซัพ" สลับแกน (10 ต.ค. 2569) — แถว = ซัพ · คอลัมน์ = วัน 1..N · รวม/ซัพ ท้ายแถว · รวม/วัน แถวท้าย
// ตัวเลขคำนวณมือจาก fixture: ซัพ1 = 11,885 (5 ส.ค.) + 5,000 (6 ส.ค.) = 16,885 · ซัพ2 = 9,451 (7 ส.ค.) · รวม 26,336
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const posts=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      const method=opt&&opt.method||'GET';
      if(method==='POST'&&url.includes('pnl_expense_daily')){posts.push(JSON.parse(opt.body));return T([]);}
      if(url.includes('pnl_suppliers'))return T([
        {id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'},
        {id:2,name:'Smilemeat',category:'อาหาร',active:true,sort:2,vat_type:'NON-VAT'},
        {id:3,name:'ซัพปิดใช้',category:'อื่นๆ',active:false,sort:3,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_expense_daily')&&url.includes('d=gte.2026-08'))return T([
        {branch:'JJRD',d:'2026-08-05',supplier_id:1,amount:11885,paid:false,slip_url:null,checked:false},
        {branch:'JJRD',d:'2026-08-06',supplier_id:1,amount:5000,paid:false,slip_url:null,checked:true},
        {branch:'JJRD',d:'2026-08-07',supplier_id:2,amount:9451,paid:true,slip_url:'https://x/slip.jpg',checked:true}]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener:()=>{}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const ok=(label,cond)=>{ console.log((cond?'PASS ':'FAIL ')+label); if(!cond)process.exitCode=1; };
setTimeout(async()=>{
  d.querySelector('.sb-item[data-v="exp"]').click();
  await new Promise(r=>setTimeout(r,350));
  const tb=d.querySelector('table.mx'); ok('matrix exists',!!tb);
  const trs=[...tb.querySelectorAll('tr')];
  // 1) โครง: หัว 1 + ซัพ active 2 + รวม 1 = 4 แถว (ซัพปิดใช้ไม่โชว์)
  ok('rows = 4 (head + 2 sups + foot)',trs.length===4);
  ok('ไม่มีซัพปิดใช้',!tb.textContent.includes('ซัพปิดใช้'));
  // 2) หัวคอลัมน์ = วัน 1..31 + รวม/ซัพ · วันอาทิตย์ (2,9,16,23,30 ส.ค. 69) มี .sun · กดหัววันได้
  const hs=[...trs[0].querySelectorAll('th.mxs')];
  ok('header days 31 + total',hs.length===32&&hs[0].textContent.startsWith('1')&&hs[30].textContent.startsWith('31')&&hs[31].textContent.includes('รวม/ซัพ'));
  const sunIdx=hs.map((h,i)=>h.classList.contains('sun')?i+1:0).filter(Boolean);
  ok('sunday headers 2,9,16,23,30',JSON.stringify(sunIdx)==='[2,9,16,23,30]');
  ok('day header shows weekday',hs[4].textContent.replace(/\s/g,'')==='5พ'); // 5 ส.ค. 69 = พุธ
  ok('corner header',trs[0].querySelector('th.mxd').textContent.includes('ซัพ ↓'));
  // 3) แถวซัพ: หัวแถว = ชื่อซัพ (ตรึงซ้าย .mxd) · 31 ช่อง data-mx เรียงวัน · ท้ายแถว = รวม/ซัพ
  const r1=trs[1], r2=trs[2];
  ok('row1 = FarmFresh',r1.querySelector('th.mxd').textContent.includes('FarmFresh'));
  ok('row2 = Smilemeat',r2.querySelector('th.mxd').textContent.includes('Smilemeat'));
  const c1=[...r1.querySelectorAll('td[data-mx]')];
  ok('row1 has 31 day cells in order',c1.length===31&&c1[0].dataset.mx==='2026-08-01|1'&&c1[30].dataset.mx==='2026-08-31|1');
  ok('row1 total 16,885.00',r1.querySelector('td.mxt').textContent==='16,885.00');
  ok('row2 total 9,451.00',r2.querySelector('td.mxt').textContent==='9,451.00');
  // 4) สี 3 ระดับ + ช่องว่าง + ช่องอาทิตย์
  ok('cell 5 ส.ค. ซัพ1 = cw 11,885.00',c1[4].className==='cw'&&c1[4].textContent==='11,885.00');
  ok('cell 6 ส.ค. ซัพ1 = cy',c1[5].className==='cy');
  ok('cell 7 ส.ค. ซัพ2 = cg',r2.querySelectorAll('td[data-mx]')[6].className==='cg');
  ok('empty = ce',c1[0].className==='ce');
  ok('sunday empty = ce sun',c1[1].className==='ce sun'&&c1[8].className==='ce sun');
  ok('cell onclick = expCell(day,sid)',c1[4].getAttribute('onclick')==='expCell(5,1)');
  // 5) แถวรวม/วัน: 31 ช่อง + รวมทั้งเดือน
  const ft=trs[3]; ok('foot label',ft.classList.contains('mxfoot')&&ft.querySelector('th.mxd').textContent==='รวม/วัน');
  const fts=[...ft.querySelectorAll('td')];
  ok('foot 32 cells',fts.length===32);
  ok('foot day5 11,885.00 · day6 5,000.00 · day7 9,451.00 · day1 ว่าง',fts[4].textContent==='11,885.00'&&fts[5].textContent==='5,000.00'&&fts[6].textContent==='9,451.00'&&fts[0].textContent==='');
  ok('grand 26,336.00',fts[31].textContent==='26,336.00');
  // 6) กดหัววัน → เปิดฟอร์มวันนั้น
  hs[4].click(); await new Promise(r=>setTimeout(r,450));
  ok('click day header → expDay 5 + form open',w.eval('S.expDay===5&&S.expOpen===true')&&d.getElementById('expDayWrap').style.display!=='none');
  // 7) updMatrixCell คง .sun ไว้ (ช่องวันอาทิตย์ที่เพิ่งมีบิล)
  w.eval(`S.cache[mkey(S.br,S.m)].exp['2026-08-09|1']={branch:'JJRD',d:'2026-08-09',supplier_id:1,amount:1200,checked:false,slip_url:null}`);
  w.updMatrixCell('2026-08-09',1);
  const sc=d.querySelector('[data-mx="2026-08-09|1"]');
  ok('updMatrixCell sunday → cw sun 1,200.00',sc.className==='cw sun'&&sc.textContent==='1,200.00');
  w.eval(`S.cache[mkey(S.br,S.m)].exp['2026-08-09|1'].checked=true`); w.updMatrixCell('2026-08-09',1);
  ok('→ cy sun',sc.className==='cy sun');
  w.eval(`delete S.cache[mkey(S.br,S.m)].exp['2026-08-09|1']`); w.updMatrixCell('2026-08-09',1);
  ok('→ ce sun (ลบ)',sc.className==='ce sun'&&sc.textContent==='');
  w.updMatrixCell('2026-08-05',1); ok('weekday cell stays cw (no sun)',c1[4].className==='cw');
  console.log('errors: '+JSON.stringify(w.errors)); // run-tests.sh ต้องเห็น "errors: []"
  if(w.errors.length)process.exitCode=1;
  process.exit(process.exitCode||0);
},400);
