/* ============================================================
   🥬 วัตถุดิบ — items (it*)
   รายการ (การ์ดรูป · สต๊อก · ต้นทุนถัวเฉลี่ย · ราคารับล่าสุด · ขั้นต่ำ) + ฟอร์ม (ชื่อ หมวด หน่วยหลัก หน่วยซื้อ+ขนาด
   บรรจุอื่น หน่วยนับ ร้านค้า ขั้นต่ำ รูป) + 🗄️ ไม่ใช้แล้ว + 📉 ราคาที่เคยรับจริง
   กติกาเจ้าของ: ราคาวัตถุดิบไม่กรอกเอง — มาจากการรับของจริงทุกครั้ง (avg_cost / last_price) · สูตร/วิธีทำคงเดิม
   ร่างฟอร์มเก็บ localStorage (jjck_it_draft) — ลากหน้าลงรีเฟรชแล้วไม่หาย
   ============================================================ */
I18N.add({
th:{it_new:'เพิ่มวัตถุดิบ',it_edit:'แก้วัตถุดิบ',it_n:'{n} รายการ',it_none:'ยังไม่มีวัตถุดิบ — กด ➕ เพิ่มวัตถุดิบ',it_no_match:'ไม่พบวัตถุดิบที่ค้นหา',it_lock:'🔒 เปลี่ยนหน่วยหลักไม่ได้ — {why} (ยอด/ต้นทุน/สูตรเก็บเป็นหน่วยนี้)',it_lock_stock:'ยังมีสต๊อก {q} {u} — ปรับเป็น 0 ก่อน',it_lock_recipe:'ใช้อยู่ในสูตรเมนู',it_lock_hist:'มีประวัติรับ/ใช้แล้ว',
  it_off_chip:'ไม่ใช้แล้ว',it_off_none:'ไม่มีรายการที่ไม่ใช้แล้ว',it_off_view:'รายการที่ไม่ใช้แล้ว — กด "↩️ ใช้ต่อ" เพื่อเอากลับมา',it_restore:'↩️ ใช้ต่อ',it_off_btn:'🗄️ ไม่ใช้แล้ว',
  it_off_q:'ซ่อน "{n}" เพราะไม่ใช้แล้ว?\nจะไม่ขึ้นในหน้านับของ สั่งของ และรับของ — ประวัติยังอยู่ กด "↩️ ใช้ต่อ" ได้ทุกเมื่อ',
  it_off_in_use:'⚠️ ยังอยู่ในสูตรเมนู: {list}',it_off_stock:'📦 ยังมีของเหลือ {q} {u}',it_off_done:'ซ่อนแล้ว 🗄️',it_restored:'กลับมาใช้แล้ว ✅',
  it_name:'ชื่อ (ภาษาไทย — ระบบแปลให้อัตโนมัติ)',it_cat:'หมวด',it_cat_new:'＋ หมวดใหม่',it_cat_new_ph:'ชื่อหมวดใหม่',it_unit:'หน่วยหลัก (ใช้นับสต๊อก/คิดต้นทุน)',
  it_buy:'หน่วยที่ซื้อ',it_buy_hint:'เวลารับของ ระบบจะเติมขนาดนี้ให้ก่อน แก้ได้',it_buy_eq:'1 {u} =',it_packs:'ขนาดบรรจุอื่น ๆ',it_pack_hint:'ใช้ตอนรับของ เช่น 1 ถุง = 1,000 กรัม · 1 ชุด = 10 กก.',
  it_pack_add:'＋ เพิ่มขนาดบรรจุ',it_pack_bad:'ขนาดบรรจุต้องเลือกหน่วย ใส่ขนาดมากกว่า 0 และไม่ซ้ำกับหน่วยหลัก/หน่วยที่ซื้อ',it_buy_bad:'ขนาดของหน่วยที่ซื้อต้องมากกว่า 0',
  it_cu:'หน่วยที่ใช้นับสต๊อก',it_cu_auto:'อัตโนมัติ ({u})',it_cu_hint:'เช่น น้ำปลา นับเป็นขวด · ระบบแปลงเป็นหน่วยหลักให้เอง',
  it_sup:'ร้านค้าที่ซื้อ',it_sup_none:'— ยังไม่ระบุร้าน —',it_sup_new:'＋ ร้านใหม่',it_sup_new_ph:'ชื่อร้านใหม่',it_max_need:'ช่อง Max ยังใช้ไม่ได้ — ต้องรัน SQL รุ่นล่าสุดก่อน (⚙️ ตั้งค่า → 🗄️ คัดลอก SQL → วางใน Supabase) แล้วกด ⟳',it_max:'สั่งเติมให้ถึง (Max)',it_lim_t:'ขั้นต่ำ (Safety) / Max',it_lim_u:'หน่วย',it_lim_h:'ของเหลือต่ำกว่าขั้นต่ำ → หน้า 🛒 สั่งของ แนะนำให้สั่งเติมจนถึง Max (ปัดขึ้นเป็นหน่วยซื้อเต็ม เหลือดีกว่าขาด) · ไม่ใส่ Max = เติมแค่ถึงขั้นต่ำ · ไม่ใส่ขั้นต่ำ = ต่ำกว่า Max ก็สั่ง',it_lim_bad:'เลือกหน่วยของขั้นต่ำ/Max ใหม่ — หน่วยนี้แปลงเป็นหน่วยหลักไม่ได้',it_lim_order:'Max ต้องไม่น้อยกว่าขั้นต่ำ',it_max_sql:'บันทึกแล้ว แต่ Max ยังไม่ถูกบันทึก — ต้องรัน SQL รุ่นล่าสุดก่อน (⚙️ ตั้งค่า → 🗄️)',it_min:'ขั้นต่ำ (Safety)',it_min_s:'ขั้นต่ำ',it_lead:'รอของกี่วัน',
  it_cost_t:'ต้นทุน (จากการรับของจริง)',it_cost_avg:'ถัวเฉลี่ย',it_last:'รับล่าสุด',it_cost_legacy:'ราคาเดิม (ก่อนมีระบบรับของ)',it_cost_none:'ยังไม่เคยรับของ — ต้นทุนจะมาเองเมื่อรับของครั้งแรก',
  it_hist:'📉 ราคาที่เคยรับ',it_hist_t:'ราคาที่เคยรับจริง',it_hist_none:'ยังไม่มีประวัติการรับของ',it_hist_pack:'บรรจุ',
  it_dup:'มีวัตถุดิบชื่อนี้อยู่แล้ว',it_del:'🗑 ลบถาวร',it_del_q:'ลบ "{n}" ถาวร?\nใช้เฉพาะรายการที่เพิ่มผิด — ถ้าเลิกใช้ให้กด "ไม่ใช้แล้ว" แทน',
  it_draft:'📝 กู้ร่างที่ค้างไว้ให้แล้ว',it_draft_drop:'ทิ้งร่าง',it_photo:'📷 ใส่รูป / เปลี่ยนรูป',it_stock:'ในสต๊อก',it_per:'ต่อ',it_pack_used:'🔒 เอาหน่วย {u} ออกไม่ได้ — สูตรยังใช้อยู่: {list} (แก้หน่วยในสูตรที่ 📖 เมนู/สูตร ก่อน)',it_pack_inuse:'🔒 สูตรใช้หน่วย: {list}',it_pack_std:'1 {u} = {q} {b} อยู่แล้ว (ตัวแปลงมาตรฐาน) — ไม่ต้องตั้ง หรือตั้งให้ตรง'},
en:{it_new:'Add ingredient',it_edit:'Edit ingredient',it_n:'{n} items',it_none:'No ingredients yet — tap ➕ Add ingredient',it_no_match:'No ingredient matches',it_lock:'🔒 Base unit cannot change — {why} (stock, costs and recipes are stored in it)',it_lock_stock:'still {q} {u} in stock — set it to 0 first',it_lock_recipe:'used in recipes',it_lock_hist:'has receive/use history',
  it_off_chip:'No longer used',it_off_none:'Nothing hidden',it_off_view:'No longer used — tap "↩️ Use again" to bring one back',it_restore:'↩️ Use again',it_off_btn:'🗄️ No longer used',
  it_off_q:'Hide "{n}" as no longer used?\nIt will not show in counting, ordering or receiving — history stays, tap "↩️ Use again" any time',
  it_off_in_use:'⚠️ Still in recipes: {list}',it_off_stock:'📦 Still in stock {q} {u}',it_off_done:'Hidden 🗄️',it_restored:'Back in use ✅',
  it_name:'Name (in Thai — translated automatically)',it_cat:'Category',it_cat_new:'＋ New category',it_cat_new_ph:'New category name',it_unit:'Base unit (stock & cost)',
  it_buy:'Buying unit',it_buy_hint:'Prefilled when receiving — can be changed',it_buy_eq:'1 {u} =',it_packs:'Other pack sizes',it_pack_hint:'Used when receiving, e.g. 1 bag = 1,000 g · 1 set = 10 kg',
  it_pack_add:'＋ Add pack size',it_pack_bad:'Pack sizes need a unit and a size above 0, and must differ from the base/buying unit',it_buy_bad:'Buying unit size must be above 0',
  it_cu:'Counting unit',it_cu_auto:'Automatic ({u})',it_cu_hint:'e.g. fish sauce counted in bottles · converted to the base unit automatically',
  it_sup:'Supplier',it_sup_none:'— no supplier —',it_sup_new:'＋ New supplier',it_sup_new_ph:'New supplier name',it_max_need:'Max is not available yet — run the latest SQL first (⚙️ Settings → 🗄️ copy SQL → paste in Supabase), then tap ⟳',it_max:'Top up to (Max)',it_lim_t:'Minimum (Safety) / Max',it_lim_u:'Unit',it_lim_h:'Below the minimum → 🛒 Ordering suggests topping up to Max (rounded up to whole buying packs — better extra than short) · no Max = only up to the minimum · no minimum = order whenever below Max',it_lim_bad:'Pick the minimum/Max unit again — it cannot be converted to the base unit',it_lim_order:'Max cannot be less than the minimum',it_max_sql:'Saved, but Max was not — run the latest SQL first (⚙️ Settings → 🗄️)',it_min:'Minimum (Safety)',it_min_s:'min',it_lead:'Lead time (days)',
  it_cost_t:'Cost (from actual receipts)',it_cost_avg:'Average',it_last:'Last received',it_cost_legacy:'Old price (before receiving existed)',it_cost_none:'Never received yet — cost appears after the first receipt',
  it_hist:'📉 Received prices',it_hist_t:'Actual received prices',it_hist_none:'No receipts yet',it_hist_pack:'Pack',
  it_dup:'An ingredient with this name already exists',it_del:'🗑 Delete',it_del_q:'Delete "{n}" permanently?\nOnly for mistakes — if it is no longer used, tap "No longer used" instead',
  it_draft:'📝 Unsaved draft restored',it_draft_drop:'Discard draft',it_photo:'📷 Add / change photo',it_stock:'In stock',it_per:'per',it_pack_used:'🔒 Unit {u} cannot be removed — recipes still use it: {list} (change the recipe unit in 📖 Menus first)',it_pack_inuse:'🔒 Recipes use: {list}',it_pack_std:'1 {u} = {q} {b} already (standard conversion) — leave it out or match it'},
lo:{it_new:'ເພີ່ມວັດຖຸດິບ',it_edit:'ແກ້ວັດຖຸດິບ',it_n:'{n} ລາຍການ',it_none:'ຍັງບໍ່ມີວັດຖຸດິບ — ກົດ ➕ ເພີ່ມວັດຖຸດິບ',it_no_match:'ບໍ່ພົບວັດຖຸດິບທີ່ຄົ້ນຫາ',it_lock:'🔒 ປ່ຽນຫົວໜ່ວຍຫຼັກບໍ່ໄດ້ — {why} (ຍອດ/ຕົ້ນທຶນ/ສູດເກັບເປັນຫົວໜ່ວຍນີ້)',it_lock_stock:'ຍັງມີສະຕັອກ {q} {u} — ປັບເປັນ 0 ກ່ອນ',it_lock_recipe:'ໃຊ້ຢູ່ໃນສູດເມນູ',it_lock_hist:'ມີປະຫວັດຮັບ/ໃຊ້ແລ້ວ',
  it_off_chip:'ບໍ່ໃຊ້ແລ້ວ',it_off_none:'ບໍ່ມີລາຍການທີ່ບໍ່ໃຊ້ແລ້ວ',it_off_view:'ລາຍການທີ່ບໍ່ໃຊ້ແລ້ວ — ກົດ "↩️ ໃຊ້ຕໍ່" ເພື່ອເອົາກັບມາ',it_restore:'↩️ ໃຊ້ຕໍ່',it_off_btn:'🗄️ ບໍ່ໃຊ້ແລ້ວ',
  it_off_q:'ເຊື່ອງ "{n}" ເພາະບໍ່ໃຊ້ແລ້ວ?\nຈະບໍ່ຂຶ້ນໃນໜ້ານັບເຄື່ອງ ສັ່ງເຄື່ອງ ແລະ ຮັບເຄື່ອງ — ປະຫວັດຍັງຢູ່ ກົດ "↩️ ໃຊ້ຕໍ່" ໄດ້ທຸກເມື່ອ',
  it_off_in_use:'⚠️ ຍັງຢູ່ໃນສູດເມນູ: {list}',it_off_stock:'📦 ຍັງມີເຄື່ອງເຫຼືອ {q} {u}',it_off_done:'ເຊື່ອງແລ້ວ 🗄️',it_restored:'ກັບມາໃຊ້ແລ້ວ ✅',
  it_name:'ຊື່ (ພາສາໄທ — ລະບົບແປໃຫ້ອັດຕະໂນມັດ)',it_cat:'ໝວດ',it_cat_new:'＋ ໝວດໃໝ່',it_cat_new_ph:'ຊື່ໝວດໃໝ່',it_unit:'ຫົວໜ່ວຍຫຼັກ (ນັບສະຕັອກ/ຄິດຕົ້ນທຶນ)',
  it_buy:'ຫົວໜ່ວຍທີ່ຊື້',it_buy_hint:'ເວລາຮັບເຄື່ອງ ລະບົບຈະຕື່ມຂະໜາດນີ້ໃຫ້ກ່ອນ ແກ້ໄດ້',it_buy_eq:'1 {u} =',it_packs:'ຂະໜາດບັນຈຸອື່ນໆ',it_pack_hint:'ໃຊ້ຕອນຮັບເຄື່ອງ ເຊັ່ນ 1 ຖົງ = 1,000 ກຣາມ · 1 ຊຸດ = 10 ກກ.',
  it_pack_add:'＋ ເພີ່ມຂະໜາດບັນຈຸ',it_pack_bad:'ຂະໜາດບັນຈຸຕ້ອງເລືອກຫົວໜ່ວຍ ໃສ່ຂະໜາດຫຼາຍກວ່າ 0 ແລະ ບໍ່ຊ້ຳກັບຫົວໜ່ວຍຫຼັກ/ຫົວໜ່ວຍທີ່ຊື້',it_buy_bad:'ຂະໜາດຂອງຫົວໜ່ວຍທີ່ຊື້ຕ້ອງຫຼາຍກວ່າ 0',
  it_cu:'ຫົວໜ່ວຍທີ່ໃຊ້ນັບສະຕັອກ',it_cu_auto:'ອັດຕະໂນມັດ ({u})',it_cu_hint:'ເຊັ່ນ ນ້ຳປາ ນັບເປັນແກ້ວ · ລະບົບແປງເປັນຫົວໜ່ວຍຫຼັກໃຫ້ເອງ',
  it_sup:'ຮ້ານຄ້າທີ່ຊື້',it_sup_none:'— ຍັງບໍ່ລະບຸຮ້ານ —',it_sup_new:'＋ ຮ້ານໃໝ່',it_sup_new_ph:'ຊື່ຮ້ານໃໝ່',it_max_need:'ຊ່ອງ Max ຍັງໃຊ້ບໍ່ໄດ້ — ຕ້ອງແລ່ນ SQL ລຸ້ນລ່າສຸດກ່ອນ (⚙️ ຕັ້ງຄ່າ → 🗄️) ແລ້ວກົດ ⟳',it_max:'ສັ່ງເຕີມໃຫ້ຮອດ (Max)',it_lim_t:'ຂັ້ນຕ່ຳ (Safety) / Max',it_lim_u:'ຫົວໜ່ວຍ',it_lim_h:'ເຫຼືອຕ່ຳກວ່າຂັ້ນຕ່ຳ → ໜ້າ 🛒 ສັ່ງເຄື່ອງ ແນະນຳໃຫ້ສັ່ງເຕີມຈົນຮອດ Max (ປັດຂຶ້ນເປັນຫົວໜ່ວຍຊື້ເຕັມ ເຫຼືອດີກວ່າຂາດ) · ບໍ່ໃສ່ Max = ເຕີມແຄ່ຮອດຂັ້ນຕ່ຳ · ບໍ່ໃສ່ຂັ້ນຕ່ຳ = ຕ່ຳກວ່າ Max ກໍສັ່ງ',it_lim_bad:'ເລືອກຫົວໜ່ວຍຂອງຂັ້ນຕ່ຳ/Max ໃໝ່ — ແປງເປັນຫົວໜ່ວຍຫຼັກບໍ່ໄດ້',it_lim_order:'Max ຕ້ອງບໍ່ໜ້ອຍກວ່າຂັ້ນຕ່ຳ',it_max_sql:'ບັນທຶກແລ້ວ ແຕ່ Max ຍັງບໍ່ຖືກບັນທຶກ — ຕ້ອງແລ່ນ SQL ລຸ້ນລ່າສຸດກ່ອນ (⚙️ ຕັ້ງຄ່າ → 🗄️)',it_min:'ຂັ້ນຕ່ຳ (Safety)',it_min_s:'ຂັ້ນຕ່ຳ',it_lead:'ລໍຖ້າເຄື່ອງຈັກມື້',
  it_cost_t:'ຕົ້ນທຶນ (ຈາກການຮັບເຄື່ອງຈິງ)',it_cost_avg:'ສະເລ່ຍ',it_last:'ຮັບລ່າສຸດ',it_cost_legacy:'ລາຄາເກົ່າ (ກ່ອນມີລະບົບຮັບເຄື່ອງ)',it_cost_none:'ຍັງບໍ່ເຄີຍຮັບເຄື່ອງ — ຕົ້ນທຶນຈະມາເອງເມື່ອຮັບເຄື່ອງຄັ້ງທຳອິດ',
  it_hist:'📉 ລາຄາທີ່ເຄີຍຮັບ',it_hist_t:'ລາຄາທີ່ເຄີຍຮັບຈິງ',it_hist_none:'ຍັງບໍ່ມີປະຫວັດການຮັບເຄື່ອງ',it_hist_pack:'ບັນຈຸ',
  it_dup:'ມີວັດຖຸດິບຊື່ນີ້ຢູ່ແລ້ວ',it_del:'🗑 ລຶບຖາວອນ',it_del_q:'ລຶບ "{n}" ຖາວອນ?\nໃຊ້ສະເພາະລາຍການທີ່ເພີ່ມຜິດ — ຖ້າເລີກໃຊ້ໃຫ້ກົດ "ບໍ່ໃຊ້ແລ້ວ" ແທນ',
  it_draft:'📝 ກູ້ຮ່າງທີ່ຄ້າງໄວ້ໃຫ້ແລ້ວ',it_draft_drop:'ຖິ້ມຮ່າງ',it_photo:'📷 ໃສ່ຮູບ / ປ່ຽນຮູບ',it_stock:'ໃນສະຕັອກ',it_per:'ຕໍ່',it_pack_used:'🔒 ເອົາຫົວໜ່ວຍ {u} ອອກບໍ່ໄດ້ — ສູດຍັງໃຊ້ຢູ່: {list} (ແກ້ຫົວໜ່ວຍໃນສູດທີ່ 📖 ເມນູ/ສູດ ກ່ອນ)',it_pack_inuse:'🔒 ສູດໃຊ້ຫົວໜ່ວຍ: {list}',it_pack_std:'1 {u} = {q} {b} ຢູ່ແລ້ວ (ຕົວແປງມາດຕະຖານ) — ບໍ່ຕ້ອງຕັ້ງ ຫຼືຕັ້ງໃຫ້ຕົງ'},
my:{it_new:'ကုန်ကြမ်းထည့်ရန်',it_edit:'ကုန်ကြမ်းပြင်ရန်',it_n:'{n} မျိုး',it_none:'ကုန်ကြမ်း မရှိသေးပါ — ➕ ကုန်ကြမ်းထည့်ရန် ကိုနှိပ်ပါ',it_no_match:'ရှာသည့် ကုန်ကြမ်း မတွေ့ပါ',it_lock:'🔒 အခြေခံယူနစ် ပြောင်း၍မရ — {why} (လက်ကျန်/စရိတ်/နည်းများ ဤယူနစ်ဖြင့် သိမ်းထား)',it_lock_stock:'လက်ကျန် {q} {u} ရှိနေသေး — အရင် 0 ထားပါ',it_lock_recipe:'နည်းများတွင် သုံးနေသည်',it_lock_hist:'လက်ခံ/သုံးစွဲမှတ်တမ်း ရှိသည်',
  it_off_chip:'မသုံးတော့',it_off_none:'ဝှက်ထားသည့်အရာ မရှိ',it_off_view:'မသုံးတော့သည့်အရာများ — ပြန်ယူရန် "↩️ ပြန်သုံး" နှိပ်ပါ',it_restore:'↩️ ပြန်သုံး',it_off_btn:'🗄️ မသုံးတော့',
  it_off_q:'"{n}" ကို မသုံးတော့၍ ဝှက်မလား?\nရေတွက်၊ မှာယူ၊ လက်ခံ စာမျက်နှာများတွင် မပေါ်တော့ — မှတ်တမ်းကျန်သည် "↩️ ပြန်သုံး" ကို အချိန်မရွေး နှိပ်နိုင်',
  it_off_in_use:'⚠️ ဖော်မြူလာတွင် ရှိနေဆဲ: {list}',it_off_stock:'📦 လက်ကျန်ရှိနေဆဲ {q} {u}',it_off_done:'ဝှက်ပြီး 🗄️',it_restored:'ပြန်သုံးပြီ ✅',
  it_name:'အမည် (ထိုင်းဘာသာ — အလိုအလျောက် ဘာသာပြန်ပေးမည်)',it_cat:'အမျိုးအစား',it_cat_new:'＋ အမျိုးအစားအသစ်',it_cat_new_ph:'အမျိုးအစားအသစ် အမည်',it_unit:'အခြေခံယူနစ် (စတော့/ကုန်ကျစရိတ်)',
  it_buy:'ဝယ်သည့်ယူနစ်',it_buy_hint:'လက်ခံချိန်တွင် ဤအရွယ်ကို ကြိုဖြည့်ပေးမည် — ပြင်နိုင်သည်',it_buy_eq:'1 {u} =',it_packs:'အခြားထုပ်ပိုးအရွယ်များ',it_pack_hint:'လက်ခံချိန်တွင် သုံးသည် ဥပမာ 1 အိတ် = 1,000 ဂရမ် · 1 အစုံ = 10 ကီလို',
  it_pack_add:'＋ ထုပ်ပိုးအရွယ်ထည့်ရန်',it_pack_bad:'ယူနစ်ရွေးပြီး 0 ထက်ကြီးသော အရွယ်ထည့်ပါ၊ အခြေခံ/ဝယ်သည့်ယူနစ်နှင့် မတူရပါ',it_buy_bad:'ဝယ်သည့်ယူနစ်အရွယ်သည် 0 ထက်ကြီးရမည်',
  it_cu:'စတော့ရေတွက်ယူနစ်',it_cu_auto:'အလိုအလျောက် ({u})',it_cu_hint:'ဥပမာ ငံပြာရည်ကို ပုလင်းဖြင့်ရေတွက် · အခြေခံယူနစ်သို့ အလိုအလျောက် ပြောင်းပေးမည်',
  it_sup:'ဝယ်သည့်ဆိုင်',it_sup_none:'— ဆိုင် မသတ်မှတ်ရသေး —',it_sup_new:'＋ ဆိုင်အသစ်',it_sup_new_ph:'ဆိုင်အသစ် အမည်',it_max_need:'Max ကို မသုံးနိုင်သေး — နောက်ဆုံး SQL ကို အရင် run ပါ (⚙️ ဆက်တင် → 🗄️) ပြီးမှ ⟳ နှိပ်ပါ',it_max:'Max အထိ ဖြည့်',it_lim_t:'အနည်းဆုံး (Safety) / Max',it_lim_u:'ယူနစ်',it_lim_h:'အနည်းဆုံးအောက် ရောက်လျှင် → 🛒 မှာယူ စာမျက်နှာက Max အထိ ဖြည့်ရန် အကြံပြုသည် (ဝယ်ယူနစ် အပြည့်သို့ အပေါ်ဝိုင်း — ပိုတာက လိုတာထက် ကောင်း) · Max မထည့် = အနည်းဆုံးအထိသာ · အနည်းဆုံး မထည့် = Max အောက်ဆိုလျှင် မှာ',it_lim_bad:'အနည်းဆုံး/Max ယူနစ်ကို ပြန်ရွေးပါ — အခြေခံယူနစ်သို့ မပြောင်းနိုင်',it_lim_order:'Max သည် အနည်းဆုံးထက် မနည်းရ',it_max_sql:'သိမ်းပြီး၊ သို့သော် Max မသိမ်းရသေး — နောက်ဆုံး SQL ကို အရင် run ပါ (⚙️ ဆက်တင် → 🗄️)',it_min:'အနည်းဆုံး (Safety)',it_min_s:'အနည်းဆုံး',it_lead:'ပစ္စည်းရောက်ရန် ရက်',
  it_cost_t:'ကုန်ကျစရိတ် (အမှန်လက်ခံမှုမှ)',it_cost_avg:'ပျမ်းမျှ',it_last:'နောက်ဆုံးလက်ခံ',it_cost_legacy:'ဈေးဟောင်း (လက်ခံစနစ် မရှိမီ)',it_cost_none:'မလက်ခံရသေးပါ — ပထမဆုံးလက်ခံပြီးမှ ကုန်ကျစရိတ် ပေါ်မည်',
  it_hist:'📉 လက်ခံခဲ့သော ဈေးများ',it_hist_t:'အမှန်လက်ခံခဲ့သော ဈေးများ',it_hist_none:'လက်ခံမှတ်တမ်း မရှိသေးပါ',it_hist_pack:'ထုပ်ပိုး',
  it_dup:'ဤအမည်ဖြင့် ကုန်ကြမ်း ရှိပြီးသား',it_del:'🗑 အပြီးဖျက်',it_del_q:'"{n}" ကို အပြီးဖျက်မလား?\nမှားထည့်သည့်အရာအတွက်သာ — မသုံးတော့လျှင် "မသုံးတော့" ကို နှိပ်ပါ',
  it_draft:'📝 မသိမ်းရသေးသော မူကြမ်း ပြန်ရပြီ',it_draft_drop:'မူကြမ်းဖျက်',it_photo:'📷 ဓာတ်ပုံထည့် / ပြောင်း',it_stock:'လက်ကျန်',it_per:'တစ်',it_pack_used:'🔒 ယူနစ် {u} ကို ဖယ်၍မရ — နည်းများတွင် သုံးနေဆဲ: {list} (📖 မီနူး/နည်း တွင် အရင်ပြင်ပါ)',it_pack_inuse:'🔒 နည်းများသုံးသော ယူနစ်: {list}',it_pack_std:'1 {u} = {q} {b} ဖြစ်ပြီးသား (စံပြောင်းလဲမှု) — မထည့်ပါနှင့် သို့မဟုတ် ကိုက်ညီအောင်ထားပါ'}
});
CSS.add(`
.itlim{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr) minmax(0,1.1fr);gap:6px;align-items:end}.itlim label{display:flex;flex-direction:column;gap:2px;min-width:0}
.itlim input,.itlim select{width:100%;min-width:0}.itlim-to{padding-bottom:12px}
@media(max-width:340px){.itlim{grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)}.itlim label:last-child{grid-column:1/-1}}
.icard.itoff{opacity:.62}.icard.itoff .ithumb{filter:grayscale(1)}
.itform .mthumb.lg{width:72px;height:72px;font-size:32px;border-radius:14px}
.itpack{display:grid;grid-template-columns:auto minmax(0,1fr) auto minmax(0,1fr) auto auto;gap:6px;align-items:center;margin-bottom:6px}
.itpack select,.itpack input{min-height:44px}
.itpack .x{width:44px;height:44px;min-height:44px;border-radius:10px;border:1.5px solid var(--line);background:#fff;color:var(--mut);font-size:18px;padding:0}
@media(max-width:339px){.itpack{grid-template-columns:auto minmax(0,1fr) auto}.itpack .q2{grid-column:1/-1;display:flex;gap:6px;align-items:center}}
.itcost{background:#FBF6EA;border:1.5px solid #F0E8D6;border-radius:12px;padding:10px 12px;font-size:13.5px;margin-bottom:10px}
.itcost b{font-family:var(--fh);font-size:16px}
.itdraft{display:flex;align-items:center;gap:8px;background:var(--gold-t);border:1.5px solid #E9D9A8;border-radius:12px;padding:8px 12px;margin-bottom:10px;font-size:13px}
.itdraft button{margin-left:auto;min-height:36px}
.itacts{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}.itacts .btn.big{flex:1;min-width:140px}
`);
let IT_CAT=String(LS.get('jjck_itcat','')||'');   // '' ทั้งหมด · ชื่อหมวด · '__off' ไม่ใช้แล้ว
let IT_Q='';
let IT_D=null;                                     // ร่างฟอร์ม
const IT_DRAFT='jjck_it_draft',IT_DRAFT_MS=12*3600*1000;
const IT_IC={'เนื้อสัตว์':'🥩','ผัก':'🥬','ของแห้ง':'🌾','เครื่องปรุง':'🧂','บรรจุภัณฑ์':'📦','อื่นๆ':'🧺'};
const itIcon=it=>IT_IC[(it&&it.cat)||'']||'🥬';
const itLow=it=>it.min_qty!=null&&num(it.qty)<num(it.min_qty);
const itMoney=c=>'฿'+fmtQ(c);
function itLimTxt(it){const a=[];if(it.min_qty!=null)a.push(t('it_min_s')+' '+qtyTxt(it,it.min_qty));if(num(it.max_qty)>0)a.push('Max '+qtyTxt(it,it.max_qty));return a.join(' · ');}   // แสดงเป็นหน่วยนับ
function itCats(){const c=ITEM_CATS.slice();S.items.forEach(i=>{const x=String(i.cat||'').trim();if(x&&!c.includes(x))c.push(x);});return c;}
function itOffN(){return S.items.filter(i=>i.active===false).length;}
function itUsedIn(id){return activeRecipes().filter(r=>(S.boms[r.id]||[]).some(l=>l.item_id===id));}

