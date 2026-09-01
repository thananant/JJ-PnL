// smoke72: อัปเดตสดหลายเครื่อง — Realtime subscribe 7 ตาราง · เหตุการณ์เข้ามา:
//   หน้าดูอย่างเดียว (usage) ว่างมือ = รีเฟรชเอง · กำลังพิมพ์ = แถบ "แตะเพื่อโหลดใหม่" ไม่ทับฟอร์ม · หน้ากรอก (income) = แถบเสมอ
//   หน้าบันทึกบิล: ลิสต์รีเฟรช + เตือนถ้าบิลที่เปิดโดนแก้ · dtSave เช็คสด: ถามก่อนทับ + ยอดวันรวมนับบิลที่เครื่องอื่นเพิ่งลง
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
window.__rtH=[]; window.__rtStatus=null;
window.supabase={createClient:(u,k)=>{window.__sbUrl=u;return {channel:(n)=>{const ch={on:(ev,flt,h)=>{window.__rtH.push({flt,h});return ch;},subscribe:(cb)=>{window.__rtSub=cb;cb&&cb('SUBSCRIBED');return ch;}};return ch;}};}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const ds='2026-08-24';
const posts=[], dels=[];
let dayRows=[{branch:'JJRD',d:ds,supplier_id:1,item:'ข้าว',unit:'ถุง',qty:8,price:100,discount:0,bill_discount:0,ship_fee:0,other_fee:0,sort:0,bill_no:1,vat_mode:'none'}];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD')); w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); w.localStorage.setItem('jjpnl_user',JSON.stringify('แพท'));
    w.localStorage.setItem('jj_usemode2',JSON.stringify('item'));
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null}});
      const method=opt&&opt.method||'GET';
      if(method==='DELETE'){dels.push(url.split('rest/v1/')[1]);return T([]);}
      if(method==='POST'&&url.includes('pnl_bill_items')){posts.push({items:JSON.parse(opt.body)});return T([]);}
      if(method==='POST'&&url.includes('pnl_expense_daily')){posts.push({exp:JSON.parse(opt.body)});return T([]);}
      if(method==='POST')return T([]);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'โรงสีข้าว',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('order=d.desc'))return T([]);
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=eq.'+ds))return T(JSON.parse(JSON.stringify(dayRows)));
      if(method==='GET'&&url.includes('pnl_bill_items')&&url.includes('d=gte.2026-08'))return T(JSON.parse(JSON.stringify(dayRows)));
      if(method==='GET'&&url.includes('pnl_bill_items'))return T([]);
      return T([]);
    };
    // jsdom ตั้ง document.hidden=true (prerender) — บังคับเป็น visible ให้เหมือนแท็บเปิดอยู่จริง
    const _doc=w.document; try{ Object.defineProperty(_doc,'hidden',{get:()=>false}); Object.defineProperty(_doc,'visibilityState',{get:()=>'visible'}); }catch(e){}
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
    w.requestAnimationFrame=f=>setTimeout(f,0);
    w.HTMLCanvasElement.prototype.getContext=()=>({});
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fire=()=>w.__rtH[0].h({eventType:'UPDATE'}); // ยิงเหตุการณ์เหมือนมีเครื่องอื่นแก้ข้อมูล
setTimeout(async()=>{
  const out=[];
  await sleep(500);
  out.push('subscribe ครบ 7 ตาราง + สถานะ live: '+(w.__rtH.length===7&&w.__rtH.some(x=>x.flt.table==='pnl_bill_items')&&w.eval('_rtLive===true')&&w.__sbUrl.includes('supabase.co')));
  // 1) หน้าดูอย่างเดียว (usage) ว่างมือ -> เหตุการณ์เข้า = รีเฟรชเอง
  await w.eval("show('usage')"); await sleep(300);
  w.eval("const _ou=RENDER.usage; RENDER.usage=async el=>{window.__usageN=(window.__usageN||0)+1; return _ou(el);}");
  fire(); await sleep(1600);
  out.push('usage ว่างมือ: รีเฟรชเอง (RENDER.usage ถูกเรียกซ้ำ) + แคชล้าง: '+((w.__usageN||0)>=1&&!d.getElementById('rtBar')?.style.display?.includes('block')));
  // 2) กำลังพิมพ์ในช่องค้นหา -> ไม่ทับ ขึ้นแถบแทน
  d.getElementById('useQ').focus();
  const n0=w.__usageN||0;
  fire(); await sleep(1600);
  const bar=d.getElementById('rtBar');
  out.push('พิมพ์อยู่: ไม่รีเฟรช + แถบโชว์: '+((w.__usageN||0)===n0&&!!bar&&bar.style.display==='block'));
  // เบลอช่อง -> จัดการต่อให้เอง (focusout)
  d.getElementById('useQ').blur(); await sleep(700);
  out.push('เบลอแล้วรีเฟรชต่อให้เอง: '+((w.__usageN||0)===n0+1));
  // 3) หน้ากรอก (income): แถบเสมอ ไม่รีเฟรชทับ
  await w.eval("show('income')"); await sleep(300);
  out.push('เปลี่ยนหน้า = แถบหายก่อน: '+(d.getElementById('rtBar').style.display==='none'));
  fire(); await sleep(1600);
  out.push('หน้ารายรับ: ขึ้นแถบ ไม่ auto: '+(d.getElementById('rtBar').style.display==='block'&&w.eval("S.tab==='income'")));
  // 4) หน้าบันทึกบิล: เครื่องอื่นแก้บิลที่เปิดอยู่ -> เตือน (ลิสต์รีเฟรชเงียบ ๆ)
  await w.eval("show('detail')"); await sleep(250);
  w.eval("S.dtDate='"+ds+"'"); await w.dtPickSup(1); await sleep(300);
  dayRows[0].qty=12; // เครื่องอื่นแก้ ข้าว 8 -> 12
  fire(); await sleep(1900);
  out.push('เตือนบิลโดนแก้จากเครื่องอื่น: '+(!!d.getElementById('dtStaleWarn')&&d.getElementById('dtStaleWarn').textContent.includes('ถูกแก้จากเครื่องอื่น')));
  out.push('ฟอร์มไม่โดนทับ (ยังเป็นค่าที่เปิดไว้ qty 8): '+w.eval("S.dtLines[0].qty===8"));
  // แตะคำเตือน = โหลดของล่าสุด
  d.getElementById('dtStaleWarn').click(); await sleep(300);
  out.push('แตะเตือน → โหลดของล่าสุด qty 12 + เตือนหาย: '+(w.eval("S.dtLines[0].qty===12")&&!d.getElementById('dtStaleWarn')));
  // 5) dtSave กันชนกัน: เครื่องอื่นแก้อีกหลังเราเปิด -> Cancel = ไม่บันทึก + โหลดใหม่
  dayRows[0].qty=15;
  w.confirm=()=>false; posts.length=0; dels.length=0;
  w.dtEdit(0,'qty','9');
  await w.dtSave(); await sleep(350);
  out.push('Cancel: ไม่ delete/insert + โหลดของล่าสุด qty 15: '+(dels.length===0&&!posts.find(p=>p.items)&&w.eval("S.dtLines[0].qty===15")));
  // 6) OK = ทับได้ + ยอดวันรวมนับบิลที่เครื่องอื่นเพิ่งลง (บิล 2 โผล่จากเครื่องอื่น 300 บาท)
  dayRows.push({branch:'JJRD',d:ds,supplier_id:1,item:'น้ำแข็ง',unit:'ถุง',qty:20,price:15,discount:0,bill_discount:0,ship_fee:0,other_fee:0,sort:0,bill_no:2,vat_mode:'none'});
  w.confirm=()=>true; posts.length=0; dels.length=0;
  w.dtEdit(0,'qty','10'); // บิล 1 ของเรา = 10×100 = 1,000
  await w.dtSave(); await sleep(350);
  const ex=posts.find(p=>p.exp);
  out.push('OK: บันทึกบิล 1 + ยอดวัน 1,000+300 = 1,300 (นับบิลใหม่ของเครื่องอื่น): '+(!!posts.find(p=>p.items)&&!!ex&&Math.abs(ex.exp[0].amount-1300)<0.01));
  // 7) โพลสำรอง: ถ้า realtime ไม่ live -> tick รีเฟรชหน้าอ่านอย่างเดียวเงียบ ๆ
  await w.eval("show('usage')"); await sleep(300);
  const n2=w.__usageN||0;
  w.eval('_rtLive=false'); w.rtTick(); await sleep(400);
  out.push('โพลสำรอง (ยังไม่เปิด realtime): รีเฟรช usage เอง: '+((w.__usageN||0)===n2+1));
  w.eval('_rtLive=true'); const n3=w.__usageN||0; w.rtTick(); await sleep(300);
  out.push('realtime live อยู่: โพลไม่ทำงานซ้ำซ้อน: '+((w.__usageN||0)===n3));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},350);
