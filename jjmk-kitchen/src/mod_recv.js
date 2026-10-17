/* ============================================================
   📥 รับของ (recv · rc*) — จดของที่รับเข้าวันนี้ + ราคาจริงของวันนั้น
   ฟอร์ม (2026-10-17 เจ้าของสั่ง "เลือกเป็นรูปเลย แล้วใส่ข้อมูลหลังกดรูป · เลขบิลไม่ต้องใส่"): ร้านค้า · วันที่ · หมายเหตุ → ตารางรูปสินค้า (ชิปหมวด/ร้านนี้ + ค้นหา) แตะรูป = เพิ่มรายการ + หน้าต่างใส่ กี่ห่อ × ขนาดห่อ · ราคาต่อห่อ/รวม
   → แถวสรุป (แตะ = แก้ · ✕ = เอาออก) · ช่องที่เลือกแล้วขึ้น ✓ จำนวน · ไม่มีช่องเลขบิล (bill_no = null) → kc_receipts + kc_receipt_lines
   + kc_moves 'receive' + ck_items.avg_cost/last_price (ถัวเฉลี่ย — applyItemReceipt ก่อน pushMoves)
   รายการที่รับแล้ว (14 วัน) → รายละเอียด → ยกเลิกได้เฉพาะวันเดียวกัน (คืนสต๊อก + ต้นทุน: ใบล่าสุด = คืนค่าที่จดไว้ · ใบเก่ากว่า = เล่นซ้ำด้วยใบที่เหลือ — costAfterVoid)
   บันทึก = หัว → บรรทัด → ต้นทุน → สต๊อก · พลาดขั้นไหน = ถอนทุกอย่างที่เขียนไป (rcRollback) ไม่เหลือใบรับของค้างทั้งที่สต๊อกไม่ขยับ
   ร่างฟอร์มอยู่ localStorage jjck_rc_draft (วันเดียวกัน ≤12 ชม.) — ลากหน้าลงรีเฟรชแล้วตัวเลขไม่หาย
   ============================================================ */
