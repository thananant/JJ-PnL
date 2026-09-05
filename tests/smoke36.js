const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
// รายรับ 10 วัน -> dd=10 · หมูสามชั้น 120 กก. เดือนนี้ (เดือนก่อน 100) · น้ำแข็ง 30 ถุง
const inc=[]; for(let d=1;d<=10;d++){const ds='2026-08-'+String(d).padStart(2,'0');
  inc.push({branch:'JJRD',d:ds,sales_pos_am:10700,sales_pos_pm:0,deposit_am:0,deposit_pm:0,cash_drawer_am:0,cash_drawer_pm:0,transfer_total_am:0,transfer_total_pm:0,reserve_acct_am:0,reserve_acct_pm:0,transfer_pending_prev_am:0,transfer_pending_prev_pm:0,drawer_open_am:0,drawer_open_pm:0});}
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_suppliers'))return T([
        {id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:10,vat_type:'NON-VAT'},
        {id:2,name:'น้ำดื่ม',category:'น้ำ',active:true,sort:20,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_income_daily')&&url.includes('d=gte.2026-08'))return T(url.includes('JJLP')?[]:inc);
      if(url.includes('pnl_bill_items')&&url.includes('d=gte.2026-08'))return T([
        {branch:'JJRD',d:'2026-08-03',supplier_id:1,item:'หมูสามชั้น',qty:50,unit:'กก.',price:139,sort:0},
        {branch:'JJRD',d:'2026-08-08',supplier_id:1,item:'หมูสามชั้น',qty:70,unit:'กก.',price:142,sort:0},
        {branch:'JJRD',d:'2026-08-05',supplier_id:2,item:'น้ำแข็ง',qty:30,unit:'ถุง',price:12,sort:0}]);
      if(url.includes('pnl_bill_items')&&url.includes('d=gte.2026-07'))return T([
        {supplier_id:1,item:'หมูสามชั้น',unit:'กก.',qty:100}]);
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
  out.push('sidebar: '+!!d.querySelector('.sb-item[data-v="usage"]'));
  d.querySelector('.sb-item[data-v="usage"]').click();
  await new Promise(r=>setTimeout(r,350));
  const v=d.getElementById('view-usage'); const t=v.textContent;
  out.push('divisor note dd=10: '+t.includes('วันที่มีรายรับ 10 วัน'));
  out.push('หมู 120 กก.: '+t.includes('120')+' | เฉลี่ย 12/วัน: '+t.includes('12/วัน'));
  out.push('ราคาล่าสุด 142: '+t.includes('142.00'));
  out.push('มูลค่าหมู 16,890: '+t.includes('16,890'));
  out.push('chip เทียบเดือนก่อน ▲20%: '+(t.includes('▲')&&t.includes('20.00%')));
  out.push('น้ำแข็ง 3/วัน: '+t.includes('3/วัน'));
  out.push('รวมมูลค่า 17,250: '+t.includes('17,250'));
  // modal ประวัติ
  const key=Object.keys(w.eval('S._usage.g')).find(k=>k.includes('หมูสามชั้น'));
  w.usageDetail(key);
  await new Promise(r=>setTimeout(r,60));
  const m=d.body.textContent;
  out.push('modal hist 2 แถว + avg: '+(m.includes('3 ส.ค.')&&m.includes('8 ส.ค.')&&m.includes('ราคาเฉลี่ย')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
