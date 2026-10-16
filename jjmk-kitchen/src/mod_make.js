/* ============================================================
   🍳 ทำของ — make (mk*)
   เลือกสินค้า (การ์ดรูป · ชิป ⚡ ด่วน = สาขาสั่งแล้วของไม่พอ / 🔄 เติม = ต่ำกว่าที่ควรมี / ทั้งหมด) → จำนวนรอบ (−/＋ ทศนิยมได้)
   → ส่วนผสม (ตามสูตร × รอบ เป็นหน่วยหลัก · แก้ "ใช้จริง" + "เศษ/ทิ้ง" ในที่ · ต้นทุน/หน่วย · ต้นทุน) → วิธีทำ → ได้จริง → สรุปต้นทุนสด
   → บันทึก = kc_productions + kc_production_lines + kc_moves (produce_out วัตถุดิบ · waste เศษทิ้ง · produce_in สินค้า) + ck_add_qty
     + ต้นทุนสินค้าถัวเฉลี่ย (ck_recipes.avg_cost / unit_cost = ล็อตล่าสุด) — กติกาเจ้าของ: ราคาสินค้า = ต้นทุนจริงของล็อตที่ทำ
   ⚡ ด่วน อ่านออเดอร์สาขาจาก stock_receipts (sup = ครัวกลาง · ย้อนหลัง order_lookback_days) จับคู่เมนูด้วย kc_links/ชื่อ · หักที่ส่งแล้ว (kc_deliveries) · ขาด = สั่ง − สต๊อก
   🔄 เติม = สต๊อก < target_qty หรือ target_days × ยอดส่งเฉลี่ย 14 วัน
   ร่างล็อตที่ทำค้างเก็บ localStorage (jjck_mk_draft · วันเดียวกัน ≤12 ชม.) · ‹ กลับ = เก็บตัวเลขไว้ · ทำวันนี้ → รายละเอียด + ยกเลิกวันเดียวกัน (ย้อนสต๊อก/ต้นทุน)
   ============================================================ */