I18N.add({
th:{rc_new:'รับของใหม่',rc_recent:'ที่รับแล้ว',rc_bill_no:'เลขบิล/ใบส่งของ',rc_sup_pick:'— เลือกร้านค้า —',rc_sup_new:'＋ ร้านใหม่',rc_sup_name:'ชื่อร้านค้า',rc_sup_phone:'เบอร์โทร',
  rc_from_po:'รับตามที่สั่งไว้',rc_po_none:'ยังไม่มีรายการที่สั่งไว้รอรับ',rc_po_pick:'เลือกใบที่สั่งไว้',rc_po_tag:'สั่งไว้',rc_po_items:'{n} รายการ',
  rc_add_line:'เพิ่มรายการ',rc_clear:'ล้างฟอร์ม',rc_clear_q:'ทิ้งรายการที่กรอกไว้ทั้งหมด?',rc_pick_item:'แตะเพื่อเลือกวัตถุดิบ',rc_item_new:'＋ วัตถุดิบใหม่',
  rc_packs:'จำนวน (กี่ห่อ/ถุง/ชุด)',rc_pack_unit:'หน่วยที่รับ',rc_pack_size:'ขนาดบรรจุ',rc_unit_new:'＋ หน่วยใหม่…',rc_unit_name:'ชื่อหน่วย',rc_unit_eq:'1 {u} = ? {b}',rc_unit_save:'ใช้หน่วยนี้',
  rc_price:'ราคาที่จ่ายจริง',rc_per:'ต่อ {u}',rc_total_all:'รวมทั้งหมด',rc_got:'ได้',rc_cost_unit:'ต้นทุน',rc_old_cost:'เดิม',rc_no_price_yet:'ใส่ราคาด้วย',
  rc_lines_n:'รายการ',rc_sum:'รวม',rc_need_item:'เลือกวัตถุดิบก่อน',rc_need_qty:'ใส่จำนวนที่รับ (ต้องมากกว่า 0)',rc_need_size:'ใส่ขนาดบรรจุ (1 {u} = กี่ {b})',rc_need_price:'ใส่ราคาที่จ่าย',
  rc_zero_price_q:'ราคา 0 บาท (ของแถม/ฟรี) {n} รายการ — บันทึกแบบไม่มีราคาใช่ไหม?',rc_saved:'บันทึกรับของแล้ว ✅ {n} รายการ · {m}',rc_sql_block:'ยังรัน SQL ไม่ได้ — บันทึกรับของไม่ได้',
  rc_stock:'ในสต๊อก',rc_empty:'ยังไม่มีรายการรับของใน 14 วันนี้',rc_void:'ยกเลิกรับของนี้',rc_void_q:'ยกเลิกรับของ {s} {b}?\nสต๊อกจะถูกหักคืน {n} รายการ และต้นทุนคิดใหม่เหมือนไม่เคยรับใบนี้',rc_void_ok:'ยกเลิกรับของแล้ว — คืนสต๊อกเรียบร้อย',
  rc_void_today:'ยกเลิกได้เฉพาะวันที่รับเท่านั้น',rc_void_note:'ยกเลิกรับของ',rc_voided_gone:'(รับของนี้ถูกยกเลิกแล้ว)',rc_by:'โดย',rc_detail:'รายละเอียดรับของ',rc_at:'เมื่อ',
  rc_item_name:'ชื่อวัตถุดิบ',rc_item_unit:'หน่วยหลัก (ที่ใช้ในสูตร)',rc_item_cat:'หมวด',rc_item_pack:'หน่วยที่ซื้อ',rc_item_pack_q:'1 หน่วยที่ซื้อ = กี่หน่วยหลัก',rc_item_sup:'ร้านประจำ',rc_item_dup:'มีวัตถุดิบชื่อนี้อยู่แล้ว',
  rc_pack_new_saved:'จำหน่วย {u} ของ {i} ไว้แล้ว (1 {u} = {q} {b})',rc_prev_na:'ไม่มีต้นทุนก่อนรับที่จดไว้ — คงต้นทุนปัจจุบัน',rc_prev_cols:'หมายเหตุ: ตารางยังไม่มีช่องเก็บต้นทุนก่อนรับ (prev_avg) — ยกเลิกแล้วต้นทุนจะไม่ย้อนกลับ',
  rc_n_bills:'{n} ใบ',rc_14d:'14 วันล่าสุด',rc_not_saved:'บันทึกไม่สำเร็จ — ไม่มีอะไรถูกบันทึก ลองใหม่อีกครั้ง',rc_cost_fix:'ยอดในระบบเปลี่ยนระหว่างบันทึก — คิดต้นทุนถัวเฉลี่ยใหม่ให้แล้ว',rc_lines_hint:'ใส่ทีละรายการ: กี่ห่อ · ห่อละเท่าไร · จ่ายเท่าไร — ระบบคิดต้นทุนต่อหน่วยให้เอง'},
en:{rc_new:'New receipt',rc_recent:'Received',rc_bill_no:'Bill / delivery note no.',rc_sup_pick:'— choose supplier —',rc_sup_new:'＋ New supplier',rc_sup_name:'Supplier name',rc_sup_phone:'Phone',
  rc_from_po:'Receive an order',rc_po_none:'No sent orders waiting to be received',rc_po_pick:'Choose the order',rc_po_tag:'Order',rc_po_items:'{n} lines',
  rc_add_line:'Add line',rc_clear:'Clear form',rc_clear_q:'Discard everything entered?',rc_pick_item:'Tap to choose an ingredient',rc_item_new:'＋ New ingredient',
  rc_packs:'Quantity (packs / bags / sets)',rc_pack_unit:'Received as',rc_pack_size:'Pack size',rc_unit_new:'＋ New unit…',rc_unit_name:'Unit name',rc_unit_eq:'1 {u} = ? {b}',rc_unit_save:'Use this unit',
  rc_price:'Price actually paid',rc_per:'per {u}',rc_total_all:'Total',rc_got:'Got',rc_cost_unit:'Cost',rc_old_cost:'before',rc_no_price_yet:'Enter the price',
  rc_lines_n:'lines',rc_sum:'Total',rc_need_item:'Choose an ingredient first',rc_need_qty:'Enter the quantity received (more than 0)',rc_need_size:'Enter the pack size (1 {u} = how many {b})',rc_need_price:'Enter the price paid',
  rc_zero_price_q:'{n} line(s) at ฿0 (free) — save without a price?',rc_saved:'Receipt saved ✅ {n} lines · {m}',rc_sql_block:'SQL not run yet — cannot save receipts',
  rc_stock:'In stock',rc_empty:'No receipts in the last 14 days',rc_void:'Void this receipt',rc_void_q:'Void receipt {s} {b}?\nStock of {n} line(s) will be taken back and costs recomputed as if this receipt never happened',rc_void_ok:'Receipt voided — stock restored',
  rc_void_today:'Only receipts from today can be voided',rc_void_note:'Receipt voided',rc_voided_gone:'(this receipt was voided)',rc_by:'by',rc_detail:'Receipt detail',rc_at:'at',
  rc_item_name:'Ingredient name',rc_item_unit:'Base unit (used in recipes)',rc_item_cat:'Category',rc_item_pack:'Buying unit',rc_item_pack_q:'1 buying unit = how many base units',rc_item_sup:'Usual supplier',rc_item_dup:'An ingredient with this name already exists',
  rc_pack_new_saved:'Saved unit {u} for {i} (1 {u} = {q} {b})',rc_prev_na:'No pre-receipt cost stored — current cost kept',rc_prev_cols:'Note: the table has no prev_avg column yet — voiding will not restore costs',
  rc_n_bills:'{n} receipts',rc_14d:'Last 14 days',rc_not_saved:'NOT saved — please try again',rc_cost_fix:'Stock changed while saving — moving average recomputed',rc_lines_hint:'One line per item: how many packs · pack size · what you paid — unit cost is computed for you'},
lo:{rc_new:'ຮັບເຄື່ອງໃໝ່',rc_recent:'ຮັບແລ້ວ',rc_bill_no:'ເລກບິນ/ໃບສົ່ງເຄື່ອງ',rc_sup_pick:'— ເລືອກຮ້ານຄ້າ —',rc_sup_new:'＋ ຮ້ານໃໝ່',rc_sup_name:'ຊື່ຮ້ານຄ້າ',rc_sup_phone:'ເບີໂທ',
  rc_from_po:'ຮັບຕາມທີ່ສັ່ງໄວ້',rc_po_none:'ຍັງບໍ່ມີລາຍການທີ່ສັ່ງໄວ້ລໍຮັບ',rc_po_pick:'ເລືອກໃບທີ່ສັ່ງໄວ້',rc_po_tag:'ສັ່ງໄວ້',rc_po_items:'{n} ລາຍການ',
  rc_add_line:'ເພີ່ມລາຍການ',rc_clear:'ລ້າງຟອມ',rc_clear_q:'ຖິ້ມລາຍການທີ່ໃສ່ໄວ້ທັງໝົດ?',rc_pick_item:'ແຕະເພື່ອເລືອກວັດຖຸດິບ',rc_item_new:'＋ ວັດຖຸດິບໃໝ່',
  rc_packs:'ຈຳນວນ (ຈັກຫໍ່/ຖົງ/ຊຸດ)',rc_pack_unit:'ຫົວໜ່ວຍທີ່ຮັບ',rc_pack_size:'ຂະໜາດບັນຈຸ',rc_unit_new:'＋ ຫົວໜ່ວຍໃໝ່…',rc_unit_name:'ຊື່ຫົວໜ່ວຍ',rc_unit_eq:'1 {u} = ? {b}',rc_unit_save:'ໃຊ້ຫົວໜ່ວຍນີ້',
  rc_price:'ລາຄາທີ່ຈ່າຍແທ້',rc_per:'ຕໍ່ {u}',rc_total_all:'ລວມທັງໝົດ',rc_got:'ໄດ້',rc_cost_unit:'ຕົ້ນທຶນ',rc_old_cost:'ເດີມ',rc_no_price_yet:'ໃສ່ລາຄານຳ',
  rc_lines_n:'ລາຍການ',rc_sum:'ລວມ',rc_need_item:'ເລືອກວັດຖຸດິບກ່ອນ',rc_need_qty:'ໃສ່ຈຳນວນທີ່ຮັບ (ຕ້ອງຫຼາຍກວ່າ 0)',rc_need_size:'ໃສ່ຂະໜາດບັນຈຸ (1 {u} = ຈັກ {b})',rc_need_price:'ໃສ່ລາຄາທີ່ຈ່າຍ',
  rc_zero_price_q:'ລາຄາ 0 ບາດ (ຂອງແຖມ/ຟຣີ) {n} ລາຍການ — ບັນທຶກແບບບໍ່ມີລາຄາບໍ?',rc_saved:'ບັນທຶກຮັບເຄື່ອງແລ້ວ ✅ {n} ລາຍການ · {m}',rc_sql_block:'ຍັງບໍ່ໄດ້ແລ່ນ SQL — ບັນທຶກຮັບເຄື່ອງບໍ່ໄດ້',
  rc_stock:'ໃນສະຕັອກ',rc_empty:'ຍັງບໍ່ມີລາຍການຮັບເຄື່ອງໃນ 14 ມື້ນີ້',rc_void:'ຍົກເລີກຮັບເຄື່ອງນີ້',rc_void_q:'ຍົກເລີກຮັບເຄື່ອງ {s} {b}?\nສະຕັອກຈະຖືກຫັກຄືນ {n} ລາຍການ ແລະຕົ້ນທຶນຄິດໃໝ່ຄືບໍ່ເຄີຍຮັບໃບນີ້',rc_void_ok:'ຍົກເລີກຮັບເຄື່ອງແລ້ວ — ຄືນສະຕັອກຮຽບຮ້ອຍ',
  rc_void_today:'ຍົກເລີກໄດ້ສະເພາະມື້ທີ່ຮັບເທົ່ານັ້ນ',rc_void_note:'ຍົກເລີກຮັບເຄື່ອງ',rc_voided_gone:'(ຮັບເຄື່ອງນີ້ຖືກຍົກເລີກແລ້ວ)',rc_by:'ໂດຍ',rc_detail:'ລາຍລະອຽດຮັບເຄື່ອງ',rc_at:'ເມື່ອ',
  rc_item_name:'ຊື່ວັດຖຸດິບ',rc_item_unit:'ຫົວໜ່ວຍຫຼັກ (ທີ່ໃຊ້ໃນສູດ)',rc_item_cat:'ໝວດ',rc_item_pack:'ຫົວໜ່ວຍທີ່ຊື້',rc_item_pack_q:'1 ຫົວໜ່ວຍທີ່ຊື້ = ຈັກຫົວໜ່ວຍຫຼັກ',rc_item_sup:'ຮ້ານປະຈຳ',rc_item_dup:'ມີວັດຖຸດິບຊື່ນີ້ຢູ່ແລ້ວ',
  rc_pack_new_saved:'ຈື່ຫົວໜ່ວຍ {u} ຂອງ {i} ໄວ້ແລ້ວ (1 {u} = {q} {b})',rc_prev_na:'ບໍ່ມີຕົ້ນທຶນກ່ອນຮັບທີ່ຈົດໄວ້ — ຄົງຕົ້ນທຶນປັດຈຸບັນ',rc_prev_cols:'ໝາຍເຫດ: ຕາຕະລາງຍັງບໍ່ມີຊ່ອງເກັບຕົ້ນທຶນກ່ອນຮັບ (prev_avg) — ຍົກເລີກແລ້ວຕົ້ນທຶນຈະບໍ່ຍ້ອນກັບ',
  rc_n_bills:'{n} ໃບ',rc_14d:'14 ມື້ຫຼ້າສຸດ',rc_not_saved:'ບໍ່ໄດ້ບັນທຶກ — ລອງໃໝ່ອີກຄັ້ງ',rc_cost_fix:'ຍອດໃນລະບົບປ່ຽນລະຫວ່າງບັນທຶກ — ຄິດຕົ້ນທຶນສະເລ່ຍໃໝ່ແລ້ວ',rc_lines_hint:'ໃສ່ທີລະລາຍການ: ຈັກຫໍ່ · ຫໍ່ລະເທົ່າໃດ · ຈ່າຍເທົ່າໃດ — ລະບົບຄິດຕົ້ນທຶນຕໍ່ຫົວໜ່ວຍໃຫ້ເອງ'},
my:{rc_new:'လက်ခံမှုအသစ်',rc_recent:'လက်ခံပြီး',rc_bill_no:'ဘေလ်/ပို့လွှာ နံပါတ်',rc_sup_pick:'— ဆိုင်ရွေးပါ —',rc_sup_new:'＋ ဆိုင်အသစ်',rc_sup_name:'ဆိုင်အမည်',rc_sup_phone:'ဖုန်း',
  rc_from_po:'မှာထားသည်ကို လက်ခံ',rc_po_none:'လက်ခံရန် စောင့်နေသော မှာယူမှု မရှိပါ',rc_po_pick:'မှာယူမှုကို ရွေးပါ',rc_po_tag:'မှာထား',rc_po_items:'{n} ကြောင်း',
  rc_add_line:'ကြောင်းထည့်ရန်',rc_clear:'ဖောင်ရှင်းရန်',rc_clear_q:'ထည့်ထားသမျှ ဖျက်မလား?',rc_pick_item:'ကုန်ကြမ်းရွေးရန် နှိပ်ပါ',rc_item_new:'＋ ကုန်ကြမ်းအသစ်',
  rc_packs:'အရေအတွက် (ထုပ်/အိတ်/စုံ)',rc_pack_unit:'လက်ခံယူနစ်',rc_pack_size:'ထုပ်အရွယ်',rc_unit_new:'＋ ယူနစ်အသစ်…',rc_unit_name:'ယူနစ်အမည်',rc_unit_eq:'1 {u} = ? {b}',rc_unit_save:'ဤယူနစ်သုံးရန်',
  rc_price:'အမှန်ပေးချေသောစျေး',rc_per:'{u} တစ်ခုလျှင်',rc_total_all:'စုစုပေါင်း',rc_got:'ရသည်',rc_cost_unit:'ကုန်ကျစရိတ်',rc_old_cost:'ယခင်',rc_no_price_yet:'စျေးထည့်ပါ',
  rc_lines_n:'ကြောင်း',rc_sum:'စုစုပေါင်း',rc_need_item:'ကုန်ကြမ်းအရင်ရွေးပါ',rc_need_qty:'လက်ခံအရေအတွက်ထည့်ပါ (0 ထက်များရမည်)',rc_need_size:'ထုပ်အရွယ်ထည့်ပါ (1 {u} = {b} ဘယ်လောက်)',rc_need_price:'ပေးချေသောစျေးထည့်ပါ',
  rc_zero_price_q:'၀ ဘတ် (အခမဲ့) {n} ကြောင်း — စျေးမပါဘဲ သိမ်းမလား?',rc_saved:'လက်ခံမှုသိမ်းပြီး ✅ {n} ကြောင်း · {m}',rc_sql_block:'SQL မလုပ်ရသေးပါ — လက်ခံမှု သိမ်း၍မရပါ',
  rc_stock:'လက်ကျန်',rc_empty:'ပြီးခဲ့သော ၁၄ ရက်အတွင်း လက်ခံမှုမရှိပါ',rc_void:'ဤလက်ခံမှုကို ပယ်ဖျက်',rc_void_q:'လက်ခံမှု {s} {b} ပယ်ဖျက်မလား?\n{n} ကြောင်း၏ လက်ကျန်ကို ပြန်နုတ်ပြီး ဤလက်ခံမှု မရှိသကဲ့သို့ ကုန်ကျစရိတ် ပြန်တွက်မည်',rc_void_ok:'ပယ်ဖျက်ပြီး — လက်ကျန်ပြန်ထားပြီ',
  rc_void_today:'ယနေ့လက်ခံမှုကိုသာ ပယ်ဖျက်နိုင်သည်',rc_void_note:'လက်ခံမှုပယ်ဖျက်',rc_voided_gone:'(ဤလက်ခံမှုကို ပယ်ဖျက်ပြီး)',rc_by:'မှ',rc_detail:'လက်ခံမှုအသေးစိတ်',rc_at:'အချိန်',
  rc_item_name:'ကုန်ကြမ်းအမည်',rc_item_unit:'အခြေခံယူနစ် (နည်းတွင်သုံး)',rc_item_cat:'အမျိုးအစား',rc_item_pack:'ဝယ်ယူနစ်',rc_item_pack_q:'ဝယ်ယူနစ် 1 = အခြေခံယူနစ် ဘယ်လောက်',rc_item_sup:'ပုံမှန်ဆိုင်',rc_item_dup:'ဤအမည်ဖြင့် ကုန်ကြမ်းရှိပြီးသား',
  rc_pack_new_saved:'{i} အတွက် ယူနစ် {u} သိမ်းပြီး (1 {u} = {q} {b})',rc_prev_na:'လက်ခံမီ ကုန်ကျစရိတ် မသိမ်းထားပါ — လက်ရှိအတိုင်းထား',rc_prev_cols:'မှတ်ချက်: ဇယားတွင် prev_avg ကော်လံ မရှိသေးပါ — ပယ်ဖျက်လျှင် ကုန်ကျစရိတ် ပြန်မရပါ',
  rc_n_bills:'{n} စောင်',rc_14d:'နောက်ဆုံး ၁၄ ရက်',rc_not_saved:'မသိမ်းရသေးပါ — ထပ်စမ်းပါ',rc_cost_fix:'သိမ်းနေစဉ် လက်ကျန်ပြောင်းသွား၍ ပျမ်းမျှစရိတ် ပြန်တွက်ပြီး',rc_lines_hint:'တစ်ကြောင်းချင်း: ထုပ်ဘယ်နှစ်ခု · ထုပ်အရွယ် · ပေးချေငွေ — ယူနစ်ကုန်ကျစရိတ်ကို အလိုအလျောက်တွက်ပေးသည်'}
});
I18N.add({ // หน้ารับของแบบแตะรูป (2026-10-17)
th:{rc_tap_pic:'แตะรูปสินค้าที่รับมา',rc_this_sup:'ร้านนี้',rc_all:'ทั้งหมด',rc_lines_title:'รายการที่รับ',rc_no_lines:'ยังไม่ได้เลือกสินค้า — แตะรูปสินค้าด้านล่าง',rc_ok:'ตกลง',rc_remove:'เอาออก',rc_change:'เปลี่ยน'},
en:{rc_tap_pic:'Tap the items you received',rc_this_sup:'This supplier',rc_all:'All',rc_lines_title:'Received lines',rc_no_lines:'Nothing chosen yet — tap an item picture below',rc_ok:'Done',rc_remove:'Remove',rc_change:'Change'},
lo:{rc_tap_pic:'ແຕະຮູບເຄື່ອງທີ່ຮັບມາ',rc_this_sup:'ຮ້ານນີ້',rc_all:'ທັງໝົດ',rc_lines_title:'ລາຍການທີ່ຮັບ',rc_no_lines:'ຍັງບໍ່ໄດ້ເລືອກເຄື່ອງ — ແຕະຮູບເຄື່ອງຂ້າງລຸ່ມ',rc_ok:'ຕົກລົງ',rc_remove:'ເອົາອອກ',rc_change:'ປ່ຽນ'},
my:{rc_tap_pic:'လက်ခံရသော ပစ္စည်းပုံကို နှိပ်ပါ',rc_this_sup:'ဤဆိုင်',rc_all:'အားလုံး',rc_lines_title:'လက်ခံသောကြောင်းများ',rc_no_lines:'မရွေးရသေးပါ — အောက်ရှိ ပစ္စည်းပုံကို နှိပ်ပါ',rc_ok:'ပြီးပြီ',rc_remove:'ဖယ်ရှား',rc_change:'ပြောင်း'}
});
CSS.add(`
.rc-sec{display:flex;align-items:center;gap:8px;font-family:var(--fh);font-weight:700;color:var(--wine);font-size:14.5px;margin:12px 2px 8px}
.rc-sec .bdg{background:var(--wine);color:#fff;border-radius:999px;padding:1px 8px;font-size:12px}
.rcln{padding:10px 12px;margin-bottom:8px}
.rcln .rcln-tap{display:flex;gap:10px;align-items:center;flex:1;min-width:0;cursor:pointer}
.rcln-th{width:48px;height:48px;border-radius:12px;background:#F3ECE0;display:flex;align-items:center;justify-content:center;font-size:22px;overflow:hidden;flex:none}
.rcln-th img{width:100%;height:100%;object-fit:cover}
.rcln-sub{font-size:13px;color:var(--mut);margin-top:2px;overflow-wrap:anywhere}.rcln-sub b{font-family:var(--fh);color:var(--ink)}.rcln-sub .red{color:var(--bad);font-weight:700}
.rcgrid{margin-top:10px;margin-bottom:14px}
.rctile{padding:8px;gap:6px}.rctile .ithumb{height:96px;font-size:36px;cursor:pointer}.rctile .iname{font-size:13.5px;min-height:auto}
.rctile.on{border:2px solid #3E9E64;background:#F4FBF6}
.rcbadge{position:absolute;top:6px;right:6px;background:#2E7D4F;color:#fff;border-radius:999px;padding:3px 9px;font-size:12.5px;font-weight:800;box-shadow:var(--sh);z-index:2;white-space:nowrap}
.rctile.rcnew{border-style:dashed;color:var(--mut)}.rctile.rcnew .ithumb{background:#FBF6EA;color:var(--gold)}
.rcline{padding:0}
.rcl-top{align-items:flex-start;flex-wrap:nowrap}
.rcl-pick{width:100%;text-align:left;font:inherit;font-weight:700;font-size:16px;padding:6px 0;min-height:44px;color:var(--ink);background:none;border:none;overflow-wrap:anywhere;font-family:var(--fh)}
.rcl-pick.empty{color:var(--red);border:1.5px dashed var(--red);border-radius:11px;padding:10px 12px;font-weight:600;min-height:44px}
.rcl-x{width:44px;height:44px;min-height:44px;border-radius:50%;border:1.5px solid var(--line);background:#fff;color:var(--mut);font-size:16px;flex:none;padding:0}
.rcl-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}
@media(max-width:339px){.rcl-grid{grid-template-columns:1fr}}
.rcl-size{flex-wrap:nowrap}.rcl-size input{flex:1;min-width:0;width:0;text-align:center;font-weight:700}
.rcl-size span{flex:none;white-space:nowrap;font-size:13.5px;color:var(--mut)}
.rcl-pm{padding:0;margin:0 0 6px}.rcl-pm .pill{min-height:40px;padding:6px 13px}
.rcl-sum{margin-top:8px;background:#FBF6EA;border:1.5px solid #F0E8D6;border-radius:12px;padding:8px 12px;font-size:14px;line-height:1.55}
.rcl-sum b{font-family:var(--fh);font-size:16px}
.rcl-sum .cmp{font-size:12.5px;color:var(--mut)}
.rcl-sum.need{background:var(--gold-t);border-color:#E9D9A8;color:var(--gold)}
.rcl-stk{font-size:12px;color:var(--mut);margin-top:2px}
.rcl-newu{background:var(--gold-t);border:1.5px solid #E9D9A8;border-radius:12px;padding:10px;margin-top:6px;display:flex;flex-direction:column;gap:8px}
.rcl-newu .row{flex-wrap:nowrap}.rcl-newu input,.rcl-newu select{min-width:0;width:0;flex:1}
.rc-pick-list .rowline{cursor:pointer;min-height:52px}
.rc-rcpt{cursor:pointer}.rc-rcpt .amt{font-family:var(--fh);font-weight:700;font-size:16px;white-space:nowrap}
.rc-rcpt .names{font-size:12.5px;color:var(--mut);overflow-wrap:anywhere}
.rc-dhead{font-family:var(--fh);font-weight:700;color:var(--wine);font-size:13.5px;margin:10px 2px 6px}
.rc-po-chip{display:inline-flex;align-items:center;gap:6px;margin-top:4px}
`);
let RC=null;                 // ฟอร์มรับของที่กำลังกรอก {d,sup_id,sup_name,bill_no,note,po_id,po_no,lines[]}
let RC_VIEW='form';          // 'form' | 'list'
let RC_T=null;               // timer บันทึกร่าง
const RC_DRAFT='jjck_rc_draft',RC_DRAFT_MS=12*3600*1000;
function rcBlank(){return {d:bizTodayISO(),sup_id:'',sup_name:'',bill_no:'',note:'',po_id:null,po_no:'',lines:[]};}
function rcLineBlank(){return {item_id:'',name:'',packs:'',pack_unit:'',pack_qty:'',unit:'',price_mode:'pack',price:'',newu:null};}
function rcDraftLoad(){const d=LS.get(RC_DRAFT,null);if(!d||!d.data||d.d!==bizTodayISO()||Date.now()-num(d.t)>RC_DRAFT_MS){LS.del(RC_DRAFT);return null;}
  const f=Object.assign(rcBlank(),d.data);f.bill_no='';f.lines=(Array.isArray(f.lines)?f.lines:[]).map(l=>Object.assign(rcLineBlank(),l));return f;}
