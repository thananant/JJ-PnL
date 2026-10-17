/* ============================================================
   🧾 บิลสาขา — bills (bl*)
   บิลส่งของ (kc_deliveries) ของเดือนที่เลือก · ตัวกรองเดือน + สาขา (เฉพาะสาขาที่เห็น inBr) · แถว = เลขบิล วันที่ สาขา ยอด สถานะ ไลน์ ✓
   แตะ = รายละเอียด (บรรทัด · ส่งไลน์ซ้ำ · ✅ จ่ายแล้ว / ↩️ ยังไม่จ่าย / ❌ ยกเลิกบิล — เฉพาะหัวหน้า isAdminish)
   ยกเลิก = คืนสต๊อกด้วย kc_moves 'send' +จำนวน (กลับด้านของที่เคยตัดจริง) แล้ว status='void' → ออเดอร์กลับมาค้างส่งในหน้า 🚚
   ท้ายหน้า = ยอดต่อสาขาของเดือน (รวม · จ่ายแล้ว · ค้างจ่าย) = ยอดที่แต่ละสาขาต้องจ่ายสิ้นเดือน (บิลยกเลิกไม่นับ)
   ข้อความไลน์/ส่งซ้ำใช้ sdBillText / sdLineGo ของหน้าส่งสาขา
   ============================================================ */