/* ---------- รายการ ---------- */
RENDER.items=function(el){
  const K=canKitchen(),act=activeItems(),nOff=itOffN();
  if(IT_CAT==='__off'&&!nOff)IT_CAT='';
  const cats=itCats().filter(c=>act.some(i=>(i.cat||'อื่นๆ')===c));
  if(IT_CAT&&IT_CAT!=='__off'&&!cats.includes(IT_CAT))IT_CAT='';
  const pills=[{k:'',lb:t('all'),n:act.length}].concat(cats.map(c=>({k:c,lb:(IT_IC[c]||'🧺')+' '+trCat(c),n:act.filter(i=>(i.cat||'อื่นๆ')===c).length})));
  if(nOff)pills.push({k:'__off',lb:'🗄️ '+t('it_off_chip'),n:nOff});
  let h=dhead('🥬 '+t('nav_items'),esc(t('it_n',{n:act.length})))+sqlNeedBox();
  if(K)h+='<div class="row" style="margin-bottom:10px"><button class="btn" onclick="itEdit()">➕ '+esc(t('it_new'))+'</button>'+
    '<button class="btn gh" onclick="show(\'sups\')">🏷️ '+esc(t('nav_sups'))+'</button></div>';
  h+=pillBar(pills,IT_CAT,k=>itSetCat(k),{scroll:1});   // closure — string handler + Thai key would break the onclick quotes (callOf uses JSON.stringify)
  if(IT_CAT==='__off')h+='<div class="hintbox">🗄️ '+esc(t('it_off_view'))+'</div>';
  h+=searchBox('itQ','itSearch')+'<div id="itGrid" class="igrid"></div>';
  el.innerHTML=h;const q=document.getElementById('itQ');if(q)q.value=IT_Q;itPaintGrid();
};
function itSetCat(k){IT_CAT=k||'';LS.set('jjck_itcat',IT_CAT);show('items');}
function itSearch(v){IT_Q=v||'';itPaintGrid();}
function itPaintGrid(){
  const box=document.getElementById('itGrid');if(!box)return;
  const off=IT_CAT==='__off',q=supKey(IT_Q),K=canKitchen();
  const list=S.items.filter(i=>(off?i.active===false:(i.active!==false&&(!IT_CAT||(i.cat||'อื่นๆ')===IT_CAT)))&&
    (!q||supKey(i.name).includes(q)||supKey(dispName(i)).includes(q)||supKey(i.sup).includes(q)));
  if(!list.length){box.innerHTML='<div class="empty" style="grid-column:1/-1">'+esc(t(off?'it_off_none':(q?'it_no_match':'it_none')))+'</div>';return;}
  box.innerHTML=list.map(it=>itCardHtml(it,off,K)).join('');
}
function itCardHtml(it,off,K){
  const low=!off&&itLow(it),c=itemCost(it);
  return '<div class="icard'+(low?' low':'')+(off?' itoff':'')+(K?' tap':'')+'" data-id="'+esc(it.id)+'"'+(K?' onclick="itEdit(this.dataset.id)"':'')+'>'+
    thumbHtml(it,itIcon(it),'ithumb')+
    '<div class="iname">'+esc(dispName(it))+'</div>'+
    '<div class="isub">'+(c!=null?'💰 '+esc(itMoney(c))+'/'+esc(trUnit(it.unit)):'<span class="amber">'+esc(t('no_price'))+'</span>')+
      (it.last_price!=null&&num(it.last_price)>0?' · '+esc(t('it_last'))+' '+esc(itMoney(it.last_price)):'')+'</div>'+
    '<div class="row" style="justify-content:space-between"><span class="chip '+(low?'bad':'ok')+'">'+(low?'⚠ ':'')+fmtQ(it.qty)+' '+esc(trUnit(it.unit))+'</span>'+
      (it.min_qty!=null||num(it.max_qty)>0?'<span class="xs mut">'+esc(itLimTxt(it))+'</span>':'')+'</div>'+
    (it.sup?'<div class="xs mut">🏷️ '+esc(it.sup)+'</div>':'')+
    (off&&K?'<button class="btn sm2 gh" data-id="'+esc(it.id)+'" onclick="event.stopPropagation();itOff(this.dataset.id,true)">'+esc(t('it_restore'))+'</button>':'')+'</div>';}

