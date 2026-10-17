/* ============================================================
   📜 ประวัติ (hist · hs*) — เส้นเวลาของ รับของ · ทำของ · ส่งสาขา · นับสต๊อก · ปรับยอด/ทิ้ง
   อ่าน kc_receipts / kc_productions / kc_deliveries / kc_counts / kc_moves(adjust,waste) ตามช่วงวัน (fail-soft ต่อตาราง)
   ตัวกรอง: ประเภท · ช่วงวัน (วันนี้/7/30/เดือนนี้/กำหนดเอง) · ค้นหา — จำใน localStorage jjck_hs_f
   แตะแถว → รายละเอียด (rcDetail ของรับของ · mkDetail/blDetail/ctDetail ถ้าโมดูลนั้นมี ไม่งั้นหน้าต่างรวมของหน้านี้)
   ============================================================ */
I18N.add({
th:{hs_t_all:'ทั้งหมด',hs_t_receive:'รับของ',hs_t_produce:'ทำของ',hs_t_send:'ส่งสาขา',hs_t_count:'นับสต๊อก',hs_t_adjust:'ปรับยอด/ทิ้ง',hs_lot_voided:'ล็อตนี้ถูกยกเลิกแล้ว',
  hs_r_today:'วันนี้',hs_r_7:'7 วัน',hs_r_30:'30 วัน',hs_r_month:'เดือนนี้',hs_r_custom:'เลือกวัน',hs_from:'ตั้งแต่',hs_to:'ถึง',hs_search_ph:'ค้นหา ชื่อ / ร้าน / เลขบิล / สาขา',
  hs_empty:'ไม่มีรายการในช่วงนี้',hs_n_events:'{n} รายการ',hs_lots:'{n} รอบ',hs_lines:'{n} รายการ',hs_void:'ยกเลิกรับของ',hs_voided:'ยกเลิกแล้ว',
  hs_count_diff:'ต่าง {n} รายการ',hs_count_items:'🥬 วัตถุดิบ',hs_count_recipes:'🍲 สินค้าที่ผลิตแล้ว',hs_sys:'ในระบบ',hs_counted:'นับได้',hs_delta:'ต่าง',
  hs_plan:'ตามสูตร',hs_used:'ใช้จริง',hs_waste:'เศษ/ทิ้ง',hs_cost_items:'ค่าส่วนผสม',hs_cost_oh:'ค่าใช้จ่ายแฝง',hs_cost_total:'ต้นทุนรวม',hs_cost_unit:'ต้นทุน/หน่วย',hs_got:'ได้จริง',
  hs_ordered:'สั่งมา',hs_sent:'ส่ง',hs_bill:'บิล',hs_more:'แสดงเพิ่ม',hs_load_part:'บางตารางอ่านไม่ได้ (ยังไม่รัน SQL?) — แสดงเท่าที่อ่านได้',hs_detail:'รายละเอียด',hs_by:'โดย',
  hs_st_sent:'ส่งแล้ว',hs_st_paid:'✅ จ่ายแล้ว',hs_st_void:'ยกเลิกแล้ว',hs_kind_receive:'รับเข้า',hs_kind_produce_in:'ผลิตได้',hs_kind_produce_out:'ใช้ผลิต',hs_kind_send:'ส่งสาขา',hs_kind_adjust:'ปรับยอด',hs_kind_waste:'ทิ้ง',hs_load_cap:'แสดงได้ไม่เกิน 400 รายการต่อประเภทในช่วงนี้ — รายการเก่ากว่านั้นไม่ขึ้น เลือกช่วงวันให้แคบลง'},
en:{hs_t_all:'All',hs_t_receive:'Receive',hs_t_produce:'Produce',hs_t_send:'Deliver',hs_t_count:'Count',hs_t_adjust:'Adjust/waste',hs_lot_voided:'this lot was voided',
  hs_r_today:'Today',hs_r_7:'7 days',hs_r_30:'30 days',hs_r_month:'This month',hs_r_custom:'Pick dates',hs_from:'From',hs_to:'To',hs_search_ph:'Search name / supplier / bill / branch',
  hs_empty:'Nothing in this period',hs_n_events:'{n} events',hs_lots:'{n} lots',hs_lines:'{n} lines',hs_void:'Receipt voided',hs_voided:'voided',
  hs_count_diff:'{n} differences',hs_count_items:'🥬 Ingredients',hs_count_recipes:'🍲 Finished products',hs_sys:'System',hs_counted:'Counted',hs_delta:'Diff',
  hs_plan:'Recipe',hs_used:'Used',hs_waste:'Waste',hs_cost_items:'Ingredients',hs_cost_oh:'Overhead',hs_cost_total:'Total cost',hs_cost_unit:'Cost/unit',hs_got:'Actual yield',
  hs_ordered:'Ordered',hs_sent:'Sent',hs_bill:'Bill',hs_more:'Show more',hs_load_part:'Some tables could not be read (SQL not run?) — showing what loaded',hs_detail:'Detail',hs_by:'by',
  hs_st_sent:'sent',hs_st_paid:'✅ paid',hs_st_void:'voided',hs_kind_receive:'Received',hs_kind_produce_in:'Produced',hs_kind_produce_out:'Used in production',hs_kind_send:'Delivered',hs_kind_adjust:'Adjusted',hs_kind_waste:'Waste',hs_load_cap:'Showing at most 400 events per type in this range — older ones are hidden, pick a narrower date range'},
lo:{hs_t_all:'ທັງໝົດ',hs_t_receive:'ຮັບເຄື່ອງ',hs_t_produce:'ເຮັດເຄື່ອງ',hs_t_send:'ສົ່ງສາຂາ',hs_t_count:'ນັບສະຕັອກ',hs_t_adjust:'ປັບຍອດ/ຖິ້ມ',hs_lot_voided:'ລັອດນີ້ຖືກຍົກເລີກແລ້ວ',
  hs_r_today:'ມື້ນີ້',hs_r_7:'7 ມື້',hs_r_30:'30 ມື້',hs_r_month:'ເດືອນນີ້',hs_r_custom:'ເລືອກວັນ',hs_from:'ຕັ້ງແຕ່',hs_to:'ເຖິງ',hs_search_ph:'ຄົ້ນຫາ ຊື່ / ຮ້ານ / ເລກບິນ / ສາຂາ',
  hs_empty:'ບໍ່ມີລາຍການໃນຊ່ວງນີ້',hs_n_events:'{n} ລາຍການ',hs_lots:'{n} ຮອບ',hs_lines:'{n} ລາຍການ',hs_void:'ຍົກເລີກຮັບເຄື່ອງ',hs_voided:'ຍົກເລີກແລ້ວ',
  hs_count_diff:'ຕ່າງ {n} ລາຍການ',hs_count_items:'🥬 ວັດຖຸດິບ',hs_count_recipes:'🍲 ສິນຄ້າທີ່ຜະລິດແລ້ວ',hs_sys:'ໃນລະບົບ',hs_counted:'ນັບໄດ້',hs_delta:'ຕ່າງ',
  hs_plan:'ຕາມສູດ',hs_used:'ໃຊ້ແທ້',hs_waste:'ເສດ/ຖິ້ມ',hs_cost_items:'ຄ່າສ່ວນປະສົມ',hs_cost_oh:'ຄ່າໃຊ້ຈ່າຍແຝງ',hs_cost_total:'ຕົ້ນທຶນລວມ',hs_cost_unit:'ຕົ້ນທຶນ/ຫົວໜ່ວຍ',hs_got:'ໄດ້ແທ້',
  hs_ordered:'ສັ່ງມາ',hs_sent:'ສົ່ງ',hs_bill:'ບິນ',hs_more:'ສະແດງເພີ່ມ',hs_load_part:'ບາງຕາຕະລາງອ່ານບໍ່ໄດ້ (ຍັງບໍ່ແລ່ນ SQL?) — ສະແດງເທົ່າທີ່ອ່ານໄດ້',hs_detail:'ລາຍລະອຽດ',hs_by:'ໂດຍ',
  hs_st_sent:'ສົ່ງແລ້ວ',hs_st_paid:'✅ ຈ່າຍແລ້ວ',hs_st_void:'ຍົກເລີກແລ້ວ',hs_kind_receive:'ຮັບເຂົ້າ',hs_kind_produce_in:'ຜະລິດໄດ້',hs_kind_produce_out:'ໃຊ້ຜະລິດ',hs_kind_send:'ສົ່ງສາຂາ',hs_kind_adjust:'ປັບຍອດ',hs_kind_waste:'ຖິ້ມ',hs_load_cap:'ສະແດງໄດ້ບໍ່ເກີນ 400 ລາຍການຕໍ່ປະເພດໃນຊ່ວງນີ້ — ລາຍການເກົ່າກວ່ານັ້ນບໍ່ຂຶ້ນ ເລືອກຊ່ວງວັນໃຫ້ແຄບລົງ'},
my:{hs_t_all:'အားလုံး',hs_t_receive:'လက်ခံ',hs_t_produce:'ထုတ်လုပ်',hs_t_send:'ဆိုင်ခွဲပို့',hs_t_count:'စာရင်းကောက်',hs_t_adjust:'ပြင်ဆင်/စွန့်ပစ်',hs_lot_voided:'ဤသုတ်ကို ပယ်ဖျက်ပြီး',
  hs_r_today:'ယနေ့',hs_r_7:'၇ ရက်',hs_r_30:'၃၀ ရက်',hs_r_month:'ယခုလ',hs_r_custom:'ရက်ရွေး',hs_from:'မှ',hs_to:'ထိ',hs_search_ph:'အမည် / ဆိုင် / ဘေလ် / ဆိုင်ခွဲ ရှာရန်',
  hs_empty:'ဤကာလတွင် မရှိပါ',hs_n_events:'{n} ခု',hs_lots:'{n} အသုတ်',hs_lines:'{n} ကြောင်း',hs_void:'လက်ခံမှုပယ်ဖျက်',hs_voided:'ပယ်ဖျက်ပြီး',
  hs_count_diff:'ကွာခြား {n} ခု',hs_count_items:'🥬 ကုန်ကြမ်း',hs_count_recipes:'🍲 ထုတ်ကုန်',hs_sys:'စနစ်',hs_counted:'ရေတွက်ရ',hs_delta:'ကွာခြား',
  hs_plan:'နည်းအတိုင်း',hs_used:'အမှန်သုံး',hs_waste:'အပိုင်းအစ/စွန့်',hs_cost_items:'ပါဝင်ပစ္စည်းကုန်ကျ',hs_cost_oh:'ကွယ်ကုန်ကျစရိတ်',hs_cost_total:'စုစုပေါင်းကုန်ကျ',hs_cost_unit:'ယူနစ်ကုန်ကျ',hs_got:'အမှန်ထွက်',
  hs_ordered:'မှာထား',hs_sent:'ပို့',hs_bill:'ဘေလ်',hs_more:'ထပ်ပြရန်',hs_load_part:'အချို့ဇယား ဖတ်မရပါ (SQL မလုပ်ရသေး?) — ရသမျှပြသည်',hs_detail:'အသေးစိတ်',hs_by:'မှ',
  hs_st_sent:'ပို့ပြီး',hs_st_paid:'✅ ပေးပြီး',hs_st_void:'ပယ်ဖျက်ပြီး',hs_kind_receive:'လက်ခံ',hs_kind_produce_in:'ထုတ်လုပ်ရ',hs_kind_produce_out:'ထုတ်လုပ်ရာသုံး',hs_kind_send:'ဆိုင်ခွဲပို့',hs_kind_adjust:'ပြင်ဆင်',hs_kind_waste:'စွန့်ပစ်',hs_load_cap:'ဤကာလတွင် အမျိုးအစားတစ်ခုလျှင် အများဆုံး 400 ခုသာ ပြသည် — ပိုဟောင်းသည့်များ မပြပါ၊ ရက်အပိုင်းအခြား ကျဉ်းအောင်ရွေးပါ'}
});
CSS.add(`
.hs-day{font-family:var(--fh);font-weight:700;color:var(--wine);font-size:13.5px;margin:12px 2px 6px;display:flex;align-items:center;gap:8px}
.hs-day .sp{margin-left:auto;font-weight:500;color:var(--mut);font-size:12px}
.hs-ev{display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px 12px;margin-bottom:8px;box-shadow:var(--sh);cursor:pointer;min-height:56px}
.hs-ev:active{transform:scale(.995)}
.hs-ev .ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:20px;flex:none;background:#F3ECE0}
.hs-ev.k-receive .ic{background:#EAF3FC}.hs-ev.k-produce .ic{background:#FBF6EA}.hs-ev.k-send .ic{background:var(--ok-t)}.hs-ev.k-count .ic{background:#F1ECF8}.hs-ev.k-adjust .ic{background:#EFEBE4}.hs-ev.k-void .ic{background:var(--bad-t)}
.hs-ev .tx{flex:1;min-width:0}.hs-ev .tt{font-weight:700;overflow-wrap:anywhere;line-height:1.3}.hs-ev .sb{font-size:12.5px;color:var(--mut);overflow-wrap:anywhere}
.hs-ev .amt{font-family:var(--fh);font-weight:700;white-space:nowrap;flex:none;text-align:right}.hs-ev .amt small{display:block;font-weight:500;color:var(--mut);font-size:11.5px}
.hs-range{display:flex;gap:8px;align-items:center;margin:0 0 8px}.hs-range input{min-width:0;width:0;flex:1}
`);
const HS_F='jjck_hs_f';
let HS={type:'all',range:'7',from:'',to:'',q:''};
let HS_EV=[],HS_PART=false,HS_CAP=false,HS_SHOW=60;   // HS_CAP = บางตารางชนเพดาน 400 แถวในช่วงนี้ (รายการเก่ากว่านั้นไม่ขึ้น)
const HS_LIMIT=400;
const HS_TYPES=['all','receive','produce','send','count','adjust'];
const HS_RANGES=['today','7','30','month','custom'];
function hsRange(){const td=bizTodayISO();
  if(HS.range==='today')return [td,td];if(HS.range==='30')return [addDays(td,-29),td];if(HS.range==='month')return [td.slice(0,7)+'-01',td];
  if(HS.range==='custom'){const a=HS.from||addDays(td,-6),b=HS.to||td;return a<=b?[a,b]:[b,a];}return [addDays(td,-6),td];}