function rcDraft(){clearTimeout(RC_T);RC_T=setTimeout(()=>{if(!RC)return;const has=RC.lines.length||RC.bill_no||RC.note||RC.sup_id;
  if(has)LS.set(RC_DRAFT,{t:Date.now(),d:bizTodayISO(),data:RC});else LS.del(RC_DRAFT);},250);}
function rcDraftClear(){clearTimeout(RC_T);LS.del(RC_DRAFT);}

/* ---------- หน้า (เจ้าของสั่ง 2026-10-17: "เลือกเป็นรูปเลย แล้วใส่ข้อมูลหลังจากกดรูป · เลขบิลไม่ต้องใส่") ---------- */
let RC_CAT='';               // ชิปของตารางรูป: '' ทั้งหมด · '__sup' ร้านที่เลือก · ชื่อหมวด
let RC_Q='';                 // คำค้นในตารางรูป (คงไว้ตอนวาดใหม่)
RENDER.recv=function(el){
  if(!RC)RC=rcDraftLoad()||rcBlank();
  el.innerHTML=dhead('📥 '+t('nav_recv'),esc(dispDate(bizTodayISO())))+sqlNeedBox()+
    pillBar([{k:'form',lb:t('rc_new'),ic:'➕',n:RC.lines.length||null},{k:'list',lb:t('rc_recent'),ic:'📜'}],RC_VIEW,k=>{RC_VIEW=k;rerender();},{scroll:1})+
    '<div id="rcBody"></div>';
  if(RC_VIEW==='form')rcPaintForm();else rcPaintList();
};
function rcPaintForm(){ // หัว (ร้าน·วันที่·หมายเหตุ) → รายการที่รับแล้ว (แตะ = แก้) → ตารางรูปสินค้า (แตะ = เพิ่ม/แก้) → แถบบันทึก
  const b=document.getElementById('rcBody');if(!b)return;
  b.innerHTML=rcHeadHtml()+
    '<div class="rc-sec">🧾 '+esc(t('rc_lines_title'))+(RC.lines.length?' <span class="bdg">'+RC.lines.length+'</span>':'')+
      (RC.lines.length?'<button class="btn gh sm2" style="margin-left:auto" onclick="rcClearAsk()">🗑 '+esc(t('rc_clear'))+'</button>':'')+'</div>'+
    '<div id="rcLines">'+(RC.lines.length?RC.lines.map((l,i)=>rcLineRow(l,i)).join(''):'<div class="note">'+esc(t('rc_no_lines'))+'</div>')+'</div>'+
    '<div class="rc-sec">🖼️ '+esc(t('rc_tap_pic'))+'</div><div id="rcChips">'+rcChipsHtml()+'</div>'+searchBox('rcGridQ','rcGridSearch')+
    '<div class="igrid rcgrid" id="rcGrid">'+rcGridHtml()+'</div>';
  const q=document.getElementById('rcGridQ');if(q&&RC_Q)q.value=RC_Q;
  rcBar();
}
function rcSupOpts(){const act=S.sups.filter(s=>s.active!==false||s.id===RC.sup_id);
  return '<option value="">'+esc(t('rc_sup_pick'))+'</option>'+act.map(s=>'<option value="'+esc(s.id)+'"'+(s.id===RC.sup_id?' selected':'')+'>'+esc(s.name)+'</option>').join('');}
