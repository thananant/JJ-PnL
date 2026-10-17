/* ============================================================
   📋 นับสต๊อก — count (ct*)
   สองส่วน 🥬 วัตถุดิบ / 🍲 สินค้าที่ผลิตแล้ว (ปุ่มเลือกบน) · ชิปหมวด (นับแล้ว/ทั้งหมด) · การ์ดนับ (รูป ชื่อ "ในระบบ X หน่วยนับ" − [ช่อง] ＋ · หมด)
   พิมพ์แล้วแก้ในที่ ไม่วาดหน้าใหม่ (คีย์บอร์ดมือถือไม่หุบ) · แถบติดล่าง "นับแล้ว a/b · ยกเลิก · 💾 บันทึก"
   ร่างใน localStorage jjck_ct_draft (วันเดียวกัน ≤12 ชม.) — สลับแท็บ/ลากหน้าลงรีเฟรชแล้วตัวเลขยังอยู่
   หน่วยนับ: วัตถุดิบ = countUnitOf (ตั้งเอง → บรรจุเล็กสุด → หน่วยหลัก) · สินค้า = หน่วยผลิต (yield_unit) · สต๊อกในฐานข้อมูลยังเป็นหน่วยหลักเสมอ
   บันทึก = สรุปเฉพาะที่ต่าง → kc_counts (1 แถว/ส่วน) + kc_count_lines (ทุกรายการที่นับ) + kc_moves 'adjust' + ck_add_qty (ผ่าน pushMoves)
   ctDetail(id) = หน้าต่างผลนับ (โมดูลประวัติเรียก)
   ============================================================ */
