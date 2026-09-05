// smoke93: สาขา "ส่วนกลาง" (ออฟฟิศ is_central) — มีเฉพาะรายจ่าย
// fixture: JJRD, JJLP, OFC(is_central) · OFC มีรายจ่ายซัพ 5,000 · JJRD ขาย 100,000 (1 ก.ย.)
// คาด: เลือก OFC → แท็บรายรับ/การใช้ของ/ใช้จริง/ครัวกลาง ซ่อน + show('income') เด้งไป exp
//      แดชบอร์ดทุกสาขา → ตารางเทียบไม่มีออฟฟิศ + โน้ต 🏢 ค่าใช้จ่ายส่วนกลาง ฿5,000.00
//      รายรับทุกสาขา → ไม่มีคอลัมน์ออฟฟิศ · โมดัลสาขามีติ๊กส่วนกลาง
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),json_to_sheet:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{}};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('ALL'));
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-09'));
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null},json:async()=>v});
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      if(url.includes('pnl_stock_names'))return T([]);
      if(url.includes('pnl_stock_map'))return T([]);
      if(url.includes('products'))return T([]);
      if(url.includes('pnl_suppliers'))return T([{id:1,name:'เอเจนซี่โฆษณา',category:'ส่วนกลาง',active:true,sort:1,vat_type:'NON-VAT'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา',sort:1,is_central:false},{code:'JJLP',name:'ลาดพร้าว',sort:2,is_central:false},{code:'OFC',name:'ออฟฟิศ',sort:3,is_central:true}]);
      if(url.includes('pnl_expense_daily')&&url.includes('branch=eq.OFC'))return T([{branch:'OFC',d:'2026-09-01',supplier_id:1,amount:5000}]);
      if(url.includes('pnl_expense_daily')&&url.includes('d=gte.2026-09')&&!url.includes('branch=eq.'))return T([{branch:'OFC',d:'2026-09-01',amount:5000}]);
      if(url.includes('pnl_income_daily')&&url.includes('branch=eq.JJRD'))return T([{branch:'JJRD',d:'2026-09-01',sales_pos_am:100000,sales_pos_pm:0}]);
      if(url.includes('pnl_income_daily')&&url.includes('d=lt.'))return T([]);
      if(url.includes('pnl_income_daily')&&!url.includes('branch=eq.'))return T([{branch:'JJRD',d:'2026-09-01',sales_pos_am:100000,sales_pos_pm:0}]);
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
  // 1) แดชบอร์ดโหมดทุกสาขา: เทียบสาขาไม่มีออฟฟิศ + โน้ตส่วนกลาง 5,000
  const dsh=d.getElementById('view-dash').textContent;
  out.push('โน้ต 🏢 ส่วนกลาง ฿5,000.00 บนแดชบอร์ด: '+dsh.includes('ค่าใช้จ่ายส่วนกลาง (ไม่ใช่สาขา) ฿5,000.00'));
  const cmpTbl=[...d.querySelectorAll('#view-dash table')].find(t=>t.textContent.includes('รายได้รวม')&&t.textContent.includes('Variable cost'));
  out.push('ตารางเทียบสาขา มีรัชดา/ลาดพร้าว ไม่มีออฟฟิศ: '+(!!cmpTbl&&cmpTbl.textContent.includes('รัชดา')&&cmpTbl.textContent.includes('ลาดพร้าว')&&!cmpTbl.textContent.includes('ออฟฟิศ')));
  out.push('ปุ่มสาขามีออฟฟิศ: '+!!d.querySelector('#brSeg button[data-br="OFC"]'));
  // 2) รายรับทุกสาขา: ไม่มีคอลัมน์ออฟฟิศ
  await w.eval("show('income')"); await sleep(350);
  const it=d.getElementById('view-income').textContent;
  out.push('รายรับทุกสาขา ไม่มีคอลัมน์ออฟฟิศ: '+(it.includes('รัชดา')&&!it.includes('ออฟฟิศ')));
  // 3) เลือกออฟฟิศ → แท็บที่ไม่เกี่ยวถูกซ่อน + เด้งจากรายรับไปรายจ่าย
  w.pickBranch('OFC'); await sleep(350);
  out.push('เลือกออฟฟิศจากแท็บรายรับ → เด้งไปรายจ่าย: '+(w.eval('S.tab')==='exp'));
  const hid=['income','usage','actual','ck'].every(v=>d.querySelector('.sb-item[data-v="'+v+'"]').style.display==='none');
  const shw=['exp','sum','recon','pv'].every(v=>d.querySelector('.sb-item[data-v="'+v+'"]').style.display!=='none');
  out.push('เมนูส่วนกลาง: ซ่อนรายรับ/ใช้ของ/สต๊อก/ครัวกลาง · โชว์รายจ่าย/สรุป/ตรวจสอบ/PV: '+hid+' '+shw);
  out.push('show(income) ตอนอยู่ออฟฟิศ → ไป exp: '+await w.eval("show('income').then(()=>S.tab)")+' (คาด exp)');
  // 4) กลับสาขาปกติ เมนูกลับมา
  w.pickBranch('JJRD'); await sleep(250);
  out.push('กลับรัชดา เมนูรายรับกลับมา: '+(d.querySelector('.sb-item[data-v="income"]').style.display!=='none'));
  // 5) โมดัลแก้สาขามีติ๊กส่วนกลาง (ออฟฟิศติ๊กอยู่)
  w.brModal('OFC'); await sleep(50);
  const cb=d.getElementById('brCen');
  out.push('โมดัลสาขา: ติ๊ก 🏢 ส่วนกลาง ติ๊กอยู่สำหรับออฟฟิศ: '+(!!cb&&cb.checked===true&&d.getElementById('modalBox').textContent.includes('ส่วนกลาง')));
  w.closeModal();
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