I18N.add({
th:{bl_sub:'บิลส่งของแต่ละสาขา — ยอดที่สาขาต้องจ่ายสิ้นเดือน',bl_this_month:'เดือนนี้',bl_all_br:'ทุกสาขา',bl_none:'เดือนนี้ยังไม่มีบิล',bl_noread:'อ่านบิลไม่ได้',
  bl_line_sent:'ส่งไลน์แล้ว',bl_line_no:'ยังไม่ส่งไลน์',bl_st_sent:'รอจ่าย',bl_st_paid:'✅ จ่ายแล้ว',bl_st_void:'ยกเลิก',bl_sum_t:'ยอดที่สาขาต้องจ่าย · {m}',bl_bills_n:'{n} บิล',bl_col_n:'บิล',
  bl_k_total:'รวมเดือนนี้',bl_paid:'จ่ายแล้ว',bl_unpaid:'ค้างจ่าย',bl_detail:'บิลส่งของ',bl_ordered:'สั่งมา',bl_sent:'ส่ง',bl_amount:'เป็นเงิน',bl_lines_n:'{n} รายการ',
  bl_resend:'💬 ส่งไลน์ซ้ำ',bl_mark_paid:'✅ จ่ายแล้ว',bl_unpaid_btn:'↩️ ยังไม่จ่าย',bl_void:'❌ ยกเลิกบิล',bl_back:'‹ กลับไปบิล',
  bl_paid_q:'สาขา {b} จ่ายบิล {no} ({m}) แล้วใช่ไหม?',bl_paid_ok:'ติ๊กจ่ายแล้ว ✅',bl_unpaid_ok:'กลับเป็นรอจ่ายแล้ว',
  bl_void_q:'ยกเลิกบิล {no} ของสาขา {b}?\nของ {n} รายการจะกลับเข้าสต๊อก และออเดอร์กลับมาค้างส่ง',bl_void_ok:'ยกเลิกบิลแล้ว — ของกลับเข้าสต๊อก',bl_void_note:'ยกเลิกบิล',bl_void_done:'บิลนี้ยกเลิกแล้ว',
  bl_gone:'ไม่พบบิลนี้',bl_paid_at:'จ่ายเมื่อ {d}',bl_line_at:'ส่งไลน์ {d} {t}',bl_by:'ออกโดย',bl_order_d:'ออเดอร์วันที่ {d}',bl_admin_only:'ติ๊กจ่าย/ยกเลิกบิลได้เฉพาะหัวหน้า',
  bl_br_deny:'บิลของสาขาอื่น — บัญชีนี้ไม่มีสิทธิ์',bl_line_local:'💬 ส่งไลน์แล้ว (บันทึกสถานะไม่ได้)',bl_resend_q:'บิล {no} ส่งเข้ากลุ่มไลน์ไปแล้วเมื่อ {t} (แต่บันทึกสถานะไม่ได้) — ส่งอีกครั้ง กลุ่มจะได้บิลซ้ำ ส่งเลยไหม?',
  bl_moves_noread:'อ่านประวัติสต๊อกของบิลนี้ไม่ได้ — ยังไม่ยกเลิก ลองใหม่อีกครั้ง',bl_kitchen_name:'🍳 {n}'},
en:{bl_sub:'Delivery bills per branch — what each branch pays at month end',bl_this_month:'This month',bl_all_br:'All branches',bl_none:'No bills in this month',bl_noread:'Could not read bills',
  bl_line_sent:'LINE sent',bl_line_no:'LINE not sent',bl_st_sent:'Unpaid',bl_st_paid:'✅ Paid',bl_st_void:'Voided',bl_sum_t:'What each branch pays · {m}',bl_bills_n:'{n} bills',bl_col_n:'Bills',
  bl_k_total:'Month total',bl_paid:'Paid',bl_unpaid:'Unpaid',bl_detail:'Delivery bill',bl_ordered:'Ordered',bl_sent:'Sent',bl_amount:'Amount',bl_lines_n:'{n} lines',
  bl_resend:'💬 Resend to LINE',bl_mark_paid:'✅ Mark paid',bl_unpaid_btn:'↩️ Not paid yet',bl_void:'❌ Void bill',bl_back:'‹ Back to bill',
  bl_paid_q:'Did {b} pay bill {no} ({m})?',bl_paid_ok:'Marked as paid ✅',bl_unpaid_ok:'Back to unpaid',
  bl_void_q:'Void bill {no} of {b}?\n{n} lines go back into stock and the order shows as waiting again',bl_void_ok:'Bill voided — stock restored',bl_void_note:'Bill voided',bl_void_done:'This bill is already voided',
  bl_gone:'Bill not found',bl_paid_at:'paid {d}',bl_line_at:'LINE {d} {t}',bl_by:'by',bl_order_d:'order of {d}',bl_admin_only:'Only managers can mark paid or void',
  bl_br_deny:'Bill of another branch — this account has no access',bl_line_local:'💬 LINE sent (status not saved)',bl_resend_q:'Bill {no} was already sent to the LINE group at {t} (status not saved) — sending again gives the group a duplicate. Send anyway?',
  bl_moves_noread:'Could not read the stock history of this bill — not voided, please try again',bl_kitchen_name:'🍳 {n}'},
lo:{bl_sub:'ບິນສົ່ງເຄື່ອງແຕ່ລະສາຂາ — ຍອດທີ່ສາຂາຕ້ອງຈ່າຍທ້າຍເດືອນ',bl_this_month:'ເດືອນນີ້',bl_all_br:'ທຸກສາຂາ',bl_none:'ເດືອນນີ້ຍັງບໍ່ມີບິນ',bl_noread:'ອ່ານບິນບໍ່ໄດ້',
  bl_line_sent:'ສົ່ງໄລນ໌ແລ້ວ',bl_line_no:'ຍັງບໍ່ສົ່ງໄລນ໌',bl_st_sent:'ລໍຈ່າຍ',bl_st_paid:'✅ ຈ່າຍແລ້ວ',bl_st_void:'ຍົກເລີກ',bl_sum_t:'ຍອດທີ່ສາຂາຕ້ອງຈ່າຍ · {m}',bl_bills_n:'{n} ບິນ',bl_col_n:'ບິນ',
  bl_k_total:'ລວມເດືອນນີ້',bl_paid:'ຈ່າຍແລ້ວ',bl_unpaid:'ຄ້າງຈ່າຍ',bl_detail:'ບິນສົ່ງເຄື່ອງ',bl_ordered:'ສັ່ງມາ',bl_sent:'ສົ່ງ',bl_amount:'ເປັນເງິນ',bl_lines_n:'{n} ລາຍການ',
  bl_resend:'💬 ສົ່ງໄລນ໌ຊ້ຳ',bl_mark_paid:'✅ ຈ່າຍແລ້ວ',bl_unpaid_btn:'↩️ ຍັງບໍ່ຈ່າຍ',bl_void:'❌ ຍົກເລີກບິນ',bl_back:'‹ ກັບໄປບິນ',
  bl_paid_q:'ສາຂາ {b} ຈ່າຍບິນ {no} ({m}) ແລ້ວແມ່ນບໍ?',bl_paid_ok:'ຕິກຈ່າຍແລ້ວ ✅',bl_unpaid_ok:'ກັບເປັນລໍຈ່າຍແລ້ວ',
  bl_void_q:'ຍົກເລີກບິນ {no} ຂອງສາຂາ {b}?\nເຄື່ອງ {n} ລາຍການຈະກັບເຂົ້າສະຕັອກ ແລະອໍເດີກັບມາຄ້າງສົ່ງ',bl_void_ok:'ຍົກເລີກບິນແລ້ວ — ເຄື່ອງກັບເຂົ້າສະຕັອກ',bl_void_note:'ຍົກເລີກບິນ',bl_void_done:'ບິນນີ້ຍົກເລີກແລ້ວ',
  bl_gone:'ບໍ່ພົບບິນນີ້',bl_paid_at:'ຈ່າຍເມື່ອ {d}',bl_line_at:'ສົ່ງໄລນ໌ {d} {t}',bl_by:'ອອກໂດຍ',bl_order_d:'ອໍເດີວັນທີ {d}',bl_admin_only:'ຕິກຈ່າຍ/ຍົກເລີກບິນໄດ້ສະເພາະຫົວໜ້າ',
  bl_br_deny:'ບິນຂອງສາຂາອື່ນ — ບັນຊີນີ້ບໍ່ມີສິດ',bl_line_local:'💬 ສົ່ງໄລນ໌ແລ້ວ (ບັນທຶກສະຖານະບໍ່ໄດ້)',bl_resend_q:'ບິນ {no} ສົ່ງເຂົ້າກຸ່ມໄລນ໌ໄປແລ້ວເມື່ອ {t} (ແຕ່ບັນທຶກສະຖານະບໍ່ໄດ້) — ສົ່ງອີກຄັ້ງ ກຸ່ມຈະໄດ້ບິນຊ້ຳ ສົ່ງເລີຍບໍ?',
  bl_moves_noread:'ອ່ານປະຫວັດສະຕັອກຂອງບິນນີ້ບໍ່ໄດ້ — ຍັງບໍ່ຍົກເລີກ ລອງໃໝ່ອີກຄັ້ງ',bl_kitchen_name:'🍳 {n}'},
my:{bl_sub:'ဆိုင်ခွဲတစ်ခုချင်း ပို့ဆောင်ဘေလ် — လကုန်တွင် ဆိုင်ခွဲပေးရမည့်ငွေ',bl_this_month:'ဤလ',bl_all_br:'ဆိုင်ခွဲအားလုံး',bl_none:'ဤလတွင် ဘေလ်မရှိသေးပါ',bl_noread:'ဘေလ် ဖတ်မရပါ',
  bl_line_sent:'LINE ပို့ပြီး',bl_line_no:'LINE မပို့ရသေး',bl_st_sent:'မပေးရသေး',bl_st_paid:'✅ ပေးပြီး',bl_st_void:'ပယ်ဖျက်',bl_sum_t:'ဆိုင်ခွဲပေးရမည့်ငွေ · {m}',bl_bills_n:'ဘေလ် {n}',bl_col_n:'ဘေလ်',
  bl_k_total:'လစုစုပေါင်း',bl_paid:'ပေးပြီး',bl_unpaid:'ကျန်ငွေ',bl_detail:'ပို့ဆောင်ဘေလ်',bl_ordered:'မှာထား',bl_sent:'ပို့',bl_amount:'ငွေ',bl_lines_n:'{n} ကြောင်း',
  bl_resend:'💬 LINE ပြန်ပို့',bl_mark_paid:'✅ ပေးပြီးဟု မှတ်',bl_unpaid_btn:'↩️ မပေးရသေး',bl_void:'❌ ဘေလ်ပယ်ဖျက်',bl_back:'‹ ဘေလ်သို့ ပြန်',
  bl_paid_q:'{b} သည် ဘေလ် {no} ({m}) ပေးပြီးပြီလား?',bl_paid_ok:'ပေးပြီးဟု မှတ်ပြီး ✅',bl_unpaid_ok:'မပေးရသေးသို့ ပြန်ပြောင်းပြီး',
  bl_void_q:'{b} ၏ ဘေလ် {no} ကို ပယ်ဖျက်မလား?\n{n} ကြောင်း လက်ကျန်သို့ ပြန်ဝင်ပြီး အော်ဒါ ပြန်ပေါ်မည်',bl_void_ok:'ဘေလ်ပယ်ဖျက်ပြီး — လက်ကျန် ပြန်ထည့်ပြီး',bl_void_note:'ဘေလ်ပယ်ဖျက်',bl_void_done:'ဤဘေလ် ပယ်ဖျက်ပြီးသား',
  bl_gone:'ဘေလ် မတွေ့ပါ',bl_paid_at:'ပေးသည့်ရက် {d}',bl_line_at:'LINE {d} {t}',bl_by:'ထုတ်သူ',bl_order_d:'{d} အော်ဒါ',bl_admin_only:'မန်နေဂျာသာ ပေးပြီး/ပယ်ဖျက် လုပ်နိုင်သည်',
  bl_br_deny:'အခြားဆိုင်ခွဲ၏ ဘေလ် — ဤအကောင့်တွင် ခွင့်မရှိပါ',bl_line_local:'💬 LINE ပို့ပြီး (အခြေအနေ မသိမ်းနိုင်)',bl_resend_q:'ဘေလ် {no} ကို {t} တွင် LINE အုပ်စုသို့ ပို့ပြီးသား (အခြေအနေ မသိမ်းနိုင်) — ထပ်ပို့လျှင် အုပ်စုတွင် ဘေလ်နှစ်ထပ်ရမည်။ ပို့မလား?',
  bl_moves_noread:'ဤဘေလ်၏ လက်ကျန်မှတ်တမ်း ဖတ်မရပါ — မပယ်ဖျက်ရသေး ထပ်စမ်းပါ',bl_kitchen_name:'🍳 {n}'}
});
CSS.add(`
.bl-filters{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.bl-month{display:flex;align-items:center;gap:6px}.bl-month b{font-family:var(--fh);font-size:16px;min-width:96px;text-align:center}
.bl-row{cursor:pointer;flex-wrap:nowrap}.bl-row .amt{font-family:var(--fh);font-weight:700;font-size:16px;white-space:nowrap;text-align:right}
.bl-row .bno{font-family:var(--fh);font-weight:700}.bl-row .xs{overflow-wrap:anywhere}
.bl-row.void .bno,.bl-row.void .amt{text-decoration:line-through;color:var(--mut)}
.bl-dot{width:10px;height:10px;border-radius:50%;flex:none;display:inline-block;margin-right:4px;vertical-align:middle}
.bl-zero td{color:var(--mut)}.bl-zero td b{color:var(--mut);font-weight:600}
.bl-sum td:first-child{font-weight:700}.bl-sum tr.cur td{background:var(--gold-t)}
.bl-sum tr.tap td{padding:12px 8px}   /* แถวแตะกรองสาขา ≥44px */
@media(max-width:339px){.bl-sum .c-n{display:none}.bl-sum td,.bl-sum th{padding-left:4px;padding-right:4px;font-size:12.5px}}   /* จอแคบมาก (Galaxy Fold): ซ่อนคอลัมน์จำนวนบิล + บีบช่องว่าง ให้ ค้างจ่าย อยู่ในจอ */
`);
let BL={ym:ymNow(),br:'',rows:[],ok:true,at:0,loading:null};