I18N.add({
th:{mk_pill_urgent:'⚡ ด่วน',mk_pill_refill:'🔄 เติม',mk_pill_all:'ทั้งหมด',mk_none_urgent:'ไม่มีของที่ต้องทำด่วน 👍',mk_none_refill:'สต๊อกสำเร็จรูปครบตามที่ควรมี 👍',mk_none:'ยังไม่มีเมนู — ไปเพิ่มที่ 📖 เมนู/สูตร',
  mk_ordered:'สาขาสั่ง {q}',mk_short:'ขาด {q} {u}',mk_target:'ควรมี {q}',mk_below:'ต้องเติม {q} {u}',mk_sugg:'แนะนำ {n} รอบ',mk_lot_eq:'1 รอบ = {q} {u}',mk_tap:'แตะเพื่อทำ',
  mk_today:'🍳 ทำวันนี้',mk_today_none:'วันนี้ยังไม่ได้ทำของ',mk_lots_n:'{n} รอบ',mk_got:'ได้ {q} {u}',mk_by:'โดย',
  mk_draft:'⏸ ทำค้างอยู่: {n} · {l} รอบ',mk_draft_go:'▶ ทำต่อ',mk_draft_drop:'ทิ้ง',mk_draft_q:'มีงานทำของค้างอยู่ ({n}) — ทิ้งแล้วเริ่มอันใหม่?',
  mk_lots:'จำนวนรอบ',mk_lots_hint:'พิมพ์ทศนิยมได้ เช่น 0.5 รอบ',mk_ing:'🥬 ส่วนผสม',mk_ing_sp:'แก้ตัวเลขได้ถ้าใช้ไม่ตรงสูตร',mk_plan:'ตามสูตร',mk_used:'ใช้จริง',mk_waste:'เศษ/ทิ้ง',mk_have:'มี {q}',mk_over:'⚠ ใช้เกินของที่มีในสต๊อก',
  mk_no_bom:'เมนูนี้ยังไม่มีส่วนผสม — ใส่ได้ที่ 📖 เมนู/สูตร (บันทึกได้ ต้นทุนส่วนผสมจะเป็น 0)',
  mk_method:'📝 วิธีทำ',mk_method_lots:'ตัวเลขในวิธีทำเป็นของ 1 รอบ — ทำ {n} รอบ ให้คูณตาม',mk_method_none:'ยังไม่มีวิธีทำ (ใส่ได้ที่ 📖 เมนู/สูตร)',
  mk_actual:'✅ ได้จริง',mk_actual_hint:'ตามแผนได้ {q} {u} — ได้ไม่เท่าให้แก้ตัวเลข',mk_note:'หมายเหตุ (ไม่บังคับ)',
  mk_cost:'💰 ต้นทุนล็อตนี้',mk_cost_items:'ส่วนผสม (ใช้จริง + เศษ)',mk_cost_extra:'ค่าอื่นต่อรอบ',mk_cost_oh:'ค่าใช้จ่ายแฝง',mk_cost_total:'รวม',mk_cost_unit:'ต่อ {u}',
  mk_vs:'เดิมเฉลี่ย ฿{c}/{u}',mk_vs_first:'ล็อตแรกของเมนูนี้ — ยังไม่มีต้นทุนเดิม',mk_missing:'ยังไม่มีราคา: {list} (คิดเป็น ฿0 — รับของเข้าระบบก่อนจะได้ต้นทุนจริง)',mk_missing_q:'วัตถุดิบยังไม่มีราคา: {list}\nต้นทุนล็อตนี้จะต่ำกว่าจริง — บันทึกต่อ?',
  mk_save:'💾 บันทึกทำของ',mk_saved:'บันทึกแล้ว ✅ ได้ {q} {u} · ต้นทุน ฿{c}/{u}',mk_need_lots:'ใส่จำนวนรอบ (มากกว่า 0)',mk_need_actual:'ใส่จำนวนที่ได้จริง (มากกว่า 0)',mk_bad_line:'"{n}": ใช้จริง/เศษ ต้องเป็นตัวเลข 0 ขึ้นไป',
  mk_over_q:'ใช้ของเกินที่มีในสต๊อก: {list}\nบันทึกต่อ? (สต๊อกวัตถุดิบจะติดลบ — นับสต๊อกแล้วปรับได้)',mk_sql_block:'ยังไม่ได้รัน SQL jjmk_kitchen2.sql — บันทึกทำของไม่ได้ (ดูหน้า ⚙️ ตั้งค่า)',
  mk_detail:'รายละเอียดการทำของ',mk_kind_urgent:'⚡ ด่วน',mk_kind_refill:'🔄 เติม',mk_kind_manual:'✋ ทำเอง',mk_col_plan:'ตามสูตร',mk_col_used:'ใช้จริง',mk_col_waste:'เศษ',mk_col_uc:'฿/หน่วย',
  mk_avg_now:'ต้นทุนถัวเฉลี่ยตอนนี้ ฿{c}/{u} (สต๊อก {q})',mk_void:'❌ ยกเลิกล็อตนี้',mk_void_q:'ยกเลิกการทำ "{n}" {q} {u}?\nสต๊อกวัตถุดิบจะคืนกลับ สินค้าจะถูกหักออก และต้นทุนกลับเป็นค่าก่อนหน้า',
  mk_void_ok:'ยกเลิกแล้ว — คืนสต๊อกให้แล้ว ✅',mk_void_today:'ยกเลิกได้เฉพาะล็อตที่ทำวันนี้',mk_void_note:'ยกเลิกทำของ',mk_gone:'ล็อตนี้ถูกยกเลิกไปแล้ว',mk_prev_na:'คืนสต๊อกแล้ว แต่ต้นทุนเดิมของสินค้าไม่มีให้คืน (ยังไม่มีช่อง prev_*)',
  mk_prev_cols:'บันทึกแล้ว แต่ตารางยังไม่มีช่อง prev_* — ถ้ายกเลิกล็อตนี้ ต้นทุนเดิมจะไม่ถูกคืน',mk_not_saved:'บันทึกไม่สำเร็จ — ไม่มีอะไรถูกบันทึก ลองใหม่อีกครั้ง',mk_cost_fix:'สต๊อกสินค้าเปลี่ยนระหว่างบันทึก — คิดต้นทุนถัวเฉลี่ยใหม่ให้แล้ว',mk_orders_na:'อ่านออเดอร์สาขาไม่ได้ — ⚡ ด่วน อาจไม่ครบ',mk_back:'‹ กลับ',mk_menus:'📖 เมนู/สูตร',mk_unit_bad:'⚠ แปลง {u} → {b} ไม่ได้ — แก้หน่วยในสูตรที่ 📖 เมนู/สูตร',mk_unit_bad_q:'"{n}": แปลง {u} → {b} ไม่ได้ — แก้หน่วยในสูตรที่ 📖 เมนู/สูตร ก่อนบันทึก',mk_unit_bad_sum:'ส่วนผสมที่แปลงหน่วยไม่ได้: {list} — บันทึกไม่ได้จนกว่าจะแก้สูตร'},
en:{mk_pill_urgent:'⚡ Urgent',mk_pill_refill:'🔄 Refill',mk_pill_all:'All',mk_none_urgent:'Nothing urgent to make 👍',mk_none_refill:'Finished stock is at target 👍',mk_none:'No menus yet — add them in 📖 Menus',
  mk_ordered:'Branches ordered {q}',mk_short:'short {q} {u}',mk_target:'target {q}',mk_below:'refill {q} {u}',mk_sugg:'suggest {n} lots',mk_lot_eq:'1 lot = {q} {u}',mk_tap:'Tap to make',
  mk_today:'🍳 Made today',mk_today_none:'Nothing made today yet',mk_lots_n:'{n} lots',mk_got:'got {q} {u}',mk_by:'by',
  mk_draft:'⏸ In progress: {n} · {l} lots',mk_draft_go:'▶ Continue',mk_draft_drop:'Discard',mk_draft_q:'A lot is in progress ({n}) — discard it and start a new one?',
  mk_lots:'Lots',mk_lots_hint:'Decimals OK, e.g. 0.5 lot',mk_ing:'🥬 Ingredients',mk_ing_sp:'edit if different from the recipe',mk_plan:'Recipe',mk_used:'Used',mk_waste:'Waste',mk_have:'have {q}',mk_over:'⚠ More than in stock',
  mk_no_bom:'This menu has no ingredients yet — add them in 📖 Menus (you can still save; ingredient cost will be 0)',
  mk_method:'📝 Method',mk_method_lots:'Method numbers are for 1 lot — making {n} lots, multiply',mk_method_none:'No method yet (add it in 📖 Menus)',
  mk_actual:'✅ Actual yield',mk_actual_hint:'Plan {q} {u} — change if different',mk_note:'Note (optional)',
  mk_cost:'💰 Cost of this lot',mk_cost_items:'Ingredients (used + waste)',mk_cost_extra:'Other per lot',mk_cost_oh:'Overhead',mk_cost_total:'Total',mk_cost_unit:'per {u}',
  mk_vs:'previous avg ฿{c}/{u}',mk_vs_first:'First lot of this menu — no previous cost',mk_missing:'No price yet: {list} (counted as ฿0 — receive them first for real cost)',mk_missing_q:'Ingredients without price: {list}\nThis lot cost will be lower than real — save anyway?',
  mk_save:'💾 Save production',mk_saved:'Saved ✅ got {q} {u} · cost ฿{c}/{u}',mk_need_lots:'Enter lots (more than 0)',mk_need_actual:'Enter the actual yield (more than 0)',mk_bad_line:'"{n}": used/waste must be a number ≥ 0',
  mk_over_q:'Using more than in stock: {list}\nSave anyway? (ingredient stock goes negative — fix it at the next count)',mk_sql_block:'jjmk_kitchen2.sql has not been run — cannot save production (see ⚙️ Settings)',
  mk_detail:'Production detail',mk_kind_urgent:'⚡ Urgent',mk_kind_refill:'🔄 Refill',mk_kind_manual:'✋ Manual',mk_col_plan:'Recipe',mk_col_used:'Used',mk_col_waste:'Waste',mk_col_uc:'฿/unit',
  mk_avg_now:'Current average cost ฿{c}/{u} (stock {q})',mk_void:'❌ Void this lot',mk_void_q:'Void "{n}" {q} {u}?\nIngredient stock is returned, the product is deducted and cost goes back to the previous value',
  mk_void_ok:'Voided — stock restored ✅',mk_void_today:'Only lots made today can be voided',mk_void_note:'Production voided',mk_gone:'This lot was already voided',mk_prev_na:'Stock restored, but the previous product cost could not be restored (no prev_* columns)',
  mk_prev_cols:'Saved, but the table has no prev_* columns — voiding this lot will not restore the previous cost',mk_not_saved:'NOT saved — please try again',mk_cost_fix:'Product stock changed while saving — moving average recomputed',mk_orders_na:'Could not read branch orders — ⚡ Urgent may be incomplete',mk_back:'‹ Back',mk_menus:'📖 Menus',mk_unit_bad:'⚠ cannot convert {u} → {b} — fix the unit in 📖 Menus',mk_unit_bad_q:'"{n}": cannot convert {u} → {b} — fix the recipe unit in 📖 Menus before saving',mk_unit_bad_sum:'Ingredients whose unit cannot convert: {list} — cannot save until the recipe is fixed'},
lo:{mk_pill_urgent:'⚡ ດ່ວນ',mk_pill_refill:'🔄 ເຕີມ',mk_pill_all:'ທັງໝົດ',mk_none_urgent:'ບໍ່ມີເຄື່ອງທີ່ຕ້ອງເຮັດດ່ວນ 👍',mk_none_refill:'ສະຕັອກສຳເລັດຮູບຄົບຕາມທີ່ຄວນມີ 👍',mk_none:'ຍັງບໍ່ມີເມນູ — ໄປເພີ່ມທີ່ 📖 ເມນູ/ສູດ',
  mk_ordered:'ສາຂາສັ່ງ {q}',mk_short:'ຂາດ {q} {u}',mk_target:'ຄວນມີ {q}',mk_below:'ຕ້ອງເຕີມ {q} {u}',mk_sugg:'ແນະນຳ {n} ຮອບ',mk_lot_eq:'1 ຮອບ = {q} {u}',mk_tap:'ແຕະເພື່ອເຮັດ',
  mk_today:'🍳 ເຮັດມື້ນີ້',mk_today_none:'ມື້ນີ້ຍັງບໍ່ໄດ້ເຮັດເຄື່ອງ',mk_lots_n:'{n} ຮອບ',mk_got:'ໄດ້ {q} {u}',mk_by:'ໂດຍ',
  mk_draft:'⏸ ເຮັດຄ້າງຢູ່: {n} · {l} ຮອບ',mk_draft_go:'▶ ເຮັດຕໍ່',mk_draft_drop:'ຖິ້ມ',mk_draft_q:'ມີວຽກເຮັດເຄື່ອງຄ້າງຢູ່ ({n}) — ຖິ້ມແລ້ວເລີ່ມອັນໃໝ່?',
  mk_lots:'ຈຳນວນຮອບ',mk_lots_hint:'ພິມທົດສະນິຍົມໄດ້ ເຊັ່ນ 0.5 ຮອບ',mk_ing:'🥬 ສ່ວນປະສົມ',mk_ing_sp:'ແກ້ຕົວເລກໄດ້ຖ້າໃຊ້ບໍ່ຕົງສູດ',mk_plan:'ຕາມສູດ',mk_used:'ໃຊ້ຈິງ',mk_waste:'ເສດ/ຖິ້ມ',mk_have:'ມີ {q}',mk_over:'⚠ ໃຊ້ເກີນເຄື່ອງທີ່ມີໃນສະຕັອກ',
  mk_no_bom:'ເມນູນີ້ຍັງບໍ່ມີສ່ວນປະສົມ — ໃສ່ໄດ້ທີ່ 📖 ເມນູ/ສູດ (ບັນທຶກໄດ້ ຕົ້ນທຶນສ່ວນປະສົມຈະເປັນ 0)',
  mk_method:'📝 ວິທີເຮັດ',mk_method_lots:'ຕົວເລກໃນວິທີເຮັດເປັນຂອງ 1 ຮອບ — ເຮັດ {n} ຮອບ ໃຫ້ຄູນຕາມ',mk_method_none:'ຍັງບໍ່ມີວິທີເຮັດ (ໃສ່ໄດ້ທີ່ 📖 ເມນູ/ສູດ)',
  mk_actual:'✅ ໄດ້ຈິງ',mk_actual_hint:'ຕາມແຜນໄດ້ {q} {u} — ໄດ້ບໍ່ເທົ່າໃຫ້ແກ້ຕົວເລກ',mk_note:'ໝາຍເຫດ (ບໍ່ບັງຄັບ)',
  mk_cost:'💰 ຕົ້ນທຶນລັອດນີ້',mk_cost_items:'ສ່ວນປະສົມ (ໃຊ້ຈິງ + ເສດ)',mk_cost_extra:'ຄ່າອື່ນຕໍ່ຮອບ',mk_cost_oh:'ຄ່າໃຊ້ຈ່າຍແຝງ',mk_cost_total:'ລວມ',mk_cost_unit:'ຕໍ່ {u}',
  mk_vs:'ເດີມສະເລ່ຍ ฿{c}/{u}',mk_vs_first:'ລັອດທຳອິດຂອງເມນູນີ້ — ຍັງບໍ່ມີຕົ້ນທຶນເດີມ',mk_missing:'ຍັງບໍ່ມີລາຄາ: {list} (ຄິດເປັນ ฿0 — ຮັບເຄື່ອງເຂົ້າລະບົບກ່ອນຈຶ່ງໄດ້ຕົ້ນທຶນຈິງ)',mk_missing_q:'ວັດຖຸດິບຍັງບໍ່ມີລາຄາ: {list}\nຕົ້ນທຶນລັອດນີ້ຈະຕ່ຳກວ່າຈິງ — ບັນທຶກຕໍ່?',
  mk_save:'💾 ບັນທຶກເຮັດເຄື່ອງ',mk_saved:'ບັນທຶກແລ້ວ ✅ ໄດ້ {q} {u} · ຕົ້ນທຶນ ฿{c}/{u}',mk_need_lots:'ໃສ່ຈຳນວນຮອບ (ຫຼາຍກວ່າ 0)',mk_need_actual:'ໃສ່ຈຳນວນທີ່ໄດ້ຈິງ (ຫຼາຍກວ່າ 0)',mk_bad_line:'"{n}": ໃຊ້ຈິງ/ເສດ ຕ້ອງເປັນຕົວເລກ 0 ຂຶ້ນໄປ',
  mk_over_q:'ໃຊ້ເຄື່ອງເກີນທີ່ມີໃນສະຕັອກ: {list}\nບັນທຶກຕໍ່? (ສະຕັອກວັດຖຸດິບຈະຕິດລົບ — ນັບສະຕັອກແລ້ວປັບໄດ້)',mk_sql_block:'ຍັງບໍ່ໄດ້ແລ່ນ SQL jjmk_kitchen2.sql — ບັນທຶກເຮັດເຄື່ອງບໍ່ໄດ້ (ເບິ່ງໜ້າ ⚙️ ຕັ້ງຄ່າ)',
  mk_detail:'ລາຍລະອຽດການເຮັດເຄື່ອງ',mk_kind_urgent:'⚡ ດ່ວນ',mk_kind_refill:'🔄 ເຕີມ',mk_kind_manual:'✋ ເຮັດເອງ',mk_col_plan:'ຕາມສູດ',mk_col_used:'ໃຊ້ຈິງ',mk_col_waste:'ເສດ',mk_col_uc:'฿/ຫົວໜ່ວຍ',
  mk_avg_now:'ຕົ້ນທຶນສະເລ່ຍຕອນນີ້ ฿{c}/{u} (ສະຕັອກ {q})',mk_void:'❌ ຍົກເລີກລັອດນີ້',mk_void_q:'ຍົກເລີກການເຮັດ "{n}" {q} {u}?\nສະຕັອກວັດຖຸດິບຈະຄືນກັບ ສິນຄ້າຈະຖືກຫັກອອກ ແລະຕົ້ນທຶນກັບເປັນຄ່າກ່ອນໜ້າ',
  mk_void_ok:'ຍົກເລີກແລ້ວ — ຄືນສະຕັອກໃຫ້ແລ້ວ ✅',mk_void_today:'ຍົກເລີກໄດ້ສະເພາະລັອດທີ່ເຮັດມື້ນີ້',mk_void_note:'ຍົກເລີກເຮັດເຄື່ອງ',mk_gone:'ລັອດນີ້ຖືກຍົກເລີກໄປແລ້ວ',mk_prev_na:'ຄືນສະຕັອກແລ້ວ ແຕ່ຕົ້ນທຶນເດີມຂອງສິນຄ້າບໍ່ມີໃຫ້ຄືນ (ຍັງບໍ່ມີຊ່ອງ prev_*)',
  mk_prev_cols:'ບັນທຶກແລ້ວ ແຕ່ຕາຕະລາງຍັງບໍ່ມີຊ່ອງ prev_* — ຖ້າຍົກເລີກລັອດນີ້ ຕົ້ນທຶນເດີມຈະບໍ່ຖືກຄືນ',mk_not_saved:'ບໍ່ໄດ້ບັນທຶກ — ລອງໃໝ່ອີກຄັ້ງ',mk_cost_fix:'ສະຕັອກສິນຄ້າປ່ຽນລະຫວ່າງບັນທຶກ — ຄິດຕົ້ນທຶນສະເລ່ຍໃໝ່ແລ້ວ',mk_orders_na:'ອ່ານອໍເດີສາຂາບໍ່ໄດ້ — ⚡ ດ່ວນ ອາດບໍ່ຄົບ',mk_back:'‹ ກັບຄືນ',mk_menus:'📖 ເມນູ/ສູດ',mk_unit_bad:'⚠ ແປງ {u} → {b} ບໍ່ໄດ້ — ແກ້ຫົວໜ່ວຍໃນສູດທີ່ 📖 ເມນູ/ສູດ',mk_unit_bad_q:'"{n}": ແປງ {u} → {b} ບໍ່ໄດ້ — ແກ້ຫົວໜ່ວຍໃນສູດທີ່ 📖 ເມນູ/ສູດ ກ່ອນບັນທຶກ',mk_unit_bad_sum:'ສ່ວນປະສົມທີ່ແປງຫົວໜ່ວຍບໍ່ໄດ້: {list} — ບັນທຶກບໍ່ໄດ້ຈົນກວ່າຈະແກ້ສູດ'},
my:{mk_pill_urgent:'⚡ အရေးပေါ်',mk_pill_refill:'🔄 ဖြည့်',mk_pill_all:'အားလုံး',mk_none_urgent:'အရေးပေါ်လုပ်ရန် မရှိပါ 👍',mk_none_refill:'ထုတ်ကုန်လက်ကျန် လုံလောက်သည် 👍',mk_none:'မီနူး မရှိသေးပါ — 📖 မီနူး/နည်း တွင် ထည့်ပါ',
  mk_ordered:'ဆိုင်ခွဲ မှာ {q}',mk_short:'လို {q} {u}',mk_target:'ထားရမည် {q}',mk_below:'ဖြည့်ရန် {q} {u}',mk_sugg:'အကြံပြု {n} သုတ်',mk_lot_eq:'1 သုတ် = {q} {u}',mk_tap:'လုပ်ရန် နှိပ်ပါ',
  mk_today:'🍳 ယနေ့လုပ်ခဲ့',mk_today_none:'ယနေ့ မလုပ်ရသေးပါ',mk_lots_n:'{n} သုတ်',mk_got:'ရ {q} {u}',mk_by:'လုပ်သူ',
  mk_draft:'⏸ လုပ်လက်စ: {n} · {l} သုတ်',mk_draft_go:'▶ ဆက်လုပ်',mk_draft_drop:'ဖျက်',mk_draft_q:'လုပ်လက်စ ရှိနေသည် ({n}) — ဖျက်ပြီး အသစ်စမလား?',
  mk_lots:'သုတ်အရေအတွက်',mk_lots_hint:'ဒသမ ရိုက်နိုင် ဥပမာ 0.5 သုတ်',mk_ing:'🥬 ပါဝင်ပစ္စည်း',mk_ing_sp:'နည်းနှင့်မတူလျှင် ပြင်နိုင်',mk_plan:'နည်းအရ',mk_used:'အမှန်သုံး',mk_waste:'အပိုင်း/စွန့်',mk_have:'ရှိ {q}',mk_over:'⚠ လက်ကျန်ထက် ပိုသုံးနေသည်',
  mk_no_bom:'ဤမီနူးတွင် ပါဝင်ပစ္စည်း မရှိသေး — 📖 မီနူး/နည်း တွင် ထည့်ပါ (သိမ်းနိုင်သည်၊ ပါဝင်ပစ္စည်းစရိတ် 0 ဖြစ်မည်)',
  mk_method:'📝 လုပ်နည်း',mk_method_lots:'လုပ်နည်းကိန်းဂဏန်းများသည် 1 သုတ်အတွက် — {n} သုတ်လုပ်လျှင် မြှောက်ပါ',mk_method_none:'လုပ်နည်း မရှိသေး (📖 မီနူး/နည်း တွင် ထည့်ပါ)',
  mk_actual:'✅ အမှန်ရ',mk_actual_hint:'အစီအစဉ်အရ {q} {u} — မတူလျှင် ပြင်ပါ',mk_note:'မှတ်ချက် (မဖြစ်မနေ မဟုတ်)',
  mk_cost:'💰 ဤသုတ်၏ ကုန်ကျစရိတ်',mk_cost_items:'ပါဝင်ပစ္စည်း (သုံး + စွန့်)',mk_cost_extra:'တစ်သုတ်အခြားစရိတ်',mk_cost_oh:'ဝှက်ထားစရိတ်',mk_cost_total:'စုစုပေါင်း',mk_cost_unit:'{u} တစ်ခုလျှင်',
  mk_vs:'ယခင်ပျမ်းမျှ ฿{c}/{u}',mk_vs_first:'ဤမီနူး၏ ပထမသုတ် — ယခင်စရိတ် မရှိ',mk_missing:'ဈေးမရှိသေး: {list} (฿0 ဖြင့်တွက် — အမှန်စရိတ်ရရန် အရင်လက်ခံပါ)',mk_missing_q:'ဈေးမရှိသော ကုန်ကြမ်း: {list}\nဤသုတ်စရိတ် အမှန်ထက် နည်းမည် — သိမ်းမလား?',
  mk_save:'💾 ထုတ်လုပ်မှု သိမ်းရန်',mk_saved:'သိမ်းပြီး ✅ ရ {q} {u} · စရိတ် ฿{c}/{u}',mk_need_lots:'သုတ်အရေအတွက် ထည့်ပါ (0 ထက်များ)',mk_need_actual:'အမှန်ရသည့် အရေအတွက် ထည့်ပါ (0 ထက်များ)',mk_bad_line:'"{n}": သုံး/စွန့် သည် 0 နှင့်အထက် ကိန်းဖြစ်ရမည်',
  mk_over_q:'လက်ကျန်ထက် ပိုသုံးနေသည်: {list}\nသိမ်းမလား? (ကုန်ကြမ်းလက်ကျန် အနုတ်ဖြစ်မည် — နောက်ရေတွက်ချိန် ပြင်နိုင်)',mk_sql_block:'jjmk_kitchen2.sql မလုပ်ရသေး — ထုတ်လုပ်မှု သိမ်း၍မရ (⚙️ ဆက်တင် ကြည့်ပါ)',
  mk_detail:'ထုတ်လုပ်မှု အသေးစိတ်',mk_kind_urgent:'⚡ အရေးပေါ်',mk_kind_refill:'🔄 ဖြည့်',mk_kind_manual:'✋ ကိုယ်တိုင်',mk_col_plan:'နည်းအရ',mk_col_used:'သုံး',mk_col_waste:'စွန့်',mk_col_uc:'฿/ယူနစ်',
  mk_avg_now:'လက်ရှိပျမ်းမျှစရိတ် ฿{c}/{u} (လက်ကျန် {q})',mk_void:'❌ ဤသုတ်ကို ပယ်ဖျက်',mk_void_q:'"{n}" {q} {u} ကို ပယ်ဖျက်မလား?\nကုန်ကြမ်းလက်ကျန် ပြန်ရမည်၊ ထုတ်ကုန် နုတ်မည်၊ စရိတ် ယခင်တန်ဖိုးသို့ ပြန်သွားမည်',
  mk_void_ok:'ပယ်ဖျက်ပြီး — လက်ကျန် ပြန်ရပြီ ✅',mk_void_today:'ယနေ့လုပ်သော သုတ်ကိုသာ ပယ်ဖျက်နိုင်',mk_void_note:'ထုတ်လုပ်မှု ပယ်ဖျက်',mk_gone:'ဤသုတ်ကို ပယ်ဖျက်ပြီးသား',mk_prev_na:'လက်ကျန် ပြန်ရပြီ၊ သို့သော် ယခင်ထုတ်ကုန်စရိတ် ပြန်မရပါ (prev_* ကော်လံ မရှိ)',
  mk_prev_cols:'သိမ်းပြီး၊ သို့သော် ဇယားတွင် prev_* ကော်လံ မရှိ — ဤသုတ်ကို ပယ်ဖျက်လျှင် ယခင်စရိတ် ပြန်မရ',mk_not_saved:'မသိမ်းရသေးပါ — ထပ်စမ်းပါ',mk_cost_fix:'သိမ်းနေစဉ် ထုတ်ကုန်လက်ကျန်ပြောင်း၍ ပျမ်းမျှစရိတ် ပြန်တွက်ပြီး',mk_orders_na:'ဆိုင်ခွဲမှာယူမှု ဖတ်မရ — ⚡ အရေးပေါ် မပြည့်စုံနိုင်',mk_back:'‹ နောက်သို့',mk_menus:'📖 မီနူး/နည်း',mk_unit_bad:'⚠ {u} → {b} ပြောင်း၍မရ — 📖 မီနူး/နည်း တွင် ယူနစ်ပြင်ပါ',mk_unit_bad_q:'"{n}": {u} → {b} ပြောင်း၍မရ — မသိမ်းမီ 📖 မီနူး/နည်း တွင် နည်း၏ယူနစ်ကို ပြင်ပါ',mk_unit_bad_sum:'ယူနစ်ပြောင်း၍မရသော ပါဝင်ပစ္စည်း: {list} — နည်းမပြင်မချင်း သိမ်း၍မရ'}
});
CSS.add(`
.mk-need{font-size:12.5px;font-weight:700;color:var(--red)}.mk-need.ok{color:var(--ok)}
.mk-sugg{font-size:12px;color:var(--wine);font-weight:700}
.mk-draft{display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:var(--gold-t);border:1.5px solid #E9D9A8;border-radius:12px;padding:10px 12px;margin-bottom:10px;font-size:14px}
.mk-draft .btn{margin-left:auto}
.mk-prod{display:flex;align-items:center;gap:10px;padding:9px 2px;border-bottom:1px solid var(--line);cursor:pointer}.mk-prod:last-child{border-bottom:0}
.mk-prod .grow b{display:block}.mk-prod .amt{font-family:var(--fh);font-weight:700;white-space:nowrap;text-align:right}
.mk-head{display:flex;align-items:center;gap:12px}.mk-head .mthumb{width:64px;height:64px;font-size:30px;border-radius:14px}
.mk-head b{font-family:var(--fh);font-size:19px;display:block;line-height:1.2}
.mk-line{border:1.5px solid var(--line);border-radius:12px;padding:8px 10px;margin-bottom:8px;background:#fff}
.mk-line.over{border-color:var(--bad);background:#FFF7F6}
.mk-line .r1{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.mk-line .r1 .nm{flex:1;min-width:120px;font-weight:700;overflow-wrap:anywhere}
.mk-line .r1 .nm small{font-weight:500;color:var(--mut)}.mk-line .r1 .have{font-size:12px;color:var(--mut)}.mk-line .r1 .cost{font-family:var(--fh);font-weight:700;white-space:nowrap}
.mk-line .r2{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1fr) minmax(0,1fr);gap:6px;margin-top:6px}
.mk-line .r2 label{display:block;font-size:11px;color:var(--mut);font-weight:600;margin-bottom:2px}
.mk-line .r2 input{min-height:44px;text-align:center;font-weight:700;padding:6px}
.mk-line .r2 .pv{min-height:44px;display:flex;align-items:center;justify-content:center;background:#FBF6EA;border-radius:10px;font-weight:700;font-variant-numeric:tabular-nums}
.mk-line .ow{font-size:12px;color:var(--bad);font-weight:700;margin-top:4px}
.mk-sum .ln{display:flex;justify-content:space-between;gap:8px;padding:3px 0}.mk-sum .ln.tot{border-top:1.5px solid var(--line);margin-top:4px;padding-top:6px;font-weight:700}
.mk-sum .big{font-family:var(--fh);font-size:22px;font-weight:800}
.mk-kpis{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}
@media(max-width:339px){.mk-line .r2{grid-template-columns:1fr 1fr}.mk-line .r2 .c0{grid-column:1/-1}}
`);
let MK=null;                                                  // ล็อตที่กำลังทำ {rid,lots,lines:[{item_id,plan,used,waste}],actual,actualTouched,kind,note}
let MK_PILL=['urgent','refill','all'].includes(LS.get('jjck_mkpill',''))?LS.get('jjck_mkpill',''):'urgent';
const MK_DRAFT='jjck_mk_draft',MK_DRAFT_MS=12*3600*1000;
let MK_ORD={at:0,ok:false,ordered:{},sent:{},daily:{}};         // ออเดอร์สาขาที่ยังไม่ส่ง (ต่อเมนู) · ยอดส่งเฉลี่ย/วัน 14 วัน
let MK_TODAY=[];                                              // ล็อตที่ทำวันนี้
let MK_LOADING=null;
const mkMoney=c=>'฿'+fmtQ(c);
const mkKindLb=k=>t('mk_kind_'+(['urgent','refill','manual'].includes(k)?k:'manual'));

