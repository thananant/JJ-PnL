// smoke69: หน้าสรุป — สินค้าเดียวกันซื้อจากหลายซัพในเดือน: กล่องแจ้งเตือน + ป้ายที่แถวซัพ + ✓ ถูกสุด + แตะเด้งไปหน้าการใช้ของ (ระดับสินค้า กรองชื่อให้)
// หน้าการใช้ของ — ค่าเริ่มต้นเป็นโหมดรายสินค้า (รวมทุกซัพ) + ไฮไลต์ "2 ซัพ"
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const inc=[{branch:'JJRD',d:'2026-08-01',sales_pos_am:107000,sales_pos_pm:0,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0}];
const B=(sid,item,unit,qty,price,d)=>({branch:'JJRD',d,supplier_id:sid,item,unit,qty,price,discount:0,sort:0,bill_no:1});
// ข้าวหอมมะลิ ซื้อจาก Makro (ถูกกว่า ล่าสุด 30) และ FarmFresh (ล่าสุด 32) · หมูสามชั้น ซัพเดียว
const items=[
  B(1,'ข้าวหอมมะลิ','กก.',50,32,'2026-08-03'), B(2,'ข้าวหอมมะลิ','กก.',80,31,'2026-08-02'), B(2,'ข้าวหอมมะลิ','กก.',40,30,'2026-08-09'),
  B(3,'หมูสามชั้น','กก.',10,150,'2026-08-05'),
];
const exp=[{branch:'JJRD',d:'2026-08-03',supplier_id:1,amount:1600,paid:true},{branch:'JJRD',d:'2026-08-09',supplier_id:2,amount:3680,paid:true},{branch:'JJRD',d:'2026-08-05',supplier_id:3,amount:1500,paid:true}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'},{id:2,name:'Makro',category:'อาหาร',active:true,sort:2,vat_type:'NON-VAT'},{id:3,name:'Smilemeat',category:'อาหาร',active:true,sort:3,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_income_daily')&&url.includes('2026-08'))return T(inc);
      if(url.includes('pnl_expense_daily')&&url.includes('2026-08'))return T(exp);
      if(url.includes('pnl_bill_items')&&url.includes('d=gte.2026-08'))return T(items);
      if(url.includes('pnl_bill_items'))return T([]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(500); await w.eval("show('sum')"); await sleep(600);
  const box=d.querySelector('.dupbox');
  out.push('กล่องแจ้งเตือน 1 รายการ (ข้าวหอมมะลิ) ไม่มีหมูสามชั้น: '+(!!box&&box.textContent.includes('หลายซัพเดือนนี้ · 1 รายการ')&&box.textContent.includes('ข้าวหอมมะลิ')&&!box.textContent.includes('หมูสามชั้น')));
  const row=box&&box.querySelector('.duprow');
  out.push('Makro ✓ ถูกสุด ขึ้นก่อน (120 กก. ฿3,680 ล่าสุด 30.00) · FarmFresh 50 กก. ฿1,600 ล่าสุด 32.00: '+(!!row&&row.textContent.indexOf('✓Makro')<row.textContent.indexOf('FarmFresh')&&row.textContent.includes('✓Makro 120 กก. · ฿3,680 (ล่าสุด 30.00)')&&row.textContent.includes('FarmFresh 50 กก. · ฿1,600 (ล่าสุด 32.00)')));
  const tr=n=>[...d.querySelectorAll('#view-sum tr')].find(x=>x.textContent.trim().startsWith(n));
  out.push('ป้าย "⚠ ซ้ำซัพ: ข้าวหอมมะลิ" ที่แถว FarmFresh และ Makro · Smilemeat ไม่มี: '+(!!tr('FarmFresh')&&tr('FarmFresh').textContent.includes('⚠ ซ้ำซัพ: ข้าวหอมมะลิ')&&tr('Makro').textContent.includes('⚠ ซ้ำซัพ: ข้าวหอมมะลิ')&&!tr('Smilemeat').textContent.includes('ซ้ำซัพ')));
  // แตะกล่อง → หน้าการใช้ของ โหมดรายสินค้า + กรองคำว่าข้าวหอมมะลิ
  row.click(); await sleep(600);
  const q=d.getElementById('useQ');
  out.push('เด้งไปหน้าการใช้ของ โหมดรายสินค้า กรอง "ข้าวหอมมะลิ": '+(w.eval("S.tab==='usage'&&S.usageMode==='item'")&&!!q&&q.value==='ข้าวหอมมะลิ'));
  const vis=[...d.querySelectorAll('tr.urow')].filter(x=>x.style.display!=='none');
  out.push('เห็นแถวเดียว ข้าวหอมมะลิ 170 กก. รวมทุกซัพ + ป้าย "2 ซัพ": '+(vis.length===1&&vis[0].textContent.includes('ข้าวหอมมะลิ')&&vis[0].textContent.includes('170')&&!!vis[0].querySelector('.chip.warn')&&vis[0].querySelector('.chip.warn').textContent==='2 ซัพ'));
  out.push('ราคาล่าสุดรายซัพ ✓Makro 30.00 ก่อน FarmFresh 32.00: '+(vis[0].textContent.indexOf('✓Makro 30.00')<vis[0].textContent.indexOf('FarmFresh 32.00')));
  out.push('โน้ตบอก "สินค้าตัวเดียวกันนับรวมทุกซัพ": '+d.getElementById('view-usage').textContent.includes('สินค้าตัวเดียวกันนับรวมทุกซัพ'));
  // ค่าเริ่มต้นของเครื่องใหม่ = โหมดรายสินค้า (key ใหม่ jj_usemode2)
  out.push('LS jj_usemode2 = item: '+(w.localStorage.getItem('jj_usemode2')==='"item"'));
  // ไม่มีสินค้าซ้ำ → ไม่มีกล่อง (ดูเดือนที่ไม่มีบิล)
  w.eval("S.m='2026-07'; S.benchCache={};"); await w.eval("show('sum')"); await sleep(500);
  out.push('เดือนที่ไม่มีสินค้าซ้ำ → ไม่มีกล่อง/ป้าย: '+(!d.querySelector('#view-sum .dupbox')&&!d.querySelector('#view-sum .chip.warn')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