RENDER.hist=function(el){
  const sv=LS.get(HS_F,null);if(sv&&typeof sv==='object'){HS=Object.assign(HS,sv);if(!HS_TYPES.includes(HS.type))HS.type='all';if(!HS_RANGES.includes(HS.range))HS.range='7';}
  el.innerHTML=dhead('📜 '+t('nav_hist'),'<span id="hsCount"></span>')+sqlNeedBox()+
    '<div id="hsPills">'+hsPillsHtml()+'</div>'+
    '<div id="hsRangeBox"></div>'+searchBox('hsQ',v=>{HS.q=v;HS_SHOW=60;hsSaveF();hsPaint();},t('hs_search_ph'))+'<div id="hsBody"><div class="spin"></div></div>';
  const q=document.getElementById('hsQ');if(q)q.value=HS.q||'';
  hsRangeBox();hsLoad();};
function hsPillsHtml(){ // ชิปประเภท + ช่วงเวลา — กดแล้ววาดชิปใหม่ด้วย (pillBar ไม่เปลี่ยนสีให้เอง · เจ้าของเจอ 2026-10-17 ว่า "ปุ่มเหมือนใช้ไม่ได้")
  return pillBar(HS_TYPES.map(k=>({k,lb:t('hs_t_'+k)})),HS.type,'hsSetType',{scroll:1})+
    pillBar(HS_RANGES.map(k=>({k,lb:t('hs_r_'+k)})),HS.range,'hsSetRange',{scroll:1,cls:'hs-rpills'});}