/* ---------- ออเดอร์สาขา + ยอดส่ง (อ่านอย่างเดียว · fail-soft) ---------- */
async function mkLoad(force){
  if(MK_LOADING)return MK_LOADING;
  if(!force&&MK_ORD.ok&&Date.now()-MK_ORD.at<60000)return;
  MK_LOADING=(async()=>{
    const td=bizTodayISO(),lb=num((S.cfg||CFG_DEF).order_lookback_days);
    const get=async q=>{try{const r=await q;if(r&&r.error){if(MISSING_TBL(r.error))return [];throw r.error;}return r.data||[];}catch(e){return null;}};
    const [orders,links,dels,prods]=await Promise.all([
      get(sb.from('stock_receipts').select('branch_id,branch_name,product_id,name,unit,sup,order_date,ordered').gte('order_date',addDays(td,-lb)).gt('ordered',0)),
      get(sb.from('kc_links').select('stk_name,recipe_id,factor')),
      get(sb.from('kc_deliveries').select('id,d,branch,order_date,status').gte('d',addDays(td,-Math.max(14,lb+3))).neq('status','void')),
      get(sb.from('kc_productions').select('*').eq('d',td).order('created_at',{ascending:false}))]);
    let dl=[];if(dels&&dels.length){dl=(await get(sb.from('kc_delivery_lines').select('delivery_id,recipe_id,sent').in('delivery_id',dels.map(x=>x.id))))||[];}
    MK_ORD=mkOrdersCalc(orders||[],links||[],dels||[],dl,td,!!orders);MK_TODAY=prods||[];
  })();
  try{await MK_LOADING;}finally{MK_LOADING=null;}
}
function mkOrdersCalc(orders,links,dels,dl,td,ok){
  const sups=new Set(((S.cfg||CFG_DEF).ck_sup_names||[]).map(supKey)),byName={},byStk={},lk={};
  activeRecipes().forEach(r=>{byName[supKey(r.name)]=r;});(S.branchesAll||[]).forEach(b=>{if(b.stk)byStk[String(b.stk)]=b.code;});
  links.forEach(l=>{lk[supKey(l.stk_name)]=l;});
  const ordered={},groups={};
  orders.forEach(o=>{if(!sups.has(supKey(o.sup)))return;const l=lk[supKey(o.name)];const r=l?recipeById(l.recipe_id):byName[supKey(o.name)];if(!r||r.active===false)return;
    const f=l?(num(l.factor)||1):1;ordered[r.id]=rnd4(num(ordered[r.id])+num(o.ordered)*f);groups[(byStk[String(o.branch_id)]||String(o.branch_id))+'|'+String(o.order_date).slice(0,10)]=1;});
  const sent={},daily={},from14=addDays(td,-14),dById={};dels.forEach(x=>{dById[x.id]=x;});
  dl.forEach(l=>{const dv=dById[l.delivery_id];if(!dv)return;
    if(groups[dv.branch+'|'+String(dv.order_date||'').slice(0,10)])sent[l.recipe_id]=rnd4(num(sent[l.recipe_id])+num(l.sent));
    if(String(dv.d)>=from14)daily[l.recipe_id]=num(daily[l.recipe_id])+num(l.sent);});
  Object.keys(daily).forEach(k=>{daily[k]=rnd4(daily[k]/14);});
  return {at:Date.now(),ok,ordered,sent,daily};}
