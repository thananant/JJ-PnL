/* ============================================================
   📦 สต๊อกสินค้า — pstock (ps*)  (เจ้าของสั่ง 2026-10-18)
   "อยากให้เพิ่มหน้า สต๊อกสินค้า ที่แสดงเฉพาะว่าสินค้าแต่ละตัวมีเท่าไร แต่พอกดเข้าไปในสินค้านั้นๆ ให้ขึ้นประวัติต่างๆ แยกแท็บกัน
    ประวัติการผลิต ประวัติการส่งตามสาขา และประวัติบิล"
   หน้า = สินค้าสำเร็จรูป (ck_recipes ที่ยังใช้) · ชิปหมวด + ค้นหา · แถวละตัว: รูป · ชื่อ · มีเท่าไร (ตัวใหญ่) · ⚠️ ต่ำกว่า Safety (target_qty)
   แตะ = หน้ารายละเอียด 3 แท็บ (อ่านอย่างเดียว · ช่วง 30/90 วัน/ทั้งหมด):
     🍳 ผลิต   = kc_productions ของเมนูนี้ (วัน · ได้จริง/สั่ง · ต้นทุน/หน่วย · ใคร)
     🚚 ส่งตามสาขา = kc_delivery_lines ของเมนูนี้ ในบิลที่ไม่ยกเลิก → สรุปต่อสาขา (จำนวน · บาท · กี่บิล) + รายการรายวัน
     🧾 บิล    = บิลที่มีเมนูนี้ (เลขบิล · วัน · สาขา · จำนวน · บาท · สถานะ) แตะ = blDetail (กลับมาหน้านี้)
   สาขาที่ไม่อยู่ในสิทธิ์ (inBr) ไม่แสดงในแท็บส่ง/บิล · อ่านไม่ได้ = กล่องแจ้ง + ⟳
   ============================================================ */
