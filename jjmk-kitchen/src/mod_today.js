/* ============================================================
   ☀️ วันนี้ — today (td*)
   วันที่ + การ์ดใหญ่แตะได้ (แต่ละใบพาไปแท็บงานนั้น):
   🚚 ออเดอร์สาขาที่ยังไม่ส่ง = stock_receipts (ซัพ = cfg.ck_sup_names · order_date ≥ วันนี้−lookback · เฉพาะสาขาที่เห็น) หักที่ส่งแล้วรายบรรทัด
      — ตัวคิดเดียวกับ 🚚 ส่งสาขา/🍳 ทำของ (sdCalcGroups ใน mod_send.js): ส่งบางส่วน = ที่เหลือยังค้าง · ตัวเลข/ป้าย 🚚 ตรงกันทุกหน้า
   ⚡ ต้องทำด่วน = สินค้าที่สต๊อกสำเร็จรูปไม่พอออเดอร์ที่ยังไม่ส่ง (ชื่อสินค้าสาขา → เมนูผ่าน kc_links หรือชื่อตรงกัน)
   🔄 ต้องทำเติม = สต๊อกสำเร็จรูปต่ำกว่า Safety (target_qty หรือ target_days × ยอดส่งเฉลี่ย/วัน 14 วันหลัง — หน่วยครัว: บรรทัดบิลเป็นหน่วยสาขา × ตัวคูณที่ผูกใน kc_links `tdLineFactor`)
      · เติมถึง Max (ck_recipes.max_qty · ว่าง = Safety) — สูตรเดียวกับ 🍳 mkNeeds + 🎯 หน้าตั้ง Safety/Max = `mnTargetCalc` (mod_menus.js)
   ⚠️ วัตถุดิบต่ำกว่าขั้นต่ำ · 📋 นับล่าสุด · ยอดวันนี้ (รับของ ฿ · ทำของ รอบ · ส่งสาขา ฿)
   ทุกการ์ดอ่านแยกกันแบบ fail-soft — ตารางไหนอ่านไม่ได้ การ์ดนั้นบอก "อ่านข้อมูลไม่ได้" ใบอื่นยังทำงาน
   ============================================================ */