function mkNeeds(){ // ต่อเมนู: open (สั่งค้าง) · short (ขาด) · target · below (ต้องเติม) · sugg (รอบที่แนะนำ)
  const out={};activeRecipes().forEach(r=>{
    const open=Math.max(0,rnd4(num(MK_ORD.ordered[r.id])-num(MK_ORD.sent[r.id]))),stock=num(r.qty),short=Math.max(0,rnd4(open-stock));
    const target=num(r.target_qty)>0?num(r.target_qty):(num(r.target_days)>0?rnd4(num(r.target_days)*num(MK_ORD.daily[r.id])):0);
    const below=target>0?Math.max(0,rnd4(target-stock)):0,need=Math.max(short,below),yq=num(r.yield_qty)||1;
    out[r.id]={open,stock,short,target,below,need,sugg:need>0?Math.ceil(need/yq-1e-9):0};});
  return out;}

/* ---------- รายการ (เลือกสินค้า + ทำวันนี้) ---------- */
RENDER.make=function(el){
  if(!MK){const dr=mkDraftRead();if(dr&&dr.open&&recipeById(dr.mk.rid))MK=dr.mk;}
  if(MK)return mkPaintForm(el);
  pinnedBar(null,el);
  el.innerHTML=dhead('🍳 '+t('nav_make'),'<button class="btn gh sm2" onclick="show(\'menus\')">'+esc(t('mk_menus'))+'</button>')+sqlNeedBox()+
    '<div id="mkDraftBox"></div><div id="mkPills"></div><div id="mkGrid" class="igrid"></div>'+
    '<div class="card" style="margin-top:14px"><h3>'+esc(t('mk_today'))+'<span class="sp" id="mkTodayN"></span></h3><div id="mkToday"><div class="spin"></div></div></div>';
  mkPaintDraftBox();mkPaintGrid();mkPaintToday();
  mkLoad().then(()=>{if(S.tab==='make'&&!MK){mkPaintGrid();mkPaintToday();}});
};
function mkSetPill(k){MK_PILL=k;LS.set('jjck_mkpill',k);mkPaintGrid();}
function mkPaintGrid(){
  const pb=document.getElementById('mkPills'),box=document.getElementById('mkGrid');if(!pb||!box)return;
  const N=mkNeeds(),act=activeRecipes();
  const urg=act.filter(r=>N[r.id].short>0).sort((a,b)=>N[b.id].short-N[a.id].short),ref=act.filter(r=>N[r.id].below>0).sort((a,b)=>N[b.id].below-N[a.id].below);
  pb.innerHTML=pillBar([{k:'urgent',lb:t('mk_pill_urgent'),n:urg.length,cls:urg.length?'needc':''},{k:'refill',lb:t('mk_pill_refill'),n:ref.length},{k:'all',lb:t('mk_pill_all'),n:act.length}],MK_PILL,k=>mkSetPill(k),{scroll:1})+   // closure — string form puts JSON quotes inside onclick="…"
    (MK_ORD.at&&!MK_ORD.ok?'<div class="badbox">⚠ '+esc(t('mk_orders_na'))+'</div>':'');
  const list=MK_PILL==='urgent'?urg:MK_PILL==='refill'?ref:act;
  if(!MK_ORD.at&&MK_PILL!=='all'&&!list.length){box.innerHTML='<div class="spin" style="grid-column:1/-1"></div>';return;}
  if(!list.length){box.innerHTML='<div class="empty" style="grid-column:1/-1">'+esc(t(MK_PILL==='urgent'?'mk_none_urgent':MK_PILL==='refill'?'mk_none_refill':'mk_none'))+'</div>';return;}
  box.innerHTML=list.map(r=>mkCardHtml(r,N[r.id])).join('');
}
function mkCardHtml(r,n){
  const u=trUnit(r.yield_unit),c=recipeUnitCost(r),kind=n.short>0?'urgent':(n.below>0?'refill':'manual');
  let need='';
  if(n.short>0)need='<div class="mk-need">⚡ '+esc(t('mk_ordered',{q:fmtQ(n.open)}))+' · '+esc(t('mk_short',{q:fmtQ(n.short),u}))+'</div>';
  else if(n.below>0)need='<div class="mk-need">🔄 '+esc(t('mk_target',{q:fmtQ(n.target)}))+' · '+esc(t('mk_below',{q:fmtQ(n.below),u}))+'</div>';
  else if(n.open>0)need='<div class="mk-need ok">✓ '+esc(t('mk_ordered',{q:fmtQ(n.open)}))+'</div>';
  return '<div class="icard tap" data-id="'+esc(r.id)+'" data-lots="'+(n.sugg||1)+'" data-kind="'+kind+'" onclick="mkOpen(this.dataset.id,num(this.dataset.lots),this.dataset.kind)">'+
    thumbHtml(r,(typeof mnIcon==='function')?mnIcon(r):'🍳','ithumb')+'<div class="iname">'+esc(dispName(r))+'</div>'+
    '<div class="isub">'+esc(t('mk_lot_eq',{q:fmtQ(r.yield_qty),u}))+(c!=null?' · '+esc(mkMoney(c))+'/'+esc(u):'')+'</div>'+
    '<div class="row" style="justify-content:space-between"><span class="chip '+(num(r.qty)>0?'ok':'mid')+'">📦 '+fmtQ(r.qty)+' '+esc(u)+'</span>'+(n.sugg?'<span class="mk-sugg">'+esc(t('mk_sugg',{n:n.sugg}))+'</span>':'')+'</div>'+need+'</div>';}