function hsPillsPaint(){const b=document.getElementById('hsPills');if(b)b.innerHTML=hsPillsHtml();}
function hsSetType(k){if(!HS_TYPES.includes(k))k='all';HS.type=k;HS_SHOW=60;hsSaveF();hsPillsPaint();hsPaint();}
function hsSetRange(k){if(!HS_RANGES.includes(k))k='7';HS.range=k;HS_SHOW=60;hsSaveF();hsPillsPaint();hsRangeBox();hsLoad();}
function hsSaveF(){LS.set(HS_F,{type:HS.type,range:HS.range,from:HS.from,to:HS.to,q:HS.q});}
function hsRangeBox(){const b=document.getElementById('hsRangeBox');if(!b)return;if(HS.range!=='custom'){b.innerHTML='';return;}
  const [a,z]=hsRange();b.innerHTML='<div class="hs-range"><span class="xs mut">'+esc(t('hs_from'))+'</span><input type="date" id="hsFrom" value="'+esc(a)+'" onchange="HS.from=this.value;hsSaveF();hsLoad()">'+
    '<span class="xs mut">'+esc(t('hs_to'))+'</span><input type="date" id="hsTo" value="'+esc(z)+'" onchange="HS.to=this.value;hsSaveF();hsLoad()"></div>';}
