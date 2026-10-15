// smoke129: 🤖β ตั้งอัตราใช้อัตโนมัติ — เขียน rate_wk (จ–พฤ) / rate_fri (ศ) / rate_we (ส–อา) แทน safety/max (เจ้าของเคาะ 15 ต.ค. 2569)
// ปฏิทิน ส.ค. 2569: 3,10,17 = จันทร์ · 7,14 = ศุกร์ · 8–9, 15–16 = ส–อา
// ยอดขาย JJRD: จ–พฤ วันละ 50,000 · ศ/ส/อา วันละ 100,000 → ต่อสัปดาห์ 500,000
// p1 หมูสามชั้นก้อน: นับ 3 ส.ค.=100 · 10 ส.ค.=53 · 17 ส.ค.=3 · บิลหมูสามชั้น 12 ส.ค. 50 โล
//   ช่วง 1 (3→10) ใช้ 47 → จ–พฤ วันละ 47×0.1=4.7 · ศ/ส/อา วันละ 9.4
//   ช่วง 2 (10→17) ใช้ 53+50−3=100 → จ–พฤ วันละ 10 · ศ/ส/อา วันละ 20
//   จ–พฤ = (4.7×4+10×4)/8 = 7.35 → 7.4 · ศ = (9.4+20)/2 = 14.7 → 15 (ปัด 0.5) · ส–อา = (9.4×2+20×2)/4 = 14.7 → 15
//   จำนวนวัน 8 / 2 / 4 → ติ๊กให้เอง
//   เผื่อ ×1.2: 8.82→8.9 · 17.64→18 · 17.64→18 · เผื่อ ×4: 29.4→29.5 · 58.8→59 (เกิน 50 = จำนวนเต็ม) · 58.8→59
// p2 ผักกาดขาว: นับ 10 ส.ค.=20 · 13 ส.ค.=8 → ใช้ 12 ช่วง จ–พ (10,11,12) วันละ 4 → จ–พฤ = 4 · ศ/ส–อา ไม่มีข้อมูล = คงค่าเดิม (ไม่ส่งช่องนั้น)
//   → "ข้อมูลน้อย" ไม่ติ๊ก · ติ๊กเองแล้วเขียน body = {rate_wk:4} เท่านั้น
// p3 น้ำแข็ง: นับครั้งเดียว → ไม่มีข้อมูลใช้จริง ไม่มีช่องติ๊ก
// p4 หมูหมัก: นับ 3 ส.ค.=30 · 10=16 · 17=2 → ใช้ 14 ทั้งสองช่วง → จ–พฤ 1.4 · ศ 2.8 · ส–อา 2.8 · PATCH ของ p4 ตอบ 403 permission denied
// p5 ไข่ไก่: นับ 10 ส.ค.=5 · 17 ส.ค.=10 ไม่มีบิล → ใช้ −5 (ติดลบ) → ป้าย "ติดลบ" ไม่ติ๊ก · อัตราปัดเป็น 0
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
const P0={branch_id:SB,sup:'สมาย',safety:12,max:30,deleted_at:null};
const prods=[
  {...P0,id:'p1',name:'หมูสามชั้นก้อน',unit:'โล',rate_wk:6,rate_fri:15,rate_we:12},
  {...P0,id:'p2',name:'ผักกาดขาว',unit:'หัว',rate_wk:3,rate_fri:6,rate_we:9},
  {...P0,id:'p3',name:'น้ำแข็ง',unit:'ถุง',rate_wk:1,rate_fri:1,rate_we:1},
  {...P0,id:'p4',name:'หมูหมัก',unit:'โล',rate_wk:null,rate_fri:null,rate_we:null},
  {...P0,id:'p5',name:'ไข่ไก่',unit:'แผง',rate_wk:2,rate_fri:2,rate_we:2}];
const smap=[
  {id:1,branch:'JJRD',product_id:'p1',product_name:'หมูสามชั้นก้อน',pnl_item:'หมูสามชั้น',stock_unit:'โล',factor:1,active:true},
  {id:2,branch:'JJRD',product_id:'p2',product_name:'ผักกาดขาว',pnl_item:'ผักกาดขาว',stock_unit:'หัว',factor:1,active:true},
  {id:3,branch:'JJRD',product_id:'p3',product_name:'น้ำแข็ง',pnl_item:'น้ำแข็ง',stock_unit:'ถุง',factor:1,active:true},
  {id:4,branch:'JJRD',product_id:'p4',product_name:'หมูหมัก',pnl_item:'หมูหมัก',stock_unit:'โล',factor:1,active:true},
  {id:5,branch:'JJRD',product_id:'p5',product_name:'ไข่ไก่',pnl_item:'ไข่ไก่',stock_unit:'แผง',factor:1,active:true}];
