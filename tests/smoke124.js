// smoke124: ช่องวันจ่าย/บัญชีที่จ่าย (paid_d / pay_src) ตอนติ๊กจ่าย — ส่วน "paid" ของงานตรวจสอบเงินในบัญชี
//   · S.bankCols ตรวจคอลัมน์ครั้งเดียวตอน loadCore (select=paid_d&limit=1 → 200 = มีคอลัมน์ · 400 = ยังไม่รัน SQL)
//   · paidToggle บิลที่มีสลิป → POST มี paid_d=วันนี้ + pay_src='A1' · ติ๊กซ้ำ (ยกเลิก) → null
//   · slipDel → null · slipPicked เคสเดี่ยว → paid_d วันนี้ · assignConfirm → ทุกแถวมี paid_d
//   · pvPaidMark ติ๊ก → PATCH pnl_pv_items paid + PATCH pnl_expense_daily (paid_d=is.null) มี paid_d · ยกเลิกติ๊ก → ไม่แตะบิล
//   · S.bankCols=false → POST ไม่มี paid_d/pay_src (ติ๊กจ่ายต้องไม่พังเมื่อยังไม่รัน SQL)
// fixture (ส.ค. 2569 · JJRD): sup1 FarmFresh 5 ส.ค. 11,885 (ไม่จ่าย ไม่มีสลิป) · 6 ส.ค. 5,000 (ไม่จ่าย มีสลิป) · sup2 Smilemeat 7 ส.ค. 9,451 (จ่ายแล้ว มีสลิป)
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-pnl.html','utf8');
const pre=`<script>
window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};
window.Chart.defaults={font:{},plugins:{}};
window.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{},json_to_sheet:r=>({})},writeFile:()=>{}};
window.Tesseract={recognize:async()=>({data:{text:''}})};
</script>`;
const patched=html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/g,'').replace('<style>',pre+'<style>');
const EXP=[
  {branch:'JJRD',d:'2026-08-05',supplier_id:1,amount:11885,paid:false,slip_url:null,checked:false,paid_d:null,pay_src:null},
  {branch:'JJRD',d:'2026-08-06',supplier_id:1,amount:5000,paid:false,slip_url:'https://x/s6.jpg',checked:true,paid_d:null,pay_src:null},
  {branch:'JJRD',d:'2026-08-07',supplier_id:2,amount:9451,paid:true,slip_url:'https://x/slip.jpg',checked:true,paid_d:null,pay_src:null}];