I18N.add({
th:{ct_items:'วัตถุดิบ',ct_recipes:'สินค้าที่ผลิตแล้ว',ct_sys:'ในระบบ',ct_out:'หมด',ct_counted:'นับแล้ว {a}/{b}',ct_save:'💾 บันทึก',
  ct_hint:'พิมพ์จำนวนที่นับได้ตามหน่วยที่ร้านนับจริง · แตะ "หมด" ถ้าไม่เหลือ · ตัวเลขเก็บไว้ให้จนกว่าจะกดบันทึก',
  ct_draft:'กู้ตัวเลขที่นับค้างไว้ {n} รายการ',ct_cancel_q:'ทิ้งตัวเลขที่นับไว้ทั้งหมด?',ct_no_match:'ไม่พบรายการที่ค้นหา',ct_none:'ยังไม่มีรายการให้นับ',
  ct_unit_eq:'1 {u} = {q} {b}',ct_sum_t:'สรุปผลนับ',ct_sum_n:'นับแล้ว {n}',ct_sum_ok:'ตรง {n}',ct_sum_diff:'ต่าง {n}',
  ct_sum_none:'นับแล้วตรงกับระบบทุกรายการ ✅',ct_sum_hint:'ระบบจะปรับยอดให้เท่ากับที่นับได้ และบันทึกลงประวัติ',
  ct_col_sys:'ในระบบ',ct_col_cnt:'นับได้',ct_col_diff:'ต่าง',ct_apply:'✅ ปรับยอดตามที่นับ ({n})',ct_apply0:'✅ บันทึกว่านับแล้ว',ct_note_ph:'หมายเหตุ (ไม่บังคับ)',
  ct_sql_block:'ยังไม่ได้รัน SQL jjmk_kitchen2.sql — บันทึกผลนับไม่ได้',ct_saved:'บันทึกผลนับแล้ว ✅',ct_move_note:'นับสต๊อก',
  ct_not_saved:'บันทึกไม่สำเร็จ — ไม่มีอะไรถูกบันทึก ลองใหม่อีกครั้ง',ct_detail_t:'ผลนับ',ct_by:'โดย',ct_noread:'อ่านผลนับไม่ได้',ct_lines_n:'{n} รายการ',ct_section:'ส่วน'},
en:{ct_items:'Ingredients',ct_recipes:'Finished products',ct_sys:'System',ct_out:'Out',ct_counted:'Counted {a}/{b}',ct_save:'💾 Save',
  ct_hint:'Type what you counted in the unit you really count in · tap "Out" if none left · numbers are kept until you save',
  ct_draft:'Restored {n} unsaved counts',ct_cancel_q:'Discard everything counted so far?',ct_no_match:'No item matches',ct_none:'Nothing to count yet',
  ct_unit_eq:'1 {u} = {q} {b}',ct_sum_t:'Count summary',ct_sum_n:'Counted {n}',ct_sum_ok:'Match {n}',ct_sum_diff:'Differ {n}',
  ct_sum_none:'Everything matches the system ✅',ct_sum_hint:'Stock will be adjusted to what you counted and saved to history',
  ct_col_sys:'System',ct_col_cnt:'Counted',ct_col_diff:'Diff',ct_apply:'✅ Adjust stock ({n})',ct_apply0:'✅ Save as counted',ct_note_ph:'Note (optional)',
  ct_sql_block:'jjmk_kitchen2.sql has not been run — cannot save the count',ct_saved:'Count saved ✅',ct_move_note:'นับสต๊อก',
  ct_not_saved:'NOT saved — please try again',ct_detail_t:'Count result',ct_by:'by',ct_noread:'Could not read the count',ct_lines_n:'{n} lines',ct_section:'Section'},
lo:{ct_items:'ວັດຖຸດິບ',ct_recipes:'ສິນຄ້າທີ່ຜະລິດແລ້ວ',ct_sys:'ໃນລະບົບ',ct_out:'ໝົດ',ct_counted:'ນັບແລ້ວ {a}/{b}',ct_save:'💾 ບັນທຶກ',
  ct_hint:'ພິມຈຳນວນທີ່ນັບໄດ້ຕາມຫົວໜ່ວຍທີ່ຮ້ານນັບແທ້ · ແຕະ "ໝົດ" ຖ້າບໍ່ເຫຼືອ · ຕົວເລກເກັບໄວ້ໃຫ້ຈົນກວ່າຈະກົດບັນທຶກ',
  ct_draft:'ກູ້ຕົວເລກທີ່ນັບຄ້າງໄວ້ {n} ລາຍການ',ct_cancel_q:'ຖິ້ມຕົວເລກທີ່ນັບໄວ້ທັງໝົດ?',ct_no_match:'ບໍ່ພົບລາຍການທີ່ຄົ້ນຫາ',ct_none:'ຍັງບໍ່ມີລາຍການໃຫ້ນັບ',
  ct_unit_eq:'1 {u} = {q} {b}',ct_sum_t:'ສະຫຼຸບຜົນນັບ',ct_sum_n:'ນັບແລ້ວ {n}',ct_sum_ok:'ຕົງ {n}',ct_sum_diff:'ຕ່າງ {n}',
  ct_sum_none:'ນັບແລ້ວຕົງກັບລະບົບທຸກລາຍການ ✅',ct_sum_hint:'ລະບົບຈະປັບຍອດໃຫ້ເທົ່າກັບທີ່ນັບໄດ້ ແລະ ບັນທຶກລົງປະຫວັດ',
  ct_col_sys:'ໃນລະບົບ',ct_col_cnt:'ນັບໄດ້',ct_col_diff:'ຕ່າງ',ct_apply:'✅ ປັບຍອດຕາມທີ່ນັບ ({n})',ct_apply0:'✅ ບັນທຶກວ່ານັບແລ້ວ',ct_note_ph:'ໝາຍເຫດ (ບໍ່ບັງຄັບ)',
  ct_sql_block:'ຍັງບໍ່ໄດ້ແລ່ນ SQL jjmk_kitchen2.sql — ບັນທຶກຜົນນັບບໍ່ໄດ້',ct_saved:'ບັນທຶກຜົນນັບແລ້ວ ✅',ct_move_note:'นับสต๊อก',
  ct_not_saved:'ບໍ່ໄດ້ບັນທຶກ — ລອງໃໝ່ອີກຄັ້ງ',ct_detail_t:'ຜົນນັບ',ct_by:'ໂດຍ',ct_noread:'ອ່ານຜົນນັບບໍ່ໄດ້',ct_lines_n:'{n} ລາຍການ',ct_section:'ສ່ວນ'},
my:{ct_items:'ကုန်ကြမ်း',ct_recipes:'ထုတ်ကုန်',ct_sys:'စနစ်တွင်',ct_out:'ကုန်',ct_counted:'ရေတွက်ပြီး {a}/{b}',ct_save:'💾 သိမ်း',
  ct_hint:'အမှန်ရေတွက်သည့်ယူနစ်ဖြင့် ရေတွက်ရသည့်အရေအတွက်ကို ရိုက်ပါ · မကျန်လျှင် "ကုန်" ကိုနှိပ်ပါ · မသိမ်းမချင်း ကိန်းဂဏန်းများ ကျန်နေမည်',
  ct_draft:'မသိမ်းရသေးသော ရေတွက်မှု {n} ခု ပြန်ရပြီ',ct_cancel_q:'ရေတွက်ထားသမျှ အားလုံးကို ဖျက်မလား?',ct_no_match:'ရှာသည့်အရာ မတွေ့ပါ',ct_none:'ရေတွက်ရန် မရှိသေးပါ',
  ct_unit_eq:'1 {u} = {q} {b}',ct_sum_t:'ရေတွက်မှု အနှစ်ချုပ်',ct_sum_n:'ရေတွက်ပြီး {n}',ct_sum_ok:'ကိုက်ညီ {n}',ct_sum_diff:'ကွာခြား {n}',
  ct_sum_none:'အားလုံး စနစ်နှင့် ကိုက်ညီသည် ✅',ct_sum_hint:'ရေတွက်ရသည့်အတိုင်း လက်ကျန်ကို ပြင်ပြီး မှတ်တမ်းတွင် သိမ်းမည်',
  ct_col_sys:'စနစ်',ct_col_cnt:'ရေတွက်ရ',ct_col_diff:'ကွာခြား',ct_apply:'✅ ရေတွက်သည့်အတိုင်း ပြင်ရန် ({n})',ct_apply0:'✅ ရေတွက်ပြီးဟု သိမ်းရန်',ct_note_ph:'မှတ်ချက် (မဖြစ်မနေမဟုတ်)',
  ct_sql_block:'jjmk_kitchen2.sql မလုပ်ရသေးပါ — ရေတွက်မှုကို သိမ်း၍မရပါ',ct_saved:'ရေတွက်မှု သိမ်းပြီး ✅',ct_move_note:'นับสต๊อก',
  ct_not_saved:'မသိမ်းရသေးပါ — ထပ်စမ်းပါ',ct_detail_t:'ရေတွက်မှု ရလဒ်',ct_by:'မှ',ct_noread:'ရေတွက်မှုကို ဖတ်မရပါ',ct_lines_n:'{n} ကြောင်း',ct_section:'အပိုင်း'}
});
CSS.add(`
.ctchips{margin-top:-2px}
.ctchips .pill{padding:7px 12px;font-size:12.5px}
.ctsech{display:flex;align-items:center;gap:8px;font-family:var(--fh);font-weight:700;color:var(--wine);font-size:14px;margin:6px 2px 8px}
.ctsech .sp{margin-left:auto;font-weight:500;color:var(--mut);font-size:12px}
.ctsec .igrid{margin-bottom:14px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}   /* = .grid ของแอพนับสต๊อก: มือถือการ์ดละแถว ช่องตัวเลขไม่ถูกบีบ */
@media(max-width:640px){.ctsec .igrid{grid-template-columns:1fr}}
.skcard .skhead{display:flex;gap:10px;align-items:flex-start;min-width:0}
.skcard .skhead .ithumb{width:56px;height:56px;flex:none;border-radius:12px;font-size:24px}   /* รูปสี่เหลี่ยมข้างชื่อแบบแอพนับสต๊อก — แถบกว้าง 64px ทำให้รูปถูกตัด/ขนาดเพี้ยน (เจ้าของเจอ 2026-10-17) */
.skcard .skttl{min-width:0;flex:1}
.skcard .iname{min-height:auto}
.skcard .isub b{font-family:var(--fh);font-size:14.5px;color:var(--ink)}
.skstep .ctu{flex:none;font-size:13px;max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.skcard .skfoot .outb{min-height:44px;padding:8px 14px}   /* ปุ่มแตะ ≥44px บนมือถือ */
.pinbar .ctacts{margin-left:auto;display:flex;gap:8px}.pinbar .ctacts .btn{margin-left:0}
.ctsum tr.ctk td{background:#FBF6EA;font-weight:700;font-family:var(--fh);color:var(--wine)}
.ctsum td .xs{display:block;color:var(--mut)}
.ctsum tr.ctrow.pos td.n.d{color:var(--ok)}.ctsum tr.ctrow.neg td.n.d{color:var(--bad)}
@media(max-width:339px){.ctsum td,.ctsum th{padding:6px 4px;font-size:12.5px}.ctsum td .xs{display:none}}   /* จอพับ 280px: ให้คอลัมน์ "ต่าง" อยู่ในจอ */
`);
let CT={};                                            // {'kind|id':{kind,id,v:'ที่พิมพ์',u:'หน่วยนับตอนพิมพ์'}}
let CT_KIND=(LS.get('jjck_ct_kind','')==='recipe')?'recipe':'item';
let CT_CAT=String(LS.get('jjck_ct_cat','')||'');
let CT_Q='';
const CT_DRAFT='jjck_ct_draft',CT_DRAFT_MS=12*3600*1000;
const CT_IC={'เนื้อสัตว์':'🥩','ผัก':'🥬','ของแห้ง':'🌾','เครื่องปรุง':'🧂','บรรจุภัณฑ์':'📦','อื่นๆ':'🧺','น้ำจิ้ม':'🥣','ของหมัก':'🍖','น้ำซุป':'🍲','ของหวาน':'🍰'};
const ctIcon=(kind,o)=>CT_IC[ctCatOf(o)]||(kind==='item'?'🥬':'🍲');
const ctObj=(kind,id)=>kind==='item'?itemById(id):recipeById(id);
const ctList=kind=>kind==='item'?activeItems():activeRecipes();
const ctCatOf=o=>String(o&&o.cat||'').trim()||'อื่นๆ';
const ctBase=(kind,o)=>kind==='item'?(o.unit||''):(o.yield_unit||'');
function ctUnit(kind,o){if(kind!=='item')return {u:o.yield_unit||'',f:1};const u=countUnitOf(o);return {u,f:unitFactor(o,u)||1};}   // หน่วยนับ + 1 หน่วยนับ = กี่หน่วยหลัก
function ctCounted(e){if(!e)return false;const s=String(e.v==null?'':e.v).replace(/,/g,'').trim();if(s==='')return false;const n=Number(s);return isFinite(n)&&n>=0;}
function ctTotal(e,o,kind){const f=(kind==='item'&&e.u)?(unitFactor(o,e.u)||ctUnit(kind,o).f):ctUnit(kind,o).f;return rnd4(num(e.v)*f);}   // → หน่วยหลัก
function ctCats(kind){const L=ctList(kind),c=(kind==='item'?ITEM_CATS:MENU_CATS).slice();L.forEach(o=>{const x=ctCatOf(o);if(!c.includes(x))c.push(x);});return c.filter(x=>L.some(o=>ctCatOf(o)===x));}
function ctCntOf(L,kind){return L.filter(o=>ctCounted(CT[kind+'|'+o.id])).length;}
function ctAny(){return Object.values(CT).some(ctCounted);}