RENDER.bills=function(el){
  const brs=S.branches;
  el.innerHTML=dhead('🧾 '+t('nav_bills'))+sqlNeedBox()+'<div class="sd-sub">'+esc(t('bl_sub'))+'</div>'+(brScoped()?'<div class="note">'+esc(t('br_scope',{b:brScopeTxt()||'—'}))+'</div>':'')+
    '<div class="bl-filters"><div class="bl-month"><button type="button" class="btn gh sm2" onclick="blMonth(-1)" aria-label="prev">‹</button><b id="blYm">'+esc(dispMonth(BL.ym))+'</b><button type="button" class="btn gh sm2" onclick="blMonth(1)" aria-label="next">›</button>'+
    (BL.ym!==ymNow()?'<button type="button" class="btn gh sm2" onclick="blMonthNow()">'+esc(t('bl_this_month'))+'</button>':'')+'</div>'+
    (brs.length>1?pillBar([{k:'',lb:t('bl_all_br')}].concat(brs.map(b=>({k:b.code,lb:b.short||b.name}))),BL.br,'blSetBr',{scroll:1}):'')+'</div>'+
    '<div id="blKpi"></div><div id="blList"><div class="spin"></div></div><div id="blSum"></div>';
  if(BL.at)blPaint();
  blLoad().then(ok=>{if(ok&&S.tab==='bills')blPaint();});   // ok=false = มีคำขอใหม่กว่า (กดเปลี่ยนเดือนซ้ำ) — รอบนั้นวาดเอง
};
function blMonth(n){BL.ym=n<0?prevMonth(BL.ym):nextMonth(BL.ym);BL.rows=[];BL.at=0;rerender();}
function blMonthNow(){BL.ym=ymNow();BL.rows=[];BL.at=0;rerender();}
function blSetBr(k){BL.br=S.branches.some(b=>b.code===k)?k:'';document.querySelectorAll('#view-bills .pills .pill').forEach(p=>p.classList.toggle('on',p.dataset.k===BL.br));blPaint();}
let BL_SEQ=0;
async function blLoad(){ // บิลของเดือน (เฉพาะสาขาที่เห็น) · อ่านไม่ได้ = ว่าง + แถบเตือน (ไม่ toast) · กด ‹ › รัว ๆ = ใช้ผลของคำขอล่าสุดเท่านั้น (seq — เดิมคืน promise ของเดือนก่อนหน้า แล้ววาดบิลเดือนนั้นใต้หัวเดือนใหม่) → true = ใช้ผลนี้แล้ว
  const seq=++BL_SEQ,ym=BL.ym,a=ym+'-01',b=ym+'-'+String(monthDays(ym)).padStart(2,'0');
  const p=(async()=>{let rows=[],ok=true;
    try{const r=await sb.from('kc_deliveries').select('*').gte('d',a).lte('d',b).order('d',{ascending:false}).order('created_at',{ascending:false}).limit(1000);
      if(!r||r.error)throw (r&&r.error)||new Error('read');rows=(r.data||[]).filter(x=>inBr(x.branch));}
    catch(e){ok=false;}
    if(seq!==BL_SEQ||ym!==BL.ym)return false;   // มีคำขอใหม่กว่า/เดือนเปลี่ยนไปแล้ว → ทิ้งผลนี้
    BL.rows=rows;BL.ok=ok;BL.at=Date.now();return true;})();
  BL.loading=p;
  try{return await p;}finally{if(BL.loading===p)BL.loading=null;}}
