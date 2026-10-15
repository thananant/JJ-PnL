// smoke87: โหมด 🤖 ตั้งอัตราใช้อัตโนมัติ (beta) — เขียน rate_wk/rate_fri/rate_we (เจ้าของเคาะ 15 ต.ค. 2569 เลิก safety/max)
// นับแค่ 17 (จ) กับ 24 ส.ค. (ช่วงเดียว 7 วัน 17–23) ใช้รวม 28 · ยอดขายวันละ 50k ยกเว้น 20 ส.ค. (พฤ) = 100k (รวม 400k)
// -> ถัวตามยอดขาย: วันที่ 20 ได้ 28×(100/400)=7 · วันอื่น 3.5
// จ–พฤ (17,18,19,20) = (3.5×3+7)/4 = 4.375 -> ปัดขึ้น 0.1 = 4.4 · ศ (21) = 3.5 · ส–อา (22,23) = 3.5
// ศ มีแค่ 1 วัน -> "ข้อมูลน้อย" ไม่ติ๊กให้เอง · เขียน = PATCH products?id=eq.p1 (ไม่ใช่ upsert POST)
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
const prods=[{id:'p1',branch_id:SB,name:'หมูสามชั้นก้อน',unit:'โล',sup:'สมาย',safety:12,max:30,rate_wk:4,rate_fri:3,rate_we:5,deleted_at:null}];
const smap=[{id:1,branch:'JJRD',product_id:'p1',product_name:'หมูสามชั้นก้อน',pnl_item:'หมูสามชั้น',stock_unit:'โล',factor:1,active:true}];
const counts=[
 {id:'c1',branch_id:SB,branch_name:'รัชดา',product_id:'p1',count_date:'2026-08-17',qty:30,unit:'โล'},
 {id:'c2',branch_id:SB,branch_name:'รัชดา',product_id:'p1',count_date:'2026-08-24',qty:2,unit:'โล'}];
const inc=[];
for(let d=17;d<24;d++) inc.push({branch:'JJRD',d:'2026-08-'+d,sales_pos_am:d===20?100000:50000,sales_pos_pm:0});
const posts=[], patches=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      if(method==='POST'&&url.includes('products')&&!url.includes('pnl_')){posts.push({url,rows:JSON.parse(opt.body)});return T([]);}
      if(method==='PATCH'&&url.includes('products')){patches.push({url,body:JSON.parse(opt.body),prefer:opt.headers.Prefer});return T([{id:'p1'}]);}
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
  out.push('มีปุ่มโหมด 🤖: '+d.getElementById('view-actual').textContent.includes('ตั้งอัตราใช้อัตโนมัติ'));
  await w.stkViewSet('auto'); await sleep(600);
  const v=d.getElementById('view-actual');
  out.push('เปิดโหมด β มีแถบอธิบาย + ตาราง: '+(v.textContent.includes('ไม่เขียนอะไรจนกว่าจะกดยืนยัน')&&v.textContent.includes('อัตราเดิม → ใหม่')&&v.textContent.includes('จ–พฤ / ศ / ส–อา')));
  out.push('ไม่มีตัวเลือกวัน/ตัวคูณ safety/max/วันหยุดแล้ว: '+(!v.querySelector('select')&&!/safety|max =|วันหยุดพิเศษ/.test(v.textContent)));
  const ck=d.querySelector('.autock');
  out.push('เสนอ จ–พฤ 4.4 (4.375 ปัดขึ้น 0.1) · ศ 3.5 · ส–อา 3.5: '+(ck&&ck.dataset.wk==='4.4'&&ck.dataset.fri==='3.5'&&ck.dataset.we==='3.5'));
  out.push('โชว์อัตราเดิม 4/3/5 → ใหม่: '+(v.textContent.includes('4 → 4.4')&&v.textContent.includes('3 → 3.5')&&v.textContent.includes('5 → 3.5')));
  out.push('ศ มีวันเดียว -> ป้าย "ข้อมูลน้อย" + ไม่ติ๊กให้เอง: '+(v.textContent.includes('ข้อมูลน้อย')&&!ck.checked));
  // เขียน: ติ๊กเอง -> ยืนยันสองชั้น
  ck.checked=true; w.stkAutoCnt();
  out.push('ปุ่มเขียนนับที่ติ๊ก (1): '+d.getElementById('autoGoBtn').textContent.includes('(1)'));
  await w.stkAutoWrite(); await sleep(150);
  out.push('มีโมดัลยืนยันก่อนเขียน (พูดถึงอัตราใช้): '+(d.getElementById('modalBox').textContent.includes('ยืนยันเขียนอัตราใช้')&&d.getElementById('modalBox').textContent.includes('จ–พฤ / ศ / ส–อา')));
  await w.stkAutoWrite2(); await sleep(300);
  const pr=patches[0];
  out.push('เขียนผ่าน PATCH products?id=eq.p1 ค่า {4.4,3.5,3.5} ไม่มี safety/max: '+(patches.length===1&&pr.url.includes('products?id=eq.p1')&&JSON.stringify(pr.body)==='{"rate_wk":4.4,"rate_fri":3.5,"rate_we":3.5}'));
  out.push('ไม่ POST/upsert เข้า products: '+(posts.length===0));
  out.push('toast สำเร็จ: '+d.getElementById('toast').textContent.includes('เขียนอัตราใช้ จ–พฤ/ศ/ส–อา 1 ตัว'));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