I18N.add({
th:{td_orders:'ออเดอร์สาขาที่ยังไม่ส่ง',td_orders_s:'{b} สาขา · {o} ใบสั่ง · {n} รายการ',td_orders_ok:'ส่งครบทุกสาขาแล้ว',
  td_urgent:'ต้องทำด่วน',td_urgent_s:'{n} เมนู ของไม่พอส่ง',td_urgent_ok:'ของพอส่งทุกเมนู',td_refill:'ต้องทำเติม',td_refill_s:'{n} เมนู ต่ำกว่าที่ควรมี',td_refill_ok:'สต๊อกสำเร็จรูปพอ',
  td_low:'วัตถุดิบต่ำกว่าขั้นต่ำ',td_low_s:'{n} รายการ ต้องสั่งของ',td_low_ok:'วัตถุดิบครบตามขั้นต่ำ',
  td_count:'นับล่าสุด',td_count_never:'ยังไม่เคยนับ — แตะเพื่อนับสต๊อก',td_count_s:'{d} {t} · {n} รายการ · ต่าง {x}',td_count_today:'วันนี้',
  td_recv:'รับของวันนี้',td_recv_s:'รับแล้ววันนี้ {n} ใบ · {m} — แตะเพื่อรับของ',td_recv_none:'ยังไม่ได้รับของวันนี้ — แตะเพื่อรับของ',td_made:'ทำของวันนี้',td_sent:'ส่งสาขาวันนี้',td_lots:'{n} รอบ',td_bills:'{n} บิล',td_rcpts:'{n} ใบ',td_menus:'{n} เมนู',
  td_noread:'อ่านข้อมูลไม่ได้ — แตะเพื่อดู',td_loading:'กำลังโหลด…',td_hello:'สวัสดี {n} 👋',td_unlinked:'{n} ชื่อยังไม่ผูกกับเมนู'},
en:{td_orders:'Branch orders not yet sent',td_orders_s:'{b} branches · {o} orders · {n} lines',td_orders_ok:'All branches delivered',
  td_urgent:'Produce urgently',td_urgent_s:'{n} products short for orders',td_urgent_ok:'Enough stock for every order',td_refill:'Produce to refill',td_refill_s:'{n} products below target',td_refill_ok:'Finished stock is fine',
  td_low:'Ingredients below minimum',td_low_s:'{n} items to order',td_low_ok:'All ingredients above minimum',
  td_count:'Last count',td_count_never:'Never counted — tap to count stock',td_count_s:'{d} {t} · {n} lines · {x} differ',td_count_today:'Today',
  td_recv:'Received today',td_recv_s:'{n} receipt(s) today · {m} — tap to receive',td_recv_none:'Nothing received yet today — tap to receive',td_made:'Produced today',td_sent:'Delivered today',td_lots:'{n} lots',td_bills:'{n} bills',td_rcpts:'{n} receipts',td_menus:'{n} products',
  td_noread:'Could not read — tap to open',td_loading:'Loading…',td_hello:'Hello {n} 👋',td_unlinked:'{n} names not linked to a product'},
lo:{td_orders:'ອໍເດີສາຂາທີ່ຍັງບໍ່ສົ່ງ',td_orders_s:'{b} ສາຂາ · {o} ໃບສັ່ງ · {n} ລາຍການ',td_orders_ok:'ສົ່ງຄົບທຸກສາຂາແລ້ວ',
  td_urgent:'ຕ້ອງເຮັດດ່ວນ',td_urgent_s:'{n} ເມນູ ເຄື່ອງບໍ່ພໍສົ່ງ',td_urgent_ok:'ເຄື່ອງພໍສົ່ງທຸກເມນູ',td_refill:'ຕ້ອງເຮັດຕື່ມ',td_refill_s:'{n} ເມນູ ຕ່ຳກວ່າທີ່ຄວນມີ',td_refill_ok:'ສະຕັອກສຳເລັດຮູບພໍ',
  td_low:'ວັດຖຸດິບຕ່ຳກວ່າຂັ້ນຕ່ຳ',td_low_s:'{n} ລາຍການ ຕ້ອງສັ່ງເຄື່ອງ',td_low_ok:'ວັດຖຸດິບຄົບຕາມຂັ້ນຕ່ຳ',
  td_count:'ນັບລ່າສຸດ',td_count_never:'ຍັງບໍ່ເຄີຍນັບ — ແຕະເພື່ອນັບສະຕັອກ',td_count_s:'{d} {t} · {n} ລາຍການ · ຕ່າງ {x}',td_count_today:'ມື້ນີ້',
  td_recv:'ຮັບເຄື່ອງມື້ນີ້',td_recv_s:'ຮັບແລ້ວມື້ນີ້ {n} ໃບ · {m} — ແຕະເພື່ອຮັບເຄື່ອງ',td_recv_none:'ຍັງບໍ່ໄດ້ຮັບເຄື່ອງມື້ນີ້ — ແຕະເພື່ອຮັບເຄື່ອງ',td_made:'ເຮັດເຄື່ອງມື້ນີ້',td_sent:'ສົ່ງສາຂາມື້ນີ້',td_lots:'{n} ຮອບ',td_bills:'{n} ບິນ',td_rcpts:'{n} ໃບ',td_menus:'{n} ເມນູ',
  td_noread:'ອ່ານຂໍ້ມູນບໍ່ໄດ້ — ແຕະເພື່ອເບິ່ງ',td_loading:'ກຳລັງໂຫຼດ…',td_hello:'ສະບາຍດີ {n} 👋',td_unlinked:'{n} ຊື່ຍັງບໍ່ຜູກກັບເມນູ'},
my:{td_orders:'မပို့ရသေးသော ဆိုင်ခွဲအော်ဒါ',td_orders_s:'ဆိုင်ခွဲ {b} · အော်ဒါ {o} · {n} ကြောင်း',td_orders_ok:'ဆိုင်ခွဲအားလုံး ပို့ပြီး',
  td_urgent:'အရေးပေါ် ထုတ်လုပ်ရန်',td_urgent_s:'အော်ဒါအတွက် မလုံလောက်သော ထုတ်ကုန် {n} မျိုး',td_urgent_ok:'အော်ဒါတိုင်းအတွက် လက်ကျန်လုံလောက်',td_refill:'ဖြည့်ရန် ထုတ်လုပ်',td_refill_s:'ပစ်မှတ်အောက် ထုတ်ကုန် {n} မျိုး',td_refill_ok:'ထုတ်ကုန်လက်ကျန် လုံလောက်',
  td_low:'အနည်းဆုံးအောက် ကုန်ကြမ်း',td_low_s:'မှာယူရန် {n} မျိုး',td_low_ok:'ကုန်ကြမ်းအားလုံး အနည်းဆုံးအထက်',
  td_count:'နောက်ဆုံးရေတွက်မှု',td_count_never:'မရေတွက်ရသေး — စာရင်းကောက်ရန် နှိပ်ပါ',td_count_s:'{d} {t} · {n} ကြောင်း · ကွာခြား {x}',td_count_today:'ယနေ့',
  td_recv:'ယနေ့လက်ခံ',td_recv_s:'ယနေ့ {n} စောင် · {m} — လက်ခံရန် နှိပ်ပါ',td_recv_none:'ယနေ့ မလက်ခံရသေးပါ — လက်ခံရန် နှိပ်ပါ',td_made:'ယနေ့ထုတ်လုပ်',td_sent:'ယနေ့ဆိုင်ခွဲပို့',td_lots:'{n} အသုတ်',td_bills:'ဘေလ် {n}',td_rcpts:'{n} စောင်',td_menus:'ထုတ်ကုန် {n}',
  td_noread:'ဖတ်မရပါ — ကြည့်ရန် နှိပ်ပါ',td_loading:'ဖွင့်နေသည်…',td_hello:'မင်္ဂလာပါ {n} 👋',td_unlinked:'ထုတ်ကုန်နှင့် မချိတ်ရသေးသော အမည် {n}'}
});
CSS.add(`
.tdhello{font-size:14px;color:var(--mut);margin:-6px 0 10px}
.bigact.dim{opacity:.72}.bigact small.warn{color:var(--gold)}
.kpis.tdk .kpi.hero{grid-column:1/-1}
@media(min-width:760px){.kpis.tdk{grid-template-columns:repeat(3,1fr)}.kpis.tdk .kpi.hero{grid-column:auto}}
.kpi .s.mut{color:var(--mut)}
`);
let TD_SEQ=0;
let TD_DATA=null;   // ผลโหลดรอบล่าสุด (เทส/โมดูลอื่นอ่านได้)
function tdDateTxt(){const d=bizTodayISO();const [y,m,dd]=d.split('-').map(Number);const dow=new Date(y,m-1,dd).getDay();return t('wd')[dow]+' '+dispDate(d);}
RENDER.today=function(el){
  const K=canKitchen();
  el.innerHTML=dhead('☀️ '+t('nav_today'),esc(tdDateTxt()))+sqlNeedBox()+
    '<div class="tdhello">'+esc(t('td_hello',{n:(S.user&&S.user.name)||''}))+'</div>'+
    '<div class="bigacts">'+
      tdBig('orders','🚚',t('td_orders'),t('td_loading'),'dim','send')+tdBig('urgent','⚡',t('td_urgent'),t('td_loading'),'dim','make')+
      tdBig('refill','🔄',t('td_refill'),t('td_loading'),'dim','make')+tdLowHtml()+tdBig('count','📋',t('td_count'),t('td_loading'),'dim','count')+
      tdBig('recv','📥',t('nav_recv'),t('td_loading'),'dim','recv')+'</div>'+
    '<div class="kpis tdk">'+tdKpi('recv',t('td_recv'),'hero','recv')+tdKpi('made',t('td_made'),'','make')+tdKpi('sent',t('td_sent'),'','bills')+'</div>';
  if(K)tdLoad();
};
function tdBig(key,ic,title,sub,cls,tab){return '<button type="button" class="bigact'+(cls?' '+cls:'')+'" id="tdC_'+key+'" onclick="tdGo(\''+key+'\',\''+tab+'\')"><span class="bi">'+ic+'</span>'+
  '<span class="btx"><b>'+esc(title)+'</b><small id="tdS_'+key+'">'+esc(sub)+'</small></span><span class="bgo">›</span></button>';}