let HS_SEQ=0;
async function hsLoad(){
  const seq=++HS_SEQ;const b=document.getElementById('hsBody');if(!b)return;b.innerHTML='<div class="spin"></div>';
  const [a,z]=hsRange();HS_PART=false;HS_CAP=false;
  const get=(tb,build)=>build(sb.from(tb).select('*').gte('d',a).lte('d',z)).order('created_at',{ascending:false}).limit(HS_LIMIT).then(r=>{if(r.error){HS_PART=true;return [];}const d=r.data||[];if(d.length>=HS_LIMIT)HS_CAP=true;return d;}).catch(()=>{HS_PART=true;return [];});
  const [rc,pd,dl,ct,mv]=await Promise.all([get('kc_receipts',q=>q),get('kc_productions',q=>q),get('kc_deliveries',q=>q),get('kc_counts',q=>q),get('kc_moves',q=>q.in('kind',['adjust','waste']))]);
  if(seq!==HS_SEQ)return;
  const ev=[];
  rc.forEach(r=>ev.push({k:'receive',id:r.id,d:r.d,ts:r.created_at,ic:'📥',tt:(r.sup_name||t('hs_t_receive'))+(r.bill_no?' #'+r.bill_no:''),sb:(r.by_name||''),amt:money(r.total),txt:[r.sup_name,r.bill_no,r.note,r.by_name]}));
  pd.forEach(p=>ev.push({k:'produce',id:p.id,d:p.d,ts:p.created_at,ic:'🍳',tt:p.name||'',sb:t('hs_lots',{n:fmtQ(p.lots)})+' · '+t('hs_got')+' '+fmtQ(p.actual_qty)+' '+trUnit(p.unit)+(p.by_name?' · '+p.by_name:''),amt:money(p.cost_total),amt2:'฿'+fmtQ(p.cost_unit)+t('per_unit'),txt:[p.name,p.note,p.by_name,p.kind]}));
  dl.filter(x=>inBr(x.branch)).forEach(x=>ev.push({k:'send',id:x.id,d:x.d,ts:x.created_at,ic:'🚚',tt:(x.branch_name||branchName(x.branch)||x.branch||'')+(x.bill_no?' · '+x.bill_no:''),sb:(x.status==='void'?t('hs_voided'):hsStTxt(x.status))+(x.by_name?' · '+x.by_name:''),amt:money(x.total),cls:x.status==='void'?'k-void':'',txt:[x.branch_name,x.branch,x.bill_no,x.note,x.by_name]}));
  ct.forEach(c=>ev.push({k:'count',id:c.id,d:c.d,ts:c.created_at,ic:'📋',tt:(c.kind==='recipe'?t('hs_count_recipes'):t('hs_count_items')),sb:t('hs_lines',{n:fmtI(c.n)})+' · '+t('hs_count_diff',{n:fmtI(c.diff)})+(c.by_name?' · '+c.by_name:''),amt:'',txt:[c.note,c.by_name,c.kind]}));
  const pdIds=new Set(pd.map(p=>String(p.id)));   // เศษ/ทิ้งของล็อตที่ถูกยกเลิกแล้ว (แถวคืนสต๊อก ✏️ รวมเศษไว้แล้ว) = ติดป้ายบอก
  mv.filter(m=>m.ref_table!=='kc_counts').forEach(m=>{const isVoid=m.ref_table==='kc_receipts',gone=!HS_PART&&m.kind==='waste'&&m.ref_table==='kc_productions'&&!pdIds.has(String(m.ref_id2));
    ev.push({k:isVoid?'receive':'adjust',id:m.id,mv:m,d:m.d,ts:m.created_at,ic:isVoid?'↩️':(m.kind==='waste'?'🗑️':'✏️'),cls:isVoid?'k-void':'',
      tt:(isVoid?t('hs_void')+' · ':'')+(m.name||''),sb:(isVoid?'':t('hs_kind_'+m.kind)+' · ')+(m.note||'')+(m.by_name?' · '+m.by_name:'')+(gone?' · ('+t('hs_lot_voided')+')':''),amt:(num(m.qty)>0?'+':'')+fmtQ(m.qty)+' '+trUnit(hsUnitOf(m)),amt2:m.cost!=null?money(m.cost):'',txt:[m.name,m.note,m.by_name]});});
  ev.sort((x,y)=>{if(y.d!==x.d)return y.d<x.d?-1:1;const a=String(x.ts||''),b=String(y.ts||'');return b<a?-1:b>a?1:0;});
  HS_EV=ev;hsPaint();}