/* ---------- ร่าง ---------- */
function ctDraftGet(){const d=LS.get(CT_DRAFT,null);if(!d||!d.e||d.d!==bizTodayISO()||Date.now()-num(d.t)>CT_DRAFT_MS){if(d)LS.del(CT_DRAFT);return null;}return d;}
function ctDraftSave(){const e={};Object.values(CT).forEach(x=>{if(ctCounted(x))e[x.kind+'|'+x.id]={v:String(x.v),u:x.u||''};});
  if(Object.keys(e).length)LS.set(CT_DRAFT,{t:Date.now(),d:bizTodayISO(),e});else LS.del(CT_DRAFT);}
function ctDraftClear(){LS.del(CT_DRAFT);}
function ctDraftRestore(){const d=ctDraftGet();if(!d)return 0;let n=0;
  Object.entries(d.e).forEach(([k,x])=>{const p=k.indexOf('|'),kind=k.slice(0,p),id=k.slice(p+1);if(!ctObj(kind,id))return;
    CT[k]={kind,id,v:String(x&&x.v!=null?x.v:''),u:(x&&x.u)||''};if(ctCounted(CT[k]))n++;else delete CT[k];});
  if(n)toast('📝 '+t('ct_draft',{n}));return n;}
function ctNormUnits(){ // หน่วยนับของสินค้าเปลี่ยนหลังพิมพ์ไปแล้ว → แปลงตัวเลขที่พิมพ์ไว้เป็นหน่วยใหม่
  Object.values(CT).forEach(e=>{if(e.kind!=='item'||!ctCounted(e)||!e.u)return;const o=itemById(e.id);if(!o)return;
    const U=ctUnit('item',o);if(e.u===U.u)return;const f0=unitFactor(o,e.u);if(f0)e.v=String(rnd4(num(e.v)*f0/U.f));e.u=U.u;});}