function blStTxt(st){const k='bl_st_'+st;return I18N.th[k]?t(k):String(st||'');}
function blBr(code){return (S.branchesAll||[]).find(b=>b.code===code)||null;}
function blSums(rows){ // ต่อสาขา {code,name,n,total,paid,unpaid}
  const m={};rows.forEach(x=>{const c=x.branch||'?';const o=m[c]=m[c]||{code:c,name:x.branch_name||branchName(c)||c,n:0,total:0,paid:0,unpaid:0};
    if(x.status==='void')return;o.n++;const v=num(x.total);o.total=rnd2(o.total+v);if(x.status==='paid')o.paid=rnd2(o.paid+v);else o.unpaid=rnd2(o.unpaid+v);});
  const ord={};S.branches.forEach((b,i)=>{ord[b.code]=i;});
  return Object.values(m).sort((a,b)=>num(ord[a.code]??99)-num(ord[b.code]??99));}
function blPaint(){
  const L=document.getElementById('blList'),K=document.getElementById('blKpi'),Su=document.getElementById('blSum');if(!L)return;
  const rows=BL.rows.filter(x=>!BL.br||x.branch===BL.br),td=bizTodayISO();
  const live=rows.filter(x=>x.status!=='void'),tot=rnd2(live.reduce((a,x)=>a+num(x.total),0)),paid=rnd2(live.filter(x=>x.status==='paid').reduce((a,x)=>a+num(x.total),0));
  if(K)K.innerHTML='<div class="kpis"><div class="kpi hero"><div class="t">'+esc(t('bl_k_total'))+'</div><div class="kpi-v">'+esc(money(tot))+'</div><div class="s">'+esc(t('bl_bills_n',{n:live.length}))+'</div></div>'+
    '<div class="kpi"><div class="t">'+esc(t('bl_paid'))+'</div><div class="kpi-v green">'+esc(money(paid))+'</div></div><div class="kpi"><div class="t">'+esc(t('bl_unpaid'))+'</div><div class="kpi-v '+(tot-paid>0?'red':'')+'">'+esc(money(rnd2(tot-paid)))+'</div></div></div>';
  if(!BL.ok){L.innerHTML='<div class="badbox">⚠ '+esc(t('bl_noread'))+'</div>';if(Su)Su.innerHTML='';return;}
  if(!rows.length){L.innerHTML=emptyBox(t('bl_none'));}
  else{let h='',last='';rows.forEach(x=>{if(x.d!==last){last=x.d;h+='<div class="dhead" style="font-size:14px;margin:10px 0 4px">'+esc(dispDate(x.d))+(x.d===td?' · '+esc(t('today')):'')+'</div>';}
      const b=blBr(x.branch),st=x.status||'sent';
      h+='<div class="rowline tap bl-row'+(st==='void'?' void':'')+'" data-id="'+esc(x.id)+'" onclick="blDetail(this.dataset.id)"><div class="grow"><div><span class="bno">'+esc(x.bill_no||'—')+'</span> '+
        '<span class="bl-dot" style="background:'+esc(sdBrColor(x.branch,b&&b.color))+'"></span>'+esc(x.branch_name||branchName(x.branch)||x.branch||'')+'</div>'+
        '<div class="xs mut">'+stPill(st,blStTxt(st))+' '+(x.line_sent_at?'<span class="chip ok">💬 ✓</span>':'<span class="chip mid">💬 —</span>')+' '+esc(t('bl_by'))+' '+esc(x.by_name||'')+' '+esc(dispTime(x.created_at))+'</div></div>'+
        '<span class="amt">'+esc(money(x.total))+'</span></div>';});
    L.innerHTML='<div class="card" style="padding-top:4px">'+h+'</div>';}
  if(Su){const sums=blSums(BL.rows);
    Su.innerHTML=sums.length?card('💰 '+esc(t('bl_sum_t',{m:dispMonth(BL.ym)})),'<div class="twrap"><table class="t bl-sum"><thead><tr><th>'+esc(t('branch'))+'</th><th class="n c-n">'+esc(t('bl_col_n'))+'</th><th class="n">'+esc(t('total'))+'</th><th class="n">'+esc(t('bl_paid'))+'</th><th class="n">'+esc(t('bl_unpaid'))+'</th></tr></thead><tbody>'+
      sums.map(s=>'<tr class="tap'+(BL.br&&BL.br===s.code?' cur':'')+'" data-k="'+esc(s.code)+'" onclick="blSetBr(this.dataset.k)"><td>'+esc(s.name)+'</td><td class="n c-n">'+s.n+'</td><td class="n">'+esc(money(s.total))+'</td><td class="n green">'+esc(money(s.paid))+'</td><td class="n '+(s.unpaid>0?'red':'')+'">'+esc(money(s.unpaid))+'</td></tr>').join('')+
      '<tr class="tot"><td>'+esc(t('total'))+'</td><td class="n c-n">'+sums.reduce((a,s)=>a+s.n,0)+'</td><td class="n">'+esc(money(sums.reduce((a,s)=>a+s.total,0)))+'</td><td class="n">'+esc(money(sums.reduce((a,s)=>a+s.paid,0)))+'</td><td class="n">'+esc(money(sums.reduce((a,s)=>a+s.unpaid,0)))+'</td></tr></tbody></table></div>'):'';}
}