const posts=[], patches=[], gets=[];
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjpnl_br',JSON.stringify('JJRD'));
    w.localStorage.setItem('jjpnl_m',JSON.stringify('2026-08')); // ล็อกเดือนทดสอบ ไม่ให้ขึ้นกับวันที่จริง
    w.__noCols=false;
    w.fetch=async(url,opt)=>{
      if(url.includes('pnl_users'))return {ok:false,status:404,text:async()=>'nf',json:async()=>({})};
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),headers:{get:()=>null},json:async()=>v});
      const method=opt&&opt.method||'GET';
      if(method==='POST'&&url.includes('/storage/v1/object/slips/'))return T({Key:'x'});
      if(method==='POST'&&url.includes('pnl_expense_daily')){posts.push(JSON.parse(opt.body));return T([]);}
      if(method==='PATCH'){patches.push({url,body:JSON.parse(opt.body)});return T([]);}
      if(url.includes('pnl_suppliers'))return T([
        {id:1,name:'FarmFresh',category:'อาหาร',active:true,sort:1,vat_type:'NON-VAT',bank:'KBANK',account_no:'111',account_name:'FarmFresh'},
        {id:2,name:'Smilemeat',category:'อาหาร',active:true,sort:2,vat_type:'NON-VAT',bank:'SCB',account_no:'222',account_name:'Smilemeat'}]);
      if(url.includes('pnl_branches'))return T([{code:'JJRD',name:'รัชดา'},{code:'JJLP',name:'ลาดพร้าว'}]);
      if(url.includes('pnl_pv_items')&&url.includes('pv_id=eq.77'))return T([{id:501,pv_id:77,supplier_id:1,amount:16885,vat_amount:0,scheduled:false,paid:false}]);
      if(url.includes('pnl_pv_items'))return T([]);
      if(url.includes('pnl_pv')&&url.includes('id=eq.77'))return T([{id:77,branch:'JJRD',pv_no:'JJRD-16082026',pv_date:'2026-08-16',d_from:'2026-08-01',d_to:'2026-08-15',vat_type:'NON-VAT'}]);
      if(url.includes('pnl_pv'))return T([]);
      if(url.includes('pnl_expense_daily')){
        gets.push(url);
        if(url.includes('select=paid_d&limit=1')) return w.__noCols?{ok:false,status:400,text:async()=>'column pnl_expense_daily.paid_d does not exist',json:async()=>({})}:T([]);
        if(url.includes('paid_d=is.null')){ // pvPaidMark อ่านบิลของซัพในงวดที่จ่ายแล้วแต่ยังไม่มีวันจ่าย
          const sid=Number((url.match(/supplier_id=eq\.(\d+)/)||[])[1]);
          return T([{branch:'JJRD',d:'2026-08-05',supplier_id:sid},{branch:'JJRD',d:'2026-08-06',supplier_id:sid}]);
        }
        if(url.includes('d=gte.2026-08'))return T(EXP.map(r=>({...r})));
        return T([]);
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
const last=()=>posts[posts.length-1];
setTimeout(async()=>{
  const out=[];
  d.querySelector('.sb-item[data-v="exp"]').click();
  await sleep(400);
  d.getElementById('slipFile').click=()=>{};
  const today=w.todayStr();
  const cache=k=>JSON.parse(w.eval(`JSON.stringify(S.cache[mkey(S.br,S.m)].exp[${JSON.stringify(k)}])`));
  // 0) ตรวจคอลัมน์ตอนโหลด
  out.push('loadCore ตรวจคอลัมน์ select=paid_d&limit=1 ครั้งเดียว: '+(gets.filter(u=>u.includes('select=paid_d&limit=1')).length===1));
  out.push('S.bankCols=true (ฐานมีคอลัมน์): '+(w.eval('S.bankCols')===true));
  out.push('payFields(ไม่จ่าย) → {} (ไม่ล้างวันจ่าย — ติ๊กกลับได้วัน/บัญชีเดิม): '+(JSON.stringify(w.payFields({paid_d:'2026-08-02',pay_src:'A2'},false))==='{}'));
  out.push('payFields(จ่าย, มีค่าเดิม) เก็บค่าเดิม: '+(JSON.stringify(w.payFields({paid_d:'2026-08-02',pay_src:'A2'},true))==='{"paid_d":"2026-08-02","pay_src":"A2"}'));
  // 1) paidToggle บิลที่มีสลิป (6 ส.ค. sup1) → ติ๊กจ่าย → paid_d=วันนี้ pay_src=A1
  posts.length=0;
  await w.paidToggle('2026-08-06',1); await sleep(50);
  let p=last()&&last()[0];
  out.push('paidToggle ติ๊กจ่าย → POST paid:true + paid_d=วันนี้ ('+today+') + pay_src=A1: '+(!!p&&p.paid===true&&p.paid_d===today&&p.pay_src==='A1'&&p.d==='2026-08-06'&&p.amount===5000));
  let r6=cache('2026-08-06|1');
  out.push('cache 6 ส.ค. ได้ paid_d/pay_src: '+(r6.paid===true&&r6.paid_d===today&&r6.pay_src==='A1'));
  // 2) ติ๊กซ้ำ (ยกเลิกจ่าย) → ส่งแค่ paid:false · วันจ่าย/บัญชีเดิมคงไว้ (หน้า bank กรอง paid=true อยู่แล้ว)
  await w.paidToggle('2026-08-06',1); await sleep(50);
  p=last()&&last()[0];
  out.push('paidToggle ยกเลิก → POST paid:false ไม่มี key paid_d/pay_src (ไม่ล้าง): '+(!!p&&p.paid===false&&!('paid_d' in p)&&!('pay_src' in p)));
  r6=cache('2026-08-06|1');
  out.push('cache 6 ส.ค. paid=false แต่ยังจำวันจ่าย/บัญชีเดิม: '+(r6.paid===false&&r6.paid_d===today&&r6.pay_src==='A1'));
  // 2b) แก้วัน/บัญชีไว้ (เช่นจากหน้า bank) แล้วติ๊กกลับ → ได้ค่าที่แก้ไว้ ไม่ใช่วันนี้/A1
  w.eval("(r=>{r.paid_d='2026-08-03';r.pay_src='A2';})(S.cache[mkey(S.br,S.m)].exp['2026-08-06|1'])");
  await w.paidToggle('2026-08-06',1); await sleep(50);
  p=last()&&last()[0];
  out.push('ติ๊กกลับ → POST paid:true + paid_d 2026-08-03 + pay_src A2 (ค่าเดิม): '+(!!p&&p.paid===true&&p.paid_d==='2026-08-03'&&p.pay_src==='A2'));
  out.push('toast บอกวันจ่าย/บัญชีที่ลงให้: '+((d.getElementById('toast')||{}).textContent||'').includes('ลงวันจ่าย 3 ส.ค. 2569 จากบัญชี 2'));
  // คืนสภาพเดิมให้ขั้นถัดไป (ยกเลิกจ่าย + ล้างวันในเครื่อง)
  await w.paidToggle('2026-08-06',1); await sleep(50);
  w.eval("(r=>{r.paid_d=null;r.pay_src=null;})(S.cache[mkey(S.br,S.m)].exp['2026-08-06|1'])");
  // 3) slipDel (7 ส.ค. sup2 จ่ายแล้วมีสลิป) → ลบสลิป = ยกเลิกจ่าย → null
  await w.slipDel('2026-08-07',2); await sleep(50);
  p=last()&&last()[0];
  out.push('slipDel → POST slip_url null, paid:false (ไม่ล้างวันจ่าย): '+(!!p&&p.d==='2026-08-07'&&p.slip_url===null&&p.paid===false&&!('paid_d' in p)));
  const r7=cache('2026-08-07|2');
  out.push('cache 7 ส.ค. paid_d null: '+(r7.paid===false&&r7.paid_d===null&&r7.pay_src===null));
  // 4) slipPicked เคสเดี่ยว (sup2 เหลือบิลเดียว 7 ส.ค.) → แนบสลิป + ติ๊กจ่ายอัตโนมัติ → paid_d วันนี้
  posts.length=0;
  const blob=new w.Blob(['x'],{type:'image/jpeg'});
  w.eval("S._slipTarget={ds:'2026-08-07',sid:2}");
  await w.slipPicked({files:[blob],value:''}); await sleep(120);
  p=posts.flat().find(x=>x.slip_url);
  out.push('slipPicked เดี่ยว → POST slip_url + paid:true + paid_d=วันนี้ + pay_src=A1: '+(!!p&&p.d==='2026-08-07'&&p.paid===true&&!!p.slip_url&&p.paid_d===today&&p.pay_src==='A1'));
  out.push('ไม่เปิดกล่องสลิปเดียวหลายบิล (sup2 มีบิลเดียว): '+(!d.getElementById('modalWrap').classList.contains('on')&&!d.getElementById('modalBox').textContent.includes('สลิปเดียว จ่ายหลายบิล')));
  const r7b=cache('2026-08-07|2');
  out.push('cache 7 ส.ค. paid_d=วันนี้: '+(r7b.paid===true&&r7b.paid_d===today&&r7b.pay_src==='A1'));
  // 5) assignConfirm (จำลอง S._assign: sup1 2 บิล 5+6 ส.ค.) → ทุกแถวมี paid_d
  posts.length=0;
  w.eval("S._assign={url:'https://x/multi.jpg',blob:null,sid:1,tgt:{ds:'2026-08-05',sid:1},bills:[S.cache[mkey(S.br,S.m)].exp['2026-08-05|1'],S.cache[mkey(S.br,S.m)].exp['2026-08-06|1']],checked:new Set(['2026-08-05','2026-08-06'])}");
  await w.assignConfirm(); await sleep(120);
  const bulk=posts.flat().filter(x=>x.slip_url==='https://x/multi.jpg');
  out.push('assignConfirm → 2 แถว ทุกแถว paid:true + paid_d=วันนี้ + pay_src=A1: '+(bulk.length===2&&bulk.every(x=>x.paid===true&&x.paid_d===today&&x.pay_src==='A1')&&bulk.map(x=>x.d).sort().join(',')==='2026-08-05,2026-08-06'));
  const r5=cache('2026-08-05|1'); r6=cache('2026-08-06|1');
  out.push('cache 5+6 ส.ค. ได้ paid_d/pay_src: '+(r5.paid_d===today&&r5.pay_src==='A1'&&r6.paid_d===today&&r6.pay_src==='A1'));
  // 6) pvPaidMark ติ๊ก → PATCH pv_items paid:true + PATCH expense_daily (paid_d=is.null) มี paid_d
  patches.length=0; gets.length=0;
  w.eval("S.cache[mkey(S.br,S.m)].exp['2026-08-05|1'].paid_d=null; S.cache[mkey(S.br,S.m)].exp['2026-08-05|1'].pay_src=null;");
  await w.pvPaidMark(501,1,'2026-08-01','2026-08-15',true,'JJRD'); await sleep(50);
  const pvp=patches.find(x=>x.url.includes('pnl_pv_items')&&x.url.includes('id=eq.501'));
  out.push('pvPaidMark → PATCH pnl_pv_items id=eq.501 {paid:true}: '+(!!pvp&&pvp.body.paid===true));
  const g=gets.find(u=>u.includes('paid_d=is.null'));
  out.push('pvPaidMark อ่านบิลซัพ 1 ในงวด 1–15 ที่ paid=true & paid_d null: '+(!!g&&g.includes('supplier_id=eq.1')&&g.includes('d=gte.2026-08-01')&&g.includes('d=lte.2026-08-15')&&g.includes('paid=is.true')&&g.includes('branch=eq.JJRD')));
  const ep=patches.find(x=>x.url.includes('pnl_expense_daily'));
  out.push('pvPaidMark → PATCH pnl_expense_daily (เฉพาะ paid_d=is.null) body paid_d=วันนี้ pay_src=A1: '+(!!ep&&ep.url.includes('paid_d=is.null')&&ep.url.includes('supplier_id=eq.1')&&ep.body.paid_d===today&&ep.body.pay_src==='A1'));
  out.push('cache 5 ส.ค. ได้ paid_d จาก pvPaidMark: '+(cache('2026-08-05|1').paid_d===today));
  // 6b) ยกเลิกติ๊กสำเร็จ → PATCH pv_items อย่างเดียว ไม่แตะบิล
  patches.length=0; gets.length=0;
  await w.pvPaidMark(501,1,'2026-08-01','2026-08-15',false,'JJRD'); await sleep(30);
  out.push('ยกเลิกติ๊ก → PATCH pv_items paid:false 1 ครั้ง · ไม่อ่าน/ไม่ PATCH expense_daily: '+(patches.length===1&&patches[0].url.includes('pnl_pv_items')&&patches[0].body.paid===false&&!gets.some(u=>u.includes('paid_d=is.null'))));
  // 6c) ผ่านหน้าใบ PV จริง: ช่อง "สำเร็จ" onchange เรียก pvPaidMark
  patches.length=0;
  await w.pvOpen(77); await sleep(100);
  const mb=d.getElementById('modalBox');
  const row=[...mb.querySelectorAll('table tr')].find(tr=>tr.textContent.includes('FarmFresh'));
  const cbs=row?[...row.querySelectorAll('input[type=checkbox]')]:[];
  const cb=cbs[cbs.length-1];
  out.push('ใบ PV: ช่องสำเร็จ onchange=pvPaidMark(501,1,งวด,...,branch): '+(!!cb&&String(cb.getAttribute('onchange')).includes("pvPaidMark(501,1,'2026-08-01','2026-08-15',this.checked,'JJRD')")));
  out.push('ช่องตั้งจ่ายยังเป็น upd scheduled เหมือนเดิม: '+(cbs.length===2&&String(cbs[0].getAttribute('onchange')).includes("{scheduled:this.checked}")));
  if(cb){ cb.checked=true; cb.dispatchEvent(new w.Event('change')); await sleep(80); }
  out.push('ติ๊กในใบ PV → PATCH pv_items + PATCH expense_daily มี paid_d: '+(patches.some(x=>x.url.includes('pnl_pv_items')&&x.body.paid===true)&&patches.some(x=>x.url.includes('pnl_expense_daily')&&x.body.paid_d===today)));
  w.closeModal();
  // 7) ฐานยังไม่มีคอลัมน์ (select=paid_d → 400) → S.bankCols=false → POST ไม่มี paid_d/pay_src
  w.__noCols=true;
  await w.loadCore(); await sleep(30);
  out.push('select=paid_d → 400 → S.bankCols=false: '+(w.eval('S.bankCols')===false));
  out.push('payFields ว่างเมื่อไม่มีคอลัมน์: '+(JSON.stringify(w.payFields({},true))==='{}'&&JSON.stringify(w.payFields({},false))==='{}'));
  posts.length=0;
  await w.paidToggle('2026-08-06',1); await sleep(50);   // จ่ายอยู่ (จาก assignConfirm) → ยกเลิก
  p=last()&&last()[0];
  out.push('bankCols=false: paidToggle ยกเลิก → POST paid:false ไม่มี key paid_d/pay_src: '+(!!p&&p.paid===false&&!('paid_d' in p)&&!('pay_src' in p)));
  await w.paidToggle('2026-08-06',1); await sleep(50);   // ติ๊กกลับ
  p=last()&&last()[0];
  out.push('bankCols=false: paidToggle ติ๊กจ่าย → POST paid:true ไม่มี key paid_d/pay_src: '+(!!p&&p.paid===true&&!('paid_d' in p)&&!('pay_src' in p)));
  await w.slipDel('2026-08-07',2); await sleep(50);
  p=last()&&last()[0];
  out.push('bankCols=false: slipDel → POST ไม่มี key paid_d: '+(!!p&&p.paid===false&&!('paid_d' in p)));
  patches.length=0; gets.length=0;
  await w.pvPaidMark(501,1,'2026-08-01','2026-08-15',true,'JJRD'); await sleep(30);
  out.push('bankCols=false: pvPaidMark → PATCH pv_items อย่างเดียว ไม่แตะ expense_daily: '+(patches.length===1&&patches[0].url.includes('pnl_pv_items')&&!gets.some(u=>u.includes('paid_d=is.null'))));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},400);