function rcHeadHtml(){ // ไม่มีช่องเลขบิลแล้ว (bill_no ในตารางเป็น null · ใบเก่าที่มีเลขยังโชว์ในรายการ/รายละเอียด)
  return card('🏷️ '+esc(t('sup')),
    fld(t('sup'),'<div class="row" style="flex-wrap:nowrap"><select id="rcSup" class="grow" style="min-width:0" onchange="rcSetSup(this.value)">'+rcSupOpts()+'</select>'+
      '<button class="btn gh sm2" style="flex:none" onclick="rcNewSup()">'+esc(t('rc_sup_new'))+'</button></div>')+
    '<div class="grid2">'+fld(t('date'),'<input type="date" id="rcD" value="'+esc(RC.d)+'" max="'+esc(bizTodayISO())+'" onchange="RC.d=this.value||bizTodayISO();rcDraft()">')+
      fld(t('note'),'<input id="rcNote" value="'+esc(RC.note)+'" oninput="RC.note=this.value;rcDraft()">')+'</div>'+
    '<div class="row"><button class="btn gh sm2" onclick="rcPoPick()">📋 '+esc(t('rc_from_po'))+'</button>'+
      (RC.po_id?'<span class="chip blue rc-po-chip">'+esc(t('rc_po_tag'))+' '+esc(RC.po_no||RC.po_id)+' <a onclick="rcPoClear()" style="cursor:pointer">✕</a></span>':'')+'</div>');
}
function rcSetSup(id){const s=supById(id);RC.sup_id=s?s.id:'';RC.sup_name=s?s.name:'';RC_CAT=rcSupItems().length?'__sup':'';rcDraft();rcGridPaint();}
function rcBar(){
  if(S.tab!=='recv'||RC_VIEW!=='form')return;
  if(!RC.lines.length){pinnedBar(null);return;}
  const tot=RC.lines.reduce((a,l)=>{const c=rcCalc(l);return a+(c.price_total||0);},0);
  pinnedBar('<span class="v">'+RC.lines.length+' '+esc(t('rc_lines_n'))+' · '+esc(money(tot))+'</span><button class="btn" id="rcSaveBtn" onclick="rcSave()">💾 '+esc(t('save'))+'</button>');
}

/* ---------- ตารางรูปสินค้า (แตะรูป = เพิ่มรายการแล้วเปิดหน้าต่างใส่ข้อมูล · แตะซ้ำ = แก้) ---------- */
function rcIcon(it){try{return itIcon(it);}catch(e){return '🥬';}}
function rcCatIcon(c){try{return IT_IC[c]||'🧺';}catch(e){return '🧺';}}
function rcThumb(o,cls){ // รูปในช่อง — ไม่ใส่ซูมแบบ thumbHtml (แตะรูป = เลือกสินค้า)
  const url=o&&imgOk(o.image_url)?String(o.image_url):'';return '<div class="'+(cls||'ithumb')+'">'+(url?'<img src="'+esc(url)+'" loading="lazy">':rcIcon(o))+'</div>';}
function rcCatOf(it){return String(it&&it.cat||'').trim()||'อื่นๆ';}
function rcSupItems(){const k=supKey(RC.sup_name);return k?activeItems().filter(it=>supKey(it.sup)===k):[];}
function rcCats(){const c=[];activeItems().forEach(it=>{const x=rcCatOf(it);if(!c.includes(x))c.push(x);});return ITEM_CATS.filter(x=>c.includes(x)).concat(c.filter(x=>!ITEM_CATS.includes(x)));}
function rcCatCur(){const cats=rcCats();if(RC_CAT==='__sup')return rcSupItems().length?'__sup':'';return cats.includes(RC_CAT)?RC_CAT:'';}
function rcChipsHtml(){const sup=rcSupItems().length,items=[];
  if(sup)items.push({k:'__sup',lb:t('rc_this_sup'),ic:'🏷️',n:sup});
  items.push({k:'',lb:t('rc_all'),ic:'🧺'});rcCats().forEach(c=>items.push({k:c,lb:trCat(c),ic:rcCatIcon(c)}));
  return pillBar(items,rcCatCur(),'rcSetCat',{scroll:1});}
function rcGridList(){const q=supKey(RC_Q),cat=rcCatCur();let L=cat==='__sup'?rcSupItems():activeItems().filter(it=>!cat||rcCatOf(it)===cat);
  if(q)L=L.filter(it=>supKey(it.name).includes(q)||supKey(dispName(it)).includes(q)||supKey(it.sup).includes(q)||supKey(it.cat).includes(q));
  return L.slice().sort((a,b)=>dispName(a).localeCompare(dispName(b),'th'));}
function rcGridHtml(){const L=rcGridList(),inL={};RC.lines.forEach((l,i)=>{if(l.item_id&&inL[l.item_id]==null)inL[l.item_id]=i;});
  return L.map(it=>{const i=inL[it.id],l=i!=null?RC.lines[i]:null,c=l?rcCalc(l):null;
    return '<div class="icard rctile tap'+(l?' on':'')+'" data-id="'+esc(it.id)+'" onclick="rcTileTap(this.dataset.id)">'+rcThumb(it,'ithumb')+
      (l?'<span class="rcbadge">✓'+(c.packs>0?' '+fmtQ(c.packs)+' '+esc(trUnit(l.pack_unit||it.unit)):'')+'</span>':'')+
      '<div class="iname">'+esc(dispName(it))+'</div><div class="isub">'+esc(t('rc_stock'))+' '+fmtQ(it.qty)+' '+esc(trUnit(it.unit))+(itemCost(it)!=null?' · ฿'+rcP(itemCost(it))+'/'+esc(trUnit(it.unit)):'')+'</div></div>';}).join('')+
    '<div class="icard rctile tap rcnew" onclick="rcNewItem(null)"><div class="ithumb">➕</div><div class="iname">'+esc(t('rc_item_new'))+'</div><div class="isub">&nbsp;</div></div>'+
    (L.length?'':'<div class="empty" style="grid-column:1/-1">'+esc(t('empty'))+'</div>');}
function rcGridPaint(){const g=document.getElementById('rcGrid');if(g)g.innerHTML=rcGridHtml();const c=document.getElementById('rcChips');if(c){c.innerHTML=rcChipsHtml();const on=c.querySelector('.pill.on');if(on&&on.scrollIntoView)try{on.scrollIntoView({inline:'nearest',block:'nearest'});}catch(e){}}}   // ชิปที่เลือกต้องยังเห็นหลังวาดใหม่
function rcSetCat(k){RC_CAT=k||'';rcGridPaint();}
function rcGridSearch(v){RC_Q=String(v||'');const g=document.getElementById('rcGrid');if(g)g.innerHTML=rcGridHtml();}   // กรองในที่ — คีย์บอร์ดไม่หุบ
function rcTileTap(id){const it=itemById(id);if(!it)return;const i=RC.lines.findIndex(l=>l.item_id===id);if(i>=0){rcEdit(i);return;}
  RC.lines.push(rcLineBlank());rcSetItem(RC.lines.length-1,it);}

/* ---------- รายการที่รับแล้ว (แถวสรุป · แตะ = หน้าต่างแก้) ---------- */
function rcLineRow(l,i){const it=itemById(l.item_id);
  if(!it)return '<div class="card rcln" id="rcR'+i+'"><div class="row" style="flex-wrap:nowrap"><button class="rcl-pick empty grow" onclick="rcPickItem('+i+')">🥬 '+esc(t('rc_pick_item'))+'</button><button class="rcl-x" aria-label="x" onclick="rcDelLine('+i+')">✕</button></div></div>';
  const c=rcCalc(l),base=it.unit||'';let sub='';
  if(!(c.qty_base>0))sub='<span class="red">'+esc(c.packs>0?t('rc_need_size',{u:trUnit(l.pack_unit||base),b:trUnit(base)}):t('rc_need_qty'))+'</span>';
  else{sub='<b>'+fmtQ(c.packs)+' '+esc(trUnit(l.pack_unit||base))+'</b>'+(l.pack_unit&&l.pack_unit!==base?' × '+fmtQ(c.pack_qty)+' = '+fmtQ(c.qty_base)+' '+esc(trUnit(base)):'');
    sub+=c.price_total==null?' · <span class="red">'+esc(t('rc_no_price_yet'))+'</span>':' · '+esc(money(c.price_total))+' <span class="mut">(฿'+rcP(c.price_base)+'/'+esc(trUnit(base))+')</span>';}
  return '<div class="card rcln" id="rcR'+i+'"><div class="row" style="flex-wrap:nowrap"><div class="rcln-tap" onclick="rcEdit('+i+')">'+rcThumb(it,'rcln-th')+'<div style="min-width:0;flex:1"><b>'+esc(dispName(it))+'</b><div class="rcln-sub">'+sub+'</div></div></div>'+
    '<button class="rcl-x" aria-label="x" onclick="rcDelLine('+i+')">✕</button></div></div>';}

/* ---------- หน้าต่างใส่ข้อมูลของรายการ (เปิดหลังแตะรูป) ---------- */
function rcCalc(l){ // → {it,packs,pack_qty,qty_base,price,price_total,price_base}
  const it=itemById(l.item_id);const packs=num(l.packs),pq=num(l.pack_qty);const qty_base=rnd4(packs*pq);
  const ps=String(l.price==null?'':l.price).trim();const price=ps===''?null:num(ps);
  const price_total=price==null?null:rnd2(l.price_mode==='total'?price:price*packs);
  const price_base=(price_total!=null&&qty_base>0)?price_total/qty_base:null;
  return {it,packs,pack_qty:pq,qty_base,price,price_total,price_base};}