function mkPaintToday(){
  const box=document.getElementById('mkToday'),nb=document.getElementById('mkTodayN');if(!box)return;
  if(nb)nb.textContent=MK_TODAY.length?t('mk_lots_n',{n:MK_TODAY.length}):'';
  if(!MK_TODAY.length){box.innerHTML='<div class="empty" style="padding:12px">'+esc(t('mk_today_none'))+'</div>';return;}
  box.innerHTML=MK_TODAY.map(p=>{const r=recipeById(p.recipe_id);return '<div class="mk-prod" data-id="'+esc(p.id)+'" onclick="mkDetail(this.dataset.id)">'+thumbHtml(r||{},(typeof mnIcon==='function')?mnIcon(r):'🍳')+
    '<div class="grow"><b>'+esc(r?dispName(r):p.name)+'</b><div class="xs mut">'+esc(mkKindLb(p.kind))+' · '+esc(t('mk_lots_n',{n:fmtQ(p.lots)}))+' · '+esc(t('mk_got',{q:fmtQ(p.actual_qty),u:trUnit(p.unit)}))+' · '+esc(t('mk_by'))+' '+esc(p.by_name||'')+' '+esc(dispTime(p.created_at))+'</div></div>'+
    '<div class="amt">'+esc(money(p.cost_total))+'<div class="xs mut">'+esc(mkMoney(p.cost_unit))+'/'+esc(trUnit(p.unit))+'</div></div></div>';}).join('');}
function mkPaintDraftBox(){
  const b=document.getElementById('mkDraftBox');if(!b)return;const dr=mkDraftRead();const r=dr&&recipeById(dr.mk.rid);
  b.innerHTML=r?'<div class="mk-draft">'+esc(t('mk_draft',{n:dispName(r),l:fmtQ(dr.mk.lots)}))+'<button class="btn sm2" onclick="mkDraftGo()">'+esc(t('mk_draft_go'))+'</button><button class="btn gh sm2" onclick="mkDraftDrop()">'+esc(t('mk_draft_drop'))+'</button></div>':'';}

/* ---------- ร่าง ---------- */
function mkDraftRead(){const d=LS.get(MK_DRAFT,null);if(!d||typeof d!=='object'||!d.mk||d.d!==bizTodayISO()||!(Date.now()-num(d.t)<MK_DRAFT_MS))return null;return d;}
function mkDraft(open,now){ // open=false = ‹ กลับ แล้ว (เก็บตัวเลขไว้ ไม่เปิดฟอร์มเองตอนรีเฟรช) · now = เขียนทันที (ไม่รอ 150ms)
  clearTimeout(mkDraft._t);const w=()=>{if(MK)LS.set(MK_DRAFT,{t:Date.now(),d:bizTodayISO(),open:open!==false,mk:MK});};
  if(now)w();else mkDraft._t=setTimeout(w,150);}
function mkDraftClear(){clearTimeout(mkDraft._t);LS.del(MK_DRAFT);}
function mkDraftGo(){const dr=mkDraftRead();if(!dr||!recipeById(dr.mk.rid)){mkDraftClear();mkPaintDraftBox();return;}MK=dr.mk;mkDraft(true,true);rerender();}
function mkDraftDrop(){mkDraftClear();MK=null;if(S.tab==='make')rerender();}

/* ---------- ฟอร์มทำของ ---------- */
async function mkOpen(rid,lots,kind){
  if(!canKitchen())return;const r=recipeById(rid);if(!r)return;
  const dr=mkDraftRead();
  if(dr&&dr.mk.rid!==rid&&recipeById(dr.mk.rid)){if(!(await confirm2(t('mk_draft_q',{n:dispName(recipeById(dr.mk.rid))}),{danger:true})))return;}
  if(dr&&dr.mk.rid===rid){MK=dr.mk;mkDraft(true,true);if(S.tab==='make')rerender();else show('make');return;}
  lots=num(lots)>0?rnd4(num(lots)):1;
  MK={rid,lots,lines:bomOf(r).map(l=>mkLineFrom(l,lots)),
    actual:rnd4(num(r.yield_qty)*lots),actualTouched:false,kind:['urgent','refill'].includes(kind)?kind:'manual',note:''};
  mkDraft(true,true);if(S.tab==='make')rerender();else show('make');
}
function mkLineFrom(l,lots){ // บรรทัดสูตร → บรรทัดทำของ · หน่วยในสูตรแปลงเป็นหน่วยหลักไม่ได้ (ขนาดบรรจุถูกลบ/หน่วยสะกดผิด) = bad_unit — ห้ามคิดเป็น 0 เงียบ ๆ (ตรวจอิสระ 2026-10-16)
  const bad=l.qty_base==null,plan=bad?0:rnd4(l.qty_base*lots);
  return {item_id:l.item_id,plan,used:plan,waste:0,bad_unit:bad?(l.unit||'?'):null};}
function mkLinesSync(m){ // ร่างที่เปิดค้าง/เพิ่งแก้สูตร: หน่วยที่เคยแปลงไม่ได้แปลงได้แล้ว (หรือกลับกัน) → ปรับบรรทัดให้ตรงสูตรปัจจุบัน
  const r=recipeById(m.rid);if(!r)return;const bom=bomOf(r);
  m.lines.forEach(l=>{const b=bom.find(x=>x.item_id===l.item_id);if(!b)return;const nb=b.qty_base==null?(b.unit||'?'):null;
    if(nb!==(l.bad_unit||null)){l.bad_unit=nb;l.plan=nb?0:rnd4(b.qty_base*num(m.lots));l.used=l.plan;}});}