/* ---------- รายละเอียดบิล (หน้าประวัติ/ส่งสาขาเรียกได้: blDetail(id)) ---------- */
async function blRead(id){let x=null,lines=[];
  try{x=await db(()=>sb.from('kc_deliveries').select('*').eq('id',id).maybeSingle());if(x)lines=await db(()=>sb.from('kc_delivery_lines').select('*').eq('delivery_id',id).order('sort').order('id'));}catch(e){return null;}
  if(!x){toast(t('bl_gone'));return null;}return {x,lines};}
function blLineChip(x){ // สถานะไลน์: จดไว้ในตาราง → ส่งแล้ว · เครื่องนี้รู้ว่าส่งถึงแต่เขียนไม่ได้ → บอกตามนั้น · ที่เหลือ = ยังไม่ส่ง
  if(x.line_sent_at)return '<span class="chip ok">💬 '+esc(t('bl_line_sent'))+'</span>';
  if(typeof sdLineOkAt==='function'&&sdLineOkAt(x.id))return '<span class="chip warn">'+esc(t('bl_line_local'))+'</span>';
  return '<span class="chip mid">💬 '+esc(t('bl_line_no'))+'</span>';}
function blScopeOk(x){if(inBr(x.branch))return true;toast(t('bl_br_deny'),true);return false;}   // _br: บิลสาขาอื่นดู/แก้ไม่ได้ (กติกาทุกแอป)
async function blDetail(id){
  const R=await blRead(id);if(!R)return;const {x,lines}=R;if(!blScopeOk(x))return;
  const adm=isAdminish(),st=x.status||'sent',K=canKitchen();
  let btns='';
  if(st!=='void'&&K)btns+='<button type="button" class="btn gh" data-id="'+esc(x.id)+'" onclick="blResend(this.dataset.id)">'+esc(t('bl_resend'))+'</button>';
  if(adm&&st==='sent')btns+='<button type="button" class="btn ok" data-id="'+esc(x.id)+'" onclick="blPaid(this.dataset.id)">'+esc(t('bl_mark_paid'))+'</button>';
  if(adm&&st==='paid')btns+='<button type="button" class="btn gh" data-id="'+esc(x.id)+'" onclick="blUnpaid(this.dataset.id)">'+esc(t('bl_unpaid_btn'))+'</button>';
  if(adm&&st!=='void')btns+='<button type="button" class="btn gh" style="color:var(--bad)" data-id="'+esc(x.id)+'" onclick="blVoid(this.dataset.id)">'+esc(t('bl_void'))+'</button>';
  if(!adm&&st!=='void')btns+='<span class="xs mut">'+esc(t('bl_admin_only'))+'</span>';
  openModal('<h3>🧾 '+esc(t('bl_detail'))+'</h3>'+
    '<div class="row" style="margin-bottom:4px"><b style="font-size:17px;font-family:var(--fh)">'+esc(x.bill_no||'—')+'</b>'+stPill(st,blStTxt(st))+blLineChip(x)+'</div>'+
    '<div class="row" style="margin-bottom:8px"><b style="font-size:16px">'+esc(x.branch_name||branchName(x.branch)||x.branch||'')+'</b><span class="amt b" style="margin-left:auto;font-family:var(--fh);font-size:18px">'+esc(money(x.total))+'</span></div>'+
    '<div class="xs mut" style="margin-bottom:8px">'+esc(dispDate(x.d))+(x.order_date&&String(x.order_date).slice(0,10)!==String(x.d).slice(0,10)?' · '+esc(t('bl_order_d',{d:dispDate(x.order_date)})):'')+' · '+esc(t('bl_by'))+' '+esc(x.by_name||'')+' '+esc(dispTime(x.created_at))+
      (x.paid_at?' · '+esc(t('bl_paid_at',{d:dispDate(x.paid_at)})):'')+(x.line_sent_at?' · '+esc(t('bl_line_at',{d:dispDate(String(x.line_sent_at).slice(0,10)),t:dispTime(x.line_sent_at)}))+(x.line_group_id?' → '+esc(lgName(x.line_group_id)):''):'')+'</div>'+
    (x.note?'<div class="note">'+esc(x.note)+'</div>':'')+
    '<div class="twrap"><table class="t"><thead><tr><th>'+esc(t('product'))+'</th><th class="n">'+esc(t('bl_ordered'))+'</th><th class="n">'+esc(t('bl_sent'))+'</th><th class="n">'+esc(t('price'))+'</th><th class="n">'+esc(t('bl_amount'))+'</th></tr></thead><tbody>'+
    lines.map(l=>{const z=!(num(l.sent)>0),rr=l.recipe_id&&recipeById(l.recipe_id),kn=rr&&supKey(rr.name)!==supKey(l.name)?'<div class="xs mut">'+esc(t('bl_kitchen_name',{n:dispName(rr)}))+'</div>':'';
      return '<tr'+(z?' class="bl-zero"':'')+'><td><b>'+esc(l.name||'')+'</b> <span class="xs mut">'+esc(trUnit(l.unit))+'</span>'+(z?' <span class="chip warn">⏳ '+esc(t('sd_partial'))+'</span>':'')+kn+'</td><td class="n">'+fmtQ(l.ordered)+'</td><td class="n">'+fmtQ(l.sent)+'</td><td class="n">'+(z?'—':esc(moneyU(l.unit_price)))+'</td><td class="n">'+(z?'—':esc(money(l.amount)))+'</td></tr>';}).join('')+
    '<tr class="tot"><td colspan="4">'+esc(t('total'))+' · '+esc(t('bl_lines_n',{n:lines.filter(l=>num(l.sent)>0).length}))+'</td><td class="n">'+esc(money(x.total))+'</td></tr></tbody></table></div>'+
    '<div class="row" style="margin-top:12px">'+btns+'<button type="button" class="btn" style="margin-left:auto" onclick="closeModal()">'+esc(t('close'))+'</button></div>');}