I18N.add({
th:{nav_pstock:'สต๊อกสินค้า',ps_sub:'สินค้าที่ครัวทำเสร็จแล้ว มีเหลือเท่าไร — แตะสินค้าเพื่อดูประวัติผลิต ส่งสาขา และบิล',ps_none:'ยังไม่มีสินค้า — เพิ่มเมนูที่แท็บ 📖 เมนู',
  ps_low:'ต่ำกว่า Safety {q}',ps_out:'หมด',ps_val:'มูลค่า {v}',ps_total:'{n} รายการ · มูลค่ารวม {v}',ps_found0:'ไม่พบสินค้า',
  ps_t_prod:'🍳 ผลิต',ps_t_send:'🚚 ส่งตามสาขา',ps_t_bill:'🧾 บิล',ps_r30:'30 วัน',ps_r90:'90 วัน',ps_rall:'ทั้งหมด',
  ps_have:'มีอยู่ {q} {u}',ps_cost:'ต้นทุน/หน่วย {v}',ps_noread:'อ่านประวัติไม่ได้ — ลองกด ⟳ อีกครั้ง',ps_reload:'⟳ โหลดใหม่',
  ps_p_none:'ยังไม่มีประวัติผลิตในช่วงนี้',ps_p_got:'ได้ {q} {u}',ps_p_plan:'สั่ง {q}',ps_p_unit:'{v}/หน่วย',ps_p_sum:'ผลิต {n} ครั้ง · รวม {q} {u}',
  ps_s_none:'ยังไม่มีการส่งในช่วงนี้',ps_s_sum:'ส่ง {q} {u} · {v} · {n} บิล',ps_s_all:'รวมทุกสาขา',
  ps_b_none:'ยังไม่มีบิลในช่วงนี้',ps_b_paid:'จ่ายแล้ว',ps_b_unpaid:'ค้างจ่าย',ps_b_void:'ยกเลิก',ps_b_manual:'✋ เรียกเพิ่ม',ps_more:'แสดง {n} รายการล่าสุด'},
en:{nav_pstock:'Product stock',ps_sub:'Finished products and how many are left — tap a product for its production, delivery and bill history',ps_none:'No products yet — add one on 📖 Menus',
  ps_low:'Below Safety {q}',ps_out:'Out',ps_val:'Value {v}',ps_total:'{n} products · total value {v}',ps_found0:'No products found',
  ps_t_prod:'🍳 Production',ps_t_send:'🚚 By branch',ps_t_bill:'🧾 Bills',ps_r30:'30 days',ps_r90:'90 days',ps_rall:'All',
  ps_have:'In stock {q} {u}',ps_cost:'Cost/unit {v}',ps_noread:'Could not read the history — tap ⟳ again',ps_reload:'⟳ Reload',
  ps_p_none:'No production in this period',ps_p_got:'Made {q} {u}',ps_p_plan:'planned {q}',ps_p_unit:'{v}/unit',ps_p_sum:'{n} runs · {q} {u} total',
  ps_s_none:'No deliveries in this period',ps_s_sum:'Sent {q} {u} · {v} · {n} bills',ps_s_all:'All branches',
  ps_b_none:'No bills in this period',ps_b_paid:'Paid',ps_b_unpaid:'Unpaid',ps_b_void:'Cancelled',ps_b_manual:'✋ Extra',ps_more:'Showing the latest {n}'},
lo:{nav_pstock:'ສະຕັອກສິນຄ້າ',ps_sub:'ສິນຄ້າທີ່ຄົວເຮັດແລ້ວ ເຫຼືອເທົ່າໃດ — ແຕະສິນຄ້າເພື່ອເບິ່ງປະຫວັດຜະລິດ ສົ່ງສາຂາ ແລະ ບິນ',ps_none:'ຍັງບໍ່ມີສິນຄ້າ — ເພີ່ມເມນູທີ່ແທັບ 📖 ເມນູ',
  ps_low:'ຕ່ຳກວ່າ Safety {q}',ps_out:'ໝົດ',ps_val:'ມູນຄ່າ {v}',ps_total:'{n} ລາຍການ · ມູນຄ່າລວມ {v}',ps_found0:'ບໍ່ພົບສິນຄ້າ',
  ps_t_prod:'🍳 ຜະລິດ',ps_t_send:'🚚 ສົ່ງຕາມສາຂາ',ps_t_bill:'🧾 ບິນ',ps_r30:'30 ມື້',ps_r90:'90 ມື້',ps_rall:'ທັງໝົດ',
  ps_have:'ມີຢູ່ {q} {u}',ps_cost:'ຕົ້ນທຶນ/ໜ່ວຍ {v}',ps_noread:'ອ່ານປະຫວັດບໍ່ໄດ້ — ລອງກົດ ⟳ ອີກຄັ້ງ',ps_reload:'⟳ ໂຫຼດໃໝ່',
  ps_p_none:'ຍັງບໍ່ມີປະຫວັດຜະລິດໃນຊ່ວງນີ້',ps_p_got:'ໄດ້ {q} {u}',ps_p_plan:'ສັ່ງ {q}',ps_p_unit:'{v}/ໜ່ວຍ',ps_p_sum:'ຜະລິດ {n} ເທື່ອ · ລວມ {q} {u}',
  ps_s_none:'ຍັງບໍ່ມີການສົ່ງໃນຊ່ວງນີ້',ps_s_sum:'ສົ່ງ {q} {u} · {v} · {n} ບິນ',ps_s_all:'ລວມທຸກສາຂາ',
  ps_b_none:'ຍັງບໍ່ມີບິນໃນຊ່ວງນີ້',ps_b_paid:'ຈ່າຍແລ້ວ',ps_b_unpaid:'ຄ້າງຈ່າຍ',ps_b_void:'ຍົກເລີກ',ps_b_manual:'✋ ເອີ້ນເພີ່ມ',ps_more:'ສະແດງ {n} ລາຍການລ່າສຸດ'},
my:{nav_pstock:'ကုန်ပစ္စည်းစတော့',ps_sub:'မီးဖိုချောင် ထုတ်ပြီးပစ္စည်းများ ဘယ်လောက်ကျန်သည် — ထုတ်လုပ်/ပို့/ဘေလ် မှတ်တမ်းကြည့်ရန် ပစ္စည်းကို နှိပ်ပါ',ps_none:'ပစ္စည်း မရှိသေးပါ — 📖 မီနူးတွင် ထည့်ပါ',
  ps_low:'Safety {q} အောက်',ps_out:'ကုန်',ps_val:'တန်ဖိုး {v}',ps_total:'{n} ခု · စုစုပေါင်းတန်ဖိုး {v}',ps_found0:'ပစ္စည်း မတွေ့ပါ',
  ps_t_prod:'🍳 ထုတ်လုပ်',ps_t_send:'🚚 ဆိုင်ခွဲအလိုက်',ps_t_bill:'🧾 ဘေလ်',ps_r30:'ရက် 30',ps_r90:'ရက် 90',ps_rall:'အားလုံး',
  ps_have:'လက်ကျန် {q} {u}',ps_cost:'တစ်ယူနစ်ကုန်ကျ {v}',ps_noread:'မှတ်တမ်း မဖတ်နိုင်ပါ — ⟳ ကို ထပ်နှိပ်ပါ',ps_reload:'⟳ ပြန်ဖွင့်',
  ps_p_none:'ဤကာလတွင် ထုတ်လုပ်မှု မရှိပါ',ps_p_got:'ရ {q} {u}',ps_p_plan:'မှာ {q}',ps_p_unit:'{v}/ယူနစ်',ps_p_sum:'{n} ကြိမ် · စုစုပေါင်း {q} {u}',
  ps_s_none:'ဤကာလတွင် ပို့ခြင်း မရှိပါ',ps_s_sum:'ပို့ {q} {u} · {v} · ဘေလ် {n}',ps_s_all:'ဆိုင်ခွဲအားလုံး',
  ps_b_none:'ဤကာလတွင် ဘေလ် မရှိပါ',ps_b_paid:'ပေးပြီး',ps_b_unpaid:'မပေးရသေး',ps_b_void:'ပယ်ဖျက်',ps_b_manual:'✋ ထပ်တောင်း',ps_more:'နောက်ဆုံး {n} ခု ပြသည်'}
});
CSS.add(`
.ps-sub{color:var(--mut);font-size:14px;margin:-4px 0 10px}
.ps-tot{font-size:14px;margin:4px 0 8px;color:var(--mut)}
.ps-row{display:flex;gap:12px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:14px;background:var(--card);margin-bottom:8px;cursor:pointer;min-height:64px}
.ps-row:active{transform:scale(.99)}
.ps-row .mthumb,.ps-row .ithumb{flex:none}
.ps-row .grow{min-width:0}
.ps-row .ps-n{font-weight:800;font-size:16px;overflow-wrap:anywhere}
.ps-q{flex:none;text-align:right;min-width:72px}
.ps-q b{display:block;font-size:24px;font-family:var(--fh);color:var(--ink);line-height:1.1}
.ps-q span{font-size:12px;color:var(--mut)}
.ps-row.low{border-color:#f0c98a;background:#fff8ec}
.ps-row.out .ps-q b{color:var(--bad,#b3261e)}
.ps-hd{display:flex;gap:12px;align-items:center;margin-bottom:8px}
.ps-hd .ps-big{font-size:28px;font-weight:800;font-family:var(--fh)}
.ps-li{display:flex;gap:10px;align-items:flex-start;padding:10px 2px;border-bottom:1px solid var(--line)}
.ps-li:last-child{border-bottom:0}
.ps-li .grow{min-width:0;overflow-wrap:anywhere}
.ps-li .r{flex:none;text-align:right;font-weight:700}
.ps-li.tap{cursor:pointer}
.ps-br{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:0 0 8px;background:var(--card)}
.ps-br b{font-size:16px}
.ps-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:middle}
.ps-sum{font-weight:700;margin:6px 0 8px}
`);
let PS_CAT='',PS_Q='',PS_CUR=null,PS_TAB='prod',PS_RANGE='30',PS_DATA=null,PS_SEQ=0;
try{const v=LS.get('jjck_ps');if(v){if(['prod','send','bill'].includes(v.tab))PS_TAB=v.tab;if(['30','90','all'].includes(v.range))PS_RANGE=v.range;}}catch(e){}
function psSaveUi(){try{LS.set('jjck_ps',{tab:PS_TAB,range:PS_RANGE});}catch(e){}}
function psIcon(r){return (typeof MN_IC!=='undefined'&&MN_IC[(r&&r.cat)||''])||'🍳';}
function psLow(r){const s=num(r.target_qty);return s>0&&num(r.qty)<s-1e-9?s:0;}
function psVal(r){const c=recipeUnitCost(r);return c==null?null:rnd2(Math.max(0,num(r.qty))*c);}

