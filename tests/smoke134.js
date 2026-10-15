// smoke134: 🤖β ตั้งอัตราใช้อัตโนมัติ — กันอัตราผิด 4 แบบ (รีวิว 15 ต.ค. 2569)
// นับทุกวัน 3–24 ส.ค. 2569 (นับก่อนเปิดร้าน · บิลวันเดียวกัน = ของเข้าก่อนนับ) → ช่วงละ 1 วัน ใช้จริง = นับวันนั้น + บิลวันถัดไป − นับวันถัดไป
// วัน: จ–พฤ 3,4,5,6,10,11,12,13,17,18,19,20 · ศ 7,14,21 · ส–อา 8,9,15,16,22,23
// ปฏิทิน: พ 12 ส.ค. วันแม่ (ทุกสาขา g=2) = ตัดทิ้ง · 5 ส.ค. เฉพาะ JJLP = ไม่ตัด · 6 ส.ค. ยกเลิก / 4 ส.ค. ไม่มีกลุ่ม = ไม่ตัด → จ–พฤ เหลือ 11 วัน
// hol ผักบุ้ง: ใช้ 10 จ–พฤ · 20 ศ–อา · วันแม่ 20 → จ–พฤ 110/11 = 10 (ก่อนแก้ (110+20)/12 = 10.83 → 11) · ศ 20 · ส–อา 20 → ติ๊กให้เอง
// neg หมูหมัก: ใช้แบบเดียวกัน (วันแม่ 10) แต่ของเข้า พฤ 20 = 70 บิลยังไม่ลง → ช่วง 19→20 = 50+0−110 = −60
//   จ–พฤ (10×10−60)/11 = 3.64 → 3.7 (ก่อนแก้ 50/12 = 4.17 → 4.2 ติ๊กเอง) · ช่วงติดลบ −60 < −max(0.5, 0.25×3.64) → ป้าย "ติดลบ" + ไม่ติ๊ก
// oos หมูสามชั้น: ศ 14–อา 16 ไม่มีของเข้า → นับ ศ 20 · ส 0 (หมด) · อา 0 (หมด) · จ 17 เข้า 30
//   14→15 ปลายหมด (ค่าต่ำกว่าจริง) · 15→16 ต้นหมด+ไม่มีของเข้า = ข้าม · 16→17 ต้นหมด+มีของเข้า ใช้ 0 (ค่าต่ำกว่าจริง)
//   ศ = 7,21 → 20 (2 วัน) · ส–อา = 8,9,22,23 → 20 (4 วัน) (ก่อนแก้ (80+0+0)/6 = 13.33 → 13.5 ติ๊กเอง) · จ–พฤ 10 → "เคยของหมด" ไม่ติ๊ก
// ice น้ำแข็ง: นับได้ 0 ทุกวัน · บิลวันละ 10 → ทุกช่วงต้น/ปลายหมด → ไม่มีช่วงปกติเลย = ใช้ค่าต่ำกว่าจริง "≥10" ทุกกลุ่ม · ไม่ติ๊ก
// noi ไข่ไก่: ใช้วันละ 1 · นับ 18 ส.ค. เกินมา 11.375 (จริง 10) → 17→18 = −0.375 (ไม่ถึง 0.5 = เศษนับ ไม่ติดป้าย) · 18→19 = 2.375 → จ–พฤ 11/11 = 1 → ติ๊ก
// man ผักกาดขาว: ใช้วันละ 5 → 5/5/5 ติ๊กให้เอง → ผู้ใช้เอาออกเอง ต้องไม่เด้งกลับหลังรีเฟรช/เปลี่ยนเผื่อ × และไม่ถูกเขียน
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
const ds=d=>'2026-08-'+String(d).padStart(2,'0');
const wd=d=>new Date(ds(d)+'T00:00:00').getDay();
const base=d=>(wd(d)===5||wd(d)===6||wd(d)===0)?20:10;
const prods=[], smap=[], counts=[], bills=[];
function add(id,name,old){
  prods.push({id,branch_id:SB,name,unit:'โล',sup:'สมาย',safety:0,max:0,deleted_at:null,rate_wk:old[0],rate_fri:old[1],rate_we:old[2]});
  smap.push({id:smap.length+1,branch:'JJRD',product_id:id,product_name:name,pnl_item:name,stock_unit:'โล',factor:1,active:true});
}
const cnt=(id,d,q,oos)=>counts.push({branch_id:SB,branch_name:'รัชดา',product_id:id,count_date:ds(d),qty:q,out_of_stock:!!oos,created_at:ds(d)+'T17:01:00'});
// จำลอง: ของเข้าตอนเช้า (บิลวันนั้น) → นับ → ขาย
function sim(id,name,old,{demand,deliv,init,dropBill,fix}){
  add(id,name,old);
  let st=init, lu=0;
  for(let d=3;d<=24;d++){
    const D=deliv(d,lu); st+=D;
    if(D>0&&d!==dropBill) bills.push({branch:'JJRD',d:ds(d),item:name,unit:'โล',qty:D});
    cnt(id,d,fix&&fix[d]!=null?fix[d]:st,st===0);
    const u=Math.min(st,demand(d)); st-=u; lu=u;
  }
}
sim('hol','ผักบุ้ง',[9,18,18],{demand:d=>d===12?20:base(d),deliv:(d,lu)=>lu,init:50});
sim('neg','หมูหมัก',[4,20,20],{demand:base,deliv:(d,lu)=>d===20?70:lu,init:50,dropBill:20});
sim('oos','หมูสามชั้น',[10,20,16],{demand:base,deliv:(d,lu)=>(d>=14&&d<=16)?0:(d===17?30:lu),init:30});
add('ice','น้ำแข็ง',[8,8,8]); for(let d=3;d<=24;d++){ cnt('ice',d,0,true); if(d>3) bills.push({branch:'JJRD',d:ds(d),item:'น้ำแข็ง',unit:'โล',qty:10}); }
sim('noi','ไข่ไก่',[1,1,1],{demand:()=>1,deliv:(d,lu)=>lu,init:10,fix:{18:11.375}});
sim('man','ผักกาดขาว',[4,4,4],{demand:()=>5,deliv:(d,lu)=>lu,init:20});
const spd=[
  {id:1,name:'วันแม่',day_from:'2026-08-12',day_to:'2026-08-12',order_rate_group:2,order_branches:null,cancelled:false},
  {id:2,name:'งานลาดพร้าว',day_from:'2026-08-05',day_to:'2026-08-05',order_rate_group:2,order_branches:['JJLP'],cancelled:false},
  {id:3,name:'ยกเลิกแล้ว',day_from:'2026-08-06',day_to:'2026-08-06',order_rate_group:2,order_branches:null,cancelled:true},
  {id:4,name:'ไม่มีกลุ่ม',day_from:'2026-08-04',day_to:'2026-08-04',order_rate_group:null,order_branches:null,cancelled:false}];