function rcUnitOpts(it,l){const list=[it.unit].concat(packsOf(it).map(p=>p.u));if(l.pack_unit&&!list.includes(l.pack_unit))list.push(l.pack_unit);
  return list.map(u=>'<option value="'+esc(u)+'"'+(u===l.pack_unit?' selected':'')+'>'+esc(trUnit(u))+(u!==it.unit&&unitFactor(it,u)!=null?' (= '+fmtQ(unitFactor(it,u))+' '+esc(trUnit(it.unit))+')':'')+'</option>').join('')+
    '<option value="__new">'+esc(t('rc_unit_new'))+'</option>';}
function rcEdit(i){const l=RC.lines[i];if(!l)return;if(!itemById(l.item_id)){rcPickItem(i);return;}openModal(rcEditorHtml(l,i));MODAL_BACK=()=>rcEditDone(i);rcSum(i);}   // ปิดทางไหนก็วาดแถว/ป้ายใหม่ (แตะพื้นมืดด้วย — ผู้ตรวจ V2)
function rcEditorHtml(l,i){ // id rcL<i> = หน้าต่างของรายการนั้น (ช่อง rcP/rcU/rcQ/rcPr/rcS ตามเดิม)
  const it=itemById(l.item_id),base=it.unit||'',isBase=l.pack_unit===base;
  let h='<div class="rcline" id="rcL'+i+'"><div class="row rcl-top">'+thumbHtml(it,rcIcon(it))+'<div class="grow" style="min-width:0"><h3 style="margin:0 0 2px">'+esc(dispName(it))+'</h3><div class="rcl-stk">'+esc(t('rc_stock'))+' '+fmtQ(it.qty)+' '+esc(trUnit(base))+
      (itemCost(it)!=null?' · '+esc(t('rc_cost_unit'))+' ฿'+rcP(itemCost(it))+'/'+esc(trUnit(base)):'')+'</div></div>'+
    '<button class="btn gh sm2" style="flex:none" onclick="rcPickItem('+i+')">'+esc(t('rc_change'))+'</button></div>';
  h+='<div class="rcl-grid">'+fld(t('rc_packs'),stepper('rcP'+i,l.packs,{step:1,min:0,on:(v,id)=>rcSetPacks(i,v)}))+
    fld(t('rc_pack_unit'),'<select id="rcU'+i+'" onchange="rcSetUnit('+i+',this.value)">'+rcUnitOpts(it,l)+'</select>')+'</div>';
  if(l.newu)h+='<div class="rcl-newu"><div class="xs mut">'+esc(t('rc_unit_eq',{u:'…',b:trUnit(base)}))+'</div><div class="row"><select id="rcNU'+i+'" onchange="RC.lines['+i+'].newu.n=this.value">'+
    '<option value="">'+esc(t('rc_unit_name'))+'</option>'+allUnits().filter(u=>u!==base&&unitFactor(it,u)==null).map(u=>'<option value="'+esc(u)+'"'+(u===l.newu.n?' selected':'')+'>'+esc(trUnit(u))+'</option>').join('')+'</select>'+
    '<span>=</span><input id="rcNQ'+i+'" inputmode="decimal" placeholder="?" value="'+esc(l.newu.q)+'" oninput="RC.lines['+i+'].newu.q=this.value"><span style="flex:none">'+esc(trUnit(base))+'</span></div>'+
    '<div class="row"><button class="btn gh sm2" style="flex:1" onclick="rcNewUnitCancel('+i+')">'+esc(t('cancel'))+'</button><button class="btn sm2" style="flex:1" onclick="rcNewUnitOk('+i+')">'+esc(t('rc_unit_save'))+'</button></div></div>';
  h+=fld(t('rc_pack_size'),'<div class="row rcl-size"><span>1 '+esc(trUnit(l.pack_unit||base))+' =</span><input id="rcQ'+i+'" inputmode="decimal" value="'+esc(isBase?1:l.pack_qty)+'"'+(isBase?' disabled':'')+' oninput="rcSetPackQty('+i+',this.value)"><span>'+esc(trUnit(base))+'</span></div>');
  h+=fld(t('rc_price'),'<div class="pills rcl-pm"><button class="pill'+(l.price_mode!=='total'?' on':'')+'" onclick="rcSetMode('+i+',\'pack\')">'+esc(t('rc_per',{u:trUnit(l.pack_unit||base)}))+'</button>'+
    '<button class="pill'+(l.price_mode==='total'?' on':'')+'" onclick="rcSetMode('+i+',\'total\')">'+esc(t('rc_total_all'))+'</button></div>'+
    '<input id="rcPr'+i+'" inputmode="decimal" placeholder="฿ 0.00" value="'+esc(l.price)+'" oninput="rcSetPrice('+i+',this.value)">');
  h+='<div class="rcl-sum" id="rcS'+i+'"></div>';
  h+='<div class="row" style="margin-top:12px"><button class="btn gh" style="color:var(--bad)" onclick="rcDelLine('+i+')">🗑 '+esc(t('rc_remove'))+'</button><button class="btn" style="flex:1" onclick="rcEditDone('+i+')">✓ '+esc(t('rc_ok'))+'</button></div></div>';
  return h;}
function rcEditDone(i){MODAL_BACK=null;closeModal();rcPaintForm();}
function rcPaintLine(i){const l=RC.lines[i];if(!l)return;const old=document.getElementById('rcL'+i);   // หน้าต่างเปิดอยู่ = วาดหน้าต่างใหม่ · ไม่ได้เปิด = วาดหน้าทั้งหมด
  if(old&&modalOpen()){const w=document.createElement('div');w.innerHTML=rcEditorHtml(l,i);old.replaceWith(w.firstElementChild);rcSum(i);return;}
  rcPaintForm();}
const rcP=v=>Math.abs(v)<1&&v!==0?Number(v).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:4}):fmt(v,2);   // ราคาต่อหน่วยเล็ก ๆ (0.0488) ไม่ปัดเป็น 0.05
function rcSum(i){ // สรุปใต้ช่องกรอก — อัปเดตในที่ (คีย์บอร์ดไม่หุบ)
  const l=RC.lines[i],el=document.getElementById('rcS'+i);if(!l||!el)return;const c=rcCalc(l);if(!c.it){el.innerHTML='';return;}
  const base=c.it.unit||'';let h='';
  if(!(c.qty_base>0)){el.className='rcl-sum need';el.innerHTML=esc(c.packs>0?t('rc_need_size',{u:trUnit(l.pack_unit||base),b:trUnit(base)}):t('rc_need_qty'));return;}
  h+=esc(t('rc_got'))+' <b>'+fmtQ(c.qty_base)+' '+esc(trUnit(base))+'</b>';
  if(c.packs>0&&l.pack_unit&&l.pack_unit!==base)h+=' <span class="cmp">('+fmtQ(c.packs)+' '+esc(trUnit(l.pack_unit))+' × '+fmtQ(c.pack_qty)+')</span>';
  if(c.price_total==null){el.className='rcl-sum need';el.innerHTML=h+'<br>'+esc(t('rc_no_price_yet'));return;}
  const old=itemCost(c.it);h+='<br>'+esc(money(c.price_total))+' · <b>฿'+rcP(c.price_base)+'</b>/'+esc(trUnit(base));
  if(old!=null&&old>0){const pc=(c.price_base-old)/old*100;h+=' <span class="cmp">('+esc(t('rc_old_cost'))+' ฿'+rcP(old)+(Math.abs(pc)>=0.5?' · <span class="'+(pc>0?'red':'green')+'">'+(pc>0?'▲':'▼')+fmt(Math.abs(pc),0)+'%</span>':'')+')</span>';}
  el.className='rcl-sum';el.innerHTML=h;}
function rcAddLine(){RC.lines.push(rcLineBlank());const i=RC.lines.length-1;rcPaintForm();rcPickItem(i);}   // ทางโปรแกรม/ค้นหาแบบรายการ (ทางหลักคือแตะรูป)
function rcDelLine(i){RC.lines.splice(i,1);rcDraft();if(modalOpen()&&document.getElementById('rcL'+i)){MODAL_BACK=null;closeModal();}rcPaintForm();}
function rcSetPacks(i,v){const l=RC.lines[i];if(!l)return;l.packs=v;rcSum(i);rcBar();rcDraft();}
function rcSetPackQty(i,v){const l=RC.lines[i];if(!l)return;l.pack_qty=v;rcSum(i);rcBar();rcDraft();}
function rcSetPrice(i,v){const l=RC.lines[i];if(!l)return;l.price=v;rcSum(i);rcBar();rcDraft();}
function rcSetMode(i,m){const l=RC.lines[i];if(!l)return;l.price_mode=m==='total'?'total':'pack';rcDraft();rcPaintLine(i);rcBar();
  const p=document.getElementById('rcPr'+i);if(p)p.focus();}
function rcSetUnit(i,u){const l=RC.lines[i],it=l&&itemById(l.item_id);if(!it)return;
  if(u==='__new'){l.newu={n:'',q:''};rcPaintLine(i);return;}
  l.pack_unit=u;const f=unitFactor(it,u);l.pack_qty=f!=null?f:'';l.newu=null;rcDraft();rcPaintLine(i);rcBar();}
function rcNewUnitCancel(i){const l=RC.lines[i];if(!l)return;l.newu=null;rcPaintLine(i);}
function rcNewUnitOk(i){const l=RC.lines[i],it=l&&itemById(l.item_id);if(!it||!l.newu)return;
  const n=String(l.newu.n||'').trim(),q=num(l.newu.q);
  if(!n){toast(t('rc_unit_name'),true);return;}if(!(q>0)){toast(t('rc_need_size',{u:trUnit(n),b:trUnit(it.unit)}),true);return;}
  l.pack_unit=n;l.pack_qty=q;l.newu=null;rcDraft();rcPaintLine(i);rcBar();}
function rcSetItem(i,it){ // ตั้งสินค้าให้รายการ i แล้วเปิดหน้าต่างใส่ข้อมูลทันที
  const l=RC.lines[i];if(!l||!it)return;
  l.item_id=it.id;l.name=it.name;l.unit=it.unit||'';const bu=it.buy_unit&&it.buy_unit!==it.unit&&num(it.buy_qty)>0?it.buy_unit:'';
  l.pack_unit=bu||it.unit||'';l.pack_qty=bu?num(it.buy_qty):1;l.price_mode=l.price_mode||'pack';l.newu=null;
  if(!RC.sup_id&&it.sup){const s=supByName(it.sup);if(s){RC.sup_id=s.id;RC.sup_name=s.name;if(!RC_CAT)RC_CAT='__sup';}}
  rcDraft();rcPaintForm();rcEdit(i);
  const p=document.getElementById('rcP'+i);if(p){try{p.focus();p.select();}catch(e){}}}

