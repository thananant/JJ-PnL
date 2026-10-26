/* ============================================================
   📋 นับสต๊อก — count (ct*)
   สองส่วน 🥬 วัตถุดิบ / 🍲 สินค้าที่ผลิตแล้ว (ปุ่มเลือกบน) · ชิปหมวด (นับแล้ว/ทั้งหมด) · การ์ดนับ (รูป ชื่อ "ในระบบ X หน่วยนับ" − [ช่อง] ＋ · หมด)
   พิมพ์แล้วแก้ในที่ ไม่วาดหน้าใหม่ (คีย์บอร์ดมือถือไม่หุบ) · แถบติดล่าง "นับแล้ว a/b · ยกเลิก · 💾 บันทึก"
   ร่างใน localStorage jjck_ct_draft (วันเดียวกัน ≤12 ชม.) — สลับแท็บ/ลากหน้าลงรีเฟรชแล้วตัวเลขยังอยู่
   หน่วยนับ: วัตถุดิบ = countUnitOf (ตั้งเอง → บรรจุเล็กสุด → หน่วยหลัก) · สินค้า = หน่วยผลิต (yield_unit) · สต๊อกในฐานข้อมูลยังเป็นหน่วยหลักเสมอ
   บันทึก = สรุปเฉพาะที่ต่าง → kc_counts (1 แถว/ส่วน) + kc_count_lines (ทุกรายการที่นับ) + kc_moves 'adjust' + ck_add_qty (ผ่าน pushMoves)
   ctDetail(id) = หน้าต่างผลนับ (โมดูลประวัติเรียก)
   ✂️ เศษตัดแต่ง (เจ้าของ 2026-10-19): วัตถุดิบทุกตัวมีปุ่ม ✂️ เศษ → ช่องใส่เศษ (เลือกหน่วย · เก็บร่างแยก CT_S) · ตัวที่เคยมีเศษเปิดช่องให้เอง
     บันทึก: ยอดที่หายแยกเป็น kc_moves 'waste' (−เศษ × ต้นทุน · note เศษตัดแต่ง) + 'adjust' ส่วนที่เหลือ → สต๊อกสุดท้าย = ที่นับได้เหมือนเดิม
     yield = 1 − เศษ ÷ ใช้ไป · ใช้ไป = นับครั้งก่อน + รับเข้า (kc_moves ref_table kc_receipts) ตั้งแต่นับครั้งก่อน − นับครั้งนี้ · ไม่มีนับครั้งก่อน = ไม่คิด yield
     kc_count_lines.scrap_qty/used_qty/scrap_cost (ยังไม่รัน SQL = ตัดช่องแล้วบันทึกต่อ + เตือน) · 💰 บัญชี การ์ดของเสียของเดือน · 🥬 ฟอร์มวัตถุดิบ yield ย้อนหลัง
   ============================================================ */