function mkBack(){mkDraft(false,true);MK=null;rerender();}   // ‹ กลับ = เก็บตัวเลขไว้ (แถบ "ทำค้างอยู่" ในรายการ)
function mkPaintForm(el){
  const m=MK,r=recipeById(m.rid);if(!r){MK=null;mkDraftClear();return rerender();}
  mkLinesSync(m);const u=trUnit(r.yield_unit);
  el.innerHTML=dhead('🍳 '+t('nav_make'),'<button class="btn gh sm2" onclick="mkBack()">'+esc(t('mk_back'))+'</button>')+sqlNeedBox()+
    '<div class="card"><div class="mk-head">'+thumbHtml(r,(typeof mnIcon==='function')?mnIcon(r):'🍳')+'<div class="grow"><b>'+esc(dispName(r))+'</b><div class="sm mut">'+esc(t('mk_lot_eq',{q:fmtQ(r.yield_qty),u}))+' · '+esc(t('stock'))+' '+fmtQ(r.qty)+' '+esc(u)+'</div>'+
      '<span class="chip '+(m.kind==='urgent'?'bad':m.kind==='refill'?'blue':'mid')+'">'+esc(mkKindLb(m.kind))+'</span></div></div></div>'+
    '<div class="card"><h3>'+esc(t('mk_lots'))+'<span class="sp">'+esc(t('mk_lots_hint'))+'</span></h3>'+stepper('mkLots',m.lots,{step:1,min:0,big:1,on:v=>mkLotsChange(v)})+'</div>'+
    '<div class="card"><h3>'+esc(t('mk_ing'))+'<span class="sp">'+esc(t('mk_ing_sp'))+'</span></h3><div id="mkLines">'+mkLinesHtml()+'</div></div>'+
    '<div class="card"><h3>'+esc(t('mk_method'))+'</h3>'+(methodSteps(r.note).length?(num(m.lots)!==1?'<div class="hintbox">'+esc(t('mk_method_lots',{n:fmtQ(m.lots)}))+'</div>':'')+methodHtml(r.note):'<div class="empty" style="padding:8px">'+esc(t('mk_method_none'))+'</div>')+'</div>'+
    '<div class="card"><h3>'+esc(t('mk_actual'))+'<span class="sp" id="mkActHint">'+esc(t('mk_actual_hint',{q:fmtQ(rnd4(num(r.yield_qty)*num(m.lots))),u}))+'</span></h3>'+stepper('mkActual',m.actual,{step:1,min:0,unit:r.yield_unit,on:v=>mkActualChange(v)})+
      fld(t('mk_note'),'<input id="mkNote" value="'+esc(m.note||'')+'" oninput="MK.note=this.value;mkDraft()">')+'</div>'+
    '<div class="card mk-sum" id="mkSum">'+mkSumHtml()+'</div>';
  pinnedBar('<span class="v" id="mkBarV">'+esc(mkBarTxt())+'</span><button class="btn" id="mkSaveBtn" onclick="mkSave()">'+esc(t('mk_save'))+'</button>',el);   // esc — yield_unit มาจากตาราง (ตรวจอิสระ 2026-10-16: XSS)
}
function mkLineCalc(i){ // → {it,uc,used,waste,cost,over,bad,ubad} · ubad = หน่วยในสูตรที่แปลงเป็นหน่วยหลักไม่ได้ (บรรทัดนี้บันทึกไม่ได้)
  const l=MK.lines[i],it=itemById(l.item_id);if(!it)return {it:null};
  const sU=String(l.used==null?'':l.used).trim(),sW=String(l.waste==null?'':l.waste).trim();
  const used=sU===''?0:num(sU),waste=sW===''?0:num(sW),ubad=l.bad_unit||null,bad=!!ubad||(sU!==''&&(isNaN(parseFloat(sU))||used<0))||(sW!==''&&(isNaN(parseFloat(sW))||waste<0));
  const uc=itemCost(it);const cost=uc==null?null:rnd4((used+waste)*uc);
  return {it,uc,used,waste,cost,over:used+waste>num(it.qty)+1e-9,bad,ubad};}
function mkLineWarn(c){return c.ubad?t('mk_unit_bad',{u:trUnit(c.ubad),b:trUnit(c.it.unit)}):(c.over?t('mk_over'):'');}
function mkLinesHtml(){
  const m=MK;if(!m.lines.length)return '<div class="hintbox">'+esc(t('mk_no_bom'))+'</div>';
  return m.lines.map((l,i)=>{const c=mkLineCalc(i);if(!c.it)return '';const u=trUnit(c.it.unit),dis=c.ubad?' disabled':'';
    return '<div class="mk-line'+(c.over||c.ubad?' over':'')+'" id="mkL'+i+'"><div class="r1">'+thumbHtml(c.it,'🥬')+'<div class="nm">'+esc(dispName(c.it))+' <small>'+esc(u)+'</small><div class="have">'+esc(t('mk_have',{q:fmtQ(c.it.qty)+' '+u}))+(c.uc!=null?' · '+esc(mkMoney(c.uc))+'/'+esc(u):' · <span class="amber">'+esc(t('no_price'))+'</span>')+'</div></div>'+
      '<div class="cost" id="mkC'+i+'">'+(c.cost==null?'–':esc(money(c.cost)))+'</div></div>'+
      '<div class="r2"><div class="c0"><label>'+esc(t('mk_plan'))+'</label><div class="pv" id="mkP'+i+'">'+(c.ubad?'⚠':fmtQ(l.plan))+'</div></div>'+
      '<div><label>'+esc(t('mk_used'))+'</label><input type="text" inputmode="decimal" id="mkU'+i+'" value="'+esc(l.used)+'"'+dis+' onfocus="this.select()" oninput="mkLineIn('+i+',\'used\',this.value)"></div>'+
      '<div><label>'+esc(t('mk_waste'))+'</label><input type="text" inputmode="decimal" id="mkW'+i+'" value="'+esc(l.waste===0?'':l.waste)+'" placeholder="0"'+dis+' onfocus="this.select()" oninput="mkLineIn('+i+',\'waste\',this.value)"></div></div>'+
      '<div class="ow" id="mkO'+i+'">'+esc(mkLineWarn(c))+'</div></div>';}).join('');}
function mkLinePaint(i){ // วาดตัวเลขของบรรทัดในที่ (ไม่แตะ input ที่กำลังพิมพ์)
  const c=mkLineCalc(i);if(!c.it)return;const cc=document.getElementById('mkC'+i),ow=document.getElementById('mkO'+i),ln=document.getElementById('mkL'+i);
  if(cc)cc.textContent=c.cost==null?'–':money(c.cost);if(ow)ow.textContent=mkLineWarn(c);if(ln)ln.classList.toggle('over',!!(c.over||c.ubad));}
function mkLineIn(i,k,v){const m=MK;if(!m||!m.lines[i])return;m.lines[i][k]=v;mkDraft();mkLinePaint(i);mkPaintSum();}
function mkLotsChange(v){ // เปลี่ยนจำนวนรอบ = ตามสูตร/ใช้จริง/ได้จริง กลับเป็นตามแผนทั้งหมด (เศษที่พิมพ์ไว้คงเดิม)
  const m=MK;if(!m)return;const r=recipeById(m.rid);v=rnd4(num(v));
  if(v===rnd4(num(m.lots)))return;   // input แล้ว change ซ้ำ (blur ตอนแตะช่องอื่น) = ไม่ทำอะไร — ตรวจอิสระ 2026-10-16: วาดใหม่ตอนนี้ทำให้ช่องที่เพิ่งแตะหาย
  m.lots=v;
  const bom=bomOf(r);m.lines.forEach(l=>{const b=bom.find(x=>x.item_id===l.item_id);const qb=b&&b.qty_base!=null?b.qty_base:0;l.plan=rnd4(qb*v);l.used=l.plan;});
  m.actual=rnd4(num(r.yield_qty)*v);m.actualTouched=false;const a=document.getElementById('mkActual');if(a)a.value=m.actual;
  const hint=document.getElementById('mkActHint');if(hint)hint.textContent=t('mk_actual_hint',{q:fmtQ(rnd4(num(r.yield_qty)*v)),u:trUnit(r.yield_unit)});
  const b=document.getElementById('mkLines');
  if(b&&m.lines.every((l,i)=>document.getElementById('mkU'+i)))m.lines.forEach((l,i)=>{   // แก้ตัวเลขในที่ — ไม่ทำลาย input ที่โฟกัสอยู่
    const p=document.getElementById('mkP'+i),u=document.getElementById('mkU'+i);if(p)p.textContent=l.bad_unit?'⚠':fmtQ(l.plan);if(u)u.value=l.used;mkLinePaint(i);});
  else if(b)b.innerHTML=mkLinesHtml();
  mkDraft();mkPaintSum();}
function mkActualChange(v){const m=MK;if(!m)return;m.actual=rnd4(num(v));m.actualTouched=true;mkDraft();mkPaintSum();}
function mkCalc(){ // ต้นทุนล็อต: items (ใช้จริง+เศษ × ต้นทุน/หน่วย) · oh (ค่าใช้จ่ายแฝงตามตั้งค่า) · extra (ค่าอื่น × รอบ) · ohAll = oh+extra · total · unit
  const m=MK,r=recipeById(m.rid);let items=0;const missing=[],ubad=[];
  m.lines.forEach((l,i)=>{const c=mkLineCalc(i);if(!c.it)return;if(c.ubad){ubad.push(dispName(c.it)+' ('+trUnit(c.ubad)+')');return;}if(c.uc==null){if(c.used+c.waste>0)missing.push(dispName(c.it));return;}items+=c.cost;});
  items=rnd2(items);const actual=num(m.actual),lots=num(m.lots);
  const oh=rnd2(overheadFor(items,actual)),extra=rnd2(num(r.extra_cost)*lots),ohAll=rnd2(oh+extra),total=rnd2(items+ohAll);
  return {items,oh,extra,ohAll,total,unit:actual>0?rnd4(total/actual):null,missing,ubad,prev:recipeUnitCost(r)};}