function hsStTxt(st){const k='hs_st_'+st;return I18N.th[k]?t(k):(st||'');}
function hsUnitOf(m){const o=m.ref_kind==='recipe'?recipeById(m.ref_id):itemById(m.ref_id);return o?(m.ref_kind==='recipe'?o.yield_unit:o.unit)||'':'';}
function hsMatch(e){if(HS.type!=='all'&&e.k!==HS.type)return false;const q=supKey(HS.q);if(!q)return true;return (e.txt||[]).concat([e.tt,e.sb]).some(x=>supKey(x).includes(q));}
function hsPaint(){
  const b=document.getElementById('hsBody');if(!b)return;const rows=HS_EV.filter(hsMatch);
  const c=document.getElementById('hsCount');if(c)c.textContent=t('hs_n_events',{n:rows.length});
  let h=(HS_PART?'<div class="badbox">⚠ '+esc(t('hs_load_part'))+'</div>':'')+(HS_CAP?'<div class="badbox">⚠ '+esc(t('hs_load_cap'))+'</div>':'');
  if(!rows.length){b.innerHTML=h+emptyBox(t('hs_empty'));return;}
  const td=bizTodayISO();let last='';
  rows.slice(0,HS_SHOW).forEach(e=>{if(e.d!==last){last=e.d;h+='<div class="hs-day">'+esc(dispDate(e.d))+(e.d===td?' · '+esc(t('today')):'')+'<span class="sp">'+rows.filter(x=>x.d===e.d).length+'</span></div>';}
    h+='<div class="hs-ev k-'+esc(e.k)+(e.cls?' '+esc(e.cls):'')+'" onclick="hsOpen(\''+esc(e.k)+'\',\''+esc(String(e.id))+'\')"><div class="ic">'+e.ic+'</div><div class="tx"><div class="tt">'+esc(e.tt)+'</div><div class="sb">'+esc(e.sb)+(e.ts?' · '+esc(dispTime(e.ts)):'')+'</div></div>'+
      '<div class="amt">'+esc(e.amt||'')+(e.amt2?'<small>'+esc(e.amt2)+'</small>':'')+'</div></div>';});
  if(rows.length>HS_SHOW)h+='<button class="btn gh" style="width:100%" onclick="HS_SHOW+=60;hsPaint()">'+esc(t('hs_more'))+' ('+(rows.length-HS_SHOW)+')</button>';
  b.innerHTML=h;}