/* ---------- ฟอร์ม ---------- */
function itDraftFrom(it){
  if(it)return {id:it.id,name:it.name||'',cat:it.cat||'อื่นๆ',unit:it.unit||'กก.',buy_unit:it.buy_unit||'',buy_qty:it.buy_qty==null?'':it.buy_qty,
    packs:(Array.isArray(it.packs)?it.packs:[]).filter(p=>p&&p.u).map(p=>({u:String(p.u),q:p.q==null?'':p.q})),count_unit:it.count_unit||'',sup:it.sup||'',
    lim_u:limUnits(it)[0]||it.unit,min_in:itLimIn(it,it.min_qty),max_in:itLimIn(it,it.max_qty),lead_days:it.lead_days==null?'':it.lead_days,image_url:it.image_url||null,active:it.active!==false,cat_new:'',sup_new:'',restored:false};
  return {id:null,name:'',cat:(IT_CAT&&IT_CAT!=='__off')?IT_CAT:'อื่นๆ',unit:'กก.',buy_unit:'',buy_qty:'',packs:[],count_unit:'',sup:'',lim_u:'',min_in:'',max_in:'',lead_days:'',image_url:null,active:true,cat_new:'',sup_new:'',restored:false};}
function itLimIn(it,q){if(q==null||q==='')return '';const u=limUnits(it)[0]||it.unit,v=qtyIn(it,q,u);return v==null?num(q):v;}   // หน่วยหลัก → หน่วยแรกของ limUnits (หน่วยนับ)
function itDraftRead(id){const d=LS.get(IT_DRAFT,null);if(!d||typeof d!=='object'||!(Date.now()-num(d._t)<IT_DRAFT_MS))return null;
  return String(d.id||'')===String(id||'')?d:null;}