function tdGo(key,tab){ // การ์ด → แท็บงานพร้อมสถานะที่ถูก: ⚡ = หน้าทำของ ชิป ด่วน · 🔄 = ชิป เติม (ตัวเลขที่นั่นคิดจากออเดอร์ชุดเดียวกัน)
  if((key==='urgent'||key==='refill')&&typeof mkSetPill==='function')mkSetPill(key);show(tab);}
function tdKpi(key,title,cls,tab){return '<div class="kpi tap'+(cls?' '+cls:'')+'" id="tdK_'+key+'" onclick="show(\''+tab+'\')"><div class="t">'+esc(title)+'</div><div class="kpi-v" id="tdV_'+key+'">…</div><div class="s" id="tdX_'+key+'"></div></div>';}
function tdSet(key,sub,cls){const b=document.getElementById('tdC_'+key);if(!b)return;b.className='bigact'+(cls?' '+cls:'');const s=document.getElementById('tdS_'+key);if(s)s.textContent=sub;}
function tdSetKpi(key,v,sub){const a=document.getElementById('tdV_'+key),b=document.getElementById('tdX_'+key);if(a)a.textContent=v;if(b)b.textContent=sub||'';}
function tdLow(){return activeItems().filter(it=>it.min_qty!=null&&num(it.min_qty)>0&&num(it.qty)<num(it.min_qty));}
function tdLowHtml(){const n=tdLow().length;return tdBig('low','⚠️',t('td_low'),n?t('td_low_s',{n}):t('td_low_ok'),n?'hot':'ok','buy');}
async function tdGet(tb,fn){ // อ่านแบบไม่โยน error — ตารางไม่มี/อ่านไม่ได้ = {ok:false}
  try{let q=sb.from(tb).select('*');q=fn?fn(q):q;const r=await q;if(!r||r.error)return {ok:false,rows:[],err:r&&r.error};return {ok:true,rows:r.data||[]};}
  catch(e){return {ok:false,rows:[],err:e};}}