function hsOpen(k,id){
  const e=HS_EV.find(x=>x.k===k&&String(x.id)===String(id));
  if(k==='receive'){if(e&&e.mv)return hsMoveModal(e.mv);if(typeof rcDetail==='function')return rcDetail(id);}
  if(k==='produce'){if(typeof mkDetail==='function')return mkDetail(id);return hsGeneric('kc_productions','kc_production_lines','production_id',id,'🍳 '+t('hs_t_produce'),hsProdHtml);}
  if(k==='send'){if(typeof blDetail==='function')return blDetail(id);return hsGeneric('kc_deliveries','kc_delivery_lines','delivery_id',id,'🚚 '+t('hs_t_send'),hsDelivHtml);}
  if(k==='count'){if(typeof ctDetail==='function')return ctDetail(id);return hsGeneric('kc_counts','kc_count_lines','count_id',id,'📋 '+t('hs_t_count'),hsCountHtml);}
  if(e&&e.mv)return hsMoveModal(e.mv);}
async function hsGeneric(tb,ltb,fk,id,title,body){
  let r=null,lines=[];try{r=await db(()=>sb.from(tb).select('*').eq('id',id).maybeSingle());if(r)lines=await db(()=>sb.from(ltb).select('*').eq(fk,id).order('sort').order('id'));}catch(e){return;}
  if(!r){toast(t('empty'));return;}
  openModal('<h3>'+title+'</h3>'+body(r,lines)+'<div class="row" style="margin-top:12px"><button class="btn" style="margin-left:auto" onclick="closeModal()">'+esc(t('close'))+'</button></div>');}