/* ---------- เลือกวัตถุดิบแบบรายการ (ค้นหาในที่) — ใช้ตอน "เปลี่ยน" ในหน้าต่าง / rcAddLine ---------- */
function rcPickItem(i){
  const rows=activeItems();
  const list=q=>{q=supKey(q);return rows.filter(it=>!q||supKey(it.name).includes(q)||supKey(dispName(it)).includes(q)||supKey(it.sup).includes(q)||supKey(it.cat).includes(q))
    .map(it=>'<div class="rowline tap" data-id="'+esc(it.id)+'" onclick="rcPickGo('+i+',this.dataset.id)">'+thumbHtml(it,'🥬')+'<div class="grow"><b>'+esc(dispName(it))+'</b><div class="xs mut">'+esc(trCat(it.cat))+(it.sup?' · '+esc(it.sup):'')+
      ' · '+esc(t('rc_stock'))+' '+fmtQ(it.qty)+' '+esc(trUnit(it.unit))+'</div></div>'+(itemCost(it)!=null?'<span class="sm mut">฿'+rcP(itemCost(it))+'/'+esc(trUnit(it.unit))+'</span>':'')+'</div>').join('')||'<div class="empty">'+esc(t('empty'))+'</div>';};
  MODAL_BACK=null;openModal('<h3>🥬 '+esc(t('item'))+'</h3>'+searchBox('rcPickQ',v=>{const b=document.getElementById('rcPickList');if(b)b.innerHTML=list(v);})+
    '<button class="btn gh" style="width:100%;margin-bottom:8px" onclick="rcNewItem('+i+')">'+esc(t('rc_item_new'))+'</button><div class="rc-pick-list" id="rcPickList">'+list('')+'</div>');
  setTimeout(()=>{const q=document.getElementById('rcPickQ');if(q&&!('ontouchstart' in window))q.focus();},50);}
function rcPickGo(i,id){const it=itemById(id);MODAL_BACK=null;closeModal();rcSetItem(i,it);}

/* ---------- วัตถุดิบใหม่ / ร้านใหม่ (ในฟอร์มเลย) · rcNewItem(null) = จากช่อง ➕ ในตารางรูป ---------- */
function rcNewItem(i){
  const sup=RC.sup_name||'',ii=i==null?'null':String(i);
  openModal('<h3>'+esc(t('rc_item_new'))+'</h3>'+fld(t('rc_item_name'),'<input id="rcNiName" maxlength="80">')+
    '<div class="grid2">'+fld(t('rc_item_cat'),'<select id="rcNiCat">'+selOpts(ITEM_CATS,rcCatCur()&&rcCatCur()!=='__sup'?rcCatCur():'อื่นๆ',trCat)+'</select>')+
      fld(t('rc_item_unit'),'<select id="rcNiUnit" onchange="rcNiUnitLbl()">'+unitOptions(allUnits(),'กก.')+'</select>')+'</div>'+
    '<div class="grid2">'+fld(t('rc_item_pack'),'<select id="rcNiBu" onchange="rcNiUnitLbl()"><option value="">'+esc(t('none'))+'</option>'+unitOptions(allUnits(),'')+'</select>')+
      fld(t('rc_item_pack_q'),'<div class="row rcl-size"><span>1 <span id="rcNiBuL">—</span> =</span><input id="rcNiBq" inputmode="decimal" placeholder="?"><span id="rcNiBaseL">กก.</span></div>')+'</div>'+
    fld(t('rc_item_sup'),'<input id="rcNiSup" value="'+esc(sup)+'" list="rcSupDl"><datalist id="rcSupDl">'+S.sups.map(s=>'<option value="'+esc(s.name)+'">').join('')+'</datalist>')+
    '<div class="row" style="margin-top:8px"><button class="btn gh" style="flex:1" onclick="'+(i==null?'MODAL_BACK=null;closeModal();rcPaintForm()':'rcPickItem('+ii+')')+'">'+esc(t('back'))+'</button><button class="btn" style="flex:1" onclick="rcNewItemSave('+ii+')">💾 '+esc(t('save'))+'</button></div>');
  rcNiUnitLbl();setTimeout(()=>{const n=document.getElementById('rcNiName');if(n&&!('ontouchstart' in window))n.focus();},50);}
function rcNiUnitLbl(){const u=document.getElementById('rcNiUnit'),b=document.getElementById('rcNiBu');
  const bl=document.getElementById('rcNiBaseL'),ul=document.getElementById('rcNiBuL');if(bl&&u)bl.textContent=trUnit(u.value);if(ul&&b)ul.textContent=b.value?trUnit(b.value):'—';}
async function rcNewItemSave(i){await once(async()=>{
  const g=id=>document.getElementById(id);const name=String(g('rcNiName').value||'').trim();if(!name){toast(t('need_name'),true);return;}
  if(S.items.some(x=>supKey(x.name)===supKey(name)&&x.active!==false)){toast(t('rc_item_dup'),true);return;}
  const unit=g('rcNiUnit').value||'กก.';let bu=g('rcNiBu').value||null,bq=num(g('rcNiBq').value);
  if(bu===unit)bu=null;if(bu&&!(bq>0)){toast(t('rc_need_size',{u:trUnit(bu),b:trUnit(unit)}),true);return;}
  const supName=String(g('rcNiSup').value||'').trim();
  const row={id:uid('it'),name,cat:g('rcNiCat').value||'อื่นๆ',unit,buy_unit:bu||unit,buy_qty:bu?bq:1,sup:supName||null,qty:0,active:true,sort:(S.items.reduce((a,x)=>Math.max(a,num(x.sort)),0)+1)};
  try{await db(()=>sb.from('ck_items').insert(row));}catch(e){return;}
  S.items.push(row);toast(t('sv_ok'));MODAL_BACK=null;closeModal();
  if(i==null||!RC.lines[i]){RC.lines.push(rcLineBlank());i=RC.lines.length-1;}
  rcSetItem(i,row);});}
function rcNewSup(){
  openModal('<h3>'+esc(t('rc_sup_new'))+'</h3>'+fld(t('rc_sup_name'),'<input id="rcNsName" maxlength="80">')+fld(t('rc_sup_phone'),'<input id="rcNsPhone" inputmode="tel">')+
    '<div class="row" style="margin-top:8px"><button class="btn gh" style="flex:1" onclick="closeModal()">'+esc(t('cancel'))+'</button><button class="btn" style="flex:1" onclick="rcNewSupSave()">💾 '+esc(t('save'))+'</button></div>');
  setTimeout(()=>{const n=document.getElementById('rcNsName');if(n&&!('ontouchstart' in window))n.focus();},50);}
async function rcNewSupSave(){await once(async()=>{
  const name=String((document.getElementById('rcNsName')||{}).value||'').trim();if(!name){toast(t('need_name'),true);return;}
  const ex=supByName(name);if(ex){RC.sup_id=ex.id;RC.sup_name=ex.name;RC_CAT=rcSupItems().length?'__sup':'';closeModal();rcPaintForm();return;}
  const row={id:uid('sp'),name,phone:String((document.getElementById('rcNsPhone')||{}).value||'').trim()||null,lead_days:1,credit_days:0,active:true};
  try{await db(()=>sb.from('ck_sups').insert(row));}catch(e){return;}
  S.sups.push(row);S.sups.sort((a,b)=>String(a.name).localeCompare(String(b.name),'th'));RC.sup_id=row.id;RC.sup_name=row.name;RC_CAT='';rcDraft();toast(t('sv_ok'));closeModal();rcPaintForm();});}

/* ---------- รับตามที่สั่งไว้ (kc_pos status sent) ---------- */
async function rcPoPick(){
  let pos=[];try{pos=await db(()=>sb.from('kc_pos').select('*').eq('status','sent').order('d',{ascending:false}).order('created_at',{ascending:false}).limit(50));}catch(e){return;}
  if(!pos.length){toast(t('rc_po_none'));return;}
  let lines=[];try{lines=await db(()=>sb.from('kc_po_lines').select('po_id,item_id').in('po_id',pos.map(p=>p.id)));}catch(e){}
  openModal('<h3>📋 '+esc(t('rc_po_pick'))+'</h3><div class="rc-pick-list">'+pos.map(p=>{const n=lines.filter(l=>l.po_id===p.id).length;
    return '<div class="rowline tap" data-id="'+esc(p.id)+'" onclick="rcFromPo(this.dataset.id)"><div class="grow"><b>'+esc(p.sup_name||'')+'</b> <span class="mut sm">'+esc(p.po_no||'')+'</span><div class="xs mut">'+esc(dispDate(p.d))+' · '+esc(t('rc_po_items',{n}))+'</div></div>'+stPill('sent',t('rc_po_tag'))+'</div>';}).join('')+'</div>');}
async function rcFromPo(poId){ // โมดูลสั่งของเรียกได้: show('recv'); rcFromPo(id)
  let po=null,lines=[];
  try{po=await db(()=>sb.from('kc_pos').select('*').eq('id',poId).maybeSingle());if(!po)return;lines=await db(()=>sb.from('kc_po_lines').select('*').eq('po_id',poId).order('sort').order('id'));}catch(e){return;}
  if(!RC)RC=rcBlank();RC.po_id=po.id;RC.po_no=po.po_no||'';RC.d=bizTodayISO();
  const s=supById(po.sup_id)||supByName(po.sup_name);RC.sup_id=s?s.id:'';RC.sup_name=s?s.name:(po.sup_name||'');
  RC.lines=lines.map(pl=>{const it=itemById(pl.item_id);const l=rcLineBlank();if(!it)return null;
    l.item_id=it.id;l.name=it.name;l.unit=it.unit||'';l.packs=num(pl.packs)||'';l.pack_unit=pl.pack_unit||it.unit;l.pack_qty=num(pl.pack_qty)||(unitFactor(it,l.pack_unit)||1);
    if(pl.price_est!=null&&num(pl.price_est)>0){l.price_mode='total';l.price=num(pl.price_est);}return l;}).filter(Boolean);
  RC_VIEW='form';rcDraft();if(modalOpen())closeModal();if(S.tab==='recv')rerender();else show('recv');}