/* ---------- หน้า ---------- */
RENDER.count=function(el){
  if(!ctAny())ctDraftRestore();
  ctNormUnits();
  const kind=CT_KIND,cats=ctCats(kind);
  if(CT_CAT&&!cats.includes(CT_CAT))CT_CAT='';
  const nI=ctList('item'),nR=ctList('recipe');
  const pills=[{k:'item',lb:'🥬 '+t('ct_items'),n:ctCntOf(nI,'item')+'/'+nI.length},{k:'recipe',lb:'🍲 '+t('ct_recipes'),n:ctCntOf(nR,'recipe')+'/'+nR.length}];
  let h=dhead('📋 '+t('nav_count'),esc(dispDate(bizTodayISO())))+sqlNeedBox()+
    pillBar(pills,kind,k=>ctSetKind(k),{scroll:1,cls:'ctkind'})+   // closure เสมอ — ชื่อฟังก์ชันแบบสตริงทำให้เครื่องหมายคำพูดใน onclick ชนกัน
    (ctAny()?'':'<div class="note">'+esc(t('ct_hint'))+'</div>')+
    '<div id="ctChips">'+ctChipsHtml()+'</div>'+
    searchBox('ctQ',v=>ctFilter(v))+
    '<div id="ctGrid">'+ctGridHtml()+'</div><div class="card empty" id="ctNone" style="display:none">'+esc(t('ct_no_match'))+'</div>';
  el.innerHTML=h;const q=document.getElementById('ctQ');if(q)q.value=CT_Q;ctFilter(CT_Q);ctBar();ctMeta();
};
function ctChipsHtml(){const kind=CT_KIND,L=ctList(kind),cats=ctCats(kind);
  const chips=[{k:'',lb:t('all'),n:ctCntOf(L,kind)+'/'+L.length}].concat(cats.map(c=>{const M=L.filter(o=>ctCatOf(o)===c);return {k:c,lb:(CT_IC[c]||'🧺')+' '+trCat(c),n:ctCntOf(M,kind)+'/'+M.length};}));
  return pillBar(chips,CT_CAT,k=>ctSetCat(k),{scroll:1,cls:'ctchips'});}   // closure — หมวดเป็นภาษาไทย ใส่ใน onclick ตรง ๆ ไม่ได้