function hsMeta(r){return '<div class="xs mut" style="margin-bottom:8px">'+esc(dispDate(r.d))+(r.created_at?' '+esc(dispTime(r.created_at)):'')+(r.by_name?' · '+esc(t('hs_by'))+' '+esc(r.by_name):'')+'</div>'+(r.note?'<div class="note">'+esc(r.note)+'</div>':'');}
function hsProdHtml(p,lines){
  return '<div class="row"><b style="font-size:17px">'+esc(p.name||'')+'</b><span class="chip blue">'+esc(t('hs_lots',{n:fmtQ(p.lots)}))+'</span></div>'+hsMeta(p)+
    '<div class="kpis"><div class="kpi"><div class="t">'+esc(t('hs_got'))+'</div><div class="kpi-v">'+fmtQ(p.actual_qty)+' <small>'+esc(trUnit(p.unit))+'</small></div></div>'+
    '<div class="kpi"><div class="t">'+esc(t('hs_cost_unit'))+'</div><div class="kpi-v">฿'+fmtQ(p.cost_unit)+'</div></div></div>'+
    '<div class="twrap"><table class="t"><thead><tr><th>'+esc(t('item'))+'</th><th class="n">'+esc(t('hs_plan'))+'</th><th class="n">'+esc(t('hs_used'))+'</th><th class="n">'+esc(t('hs_waste'))+'</th><th class="n">'+esc(t('cost'))+'</th></tr></thead><tbody>'+
    lines.map(l=>'<tr><td>'+esc(l.name||'')+' <span class="xs mut">'+esc(trUnit(l.unit))+'</span></td><td class="n">'+fmtQ(l.qty_plan)+'</td><td class="n">'+fmtQ(l.qty_used)+'</td><td class="n">'+fmtQ(l.qty_waste)+'</td><td class="n">'+esc(money(l.cost))+'</td></tr>').join('')+
    '<tr><td colspan="4">'+esc(t('hs_cost_items'))+'</td><td class="n">'+esc(money(p.cost_items))+'</td></tr><tr><td colspan="4">'+esc(t('hs_cost_oh'))+'</td><td class="n">'+esc(money(p.cost_overhead))+'</td></tr>'+
    '<tr class="tot"><td colspan="4">'+esc(t('hs_cost_total'))+'</td><td class="n">'+esc(money(p.cost_total))+'</td></tr></tbody></table></div>';}