function rcPoClear(){RC.po_id=null;RC.po_no='';rcDraft();rcPaintForm();}
function rcClearAsk(){confirm2(t('rc_clear_q'),{danger:true}).then(ok=>{if(!ok)return;RC=rcBlank();rcDraftClear();RC_CAT='';RC_Q='';rcPaintForm();});}

/* ---------- บันทึก ---------- */
function rcValidate(){ // → ข้อความผิดพลาด หรือ null
  if(!S.kcSql)return t('rc_sql_block');
  if(!RC.lines.length)return t('rc_need_item');
  for(const l of RC.lines){const c=rcCalc(l);if(!c.it)return t('rc_need_item');
    if(!(c.packs>0))return dispName(c.it)+': '+t('rc_need_qty');
    if(!(c.pack_qty>0))return dispName(c.it)+': '+t('rc_need_size',{u:trUnit(l.pack_unit||c.it.unit),b:trUnit(c.it.unit)});
    if(c.price==null||c.price<0)return dispName(c.it)+': '+t('rc_need_price');}
  return null;}
function rcLineRows(rid){ // บรรทัดที่จะเขียน + ค่าก่อนรับของแต่ละวัตถุดิบ (prev_* ไว้ย้อน/คิดใหม่ตอนยกเลิก · prev_qty = ยอดก่อนรับ)
  return RC.lines.map((l,i)=>{const c=rcCalc(l),it=c.it;
    return {receipt_id:rid,item_id:it.id,name:it.name,packs:c.packs,pack_unit:l.pack_unit||it.unit,pack_qty:c.pack_qty,unit:it.unit||'',qty_base:c.qty_base,
      price_mode:l.price_mode==='total'?'total':'pack',price:rnd4(c.price),price_total:c.price_total,price_base:rnd4(c.price_base),sort:i+1,
      prev_avg:it.avg_cost==null?null:num(it.avg_cost),prev_last:it.last_price==null?null:num(it.last_price),prev_last_at:it.last_price_at||null,prev_qty:rnd4(num(it.qty))};});}
const RC_PREV=['prev_avg','prev_last','prev_last_at','prev_qty'];
async function rcInsertLines(rows){ // ตารางจริงอาจยังไม่มีช่อง prev_* → ตัดออกแล้วเขียนใหม่ (fail-soft) · คืน false ถ้าถูกตัด
  try{await db(()=>sb.from('kc_receipt_lines').insert(rows));return true;}
  catch(e){if(!/prev_/.test(String(e&&e.message||'')))throw e;}
  await db(()=>sb.from('kc_receipt_lines').insert(rows.map(r=>{const x=Object.assign({},r);RC_PREV.forEach(k=>{delete x[k];});return x;})));return false;}
async function rcSavePacks(rows){ // หน่วยบรรจุใหม่ที่พิมพ์เอง → จำไว้กับวัตถุดิบ (ck_items.packs)
  for(const r of rows){const it=itemById(r.item_id);if(!it||!r.pack_unit||r.pack_unit===it.unit||unitFactor(it,r.pack_unit)!=null)continue;
    const packs=(Array.isArray(it.packs)?it.packs:[]).concat([{u:r.pack_unit,q:r.pack_qty}]);
    try{await db(()=>sb.from('ck_items').update({packs}).eq('id',it.id));it.packs=packs;toast(t('rc_pack_new_saved',{u:trUnit(r.pack_unit),i:dispName(it),q:fmtQ(r.pack_qty),b:trUnit(it.unit)}));}catch(e){}}}
function rcSnap(ids){const o={};ids.forEach(id=>{const it=itemById(id);if(it)o[id]={qty:num(it.qty),avg_cost:it.avg_cost==null?null:num(it.avg_cost),last_price:it.last_price==null?null:num(it.last_price),last_price_at:it.last_price_at||null};});return o;}
async function rcRollback(rid,step,snap){ // บันทึกไม่ครบ = ถอนทุกอย่างที่เขียนไปแล้ว (best effort · ไม่ throw)
  if(step==='moves')await pushMovesUndo('kc_receipts',rid);
  if(step==='moves'||step==='cost'){for(const id of Object.keys(snap)){const p={avg_cost:snap[id].avg_cost,last_price:snap[id].last_price,last_price_at:snap[id].last_price_at};
    try{await sb.from('ck_items').update(p).eq('id',id);}catch(e){}const it=itemById(id);if(it)Object.assign(it,p);}}
  if(step!=='head'){try{await sb.from('kc_receipt_lines').delete().eq('receipt_id',rid);}catch(e){}}
  try{await sb.from('kc_receipts').delete().eq('id',rid);}catch(e){}}
async function rcAfterMoves(rid,agg,snap,d,prevOk){ // ยอดก่อนรับที่ RPC บอก (ยอดสดหลังบวก − ที่รับ) ต่างจากตอนคิด = คิดถัวเฉลี่ยใหม่ + แก้ prev_qty บนบรรทัด
  let fixed=false;
  for(const id of Object.keys(agg)){const it=itemById(id);if(!it)continue;const live=rnd4(num(it.qty)-agg[id].q);
    if(Math.abs(live-snap[id].qty)<1e-9)continue;
    const it0=Object.assign({},it,{avg_cost:snap[id].avg_cost});const avg=avgCostItem(it0,agg[id].q,agg[id].v/agg[id].q,live);
    try{await sb.from('ck_items').update({avg_cost:avg}).eq('id',id);it.avg_cost=avg;fixed=true;
      if(prevOk)await sb.from('kc_receipt_lines').update({prev_qty:live}).eq('receipt_id',rid).eq('item_id',id);}catch(e){}}
  if(fixed)toast(t('rc_cost_fix'),'warn');}
async function rcSave(){await once(async()=>{
  const err=rcValidate();if(err){toast(err,true);return;}
  const zero=RC.lines.filter(l=>rcCalc(l).price===0).length;
  if(zero&&!(await confirm2(t('rc_zero_price_q',{n:zero}))))return;
  await refreshRows('item',RC.lines.map(l=>l.item_id));   // ยอด/ต้นทุนสดก่อนคิดถัวเฉลี่ย (อีกเครื่องอาจเพิ่งรับ/ใช้ของตัวเดียวกัน)
  const rid=uid('rc'),d=RC.d||bizTodayISO();const rows=rcLineRows(rid);const total=rnd2(rows.reduce((a,r)=>a+r.price_total,0));
  const head={id:rid,d,sup_id:RC.sup_id||null,sup_name:RC.sup_name||null,bill_no:null,total,note:RC.note||null,po_id:RC.po_id||null,by_name:S.user&&S.user.name};   // ไม่มีช่องเลขบิลแล้ว (ร่างรุ่นเก่าที่ยังมี bill_no ก็ไม่เขียน)
  /* ต้นทุน: รวมบรรทัดของวัตถุดิบเดียวกันก่อน แล้วถัวเฉลี่ยครั้งเดียว (ใช้ยอดก่อนเคลื่อนไหว — จึงเขียนก่อน pushMoves · พลาด = ถอน) */
  const agg={};rows.forEach(r=>{const a=agg[r.item_id]=agg[r.item_id]||{q:0,v:0};a.q+=r.qty_base;a.v+=r.price_total;});
  const snap=rcSnap(Object.keys(agg));
  let prevOk=true,step='head';
  try{
    await db(()=>sb.from('kc_receipts').insert(head));
    step='lines';prevOk=await rcInsertLines(rows);
    step='cost';for(const id of Object.keys(agg)){const it=itemById(id);if(it&&agg[id].q>0)await applyItemReceipt(it,agg[id].q,agg[id].v/agg[id].q,d,snap[id].qty);}
    step='moves';await pushMoves(rows.map(r=>({d,kind:'receive',ref_kind:'item',ref_id:r.item_id,qty:r.qty_base,cost:r.price_total,ref_table:'kc_receipts',ref_id2:rid,note:head.sup_name?head.sup_name+(head.bill_no?' #'+head.bill_no:''):null})));
  }catch(e){await rcRollback(rid,step,snap);toast(t('rc_not_saved')+' · '+((e&&e.message)||e),true);return;}
  await rcAfterMoves(rid,agg,snap,d,prevOk);
  await rcSavePacks(rows);
  if(RC.po_id){try{await db(()=>sb.from('kc_pos').update({status:'received'}).eq('id',RC.po_id));}catch(e){}}
  toast(prevOk?t('rc_saved',{n:rows.length,m:money(total)}):t('rc_prev_cols'),prevOk?false:'warn');   // ไม่มีช่อง prev_* = บันทึกได้ เตือน (เหลือง) ว่ายกเลิกแล้วต้นทุนไม่ย้อน
  RC=rcBlank();rcDraftClear();RC_CAT='';RC_Q='';RC_VIEW='list';rerender();rcDetail(rid);});}   // ฟอร์มใหม่ = ชิป/คำค้นของตารางรูปเริ่มใหม่ด้วย (ไม่งั้นคำค้นเก่าค้างกรองตารางรูปของใบถัดไป)

/* ---------- รายการที่รับแล้ว (14 วัน) ---------- */
async function rcPaintList(){
  pinnedBar(null);const b=document.getElementById('rcBody');if(!b)return;b.innerHTML='<div class="spin"></div>';
  let rows=[],lines=[];
  try{rows=await db(()=>sb.from('kc_receipts').select('*').gte('d',addDays(bizTodayISO(),-14)).order('d',{ascending:false}).order('created_at',{ascending:false}).limit(200));
    if(rows.length)lines=await db(()=>sb.from('kc_receipt_lines').select('receipt_id,name,qty_base,unit').in('receipt_id',rows.map(r=>r.id)));}
  catch(e){b.innerHTML=emptyBox(t('rc_empty'));return;}
  if(!document.getElementById('rcBody')||RC_VIEW!=='list')return;
  if(!rows.length){b.innerHTML=emptyBox(t('rc_empty'));return;}
  const td=bizTodayISO(),tdRows=rows.filter(r=>r.d===td);
  let h='<div class="kpis"><div class="kpi hero"><div class="t">'+esc(t('today'))+'</div><div class="kpi-v">'+esc(money(tdRows.reduce((a,r)=>a+num(r.total),0)))+'</div><div class="s">'+esc(t('rc_n_bills',{n:tdRows.length}))+'</div></div>'+
    '<div class="kpi"><div class="t">'+esc(t('rc_14d'))+'</div><div class="kpi-v">'+esc(money(rows.reduce((a,r)=>a+num(r.total),0)))+'</div><div class="s mut">'+esc(t('rc_n_bills',{n:rows.length}))+'</div></div></div>';
  let last='';rows.forEach(r=>{if(r.d!==last){last=r.d;h+='<div class="rc-dhead">'+esc(dispDate(r.d))+(r.d===td?' · '+esc(t('today')):'')+'</div>';}
    const ls=lines.filter(l=>l.receipt_id===r.id);
    h+='<div class="card rc-rcpt" data-id="'+esc(r.id)+'" onclick="rcDetail(this.dataset.id)"><div class="row" style="flex-wrap:nowrap"><div class="grow"><b>'+esc(r.sup_name||t('none'))+'</b>'+(r.bill_no?' <span class="mut sm">#'+esc(r.bill_no)+'</span>':'')+
      '<div class="names">'+ls.length+' '+esc(t('rc_lines_n'))+(ls.length?' · '+esc(ls.slice(0,3).map(l=>l.name+' '+fmtQ(l.qty_base)+' '+trUnit(l.unit)).join(', '))+(ls.length>3?' …':''):'')+'</div>'+
      '<div class="xs mut">'+esc(t('rc_by'))+' '+esc(r.by_name||'')+' · '+esc(dispTime(r.created_at))+(r.po_id?' · 📋 '+esc(t('rc_po_tag')):'')+'</div></div><span class="amt">'+esc(money(r.total))+'</span></div></div>';});
  b.innerHTML=h;}