function itDraftSave(){if(!IT_D)return;clearTimeout(itDraftSave._t);itDraftSave._t=setTimeout(()=>{if(IT_D)LS.set(IT_DRAFT,Object.assign({},IT_D,{_t:Date.now()}));},150);}
function itDraftClear(){clearTimeout(itDraftSave._t);LS.del(IT_DRAFT);}
function itEdit(id,opt){ // opt:{sup} = เปิดจากหน้าร้านค้า (ตั้งร้านให้ + ปิดแล้วกลับหน้าร้าน)
  if(!canKitchen())return;opt=opt||{};
  const it=id?itemById(id):null;if(id&&!it)return;
  const dr=itDraftRead(id);
  IT_D=dr?Object.assign(itDraftFrom(it),dr,{restored:true}):itDraftFrom(it);
  delete IT_D._hist;   // ร่างเก่าอาจจำสถานะประวัติไว้ — ถามสมุดสต๊อกใหม่ทุกครั้งที่เปิดฟอร์ม
  if(it&&IT_D.unit!==it.unit&&itLockWhy(IT_D))IT_D.unit=it.unit;
  if(opt.sup&&!IT_D.sup)IT_D.sup=opt.sup;
  IT_D._back=opt.back||null;
  itPaintForm();itHistCheck(IT_D);
}
function itLockWhy(d){ // เปลี่ยนหน่วยหลักไม่ได้เมื่อ: มีสต๊อก · อยู่ในสูตร · มีประวัติ — ยอด/ต้นทุน/สูตรเก็บเป็นหน่วยหลัก เปลี่ยนแล้วความหมายเพี้ยน (ตรวจอิสระ 2026-10-16)
  if(!d||!d.id)return '';const it=itemById(d.id);if(!it)return '';
  if(Math.abs(num(it.qty))>1e-9)return t('it_lock_stock',{q:fmtQ(it.qty),u:trUnit(it.unit)});
  if((S.recipeItems||[]).some(x=>x.item_id===d.id))return t('it_lock_recipe');
  if(d._hist)return t('it_lock_hist');return '';}