function ctGridHtml(){const kind=CT_KIND,L=ctList(kind),cats=ctCats(kind).filter(c=>!CT_CAT||c===CT_CAT);
  if(!L.length)return '<div class="card empty">'+esc(t('ct_none'))+'</div>';
  const byName=(a,b)=>dispName(a).localeCompare(dispName(b),'th');
  return cats.map(c=>{const M=L.filter(o=>ctCatOf(o)===c).sort(byName);
    return '<div class="ctsec" data-c="'+esc(c)+'"><div class="ctsech">'+(CT_IC[c]||'🧺')+' '+esc(trCat(c))+'<span class="sp">'+M.length+'</span></div><div class="igrid">'+M.map(o=>ctCard(kind,o)).join('')+'</div></div>';}).join('');}
function ctCard(kind,o){
  const k=kind+'|'+o.id,e=CT[k],counted=ctCounted(e),U=ctUnit(kind,o),base=ctBase(kind,o);
  return '<div class="icard skcard'+(counted?' cnt':'')+'" data-k="'+esc(k)+'" data-n="'+esc(supKey(dispName(o)+' '+o.name+' '+ctCatOf(o)))+'">'+
    '<div class="skhead">'+thumbHtml(o,ctIcon(kind,o),'ithumb')+'<div class="skttl">'+
    '<div class="iname">'+esc(dispName(o))+'</div>'+
    '<div class="isub">'+esc(t('ct_sys'))+' <b>'+fmtQ(rnd2(num(o.qty)/U.f))+'</b> '+esc(trUnit(U.u))+
      (U.u!==base?'<br><span class="xs">'+esc(t('ct_unit_eq',{u:trUnit(U.u),q:fmtQ(U.f),b:trUnit(base)}))+'</span>':'')+'</div></div></div>'+
    '<div class="skstep"><button type="button" aria-label="-" onclick="ctBump(this,-1)">−</button>'+
    '<input type="text" inputmode="decimal" placeholder="0" class="'+(counted?'has':'')+'" value="'+esc(counted?e.v:'')+'" oninput="ctInput(this)" onchange="ctInput(this)">'+
    '<button type="button" class="plus" aria-label="+" onclick="ctBump(this,1)">＋</button><span class="b ctu">'+esc(trUnit(U.u))+'</span></div>'+
    '<div class="skfoot"><span class="b cteq" style="color:var(--gold)">'+ctEqTxt(e,o,kind)+'</span>'+
    '<button type="button" class="outb'+(counted&&num(e.v)===0?' on':'')+'" onclick="ctZero(this)">'+esc(t('ct_out'))+'</button></div></div>';}
function ctEqTxt(e,o,kind){const U=ctUnit(kind,o),base=ctBase(kind,o);return (ctCounted(e)&&U.u!==base)?'= '+fmtQ(ctTotal(e,o,kind))+' '+esc(trUnit(base)):'';}
function ctCardOf(el){return el&&el.closest?el.closest('.skcard'):null;}
function ctInput(el){ // พิมพ์แล้วแก้ในที่ — การ์ดนี้ + ตัวนับ + ชิป + แถบล่าง (ไม่วาดหน้าใหม่ คีย์บอร์ดไม่หุบ)
  const card=ctCardOf(el);if(!card)return;const k=card.dataset.k,p=k.indexOf('|'),kind=k.slice(0,p),id=k.slice(p+1);
  const o=ctObj(kind,id);if(!o)return;
  const e=CT[k]||(CT[k]={kind,id,v:'',u:''});e.v=String(el.value==null?'':el.value);e.u=ctUnit(kind,o).u;
  const c=ctCounted(e);
  card.classList.toggle('cnt',c);el.classList.toggle('has',c);
  const ob=card.querySelector('.outb');if(ob)ob.classList.toggle('on',c&&num(e.v)===0);
  const eq=card.querySelector('.cteq');if(eq)eq.innerHTML=ctEqTxt(e,o,kind);
  if(!c)delete CT[k];
  ctDraftSave();ctMeta();}