const patches=[], posts=[], spdUrls=[];
const MODE={spdFail:false,noLastBill:false};
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
      if(url.includes('cal_special_days')){ spdUrls.push(url); return MODE.spdFail?E(404,'{"code":"42P01","message":"relation \\"cal_special_days\\" does not exist"}'):T(spd); }
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'สมาย',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_stock_map'))return T(smap);
      if(url.includes('stock_counts'))return T(counts);
      if(url.includes('pnl_bill_items'))return T(url.includes('select=item&')?[]:bills.filter(b=>!(MODE.noLastBill&&b.d===ds(24))));
      if(url.includes('pnl_income_daily'))return T([]);
      if(url.includes('products')){
        if(method==='POST'){ posts.push(url); return E(403,'denied'); }
        if(method==='PATCH'){ const id=decodeURIComponent((/id=eq\.([^&]+)/.exec(url)||[])[1]||''); patches.push({id,body:JSON.parse(opt.body)}); return T([{id}]); }
        return T(prods);
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
  const ev=x=>{ try{ return w.eval(x); }catch(e){ return 'ERR:'+e.message; } }; // ไฟล์เก่าไม่มีฟังก์ชัน = false ไม่ล้ม
  await sleep(450); await w.eval("show('actual')"); await sleep(800);
  const v=d.getElementById('view-actual');
  const ck=id=>d.querySelector(`.autock[data-pid="${id}"]`);
  const tr=id=>{ const c=ck(id); return c?c.closest('tr'):null; };
  const rates=id=>{ const c=ck(id); return c?[c.dataset.wk,c.dataset.fri,c.dataset.we].join('/'):'(none)'; };
  const btnN=()=>{ const m=/\((\d+)\)/.exec(d.getElementById('autoGoBtn').textContent); return m?+m[1]:-1; };
  // ---------- 12 วันพิเศษ ----------
  const u0=spdUrls[0]||'';
  out.push('อ่าน cal_special_days แบบแอพนับ (cancelled=false · มีกลุ่ม · ช่วงวันที่): '+(u0.includes('cancelled=eq.false')&&u0.includes('order_rate_group=not.is.null')&&u0.includes('day_to=gte.2026-07-31')&&u0.includes('day_from=lte.2026-08-31')));
  out.push('stkSpdHit: แถวเจาะจงสาขาชนะทุกสาขา (g=0 ชนะ g=2): '+(ev(`stkSpdHit([{day_from:'2026-08-12',day_to:'2026-08-12',order_rate_group:2,order_branches:null},{day_from:'2026-08-10',day_to:'2026-08-14',order_rate_group:0,order_branches:['JJRD']}],'JJRD','2026-08-12').g`)===0));
  out.push('stkSpdHit: เท่ากันเอากลุ่มเลขมากกว่า · สาขาอื่น = ไม่โดน: '+(ev(`stkSpdHit([{day_from:'2026-08-12',day_to:'2026-08-12',order_rate_group:1,order_branches:null},{day_from:'2026-08-12',day_to:'2026-08-12',order_rate_group:2,order_branches:[]}],'JJRD','2026-08-12').g`)===2&&ev(`stkSpdHit([{day_from:'2026-08-12',day_to:'2026-08-12',order_rate_group:2,order_branches:['JJLP']}],'JJRD','2026-08-12')`)===null));
  out.push('ตัดเฉพาะวันแม่ 12 ส.ค. (JJLP-only/ยกเลิก/ไม่มีกลุ่ม ไม่ตัด): '+(JSON.stringify(ev('S._auto.spd'))==='["2026-08-12"]'));
  out.push('โชว์ "ตัดวันพิเศษ 1 วัน": '+v.textContent.includes('ตัดวันพิเศษ 1 วัน'));
  out.push('hol จ–พฤ = ของวันปกติ 10 (11 วัน) · ศ 20 · ส–อา 20: '+(rates('hol')==='10/20/20'&&/10\s*· 11 วัน/.test(tr('hol').textContent))+' ('+rates('hol')+')');
  out.push('hol ไม่มีป้าย → ติ๊กให้เอง: '+(ck('hol').checked&&!/ติดลบ|เคยของหมด|ข้อมูลน้อย/.test(tr('hol').textContent)));
  // ---------- 11 ช่วงติดลบ ----------
  out.push('neg จ–พฤ 40/11 = 3.64 → 3.7 · ศ 20 · ส–อา 20: '+(rates('neg')==='3.7/20/20')+' ('+rates('neg')+')');
  const negChip=tr('neg')&&[...tr('neg').querySelectorAll('.chip')].find(c=>c.textContent==='ติดลบ');
  out.push('neg ช่วง 19→20 ใช้จริง −60 (เฉลี่ยกลุ่มยังบวก) → ป้าย "ติดลบ" + ไม่ติ๊ก: '+(!!negChip&&!ck('neg').checked));
  out.push('neg title บอกช่วง+ค่า+บิลยังไม่ลง?: '+(!!negChip&&negChip.title.includes('19 ส.ค. 2569→20 ส.ค. 2569 ใช้จริง -60')&&negChip.title.includes('บิลยังไม่ลง?')));
  out.push('neg โชว์ช่วงติดลบใต้ชื่อ (แตะดูได้บนไอแพด): '+tr('neg').textContent.includes('⚠ 19 ส.ค. 2569→20 ส.ค. 2569 ใช้จริง -60'));
  out.push('noi ติดลบ −0.375 แค่เศษนับ (ไม่เกิน 0.5) → ไม่ติดป้าย · 1/1/1 ติ๊กเอง: '+(rates('noi')==='1/1/1'&&ck('noi').checked&&!tr('noi').textContent.includes('ติดลบ'))+' ('+rates('noi')+')');
  // ---------- 13 ของหมด ----------
  out.push('oos จ–พฤ 10 · ศ 20 (2 วัน) · ส–อา 20 (4 วัน) ไม่ใช่ 13.5: '+(rates('oos')==='10/20/20'&&/20\s*· 2 วัน/.test(tr('oos').textContent)&&/20\s*· 4 วัน/.test(tr('oos').textContent))+' ('+rates('oos')+')');
  out.push('oos ป้าย "เคยของหมด" + ไม่ติ๊ก: '+(tr('oos').textContent.includes('เคยของหมด')&&!ck('oos').checked));
  const xo=ev("S._auto.find(x=>x.r.pr.id==='oos')")||{};
  out.push('oos นับช่วงค่าต่ำกว่าจริง 2 (14→15, 16→17) · ข้าม 1 (15→16): '+(xo.cens===2&&xo.skip===1));
  out.push('ice ไม่มีช่วงปกติเลย → ใช้ค่าต่ำกว่าจริง ≥10 ทุกกลุ่ม · ไม่ติ๊ก: '+(rates('ice')==='10/10/10'&&/≥10\s*· 11 วัน/.test(tr('ice').textContent)&&/≥10\s*· 3 วัน/.test(tr('ice').textContent)&&/≥10\s*· 6 วัน/.test(tr('ice').textContent)&&!ck('ice').checked&&tr('ice').textContent.includes('เคยของหมด')));
  out.push('หมายเหตุท้ายตาราง ข้ามช่วงของหมด (1 ช่วง): '+v.textContent.includes('ข้ามช่วงนั้น (1 ช่วง)'));
  out.push('ติ๊กตั้งต้น 3 ตัว (hol, noi, man) · ปุ่ม (3): '+(['hol','noi','man'].every(id=>ck(id).checked)&&['neg','oos','ice'].every(id=>!ck(id).checked)&&btnN()===3));
  // ---------- 14 ติ๊กเองต้องไม่เด้งกลับ ----------
  ck('man').click(); ck('oos').click(); await sleep(50);
  out.push('เอา man ออก + ติ๊ก oos เอง → จำใน S._autoSel · ปุ่ม (3): '+(ev("S._autoSel['JJRD|man']")===false&&ev("S._autoSel['JJRD|oos']")===true&&btnN()===3));
  const old1=ck('man');
  Object.defineProperty(d,'hidden',{configurable:true,get:()=>false}); // jsdom ตั้งต้น hidden=true → rtApply จะเลื่อนไว้
  out.push('ก่อนรีเฟรช: กล่องติ๊กไม่ได้โฟกัส (แบบ Safari/iPad) → rtBusyForm=false: '+(ev('rtBusyForm()')===false));
  await w.rtApply(); await sleep(600);
  out.push('รีเฟรชอัตโนมัติ (rtApply) วาดตารางใหม่แล้ว: '+(ck('man')!==old1&&!!ck('man')));
  out.push('หลังรีเฟรช man ยังไม่ติ๊ก · oos ยังติ๊ก · ปุ่ม (3): '+(!ck('man').checked&&ck('oos').checked&&btnN()===3));
  const inp=d.getElementById('autoMul'); inp.value='1.2'; inp.dispatchEvent(new w.Event('change')); await sleep(700);
  out.push('เปลี่ยนเผื่อ ×1.2 → hol 12/24/24 · man ยังไม่ติ๊ก · oos ยังติ๊ก: '+(rates('hol')==='12/24/24'&&!ck('man').checked&&ck('oos').checked&&btnN()===3)+' ('+rates('hol')+')');
  const inp2=d.getElementById('autoMul'); inp2.value='1'; inp2.dispatchEvent(new w.Event('change')); await sleep(700);
  await w.stkAutoWrite(); await sleep(100);
  const mb=d.getElementById('modalBox').textContent;
  out.push('โมดัลยืนยันบอกชื่อ + เดิม → ใหม่: '+(d.getElementById('modalWrap').classList.contains('on')&&mb.includes('ของ 3 สินค้า')&&mb.includes('ผักบุ้ง')&&mb.includes('จ–พฤ 9 → 10 · ศ 18 → 20 · ส–อา 18 → 20')&&mb.includes('หมูสามชั้น')&&mb.includes('ส–อา 16 → 20')&&mb.includes('ไข่ไก่')));
  out.push('โมดัลไม่มีตัวที่เอาออก (ผักกาดขาว): '+!mb.includes('ผักกาดขาว'));
  out.push('ก่อนกดยืนยันยังไม่เขียน: '+(patches.length===0));
  await w.stkAutoWrite2(); await sleep(700);
  const ids=patches.map(p=>p.id).sort().join(',');
  out.push('PATCH เฉพาะ hol, noi, oos (man ไม่ถูกเขียน): '+(ids==='hol,noi,oos'&&posts.length===0)+' ('+ids+')');
  out.push('oos body = {rate_wk:10,rate_fri:20,rate_we:20}: '+(JSON.stringify((patches.find(p=>p.id==='oos')||{}).body)==='{"rate_wk":10,"rate_fri":20,"rate_we":20}'));
  out.push('เขียนสำเร็จ → ล้างที่ติ๊กเองของตัวที่เขียน (oos กลับเป็นไม่ติ๊ก) · man ที่เอาออกยังจำ: '+(ev("'JJRD|oos' in S._autoSel")===false&&ev("S._autoSel['JJRD|man']")===false&&!ck('oos').checked&&!ck('man').checked));
  // เปลี่ยนเดือน / สาขา = ล้าง
  w.eval("S.m='2026-09'"); await w.eval("show('actual')"); await sleep(600);
  w.eval("S.m='2026-08'"); await w.eval("show('actual')"); await sleep(700);
  out.push('เปลี่ยนเดือนแล้วกลับ → ล้าง man กลับติ๊กตามค่าตั้งต้น: '+(!!ck('man')&&ck('man').checked&&JSON.stringify(ev('S._autoSel'))==='{}'));
  ck('man').click(); await sleep(50);
  w.eval("S.br='JJLP'"); await w.eval("show('actual')"); await sleep(600);
  w.eval("S.br='JJRD'"); await w.eval("show('actual')"); await sleep(700);
  out.push('เปลี่ยนสาขาแล้วกลับ → ล้าง: '+(!!ck('man')&&ck('man').checked));
  // บิลวันนับล่าสุดยังไม่ลง → ป้ายเตือนขึ้นในโหมด 🤖 ด้วย
  MODE.noLastBill=true; await w.eval("show('actual')"); await sleep(700);
  out.push('บิลวันนับล่าสุด (24 ส.ค.) ยังไม่ลง → ป้าย ⏳ ขึ้นในโหมด 🤖: '+d.getElementById('view-actual').textContent.includes('บิลวันที่ 24 ส.ค. 2569 ยังไม่ถูกลงในระบบ'));
  MODE.noLastBill=false;
  // ปฏิทินอ่านไม่ได้ = ไม่มีวันพิเศษ (เลขแบบเดิม)
  MODE.spdFail=true; await w.eval("show('actual')"); await sleep(700);
  out.push('อ่านปฏิทินไม่ได้ → ไม่ตัดวันไหน · hol จ–พฤ 11 · หน้ายังขึ้น: '+(rates('hol')==='11/20/20'&&!d.getElementById('view-actual').textContent.includes('ตัดวันพิเศษ'))+' ('+rates('hol')+')');
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