async function itHistCheck(d){ // มีการเคลื่อนไหวในสมุดสต๊อกไหม (อ่านทีหลัง · fail-soft)
  if(!d||!d.id||d._hist!=null)return;let has=false;
  try{const r=await sb.from('kc_moves').select('id').eq('ref_kind','item').eq('ref_id',d.id).limit(1);has=!!(r&&!r.error&&r.data&&r.data.length);}catch(e){}
  if(IT_D!==d)return;d._hist=has;const it=itemById(d.id);if(has&&it&&d.unit!==it.unit){d.unit=it.unit;itUnitsPaint();}
  const box=document.getElementById('itUnitFld');if(box)box.innerHTML=itUnitHtml();}
function itUnitHtml(){const d=IT_D,lock=itLockWhy(d);
  return '<select id="itUnit" onchange="itUnitChange(this.value)"'+(lock?' disabled':'')+'>'+unitOptions(allUnits(),d.unit)+'</select>'+(lock?'<div class="xs amber" style="margin-top:4px">'+esc(t('it_lock',{why:lock}))+'</div>':'');}
function itTmp(){const d=IT_D;return {unit:d.unit,buy_unit:d.buy_unit,buy_qty:num(d.buy_qty),packs:(d.packs||[]).map(p=>({u:p.u,q:num(p.q)})).filter(p=>p.u&&p.q>0)};}
function itRecipeUnits(id){ // หน่วย (ที่ไม่ใช่หน่วยหลัก) ที่สูตรเมนูใช้กับวัตถุดิบนี้ → [{u,names[]}]
  const it=itemById(id);if(!it)return [];const by={};
  (S.recipeItems||[]).forEach(x=>{if(x.item_id!==id||!x.unit||x.unit===it.unit)return;const r=recipeById(x.recipe_id);if(!r||r.deleted_at)return;
    (by[x.unit]=by[x.unit]||[]).push(dispName(r));});
  return Object.keys(by).map(u=>({u,names:[...new Set(by[u])]}));}
function itPackUsed(id,tmp){ // ขนาดบรรจุ/หน่วยซื้อที่กำลังจะบันทึก ทำให้หน่วยในสูตรแปลงไม่ได้ → {u,list} (ตรวจอิสระ 2026-10-16: ลบ ขวด แล้ว 🍳 คิดส่วนผสมเป็น 0 เงียบ ๆ)
  if(!id)return null;const bad=itRecipeUnits(id).filter(x=>unitFactor(tmp,x.u)==null);
  return bad.length?{u:bad[0].u,list:bad.map(x=>x.names.join(', ')).join(' · ')}:null;}
function itStdFill(i){ // เลือกหน่วยที่ตัวแปลงมาตรฐานรู้ขนาดอยู่แล้ว (กก.→กรัม = 1,000) = เติมขนาดให้เอง (เจ้าของถาม 2026-10-18 ซื้อ กก. ใช้ กรัม นับ ถุง)
  const d=IT_D;if(!d)return;const base=d.unit||'',u=i<0?d.buy_unit:(d.packs[i]||{}).u;if(!u)return;
  const f=unitConv(null,u,base);if(f==null)return;
  if(i<0)d.buy_qty=f;else d.packs[i].q=f;
  const a=document.getElementById('itPacks');if(a)a.innerHTML=itPacksHtml();}
function itStdBad(u,q,base){ // หน่วยที่ตัวแปลงมาตรฐานรู้จักอยู่แล้ว (กรัม/ขีด/กก./มล./ลิตร/โหล/ชิ้น) ตั้งขนาดต่างจากมาตรฐาน = ตัวเลขขัดกัน → ข้อความผิดพลาด หรือ ''
  const f=unitConv(null,u,base);if(f==null||Math.abs(f-num(q))<1e-9*Math.max(1,f))return '';
  return t('it_pack_std',{u:trUnit(u),q:fmtQ(f),b:trUnit(base)});}