async function rcDetail(id){ // โมดูลประวัติเรียกได้
  let r=null,lines=[];
  try{r=await db(()=>sb.from('kc_receipts').select('*').eq('id',id).maybeSingle());if(r)lines=await db(()=>sb.from('kc_receipt_lines').select('*').eq('receipt_id',id).order('sort').order('id'));}catch(e){return;}
  if(!r){toast(t('rc_voided_gone'));return;}
  const canVoid=r.d===bizTodayISO()&&canKitchen();
  openModal('<h3>📥 '+esc(t('rc_detail'))+'</h3><div class="row" style="margin-bottom:8px"><div class="grow"><b>'+esc(r.sup_name||t('none'))+'</b>'+(r.bill_no?' <span class="mut">#'+esc(r.bill_no)+'</span>':'')+
    '<div class="xs mut">'+esc(dispDate(r.d))+' · '+esc(t('rc_by'))+' '+esc(r.by_name||'')+' '+esc(dispTime(r.created_at))+(r.po_id?' · 📋 '+esc(t('rc_po_tag')):'')+'</div></div><span class="amt b" style="font-family:var(--fh);font-size:18px">'+esc(money(r.total))+'</span></div>'+
    (r.note?'<div class="note">'+esc(r.note)+'</div>':'')+
    '<div class="twrap"><table class="t"><thead><tr><th>'+esc(t('item'))+'</th><th class="n">'+esc(t('qty'))+'</th><th class="n">'+esc(t('price'))+'</th><th class="n">'+esc(t('cost'))+esc(t('per_unit'))+'</th></tr></thead><tbody>'+
    lines.map(l=>'<tr><td><b>'+esc(l.name)+'</b><div class="xs mut">'+fmtQ(l.packs)+' '+esc(trUnit(l.pack_unit))+(l.pack_unit!==l.unit?' × '+fmtQ(l.pack_qty)+' '+esc(trUnit(l.unit)):'')+'</div></td>'+
      '<td class="n">'+fmtQ(l.qty_base)+' '+esc(trUnit(l.unit))+'</td><td class="n">'+esc(money(l.price_total))+'</td><td class="n">฿'+rcP(num(l.price_base))+'</td></tr>').join('')+
    '<tr class="tot"><td>'+esc(t('rc_sum'))+'</td><td class="n">'+lines.length+' '+esc(t('rc_lines_n'))+'</td><td class="n">'+esc(money(r.total))+'</td><td></td></tr></tbody></table></div>'+
    '<div class="row" style="margin-top:12px">'+(canVoid?'<button class="btn gh" style="color:var(--bad)" data-id="'+esc(r.id)+'" onclick="rcVoid(this.dataset.id)">❌ '+esc(t('rc_void'))+'</button>':'<span class="xs mut">'+esc(t('rc_void_today'))+'</span>')+
    '<button class="btn" style="margin-left:auto" onclick="closeModal()">'+esc(t('close'))+'</button></div>');}
async function rcLaterLines(r,itemIds){ // ใบรับของที่บันทึก "หลัง" ใบนี้ (ตามเวลาบันทึก) ของวัตถุดิบเดียวกัน → {item_id:[{prev_qty,qty,price,d}]} เรียงตามเวลา · 1 ใบ = 1 ก้อน (รวมบรรทัดของวัตถุดิบเดียวกันเหมือนตอนบันทึก)
  const out={};if(!r.created_at)return out;
  const rs=await db(()=>sb.from('kc_receipts').select('id,d,created_at').gt('created_at',r.created_at).neq('id',r.id).order('created_at').limit(500));
  if(!rs.length)return out;
  const ls=await db(()=>sb.from('kc_receipt_lines').select('id,receipt_id,item_id,qty_base,price_total,prev_qty,prev_avg').in('receipt_id',rs.map(x=>x.id)).in('item_id',itemIds));
  const ord={},dOf={};rs.forEach((x,i)=>{ord[x.id]=i;dOf[x.id]=x.d;});
  const g={};ls.forEach(l=>{const k=l.item_id+'|'+l.receipt_id;const o=g[k]=g[k]||{item_id:l.item_id,receipt_id:l.receipt_id,i:ord[l.receipt_id],prev_qty:l.prev_qty==null?null:num(l.prev_qty),qty:0,v:0,d:dOf[l.receipt_id]||null};
    o.qty+=num(l.qty_base);o.v+=num(l.price_total);});
  Object.values(g).sort((x,y)=>x.i-y.i).forEach(o=>{(out[o.item_id]=out[o.item_id]||[]).push({receipt_id:o.receipt_id,prev_qty:o.prev_qty,qty:rnd4(o.qty),price:o.qty>0?o.v/o.qty:0,d:o.d});});
  return out;}
function rcVoidPatch(it,l,vq,vp,later,done){ // ต้นทุนหลังยกเลิกของวัตถุดิบหนึ่งตัว → {patch, fixes} · later=null = อ่านใบหลังจากนั้นไม่ได้ → ถอดน้ำหนักจากถัวเฉลี่ยปัจจุบัน
  const qtyNow=done?num(it.qty)+vq:num(it.qty);   // ยอดที่ยังรวมใบที่กำลังยกเลิก
  const res=costAfterVoid({qty:qtyNow,avg_cost:it.avg_cost},{avg:l.prev_avg,last:l.prev_last,last_at:l.prev_last_at},vq,vp,later);
  const p={avg_cost:res.avg};if(!res.unknown){p.last_price=res.last;p.last_price_at=res.last_at;}
  return {patch:p,fixes:res.fixes||[]};}
async function rcFixLater(iid,fixes){ // ใบหลัง ๆ ของวัตถุดิบนี้จดค่าก่อนรับใหม่ (เหมือนใบที่ยกเลิกไม่เคยมี) · fail-soft
  for(const f of fixes){try{await sb.from('kc_receipt_lines').update({prev_qty:f.prev_qty,prev_avg:f.prev_avg,prev_last:f.prev_last,prev_last_at:f.prev_last_at}).eq('receipt_id',f.L.receipt_id).eq('item_id',iid);}catch(e){}}}
async function rcVoid(id){await once(async()=>{
  let r=null,lines=[];
  try{r=await db(()=>sb.from('kc_receipts').select('*').eq('id',id).maybeSingle());if(r)lines=await db(()=>sb.from('kc_receipt_lines').select('*').eq('receipt_id',id).order('sort'));}catch(e){return;}
  if(!r){toast(t('rc_voided_gone'));return;}
  if(r.d!==bizTodayISO()){toast(t('rc_void_today'),true);return;}
  if(!(await confirm2(t('rc_void_q',{s:r.sup_name||'',b:r.bill_no?'#'+r.bill_no:'',n:lines.length}),{danger:true})))return;
  const itemIds=[...new Set(lines.map(l=>l.item_id).filter(Boolean))];
  await refreshRows('item',itemIds);
  let na=false;   // บรรทัดไม่มีช่อง prev_* (ตารางรุ่นเก่า) = คืนสต๊อกอย่างเดียว เตือนว่าต้นทุนไม่ย้อน
  try{
    const done=await voidDone('kc_receipts',id);   // รอบก่อนคืนสต๊อกแล้วแต่ลบใบไม่สำเร็จ = ไม่คืนซ้ำ
    let later=null;try{later=await rcLaterLines(r,itemIds);}catch(e){later=null;}
    /* ต้นทุนหลังยกเลิก: ไม่มีใบหลังจากนั้น = คืนค่าที่จดไว้ก่อนรับ · มี = เล่นซ้ำด้วยใบที่เหลือ (ไม่ลบผลของใบที่มาทีหลัง) */
    const agg={};lines.forEach(l=>{const a=agg[l.item_id]=agg[l.item_id]||{q:0,v:0,l};a.q+=num(l.qty_base);a.v+=num(l.price_total);});
    const patches={},fixes={};
    for(const iid of Object.keys(agg)){const it=itemById(iid);if(!it)continue;const l=agg[iid].l;
      if(!('prev_avg' in l)){na=true;continue;}
      const r2=rcVoidPatch(it,l,agg[iid].q,agg[iid].q>0?agg[iid].v/agg[iid].q:0,later?(later[iid]||[]):null,done);patches[iid]=r2.patch;fixes[iid]=r2.fixes;}
    if(!done)await pushMoves(lines.map(l=>({d:bizTodayISO(),kind:'adjust',ref_kind:'item',ref_id:l.item_id,qty:-num(l.qty_base),cost:-num(l.price_total),ref_table:'kc_receipts',ref_id2:id,note:t('rc_void_note')+(r.bill_no?' #'+r.bill_no:'')})));
    for(const iid of Object.keys(patches)){const it=itemById(iid);await db(()=>sb.from('ck_items').update(patches[iid]).eq('id',iid));Object.assign(it,patches[iid]);await rcFixLater(iid,fixes[iid]);}
    await db(()=>sb.from('kc_receipt_lines').delete().eq('receipt_id',id));
    await db(()=>sb.from('kc_receipts').delete().eq('id',id));
    if(r.po_id){try{await db(()=>sb.from('kc_pos').update({status:'sent'}).eq('id',r.po_id));}catch(e){}}
  }catch(e){return;}
  closeModal();toast(na?t('rc_prev_na'):t('rc_void_ok'),na?'warn':false);if(S.tab==='recv')rerender();});}