function ctBump(btn,d){ // −/＋ ทีละ 1 หน่วยนับ (ไม่ต่ำกว่า 0)
  const card=ctCardOf(btn),inp=card&&card.querySelector('.skstep input');if(!inp)return;
  let v=rnd4(num(inp.value)+d);if(v<0)v=0;inp.value=String(v);ctInput(inp);}
function ctZero(btn){const card=ctCardOf(btn),inp=card&&card.querySelector('.skstep input');if(!inp)return;inp.value='0';ctInput(inp);}
function ctMeta(){ // ตัวนับทุกจุด (แถบล่าง · ปุ่มส่วน · ชิป) — แก้ในที่
  const kind=CT_KIND,L=ctList(kind),n=ctCntOf(L,kind);
  const v=document.getElementById('ctN');if(v)v.textContent=t('ct_counted',{a:n,b:L.length});
  const b=document.getElementById('ctGo');if(b)b.disabled=!ctAny();
  document.querySelectorAll('#view-count .ctkind .pill').forEach(x=>{const kk=x.dataset.k,M=ctList(kk);const s=x.querySelector('.bdg');if(s)s.textContent=ctCntOf(M,kk)+'/'+M.length;});
  document.querySelectorAll('#view-count .ctchips .pill').forEach(x=>{const c=x.dataset.k,M=c?L.filter(o=>ctCatOf(o)===c):L;const s=x.querySelector('.bdg');if(s)s.textContent=ctCntOf(M,kind)+'/'+M.length;});}
function ctBar(){if(S.tab!=='count')return;
  pinnedBar('<span class="v" id="ctN"></span><span class="ctacts"><button class="btn gh" onclick="ctCancel()">'+esc(t('cancel'))+'</button>'+
    '<button class="btn" id="ctGo" onclick="ctSummary()">'+esc(t('ct_save'))+'</button></span>');}
function ctPaint(){const el=document.getElementById('view-count');if(el&&S.tab==='count')RENDER.count(el);}
function ctSetKind(k){CT_KIND=k==='recipe'?'recipe':'item';LS.set('jjck_ct_kind',CT_KIND);CT_CAT='';LS.set('jjck_ct_cat','');ctPaint();}
function ctSetCat(k){CT_CAT=String(k||'');LS.set('jjck_ct_cat',CT_CAT);   // เปลี่ยนหมวดในที่ — ไม่เลื่อนหน้ากลับบนสุด
  const g=document.getElementById('ctGrid');if(g)g.innerHTML=ctGridHtml();
  document.querySelectorAll('#view-count .ctchips .pill').forEach(x=>x.classList.toggle('on',x.dataset.k===CT_CAT));ctFilter(CT_Q);}
function ctFilter(v){CT_Q=String(v==null?'':v);const q=supKey(CT_Q);let any=0;
  document.querySelectorAll('#view-count .ctsec').forEach(s=>{let n=0;
    s.querySelectorAll('.skcard').forEach(c=>{const ok=!q||String(c.dataset.n||'').indexOf(q)>=0;c.style.display=ok?'':'none';if(ok)n++;});
    s.style.display=n?'':'none';any+=n;});
  const e=document.getElementById('ctNone');if(e)e.style.display=any?'none':'';}
async function ctCancel(){if(ctAny()){const ok=await confirm2(t('ct_cancel_q'),{danger:true});if(!ok)return;}CT={};ctDraftClear();ctPaint();}

/* ---------- สรุป + ปรับยอด ---------- */
function ctRows(){ // ทุกรายการที่นับ → {kind,id,o,name,disp,u,f,base,count_qty,sys,cnt,delta}
  const out=[];Object.values(CT).forEach(e=>{if(!ctCounted(e))return;const o=ctObj(e.kind,e.id);if(!o)return;
    const U=ctUnit(e.kind,o),base=ctBase(e.kind,o),cnt=ctTotal(e,o,e.kind),sys=num(o.qty);let delta=rnd4(cnt-sys);if(Math.abs(delta)<1e-9)delta=0;
    out.push({kind:e.kind,id:e.id,o,name:o.name,disp:dispName(o),u:U.u,f:U.f,base,count_qty:num(e.v),sys,cnt,delta});});
  const ord=r=>r.kind==='item'?0:1;out.sort((a,b)=>ord(a)-ord(b)||a.disp.localeCompare(b.disp,'th'));return out;}