RENDER.pstock=function(el){
  const act=activeRecipes();
  const cats=MENU_CATS.slice();act.forEach(r=>{const c=String(r.cat||'').trim()||'อื่นๆ';if(!cats.includes(c))cats.push(c);});
  const used=cats.filter(c=>act.some(r=>(String(r.cat||'').trim()||'อื่นๆ')===c));
  if(PS_CAT&&!used.includes(PS_CAT))PS_CAT='';
  const pills=[{k:'',lb:t('all'),n:act.length}].concat(used.map(c=>({k:c,lb:psIcon({cat:c})+' '+trCat(c),n:act.filter(r=>(String(r.cat||'').trim()||'อื่นๆ')===c).length})));
  el.innerHTML=dhead('📦 '+t('nav_pstock'))+'<div class="ps-sub">'+esc(t('ps_sub'))+'</div>'+
    (act.length?'<div id="psPills">'+pillBar(pills,PS_CAT,'psSetCat',{scroll:true})+'</div>'+searchBox('psQ',v=>{PS_Q=v;psPaintList();})+'<div class="ps-tot" id="psTot"></div><div id="psList"></div>':emptyBox(t('ps_none')));
  const q=document.getElementById('psQ');if(q&&PS_Q)q.value=PS_Q;
  if(act.length)psPaintList();
};
function psSetCat(k){PS_CAT=k;document.querySelectorAll('#psPills .pill').forEach(b=>b.classList.toggle('on',b.dataset.k===k));psPaintList();}
function psRows(){const q=supKey(PS_Q);
  return activeRecipes().filter(r=>(!PS_CAT||(String(r.cat||'').trim()||'อื่นๆ')===PS_CAT)&&(!q||supKey(r.name).includes(q)||supKey(dispName(r)).includes(q)))
    .sort((a,b)=>(!!psLow(b)-!!psLow(a))||String(dispName(a)).localeCompare(String(dispName(b)),'th'));}
