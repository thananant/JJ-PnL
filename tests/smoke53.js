const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const inc=(br,d,amt)=>({branch:br,d,sales_pos_am:amt,sales_pos_pm:0,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0});
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.localStorage.setItem('jjpnl_br',JSON.stringify('ALL'));
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      // รายรับ 2 สาขา: JJRD 2 วัน (10700+21400) / JJLP 1 วัน (5350) — วันมีรายรับรวม 2 วัน (05,06)
      if(url.includes('pnl_income_daily')&&url.includes('d=gte.2026-08')&&!url.includes('branch=eq.'))
        return T([inc('JJRD','2026-08-05',10700),inc('JJRD','2026-08-06',21400),inc('JJLP','2026-08-05',5350)]);
      if(url.includes('pnl_income_daily'))return T([]);
      if(url.includes('pnl_expense_daily')&&url.includes('d=gte.2026-08')&&!url.includes('branch=eq.'))
        return T([{branch:'JJRD',d:'2026-08-05',amount:1000},{branch:'JJRD',d:'2026-08-06',amount:2500},{branch:'JJLP',d:'2026-08-05',amount:700}]);
      if(url.includes('pnl_expense_daily'))return T([]);
      // bill_items รวม 2 สาขา: หมูสามชั้น JJRD 10 + JJLP 5 = 15 กก.
      if(url.includes('pnl_bill_items')&&url.includes('d=gte.2026-08')&&!url.includes('branch=eq.'))
        return T([{branch:'JJRD',d:'2026-08-05',supplier_id:1,item:'หมูสามชั้น',unit:'กก.',qty:10,price:150,discount:0,sort:0},
                  {branch:'JJLP',d:'2026-08-06',supplier_id:1,item:'หมูสามชั้น',unit:'กก.',qty:5,price:150,discount:0,sort:0}]);
      if(url.includes('pnl_bill_items'))return T([]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
setTimeout(async()=>{
  const out=[];
  // 1) รายรับ ALL: ตารางวัน×สาขา
  d.querySelector('.sb-item[data-v="income"]').click();
  await new Promise(r=>setTimeout(r,350));
  const it=d.getElementById('view-income').textContent;
  out.push('income ALL: ไม่ใช่ notice: '+!it.includes('ต้องเลือกสาขาก่อน'));
  out.push('income: JJRD 32,100 + JJLP 5,350 + รวม 37,450: '+(it.includes('32,100')&&it.includes('5,350')&&it.includes('37,450')));
  // 2) รายจ่าย ALL
  d.querySelector('.sb-item[data-v="exp"]').click();
  await new Promise(r=>setTimeout(r,350));
  const et=d.getElementById('view-exp').textContent;
  out.push('exp ALL: ตารางรวม: '+(!et.includes('ต้องเลือกสาขาก่อน')&&et.includes('3,500')&&et.includes('700')&&et.includes('4,200')));
  // 3) ข้อมูลการใช้ของ ALL: หมูสามชั้นรวม 15 กก. หาร 2 วัน = 7.5/วัน
  d.querySelector('.sb-item[data-v="usage"]').click();
  await new Promise(r=>setTimeout(r,400));
  const ut=d.getElementById('view-usage').textContent;
  out.push('usage ALL: รวมทุกสาขา หัวการ์ด: '+ut.includes('รวมทุกสาขา'));
  out.push('usage: 15 กก. · 7.5/วัน · dd=2: '+(ut.includes('15')&&ut.includes('7.50/วัน')&&ut.includes('รายรับ 2 วัน')));
  // 4) หน้า "บันทึกข้อมูลบิล" ยังต้องเลือกสาขา (คีย์ข้อมูล)
  d.querySelector('.sb-item[data-v="detail"]').click();
  await new Promise(r=>setTimeout(r,250));
  out.push('detail ยังเป็น notice: '+d.getElementById('view-detail').textContent.includes('ต้องเลือกสาขาก่อน'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},450);
