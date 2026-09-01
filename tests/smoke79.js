// smoke79: เพดาน PostgREST 1,000 แถว — เดือนที่บิลเกิน 1,000 แถวต้องดึงครบทุกหน้า
// ชุดข้อมูล: 25 วัน × 50 บิล × 1 แถว = 1,250 แถว (qty 1 @10 ไม่มี VAT) → เซิร์ฟเวอร์จำลองส่งทีละ ≤1,000 ตาม limit/offset
// คาด: หน้ารายละเอียด VAT = 1,250 บิล · ก่อน VAT 12,500 · หน้าการใช้ของ = ใช้ทั้งเดือน 1,250
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const ROWS=[];
for(let day=1;day<=25;day++){
  const d='2026-08-'+String(day).padStart(2,'0');
  for(let b=1;b<=50;b++) ROWS.push({branch:'JJLP',d,supplier_id:1,item:'ของทดสอบ',unit:'ชิ้น',qty:1,price:10,discount:0,bill_discount:0,ship_fee:0,other_fee:0,sort:0,bill_no:b,vat_mode:'none'});
}
let maxOffsetSeen=0;
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJLP')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'ตลาดทดสอบ',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_bill_items')&&url.includes('d=gte.2026-08')){
        // เซิร์ฟเวอร์จำลอง: เคารพ limit/offset และไม่ส่งเกิน 1,000 แถวต่อครั้งเหมือน PostgREST จริง
        const off=+((url.match(/offset=(\d+)/)||[])[1]||0);
        const lim=Math.min(+((url.match(/limit=(\d+)/)||[])[1]||1000),1000);
        maxOffsetSeen=Math.max(maxOffsetSeen,off);
        return T(ROWS.slice(off,off+lim));
      }
      if(url.includes('pnl_bill_items'))return T([]);
      if(url.includes('pnl_income_daily'))return T([{branch:'JJLP',d:'2026-08-01',sales_pos_am:10000,sales_pos_pm:0}]);
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
  await sleep(500);
  await w.eval("show('vatrep')"); await sleep(600);
  const t=d.getElementById('view-vatrep').textContent;
  out.push('ดึงเกิน 1 หน้า (offset 1000 ถูกใช้): '+(maxOffsetSeen>=1000));
  out.push('สรุป VAT เห็นครบ 1,250 บิล: '+(t.includes('1,250')||/\b1250\b/.test(t)));
  out.push('ก่อน VAT รวม 12,500 (ครบทุกแถว ไม่โดนตัดที่พันแถว): '+t.includes('12,500'));
  await w.eval("show('usage')"); await sleep(600);
  const u=d.getElementById('view-usage').textContent;
  out.push('การใช้ของ: ใช้ทั้งเดือน 1,250 ชิ้น: '+u.includes('1,250'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
