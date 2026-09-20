// smoke105: P&L · "สลิปเดียว จ่ายหลายบิล" จากหน้าใบสำคัญจ่าย (PV)
//   บั๊กที่เจอ: แนบสลิปจาก PV แล้วกล่องไม่มีบิลให้ติ๊กเลย (ติ๊กจ่าย 0 บิล · ฿0.00)
//   เหตุ: ดึงบิลจากแคช "เดือนที่เปิดอยู่" เท่านั้น + กรองเฉพาะบิลที่ยังไม่ติ๊กจ่าย
//   ใหม่: PV ดึงบิลตามช่วงวันที่ตรงจากฐาน (คนละเดือนก็เจอ) + รวมบิลที่ติ๊กจ่ายแล้วด้วย
// fixture: เปิดเดือน ต.ค. 2569 อยู่ · PV งวด 1–15 ก.ย. 2569 ของ Yannah Beef (id 9)
//   9 ก.ย. 40,000 ยังไม่ติ๊กจ่าย · 11 ก.ย. 60,000 ติ๊กจ่ายแล้วแต่ไม่มีสลิป · 14 ก.ย. 40,351 ติ๊กจ่าย+มีสลิปแล้ว
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),json_to_sheet:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{}};
window.Tesseract={recognize:async()=>({data:{text:''}})};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const SEP=[
  {branch:'JJRD',d:'2026-09-09',supplier_id:9,amount:40000,paid:false,slip_url:null},
  {branch:'JJRD',d:'2026-09-11',supplier_id:9,amount:60000,paid:true, slip_url:null},
  {branch:'JJRD',d:'2026-09-14',supplier_id:9,amount:40351,paid:true, slip_url:'https://x/old.jpg'},
  {branch:'JJRD',d:'2026-09-20',supplier_id:9,amount:5000, paid:false,slip_url:null}];  // นอกงวด (16–30) ต้องไม่ติดมา
const saves=[],gets=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD'));
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-10'));   // เปิดเดือน ต.ค. อยู่ (คนละเดือนกับงวด PV)
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null},json:async()=>v});
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      if(method==='POST'&&url.includes('/storage/'))return T({Key:'x'});
      if(method==='POST'&&url.includes('pnl_expense_daily')){saves.push(JSON.parse(opt.body));return T([]);}
      if(method==='PATCH')return T([]);
      if(url.includes('pnl_suppliers'))return T([{id:9,name:'Yannah Beef',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT',bank:'KBANK',account_no:'111',account_name:'Yannah'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(method==='GET'&&url.includes('pnl_expense_daily')){
        gets.push(url);
        const m=url.match(/d=gte\.([0-9-]+)&d=lte\.([0-9-]+)/);
        let rows=SEP.filter(r=>!m||(r.d>=m[1]&&r.d<=m[2]));
        if(url.includes('supplier_id=eq.'))rows=rows.filter(r=>String(r.supplier_id)===url.match(/supplier_id=eq\.(\d+)/)[1]);
        return T(rows.map(r=>({...r})));
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
  await sleep(500);
  d.getElementById('slipFile').click=()=>{};
  const blob=new w.Blob(['x'],{type:'image/jpeg'});
  // แนบสลิปจากหน้า PV: งวด 1–15 ก.ย. ทั้งที่เปิดเดือน ต.ค. อยู่
  w.pvSlipPick(9,'2026-09-01','2026-09-15',77);
  await w.slipPicked({files:[blob],value:''}); await sleep(200);
  const box=d.getElementById('modalBox');
  const rows=[...d.querySelectorAll('[data-abd]')];
  out.push('เปิดกล่อง "สลิปเดียว จ่ายหลายบิล" พร้อมชื่อซัพ + งวด: '
    +(box.textContent.includes('สลิปเดียว จ่ายหลายบิล')&&box.textContent.includes('Yannah Beef')
      &&box.textContent.includes('1 ก.ย. 2569')&&box.textContent.includes('15 ก.ย. 2569')));
  out.push('มีบิลให้ติ๊กครบ 3 บิลของงวดนี้ (ไม่เอาบิล 20 ก.ย. ที่อยู่นอกงวด): '
    +(rows.length===3&&rows.map(x=>x.dataset.abd).join()==='2026-09-09,2026-09-11,2026-09-14'));
  out.push('ดึงบิลจากฐานตามช่วงวันที่จริง ไม่อิงเดือนที่เปิดอยู่ (ต.ค.): '
    +gets.some(u=>u.includes('supplier_id=eq.9')&&u.includes('d=gte.2026-09-01')&&u.includes('d=lte.2026-09-15')));
  out.push('บิลที่ติ๊กจ่ายไปแล้ว/มีสลิปแล้ว ก็ยังขึ้นให้เห็น + ติดป้ายบอก: '
    +(box.textContent.includes('✓ จ่ายแล้ว')&&box.textContent.includes('📎 มีสลิปแล้ว')));
  out.push('ติ๊กมาให้เฉพาะบิลที่ยังไม่มีสลิป (2 บิล) ไม่ทับสลิปเดิม: '
    +(rows.filter(x=>x.checked).map(x=>x.dataset.abd).join()==='2026-09-09,2026-09-11'
      &&d.getElementById('asBtn').textContent==='ติ๊กจ่าย 2 บิล'));
  out.push('ยอดรวมของบิลที่ติ๊ก = 40,000 + 60,000 = ฿100,000.00: '
    +(d.getElementById('asTot').textContent==='฿100,000.00'));
  // เลือกทั้งหมด → 3 บิล
  w.assignAll(true); await sleep(30);
  out.push('กด "เลือกทั้งหมด" ได้ครบ 3 บิล · ยอดรวม ฿140,351.00: '
    +(d.getElementById('asBtn').textContent==='ติ๊กจ่าย 3 บิล'&&d.getElementById('asTot').textContent==='฿140,351.00'));
  w.assignAll(false); await sleep(20);
  out.push('กด "ล้าง" แล้วปุ่มยืนยันถูกปิด (กันบันทึกศูนย์บิล): '
    +(d.getElementById('asBtn').disabled===true&&d.getElementById('asTot').textContent==='฿0.00'));
  // ติ๊ก 2 บิลแล้วยืนยัน
  w.assignTick({checked:true,dataset:{abd:'2026-09-09'}});
  w.assignTick({checked:true,dataset:{abd:'2026-09-11'}});
  await w.assignConfirm(); await sleep(150);
  const rowsSaved=[].concat.apply([],saves);
  out.push('ยืนยันแล้วบันทึก 2 บิล พร้อม paid=true + สลิปเดียวกัน: '
    +(rowsSaved.length===2&&rowsSaved.every(r=>r.paid===true&&r.slip_url&&r.supplier_id===9&&r.branch==='JJRD')
      &&rowsSaved.map(r=>r.d).sort().join()==='2026-09-09,2026-09-11'));
  out.push('ปิดกล่องหลังบันทึก: '+(!d.getElementById('modalWrap').classList.contains('on')||!d.getElementById('modalBox').textContent.includes('ติ๊กบิลที่สลิป')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},300);