function psPaintList(){
  const b=document.getElementById('psList');if(!b)return;const rows=psRows();
  let tv=0,anyV=false;rows.forEach(r=>{const v=psVal(r);if(v!=null){tv+=v;anyV=true;}});
  const tot=document.getElementById('psTot');if(tot)tot.textContent=t('ps_total',{n:rows.length,v:anyV?money(tv):'—'});
  if(!rows.length){b.innerHTML=emptyBox(t('ps_found0'));return;}
  b.innerHTML=rows.map(r=>{const low=psLow(r),q=num(r.qty),out=q<=1e-9,v=psVal(r);
    return '<div class="ps-row'+(low?' low':'')+(out?' out':'')+'" data-id="'+esc(r.id)+'" onclick="psOpen(this.dataset.id)">'+thumbHtml(r,psIcon(r))+
      '<div class="grow"><div class="ps-n">'+esc(dispName(r))+'</div><div class="xs mut">'+esc(trCat(r.cat||'อื่นๆ'))+(v!=null?' · '+esc(t('ps_val',{v:money(v)})):'')+'</div>'+
      (low?'<div class="xs amber">⚠️ '+esc(t('ps_low',{q:fmtQ(low)}))+'</div>':'')+'</div>'+
      '<div class="ps-q"><b>'+(out?esc(t('ps_out')):fmtQ(q))+'</b><span>'+esc(trUnit(r.yield_unit||''))+'</span></div><span class="mut">›</span></div>';}).join('');}

/* ---------- รายละเอียด + ประวัติ 3 แท็บ ---------- */
function psFrom(){return PS_RANGE==='all'?null:addDays(bizTodayISO(),-num(PS_RANGE));}
async function psOpen(id){
  const r=recipeById(id);if(!r)return;PS_CUR=id;PS_DATA=null;psPaintDetail();
  const seq=++PS_SEQ,from=psFrom();
  const pr=await tdGet('kc_productions',q=>{q=q.eq('recipe_id',id);if(from)q=q.gte('d',from);return q.order('d',{ascending:false}).limit(300);});
  const ln=await tdGet('kc_delivery_lines',q=>q.eq('recipe_id',id).order('id',{ascending:false}).limit(1000));
  let dl={ok:true,rows:[]};
  const ids=[...new Set((ln.rows||[]).map(l=>l.delivery_id))];
  if(ln.ok&&ids.length){const out=[];let ok=true;
    for(let i=0;i<ids.length;i+=150){const x=await tdGet('kc_deliveries',q=>{q=q.in('id',ids.slice(i,i+150));if(from)q=q.gte('d',from);return q;});if(!x.ok){ok=false;break;}out.push(...x.rows);}
    dl={ok,rows:out};}
  if(seq!==PS_SEQ||PS_CUR!==id)return;
  PS_DATA={pr,ln,dl};psPaintDetail();}