async function tdLoad(){
  const seq=++TD_SEQ,today=bizTodayISO(),cfg=S.cfg||CFG_DEF;
  const from=addDays(today,-num(cfg.order_lookback_days)),from14=addDays(today,-14),fromMin=from<from14?from:from14;
  const [sr,dl,lk,ct,rc,pd]=await Promise.all([
    tdGet('stock_receipts',q=>q.gte('order_date',from).gt('ordered',0)),
    tdGet('kc_deliveries',q=>q.gte('d',fromMin)),
    tdGet('kc_links'),
    tdGet('kc_counts',q=>q.order('created_at',{ascending:false}).limit(1)),
    tdGet('kc_receipts',q=>q.eq('d',today)),
    tdGet('kc_productions',q=>q.eq('d',today))]);
  let dll={ok:true,rows:[]};
  if(dl.ok&&dl.rows.length)dll=await tdGet('kc_delivery_lines',q=>q.in('delivery_id',dl.rows.map(d=>d.id)));
  if(seq!==TD_SEQ||S.tab!=='today')return;
  const D={today,sr,dl,lk,ct,rc,pd,dll};TD_DATA=D;
  if(D.lk.ok)TD_LINKS=D.lk.rows;   // ชื่อสินค้าสาขา ↔ เมนู (อ่านไม่ได้ = ใช้ของเดิม — เหมือน 🚚/🍳)
  tdPaintOrders(D);tdPaintRefill(D);tdPaintCount(D);tdPaintKpis(D);
}
/* ---------- ออเดอร์สาขา + ด่วน ---------- */
function tdOpenOrders(sr,dl,dll){ // → {groups,branches,orders,lines,need:{recipe_id:qty},unlinked:[]} — ตัวคิดเดียวกับ 🚚 ส่งสาขา (sdCalcGroups)
  const C=sdCalcGroups({sr,dl,dll},S.branches);
  return {groups:C.groups,branches:new Set(C.groups.map(g=>g.code)).size,orders:C.groups.length,lines:C.lines,need:C.need,unlinked:C.unlinked};}
let TD_LINKS=[];
function tdLinkOf(stkName){ // ชื่อสินค้าสาขา → {recipe_id,factor} ผ่าน kc_links · ไม่มี = ชื่อตรงกับเมนู (หรือ stock_name)
  const k=supKey(stkName);if(!k)return null;
  const l=TD_LINKS.find(x=>supKey(x.stk_name)===k);if(l&&recipeById(l.recipe_id))return {recipe_id:l.recipe_id,factor:num(l.factor)||1};
  const r=activeRecipes().find(x=>supKey(x.name)===k||supKey(x.stock_name)===k);return r?{recipe_id:r.id,factor:1}:null;}
function tdLineFactor(l){ // บรรทัดบิล (ชื่อสินค้าสาขา + เมนู) → ตัวคูณ หน่วยสาขา → หน่วยครัว ตาม kc_links · ผูกไว้คนละเมนู/ไม่รู้จัก = 1 (กติกาเดียวกับ blVoid)
  const lk=tdLinkOf(l&&l.name);return (lk&&lk.recipe_id===(l&&l.recipe_id))?(num(lk.factor)||1):1;}
