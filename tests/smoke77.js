// smoke77: ปุ่ม "📄 PDF รายสินค้า" — หน้า/สินค้า ตามแถวที่กรองอยู่
// ใช้ dataset เดียวกับ smoke75: ขาย จ10k อ10k ศ20k ส30k อา40k (รวม 110,000 · 5 วันขาย)
// หมู: ซื้อ 42 กก. 5 ครั้ง ฿4,200 · ราคา 100 ตลอด · อัตรา 3.82/หมื่น · ใช้/วัน [3.82, 7.64, 13.36]
// น้ำแข็ง: 4 ถุง ฿60 @15 · ล่าสุด 7 ส.ค.
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.__chartN=0;
window.Chart=function(ctx,cfg){window.__chartN++;window.__lastCfg=cfg;this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const inc=(d,amt)=>({branch:'JJRD',d,sales_pos_am:amt,sales_pos_pm:0,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0});
const incRows=[inc('2026-08-03',10000),inc('2026-08-04',10000),inc('2026-08-07',20000),inc('2026-08-08',30000),inc('2026-08-09',40000)];
const B=(d,item,unit,qty,price)=>({branch:'JJRD',d,supplier_id:1,item,unit,qty,price,discount:0,sort:0,bill_no:1});
const bills=[B('2026-08-03','หมู','กก.',5,100),B('2026-08-04','หมู','กก.',5,100),B('2026-08-07','หมู','กก.',8,100),
             B('2026-08-08','หมู','กก.',12,100),B('2026-08-09','หมู','กก.',12,100),B('2026-08-07','น้ำแข็ง','ถุง',4,15)];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.localStorage.setItem('jj_usemode2',JSON.stringify('sup'));
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'ตลาดสด',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_income_daily')&&url.includes('2026-08'))return T(incRows);
      if(url.includes('pnl_bill_items')&&url.includes('d=gte.2026-08'))return T(bills);
      if(url.includes('pnl_bill_items'))return T([]);
      return T([]);
    };
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
    w.print=()=>{ w.__printed=(w.__printed||0)+1; };
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(450); await w.eval("show('usage')"); await sleep(450);
  out.push('ปุ่ม PDF อยู่ในแถบค้นหา: '+[...d.querySelectorAll('.usearch button')].some(b=>b.textContent.includes('PDF รายสินค้า')));
  // ทั้งหมด (2 สินค้า) → 2 หน้า + กราฟ 2 อัน + print ถูกเรียก
  // กดปุ่ม -> โมดัลเลือกสินค้า (ติ๊กครบทุกตัวตั้งต้น) -> สร้าง
  w.usagePdf(); await sleep(150);
  const cks=d.querySelectorAll('.pdfck');
  out.push('โมดัลเลือกสินค้า: 2 ตัว ติ๊กครบ + ปุ่มบอก 2 หน้า: '+(cks.length===2&&[...cks].every(c=>c.checked)&&d.getElementById('pdfGoBtn').textContent.includes('2 หน้า')));
  cks[1].checked=false; w.usagePdfCnt();
  out.push('เอาติ๊กออก 1 → ปุ่มอัปเดตเป็น 1 หน้า: '+d.getElementById('pdfGoBtn').textContent.includes('1 หน้า'));
  cks[1].checked=true; w.usagePdfCnt();
  const cn0=w.__chartN; w.usagePdfGo(); await sleep(600);
  const pgs=d.querySelectorAll('#printArea .ppage');
  out.push('2 สินค้า = 2 หน้า .ppage: '+(pgs.length===2));
  const t0=pgs[0].textContent;
  out.push('หน้าหมู: ซื้อรวม 42 กก. · 5 ครั้ง · ฿4,200 · เฉลี่ย 8.40/วัน (5 วันขาย): '+(t0.includes('หมู')&&t0.includes('42 กก.')&&t0.includes('5 ครั้ง')&&t0.includes('4,200')&&t0.includes('8.40 กก./วัน')&&t0.includes('(5 วันขาย)')));
  out.push('หน้าหมู: อัตรา 3.82/฿10,000 + ใช้/วัน จ–พฤ 3.82 · ศ 7.64 · ส–อา 13.36: '+(t0.includes('3.82')&&t0.includes('7.64')&&t0.includes('13.36')));
  out.push('หน้าหมู: ราคา ล่าสุด/ต่ำสุด/สูงสุด/ถ่วงน้ำหนัก = 100.00: '+(t0.split('100.00').length-1>=4));
  out.push('หน้าหมู: ตารางสั่งซื้อ 5 แถว + ซัพ ตลาดสด: '+(pgs[0].querySelectorAll('table tr').length===6&&t0.includes('ตลาดสด')));
  out.push('กราฟเพิ่ม 2 อันจากรายงาน: '+(w.__chartN===cn0+2&&w.__lastCfg&&w.__lastCfg.type==='line'&&w.__lastCfg.options.responsive===false));
  out.push('window.print ถูกเรียก: '+(w.__printed===1));
  out.push('CSS A4: '+[...d.querySelectorAll('style')].map(x=>x.textContent).join('').includes('@page{size:A4'));
  // กรอง "น้ำแข็ง" → 1 หน้า และเลขถูก
  w.usageFilter('น้ำแข็ง'); w.usagePdf(); await sleep(150); w.usagePdfGo(); await sleep(600);
  const pgs2=d.querySelectorAll('#printArea .ppage');
  const t1=pgs2[0].textContent;
  out.push('กรองแล้วเหลือหน้าเดียว (น้ำแข็ง): '+(pgs2.length===1&&pgs2[0].querySelector('h2').textContent.includes('น้ำแข็ง')));
  out.push('น้ำแข็ง: 4 ถุง ฿60 · ล่าสุด 15.00 (7 ส.ค. 2569): '+(t1.includes('4 ถุง')&&t1.includes('60')&&t1.includes('15.00')&&t1.includes('7 ส.ค. 2569')));
  out.push('print ครั้งที่สอง: '+(w.__printed===2));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