function itPaintForm(){
  const d=IT_D;if(!d)return;
  const it=d.id?itemById(d.id):null;
  const cats=itCats(),sups=S.sups.filter(s=>s.active!==false).map(s=>s.name).sort((a,b)=>a.localeCompare(b,'th'));
  if(d.sup&&!sups.includes(d.sup))sups.push(d.sup);
  let h='<div class="itform"><h3>'+(d.id?'✎ '+esc(t('it_edit')):'➕ '+esc(t('it_new')))+'</h3>';
  if(d.restored)h+='<div class="itdraft">'+esc(t('it_draft'))+'<button class="btn gh sm2" onclick="itDraftDrop()">'+esc(t('it_draft_drop'))+'</button></div>';
  h+='<div class="row" style="margin-bottom:10px"><div id="itThumb">'+itThumbHtml()+'</div>'+
    '<button class="btn gh sm2" onclick="itPhoto()">'+esc(t('it_photo'))+'</button></div>'+
    fld(t('it_name'),'<input id="itName" value="'+esc(d.name)+'" oninput="IT_D.name=this.value;itDraftSave()">')+
    '<div class="grid2">'+fld(t('it_cat'),'<select id="itCat" onchange="itCatChange(this.value)">'+cats.map(c=>'<option value="'+esc(c)+'"'+(c===d.cat?' selected':'')+'>'+(IT_IC[c]||'🧺')+' '+esc(trCat(c))+'</option>').join('')+
        (cats.includes(d.cat)?'':'<option value="'+esc(d.cat)+'" selected>'+esc(d.cat)+'</option>')+'<option value="__new">'+esc(t('it_cat_new'))+'</option></select>'+
        '<input id="itCatNew" placeholder="'+esc(t('it_cat_new_ph'))+'" value="'+esc(d.cat_new)+'" style="margin-top:6px;display:'+(d.cat==='__new'?'':'none')+'" oninput="IT_D.cat_new=this.value;itDraftSave()">')+
      fld(t('it_sup'),'<select id="itSup" onchange="itSupChange(this.value)"><option value="">'+esc(t('it_sup_none'))+'</option>'+sups.map(s=>'<option value="'+esc(s)+'"'+(s===d.sup?' selected':'')+'>'+esc(s)+'</option>').join('')+
        '<option value="__new"'+(d.sup==='__new'?' selected':'')+'>'+esc(t('it_sup_new'))+'</option></select>'+
        '<input id="itSupNew" placeholder="'+esc(t('it_sup_new_ph'))+'" value="'+esc(d.sup_new)+'" style="margin-top:6px;display:'+(d.sup==='__new'?'':'none')+'" oninput="IT_D.sup_new=this.value;itDraftSave()">')+'</div>'+
    '<div class="grid2">'+fld(t('it_unit'),'<div id="itUnitFld">'+itUnitHtml()+'</div>')+
      fld(t('it_lead'),'<input id="itLead" type="text" inputmode="numeric" value="'+esc(d.lead_days)+'" oninput="IT_D.lead_days=this.value;itDraftSave()">')+'</div>'+
    '<div id="itPacks">'+itPacksHtml()+'</div>'+
    '<div id="itCU">'+itCuHtml()+'</div>'+
    '<div id="itLim">'+itLimHtml()+'</div>'+
    itCostHtml(it)+
    '<div class="itacts">'+(d.id?'<button class="btn gh" onclick="itOff(\''+esc(d.id)+'\','+(d.active?'false':'true')+')">'+esc(d.active?t('it_off_btn'):t('it_restore'))+'</button>'+
      (isAdminish()?'<button class="btn gh" onclick="itDel(\''+esc(d.id)+'\')">'+esc(t('it_del'))+'</button>':''):'')+
      '<button class="btn big" onclick="itSave()">💾 '+esc(t('save'))+'</button></div></div>';
  MODAL_BACK=null;openModal(h);
}
function itThumbHtml(){const d=IT_D,url=imgOk(d.image_url)?String(d.image_url):'';return '<div class="mthumb lg" '+(url?'data-url="'+esc(url)+'" onclick="zoomImg(this.dataset.url)"':'')+'>'+(url?'<img src="'+esc(url)+'">':itIcon({cat:d.cat==='__new'?'':d.cat}))+'</div>';}
function itPhoto(){const d=IT_D;if(!d)return;pickImage('item',d.id,url=>{if(!IT_D||!url)return;IT_D.image_url=url;itDraftSave();const b=document.getElementById('itThumb');if(b)b.innerHTML=itThumbHtml();if(S.tab==='items')itPaintGrid();});}
function itCatChange(v){const d=IT_D;if(!d)return;d.cat=v;const n=document.getElementById('itCatNew');if(n){n.style.display=v==='__new'?'':'none';if(v==='__new')n.focus();}itDraftSave();}
function itSupChange(v){const d=IT_D;if(!d)return;d.sup=v;const n=document.getElementById('itSupNew');if(n){n.style.display=v==='__new'?'':'none';if(v==='__new')n.focus();}itDraftSave();}
function itUnitChange(v){const d=IT_D;if(!d)return;
  const lock=itLockWhy(d);if(lock){toast(t('it_lock',{why:lock}),true);const sel=document.getElementById('itUnit');if(sel)sel.value=d.unit;return;}
  const f=unitConv(null,d.unit,v);   // ขนาดบรรจุเขียนเป็นหน่วยหลัก — เปลี่ยนหน่วยหลักแล้วแปลงตามถ้าแปลงได้ (กรัม↔กก.)
  if(f!=null){(d.packs||[]).forEach(p=>{if(num(p.q)>0)p.q=rnd4(num(p.q)*f);});if(num(d.buy_qty)>0)d.buy_qty=rnd4(num(d.buy_qty)*f);}
  d.unit=v;itDraftSave();itUnitsPaint();}
function itUnitsPaint(){const d=IT_D;if(!d)return;const a=document.getElementById('itPacks'),b=document.getElementById('itCU');
  if(a)a.innerHTML=itPacksHtml();if(b)b.innerHTML=itCuHtml();itLimPaint();}
function itPacksHtml(){
  const d=IT_D,base=d.unit||'',others=allUnits().filter(u=>u!==base);
  const row=(lbU,lbQ,u,q,onU,onQ,del)=>'<div class="itpack"><span class="b">1</span><select onchange="'+onU+'">'+(lbU?'<option value="">—</option>':'')+unitOptions(others,u)+'</select>'+
    '<span class="b">=</span><input type="text" inputmode="decimal" placeholder="?" value="'+esc(q)+'" oninput="'+onQ+'"><span class="b">'+esc(trUnit(base))+'</span>'+(del?'<button type="button" class="x" onclick="'+del+'">✕</button>':'<span></span>')+'</div>';
  let h='<div class="fld"><label>🛒 '+esc(t('it_buy'))+'</label>'+row(true,null,d.buy_unit,d.buy_qty,'IT_D.buy_unit=this.value;itStdFill(-1);itDraftSave();itCuPaint()','IT_D.buy_qty=this.value;itDraftSave();itCuPaint()',null)+
    '<div class="xs mut">'+esc(t('it_buy_hint'))+'</div></div>';
  const used=d.id?itRecipeUnits(d.id):[];
  h+='<div class="fld"><label>📏 '+esc(t('it_packs'))+'</label><div class="xs mut" style="margin-bottom:6px">'+esc(t('it_pack_hint'))+'</div>'+
    (d.packs||[]).map((p,i)=>row(true,null,p.u,p.q,'IT_D.packs['+i+'].u=this.value;itStdFill('+i+');itDraftSave();itCuPaint()','IT_D.packs['+i+'].q=this.value;itDraftSave();itCuPaint()','itPackDel('+i+')')).join('')+
    '<button type="button" class="btn gh sm2" onclick="itPackAdd()">'+esc(t('it_pack_add'))+'</button>'+
    (used.length?'<div class="xs amber" style="margin-top:6px">'+esc(t('it_pack_inuse',{list:used.map(x=>trUnit(x.u)+' ('+x.names.join(', ')+')').join(' · ')}))+'</div>':'')+'</div>';
  return h;}
function itPackAdd(){const d=IT_D;if(!d)return;(d.packs=d.packs||[]).push({u:'',q:''});itDraftSave();const a=document.getElementById('itPacks');if(a)a.innerHTML=itPacksHtml();}
function itPackDel(i){const d=IT_D;if(!d)return;(d.packs||[]).splice(i,1);itDraftSave();const a=document.getElementById('itPacks');if(a)a.innerHTML=itPacksHtml();itCuPaint();}
function itCuHtml(){const d=IT_D,tmp=itTmp();const list=unitList(tmp);
  return fld('📋 '+t('it_cu'),'<select id="itCuSel" onchange="IT_D.count_unit=this.value;itDraftSave()"><option value="">'+esc(t('it_cu_auto',{u:trUnit(countUnitOf(tmp))}))+'</option>'+
    list.map(u=>'<option value="'+esc(u)+'"'+(u===d.count_unit?' selected':'')+'>'+esc(trUnit(u))+'</option>').join('')+'</select><div class="xs mut">'+esc(t('it_cu_hint'))+'</div>');}