function tdPaintOrders(D){
  if(!D.sr.ok||!D.dl.ok||!D.dll.ok){tdSet('orders',t('td_noread'),'dim');tdSet('urgent',t('td_noread'),'dim');return;}
  const o=tdOpenOrders(D.sr.rows,D.dl.rows,D.dll.rows);D.open=o;
  tdSet('orders',o.orders?t('td_orders_s',{b:o.branches,o:o.orders,n:o.lines}):t('td_orders_ok'),o.orders?'hot':'ok');
  setBadge('send',o.orders);
  const short=Object.keys(o.need).filter(id=>{const r=recipeById(id);return r&&o.need[id]-Math.max(0,num(r.qty))>1e-9;});D.urgent=short;
  let sub=short.length?t('td_urgent_s',{n:short.length}):t('td_urgent_ok');if(o.unlinked.length)sub+=' · '+t('td_unlinked',{n:o.unlinked.length});
  tdSet('urgent',sub,short.length?'hot':'ok');}
/* ---------- เติม ---------- */
function tdAvgSent(D){ // ยอดส่งเฉลี่ย/วัน 14 วันหลัง ต่อเมนู (บิลที่ไม่ยกเลิก) — เป็นหน่วยครัว: sent ของบรรทัดบิลเป็นหน่วยสาขา × ตัวคูณที่ผูก (6 ถุง ×0.5 = 3 กก.)
  const out={};if(!D.dl.ok||!D.dll.ok)return out;
  const okIds=new Set(D.dl.rows.filter(d=>d.status!=='void'&&String(d.d)>=addDays(D.today,-14)).map(d=>String(d.id)));
  D.dll.rows.forEach(l=>{if(!okIds.has(String(l.delivery_id))||!l.recipe_id)return;out[l.recipe_id]=(out[l.recipe_id]||0)+num(l.sent)*tdLineFactor(l);});
  Object.keys(out).forEach(k=>out[k]=out[k]/14);return out;}
function tdTargetOf(r,avg){const c=mnTargetCalc(r,num(r.qty),num(avg[r.id]||0));return c.safety>0?c.safety:null;}   // Safety (ขั้นต่ำที่ต้องมี) — สูตรเดียวกับ 🍳/🎯 (mnTargetCalc ใน mod_menus.js)
function tdPaintRefill(D){
  if(!D.dl.ok){tdSet('refill',t('td_noread'),'dim');return;}
  const avg=tdAvgSent(D);const low=activeRecipes().filter(r=>mnTargetCalc(r,num(r.qty),num(avg[r.id]||0)).below>0);D.refill=low.map(r=>r.id);   // สต๊อก < Safety → ต้องเติม (ถึง Max)
  tdSet('refill',low.length?t('td_refill_s',{n:low.length}):t('td_refill_ok'),low.length?'hot':'ok');}
/* ---------- นับล่าสุด ---------- */
function tdPaintCount(D){
  if(!D.ct.ok){tdSet('count',t('td_noread'),'dim');return;}
  const c=D.ct.rows[0];if(!c){tdSet('count',t('td_count_never'),'hot');return;}
  const isToday=String(c.d).slice(0,10)===D.today;
  tdSet('count',t('td_count_s',{d:isToday?t('td_count_today'):dispDate(c.d),t:dispTime(c.created_at),n:fmtI(c.n),x:fmtI(c.diff)})+(c.by_name?' · '+c.by_name:''),isToday?'ok':'');}
/* ---------- ยอดวันนี้ ---------- */
function tdPaintKpis(D){
  if(D.rc.ok){const tot=D.rc.rows.reduce((a,r)=>a+num(r.total),0),n=D.rc.rows.length;tdSetKpi('recv',money(tot),t('td_rcpts',{n}));tdSet('recv',n?t('td_recv_s',{n,m:money(tot)}):t('td_recv_none'),n?'ok':'');}
  else{tdSetKpi('recv','—',t('td_noread'));tdSet('recv',t('td_noread'),'');}
  if(D.pd.ok){const lots=D.pd.rows.reduce((a,r)=>a+num(r.lots),0),menus=new Set(D.pd.rows.map(r=>r.recipe_id)).size;tdSetKpi('made',t('td_lots',{n:fmtQ(lots)}),t('td_menus',{n:menus}));}else tdSetKpi('made','—',t('td_noread'));
  if(D.dl.ok){const rows=D.dl.rows.filter(d=>String(d.d).slice(0,10)===D.today&&d.status!=='void'&&inBr(d.branch));tdSetKpi('sent',money(rows.reduce((a,r)=>a+num(r.total),0)),t('td_bills',{n:rows.length}));}else tdSetKpi('sent','—',t('td_noread'));}