async function blAfter(id){ // หลังจ่าย/ยกเลิก: หน้าบิลวาดใหม่ · 🚚 ส่งสาขา อ่านออเดอร์ใหม่ (ป้าย 🚚 + ใบสั่งที่กลับมาค้าง) · 🍳 ทำของ คิดใหม่รอบหน้า
  if(typeof MK_ORD!=='undefined')MK_ORD.at=0;
  if(S.tab==='bills'){await blLoad();blPaint();}
  if(typeof sdLoad==='function')sdLoad().then(()=>{if(S.tab==='send')sdPaint();}).catch(()=>{});
  if(id)blDetail(id);}
async function blResend(id){await once(async()=>{ // ส่งไลน์ซ้ำ (ข้อความเดิมจากบิล) · ไม่มีกลุ่ม/ส่งไม่ได้ = กล่องคัดลอก
  const R=await blRead(id);if(!R)return;const {x,lines}=R;if(!blScopeOk(x))return;if(x.status==='void'){toast(t('bl_void_done'),true);return;}
  const lo=!x.line_sent_at&&typeof sdLineOkAt==='function'?sdLineOkAt(x.id):null;   // เครื่องนี้ส่งถึงแล้วแต่จดไม่ได้ → ถามก่อน กันกลุ่มได้บิลซ้ำ
  if(lo&&!(await confirm2(t('bl_resend_q',{no:x.bill_no||'',t:dispTime(lo)}),{danger:true})))return;
  const res=await sdLineGo(x,lines);
  if(res.state==='sent'){toast(t('sd_line_sent',{g:lgName(res.gid)}));blAfter(id);return;}
  openModal('<h3>💬 '+esc(t('bl_resend'))+'</h3><div class="'+(res.state==='fail'?'badbox':'hintbox')+'">'+esc(res.state==='fail'?t('sd_line_fail')+(res.err?' ('+res.err+')':''):t('sd_line_none'))+'</div>'+lineTextBox(res.text,res.gid)+
    '<div class="row" style="margin-top:12px"><button type="button" class="btn gh" data-id="'+esc(id)+'" onclick="blDetail(this.dataset.id)">'+esc(t('bl_back'))+'</button><button type="button" class="btn" style="margin-left:auto" onclick="closeModal()">'+esc(t('close'))+'</button></div>');});}