function psSetTab(k){PS_TAB=k;psSaveUi();psPaintDetail();}
function psSetRange(k){PS_RANGE=k;psSaveUi();if(PS_CUR)psOpen(PS_CUR);}
function psReload(){if(PS_CUR)psOpen(PS_CUR);}
function psPaintDetail(){
  const r=recipeById(PS_CUR);if(!r)return;const u=trUnit(r.yield_unit||''),c=recipeUnitCost(r);
  const tabs=[{k:'prod',lb:t('ps_t_prod')},{k:'send',lb:t('ps_t_send')},{k:'bill',lb:t('ps_t_bill')}];
  const ranges=[{k:'30',lb:t('ps_r30')},{k:'90',lb:t('ps_r90')},{k:'all',lb:t('ps_rall')}];
  let body='';
  if(!PS_DATA)body='<div class="spin"></div>';
  else if(PS_TAB==='prod')body=psProdHtml(r,u);
  else if(PS_TAB==='send')body=psSendHtml(r,u);
  else body=psBillHtml(r,u);
  const wasOpen=modalOpen&&modalOpen(),box=document.getElementById('modalBox'),st=wasOpen&&box?box.scrollTop:0;
  MODAL_BACK=null;
  openModal('<div class="ps-hd">'+thumbHtml(r,psIcon(r))+'<div class="grow"><h3 style="margin:0">'+esc(dispName(r))+'</h3>'+
      '<div class="ps-big">'+fmtQ(num(r.qty))+' <span class="sm mut">'+esc(u)+'</span></div>'+
      (c!=null?'<div class="xs mut">'+esc(t('ps_cost',{v:moneyU(c)}))+'</div>':'')+'</div></div>'+
    '<div id="psTabs">'+pillBar(tabs,PS_TAB,'psSetTab',{scroll:true})+'</div><div id="psRanges">'+pillBar(ranges,PS_RANGE,'psSetRange')+'</div>'+
    '<div id="psBody">'+body+'</div>'+
    '<div class="row" style="margin-top:10px"><button type="button" class="btn gh" onclick="psReload()">'+esc(t('ps_reload'))+'</button><button type="button" class="btn gh" style="margin-left:auto" onclick="psClose()">'+esc(t('close'))+'</button></div>');
  if(wasOpen&&box)box.scrollTop=st;}
function psClose(){PS_CUR=null;PS_DATA=null;MODAL_BACK=null;closeModal();}
function psBad(x){return '<div class="badbox">⚠ '+esc(t('ps_noread'))+(x&&x.err&&x.err.message?' · '+esc(x.err.message):'')+'</div>';}
function psProdHtml(r,u){
  const x=PS_DATA.pr;if(!x.ok)return psBad(x);
  const rows=x.rows||[];if(!rows.length)return emptyBox(t('ps_p_none'));
  const tq=rows.reduce((a,p)=>a+num(p.actual_qty),0);
  return '<div class="ps-sum">'+esc(t('ps_p_sum',{n:rows.length,q:fmtQ(rnd4(tq)),u}))+'</div>'+rows.map(p=>
    '<div class="ps-li"><div class="grow"><b>'+esc(dispDate(p.d))+'</b>'+(p.kind==='urgent'?' ⚡':p.kind==='refill'?' 🔄':'')+
    '<div class="xs mut">'+(num(p.plan_qty)>0?esc(t('ps_p_plan',{q:fmtQ(p.plan_qty)}))+' · ':'')+(p.cost_unit!=null?esc(t('ps_p_unit',{v:moneyU(p.cost_unit)})):'')+(p.by_name?' · '+esc(p.by_name):'')+'</div>'+
    (p.note?'<div class="xs mut">'+esc(p.note)+'</div>':'')+'</div><div class="r">'+esc(t('ps_p_got',{q:fmtQ(p.actual_qty),u}))+'</div></div>').join('');}
function psDelivs(){ // บิล (ไม่ยกเลิก · ในสิทธิ์สาขา) + บรรทัดของเมนูนี้ → [{d:delivery,q,amt}]
  const D=PS_DATA,map={};(D.dl.rows||[]).forEach(d=>{if(inBr(d.branch))map[String(d.id)]={d,q:0,amt:0};});
  (D.ln.rows||[]).forEach(l=>{const m=map[String(l.delivery_id)];if(!m)return;m.q=rnd4(m.q+num(l.sent));m.amt=rnd2(m.amt+num(l.amount));});
  return Object.values(map).sort((a,b)=>String(b.d.d).localeCompare(String(a.d.d))||String(b.d.bill_no||'').localeCompare(String(a.d.bill_no||'')));}