function mkSumHtml(){
  const m=MK,r=recipeById(m.rid),c=mkCalc(),u=trUnit(r.yield_unit);
  let vs='';if(c.unit!=null&&c.prev!=null&&c.prev>0){const p=Math.round((c.unit-c.prev)/c.prev*100);vs='<span class="sm '+(p>0?'red':p<0?'green':'mut')+'">'+(p>0?'▲':p<0?'▼':'=')+Math.abs(p)+'% · '+esc(t('mk_vs',{c:fmtQ(c.prev),u}))+'</span>';}
  else if(c.unit!=null)vs='<span class="sm mut">'+esc(t('mk_vs_first'))+'</span>';
  return '<h3>'+esc(t('mk_cost'))+'</h3>'+
    '<div class="ln"><span>'+esc(t('mk_cost_items'))+'</span><span>'+esc(money(c.items))+'</span></div>'+
    (c.extra?'<div class="ln"><span>'+esc(t('mk_cost_extra'))+' × '+fmtQ(m.lots)+'</span><span>'+esc(money(c.extra))+'</span></div>':'')+
    '<div class="ln"><span>'+esc(t('mk_cost_oh'))+'</span><span>'+esc(money(c.oh))+'</span></div>'+
    '<div class="ln tot"><span>'+esc(t('mk_cost_total'))+'</span><span>'+esc(money(c.total))+'</span></div>'+
    '<div class="ln tot"><span>'+esc(t('mk_cost_unit',{u}))+'</span><span class="big">'+(c.unit==null?'–':esc(mkMoney(c.unit)))+'</span></div>'+(vs?'<div class="right">'+vs+'</div>':'')+
    (c.ubad.length?'<div class="badbox" style="margin-top:8px">⚠ '+esc(t('mk_unit_bad_sum',{list:c.ubad.join(', ')}))+'</div>':'')+
    (c.missing.length?'<div class="badbox" style="margin-top:8px">⚠ '+esc(t('mk_missing',{list:c.missing.join(', ')}))+'</div>':'');}
function mkBarTxt(){const c=mkCalc(),r=recipeById(MK.rid);return money(c.total)+(c.unit!=null?' · '+mkMoney(c.unit)+'/'+trUnit(r.yield_unit):'');}
function mkPaintSum(){const s=document.getElementById('mkSum');if(s&&MK)s.innerHTML=mkSumHtml();const v=document.getElementById('mkBarV');if(v&&MK)v.textContent=mkBarTxt();}

/* ---------- บันทึก ---------- */
function mkValidate(){ // → ข้อความผิดพลาด หรือ null
  const m=MK;if(!S.kcSql)return t('mk_sql_block');
  if(!(num(m.lots)>0))return t('mk_need_lots');if(!(num(m.actual)>0))return t('mk_need_actual');
  for(let i=0;i<m.lines.length;i++){const c=mkLineCalc(i);if(!c.it)continue;
    if(c.ubad)return t('mk_unit_bad_q',{n:dispName(c.it),u:trUnit(c.ubad),b:trUnit(c.it.unit)});   // สูตรแปลงหน่วยไม่ได้ = ห้ามบันทึก (ไม่งั้นล็อตนี้ขาดส่วนผสม ต้นทุนต่ำกว่าจริง)
    if(c.bad)return t('mk_bad_line',{n:dispName(c.it)});}
  return null;}
async function mkIns(tbl,rows){ // ตารางจริงอาจยังไม่มีช่อง prev_* → ตัดออกแล้วเขียนใหม่ (fail-soft) · คืน false ถ้าถูกตัด
  setBusy(true);
  try{let r=await sb.from(tbl).insert(rows);if(!r||!r.error)return true;
    if(r.error.code==='PGRST204'&&/prev_/.test(String(r.error.message||''))){const strip=x=>{const y=Object.assign({},x);delete y.prev_avg;delete y.prev_unit_cost;delete y.prev_qty;return y;};
      r=await sb.from(tbl).insert(Array.isArray(rows)?rows.map(strip):strip(rows));if(!r||!r.error)return false;}
    const d=document.getElementById('syncDot');if(d)d.className='err';toast(t('sv_err')+(r.error.message||r.error),true);throw r.error;}
  finally{setBusy(false);}}
function mkRepaintCosts(){ // ต้นทุนสดหลัง refreshRows — แก้ตัวเลขต้นทุนบนบรรทัด/สรุปในที่ (ไม่วาดฟอร์มใหม่)
  if(!MK)return;MK.lines.forEach((l,i)=>{const c=mkLineCalc(i);const cc=document.getElementById('mkC'+i);if(cc)cc.textContent=c.cost==null?'–':money(c.cost);});mkPaintSum();}
async function mkRollback(pid,step,r,snap){ // บันทึกไม่ครบ = ถอนทุกอย่างที่เขียนไปแล้ว (best effort · ไม่ throw)
  if(step==='moves')await pushMovesUndo('kc_productions',pid);
  if((step==='moves'||step==='cost')&&r){const p={avg_cost:snap.avg_cost,unit_cost:snap.unit_cost};try{await sb.from('ck_recipes').update(p).eq('id',r.id);}catch(e){}Object.assign(r,p);}
  if(step!=='head'){try{await sb.from('kc_production_lines').delete().eq('production_id',pid);}catch(e){}}
  try{await sb.from('kc_productions').delete().eq('id',pid);}catch(e){}}
async function mkAfterMoves(pid,r,actual,unit,snap,prevOk){ // ยอดสินค้าก่อนล็อตที่ RPC บอก ต่างจากตอนคิด = คิดถัวเฉลี่ยใหม่ + แก้ prev_qty
  const live=rnd4(num(r.qty)-actual);if(Math.abs(live-snap.qty)<1e-9)return;
  const avg=avgCostRecipe(Object.assign({},r,{avg_cost:snap.avg_cost}),actual,unit,live);
  try{await sb.from('ck_recipes').update({avg_cost:avg}).eq('id',r.id);r.avg_cost=avg;if(prevOk)await sb.from('kc_productions').update({prev_qty:live}).eq('id',pid);toast(t('mk_cost_fix'),'warn');}catch(e){}}
async function mkSave(){await once(async()=>{
  const m=MK;if(!m||!canKitchen())return;const r=recipeById(m.rid);if(!r)return;
  const nt=document.getElementById('mkNote');if(nt)m.note=nt.value;
  const err=mkValidate();if(err){toast(err,true);return;}
  await refreshRows('item',m.lines.map(l=>l.item_id));await refreshRows('recipe',[r.id]);mkRepaintCosts();   // ยอด/ต้นทุนสด — ต้นทุนล็อตนี้คิดจากราคาวัตถุดิบล่าสุดจริง
  const over=m.lines.map((l,i)=>mkLineCalc(i)).filter(c=>c.it&&c.over).map(c=>dispName(c.it));
  if(over.length&&!(await confirm2(t('mk_over_q',{list:over.join(', ')}),{danger:true})))return;
  const c=mkCalc();
  if(c.missing.length&&!(await confirm2(t('mk_missing_q',{list:c.missing.join(', ')}))))return;
  const pid=uid('pd'),d=bizTodayISO(),lots=rnd4(num(m.lots)),actual=rnd4(num(m.actual)),u=trUnit(r.yield_unit);
  const snap={avg_cost:r.avg_cost==null?null:num(r.avg_cost),unit_cost:r.unit_cost==null?null:num(r.unit_cost),qty:rnd4(num(r.qty))};
  const head={id:pid,d,recipe_id:r.id,name:r.name,lots,plan_qty:rnd4(lots*num(r.yield_qty)),actual_qty:actual,unit:r.yield_unit||'',cost_items:c.items,cost_overhead:c.ohAll,cost_total:c.total,cost_unit:c.unit,
    kind:m.kind||'manual',note:String(m.note||'').trim()||null,by_name:S.user&&S.user.name,prev_avg:snap.avg_cost,prev_unit_cost:snap.unit_cost,prev_qty:snap.qty};
  const rows=m.lines.map((l,i)=>{const x=mkLineCalc(i);if(!x.it)return null;
    return {production_id:pid,item_id:x.it.id,name:x.it.name,qty_plan:rnd4(l.plan),qty_used:rnd4(x.used),qty_waste:rnd4(x.waste),unit:x.it.unit||'',unit_cost:x.uc==null?null:rnd4(x.uc),cost:rnd4(x.cost||0),sort:i+1};}).filter(Boolean);
  let prevOk=true,step='head';
  try{
    prevOk=await mkIns('kc_productions',head);
    step='lines';if(rows.length)await mkIns('kc_production_lines',rows);
    step='cost';await applyRecipeLot(r,actual,c.unit,snap.qty);   // ถัวเฉลี่ยกับสต๊อกเดิม + unit_cost = ล็อตนี้ — ก่อน pushMoves (ใช้ยอดก่อนเคลื่อนไหว) · พลาด = ถอน
    step='moves';const mv=[];
    rows.forEach(x=>{const uc=num(x.unit_cost);
      if(x.qty_used>0)mv.push({d,kind:'produce_out',ref_kind:'item',ref_id:x.item_id,qty:-x.qty_used,cost:-rnd4(x.qty_used*uc),ref_table:'kc_productions',ref_id2:pid,note:r.name});
      if(x.qty_waste>0)mv.push({d,kind:'waste',ref_kind:'item',ref_id:x.item_id,qty:-x.qty_waste,cost:-rnd4(x.qty_waste*uc),ref_table:'kc_productions',ref_id2:pid,note:r.name+' · '+t('mk_waste')});});
    mv.push({d,kind:'produce_in',ref_kind:'recipe',ref_id:r.id,qty:actual,cost:c.total,ref_table:'kc_productions',ref_id2:pid,note:t('mk_lots_n',{n:fmtQ(lots)})});
    await pushMoves(mv);
  }catch(e){await mkRollback(pid,step,r,snap);toast(t('mk_not_saved')+' · '+((e&&e.message)||e),true);return;}
  await mkAfterMoves(pid,r,actual,c.unit,snap,prevOk);
  toast(prevOk?t('mk_saved',{q:fmtQ(actual),u,c:fmtQ(c.unit)}):t('mk_prev_cols'),prevOk?false:'warn');
  MK=null;mkDraftClear();MK_TODAY.unshift(Object.assign({created_at:new Date().toISOString()},head));MK_ORD.at=0;
  if(S.tab==='make')rerender();mkDetail(pid);
});}