function ctSumTable(rows){ // ตารางเฉพาะที่ต่าง (หน่วยนับ + แปลงเป็นหน่วยหลักถ้าไม่ใช่หน่วยเดียวกัน)
  let h='<div class="twrap"><table class="t ctsum"><thead><tr><th>'+esc(t('name'))+'</th><th class="n">'+esc(t('ct_col_sys'))+'</th><th class="n">'+esc(t('ct_col_cnt'))+'</th><th class="n">'+esc(t('ct_col_diff'))+'</th></tr></thead><tbody>';
  let last='';rows.forEach(r=>{if(r.kind!==last){last=r.kind;h+='<tr class="ctk"><td colspan="4">'+(r.kind==='item'?'🥬 '+esc(t('ct_items')):'🍲 '+esc(t('ct_recipes')))+'</td></tr>';}
    const v=x=>fmtQ(rnd2(x/r.f)),diffU=r.u!==r.base;   // แสดงเป็นหน่วยนับ 2 ตำแหน่ง (ค่าจริงที่เก็บเป็นหน่วยหลักไม่ปัด)
    h+='<tr class="ctrow '+(r.delta>0?'pos':'neg')+'" data-k="'+esc(r.kind+'|'+r.id)+'"><td>'+esc(r.disp)+'<span class="xs">'+esc(trUnit(r.u))+'</span></td>'+
      '<td class="n">'+v(r.sys)+(diffU?'<span class="xs">'+fmtQ(r.sys)+' '+esc(trUnit(r.base))+'</span>':'')+'</td>'+
      '<td class="n">'+v(r.cnt)+(diffU?'<span class="xs">'+fmtQ(r.cnt)+' '+esc(trUnit(r.base))+'</span>':'')+'</td>'+
      '<td class="n d b">'+(r.delta>0?'+':'')+v(r.delta)+(diffU?'<span class="xs">'+(r.delta>0?'+':'')+fmtQ(r.delta)+' '+esc(trUnit(r.base))+'</span>':'')+'</td></tr>';});
  return h+'</tbody></table></div>';}
async function ctRefreshLive(){ // ยอดในระบบสดของทุกรายการที่นับ (อีกเครื่องอาจเพิ่งรับ/ทำ/ส่งระหว่างนับ) + แก้ "ในระบบ" บนการ์ดในที่
  const rows=ctRows();await refreshRows('item',rows.filter(r=>r.kind==='item').map(r=>r.id));await refreshRows('recipe',rows.filter(r=>r.kind==='recipe').map(r=>r.id));
  document.querySelectorAll('#view-count .skcard').forEach(card=>{const k=card.dataset.k||'',p=k.indexOf('|'),o=ctObj(k.slice(0,p),k.slice(p+1));if(!o)return;
    const U=ctUnit(k.slice(0,p),o),b=card.querySelector('.isub b');if(b)b.textContent=fmtQ(rnd2(num(o.qty)/U.f));});}
async function ctSummary(){
  if(!ctRows().length){toast(t('ct_none'),true);return;}
  await ctRefreshLive();const rows=ctRows();if(!rows.length)return;
  const diffs=rows.filter(r=>r.delta!==0);
  let h='<h3>📋 '+esc(t('ct_sum_t'))+'</h3>'+
    '<div class="row" style="margin-bottom:10px"><span class="chip mid">'+esc(t('ct_sum_n',{n:rows.length}))+'</span><span class="chip ok">'+esc(t('ct_sum_ok',{n:rows.length-diffs.length}))+'</span>'+
    '<span class="chip '+(diffs.length?'warn':'mid')+'">'+esc(t('ct_sum_diff',{n:diffs.length}))+'</span></div>';
  if(!diffs.length)h+='<div class="okbox">'+esc(t('ct_sum_none'))+'</div>';
  else h+='<div class="hintbox">'+esc(t('ct_sum_hint'))+'</div>'+ctSumTable(diffs);
  h+=sqlNeedBox()+fld(t('note'),'<input id="ctNote" maxlength="200" placeholder="'+esc(t('ct_note_ph'))+'">')+
    '<div class="row" style="margin-top:10px"><button class="btn gh" style="flex:1" onclick="closeModal()">'+esc(t('back'))+'</button>'+
    '<button class="btn ok" style="flex:1" id="ctApplyBtn" onclick="ctApply()">'+esc(diffs.length?t('ct_apply',{n:diffs.length}):t('ct_apply0'))+'</button></div>';
  openModal(h);}