const C=(pid,d,qty)=>({branch_id:SB,branch_name:'รัชดา',product_id:pid,count_date:'2026-08-'+d,qty,out_of_stock:false,created_at:'2026-08-'+d+'T08:00:00'});
const counts=[C('p1','03',100),C('p1','10',53),C('p1','17',3),C('p2','10',20),C('p2','13',8),C('p3','17',40),C('p4','03',30),C('p4','10',16),C('p4','17',2),C('p5','10',5),C('p5','17',10)];
const bills=[{branch:'JJRD',d:'2026-08-12',item:'หมูสามชั้น',unit:'โล',qty:50}];
const inc=[];
for(let d=1;d<=31;d++){ const ds='2026-08-'+String(d).padStart(2,'0'); const wd=new Date(ds+'T00:00:00').getDay();
  inc.push({branch:'JJRD',d:ds,sales_pos_am:(wd===5||wd===6||wd===0)?100000:50000,sales_pos_pm:0}); }
const posts=[], patches=[], gets=[];
const MODE={noRateCol:false,delay:0,empty:false};
let inflight=0, maxInflight=0;
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08'));
    w.localStorage.setItem('jj_stkview',JSON.stringify('auto'));
    w.confirm=()=>true;
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null},json:async()=>v});
      const E=(st,msg)=>({ok:false,status:st,text:async()=>msg,json:async()=>({})});
      if(url.includes('pnl_users'))return E(404,'nf');
      if(url.includes('pnl_activity_log'))return T([]);
      if(url.includes('pnl_unit_conv'))return T([]);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'สมาย',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_stock_map'))return T(smap);
      if(url.includes('stock_counts'))return T(counts);
      if(url.includes('pnl_bill_items'))return T(url.includes('select=item&')?[]:bills);
      if(url.includes('pnl_income_daily'))return T(inc);
      if(url.includes('products')){
        if(method==='POST'){ posts.push({url}); return E(403,'{"code":"42501","message":"permission denied for table products"}'); }
        if(method==='PATCH'){
          const id=decodeURIComponent((/id=eq\.([^&]+)/.exec(url)||[])[1]||'');
          patches.push({url,id,body:JSON.parse(opt.body),prefer:opt.headers.Prefer});
          inflight++; maxInflight=Math.max(maxInflight,inflight);
          if(MODE.delay) await new Promise(r=>setTimeout(r,MODE.delay));
          inflight--;
          if(id==='p4') return E(403,'{"code":"42501","message":"permission denied for table products"}');
          if(MODE.empty) return T([]);
          return T([{id}]);
        }
        gets.push(url);
        if(MODE.noRateCol&&url.includes('rate_wk')) return E(400,'{"code":"42703","message":"column products.rate_wk does not exist"}');
        return T(MODE.noRateCol?prods.map(({rate_wk,rate_fri,rate_we,...x})=>x):prods);
      }
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
  // --- ฟังก์ชันปัดอัตรา (คำนวณมือ) ---
  const R=w.stkRateRound;
  const cases=[[0.3,0.3],[0.31,0.4],[0.7,0.7],[1.1,1.1],[2.2,2.2],[4.375,4.4],[7.35,7.4],[9.91,10],[9.96,10],[10,10],[10.1,10.5],[12.5,12.5],[12.51,13],[14.7,15],[49.6,50],[50,50],[50.01,51],[58.8,59],[73.2,74],[0,0],[-2,0],[NaN,0]];
  const badR=cases.filter(([v,e])=>R(v)!==e).map(([v,e])=>v+'→'+R(v)+' (ควร '+e+')');
  out.push('stkRateRound <10 ทีละ 0.1 · 10–50 ทีละ 0.5 · >50 จำนวนเต็ม · ≤0 = 0: '+(badR.length===0)+(badR.length?' '+badR.join(', '):''));
  await sleep(450); await w.eval("show('actual')"); await sleep(800);
  const v=d.getElementById('view-actual');
  out.push('stkLoad ขอ rate_wk,rate_fri,rate_we: '+gets.some(u=>u.includes('rate_wk,rate_fri,rate_we')));
  out.push('หัวข้อ "ตั้งอัตราใช้อัตโนมัติ (beta)": '+v.textContent.includes('ตั้งอัตราใช้อัตโนมัติ (beta)'));
  const ck=id=>d.querySelector(`.autock[data-pid="${id}"]`);
  const k1=ck('p1'), k2=ck('p2'), k4=ck('p4');
  out.push('p1 จ–พฤ 7.4 · ศ 15 · ส–อา 15: '+(k1&&k1.dataset.wk==='7.4'&&k1.dataset.fri==='15'&&k1.dataset.we==='15'));
  const tr1=k1&&k1.closest('tr');
  out.push('p1 ใช้จริง/วัน 7.35 (8 วัน) · 14.7 (2 วัน) · 14.7 (4 วัน): '+(!!tr1&&/7\.35\s*· 8 วัน/.test(tr1.textContent)&&/14\.7\s*· 2 วัน/.test(tr1.textContent)&&/14\.7\s*· 4 วัน/.test(tr1.textContent)));
  out.push('p1 อัตราเดิม→ใหม่ 6→7.4 · 15→15 · 12→15: '+(!!tr1&&tr1.textContent.includes('6 → 7.4')&&tr1.textContent.includes('15 → 15')&&tr1.textContent.includes('12 → 15')));
  out.push('p1 ข้อมูลครบทุกกลุ่ม ≥2 วัน -> ติ๊กให้เอง: '+(!!k1&&k1.checked&&!tr1.textContent.includes('ข้อมูลน้อย')));
  out.push('p2 จ–พฤ 4 · ศ/ส–อา ว่าง (คงเดิม): '+(k2&&k2.dataset.wk==='4'&&k2.dataset.fri===''&&k2.dataset.we===''));
  const tr2=k2&&k2.closest('tr');
  out.push('p2 แสดง "6 (คงเดิม)" "9 (คงเดิม)" + ข้อมูลน้อย + ไม่ติ๊ก: '+(!!tr2&&tr2.textContent.includes('6 (คงเดิม)')&&tr2.textContent.includes('9 (คงเดิม)')&&tr2.textContent.includes('ข้อมูลน้อย')&&!k2.checked));
  const tr3=[...v.querySelectorAll('tr')].find(t=>t.textContent.includes('น้ำแข็ง'));
  out.push('p3 นับครั้งเดียว -> ยังไม่มีข้อมูล ไม่มีช่องติ๊ก: '+(!!tr3&&tr3.textContent.includes('ยังไม่มีข้อมูลใช้จริง')&&!ck('p3')));
  out.push('p4 1.4 · 2.8 · 2.8 อัตราเดิมว่าง "–": '+(k4&&k4.dataset.wk==='1.4'&&k4.dataset.fri==='2.8'&&k4.dataset.we==='2.8'&&k4.closest('tr').textContent.includes('– → 1.4')));
  const k5=ck('p5');
  out.push('p5 ใช้จริงติดลบ -> ป้าย "ติดลบ" + ไม่ติ๊ก + อัตรา 0: '+(!!k5&&!k5.checked&&k5.closest('tr').textContent.includes('ติดลบ')&&k5.dataset.wk==='0'&&k5.dataset.we==='0'));
  out.push('ปุ่มเขียนนับที่ติ๊กตั้งต้น (2): '+d.getElementById('autoGoBtn').textContent.includes('(2)'));
  // --- เผื่อ × ---
  w.eval('S.autoMul=1.2'); await w.eval("show('actual')"); await sleep(700);
  let a1=ck('p1');
  out.push('เผื่อ ×1.2 → p1 8.9 · 18 · 18: '+(a1&&a1.dataset.wk==='8.9'&&a1.dataset.fri==='18'&&a1.dataset.we==='18'));
  w.eval('S.autoMul=4'); await w.eval("show('actual')"); await sleep(700);
  a1=ck('p1');
  out.push('เผื่อ ×4 → p1 29.5 · 59 · 59 (เกิน 50 จำนวนเต็ม): '+(a1&&a1.dataset.wk==='29.5'&&a1.dataset.fri==='59'&&a1.dataset.we==='59'));
  out.push('ช่องเผื่อโชว์ค่า 4: '+(d.getElementById('autoMul')&&d.getElementById('autoMul').value==='4'));
  const inp=d.getElementById('autoMul'); inp.value='abc'; inp.dispatchEvent(new w.Event('change')); await sleep(700);
  a1=ck('p1');
  out.push('ใส่เผื่อผิด -> กลับเป็น ×1 (7.4/15/15): '+(w.eval('S.autoMul')===1&&a1&&a1.dataset.wk==='7.4'&&a1.dataset.fri==='15'));
  // --- เขียน: p1 (ติ๊กเอง) + p2 (ติ๊กเพิ่ม) + p4 (สิทธิ์ไม่ผ่าน) ---
  ck('p2').checked=true; w.stkAutoCnt();
  out.push('ติ๊ก p2 เพิ่ม -> ปุ่ม (3): '+d.getElementById('autoGoBtn').textContent.includes('(3)'));
  await w.stkAutoWrite(); await sleep(100);
  const mb=d.getElementById('modalBox').textContent;
  out.push('โมดัลยืนยัน 3 สินค้า พูดถึงอัตราใช้ ไม่มี safety: '+(d.getElementById('modalWrap').classList.contains('on')&&mb.includes('อัตราใช้ต่อวัน จ–พฤ / ศ / ส–อา ของ 3 สินค้า')&&!mb.includes('safety')));
  out.push('ก่อนกดยืนยันยังไม่เขียน: '+(patches.length===0));
  const st0=w.eval('S._stk');
  await w.stkAutoWrite2(); await sleep(300);
  const byId=id=>patches.find(p=>p.id===id);
  out.push('PATCH 3 ครั้ง ไม่มี POST/upsert: '+(patches.length===3&&posts.length===0));
  out.push('p1 body = {rate_wk:7.4,rate_fri:15,rate_we:15}: '+(!!byId('p1')&&JSON.stringify(byId('p1').body)==='{"rate_wk":7.4,"rate_fri":15,"rate_we":15}'));
  out.push('p2 body = {rate_wk:4} เท่านั้น (ศ/ส–อา ไม่มีข้อมูล = ไม่ส่ง): '+(!!byId('p2')&&JSON.stringify(byId('p2').body)==='{"rate_wk":4}'));
  out.push('URL เป็น products?id=eq.<id> (PATCH ทีละตัว): '+patches.every(p=>/products\?id=eq\.p[124](&|$)/.test(p.url)));
  const sp=id=>st0.prods.find(x=>x.id===id);
  out.push('อัปเดตในหน่วยความจำ p1/p2 (p2 ศ/ส–อา คงเดิม 6/9) · p4 ที่ล้มไม่แตะ: '+(sp('p1').rate_wk===7.4&&sp('p1').rate_fri===15&&sp('p1').rate_we===15&&sp('p2').rate_wk===4&&sp('p2').rate_fri===6&&sp('p2').rate_we===9&&sp('p4').rate_wk==null));
  const t1=d.getElementById('toast').textContent;
  out.push('toast สรุป สำเร็จ 2 · ไม่สำเร็จ 1 + บอกต้อง grant update on products: '+(t1.includes('เขียนสำเร็จ 2 ตัว')&&t1.includes('ไม่สำเร็จ 1 ตัว')&&t1.includes('grant update on products')));
  // --- PATCH ได้ 0 แถว (RLS ไม่ให้แก้) = ล้ม → ข้อความสิทธิ์ ---
  await sleep(500);
  MODE.empty=true; patches.length=0;
  w.eval("S._autoRows=[{id:'p1',body:{rate_wk:1}}]"); await w.stkAutoWrite2(); await sleep(300);
  const t2=d.getElementById('toast').textContent;
  out.push('PATCH ได้ 0 แถว -> นับเป็นล้ม + ข้อความ grant update on products: '+(patches.length===1&&t2.includes('ยังไม่มีสิทธิ์เขียนอัตราใช้')&&t2.includes('grant update on products')&&!t2.includes('✅')));
  MODE.empty=false;
  // --- จำกัดพร้อมกัน 6 ---
  await sleep(500);
  MODE.delay=25; patches.length=0; inflight=0; maxInflight=0;
  w.eval("S._autoRows=Array.from({length:14},(_,i)=>({id:'x'+i,body:{rate_wk:i+1}}))");
  await w.stkAutoWrite2(); await sleep(300);
  out.push('14 ตัว ส่งครบ 14 · พร้อมกันสูงสุด 6: '+(patches.length===14&&maxInflight===6)+' (max='+maxInflight+')');
  out.push('toast สำเร็จ 14 ตัว: '+d.getElementById('toast').textContent.includes('เขียนอัตราใช้ จ–พฤ/ศ/ส–อา 14 ตัว'));
  MODE.delay=0;
  // --- ไม่มีคอลัมน์ rate_* -> select สำรองแบบเดิม หน้ายังขึ้น ---
  await sleep(500);
  MODE.noRateCol=true; gets.length=0; await w.eval("show('actual')"); await sleep(800);
  const v2=d.getElementById('view-actual');
  out.push('select rate_* ล้ม -> ถอยไป select เดิม + หน้ายังขึ้น + เตือนอ่านอัตราเดิมไม่ได้: '+(gets.some(u=>u.includes('rate_wk'))&&gets.some(u=>!u.includes('rate_wk')&&u.includes('safety,max'))&&!!ck('p1')&&v2.textContent.includes('อ่านอัตราเดิม')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