async function blPaid(id){await once(async()=>{ // ✅ จ่ายแล้ว (หัวหน้า)
  if(!isAdminish())return;const R=await blRead(id);if(!R)return;const {x}=R;if(!blScopeOk(x))return;if(x.status!=='sent'){blDetail(id);return;}
  if(!(await confirm2(t('bl_paid_q',{b:x.branch_name||branchName(x.branch)||x.branch,no:x.bill_no||'',m:money(x.total)}))))return;
  try{await db(()=>sb.from('kc_deliveries').update({status:'paid',paid_at:bizTodayISO()}).eq('id',id).eq('status','sent'));}catch(e){return;}
  toast(t('bl_paid_ok'));blAfter(id);});}
async function blUnpaid(id){await once(async()=>{ // ↩️ ยังไม่จ่าย (หัวหน้า · กดผิด)
  if(!isAdminish())return;const R=await blRead(id);if(!R)return;if(!blScopeOk(R.x))return;if(R.x.status!=='paid'){blDetail(id);return;}
  try{await db(()=>sb.from('kc_deliveries').update({status:'sent',paid_at:null}).eq('id',id).eq('status','paid'));}catch(e){return;}
  toast(t('bl_unpaid_ok'));blAfter(id);});}
async function blVoidDone(id){ // เคยคืนสต๊อกของบิลนี้แล้ว (รอบก่อนคืนได้แต่เปลี่ยนสถานะไม่สำเร็จ) = ไม่คืนซ้ำ · อ่านไม่ได้ = null (ห้ามเดา)
  try{const r=await sb.from('kc_moves').select('id').eq('ref_table','kc_deliveries').eq('ref_id2',String(id)).eq('kind','send').gt('qty',0).limit(1);if(!r||r.error)return null;return !!(r.data&&r.data.length);}catch(e){return null;}}