/* ---------- รายละเอียด + ยกเลิก (วันเดียวกัน) ---------- */
async function mkDetail(id){ // โมดูลประวัติ/เมนูเรียกได้
  let p=null,lines=[];
  try{p=await db(()=>sb.from('kc_productions').select('*').eq('id',id).maybeSingle());if(p)lines=await db(()=>sb.from('kc_production_lines').select('*').eq('production_id',id).order('sort').order('id'));}catch(e){return;}
  if(!p){toast(t('mk_gone'));return;}
  const r=recipeById(p.recipe_id),u=trUnit(p.unit||(r&&r.yield_unit)||''),canVoid=p.d===bizTodayISO()&&canKitchen();
  openModal('<h3>🍳 '+esc(t('mk_detail'))+'</h3>'+
    '<div class="row" style="margin-bottom:6px"><b style="font-size:18px;font-family:var(--fh)">'+esc(r?dispName(r):p.name)+'</b><span class="chip '+(p.kind==='urgent'?'bad':p.kind==='refill'?'blue':'mid')+'">'+esc(mkKindLb(p.kind))+'</span><span class="chip mid">'+esc(t('mk_lots_n',{n:fmtQ(p.lots)}))+'</span></div>'+
    '<div class="xs mut">'+esc(dispDate(p.d))+' '+esc(dispTime(p.created_at))+' · '+esc(t('mk_by'))+' '+esc(p.by_name||'')+'</div>'+(p.note?'<div class="note" style="margin-top:6px">'+esc(p.note)+'</div>':'')+
    '<div class="mk-kpis"><div class="kpi"><div class="t">'+esc(t('mk_actual'))+'</div><div class="kpi-v">'+fmtQ(p.actual_qty)+' <small>'+esc(u)+'</small></div><div class="s mut">'+esc(t('mk_plan'))+' '+fmtQ(p.plan_qty)+'</div></div>'+
      '<div class="kpi hero"><div class="t">'+esc(t('mk_cost_unit',{u}))+'</div><div class="kpi-v">'+esc(mkMoney(p.cost_unit))+'</div><div class="s">'+esc(t('mk_cost_total'))+' '+esc(money(p.cost_total))+'</div></div></div>'+
    '<div class="twrap"><table class="t"><thead><tr><th>'+esc(t('item'))+'</th><th class="n">'+esc(t('mk_col_plan'))+'</th><th class="n">'+esc(t('mk_col_used'))+'</th><th class="n">'+esc(t('mk_col_waste'))+'</th><th class="n">'+esc(t('mk_col_uc'))+'</th><th class="n">'+esc(t('cost'))+'</th></tr></thead><tbody>'+
    lines.map(l=>'<tr><td>'+esc(l.name||'')+' <span class="xs mut">'+esc(trUnit(l.unit))+'</span></td><td class="n">'+fmtQ(l.qty_plan)+'</td><td class="n">'+fmtQ(l.qty_used)+'</td><td class="n">'+fmtQ(l.qty_waste)+'</td><td class="n">'+(l.unit_cost==null?'–':fmtQ(l.unit_cost))+'</td><td class="n">'+esc(money(l.cost))+'</td></tr>').join('')+
    '<tr><td colspan="5">'+esc(t('mk_cost_items'))+'</td><td class="n">'+esc(money(p.cost_items))+'</td></tr><tr><td colspan="5">'+esc(t('mk_cost_oh'))+' + '+esc(t('mk_cost_extra'))+'</td><td class="n">'+esc(money(p.cost_overhead))+'</td></tr>'+
    '<tr class="tot"><td colspan="5">'+esc(t('mk_cost_total'))+'</td><td class="n">'+esc(money(p.cost_total))+'</td></tr></tbody></table></div>'+
    (r&&r.avg_cost!=null&&num(r.avg_cost)>0?'<div class="hintbox">'+esc(t('mk_avg_now',{c:fmtQ(r.avg_cost),u,q:fmtQ(r.qty)+' '+u}))+'</div>':'')+
    '<div class="row" style="margin-top:12px">'+(canVoid?'<button class="btn gh" style="color:var(--bad)" onclick="mkVoid(\''+esc(p.id)+'\')">'+esc(t('mk_void'))+'</button>':'<span class="xs mut">'+esc(t('mk_void_today'))+'</span>')+
    '<button class="btn" style="margin-left:auto" onclick="closeModal()">'+esc(t('close'))+'</button></div>');}
async function mkLaterLots(p){ // ล็อตของสินค้าเดียวกันที่บันทึก "หลัง" ล็อตนี้ → [{prev_qty,qty,price:cost_unit}] เรียงตามเวลา
  if(!p.created_at)return [];
  const rows=await db(()=>sb.from('kc_productions').select('id,actual_qty,cost_unit,prev_qty,created_at').eq('recipe_id',p.recipe_id).gt('created_at',p.created_at).neq('id',p.id).order('created_at').limit(500));
  return rows.map(x=>({id:x.id,prev_qty:x.prev_qty==null?null:num(x.prev_qty),qty:num(x.actual_qty),price:num(x.cost_unit)}));}
function mkVoidPatch(r,p,later,done){ // ต้นทุนสินค้าหลังยกเลิกล็อต → {patch,fixes} · later=null = อ่านล็อตหลังจากนั้นไม่ได้ → ถอดน้ำหนักจากถัวเฉลี่ยปัจจุบัน
  const vq=num(p.actual_qty),vp=num(p.cost_unit),qtyNow=done?num(r.qty)+vq:num(r.qty);
  const res=costAfterVoid({qty:qtyNow,avg_cost:r.avg_cost},{avg:p.prev_avg,last:p.prev_unit_cost,last_at:null},vq,vp,later);   // "ราคาล่าสุด" ของสินค้า = unit_cost ของล็อตล่าสุด
  const patch={avg_cost:res.avg,unit_cost:res.unknown?(r.unit_cost==null?null:num(r.unit_cost)):res.last};
  return {patch,fixes:res.fixes||[]};}
async function mkFixLater(fixes){ // ล็อตหลัง ๆ จดค่าก่อนล็อตใหม่ (เหมือนล็อตที่ยกเลิกไม่เคยมี) · fail-soft
  for(const f of fixes){try{await sb.from('kc_productions').update({prev_qty:f.prev_qty,prev_avg:f.prev_avg,prev_unit_cost:f.prev_last}).eq('id',f.L.id);}catch(e){}}}
async function mkVoid(id){await once(async()=>{
  if(!canKitchen())return;let p=null,lines=[];
  try{p=await db(()=>sb.from('kc_productions').select('*').eq('id',id).maybeSingle());if(p)lines=await db(()=>sb.from('kc_production_lines').select('*').eq('production_id',id).order('sort'));}catch(e){return;}
  if(!p){toast(t('mk_gone'));return;}
  if(p.d!==bizTodayISO()){toast(t('mk_void_today'),true);return;}
  if(!(await confirm2(t('mk_void_q',{n:p.name,q:fmtQ(p.actual_qty),u:trUnit(p.unit)}),{danger:true})))return;
  const r=recipeById(p.recipe_id);let na=false;
  if(r)await refreshRows('recipe',[r.id]);await refreshRows('item',lines.map(l=>l.item_id));
  try{
    const done=await voidDone('kc_productions',id);   // รอบก่อนคืนสต๊อกแล้วแต่ลบล็อตไม่สำเร็จ = ไม่คืนซ้ำ
    let patch=null,fixes=[];
    if(r){if('prev_avg' in p){let later=null;try{later=await mkLaterLots(p);}catch(e){later=null;}const r2=mkVoidPatch(r,p,later,done);patch=r2.patch;fixes=r2.fixes;}else na=true;}
    const d=bizTodayISO(),note=t('mk_void_note')+' · '+p.name;
    if(!done){const mv=lines.map(l=>({d,kind:'adjust',ref_kind:'item',ref_id:l.item_id,qty:rnd4(num(l.qty_used)+num(l.qty_waste)),cost:num(l.cost),ref_table:'kc_productions',ref_id2:id,note}));
      if(r)mv.push({d,kind:'adjust',ref_kind:'recipe',ref_id:r.id,qty:-num(p.actual_qty),cost:-num(p.cost_total),ref_table:'kc_productions',ref_id2:id,note});
      await pushMoves(mv);}
    if(patch){await db(()=>sb.from('ck_recipes').update(patch).eq('id',r.id));Object.assign(r,patch);await mkFixLater(fixes);}
    await db(()=>sb.from('kc_production_lines').delete().eq('production_id',id));
    await db(()=>sb.from('kc_productions').delete().eq('id',id));
  }catch(e){return;}
  MK_TODAY=MK_TODAY.filter(x=>x.id!==id);MK_ORD.at=0;closeModal();toast(na?t('mk_prev_na'):t('mk_void_ok'),na?'warn':false);
  if(S.tab==='make'&&!MK)rerender();});}