function psBrColor(code){const b=(S.branchesAll||[]).find(x=>x.code===code);const c=String((b&&b.color)||'');return /^#[0-9a-fA-F]{3,8}$/.test(c)?c:'#6B0F12';}
function psSendHtml(r,u){
  const D=PS_DATA;if(!D.ln.ok)return psBad(D.ln);if(!D.dl.ok)return psBad(D.dl);
  const L=psDelivs().filter(x=>x.d.status!=='void'&&x.q>0);if(!L.length)return emptyBox(t('ps_s_none'));
  const by={};L.forEach(x=>{const k=x.d.branch||'—';const g=by[k]=by[k]||{code:k,name:branchName(k)||x.d.branch_name||k,q:0,amt:0,n:0,rows:[]};g.q=rnd4(g.q+x.q);g.amt=rnd2(g.amt+x.amt);g.n++;g.rows.push(x);});
  const G=Object.values(by).sort((a,b)=>b.q-a.q);
  const all={q:rnd4(G.reduce((a,g)=>a+g.q,0)),amt:rnd2(G.reduce((a,g)=>a+g.amt,0)),n:L.length};
  let h=G.length>1?'<div class="ps-sum">'+esc(t('ps_s_all'))+': '+esc(t('ps_s_sum',{q:fmtQ(all.q),u,v:money(all.amt),n:all.n}))+'</div>':'';
  h+=G.map(g=>'<div class="ps-br"><b><span class="ps-dot" style="background:'+esc(psBrColor(g.code))+'"></span>'+esc(g.name)+'</b>'+
    '<div class="sm">'+esc(t('ps_s_sum',{q:fmtQ(g.q),u,v:money(g.amt),n:g.n}))+'</div>'+
    g.rows.slice(0,60).map(x=>'<div class="ps-li tap" data-id="'+esc(x.d.id)+'" onclick="psBill(this.dataset.id)"><div class="grow">'+esc(dispDate(x.d.d))+
      (sdIsManual&&sdIsManual(x.d)?' <span class="xs">'+esc(t('ps_b_manual'))+'</span>':'')+'<div class="xs mut">'+esc(x.d.bill_no||'')+'</div></div><div class="r">'+fmtQ(x.q)+' '+esc(u)+'</div></div>').join('')+'</div>').join('');
  return h;}
function psBillHtml(r,u){
  const D=PS_DATA;if(!D.ln.ok)return psBad(D.ln);if(!D.dl.ok)return psBad(D.dl);
  const L=psDelivs();if(!L.length)return emptyBox(t('ps_b_none'));
  const max=200,show=L.slice(0,max);
  return (L.length>max?'<div class="xs mut">'+esc(t('ps_more',{n:max}))+'</div>':'')+show.map(x=>{const st=x.d.status==='void'?'void':(x.d.status==='paid'||x.d.paid_at)?'paid':'unpaid';
    const chip=st==='void'?'<span class="chip bad">'+esc(t('ps_b_void'))+'</span>':st==='paid'?'<span class="chip ok">'+esc(t('ps_b_paid'))+'</span>':'<span class="chip warn">'+esc(t('ps_b_unpaid'))+'</span>';
    return '<div class="ps-li tap" data-id="'+esc(x.d.id)+'" onclick="psBill(this.dataset.id)"><div class="grow"><b>'+esc(x.d.bill_no||'—')+'</b> '+chip+
      '<div class="xs mut"><span class="ps-dot" style="background:'+esc(psBrColor(x.d.branch))+'"></span>'+esc(branchName(x.d.branch)||x.d.branch_name||x.d.branch||'')+' · '+esc(dispDate(x.d.d))+' · '+fmtQ(x.q)+' '+esc(u)+'</div></div>'+
      '<div class="r">'+esc(money(x.amt))+'</div></div>';}).join('');}
async function psBill(id){ // เปิดบิล (blDetail ของแท็บบิลสาขา) แล้วกลับมาหน้าประวัติสินค้าเดิม
  const back=PS_CUR;await blDetail(id);
  if(back&&typeof modalOpen==='function'&&modalOpen())MODAL_BACK=()=>{PS_CUR=back;psPaintDetail();};}