function hsDelivHtml(x,lines){
  return '<div class="row"><b style="font-size:17px">'+esc(x.branch_name||branchName(x.branch)||x.branch||'')+'</b>'+stPill(x.status||'sent',hsStTxt(x.status||'sent'))+(x.bill_no?'<span class="mut sm">'+esc(t('hs_bill'))+' '+esc(x.bill_no)+'</span>':'')+'</div>'+hsMeta(x)+
    '<div class="twrap"><table class="t"><thead><tr><th>'+esc(t('product'))+'</th><th class="n">'+esc(t('hs_ordered'))+'</th><th class="n">'+esc(t('hs_sent'))+'</th><th class="n">'+esc(t('price'))+'</th><th class="n">'+esc(t('total'))+'</th></tr></thead><tbody>'+
    lines.map(l=>'<tr><td>'+esc(l.name||'')+' <span class="xs mut">'+esc(trUnit(l.unit))+'</span></td><td class="n">'+fmtQ(l.ordered)+'</td><td class="n">'+fmtQ(l.sent)+'</td><td class="n">'+fmtQ(l.unit_price)+'</td><td class="n">'+esc(money(l.amount))+'</td></tr>').join('')+
    '<tr class="tot"><td colspan="4">'+esc(t('total'))+'</td><td class="n">'+esc(money(x.total))+'</td></tr></tbody></table></div>';}
function hsCountHtml(c,lines){
  return '<div class="row"><b style="font-size:17px">'+esc(c.kind==='recipe'?t('hs_count_recipes'):t('hs_count_items'))+'</b><span class="chip mid">'+esc(t('hs_lines',{n:fmtI(c.n)}))+'</span><span class="chip warn">'+esc(t('hs_count_diff',{n:fmtI(c.diff)}))+'</span></div>'+hsMeta(c)+
    '<div class="twrap"><table class="t"><thead><tr><th>'+esc(t('name'))+'</th><th class="n">'+esc(t('hs_sys'))+'</th><th class="n">'+esc(t('hs_counted'))+'</th><th class="n">'+esc(t('hs_delta'))+'</th></tr></thead><tbody>'+
    lines.map(l=>{const dlt=num(l.delta);return '<tr><td>'+esc(l.name||'')+' <span class="xs mut">'+esc(trUnit(l.unit))+'</span></td><td class="n">'+fmtQ(l.sys_qty)+'</td><td class="n">'+fmtQ(l.counted_qty)+'</td><td class="n '+(dlt<0?'red':dlt>0?'green':'')+'">'+(dlt>0?'+':'')+fmtQ(dlt)+'</td></tr>';}).join('')+'</tbody></table></div>';}
function hsMoveModal(m){
  openModal('<h3>'+(m.ref_table==='kc_receipts'?'↩️ '+esc(t('hs_void')):(m.kind==='waste'?'🗑️ ':'✏️ ')+esc(t('hs_kind_'+m.kind)))+'</h3>'+
    '<div class="row"><b style="font-size:17px">'+esc(m.name||'')+'</b><span class="chip '+(num(m.qty)<0?'bad':'ok')+'">'+(num(m.qty)>0?'+':'')+fmtQ(m.qty)+' '+esc(trUnit(hsUnitOf(m)))+'</span>'+(m.cost!=null?'<span class="chip mid">'+esc(money(m.cost))+'</span>':'')+'</div>'+hsMeta(m)+
    '<div class="row" style="margin-top:12px"><button class="btn" style="margin-left:auto" onclick="closeModal()">'+esc(t('close'))+'</button></div>');}