async function blVoid(id){await once(async()=>{ // ❌ ยกเลิกบิล: คืนสต๊อก = กลับด้านของที่เคยตัดจริง (kc_moves send ของบิลนี้) · ไม่มี = จากบรรทัด · แล้ว status void
  if(!isAdminish())return;const R=await blRead(id);if(!R)return;const {x,lines}=R;if(!blScopeOk(x))return;
  if(x.status==='void'){toast(t('bl_void_done'),true);return;}
  if(!(await confirm2(t('bl_void_q',{no:x.bill_no||'',b:x.branch_name||branchName(x.branch)||x.branch,n:lines.length}),{danger:true})))return;
  try{
    const done=await blVoidDone(id);if(done==null){toast(t('bl_moves_noread'),true);return;}   // kc_moves คือของจริงที่เคยตัด — อ่านไม่ได้ = ไม่ยกเลิก (คืนผิดจำนวน/คืนซ้ำ)
    if(!done){
      let orig=null;try{const r=await sb.from('kc_moves').select('ref_id,qty,cost').eq('ref_table','kc_deliveries').eq('ref_id2',String(id)).eq('kind','send').lt('qty',0);if(r&&!r.error)orig=r.data||[];}catch(e){}
      if(orig==null){toast(t('bl_moves_noread'),true);return;}
      const agg={};
      if(orig.length)orig.forEach(m=>{const a=agg[m.ref_id]=agg[m.ref_id]||{q:0,c:0};a.q+=-num(m.qty);a.c+=-num(m.cost);});
      else lines.forEach(l=>{if(!l.recipe_id||!(num(l.sent)>0))return;const f=tdLineFactor(l);   // บิลเก่าไม่มี moves: หน่วยสาขา × ตัวคูณที่ผูก = หน่วยครัว (tdLineFactor — กติกาเดียวกับ tdAvgSent/MK_ORD.daily)
        const a=agg[l.recipe_id]=agg[l.recipe_id]||{q:0,c:0};a.q+=num(l.sent)*f;a.c+=num(l.sent)*num(l.unit_cost);});
      const ids=Object.keys(agg);await refreshRows('recipe',ids);
      await pushMoves(ids.map(rid=>({d:bizTodayISO(),kind:'send',ref_kind:'recipe',ref_id:rid,qty:rnd4(agg[rid].q),cost:rnd4(agg[rid].c),ref_table:'kc_deliveries',ref_id2:id,note:t('bl_void_note')+' '+(x.bill_no||'')})));}
    await db(()=>sb.from('kc_deliveries').update({status:'void',paid_at:null}).eq('id',id));
  }catch(e){return;}
  toast(t('bl_void_ok'));blAfter(id);});}
