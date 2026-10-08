// smoke120: หน้าบันทึกข้อมูลบิล (8 ต.ค.)
//   1) เลือกซัพแล้วพิมพ์ชื่อสินค้าได้เลย — โฟกัสช่องชื่อแถวแรกที่ว่าง · ซัพที่มีรายการประจำขึ้นครบ → โฟกัสช่องจำนวนแถวแรก
//   2) รายการบิลของเดือนนี้ แยก ก่อน VAT / VAT / รวม VAT ตามโหมดบิล (ex +7% · inc ถอด 7/107 · none = VAT "–" รวม=ก่อน) + ค่าส่งไม่มี VAT + แถวรวม
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const SUPS=[{id:1,name:'VatShop',category:'อาหาร',active:true,sort:1,vat_type:'VAT'},
            {id:2,name:'ฟาร์มไก่',category:'อาหาร',active:true,sort:2,vat_type:'NON-VAT'},
            {id:3,name:'ตลาดสด',category:'อาหาร',active:true,sort:3,vat_type:'NON-VAT'}];
// บิลเดือน ส.ค.: A ex 10×100 −ท้ายบิล 100 +ค่าส่ง 30 → ก่อน 930 · VAT 63 · รวม 993 | B inc 1×1,070 → 1,000 · 70 · 1,070 | C none 2×50 → 100 · – · 100
const MONTH=[
  {d:'2026-08-05',supplier_id:1,qty:10,price:100,discount:0,bill_no:1,vat_mode:'ex',bill_discount:100,ship_fee:30,other_fee:0},
  {d:'2026-08-06',supplier_id:2,qty:1,price:1070,discount:0,bill_no:1,vat_mode:'inc',bill_discount:0,ship_fee:0,other_fee:0},
  {d:'2026-08-07',supplier_id:3,qty:2,price:50,discount:0,bill_no:1,vat_mode:'none',bill_discount:0,ship_fee:0,other_fee:0},
  {d:'2026-08-07',supplier_id:3,qty:1,price:0,discount:0,bill_no:1,vat_mode:'none',bill_discount:0,ship_fee:0,other_fee:0}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD'));
    w.localStorage.setItem('jjpnl_user',JSON.stringify('แพท'));
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null},json:async()=>v});
      const method=opt&&opt.method||'GET';
      if(method!=='GET')return T([]);
      if(url.includes('pnl_suppliers'))return T(SUPS);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_sup_items'))return T(url.includes('supplier_id=eq.2')?[{id:1,supplier_id:2,item:'ไก่สด',unit:'กก.',sort:1},{id:2,supplier_id:2,item:'เป็ดสด',unit:'กก.',sort:2}]:[]);
      if(url.includes('pnl_bill_items')&&url.includes('d=gte.2026-08-01')){
        w.__monthReq=(w.__monthReq||0)+1; if(url.includes('ship_fee'))w.__feeReq=(w.__feeReq||0)+1;
        if(w.__noFee&&url.includes('ship_fee'))return {ok:false,status:400,text:async()=>'{"code":"42703","message":"column pnl_bill_items.ship_fee does not exist"}',json:async()=>({})};
        if(w.__mixed)return T(MONTH.map(r=>r.supplier_id===3?Object.assign({},r,{vat_mode:r.price===50?null:'ex',price:r.price===50?50:100}):r)); // ตลาดสด: แถว 2×50 โหมดว่าง + แถว 1×100 ex
        return T(w.__noFee?MONTH.map(r=>{const {ship_fee,other_fee,...rest}=r;return rest;}):MONTH);}
      if(url.includes('pnl_bill_items'))return T([]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.Element.prototype.scrollIntoView=function(){};
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  d.querySelector('.sb-item[data-v="detail"]').click(); await sleep(400);
  // 1) เลือกซัพที่ไม่มีรายการประจำ → โฟกัสช่องชื่อสินค้าแถวแรก (ว่าง) ทันที
  await w.dtPickSup(1); await sleep(200);
  let a=d.activeElement;
  out.push('เลือก VatShop (ไม่มีของประจำ) → โฟกัสอยู่ช่องชื่อสินค้าแถวแรกที่ว่าง: '+(!!a&&a.tagName==='INPUT'&&a.dataset.c==='0'&&a.dataset.r==='0'&&a.value===''));
  // พิมพ์ได้เลย: ใส่ค่าในช่องที่โฟกัสแล้ว dtLines ตามมา
  a.value='หมูสามชั้น'; a.dispatchEvent(new w.Event('input',{bubbles:true}));
  out.push('พิมพ์ชื่อลงช่องที่โฟกัส → S.dtLines[0].item ตาม: '+(w.eval("S.dtLines[0].item")==='หมูสามชั้น'));
  // ซัพที่มีรายการประจำครบ → ชื่อถูกเติมหมดแล้ว โฟกัสช่องจำนวนแถวแรกแทน
  await w.dtPickSup(2); await sleep(200);
  a=d.activeElement;
  out.push('เลือก ฟาร์มไก่ (ของประจำ 2 ตัวขึ้นครบ) → โฟกัสช่องจำนวนแถวแรก: '+(!!a&&a.tagName==='INPUT'&&a.dataset.c==='1'&&a.dataset.r==='0'&&w.eval("S.dtLines.length")===2&&w.eval("S.dtLines[0].item")==='ไก่สด'));
  // 2) รายการบิลของเดือนนี้
  await w.dtMonthList(); await sleep(50);
  const tbl=d.querySelector('#dtList table');
  const ths=[...tbl.querySelectorAll('tr:first-child th')].map(t=>t.textContent.trim());
  out.push('หัวตาราง: วันที่ · ซัพ · รายการ · ก่อน VAT · VAT · รวม VAT: '+(JSON.stringify(ths)===JSON.stringify(['วันที่','ซัพพลายเออร์','รายการ','ก่อน VAT','VAT','รวม VAT',''])));
  const row=n=>[...tbl.querySelectorAll('tr')].find(tr=>tr.textContent.includes(n));
  const nums=tr=>[...tr.querySelectorAll('td.n')].map(t=>t.textContent.trim());
  out.push('บิล +7% (VatShop): ก่อน 900 · VAT 63 · รวม 993 (ค่าส่ง 30 บวกท้าย ไม่มี VAT) + บอกค่าส่งใต้ชื่อซัพ: '+(JSON.stringify(nums(row('VatShop')))===JSON.stringify(['1','฿900','฿63','฿993'])&&row('VatShop').textContent.includes('ค่าส่ง/ค่าธรรมเนียม +฿30')));
  out.push('บิล รวม VAT (ฟาร์มไก่ 1,070): ก่อน 1,000 · VAT 70 · รวม 1,070: '+(JSON.stringify(nums(row('ฟาร์มไก่')))===JSON.stringify(['1','฿1,000','฿70','฿1,070'])));
  out.push('บิลไม่มี VAT (ตลาดสด 2 รายการ): ก่อน 100 · VAT "–" · รวม 100 เท่าก่อน VAT: '+(JSON.stringify(nums(row('ตลาดสด')))===JSON.stringify(['2','฿100','–','฿100'])));
  const tot=tbl.querySelector('tr.tot');
  out.push('แถวรวม 3 บิล: 2,000 · 133 · 2,163 (ตรงกับหน้ารายละเอียดบิล): '+(!!tot&&tot.textContent.includes('รวม 3 บิล')&&JSON.stringify(nums(tot))===JSON.stringify(['฿2,000','฿133','฿2,163'])));
  // คีย์บอร์ด: Enter ที่ชิปซัพ → โฟลว์เดิม โฟกัสปุ่มแบบบิล ไม่ถูกแย่งไปตาราง (smoke73)
  const chip=d.querySelector('.dtsup[data-sid="1"]'); chip.focus();
  chip.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true})); await sleep(250);
  out.push('Enter ที่ชิปซัพ (คีย์บอร์ด) → โฟกัสยังอยู่ปุ่มแบบบิล ไม่โดนแย่งไปช่องสินค้า: '+(d.activeElement&&d.activeElement.classList.contains('vch')));
  // ไม่มีคอลัมน์ค่าส่ง (ฐานเก่า) → ถอยไปคิวรีชั้นถัดไปแบบเงียบ ไม่มี toast แดง
  w.__noFee=true; d.getElementById('toast').textContent=''; await w.dtMonthList(); await sleep(60);
  const fr=[...d.querySelectorAll('#dtList tr')].find(tr=>tr.textContent.includes('VatShop'));
  out.push('ฐานไม่มีคอลัมน์ค่าส่ง → ถอยไปชั้นถัดไปเงียบ ๆ: VatShop 900 · 63 · 963 (ไม่มีค่าส่ง) ไม่มีโน้ตค่าส่ง ไม่มี toast แดง: '+(!!fr&&JSON.stringify(nums(fr))===JSON.stringify(['1','฿900','฿63','฿963'])&&!fr.textContent.includes('ค่าส่ง/ค่าธรรมเนียม')&&!d.getElementById('toast').textContent.includes('400')&&!d.getElementById('toast').classList.contains('err')));
  out.push('คิวรีชั้นแรก (มี ship_fee) ถูกยิงก่อนแล้วค่อยถอย: '+(w.__feeReq>=1&&w.__monthReq>w.__feeReq));
  w.__noFee=false;
  // บิลเดียวกันมีแถวที่ vat_mode ว่าง (แถวเก่า) ปน → ใช้แถวสุดท้ายที่มีค่า เหมือนหน้ารายละเอียดบิล
  w.__mixed=true; await w.dtMonthList(); await sleep(60);
  const mr=[...d.querySelectorAll('#dtList tr')].find(tr=>tr.textContent.includes('ตลาดสด'));
  out.push('แถวโหมดว่าง + แถว +7% ในบิลเดียว → ถือเป็น +7%: ก่อน 200 · VAT 14 · รวม 214: '+(!!mr&&JSON.stringify(nums(mr))===JSON.stringify(['2','฿200','฿14','฿214'])&&mr.textContent.includes('+7%')));
  w.__mixed=false;
  // มีผลสแกน OCR ค้าง → เลือกซัพแล้วเติมผลสแกน ไม่แย่งโฟกัสไปตาราง
  w.eval("S._ocrPending={rows:[{name:'หมูสามชั้น',qty:2,unit:'กก.',price:150}]}");
  await w.dtPickSup(1); await sleep(200);
  out.push('มีผลสแกนค้าง → เติมลงบิล (ไม่โฟกัสช่องสินค้าเอง): '+(w.eval("S.dtLines.some(l=>l.item==='หมูสามชั้น')")&&!(d.activeElement&&d.activeElement.closest&&d.activeElement.closest('#dtLines'))));
  out.push('ป้ายโหมด VAT ยังอยู่ (+7% / รวม VAT) และบิลไม่มี VAT ไม่มีป้าย: '+(row('VatShop').textContent.includes('+7%')&&row('ฟาร์มไก่').textContent.includes('รวม VAT')&&!row('ตลาดสด').querySelector('.chip')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},500);