function itCuPaint(){const b=document.getElementById('itCU');if(b&&IT_D)b.innerHTML=itCuHtml();itLimPaint();}
/* 🎯 ขั้นต่ำ (Safety) + Max — ใส่เป็นหน่วยไหนก็ได้ของวัตถุดิบ (ถุง/ลัง/กรัม) · เก็บ min_qty/max_qty เป็นหน่วยหลัก (เจ้าของ 2026-10-19)
   🛒 สั่งของ: ต่ำกว่าขั้นต่ำ → สั่งเติมให้ถึง Max ปัดขึ้นเป็นหน่วยซื้อเต็ม (เหลือดีกว่าขาด) */
function itLimUnits(){const L=limUnits(itTmp());if(IT_D&&!L.includes(IT_D.lim_u))IT_D.lim_u=L[0]||IT_D.unit;return L;}
function itLimHtml(){const d=IT_D;if(!d)return '';const L=itLimUnits();
  const inp=(id,f)=>'<input id="'+id+'" type="text" inputmode="decimal" value="'+esc(d[f])+'" oninput="IT_D.'+f+'=this.value;itDraftSave();itLimEq()">';
  return '<div class="fld"><label>🎯 '+esc(t('it_lim_t'))+'</label><div class="xs mut" style="margin-bottom:6px">'+esc(t('it_lim_h'))+'</div>'+
    '<div class="itlim"><label><span class="xs">'+esc(t('it_min'))+'</span>'+inp('itMin','min_in')+'</label><span class="b itlim-to">→</span>'+
    '<label><span class="xs">'+esc(t('it_max'))+'</span>'+inp('itMax','max_in').replace('<input','<input'+(S.itMax===false?' disabled':''))+'</label>'+
    '<label><span class="xs">'+esc(t('it_lim_u'))+'</span><select id="itLimU" onchange="itLimU(this.value)">'+unitOptions(L,d.lim_u)+'</select></label></div>'+
    '<div class="xs mut" id="itLimEq">'+esc(itLimEqTxt())+'</div>'+(S.itMax===false?'<div class="hintbox" style="margin-top:6px">⚠ '+esc(t('it_max_need'))+'</div>':'')+'</div>';}
function itLimPaint(){const b=document.getElementById('itLim');if(b&&IT_D)b.innerHTML=itLimHtml();}
function itLimEqTxt(){ // "= 24,000 กรัม → 60,000 กรัม · 2 ลัง → 5 ลัง"
  const d=IT_D,tmp=itTmp(),f=unitFactor(tmp,d.lim_u);if(f==null)return '';
  const has=v=>String(v==null?'':v).trim()!=='',mn=has(d.min_in)?num(d.min_in)*f:null,mx=has(d.max_in)?num(d.max_in)*f:null;if(mn==null&&mx==null)return '';
  const one=(u,q)=>{const v=qtyIn(tmp,q,u);return v==null?'–':fmtQ(v);},pair=u=>(mn!=null?one(u,mn):'–')+(mx!=null?' → '+one(u,mx):'')+' '+trUnit(u);
  const out=[];if(d.lim_u!==tmp.unit)out.push(pair(tmp.unit));if(tmp.buy_unit&&tmp.buy_unit!==d.lim_u&&tmp.buy_unit!==tmp.unit)out.push(pair(tmp.buy_unit));
  return out.length?'= '+out.join(' · '):'';}
function itLimEq(){const e=document.getElementById('itLimEq');if(e)e.textContent=itLimEqTxt();}
function itLimU(u){const d=IT_D;if(!d)return;const tmp=itTmp(),fo=unitFactor(tmp,d.lim_u),fn=unitFactor(tmp,u);   // เปลี่ยนหน่วย = แปลงตัวเลขที่ใส่ไว้ตาม (24 ถุง → 2 ลัง)
  if(fo>0&&fn>0)['min_in','max_in'].forEach(k=>{if(String(d[k]==null?'':d[k]).trim()!=='')d[k]=rnd4(num(d[k])*fo/fn);});
  d.lim_u=u;itDraftSave();itLimPaint();}
function itCostHtml(it){
  if(!it)return '';const c=itemCost(it);
  let h='<div class="itcost"><div class="sm mut">💰 '+esc(t('it_cost_t'))+'</div>';
  if(it.avg_cost!=null&&num(it.avg_cost)>0)h+='<div>'+esc(t('it_cost_avg'))+' <b>'+esc(itMoney(it.avg_cost))+'</b>/'+esc(trUnit(it.unit))+'</div>';
  if(it.last_price!=null&&num(it.last_price)>0)h+='<div>'+esc(t('it_last'))+' <b>'+esc(itMoney(it.last_price))+'</b>/'+esc(trUnit(it.unit))+(it.last_price_at?' <span class="xs mut">'+esc(dispDate(it.last_price_at))+'</span>':'')+'</div>';
  if(c==null)h+='<div class="amber">'+esc(t('it_cost_none'))+'</div>';
  else if(!(num(it.avg_cost)>0)&&!(num(it.last_price)>0))h+='<div>'+esc(t('it_cost_legacy'))+' <b>'+esc(itMoney(c))+'</b>/'+esc(trUnit(it.unit))+'</div>';
  h+='<div style="margin-top:6px"><button type="button" class="btn gh sm2" onclick="itHist(\''+esc(it.id)+'\')">'+esc(t('it_hist'))+'</button></div></div>';
  return h;}
function itDraftDrop(){if(!IT_D)return;const id=IT_D.id,back=IT_D._back;itDraftClear();IT_D=itDraftFrom(id?itemById(id):null);IT_D._back=back;itPaintForm();}
function itPacksClean(d){ // null = มีแถวผิด
  const out=[],seen={};
  for(const p of (d.packs||[])){const u=String(p.u||'').trim(),q=num(p.q);
    if(!u&&String(p.q==null?'':p.q).trim()==='')continue;   // แถวว่าง ข้าม
    if(!u||!(q>0)||u===d.unit||(d.buy_unit&&u===d.buy_unit)||seen[u])return null;
    seen[u]=1;out.push({u,q:rnd4(q)});}
  return out;}
async function itWrite(build,row){ // ยังไม่รัน SQL บางคอลัมน์ = ตัดช่องนั้นแล้วบันทึกช่องอื่น (PGRST204)
  row=Object.assign({},row);setBusy(true);itWrite.dropped=[];
  try{for(let i=0;i<8;i++){const r=await build(row);if(!r||!r.error)return r&&r.data;
      const m=/'([a-z_]+)' column/i.exec(String(r.error.message||''));
      if(r.error.code==='PGRST204'&&m&&(m[1] in row)){delete row[m[1]];itWrite.dropped.push(m[1]);if(m[1]==='max_qty')S.itMax=false;S.kcSql=false;continue;}
      const d=document.getElementById('syncDot');if(d)d.className='err';toast(t('sv_err')+(r.error.message||r.error),true);throw r.error;}}
  finally{setBusy(false);}
  return null;}
