// smoke87: โหมด 🤖 ตั้งค่า safety/max อัตโนมัติ (beta)
// นับแค่ 17 กับ 24 ส.ค. (ช่วงเดียว 7 วัน) ใช้รวม 28 · ยอดขายวันละ 50k ยกเว้น 20 ส.ค. = 100k (รวม 400k)
// -> ถัวตามยอดขาย: วันที่ 20 ได้ 28×(100/400)=7 · วันอื่น 3.5
// วันของ 20 ส.ค.: safety = 7×1.2 = 8.4 -> ปัด 0/5 = 10 · max = 8.4×2 = 16.8 -> 20
// วันอื่น: 3.5×1.2 = 4.2 -> ceil 5 · max 8.4 -> 9 (<8? 8.4>=8 -> 10)  [เช็คเฉพาะวันที่ 20]
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const SB='b19f0a17b4472';
const prods=[{id:'p1',branch_id:SB,name:'หมูสามชั้นก้อน',unit:'โล',sup:'สมาย',safety:12,max:30,deleted_at:null}];
const smap=[{id:1,branch:'JJRD',product_id:'p1',product_name:'หมูสามชั้นก้อน',pnl_item:'หมูสามชั้น',stock_unit:'โล',factor:1,active:true}];
const counts=[
 {id:'c1',branch_id:SB,branch_name:'รัชดา',product_id:'p1',count_date:'2026-08-17',qty:30,unit:'โล'},
 {id:'c2',branch_id:SB,branch_name:'รัชดา',product_id:'p1',count_date:'2026-08-24',qty:2,unit:'โล'}];
const inc=[];
for(let d=17;d<24;d++) inc.push({branch:'JJRD',d:'2026-08-'+d,sales_pos_am:d===20?100000:50000,sales_pos_pm:0});
const posts=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      if(method==='POST'&&url.includes('products')){posts.push({url,rows:JSON.parse(opt.body)});return T([]);}
      if(url.includes('pnl_unit_conv'))return T([]);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'สมาย',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_stock_map'))return T(smap);
      if(url.includes('stock_counts'))return T(counts);
      if(url.includes('products'))return T(prods);
      if(url.includes('pnl_bill_items'))return T([]);
      if(url.includes('pnl_income_daily'))return T(inc);
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
  await sleep(450); await w.eval("show('actual')"); await sleep(700);
  out.push('มีปุ่มโหมด 🤖: '+d.getElementById('view-actual').textContent.includes('ตั้งค่าอัตโนมัติ'));
  // ตั้งวันเป้าหมาย = วันของ 20 ส.ค.
  const wd=new Date('2026-08-20T00:00:00').getDay();
  await w.eval(`S.autoDay=${wd}`); await w.stkViewSet('auto'); await sleep(600);
  const v=d.getElementById('view-actual');
  out.push('เปิดโหมด β มีแถบอธิบาย + ตาราง: '+(v.textContent.includes('ไม่เขียนอะไรจนกว่าจะกดยืนยัน')&&v.textContent.includes('safety เดิม → ใหม่')));
  const ck=d.querySelector('.autock');
  out.push('เสนอ safety 10 (7×1.2=8.4→ปัด 0/5) · max 20 (16.8→20): '+(ck&&ck.dataset.sf==='10'&&ck.dataset.mx==='20'));
  out.push('โชว์ค่าเดิม 12/30 → ใหม่: '+(v.textContent.includes('12 →')&&v.textContent.includes('30 →')));
  out.push('ข้อมูลจุดเดียว -> ป้าย "ข้อมูลน้อย" + ไม่ติ๊กให้เอง: '+(v.textContent.includes('ข้อมูลน้อย')&&!ck.checked));
  // เขียน: ติ๊กเอง -> ยืนยันสองชั้น
  ck.checked=true; w.stkAutoCnt();
  await w.stkAutoWrite(); await sleep(150);
  out.push('มีโมดัลยืนยันก่อนเขียน: '+d.getElementById('modalBox').textContent.includes('ยืนยันเขียนค่า'));
  await w.stkAutoWrite2(); await sleep(300);
  const pr=posts[0];
  out.push('เขียนผ่าน upsert on_conflict=id ค่า {p1,10,20}: '+(!!pr&&pr.url.includes('on_conflict=id')&&pr.rows.length===1&&pr.rows[0].id==='p1'&&pr.rows[0].safety===10&&pr.rows[0].max===20));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