async function ctApply(){await once(async()=>{
  if(!S.kcSql){toast(t('ct_sql_block'),true);return;}
  if(!ctRows().length)return;
  const btn=document.getElementById('ctApplyBtn');if(btn)btn.disabled=true;
  await ctRefreshLive();const rows=ctRows();   // ส่วนต่าง = นับได้ − ยอดสด ณ วินาทีที่ปรับ (ไม่ใช่ยอดตอนเปิดหน้า)
  const note=String((document.getElementById('ctNote')||{}).value||'').trim()||null,today=bizTodayISO(),by=(S.user&&S.user.name)||null;
  try{
    for(const kind of ['item','recipe']){const R=rows.filter(r=>r.kind===kind);if(!R.length)continue;
      const cid=uid('ct');let step='head';
      try{
        await db(()=>sb.from('kc_counts').insert({id:cid,d:today,kind,n:R.length,diff:R.filter(r=>r.delta!==0).length,note,by_name:by}));
        step='lines';await db(()=>sb.from('kc_count_lines').insert(R.map(r=>({count_id:cid,ref_id:r.id,name:r.name,sys_qty:rnd4(r.sys),counted_qty:rnd4(r.cnt),delta:rnd4(r.delta),unit:r.base,count_unit:r.u,count_qty:rnd4(r.count_qty)}))));
        step='moves';const mv=R.filter(r=>r.delta!==0).map(r=>{const c=kind==='item'?itemCost(r.o):recipeUnitCost(r.o);
          return {d:today,kind:'adjust',ref_kind:kind,ref_id:r.id,name:r.name,qty:r.delta,cost:c==null?null:rnd4(r.delta*c),ref_table:'kc_counts',ref_id2:cid,note:I18N.th.ct_move_note};});
        if(mv.length)await pushMoves(mv);
      }catch(e){ // บันทึกไม่ครบ = ถอนหัว/บรรทัด/สต๊อกของส่วนนี้ทิ้ง ไม่เหลือผลนับค้างทั้งที่สต๊อกไม่ขยับ (กดซ้ำได้ ไม่ซ้ำ)
        if(step==='moves')await pushMovesUndo('kc_counts',cid);
        if(step!=='head'){try{await sb.from('kc_count_lines').delete().eq('count_id',cid);}catch(_){}}
        try{await sb.from('kc_counts').delete().eq('id',cid);}catch(_){}
        toast(t('ct_not_saved')+' · '+((e&&e.message)||e),true);throw e;}
      R.forEach(r=>{delete CT[kind+'|'+r.id];});ctDraftSave();}   // ส่วนที่บันทึกแล้วหลุดจากร่าง — ส่วนถัดไปพลาดก็ไม่เขียนซ้ำ
  }catch(e){if(btn)btn.disabled=false;return;}
  CT={};ctDraftClear();closeModal();toast(t('ct_saved'));if(S.tab==='count')ctPaint();
});}

/* ---------- หน้าต่างผลนับ (โมดูลประวัติเรียก) ---------- */
async function ctDetail(id){
  let c=null,lines=[];
  try{c=await db(()=>sb.from('kc_counts').select('*').eq('id',id).maybeSingle());if(c)lines=await db(()=>sb.from('kc_count_lines').select('*').eq('count_id',id).order('id'));}catch(e){return;}
  if(!c){toast(t('ct_noread'),true);return;}
  const rows=lines.map(l=>{const f=num(l.count_qty)>0&&num(l.counted_qty)>0?num(l.counted_qty)/num(l.count_qty):(l.count_unit&&l.unit&&l.count_unit!==l.unit?null:1);
    return {disp:l.name||'',u:l.count_unit||l.unit||'',base:l.unit||'',f:f||1,sys:num(l.sys_qty),cnt:num(l.counted_qty),delta:num(l.delta),kind:c.kind};});
  const diffs=rows.filter(r=>Math.abs(r.delta)>1e-9);
  openModal('<h3>📋 '+esc(t('ct_detail_t'))+' · '+(c.kind==='recipe'?'🍲 '+esc(t('ct_recipes')):'🥬 '+esc(t('ct_items')))+'</h3>'+
    '<div class="sm mut" style="margin-bottom:8px">'+esc(dispDate(c.d))+(c.created_at?' '+esc(dispTime(c.created_at)):'')+(c.by_name?' · '+esc(t('ct_by'))+' '+esc(c.by_name):'')+'</div>'+
    '<div class="row" style="margin-bottom:10px"><span class="chip mid">'+esc(t('ct_lines_n',{n:fmtI(c.n)}))+'</span><span class="chip '+(num(c.diff)?'warn':'ok')+'">'+esc(t('ct_sum_diff',{n:fmtI(c.diff)}))+'</span></div>'+
    (c.note?'<div class="note">'+esc(c.note)+'</div>':'')+
    (diffs.length?ctSumTable(diffs):'<div class="okbox">'+esc(t('ct_sum_none'))+'</div>')+
    '<button class="btn gh big" style="margin-top:10px" onclick="closeModal()">'+esc(t('close'))+'</button>');}