async function itSave(){await once(async()=>{
  const d=IT_D;if(!d||!canKitchen())return;
  const nm=document.getElementById('itName');if(nm)d.name=nm.value;
  d.name=String(d.name||'').trim();if(!d.name){toast(t('need_name'),true);return;}
  if(S.items.some(i=>i.id!==d.id&&i.deleted_at==null&&supKey(i.name)===supKey(d.name))){toast(t('it_dup'),true);return;}
  let cat=d.cat==='__new'?String(d.cat_new||'').trim():String(d.cat||'').trim();if(!cat)cat='อื่นๆ';
  const bu=String(d.buy_unit||'').trim(),bq=num(d.buy_qty);
  if(bu&&bu!==d.unit&&!(bq>0)){toast(t('it_buy_bad'),true);return;}
  const packs=itPacksClean(d);if(!packs){toast(t('it_pack_bad'),true);return;}
  {const base=d.unit||'กก.';for(const p of [{u:(bu&&bu!==d.unit)?bu:'',q:bq}].concat(packs)){const e=p.u?itStdBad(p.u,p.q,base):'';if(e){toast(e,true);return;}}}   // 1 กรัม = 500 กก. ทับตัวแปลงมาตรฐานไม่ได้
  {const it0=d.id?itemById(d.id):null,lock=itLockWhy(d);if(it0&&lock&&d.unit!==it0.unit){toast(t('it_lock',{why:lock}),true);return;}}   // กันทางอ้อม (select ถูกปิดอยู่แล้ว)
  {const used=itPackUsed(d.id,{unit:d.unit||'กก.',buy_unit:(bu&&bu!==d.unit)?bu:null,buy_qty:(bu&&bu!==d.unit)?bq:null,packs});   // เอาขนาดบรรจุที่สูตรยังใช้ออก = สูตรแปลงหน่วยไม่ได้ → ห้าม (แก้สูตรก่อน)
    if(used){toast(t('it_pack_used',{u:trUnit(used.u),list:used.list}),true);return;}}
  let mnQ=null,mxQ=null;{const has=v=>String(v==null?'':v).trim()!=='',lt={unit:d.unit||'กก.',buy_unit:(bu&&bu!==d.unit)?bu:null,buy_qty:(bu&&bu!==d.unit)?bq:null,packs};
    if(has(d.min_in)||has(d.max_in)){const f=unitFactor(lt,d.lim_u);if(f==null){toast(t('it_lim_bad'),true);return;}
      if(has(d.min_in))mnQ=rnd4(Math.max(0,num(d.min_in))*f);if(S.itMax!==false&&has(d.max_in)&&num(d.max_in)>0)mxQ=rnd4(num(d.max_in)*f);
      if(mnQ!=null&&mxQ!=null&&mxQ<mnQ-1e-9){toast(t('it_lim_order'),true);return;}}}   // Max ต้องไม่น้อยกว่าขั้นต่ำ
  let sup=d.sup==='__new'?String(d.sup_new||'').trim():String(d.sup||'').trim();
  if(sup){const s=(typeof spEnsure==='function')?await spEnsure(sup):null;if(s)sup=s.name;}
  const row={name:d.name,cat,unit:d.unit||'กก.',buy_unit:(bu&&bu!==d.unit)?bu:null,buy_qty:(bu&&bu!==d.unit)?rnd4(bq):null,packs,sup,
    min_qty:mnQ,lead_days:String(d.lead_days).trim()===''?null:Math.max(0,Math.round(num(d.lead_days)))};
  const tmp=Object.assign({},row);const cu=String(d.count_unit||'').trim();row.count_unit=(cu&&unitFactor(tmp,cu)!=null)?cu:null;
  let it=d.id?itemById(d.id):null,renamed=false;
  if(S.itMax!==false&&(mxQ!=null||(it&&it.max_qty!=null)))row.max_qty=mxQ;   // ไม่ได้ใช้ Max = ไม่ส่งคอลัมน์ (ยังไม่รัน SQL รุ่นล่าสุดก็บันทึกช่องอื่นได้ปกติ)
  if(it){renamed=it.name!==d.name;if(renamed)row.i18n=null;
    await itWrite(x=>sb.from('ck_items').update(x).eq('id',it.id),row);Object.assign(it,row);if(renamed)it.i18n=null;}
  else{row.id=uid('it');row.qty=0;row.active=true;row.image_url=d.image_url||null;
    row.sort=S.items.reduce((m,x)=>Math.max(m,num(x.sort)),0)+1;
    await itWrite(x=>sb.from('ck_items').insert(x),row);if(!('active' in row))row.active=true;it=row;S.items.push(it);renamed=true;}
  S.items.sort((a,b)=>(num(a.sort)-num(b.sort))||String(a.name||'').localeCompare(String(b.name||''),'th'));
  const back=d._back;IT_D=null;itDraftClear();MODAL_BACK=null;closeModal();toast((itWrite.dropped||[]).includes('max_qty')?t('it_max_sql'):t('sv_ok'),(itWrite.dropped||[]).includes('max_qty')?'warn':false);
  if(renamed)itAutoI18n(it);
  if(typeof back==='function')try{back(it);}catch(e){}
  else if(S.tab==='items')show('items');else if(S.tab==='sups'&&typeof spPaintList==='function')spPaintList();
});}
async function itOff(id,on){ // on=false → ไม่ใช้แล้ว · on=true → ใช้ต่อ (ไม่ลบ ประวัติอยู่ครบ)
  if(!canKitchen())return;const it=itemById(id);if(!it)return;
  if(!on){const used=itUsedIn(id).map(r=>dispName(r));
    let msg=t('it_off_q',{n:dispName(it)});if(used.length)msg+='\n'+t('it_off_in_use',{list:used.join(', ')});
    if(num(it.qty)>0)msg+='\n'+t('it_off_stock',{q:fmtQ(it.qty),u:trUnit(it.unit)});
    if(!await confirm2(msg,{ok:t('it_off_btn'),danger:true}))return;}
  await once(async()=>{
    await itWrite(x=>sb.from('ck_items').update(x).eq('id',id),{active:!!on});it.active=!!on;
    if(IT_D&&IT_D.id===id){IT_D=null;itDraftClear();MODAL_BACK=null;closeModal();}
    toast(on?t('it_restored'):t('it_off_done'));
    if(S.tab==='items')show('items');else if(modalOpen()&&typeof spPaint==='function')spPaint();});
}
async function itDel(id){ // ลบถาวร (soft: deleted_at) — เฉพาะหัวหน้า ใช้กับรายการที่เพิ่มผิด
  if(!isAdminish())return;const it=itemById(id);if(!it)return;
  if(!await confirm2(t('it_del_q',{n:dispName(it)}),{ok:t('delete'),danger:true}))return;
  await once(async()=>{
    await db(()=>sb.from('ck_items').update({deleted_at:new Date().toISOString()}).eq('id',id));
    S.items=S.items.filter(x=>x.id!==id);IT_D=null;itDraftClear();MODAL_BACK=null;closeModal();toast(t('done'));
    if(S.tab==='items')show('items');});
}
async function itHist(id){ // ราคาที่เคยรับจริง (kc_receipt_lines) — ปิดแล้วกลับฟอร์ม
  const it=itemById(id);if(!it)return;
  let lines=[],heads={};
  try{const r=await sb.from('kc_receipt_lines').select('receipt_id,packs,pack_unit,pack_qty,qty_base,unit,price_total,price_base').eq('item_id',id).order('id',{ascending:false}).limit(30);
    if(r&&!r.error&&r.data){lines=r.data;const ids=[...new Set(lines.map(l=>l.receipt_id).filter(Boolean))];
      if(ids.length){const h=await sb.from('kc_receipts').select('id,d,sup_name,bill_no').in('id',ids);if(h&&!h.error&&h.data)h.data.forEach(x=>{heads[x.id]=x;});}}
    else if(r&&r.error&&MISSING_TBL(r.error))S.kcSql=false;}catch(e){}
  lines.sort((a,b)=>String((heads[b.receipt_id]||{}).d||'').localeCompare(String((heads[a.receipt_id]||{}).d||'')));
  let h='<h3>'+esc(t('it_hist_t'))+' · '+esc(dispName(it))+'</h3>'+sqlNeedBox();
  if(!lines.length)h+='<div class="empty">'+esc(t('it_hist_none'))+'</div>';
  else h+='<div class="twrap"><table class="t"><tr><th>'+esc(t('date'))+'</th><th>'+esc(t('sup'))+'</th><th class="n">'+esc(t('it_hist_pack'))+'</th><th class="n">'+esc(t('qty'))+'</th><th class="n">'+esc(t('price'))+'/'+esc(trUnit(it.unit))+'</th></tr>'+
    lines.map(l=>{const hd=heads[l.receipt_id]||{};return '<tr><td>'+esc(dispDate(hd.d))+'</td><td>'+esc(hd.sup_name||'')+'</td><td class="n">'+fmtQ(l.packs)+' '+esc(trUnit(l.pack_unit||''))+
      (num(l.pack_qty)>0&&l.pack_unit!==l.unit?'<div class="xs mut">1 = '+fmtQ(l.pack_qty)+' '+esc(trUnit(l.unit||''))+'</div>':'')+'</td><td class="n">'+fmtQ(l.qty_base)+' '+esc(trUnit(l.unit||''))+'</td><td class="n b">'+esc(itMoney(l.price_base))+'<div class="xs mut">'+esc(money(l.price_total))+'</div></td></tr>';}).join('')+'</table></div>';
  h+='<button class="btn gh" style="width:100%;margin-top:10px" onclick="closeModal()">'+esc(t('back'))+'</button>';
  MODAL_BACK=IT_D?()=>itPaintForm():null;openModal(h);
}
async function itGtx(text,to){ // th → en/lo/my (Google translate endpoint สาธารณะ) · พลาด = null
  const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),4000);
  try{const r=await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=th&tl='+to+'&dt=t&q='+encodeURIComponent(text),{signal:ctl.signal});
    const j=await r.json();return (j&&j[0]&&j[0].map(x=>x[0]).join(''))||null;}catch(e){return null;}finally{clearTimeout(tm);}}
async function itAutoI18n(it){ // เติมคำแปลที่ยังว่าง (ไม่บล็อกการบันทึก · ผิดพลาดเงียบ)
  if(!it||!it.name)return;const cur=(it.i18n&&typeof it.i18n==='object')?it.i18n:{};const o=Object.assign({},cur);let got=false;
  for(const L of ['en','lo','my']){if(o[L])continue;const v=await itGtx(it.name,L);if(v){o[L]=v;got=true;}}
  if(!got)return;const live=itemById(it.id);if(!live||live.name!==it.name)return;
  live.i18n=o;try{await sb.from('ck_items').update({i18n:o}).eq('id',it.id);}catch(e){}
  if(S.tab==='items'&&LANG!=='th')itPaintGrid();}