I18N.add({
th:{ct_items:'วัตถุดิบ',ct_recipes:'สินค้าที่ผลิตแล้ว',ct_sys:'ในระบบ',ct_out:'หมด',ct_counted:'นับแล้ว {a}/{b}',ct_save:'💾 บันทึก',
  ct_hint:'พิมพ์จำนวนที่นับได้ตามหน่วยที่ร้านนับจริง · แตะ "หมด" ถ้าไม่เหลือ · ตัวเลขเก็บไว้ให้จนกว่าจะกดบันทึก',
  ct_draft:'กู้ตัวเลขที่นับค้างไว้ {n} รายการ',ct_cancel_q:'ทิ้งตัวเลขที่นับไว้ทั้งหมด?',ct_no_match:'ไม่พบรายการที่ค้นหา',ct_none:'ยังไม่มีรายการให้นับ',
  ct_unit_eq:'1 {u} = {q} {b}',ct_sum_t:'สรุปผลนับ',ct_sum_n:'นับแล้ว {n}',ct_sum_ok:'ตรง {n}',ct_sum_diff:'ต่าง {n}',
  ct_sum_none:'นับแล้วตรงกับระบบทุกรายการ ✅',ct_sum_hint:'ระบบจะปรับยอดให้เท่ากับที่นับได้ และบันทึกลงประวัติ',
  ct_scrap_btn:'✂️ เศษ',ct_scrap_lb:'✂️ เศษจากการตัดแต่ง (ชั่งที่ทิ้ง)',ct_scrap_lone:'ใส่เศษแล้ว แต่ยังไม่ได้นับของที่เหลือ: {list}',ct_scrap_t:'✂️ เศษตัดแต่ง + Yield',ct_scrap_h:'เศษถูกบันทึกเป็นของเสีย (มีมูลค่าตามต้นทุน) · Yield = ส่วนที่ใช้ได้ ÷ ที่ใช้ไปทั้งหมดตั้งแต่นับครั้งก่อน',ct_col_scrap:'เศษ',ct_col_used:'ใช้ไป',ct_col_yield:'Yield',ct_col_val:'มูลค่า',ct_yield_na:'ยังคิดไม่ได้ (ต้องมีนับครั้งก่อน)',ct_yield_over:'เศษมากกว่าที่ใช้ไป — ตรวจตัวเลข',ct_scrap_note:'เศษตัดแต่ง (นับสต๊อก)',ct_scrap_sql:'บันทึกผลนับแล้ว แต่ยังเก็บข้อมูลเศษ/yield ไม่ได้ — ต้องรัน SQL รุ่นล่าสุด (⚙️ ตั้งค่า → 🗄️)',ct_col_sys:'ในระบบ',ct_col_cnt:'นับได้',ct_col_diff:'ต่าง',ct_apply:'✅ ปรับยอดตามที่นับ ({n})',ct_apply0:'✅ บันทึกว่านับแล้ว',ct_note_ph:'หมายเหตุ (ไม่บังคับ)',
  ct_sql_block:'ยังไม่ได้รัน SQL jjmk_kitchen2.sql — บันทึกผลนับไม่ได้',ct_saved:'บันทึกผลนับแล้ว ✅',ct_move_note:'นับสต๊อก',
  ct_not_saved:'บันทึกไม่สำเร็จ — ไม่มีอะไรถูกบันทึก ลองใหม่อีกครั้ง',ct_detail_t:'ผลนับ',ct_by:'โดย',ct_noread:'อ่านผลนับไม่ได้',ct_lines_n:'{n} รายการ',ct_section:'ส่วน'},
en:{ct_items:'Ingredients',ct_recipes:'Finished products',ct_sys:'System',ct_out:'Out',ct_counted:'Counted {a}/{b}',ct_save:'💾 Save',
  ct_hint:'Type what you counted in the unit you really count in · tap "Out" if none left · numbers are kept until you save',
  ct_draft:'Restored {n} unsaved counts',ct_cancel_q:'Discard everything counted so far?',ct_no_match:'No item matches',ct_none:'Nothing to count yet',
  ct_unit_eq:'1 {u} = {q} {b}',ct_sum_t:'Count summary',ct_sum_n:'Counted {n}',ct_sum_ok:'Match {n}',ct_sum_diff:'Differ {n}',
  ct_sum_none:'Everything matches the system ✅',ct_sum_hint:'Stock will be adjusted to what you counted and saved to history',
  ct_scrap_btn:'✂️ Trim',ct_scrap_lb:'✂️ Trimmings (weigh what was thrown away)',ct_scrap_lone:'Trimmings entered but the remaining stock is not counted: {list}',ct_scrap_t:'✂️ Trimmings + Yield',ct_scrap_h:'Trimmings are saved as waste (valued at cost) · Yield = usable ÷ everything used since the last count',ct_col_scrap:'Trim',ct_col_used:'Used',ct_col_yield:'Yield',ct_col_val:'Value',ct_yield_na:'Not yet (needs a previous count)',ct_yield_over:'Trimmings exceed what was used — check the numbers',ct_scrap_note:'เศษตัดแต่ง (นับสต๊อก)',ct_scrap_sql:'Count saved, but trimmings/yield could not be stored — run the latest SQL (⚙️ Settings → 🗄️)',ct_col_sys:'System',ct_col_cnt:'Counted',ct_col_diff:'Diff',ct_apply:'✅ Adjust stock ({n})',ct_apply0:'✅ Save as counted',ct_note_ph:'Note (optional)',
  ct_sql_block:'jjmk_kitchen2.sql has not been run — cannot save the count',ct_saved:'Count saved ✅',ct_move_note:'นับสต๊อก',
  ct_not_saved:'NOT saved — please try again',ct_detail_t:'Count result',ct_by:'by',ct_noread:'Could not read the count',ct_lines_n:'{n} lines',ct_section:'Section'},
lo:{ct_items:'ວັດຖຸດິບ',ct_recipes:'ສິນຄ້າທີ່ຜະລິດແລ້ວ',ct_sys:'ໃນລະບົບ',ct_out:'ໝົດ',ct_counted:'ນັບແລ້ວ {a}/{b}',ct_save:'💾 ບັນທຶກ',
  ct_hint:'ພິມຈຳນວນທີ່ນັບໄດ້ຕາມຫົວໜ່ວຍທີ່ຮ້ານນັບແທ້ · ແຕະ "ໝົດ" ຖ້າບໍ່ເຫຼືອ · ຕົວເລກເກັບໄວ້ໃຫ້ຈົນກວ່າຈະກົດບັນທຶກ',
  ct_draft:'ກູ້ຕົວເລກທີ່ນັບຄ້າງໄວ້ {n} ລາຍການ',ct_cancel_q:'ຖິ້ມຕົວເລກທີ່ນັບໄວ້ທັງໝົດ?',ct_no_match:'ບໍ່ພົບລາຍການທີ່ຄົ້ນຫາ',ct_none:'ຍັງບໍ່ມີລາຍການໃຫ້ນັບ',
  ct_unit_eq:'1 {u} = {q} {b}',ct_sum_t:'ສະຫຼຸບຜົນນັບ',ct_sum_n:'ນັບແລ້ວ {n}',ct_sum_ok:'ຕົງ {n}',ct_sum_diff:'ຕ່າງ {n}',
  ct_sum_none:'ນັບແລ້ວຕົງກັບລະບົບທຸກລາຍການ ✅',ct_sum_hint:'ລະບົບຈະປັບຍອດໃຫ້ເທົ່າກັບທີ່ນັບໄດ້ ແລະ ບັນທຶກລົງປະຫວັດ',
  ct_scrap_btn:'✂️ ເສດ',ct_scrap_lb:'✂️ ເສດຈາກການຕັດແຕ່ງ (ຊັ່ງທີ່ຖິ້ມ)',ct_scrap_lone:'ໃສ່ເສດແລ້ວ ແຕ່ຍັງບໍ່ໄດ້ນັບຂອງທີ່ເຫຼືອ: {list}',ct_scrap_t:'✂️ ເສດຕັດແຕ່ງ + Yield',ct_scrap_h:'ເສດຖືກບັນທຶກເປັນຂອງເສຍ (ມີມູນຄ່າຕາມຕົ້ນທຶນ) · Yield = ສ່ວນທີ່ໃຊ້ໄດ້ ÷ ທີ່ໃຊ້ໄປທັງໝົດນັບແຕ່ນັບຄັ້ງກ່ອນ',ct_col_scrap:'ເສດ',ct_col_used:'ໃຊ້ໄປ',ct_col_yield:'Yield',ct_col_val:'ມູນຄ່າ',ct_yield_na:'ຍັງຄິດບໍ່ໄດ້ (ຕ້ອງມີນັບຄັ້ງກ່ອນ)',ct_yield_over:'ເສດຫຼາຍກວ່າທີ່ໃຊ້ໄປ — ກວດຕົວເລກ',ct_scrap_note:'เศษตัดแต่ง (นับสต๊อก)',ct_scrap_sql:'ບັນທຶກຜົນນັບແລ້ວ ແຕ່ຍັງເກັບຂໍ້ມູນເສດ/yield ບໍ່ໄດ້ — ຕ້ອງແລ່ນ SQL ລຸ້ນລ່າສຸດ (⚙️ ຕັ້ງຄ່າ → 🗄️)',ct_col_sys:'ໃນລະບົບ',ct_col_cnt:'ນັບໄດ້',ct_col_diff:'ຕ່າງ',ct_apply:'✅ ປັບຍອດຕາມທີ່ນັບ ({n})',ct_apply0:'✅ ບັນທຶກວ່ານັບແລ້ວ',ct_note_ph:'ໝາຍເຫດ (ບໍ່ບັງຄັບ)',
  ct_sql_block:'ຍັງບໍ່ໄດ້ແລ່ນ SQL jjmk_kitchen2.sql — ບັນທຶກຜົນນັບບໍ່ໄດ້',ct_saved:'ບັນທຶກຜົນນັບແລ້ວ ✅',ct_move_note:'นับสต๊อก',
  ct_not_saved:'ບໍ່ໄດ້ບັນທຶກ — ລອງໃໝ່ອີກຄັ້ງ',ct_detail_t:'ຜົນນັບ',ct_by:'ໂດຍ',ct_noread:'ອ່ານຜົນນັບບໍ່ໄດ້',ct_lines_n:'{n} ລາຍການ',ct_section:'ສ່ວນ'},
my:{ct_items:'ကုန်ကြမ်း',ct_recipes:'ထုတ်ကုန်',ct_sys:'စနစ်တွင်',ct_out:'ကုန်',ct_counted:'ရေတွက်ပြီး {a}/{b}',ct_save:'💾 သိမ်း',
  ct_hint:'အမှန်ရေတွက်သည့်ယူနစ်ဖြင့် ရေတွက်ရသည့်အရေအတွက်ကို ရိုက်ပါ · မကျန်လျှင် "ကုန်" ကိုနှိပ်ပါ · မသိမ်းမချင်း ကိန်းဂဏန်းများ ကျန်နေမည်',
  ct_draft:'မသိမ်းရသေးသော ရေတွက်မှု {n} ခု ပြန်ရပြီ',ct_cancel_q:'ရေတွက်ထားသမျှ အားလုံးကို ဖျက်မလား?',ct_no_match:'ရှာသည့်အရာ မတွေ့ပါ',ct_none:'ရေတွက်ရန် မရှိသေးပါ',
  ct_unit_eq:'1 {u} = {q} {b}',ct_sum_t:'ရေတွက်မှု အနှစ်ချုပ်',ct_sum_n:'ရေတွက်ပြီး {n}',ct_sum_ok:'ကိုက်ညီ {n}',ct_sum_diff:'ကွာခြား {n}',
  ct_sum_none:'အားလုံး စနစ်နှင့် ကိုက်ညီသည် ✅',ct_sum_hint:'ရေတွက်ရသည့်အတိုင်း လက်ကျန်ကို ပြင်ပြီး မှတ်တမ်းတွင် သိမ်းမည်',
  ct_scrap_btn:'✂️ အပိုင်းအစ',ct_scrap_lb:'✂️ ညှိဖြတ်ပြီး အပိုင်းအစ (လွှင့်ပစ်သည်ကို ချိန်ပါ)',ct_scrap_lone:'အပိုင်းအစ ထည့်ပြီး ကျန်ပစ္စည်း မရေတွက်ရသေး: {list}',ct_scrap_t:'✂️ အပိုင်းအစ + Yield',ct_scrap_h:'အပိုင်းအစကို အလေအလွင့်အဖြစ် သိမ်းသည် (ကုန်ကျစရိတ်ဖြင့် တန်ဖိုး) · Yield = သုံးနိုင်သည် ÷ ယခင်ရေတွက်ပြီးနောက် သုံးခဲ့သမျှ',ct_col_scrap:'အပိုင်းအစ',ct_col_used:'သုံးခဲ့',ct_col_yield:'Yield',ct_col_val:'တန်ဖိုး',ct_yield_na:'မတွက်နိုင်သေး (ယခင်ရေတွက်မှု လို)',ct_yield_over:'အပိုင်းအစ သုံးခဲ့သည်ထက် များ — ဂဏန်းစစ်ပါ',ct_scrap_note:'เศษตัดแต่ง (นับสต๊อก)',ct_scrap_sql:'ရေတွက်မှု သိမ်းပြီး၊ အပိုင်းအစ/yield မသိမ်းနိုင်သေး — နောက်ဆုံး SQL run ပါ (⚙️ ဆက်တင် → 🗄️)',ct_col_sys:'စနစ်',ct_col_cnt:'ရေတွက်ရ',ct_col_diff:'ကွာခြား',ct_apply:'✅ ရေတွက်သည့်အတိုင်း ပြင်ရန် ({n})',ct_apply0:'✅ ရေတွက်ပြီးဟု သိမ်းရန်',ct_note_ph:'မှတ်ချက် (မဖြစ်မနေမဟုတ်)',
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
.skcard .skgrid{display:grid;grid-template-columns:112px minmax(0,1fr);gap:12px;align-items:stretch}
.skcard .skpic .ithumb{width:112px;height:100%;min-height:112px;max-height:150px;border-radius:12px;font-size:44px;display:flex;align-items:center;justify-content:center;overflow:hidden;margin:0}
.skcard .skpic .ithumb img{width:100%;height:100%;object-fit:cover;display:block}
.skcard .skright{min-width:0;display:flex;flex-direction:column}
.skcard .skright .skstep{margin-top:8px;gap:5px}
.skcard .skright .skstep button{width:40px;height:44px;font-size:20px}
.skcard .skright .skstep input{min-width:44px;font-size:17px}
.skcard .skright .skfoot{margin-top:auto;padding-top:6px}
@media(max-width:360px){.skcard .skgrid{grid-template-columns:84px minmax(0,1fr);gap:8px}.skcard .skpic .ithumb{width:84px;min-height:84px;font-size:34px}.skcard .skright .skstep .ctu{display:none}}
.skcard .iname{min-height:auto}
.skcard .isub b{font-family:var(--fh);font-size:14.5px;color:var(--ink)}
.skstep .ctu{flex:none;font-size:13px;max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.skcard .skfoot .outb{min-height:44px;padding:8px 14px}   /* ปุ่มแตะ ≥44px บนมือถือ */
.skcard .skfoot .scb{margin-left:auto;border:1.5px solid var(--line);background:#fff;border-radius:10px;min-height:44px;padding:8px 10px;font-size:13px;color:var(--mut);flex:none}
.skcard .skfoot .scb~.outb{margin-left:0}.skcard .skfoot .scb.on{background:#FFF6E0;border-color:#E9C46A;color:#8A5A00;font-weight:700}
.ctscrap{display:none;margin-top:6px;padding:6px 8px;border-radius:10px;background:#FFF9EC;border:1px dashed #E9C46A}.skcard.so .ctscrap{display:block}
.ctscrap .lb{font-size:12.5px;font-weight:700;color:#8A5A00;margin-bottom:4px}
.ctscrap .scrow{display:grid;grid-template-columns:40px minmax(40px,1fr) 40px minmax(0,auto);gap:5px;align-items:center}
.ctscrap .scrow button{width:40px;height:44px;min-height:44px;border-radius:10px;border:1.5px solid var(--line);background:#fff;color:var(--mut);font-size:20px;font-weight:700;padding:0}
.ctscrap .scrow input{width:100%;min-width:0;height:44px;min-height:44px;font-size:16px;font-weight:700;text-align:center;padding:0 4px}
.ctscrap .scrow select{min-width:0;max-width:96px;min-height:44px;padding:0 6px}
.ctyield td.n.y{font-weight:800}.ctyield td.n.y.bad{color:var(--bad)}.ctyield td.n.y.ok{color:var(--ok)}
.pinbar .ctacts{margin-left:auto;display:flex;gap:8px}.pinbar .ctacts .btn{margin-left:0}
.ctsum tr.ctk td{background:#FBF6EA;font-weight:700;font-family:var(--fh);color:var(--wine)}
.ctsum td .xs{display:block;color:var(--mut)}
.ctsum tr.ctrow.pos td.n.d{color:var(--ok)}.ctsum tr.ctrow.neg td.n.d{color:var(--bad)}
@media(max-width:339px){.ctsum td,.ctsum th{padding:6px 4px;font-size:12.5px}.ctsum td .xs{display:none}}   /* จอพับ 280px: ให้คอลัมน์ "ต่าง" อยู่ในจอ */
`);
let CT={};                                            // {'kind|id':{kind,id,v:'ที่พิมพ์',u:'หน่วยนับตอนพิมพ์'}}
let CT_S={};                                          // ✂️ เศษตัดแต่ง {'item|id':{v,u}} (แยกจาก CT — ลบตัวเลขนับแล้วเศษไม่หาย)
let CT_SO={};                                         // การ์ดที่เปิดช่องเศษอยู่ (หน้าจอเท่านั้น)
let CT_SEEN=null;                                     // Set ของวัตถุดิบที่เคยมีเศษ (kc_count_lines.scrap_qty>0) — เปิดช่องให้เอง
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
function ctAny(){return Object.values(CT).some(ctCounted)||Object.keys(CT_S).some(ctScrapHas);}

/* ---------- ร่าง ---------- */
function ctDraftGet(){const d=LS.get(CT_DRAFT,null);if(!d||!d.e||d.d!==bizTodayISO()||Date.now()-num(d.t)>CT_DRAFT_MS){if(d)LS.del(CT_DRAFT);return null;}return d;}
function ctDraftSave(){const e={},sc={};Object.values(CT).forEach(x=>{if(ctCounted(x))e[x.kind+'|'+x.id]={v:String(x.v),u:x.u||''};});
  Object.keys(CT_S).forEach(k=>{if(ctScrapHas(k))sc[k]={v:String(CT_S[k].v),u:CT_S[k].u||''};});
  if(Object.keys(e).length||Object.keys(sc).length)LS.set(CT_DRAFT,{t:Date.now(),d:bizTodayISO(),e,s:sc});else LS.del(CT_DRAFT);}
function ctDraftClear(){LS.del(CT_DRAFT);}
function ctDraftRestore(){const d=ctDraftGet();if(!d)return 0;let n=0;
  Object.entries(d.e).forEach(([k,x])=>{const p=k.indexOf('|'),kind=k.slice(0,p),id=k.slice(p+1);if(!ctObj(kind,id))return;
    CT[k]={kind,id,v:String(x&&x.v!=null?x.v:''),u:(x&&x.u)||''};if(ctCounted(CT[k]))n++;else delete CT[k];});
  Object.entries(d.s||{}).forEach(([k,x])=>{const id=k.slice(k.indexOf('|')+1);if(!itemById(id)||!x)return;CT_S[k]={v:String(x.v==null?'':x.v),u:String(x.u||'')};if(ctScrapHas(k)){CT_SO[k]=1;n++;}else delete CT_S[k];});
  if(n)toast('📝 '+t('ct_draft',{n}));return n;}
function ctNormUnits(){ // หน่วยนับของสินค้าเปลี่ยนหลังพิมพ์ไปแล้ว → แปลงตัวเลขที่พิมพ์ไว้เป็นหน่วยใหม่
  Object.values(CT).forEach(e=>{if(e.kind!=='item'||!ctCounted(e)||!e.u)return;const o=itemById(e.id);if(!o)return;
    const U=ctUnit('item',o);if(e.u===U.u)return;const f0=unitFactor(o,e.u);if(f0)e.v=String(rnd4(num(e.v)*f0/U.f));e.u=U.u;});}

/* ---------- หน้า ---------- */
RENDER.count=function(el){
  if(!ctAny())ctDraftRestore();
  ctSeenLoad();
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
  return '<div class="icard skcard'+(counted?' cnt':'')+(kind==='item'&&ctScrapOpen(o)?' so':'')+'" data-k="'+esc(k)+'" data-n="'+esc(supKey(dispName(o)+' '+o.name+' '+ctCatOf(o)))+'">'+
    '<div class="skgrid"><div class="skpic">'+thumbHtml(o,ctIcon(kind,o),'ithumb')+'</div><div class="skright"><div class="skttl">'+
    '<div class="iname">'+esc(dispName(o))+'</div>'+
    '<div class="isub">'+esc(t('ct_sys'))+' <b>'+fmtQ(rnd2(num(o.qty)/U.f))+'</b> '+esc(trUnit(U.u))+
      (U.u!==base?'<br><span class="xs">'+esc(t('ct_unit_eq',{u:trUnit(U.u),q:fmtQ(U.f),b:trUnit(base)}))+'</span>':'')+'</div></div>'+
    '<div class="skstep"><button type="button" aria-label="-" onclick="ctBump(this,-1)">−</button>'+
    '<input type="text" inputmode="decimal" placeholder="0" class="'+(counted?'has':'')+'" value="'+esc(counted?e.v:'')+'" oninput="ctInput(this)" onchange="ctInput(this)">'+
    '<button type="button" class="plus" aria-label="+" onclick="ctBump(this,1)">＋</button><span class="b ctu">'+esc(trUnit(U.u))+'</span></div>'+
    (kind==='item'?ctScrapHtml(o):'')+
    '<div class="skfoot"><span class="b cteq" style="color:var(--gold)">'+ctEqTxt(e,o,kind)+'</span>'+
    (kind==='item'?'<button type="button" class="scb'+(ctScrapHas(k)?' on':'')+'" onclick="ctScrapTog(this)">'+esc(t('ct_scrap_btn'))+'</button>':'')+
    '<button type="button" class="outb'+(counted&&num(e.v)===0?' on':'')+'" onclick="ctZero(this)">'+esc(t('ct_out'))+'</button></div></div></div></div>';}   // รูปซ้ายใหญ่ · ชื่อ/ยอดในระบบขวาบน · จำนวนลงมา · หมดล่างสุด (เจ้าของ 2026-10-18)
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
async function ctCancel(){if(ctAny()){const ok=await confirm2(t('ct_cancel_q'),{danger:true});if(!ok)return;}CT={};CT_S={};CT_SO={};ctDraftClear();ctPaint();}

/* ---------- สรุป + ปรับยอด ---------- */
function ctRows(){ // ทุกรายการที่นับ → {kind,id,o,name,disp,u,f,base,count_qty,sys,cnt,delta}
  const out=[];Object.values(CT).forEach(e=>{if(!ctCounted(e))return;const o=ctObj(e.kind,e.id);if(!o)return;
    const U=ctUnit(e.kind,o),base=ctBase(e.kind,o),cnt=ctTotal(e,o,e.kind),sys=num(o.qty);let delta=rnd4(cnt-sys);if(Math.abs(delta)<1e-9)delta=0;
    const sc=e.kind==='item'?ctScrapBase(e.kind+'|'+e.id,o):0;
    out.push({kind:e.kind,id:e.id,o,name:o.name,disp:dispName(o),u:U.u,f:U.f,base,count_qty:num(e.v),sys,cnt,delta,scrap:sc,su:sc?CT_S[e.kind+'|'+e.id].u:''});});
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
  const lone=Object.keys(CT_S).filter(k=>ctScrapHas(k)&&!ctCounted(CT[k])).map(k=>{const o=itemById(k.slice(k.indexOf('|')+1));return o?dispName(o):'';}).filter(Boolean);
  if(lone.length){toast(t('ct_scrap_lone',{list:lone.join(', ')}),true);return;}   // เศษต้องมาคู่กับยอดคงเหลือที่นับ (คิด yield/ปรับยอดได้)
  if(!ctRows().length){toast(t('ct_none'),true);return;}
  await ctRefreshLive();const rows=ctRows();if(!rows.length)return;
  await ctYieldLoad(rows.filter(r=>r.scrap>0));
  const diffs=rows.filter(r=>r.delta!==0);
  let h='<h3>📋 '+esc(t('ct_sum_t'))+'</h3>'+
    '<div class="row" style="margin-bottom:10px"><span class="chip mid">'+esc(t('ct_sum_n',{n:rows.length}))+'</span><span class="chip ok">'+esc(t('ct_sum_ok',{n:rows.length-diffs.length}))+'</span>'+
    '<span class="chip '+(diffs.length?'warn':'mid')+'">'+esc(t('ct_sum_diff',{n:diffs.length}))+'</span></div>';
  if(!diffs.length)h+='<div class="okbox">'+esc(t('ct_sum_none'))+'</div>';
  else h+='<div class="hintbox">'+esc(t('ct_sum_hint'))+'</div>'+ctSumTable(diffs);
  h+=ctScrapSumHtml(rows.filter(r=>r.scrap>0));
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
        step='lines';await ctLinesInsert(R.map(r=>{const o={count_id:cid,ref_id:r.id,name:r.name,sys_qty:rnd4(r.sys),counted_qty:rnd4(r.cnt),delta:rnd4(r.delta),unit:r.base,count_unit:r.u,count_qty:rnd4(r.count_qty)};
          if(r.scrap>0){const y=ctYieldOf(r),c=itemCost(r.o);o.scrap_qty=rnd4(r.scrap);o.used_qty=y.used==null?null:rnd4(y.used);o.scrap_cost=c==null?null:rnd2(r.scrap*c);}return o;}));
        step='moves';const mv=[];R.forEach(r=>{const c=kind==='item'?itemCost(r.o):recipeUnitCost(r.o),cc=q=>c==null?null:rnd4(q*c);
          if(r.scrap>0)mv.push({d:today,kind:'waste',ref_kind:kind,ref_id:r.id,name:r.name,qty:-r.scrap,cost:cc(-r.scrap),ref_table:'kc_counts',ref_id2:cid,note:I18N.th.ct_scrap_note});   // เศษตัดแต่ง = ของเสียมีมูลค่า
          const rest=rnd4(r.delta+(r.scrap||0));if(Math.abs(rest)>1e-9)mv.push({d:today,kind:'adjust',ref_kind:kind,ref_id:r.id,name:r.name,qty:rest,cost:cc(rest),ref_table:'kc_counts',ref_id2:cid,note:I18N.th.ct_move_note});});   // รวม = delta → สต๊อก = ที่นับได้
        if(mv.length)await pushMoves(mv);
      }catch(e){ // บันทึกไม่ครบ = ถอนหัว/บรรทัด/สต๊อกของส่วนนี้ทิ้ง ไม่เหลือผลนับค้างทั้งที่สต๊อกไม่ขยับ (กดซ้ำได้ ไม่ซ้ำ)
        if(step==='moves')await pushMovesUndo('kc_counts',cid);
        if(step!=='head'){try{await sb.from('kc_count_lines').delete().eq('count_id',cid);}catch(_){}}
        try{await sb.from('kc_counts').delete().eq('id',cid);}catch(_){}
        toast(t('ct_not_saved')+' · '+((e&&e.message)||e),true);throw e;}
      R.forEach(r=>{delete CT[kind+'|'+r.id];delete CT_S[kind+'|'+r.id];if(r.scrap>0&&CT_SEEN)CT_SEEN.add(r.id);});ctDraftSave();}   // ส่วนที่บันทึกแล้วหลุดจากร่าง — ส่วนถัดไปพลาดก็ไม่เขียนซ้ำ
  }catch(e){if(btn)btn.disabled=false;return;}
  CT={};CT_S={};CT_SO={};ctDraftClear();closeModal();toast(CT_NOCOL?t('ct_scrap_sql'):t('ct_saved'),CT_NOCOL?'warn':false);if(S.tab==='count')ctPaint();
});}

/* ---------- ✂️ เศษตัดแต่ง ---------- */
let CT_YB={},CT_NOCOL=false;   // CT_YB = ฐานคิด yield ต่อวัตถุดิบ {prev,inflow} (null = ไม่มีนับครั้งก่อน/อ่านไม่ได้) · CT_NOCOL = ยังไม่รัน SQL ช่องเศษ
function ctScrapHas(k){const x=CT_S[k];if(!x)return false;const v=String(x.v==null?'':x.v).replace(/,/g,'').trim();return v!==''&&isFinite(Number(v))&&Number(v)>0;}
function ctScrapUnits(o){const out=[],base=o.unit||'';const add=u=>{if(u&&!out.includes(u)&&unitFactor(o,u)!=null)out.push(u);};
  if(unitConv(o,'กก.',base)!=null){add('กก.');add('กรัม');}else if(unitConv(o,'ลิตร',base)!=null){add('ลิตร');add('มล.');}
  add(base);add(countUnitOf(o));return out;}
function ctScrapBase(k,o){if(!ctScrapHas(k))return 0;const x=CT_S[k],f=unitFactor(o,x.u||ctScrapUnits(o)[0]);return f==null?0:rnd4(num(x.v)*f);}
function ctScrapHtml(o){const k='item|'+o.id,x=CT_S[k]||{},L=ctScrapUnits(o),u=L.includes(x.u)?x.u:L[0];
  return '<div class="ctscrap"><div class="lb">'+esc(t('ct_scrap_lb'))+'</div><div class="scrow">'+
    '<button type="button" aria-label="-" onclick="ctScrapBump(this,-1)">−</button><input type="text" inputmode="decimal" placeholder="0" value="'+esc(x.v==null?'':x.v)+'" oninput="ctScrapIn(this)" onchange="ctScrapIn(this)">'+
    '<button type="button" aria-label="+" onclick="ctScrapBump(this,1)">＋</button><select onchange="ctScrapIn(this)">'+unitOptions(L,u)+'</select></div></div>';}
function ctScrapOpen(o){const k='item|'+o.id;return !!(CT_SO[k]||ctScrapHas(k)||(CT_SEEN&&CT_SEEN.has(o.id)));}
function ctScrapTog(btn){const card=ctCardOf(btn);if(!card)return;const k=card.dataset.k,on=!card.classList.contains('so');card.classList.toggle('so',on);if(on)CT_SO[k]=1;else delete CT_SO[k];
  if(on){const i=card.querySelector('.ctscrap input');if(i)try{i.focus();}catch(e){}}}
function ctScrapIn(el){const card=ctCardOf(el);if(!card)return;const k=card.dataset.k,box=card.querySelector('.ctscrap');if(!box)return;
  const v=box.querySelector('input').value,u=box.querySelector('select').value;CT_S[k]={v:String(v==null?'':v),u};
  if(!ctScrapHas(k)&&String(v).trim()==='')delete CT_S[k];CT_SO[k]=1;
  const b=card.querySelector('.scb');if(b)b.classList.toggle('on',ctScrapHas(k));ctDraftSave();ctMeta();}
function ctScrapBump(btn,d){const card=ctCardOf(btn),inp=card&&card.querySelector('.ctscrap input');if(!inp)return;let v=rnd4(num(inp.value)+d);if(v<0)v=0;inp.value=String(v);ctScrapIn(inp);}
async function ctSeenLoad(){ // วัตถุดิบที่เคยมีเศษ → เปิดช่องเศษให้เอง (fail-soft · โหลดครั้งเดียว)
  if(CT_SEEN)return ctSeenPaint();CT_SEEN=new Set();
  try{const r=await sb.from('kc_count_lines').select('ref_id,scrap_qty').gt('scrap_qty',0).order('id',{ascending:false}).limit(1000);
    if(r&&!r.error&&r.data)r.data.forEach(x=>{if(x.ref_id)CT_SEEN.add(String(x.ref_id));});}catch(e){}
  ctSeenPaint();}
function ctSeenPaint(){document.querySelectorAll('#view-count .skcard[data-k^="item|"]').forEach(c=>{const o=itemById(c.dataset.k.slice(5));if(o&&ctScrapOpen(o))c.classList.add('so');});}
async function ctYieldLoad(rows){ // ฐานคิด yield: นับครั้งก่อนล่าสุด + รับเข้าตั้งแต่นั้น (อ่านไม่ได้ = ไม่คิด yield แต่ยังบันทึกเศษได้)
  CT_YB={};const ids=rows.map(r=>r.id);if(!ids.length)return;
  try{const L=await sb.from('kc_count_lines').select('id,count_id,ref_id,counted_qty').in('ref_id',ids).order('id',{ascending:false}).limit(2000);
    if(!L||L.error)return;const last={};(L.data||[]).forEach(x=>{if(!last[x.ref_id])last[x.ref_id]=x;});
    const cids=[...new Set(Object.values(last).map(x=>x.count_id))];if(!cids.length)return;
    const C=await sb.from('kc_counts').select('id,created_at').in('id',cids);if(!C||C.error)return;const at={};(C.data||[]).forEach(c=>{at[c.id]=c.created_at;});
    const from=Object.values(last).map(x=>at[x.count_id]).filter(Boolean).sort()[0];if(!from)return;
    const M=await sb.from('kc_moves').select('ref_id,qty,created_at').eq('ref_kind','item').eq('ref_table','kc_receipts').in('ref_id',ids).gt('created_at',from).limit(5000);if(!M||M.error)return;
    ids.forEach(id=>{const p=last[id],t0=p&&at[p.count_id];if(!t0)return;let inflow=0;(M.data||[]).forEach(m=>{if(m.ref_id===id&&String(m.created_at)>String(t0))inflow+=num(m.qty);});
      CT_YB[id]={prev:num(p.counted_qty),inflow:rnd4(inflow)};});
  }catch(e){}}
function ctYieldOf(r){ // → {used,yld} · used = นับครั้งก่อน + รับเข้า − นับครั้งนี้ · yield = 1 − เศษ/used
  const b=CT_YB[r.id];if(!b)return {used:null,yld:null};const used=rnd4(b.prev+b.inflow-r.cnt);
  if(!(used>0))return {used:null,yld:null};return {used,yld:r.scrap<=used+1e-9?rnd4(1-r.scrap/used):null,over:r.scrap>used+1e-9};}
const ctPct=y=>y==null?'–':fmtQ(rnd2(y*100))+'%';
function ctScrapSumHtml(rows){if(!rows.length)return '';
  let h='<div class="b" style="margin:12px 0 4px">'+esc(t('ct_scrap_t'))+'</div><div class="xs mut" style="margin-bottom:6px">'+esc(t('ct_scrap_h'))+'</div>'+
    '<div class="twrap"><table class="t ctsum ctyield"><thead><tr><th>'+esc(t('name'))+'</th><th class="n">'+esc(t('ct_col_scrap'))+'</th><th class="n">'+esc(t('ct_col_used'))+'</th><th class="n">'+esc(t('ct_col_yield'))+'</th><th class="n">'+esc(t('ct_col_val'))+'</th></tr></thead><tbody>';
  let tot=0;rows.forEach(r=>{const y=ctYieldOf(r),c=itemCost(r.o),val=c==null?null:rnd2(r.scrap*c);if(val!=null)tot+=val;const su=r.su||r.base,sf=unitFactor(r.o,su)||1;
    h+='<tr data-id="'+esc(r.id)+'"><td>'+esc(r.disp)+'</td><td class="n">'+fmtQ(rnd4(r.scrap/sf))+'<span class="xs">'+esc(trUnit(su))+'</span></td>'+
      '<td class="n">'+(y.used==null?'–':fmtQ(rnd2(y.used/r.f))+'<span class="xs">'+esc(trUnit(r.u))+'</span>')+'</td>'+
      '<td class="n y'+(y.yld==null?'':y.yld<0.7?' bad':' ok')+'">'+ctPct(y.yld)+(y.used==null?'<span class="xs">'+esc(t('ct_yield_na'))+'</span>':y.over?'<span class="xs">'+esc(t('ct_yield_over'))+'</span>':'')+'</td>'+
      '<td class="n">'+(val==null?'–':esc(money(val)))+'</td></tr>';});
  return h+'<tr class="tot"><td colspan="4">'+esc(t('ac_total'))+'</td><td class="n">'+esc(money(rnd2(tot)))+'</td></tr></tbody></table></div>';}
function ctScrapDetailHtml(lines){const L=(lines||[]).filter(l=>num(l.scrap_qty)>0);if(!L.length)return '';
  return '<div class="b" style="margin:12px 0 4px">'+esc(t('ct_scrap_t'))+'</div><div class="twrap"><table class="t ctsum ctyield"><thead><tr><th>'+esc(t('name'))+'</th><th class="n">'+esc(t('ct_col_scrap'))+'</th><th class="n">'+esc(t('ct_col_used'))+'</th><th class="n">'+esc(t('ct_col_yield'))+'</th><th class="n">'+esc(t('ct_col_val'))+'</th></tr></thead><tbody>'+
    L.map(l=>{const y=num(l.used_qty)>0?rnd4(1-num(l.scrap_qty)/num(l.used_qty)):null;
      return '<tr><td>'+esc(l.name||'')+'</td><td class="n">'+fmtQ(l.scrap_qty)+'<span class="xs">'+esc(trUnit(l.unit||''))+'</span></td><td class="n">'+(l.used_qty==null?'–':fmtQ(l.used_qty))+'</td><td class="n y">'+ctPct(y)+'</td><td class="n">'+(l.scrap_cost==null?'–':esc(money(l.scrap_cost)))+'</td></tr>';}).join('')+'</tbody></table></div>';}
async function ctLinesInsert(rows){ // ยังไม่รัน SQL รุ่นที่มีช่องเศษ (PGRST204) = ตัดช่องเศษออกแล้วบันทึกต่อ (ปรับยอด/ของเสียยังถูกต้อง)
  CT_NOCOL=false;const cols=['scrap_qty','used_qty','scrap_cost'];
  for(let i=0;i<4;i++){const r=await sb.from('kc_count_lines').insert(rows);if(!r||!r.error)return;
    const m=/'([a-z_]+)' column/i.exec(String(r.error.message||''));
    if(r.error.code==='PGRST204'&&m&&cols.includes(m[1])){CT_NOCOL=true;rows=rows.map(x=>{const o=Object.assign({},x);cols.forEach(c=>delete o[c]);return o;});continue;}
    return await db(()=>Promise.resolve(r));}   // ให้ db() แจ้ง/throw ตามปกติ
}

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
    ctScrapDetailHtml(lines)+
    '<button class="btn gh big" style="margin-top:10px" onclick="closeModal()">'+esc(t('close'))+'</button>');}
