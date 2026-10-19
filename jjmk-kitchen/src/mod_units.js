/* ============================================================
   📏 หน่วย — units (un*)  (เจ้าของสั่ง 2026-10-18)
   "อยากให้มีหน้าที่เอาไว้จัดการเรื่องหน่วยทั้งหมด ที่สามารถปรับได้จากตรงที่เดียว แต่อยากให้แนะนำว่า ส่วนไหนที่ใช้หน่วยเดียวกันได้ ส่วนไหนใช้หน่วยเฉพาะหน้านั้นๆ"
   · คู่มือ: หน่วยไหนใช้ร่วมกันทุกหน้า / หน่วยไหนเฉพาะหน้า
   · 🥬 วัตถุดิบ: หลัก (สต๊อก·สูตร·ต้นทุน) · ซื้อ (📥/🛒) · นับ (📋) · บรรจุอื่น + คำแนะนำ ✓/💡/⚠ (unItemAdvice) · 💡 กดใช้ได้ทันที (count_unit)
     แตะแถว = ฟอร์มวัตถุดิบเดิม (itEdit · back = วาดหน้านี้ใหม่) — กติกาล็อกหน่วยหลักของฟอร์มเดิมยังทำงาน
   · 🍳 สินค้า: หน่วยผลิต (ทำของ·สต๊อกสินค้า·ส่ง·บิล) เทียบหน่วยในแอพนับสต๊อกของสาขา (products · อ่านอย่างเดียว) ผ่าน kc_links/ชื่อตรง ·
     ส่วนผสมที่หน่วยแปลงไม่ได้ · แตะ = ฟอร์มเมนู (mnEdit) · 🔗 = แก้ตัวคูณ (sdLinkPickFor)
   · 📏 รายชื่อหน่วย: ตัวแปลงมาตรฐาน (แก้ไม่ได้) · หน่วยทั้งหมดพร้อมจำนวนที่ใช้ · หน่วยเพิ่มเติม (cfg.units — ย้ายมาจาก ⚙️ ตั้งค่า) เพิ่ม/ลบ (หัวหน้า · ลบได้เฉพาะที่ไม่มีใครใช้)
   ============================================================ */
I18N.add({
th:{un_use:'ใช้ (สต๊อก/สูตร)',un_buy_as:'ซื้อเป็น',un_lim:'ขั้นต่ำ → Max',un_count_as:'นับเป็น',un_same_use:'เหมือนหน่วยใช้',un_lock:'มีสต๊อก/อยู่ในสูตร — เปลี่ยนไม่ได้',un_dirty:'ยังไม่บันทึก',un_apply_all:'ใช้คำแนะนำทั้งหมด ({n})',un_applied_n:'ใส่คำแนะนำแล้ว {n} รายการ — กด 💾 บันทึก',un_pending:'แก้ไว้ {n} รายการ',un_save_n:'บันทึก {n} รายการ',un_discard:'ยกเลิกที่แก้',un_discard_q:'ทิ้งที่แก้ไว้ทั้งหมด?',un_saved:'บันทึกแล้ว {n} รายการ ✅',un_saved_bad:'บันทึกแล้ว {n} · ยังบันทึกไม่ได้ {b} รายการ (ดูที่ขึ้น ⚠)',un_e_buyq:'ใส่ขนาด 1 {u} = ?',un_e_cq:'ใส่ขนาด 1 {u} = ?',un_e_recipe:'สูตรใช้ {u} อยู่ — หน่วยแบบนี้จะแปลงไม่ได้',un_e_base:'เปลี่ยนหน่วยใช้ไม่ได้ — มีประวัติ/สต๊อกแล้ว',un_br_h:'แก้ "1 หน่วยของสาขา = เท่าไรของครัว" ในการ์ดได้เลย แล้วกด 💾 ทีเดียว',un_g7:'📌 ตัวอย่าง: ซื้อเป็น กก. · ใช้ในสูตรเป็นกรัม · นับเป็นถุง → หน่วยหลัก = กรัม (เล็กสุดที่ใช้) · หน่วยซื้อ = กก. (ระบบรู้เองว่า 1 กก. = 1,000 กรัม) · บรรจุอื่น = ถุง ใส่ว่า 1 ถุง = กี่กรัม · หน่วยนับ = ถุง',un_d_all:'ทุกแผนก',un_d_main:'🍳 ครัวกลาง',un_d_dessert:'🍮 ของหวาน',un_d_both:'ใช้ทั้ง 2 แผนก',nav_units:'หน่วย',un_sub:'จัดการหน่วยทั้งหมดในที่เดียว — ระบบบอกว่าส่วนไหนใช้หน่วยเดียวกันได้ ส่วนไหนเป็นหน่วยเฉพาะหน้า',
  un_guide_t:'💡 หน่วยไหนใช้ร่วมกัน · หน่วยไหนเฉพาะหน้า',
  un_g1:'🥬 หน่วยหลักของวัตถุดิบ — ใช้ร่วมทุกหน้า (สต๊อก · สูตร · ต้นทุน) · ตั้งครั้งเดียว · เปลี่ยนไม่ได้เมื่อมีสต๊อก/อยู่ในสูตร',
  un_g2:'🛒 หน่วยซื้อ — ใช้ร่วมกัน 📥 รับของ + 🛒 สั่งของ (เช่น ถุง = 1,000 กรัม)',
  un_g3:'📋 หน่วยนับ — เฉพาะหน้านับสต๊อก · แนะนำให้ใช้ตัวเดียวกับหน่วยซื้อ ถ้าของมาเป็นถุง/ขวด/แพ็ค (นับง่ายกว่าชั่ง)',
  un_g4:'📖 หน่วยในสูตร — เฉพาะหน้าเมนู · ใส่หน่วยไหนก็ได้ที่แปลงเป็นหน่วยหลักได้ (เช่น กก. ในสูตร ของที่เก็บเป็นกรัม)',
  un_g5:'🍳 หน่วยผลิตของสินค้า — ใช้ร่วม 🍳 ทำของ · 📦 สต๊อกสินค้า · 🚚 ส่งสาขา · 🧾 บิล · เปลี่ยนไม่ได้เมื่อมีสต๊อก/ประวัติ',
  un_g6:'🏪 หน่วยในแอพนับสต๊อกของสาขา — แนะนำให้ตรงกับหน่วยผลิต (ตัวคูณ 1) · ถ้าต่างกันต้องตั้งตัวคูณที่ 🔗',
  un_t_items:'🥬 วัตถุดิบ',un_t_prods:'🍳 สินค้า',un_t_list:'📏 รายชื่อหน่วย',un_only_bad:'เฉพาะที่ควรดู',
  un_base:'หลัก',un_buy:'ซื้อ',un_count:'นับ',un_packs:'บรรจุอื่น',un_yield:'ผลิต/ส่ง/บิล',un_branch:'สาขานับเป็น',
  un_sum:'✓ {a} · 💡 {b} · ⚠ {c} จาก {n} รายการ',un_none:'ไม่มีรายการ',un_allok:'✓ ทุกรายการใช้หน่วยได้ดีแล้ว',
  un_ok_same:'ซื้อกับนับใช้หน่วยเดียวกัน',un_ok_base:'ใช้หน่วยหลักหน่วยเดียวทุกหน้า',un_ok_diff:'นับต่างจากซื้อ (ตั้งเอง)',
  un_s_pack:'นับเป็น {u} ง่ายกว่าชั่ง',un_s_buy:'นับเป็น {u} เหมือนตอนซื้อ',un_apply:'ใช้คำแนะนำ',
  un_w_buyq:'หน่วยซื้อ {u} ยังไม่รู้ขนาด — ตั้ง "1 {u} = ?"',un_w_recipe:'สูตร "{r}" ใช้ {u} แต่แปลงเป็น {b} ไม่ได้ — ตั้งขนาดบรรจุ',
  un_p_same:'สาขาใช้หน่วยเดียวกัน',un_p_factor:'1 {bu} ของสาขา = {f} {u}',un_p_bad:'สาขานับเป็น {bu} แต่ครัวทำเป็น {u} ตัวคูณ 1 — ตรวจตัวคูณ',un_p_nobr:'ยังไม่มีสาขาสั่ง',
  un_p_line:'ส่วนผสม "{i}" ใช้ {u} ที่แปลงไม่ได้',un_fix:'🔗 ตัวคูณ',un_noprod:'อ่านรายการสินค้าจากแอพนับสต๊อกไม่ได้ — ยังไม่เทียบหน่วยของสาขา',
  un_std_t:'ตัวแปลงมาตรฐาน (แก้ไม่ได้)',un_all_t:'หน่วยทั้งหมด',un_used:'ใช้ {n}',un_unused:'ยังไม่มีใครใช้',un_custom_t:'หน่วยเพิ่มเติม',
  un_custom_h:'หน่วยที่ไม่มีในรายการ — ใช้ได้เมื่อวัตถุดิบตั้งขนาดบรรจุให้แล้ว',un_add:'＋ เพิ่มหน่วย',un_ph:'เช่น กระปุก',un_dup:'มีหน่วยนี้แล้ว',
  un_del_used:'ยังมี {n} รายการใช้หน่วยนี้ — ลบไม่ได้',un_del_q:'ลบหน่วย "{u}"?',un_added:'เพิ่มหน่วยแล้ว',un_deleted:'ลบหน่วยแล้ว',un_boss:'เพิ่ม/ลบหน่วยได้เฉพาะหัวหน้า',
  un_applied:'ตั้งหน่วยนับเป็น {u} แล้ว',st_units_moved:'ย้ายไปจัดการที่แท็บ 📏 หน่วย แล้ว',st_units_go:'ไปหน้า 📏 หน่วย'},
en:{un_use:'Use (stock/recipes)',un_buy_as:'Buy as',un_lim:'Min → Max',un_count_as:'Count as',un_same_use:'Same as use unit',un_lock:'Has stock / in a recipe — locked',un_dirty:'Not saved',un_apply_all:'Use all suggestions ({n})',un_applied_n:'{n} suggestions filled in — tap 💾 Save',un_pending:'{n} changed',un_save_n:'Save {n}',un_discard:'Discard changes',un_discard_q:'Discard all changes?',un_saved:'Saved {n} ✅',un_saved_bad:'Saved {n} · {b} could not be saved (see ⚠)',un_e_buyq:'Enter the size: 1 {u} = ?',un_e_cq:'Enter the size: 1 {u} = ?',un_e_recipe:'A recipe uses {u} — it would no longer convert',un_e_base:'Use unit is locked — it has history/stock',un_br_h:'Edit "1 branch unit = how much of the kitchen product" right in the card, then tap 💾 once',un_g7:'📌 Example: bought in kg · used in g · counted in bags → base unit = g (the smallest you use) · buying unit = kg (the app knows 1 kg = 1,000 g) · other pack = bag, enter 1 bag = ? g · count unit = bag',un_d_all:'All sections',un_d_main:'🍳 Central kitchen',un_d_dessert:'🍮 Desserts',un_d_both:'Used by both sections',nav_units:'Units',un_sub:'Manage every unit in one place — the app shows which units can be shared and which belong to one page only',
  un_guide_t:'💡 Shared units · page-only units',
  un_g1:'🥬 Ingredient base unit — shared by every page (stock · recipes · cost) · set once · locked while there is stock / it is in a recipe',
  un_g2:'🛒 Buying unit — shared by 📥 Receive + 🛒 Order (e.g. bag = 1,000 g)',
  un_g3:'📋 Count unit — Count page only · best the same as the buying unit when goods come in bags/bottles/packs (easier than weighing)',
  un_g4:'📖 Recipe unit — Menus page only · any unit that converts to the base unit (e.g. kg in a recipe for an item kept in g)',
  un_g5:'🍳 Product unit — shared by 🍳 Produce · 📦 Product stock · 🚚 Deliver · 🧾 Bills · locked while there is stock/history',
  un_g6:'🏪 Branch stock-count unit — best equal to the product unit (factor 1) · if different, set the factor with 🔗',
  un_t_items:'🥬 Ingredients',un_t_prods:'🍳 Products',un_t_list:'📏 Unit list',un_only_bad:'Needs a look only',
  un_base:'Base',un_buy:'Buy',un_count:'Count',un_packs:'Other packs',un_yield:'Make/send/bill',un_branch:'Branch counts in',
  un_sum:'✓ {a} · 💡 {b} · ⚠ {c} of {n}',un_none:'Nothing here',un_allok:'✓ Every item uses its units well',
  un_ok_same:'Buy and count use the same unit',un_ok_base:'One base unit on every page',un_ok_diff:'Counted differently from buying (set on purpose)',
  un_s_pack:'Count in {u} — easier than weighing',un_s_buy:'Count in {u} like when buying',un_apply:'Use suggestion',
  un_w_buyq:'Buying unit {u} has no size — set "1 {u} = ?"',un_w_recipe:'Recipe "{r}" uses {u} which cannot convert to {b} — set a pack size',
  un_p_same:'Branches use the same unit',un_p_factor:'1 branch {bu} = {f} {u}',un_p_bad:'Branch counts in {bu} but the kitchen makes {u} with factor 1 — check the factor',un_p_nobr:'No branch orders it yet',
  un_p_line:'Ingredient "{i}" uses {u} which cannot convert',un_fix:'🔗 Factor',un_noprod:'Could not read the stock-count product list — branch units not compared',
  un_std_t:'Standard conversions (fixed)',un_all_t:'All units',un_used:'used {n}',un_unused:'not used yet',un_custom_t:'Extra units',
  un_custom_h:'Units missing from the list — usable once the ingredient has a pack size',un_add:'＋ Add unit',un_ph:'e.g. jar',un_dup:'That unit already exists',
  un_del_used:'{n} items still use this unit — cannot delete',un_del_q:'Delete unit "{u}"?',un_added:'Unit added',un_deleted:'Unit deleted',un_boss:'Only a manager can add/delete units',
  un_applied:'Count unit set to {u}',st_units_moved:'Moved to the 📏 Units tab',st_units_go:'Go to 📏 Units'},
lo:{un_use:'ໃຊ້ (ສະຕັອກ/ສູດ)',un_buy_as:'ຊື້ເປັນ',un_lim:'ຂັ້ນຕ່ຳ → Max',un_count_as:'ນັບເປັນ',un_same_use:'ຄືຫົວໜ່ວຍໃຊ້',un_lock:'ມີສະຕັອກ/ຢູ່ໃນສູດ — ປ່ຽນບໍ່ໄດ້',un_dirty:'ຍັງບໍ່ບັນທຶກ',un_apply_all:'ໃຊ້ຄຳແນະນຳທັງໝົດ ({n})',un_applied_n:'ໃສ່ຄຳແນະນຳແລ້ວ {n} ລາຍການ — ກົດ 💾 ບັນທຶກ',un_pending:'ແກ້ໄວ້ {n} ລາຍການ',un_save_n:'ບັນທຶກ {n} ລາຍການ',un_discard:'ຍົກເລີກທີ່ແກ້',un_discard_q:'ຖິ້ມທີ່ແກ້ໄວ້ທັງໝົດ?',un_saved:'ບັນທຶກແລ້ວ {n} ລາຍການ ✅',un_saved_bad:'ບັນທຶກແລ້ວ {n} · ຍັງບັນທຶກບໍ່ໄດ້ {b} ລາຍການ (ເບິ່ງທີ່ຂຶ້ນ ⚠)',un_e_buyq:'ໃສ່ຂະໜາດ 1 {u} = ?',un_e_cq:'ໃສ່ຂະໜາດ 1 {u} = ?',un_e_recipe:'ສູດໃຊ້ {u} ຢູ່ — ຈະແປງບໍ່ໄດ້',un_e_base:'ປ່ຽນຫົວໜ່ວຍໃຊ້ບໍ່ໄດ້ — ມີປະຫວັດ/ສະຕັອກແລ້ວ',un_br_h:'ແກ້ "1 ຫົວໜ່ວຍຂອງສາຂາ = ເທົ່າໃດຂອງຄົວ" ໃນບັດໄດ້ເລີຍ ແລ້ວກົດ 💾 ເທື່ອດຽວ',un_g7:'📌 ຕົວຢ່າງ: ຊື້ເປັນ ກິໂລ · ໃຊ້ໃນສູດເປັນກຣາມ · ນັບເປັນຖົງ → ຫົວໜ່ວຍຫຼັກ = ກຣາມ · ຫົວໜ່ວຍຊື້ = ກິໂລ (ລະບົບຮູ້ເອງວ່າ 1 ກິໂລ = 1,000 ກຣາມ) · ບັນຈຸອື່ນ = ຖົງ ໃສ່ວ່າ 1 ຖົງ = ຈັກກຣາມ · ຫົວໜ່ວຍນັບ = ຖົງ',un_d_all:'ທຸກພະແນກ',un_d_main:'🍳 ຄົວກາງ',un_d_dessert:'🍮 ຂອງຫວານ',un_d_both:'ໃຊ້ທັງ 2 ພະແນກ',nav_units:'ຫົວໜ່ວຍ',un_sub:'ຈັດການຫົວໜ່ວຍທັງໝົດໃນບ່ອນດຽວ — ລະບົບບອກວ່າສ່ວນໃດໃຊ້ຫົວໜ່ວຍດຽວກັນໄດ້ ສ່ວນໃດເປັນຫົວໜ່ວຍສະເພາະໜ້າ',
  un_guide_t:'💡 ຫົວໜ່ວຍໃຊ້ຮ່ວມ · ຫົວໜ່ວຍສະເພາະໜ້າ',
  un_g1:'🥬 ຫົວໜ່ວຍຫຼັກຂອງວັດຖຸດິບ — ໃຊ້ຮ່ວມທຸກໜ້າ (ສະຕັອກ · ສູດ · ຕົ້ນທຶນ) · ຕັ້ງເທື່ອດຽວ · ປ່ຽນບໍ່ໄດ້ເມື່ອມີສະຕັອກ/ຢູ່ໃນສູດ',
  un_g2:'🛒 ຫົວໜ່ວຍຊື້ — ໃຊ້ຮ່ວມ 📥 ຮັບເຄື່ອງ + 🛒 ສັ່ງເຄື່ອງ (ເຊັ່ນ ຖົງ = 1,000 ກຣາມ)',
  un_g3:'📋 ຫົວໜ່ວຍນັບ — ສະເພາະໜ້ານັບສະຕັອກ · ແນະນຳໃຫ້ໃຊ້ຕົວດຽວກັບຫົວໜ່ວຍຊື້ ຖ້າເຄື່ອງມາເປັນຖົງ/ຂວດ/ແພັກ',
  un_g4:'📖 ຫົວໜ່ວຍໃນສູດ — ສະເພາະໜ້າເມນູ · ໃສ່ຫົວໜ່ວຍໃດກໍໄດ້ທີ່ແປງເປັນຫົວໜ່ວຍຫຼັກໄດ້',
  un_g5:'🍳 ຫົວໜ່ວຍຜະລິດຂອງສິນຄ້າ — ໃຊ້ຮ່ວມ 🍳 ເຮັດເຄື່ອງ · 📦 ສະຕັອກສິນຄ້າ · 🚚 ສົ່ງສາຂາ · 🧾 ບິນ · ປ່ຽນບໍ່ໄດ້ເມື່ອມີສະຕັອກ/ປະຫວັດ',
  un_g6:'🏪 ຫົວໜ່ວຍໃນແອັບນັບສະຕັອກຂອງສາຂາ — ແນະນຳໃຫ້ກົງກັບຫົວໜ່ວຍຜະລິດ (ຕົວຄູນ 1) · ຖ້າຕ່າງກັນຕ້ອງຕັ້ງຕົວຄູນທີ່ 🔗',
  un_t_items:'🥬 ວັດຖຸດິບ',un_t_prods:'🍳 ສິນຄ້າ',un_t_list:'📏 ລາຍຊື່ຫົວໜ່ວຍ',un_only_bad:'ສະເພາະທີ່ຄວນເບິ່ງ',
  un_base:'ຫຼັກ',un_buy:'ຊື້',un_count:'ນັບ',un_packs:'ບັນຈຸອື່ນ',un_yield:'ຜະລິດ/ສົ່ງ/ບິນ',un_branch:'ສາຂານັບເປັນ',
  un_sum:'✓ {a} · 💡 {b} · ⚠ {c} ຈາກ {n} ລາຍການ',un_none:'ບໍ່ມີລາຍການ',un_allok:'✓ ທຸກລາຍການໃຊ້ຫົວໜ່ວຍໄດ້ດີແລ້ວ',
  un_ok_same:'ຊື້ກັບນັບໃຊ້ຫົວໜ່ວຍດຽວກັນ',un_ok_base:'ໃຊ້ຫົວໜ່ວຍຫຼັກຫົວໜ່ວຍດຽວທຸກໜ້າ',un_ok_diff:'ນັບຕ່າງຈາກຊື້ (ຕັ້ງເອງ)',
  un_s_pack:'ນັບເປັນ {u} ງ່າຍກວ່າຊັ່ງ',un_s_buy:'ນັບເປັນ {u} ຄືຕອນຊື້',un_apply:'ໃຊ້ຄຳແນະນຳ',
  un_w_buyq:'ຫົວໜ່ວຍຊື້ {u} ຍັງບໍ່ຮູ້ຂະໜາດ — ຕັ້ງ "1 {u} = ?"',un_w_recipe:'ສູດ "{r}" ໃຊ້ {u} ແຕ່ແປງເປັນ {b} ບໍ່ໄດ້ — ຕັ້ງຂະໜາດບັນຈຸ',
  un_p_same:'ສາຂາໃຊ້ຫົວໜ່ວຍດຽວກັນ',un_p_factor:'1 {bu} ຂອງສາຂາ = {f} {u}',un_p_bad:'ສາຂານັບເປັນ {bu} ແຕ່ຄົວເຮັດເປັນ {u} ຕົວຄູນ 1 — ກວດຕົວຄູນ',un_p_nobr:'ຍັງບໍ່ມີສາຂາສັ່ງ',
  un_p_line:'ສ່ວນປະສົມ "{i}" ໃຊ້ {u} ທີ່ແປງບໍ່ໄດ້',un_fix:'🔗 ຕົວຄູນ',un_noprod:'ອ່ານລາຍການສິນຄ້າຈາກແອັບນັບສະຕັອກບໍ່ໄດ້ — ຍັງບໍ່ທຽບຫົວໜ່ວຍຂອງສາຂາ',
  un_std_t:'ຕົວແປງມາດຕະຖານ (ແກ້ບໍ່ໄດ້)',un_all_t:'ຫົວໜ່ວຍທັງໝົດ',un_used:'ໃຊ້ {n}',un_unused:'ຍັງບໍ່ມີໃຜໃຊ້',un_custom_t:'ຫົວໜ່ວຍເພີ່ມເຕີມ',
  un_custom_h:'ຫົວໜ່ວຍທີ່ບໍ່ມີໃນລາຍການ — ໃຊ້ໄດ້ເມື່ອວັດຖຸດິບຕັ້ງຂະໜາດບັນຈຸແລ້ວ',un_add:'＋ ເພີ່ມຫົວໜ່ວຍ',un_ph:'ເຊັ່ນ ກະປຸກ',un_dup:'ມີຫົວໜ່ວຍນີ້ແລ້ວ',
  un_del_used:'ຍັງມີ {n} ລາຍການໃຊ້ຫົວໜ່ວຍນີ້ — ລຶບບໍ່ໄດ້',un_del_q:'ລຶບຫົວໜ່ວຍ "{u}"?',un_added:'ເພີ່ມຫົວໜ່ວຍແລ້ວ',un_deleted:'ລຶບຫົວໜ່ວຍແລ້ວ',un_boss:'ເພີ່ມ/ລຶບຫົວໜ່ວຍໄດ້ສະເພາະຫົວໜ້າ',
  un_applied:'ຕັ້ງຫົວໜ່ວຍນັບເປັນ {u} ແລ້ວ',st_units_moved:'ຍ້າຍໄປຈັດການທີ່ແທັບ 📏 ຫົວໜ່ວຍ ແລ້ວ',st_units_go:'ໄປໜ້າ 📏 ຫົວໜ່ວຍ'},
my:{un_use:'သုံး (စတော့/နည်း)',un_buy_as:'ဝယ်ပုံ',un_lim:'အနည်းဆုံး → Max',un_count_as:'ရေတွက်ပုံ',un_same_use:'သုံးယူနစ်နှင့်တူ',un_lock:'စတော့ရှိ/နည်းထဲပါ — မပြောင်းနိုင်',un_dirty:'မသိမ်းရသေး',un_apply_all:'အကြံပြုချက်အားလုံးသုံး ({n})',un_applied_n:'အကြံပြုချက် {n} ခု ထည့်ပြီး — 💾 သိမ်း နှိပ်ပါ',un_pending:'ပြင်ထား {n} ခု',un_save_n:'{n} ခု သိမ်း',un_discard:'ပြင်ထားတာ ပယ်',un_discard_q:'ပြင်ထားတာ အားလုံး ပယ်မလား?',un_saved:'{n} ခု သိမ်းပြီး ✅',un_saved_bad:'{n} ခု သိမ်းပြီး · {b} ခု မသိမ်းနိုင် (⚠ ကြည့်ပါ)',un_e_buyq:'အရွယ် ထည့်ပါ 1 {u} = ?',un_e_cq:'အရွယ် ထည့်ပါ 1 {u} = ?',un_e_recipe:'နည်းက {u} ကိုသုံးနေ — မပြောင်းနိုင်တော့',un_e_base:'သုံးယူနစ် မပြောင်းနိုင် — မှတ်တမ်း/စတော့ရှိ',un_br_h:'"ဆိုင်ခွဲ 1 ယူနစ် = မီးဖိုချောင် ဘယ်လောက်" ကို ကတ်ထဲတွင် တိုက်ရိုက်ပြင်ပြီး 💾 တစ်ကြိမ်နှိပ်ပါ',un_g7:'📌 ဥပမာ: ကီလိုဖြင့်ဝယ် · နည်းတွင် ဂရမ်ဖြင့်သုံး · အိတ်ဖြင့်ရေတွက် → အဓိကယူနစ် = ဂရမ် · ဝယ်ယူနစ် = ကီလို (1 ကီလို = 1,000 ဂရမ် အလိုအလျောက်သိ) · အခြားထုပ် = အိတ်၊ 1 အိတ် = ဂရမ် ဘယ်လောက် ထည့် · ရေတွက်ယူနစ် = အိတ်',un_d_all:'ဌာနအားလုံး',un_d_main:'🍳 ဗဟိုမီးဖိုချောင်',un_d_dessert:'🍮 အချိုပွဲ',un_d_both:'ဌာန ၂ ခုလုံး သုံး',nav_units:'ယူနစ်',un_sub:'ယူနစ်အားလုံးကို တစ်နေရာတည်းတွင် စီမံ — ဘယ်အပိုင်းက ယူနစ်တူသုံးနိုင်ပြီး ဘယ်အပိုင်းက စာမျက်နှာသီးသန့်လဲ ပြပေးသည်',
  un_guide_t:'💡 မျှသုံးယူနစ် · စာမျက်နှာသီးသန့်ယူနစ်',
  un_g1:'🥬 ကုန်ကြမ်း အဓိကယူနစ် — စာမျက်နှာအားလုံး မျှသုံး (စတော့ · နည်း · ကုန်ကျ) · တစ်ကြိမ်သတ်မှတ် · စတော့ရှိ/နည်းထဲပါလျှင် မပြောင်းနိုင်',
  un_g2:'🛒 ဝယ်ယူနစ် — 📥 လက်ခံ + 🛒 မှာယူ မျှသုံး (ဥပမာ အိတ် = 1,000 ဂရမ်)',
  un_g3:'📋 ရေတွက်ယူနစ် — စာရင်းကောက်စာမျက်နှာသာ · အိတ်/ပုလင်း/ထုပ်ဖြင့်လာလျှင် ဝယ်ယူနစ်နှင့် တူအောင်ထားပါ',
  un_g4:'📖 နည်းထဲယူနစ် — မီနူးစာမျက်နှာသာ · အဓိကယူနစ်သို့ ပြောင်းနိုင်သည့် မည်သည့်ယူနစ်မဆို',
  un_g5:'🍳 ကုန်ပစ္စည်းယူနစ် — 🍳 ထုတ်လုပ် · 📦 ကုန်စတော့ · 🚚 ပို့ · 🧾 ဘေလ် မျှသုံး · စတော့/မှတ်တမ်းရှိလျှင် မပြောင်းနိုင်',
  un_g6:'🏪 ဆိုင်ခွဲ စာရင်းကောက်အက်ပ်ယူနစ် — ကုန်ပစ္စည်းယူနစ်နှင့် တူအောင် (မြှောက်ကိန်း 1) · မတူလျှင် 🔗 တွင် မြှောက်ကိန်းသတ်မှတ်',
  un_t_items:'🥬 ကုန်ကြမ်း',un_t_prods:'🍳 ကုန်ပစ္စည်း',un_t_list:'📏 ယူနစ်စာရင်း',un_only_bad:'စစ်ရန်သာ',
  un_base:'အဓိက',un_buy:'ဝယ်',un_count:'ရေတွက်',un_packs:'အခြားထုပ်',un_yield:'ထုတ်/ပို့/ဘေလ်',un_branch:'ဆိုင်ခွဲ ရေတွက်ပုံ',
  un_sum:'✓ {a} · 💡 {b} · ⚠ {c} / {n}',un_none:'မရှိပါ',un_allok:'✓ အားလုံး ယူနစ်ကောင်းပါသည်',
  un_ok_same:'ဝယ်နှင့် ရေတွက် ယူနစ်တူ',un_ok_base:'စာမျက်နှာတိုင်း အဓိကယူနစ်တစ်ခုတည်း',un_ok_diff:'ဝယ်နှင့်မတူ ရေတွက် (ကိုယ်တိုင်သတ်မှတ်)',
  un_s_pack:'{u} ဖြင့် ရေတွက်ပါ — ချိန်ခြင်းထက် လွယ်',un_s_buy:'ဝယ်သလို {u} ဖြင့် ရေတွက်ပါ',un_apply:'အကြံပြုချက်သုံး',
  un_w_buyq:'ဝယ်ယူနစ် {u} အရွယ်မသိ — "1 {u} = ?" သတ်မှတ်ပါ',un_w_recipe:'နည်း "{r}" သည် {u} ကိုသုံးသော်လည်း {b} သို့ မပြောင်းနိုင် — ထုပ်အရွယ်သတ်မှတ်ပါ',
  un_p_same:'ဆိုင်ခွဲ ယူနစ်တူ',un_p_factor:'ဆိုင်ခွဲ 1 {bu} = {f} {u}',un_p_bad:'ဆိုင်ခွဲ {bu} ဖြင့်ရေတွက်သော်လည်း မီးဖိုချောင် {u} ဖြင့်ထုတ် မြှောက်ကိန်း 1 — စစ်ပါ',un_p_nobr:'ဆိုင်ခွဲ မမှာရသေး',
  un_p_line:'ပါဝင်ပစ္စည်း "{i}" သည် မပြောင်းနိုင်သော {u} ကိုသုံး',un_fix:'🔗 မြှောက်ကိန်း',un_noprod:'စာရင်းကောက်အက်ပ် ပစ္စည်းစာရင်း မဖတ်နိုင် — ဆိုင်ခွဲယူနစ် မနှိုင်းယှဉ်ရသေး',
  un_std_t:'စံပြောင်းလဲမှု (ပြင်မရ)',un_all_t:'ယူနစ်အားလုံး',un_used:'သုံး {n}',un_unused:'မသုံးရသေး',un_custom_t:'ထပ်ဆောင်းယူနစ်',
  un_custom_h:'စာရင်းတွင်မပါသော ယူနစ် — ကုန်ကြမ်းတွင် ထုပ်အရွယ်သတ်မှတ်ပြီးမှ သုံးနိုင်',un_add:'＋ ယူနစ်ထည့်',un_ph:'ဥပမာ ဘူး',un_dup:'ဤယူနစ် ရှိပြီး',
  un_del_used:'ဤယူနစ်ကို {n} ခု သုံးနေဆဲ — ဖျက်မရ',un_del_q:'ယူနစ် "{u}" ဖျက်မလား?',un_added:'ယူနစ်ထည့်ပြီး',un_deleted:'ယူနစ်ဖျက်ပြီး',un_boss:'ခေါင်းဆောင်သာ ယူနစ်ထည့်/ဖျက်နိုင်',
  un_applied:'ရေတွက်ယူနစ်ကို {u} သတ်မှတ်ပြီး',st_units_moved:'📏 ယူနစ် တဘ်သို့ ရွှေ့ပြီး',st_units_go:'📏 ယူနစ် သို့သွား'}
});
CSS.add(`
.un-sub{color:var(--mut);font-size:14px;margin:-4px 0 10px}
.un-guide{border:1px solid var(--line);border-radius:14px;background:var(--card);margin-bottom:10px}
.un-guide summary{padding:12px 14px;font-weight:800;cursor:pointer;min-height:44px;display:flex;align-items:center}
.un-guide ul{margin:0;padding:0 14px 12px 14px;list-style:none}
.un-guide li{padding:6px 0;border-top:1px dashed var(--line);font-size:14px;line-height:1.45}
.un-row{border:1px solid var(--line);border-radius:14px;background:var(--card);padding:12px;margin-bottom:8px}
.un-row.warn{border-color:#f3a6a6;background:#fff4f4}
.un-row.tip{border-color:#f0c98a;background:#fff8ec}
.un-hd{display:flex;gap:10px;align-items:center;cursor:pointer;min-height:44px}
.un-hd .grow{min-width:0}
.un-hd b{font-size:16px;overflow-wrap:anywhere}
.un-us{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 2px}
.un-u{font-size:13px;border:1px solid var(--line);border-radius:12px;padding:3px 9px;background:#fff;max-width:100%;overflow-wrap:anywhere}
.un-u i{font-style:normal;color:var(--mut);margin-right:3px}
.un-adv{font-size:13.5px;margin-top:6px;line-height:1.4}
.un-adv.ok{color:#1e7a3c}.un-adv.tip{color:#8a5a00}.un-adv.bad{color:#b3261e}
.un-adv .btn{margin-left:6px;vertical-align:middle}
.un-row.dirty{box-shadow:0 0 0 2px #f0c98a inset}
.un-ed{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 10px;align-items:center;margin-top:8px}
.un-ed label{font-size:13.5px;color:var(--mut);font-weight:700;white-space:nowrap}
.un-f{display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-width:0}
.un-f select{width:auto;min-width:92px;max-width:150px;flex:0 1 auto;min-height:44px}
.un-sz{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.un-lim{flex-wrap:nowrap}.un-lim .un-q{width:68px;flex:0 1 68px;min-width:0}.un-lim select{min-width:0;flex:1 1 auto}
.un-q{width:76px;min-height:44px;text-align:center;font-weight:700}
.un-q[readonly]{background:#F3EBDB;color:var(--mut)}
.un-eq{font-size:13.5px;white-space:nowrap}
.un-tools{gap:8px;align-items:center;flex-wrap:wrap}
.un-br{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;padding-top:8px;border-top:1px dashed var(--line)}
.un-bn{flex:1 1 100%;font-weight:700;font-size:14px;overflow-wrap:anywhere}
.pinbar .un-acts{margin-left:auto;display:flex;gap:8px}
@media(max-width:520px){.un-ed{grid-template-columns:1fr;gap:2px}.un-ed label{margin-top:6px}}
.un-sum{font-weight:700;margin:6px 0}
.un-both{background:#F4EEFB;border-color:#d9c8ef}
.un-std{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
.un-std div{border:1px solid var(--line);border-radius:10px;padding:8px 10px;background:#fff;font-size:14px}
.un-all{display:flex;flex-wrap:wrap;gap:6px}
.un-chip{border:1px solid var(--line);border-radius:99px;padding:6px 10px;background:#fff;font-size:14px;display:inline-flex;align-items:center;gap:6px;min-height:36px}
.un-chip small{color:var(--mut)}
.un-chip button{min-width:36px;min-height:36px;border-radius:50%;color:var(--bad,#b3261e);font-weight:800}
.un-add{display:flex;gap:8px;margin-top:10px}
.un-add input{flex:1;min-width:0}
`);
let UN_TAB='items',UN_BAD=false,UN_DEPT='',UN_BR=null,UN_BR_OK=true,UN_BR_AT=0;
try{const v=LS.get('jjck_un');if(v){if(['items','prods','list'].includes(v.tab))UN_TAB=v.tab;UN_BAD=!!v.bad;if(['main','dessert'].includes(v.dept))UN_DEPT=v.dept;}}catch(e){}
function unSaveUi(){try{LS.set('jjck_un',{tab:UN_TAB,bad:UN_BAD,dept:UN_DEPT});}catch(e){}}
/* แผนก (เจ้าของ 2026-10-18 "หน่วยต้องแยกเป็นแต่ละแผนกด้วย") — สินค้า: กลุ่มเมนู "ของหวาน" = ของหวาน · วัตถุดิบ: ck_items.dept (main/dessert/both · ตั้งไว้ตั้งแต่ระบบเดิม)
   ไม่มี = ดูจากสูตรที่ใช้ (กติกาเดียวกับ itemDeptAuto ของระบบเดิม): ใช้แต่ในเมนูของหวาน = ของหวาน · ใช้ทั้งสองแบบ = both · ไม่อยู่ในสูตรไหน = ครัวกลาง */
const unRecDept=r=>String((r&&r.cat)||'').trim()==='ของหวาน'?'dessert':'main';
function unItemDept(it){const d=String(it.dept||'');if(['main','dessert','both'].includes(d))return d;
  const set={};(S.recipeItems||[]).forEach(l=>{if(l.item_id!==it.id)return;const r=recipeById(l.recipe_id);if(r&&r.active!==false)set[unRecDept(r)]=1;});
  return set.main&&set.dessert?'both':set.dessert?'dessert':'main';}
const unInDept=d=>!UN_DEPT||d===UN_DEPT||d==='both';
function unSetDept(k){UN_DEPT=k;unSaveUi();unPaint();}
function unDeptBar(list){ // list = [{d}] · ไม่มีของหวานเลย = ไม่โชว์แถบ
  if(!list.some(x=>x.d==='dessert'||x.d==='both'))return '';
  const n=k=>list.filter(x=>!k||x.d===k||x.d==='both').length;
  return '<div id="unDept">'+pillBar([{k:'',lb:t('un_d_all'),n:list.length},{k:'main',lb:t('un_d_main'),n:n('main')},{k:'dessert',lb:t('un_d_dessert'),n:n('dessert')}],UN_DEPT,'unSetDept',{scroll:true})+'</div>';}
const unContainer=u=>!!u&&!isMassVol(u);

/* ---------- คำแนะนำต่อวัตถุดิบ → {lv:'ok'|'tip'|'bad', msgs:[{lv,txt,apply?}] } ---------- */
function unItemAdvice(it){
  const base=it.unit||'',bu=it.buy_unit&&it.buy_unit!==base?it.buy_unit:'',buyKnown=!bu||unitFactor(it,bu)!=null;
  const cu=countUnitOf(it),cuSet=!!(it.count_unit&&unitFactor(it,it.count_unit)!=null),msgs=[];
  if(bu&&!buyKnown)msgs.push({lv:'bad',txt:t('un_w_buyq',{u:trUnit(bu)})});
  (S.recipeItems||[]).forEach(l=>{if(l.item_id!==it.id||!l.unit||l.unit===base)return;if(unitFactor(it,l.unit)!=null)return;
    const r=recipeById(l.recipe_id);if(!r||r.active===false)return;msgs.push({lv:'bad',txt:t('un_w_recipe',{r:dispName(r),u:trUnit(l.unit),b:trUnit(base)})});});
  const buyU=bu&&buyKnown?bu:base;
  if(!msgs.some(m=>m.lv==='bad')){
    if(isMassVol(cu)){const ps=packsOf(it).filter(p=>unContainer(p.u)).sort((a,b)=>a.q-b.q);
      if(ps.length)msgs.push({lv:'tip',txt:t('un_s_pack',{u:trUnit(ps[0].u)}),apply:ps[0].u});}
    else if(unContainer(buyU)&&cu!==buyU&&!cuSet)msgs.push({lv:'tip',txt:t('un_s_buy',{u:trUnit(buyU)}),apply:buyU});
  }
  if(!msgs.length)msgs.push({lv:'ok',txt:!bu&&cu===base?t('un_ok_base'):cu===buyU?t('un_ok_same'):t('un_ok_diff')});
  const lv=msgs.some(m=>m.lv==='bad')?'bad':msgs.some(m=>m.lv==='tip')?'tip':'ok';
  return {lv,msgs};}

/* ---------- คำแนะนำต่อสินค้า (หน่วยผลิต vs หน่วยของสาขา + ส่วนผสมที่แปลงไม่ได้) ---------- */
function unProdAdvice(r){
  const u=r.yield_unit||'',msgs=[],br=(UN_BR||[]).filter(x=>x.rid===r.id);
  bomOf(r).forEach(l=>{if(l.item&&l.qty_base==null)msgs.push({lv:'bad',txt:t('un_p_line',{i:dispName(l.item),u:trUnit(l.unit||'')})});});
  br.forEach(x=>{const f=num(unLkCur(x))||1;
    if(x.unit&&x.unit!==u&&Math.abs(f-1)<1e-9)msgs.push({lv:'bad',txt:t('un_p_bad',{bu:trUnit(x.unit),u:trUnit(u)}),link:x});
    else if(x.unit&&x.unit!==u)msgs.push({lv:'ok',txt:t('un_p_factor',{bu:trUnit(x.unit),f:fmtQ(f),u:trUnit(u)}),link:x});
    else msgs.push({lv:'ok',txt:t('un_p_same'),link:x,same:true});});
  if(UN_BR&&!br.length)msgs.push({lv:'ok',txt:t('un_p_nobr'),mut:true});
  const seen={};const out=msgs.filter(m=>{if(!m.same)return true;if(seen.same)return false;seen.same=1;return true;});
  const lv=out.some(m=>m.lv==='bad')?'bad':'ok';return {lv,msgs:out,br};}
async function unLoadBranch(force){ // สินค้าในแอพนับสต๊อก (อ่านอย่างเดียว) ที่เป็นของครัวกลาง → [{name,unit,rid,factor}]
  if(!force&&UN_BR&&Date.now()-UN_BR_AT<120000)return;
  const pr=await tdGet('products'),lk=await tdGet('kc_links');if(lk.ok)TD_LINKS=lk.rows;
  UN_BR_OK=pr.ok;UN_BR_AT=Date.now();
  const m={};(pr.rows||[]).forEach(p=>{if(p.deleted_at||!sdIsKitchenRow(p))return;const lkx=tdLinkOf(p.name);if(!lkx)return;
    const k=supKey(p.name)+'|'+String(p.unit||'');if(m[k])return;m[k]={name:String(p.name).trim(),unit:String(p.unit||''),rid:lkx.recipe_id,factor:num(lkx.factor)||1};});
  UN_BR=Object.values(m);}

/* ---------- หน้า (ออกแบบใหม่ 2026-10-18 — "ใช้งานง่ายกว่านี้ และเซทค่าทีเดียว": แก้หน่วยในการ์ดเลย · บันทึกทีเดียวที่แถบล่าง) ---------- */
let UN_ED=null,UN_LK=null,UN_Q='',UN_ERR={};   // UN_ED{itemId:{unit,buy_unit,buy_qty,count_unit,cq}} · UN_LK{stkName:{rid,f}} · ร่างเก็บ jjck_un_ed (ลากหน้าลงไม่หาย)
function unDraftLoad(){if(UN_ED)return;const v=LS.get('jjck_un_ed',null)||{};UN_ED=v.e&&typeof v.e==='object'?v.e:{};UN_LK=v.l&&typeof v.l==='object'?v.l:{};
  Object.keys(UN_ED).forEach(id=>{if(!itemById(id))delete UN_ED[id];});}
function unDraftSave(){try{LS.set('jjck_un_ed',{e:UN_ED,l:UN_LK});}catch(e){}unPin();}
RENDER.units=function(el){
  unDraftLoad();
  const tabs=[{k:'items',lb:t('un_t_items')},{k:'prods',lb:t('un_t_prods')},{k:'list',lb:t('un_t_list')}];
  el.innerHTML=dhead('📏 '+t('nav_units'))+'<div class="un-sub">'+esc(t('un_sub'))+'</div>'+
    '<details class="un-guide"'+(LS.get('jjck_un_g')===1?' open':'')+' ontoggle="try{LS.set(\'jjck_un_g\',this.open?1:0)}catch(e){}"><summary>'+esc(t('un_guide_t'))+'</summary><ul>'+
      ['un_g1','un_g2','un_g3','un_g4','un_g5','un_g6','un_g7'].map(k=>'<li>'+esc(t(k))+'</li>').join('')+'</ul></details>'+
    '<div id="unTabs">'+pillBar(tabs,UN_TAB,'unSetTab',{scroll:true})+'</div><div id="unBody"></div>';
  unPaint();
  if(UN_TAB==='prods')unLoadBranch().then(()=>{if(S.tab==='units'&&UN_TAB==='prods')unPaint();});
};
function unSetTab(k){UN_TAB=k;unSaveUi();document.querySelectorAll('#unTabs .pill').forEach(b=>b.classList.toggle('on',b.dataset.k===k));unPaint();
  if(k==='prods')unLoadBranch().then(()=>{if(S.tab==='units'&&UN_TAB==='prods')unPaint();});}
function unSetBad(){UN_BAD=!UN_BAD;unSaveUi();unPaint();}
function unSetQ(v){UN_Q=v;const b=document.getElementById('unList');if(b)b.innerHTML=UN_TAB==='prods'?unProdCards():unItemCards();}
function unPaint(){const b=document.getElementById('unBody');if(!b)return;
  b.innerHTML=UN_TAB==='items'?unItemsHtml():UN_TAB==='prods'?unProdsHtml():unListHtml();
  const q=document.getElementById('unQ');if(q&&UN_Q)q.value=UN_Q;unPin();}
function unBadToggle(){return '<label class="row" style="gap:8px;margin:4px 0 8px;min-height:44px;cursor:pointer"><input type="checkbox" id="unBad"'+(UN_BAD?' checked':'')+' onchange="unSetBad()" style="width:22px;height:22px"> '+esc(t('un_only_bad'))+'</label>';}
function unAdvHtml(m,id){return '<div class="un-adv '+m.lv+'">'+(m.lv==='ok'?'✓ ':m.lv==='tip'?'💡 ':'⚠ ')+esc(m.txt)+
  (m.apply&&canKitchen()?'<button type="button" class="btn sm2 gh" data-id="'+esc(id)+'" data-u="'+esc(m.apply)+'" onclick="unApply(this)">'+esc(t('un_apply'))+'</button>':'')+'</div>';}

/* ---------- วัตถุดิบ: ค่าที่กำลังแก้ (ร่าง) รวมกับค่าจริง ---------- */
function unOrig(it){const base=it.unit||'',bu=it.buy_unit&&it.buy_unit!==base?it.buy_unit:'';const cu=countUnitOf(it);
  const cp=packsOf(it).find(p=>p.u===cu&&p.u!==bu),su=limUnits(it)[0]||base;
  return {unit:base,buy_unit:bu,buy_qty:bu?num(it.buy_qty):'',count_unit:cu,cq:cp?cp.q:'',su,smin:itLimIn(it,it.min_qty),smax:itLimIn(it,it.max_qty)};}
const UN_LIMK=['su','smin','smax'];   // 🎯 ขั้นต่ำ/Max ในการ์ด (ใส่เป็นหน่วย su · เก็บ min_qty/max_qty เป็นหน่วยหลัก · เจ้าของ 2026-10-19)
function unLim(it,c,m){ // → {mn,mx,err} หน่วยหลัก
  const has=v=>String(v==null?'':v).trim()!=='';if(!has(c.smin)&&!has(c.smax))return {mn:null,mx:null,err:''};
  const f=unitFactor(m,c.su);if(f==null)return {mn:null,mx:null,err:t('it_lim_bad')};
  const mn=has(c.smin)?rnd4(Math.max(0,num(c.smin))*f):null,mx=S.itMax!==false&&has(c.smax)&&num(c.smax)>0?rnd4(num(c.smax)*f):null;
  return {mn,mx,err:mn!=null&&mx!=null&&mx<mn-1e-9?t('it_lim_order'):''};}
const unSameQ=(a,b)=>(a==null?null:rnd4(num(a)))===(b==null?null:rnd4(num(b)));
function unCur(it){return Object.assign(unOrig(it),UN_ED[it.id]||{});}
function unNeedQ(m,u){ // หน่วยนี้ต้องใส่ขนาดเองไหม (ไม่ใช่หน่วยใช้ · ไม่ใช่หน่วยซื้อ · ตัวแปลงมาตรฐานไม่รู้)
  return !!u&&u!==m.unit&&u!==m.buy_unit&&unitConv(null,u,m.unit)==null;}
function unMerged(it,c){ // วัตถุดิบหน้าตาหลังบันทึก (ใช้คิดคำแนะนำ/ตรวจ/เขียน)
  c=c||unCur(it);const base=c.unit;
  const bu=c.buy_unit&&c.buy_unit!==base?c.buy_unit:null,bq=bu?(unitConv(null,bu,base)!=null?unitConv(null,bu,base):num(c.buy_qty)):null;
  let packs=(Array.isArray(it.packs)?it.packs:[]).filter(p=>p&&p.u&&p.u!==base&&p.u!==bu).map(p=>({u:p.u,q:num(p.q)}));
  if(c.unit!==it.unit){const f=unitConv(null,it.unit,base);packs=packs.map(p=>({u:p.u,q:f!=null?rnd4(p.q*f):p.q}));}
  const cu=c.count_unit||base;
  if(unNeedQ({unit:base,buy_unit:bu},cu)){const q=num(c.cq);packs=packs.filter(p=>p.u!==cu);if(q>0)packs.push({u:cu,q:rnd4(q)});}
  return Object.assign({},it,{unit:base,buy_unit:bu,buy_qty:bq,packs,count_unit:cu&&cu!==base?cu:null});}
function unDirty(it){const e=UN_ED[it.id];if(!e)return false;const o=unOrig(it);
  if(Object.keys(e).some(k=>!UN_LIMK.includes(k)&&String(e[k]==null?'':e[k])!==String(o[k]==null?'':o[k])))return true;
  if(!UN_LIMK.some(k=>k in e))return false;const c=unCur(it),L=unLim(it,c,unMerged(it,c));   // เปลี่ยนแค่หน่วยที่แสดง (24 ถุง = 2 ลัง) ไม่นับว่าแก้
  return !!L.err||!unSameQ(L.mn,it.min_qty)||!unSameQ(L.mx,num(it.max_qty)>0?it.max_qty:null);}
function unBaseLock(it){return Math.abs(num(it.qty))>1e-9||(S.recipeItems||[]).some(x=>x.item_id===it.id);}
function unItemErr(it,m,c){ // ข้อผิดพลาดที่ห้ามบันทึก
  if(m.buy_unit&&!(num(m.buy_qty)>0))return t('un_e_buyq',{u:trUnit(m.buy_unit)});
  if(unNeedQ(m,c.count_unit)&&!(num(c.cq)>0))return t('un_e_cq',{u:trUnit(c.count_unit)});
  const bad=itPackUsed(it.id,m);if(bad)return t('un_e_recipe',{u:trUnit(bad.u)});
  return unLim(it,c,m).err;}
function unSel(id,field,opts,cur,dis,blank){return '<select data-id="'+esc(id)+'" data-f="'+field+'" onchange="unEdSel(this)"'+(dis?' disabled':'')+'>'+
  (blank?'<option value="">'+esc(blank)+'</option>':'')+unitOptions(opts,cur)+'</select>';}
function unQin(id,field,v,ro){return '<input type="text" inputmode="decimal" class="un-q" data-id="'+esc(id)+'" data-f="'+field+'" value="'+esc(v==null?'':String(v))+'"'+(ro?' readonly':'')+' oninput="unEdIn(this)" onchange="unEdRepaint(this.dataset.id)">';}
function unCardHtml(it){
  const c=unCur(it),m=unMerged(it,c),a=unItemAdvice(m),K=canKitchen(),lock=unBaseLock(it),base=c.unit,err=UN_ERR[it.id]||'',dirty=unDirty(it),d=unItemDept(it);
  const all=allUnits(),others=all.filter(u=>u!==base);
  const bStd=c.buy_unit&&unitConv(null,c.buy_unit,base)!=null,bq=bStd?unitConv(null,c.buy_unit,base):c.buy_qty;
  const cStd=c.count_unit&&c.count_unit!==base&&!unNeedQ({unit:base,buy_unit:c.buy_unit},c.count_unit),cf=cStd?unitFactor(m,c.count_unit):null;
  let h='<div class="un-row'+(err||a.lv==='bad'?' warn':a.lv==='tip'?' tip':'')+(dirty?' dirty':'')+'" id="unI_'+esc(it.id)+'">'+
    '<div class="un-hd">'+thumbHtml(it,'🥬')+'<div class="grow"><b>'+esc(dispName(it))+'</b>'+
      (d==='both'?' <span class="un-u un-both">🍳🍮 '+esc(t('un_d_both'))+'</span>':'')+(dirty?' <span class="chip warn">'+esc(t('un_dirty'))+'</span>':'')+'</div>'+
      (K?'<button type="button" class="btn gh sm2" data-id="'+esc(it.id)+'" onclick="unItemEdit(this.dataset.id)" aria-label="edit">✏️</button>':'')+'</div>'+
    '<div class="un-ed">'+
      '<label>'+esc(t('un_use'))+'</label><div class="un-f">'+unSel(it.id,'unit',all,base,!K||lock)+(lock?'<span class="xs mut">🔒 '+esc(t('un_lock'))+'</span>':'')+'</div>'+
      '<label>'+esc(t('un_buy_as'))+'</label><div class="un-f">'+unSel(it.id,'buy_unit',others,c.buy_unit,!K,t('un_same_use'))+
        (c.buy_unit?'<span class="un-sz"><span class="un-eq">1 '+esc(trUnit(c.buy_unit))+' =</span>'+unQin(it.id,'buy_qty',bq,!K||bStd)+'<span class="un-eq">'+esc(trUnit(base))+'</span></span>':'')+'</div>'+
      '<label>'+esc(t('un_count_as'))+'</label><div class="un-f">'+unSel(it.id,'count_unit',all,c.count_unit||base,!K)+
        (unNeedQ({unit:base,buy_unit:c.buy_unit},c.count_unit)?'<span class="un-sz"><span class="un-eq">1 '+esc(trUnit(c.count_unit))+' =</span>'+unQin(it.id,'cq',c.cq,!K)+'<span class="un-eq">'+esc(trUnit(base))+'</span></span>':
         (cf!=null&&c.count_unit!==base?'<span class="un-eq mut">= '+fmtQ(cf)+' '+esc(trUnit(base))+'</span>':''))+'</div>'+
      '<label>🎯 '+esc(t('un_lim'))+'</label><div class="un-f un-lim">'+unQin(it.id,'smin',c.smin,!K)+'<span class="un-eq">→</span>'+unQin(it.id,'smax',c.smax,!K||S.itMax===false)+
        unSel(it.id,'su',limUnits(m),limUnits(m).includes(c.su)?c.su:(limUnits(m)[0]||base),!K)+'</div>'+
    '</div>';
  if(err)h+='<div class="un-adv bad">⚠ '+esc(err)+'</div>';
  h+=a.msgs.map(x=>unAdvHtml(x,it.id)).join('');
  return h+'</div>';}
function unItemRows(){const q=supKey(UN_Q),rank={bad:0,tip:1,ok:2};
  return activeItems().map(it=>({it,d:unItemDept(it)})).filter(x=>unInDept(x.d)&&(!q||supKey(x.it.name).includes(q)||supKey(dispName(x.it)).includes(q)))
    .map(x=>Object.assign(x,{a:unItemAdvice(unMerged(x.it))})).filter(x=>!UN_BAD||x.a.lv!=='ok'||unDirty(x.it)||UN_ERR[x.it.id])
    .sort((a,b)=>((UN_ERR[a.it.id]?-1:rank[a.a.lv])-(UN_ERR[b.it.id]?-1:rank[b.a.lv]))||String(dispName(a.it)).localeCompare(String(dispName(b.it)),'th'));}
function unItemCards(){const L=unItemRows();return L.length?L.map(x=>unCardHtml(x.it)).join(''):emptyBox(t('un_none'));}
function unItemsHtml(){
  const every=activeItems().map(it=>({it,d:unItemDept(it)})),bar=unDeptBar(every);
  const all=every.filter(x=>unInDept(x.d)).map(x=>({a:unItemAdvice(unMerged(x.it)),it:x.it})),n={ok:0,tip:0,bad:0};all.forEach(x=>n[x.a.lv]++);
  const tips=all.filter(x=>x.a.msgs.some(m=>m.apply)).length;
  return bar+(S.itMax===false?'<div class="hintbox">⚠ '+esc(t('it_max_need'))+'</div>':'')+searchBox('unQ',v=>unSetQ(v))+'<div class="row un-tools">'+unBadToggle()+
      (tips&&canKitchen()?'<button type="button" class="btn gh sm2" onclick="unApplyAll()">💡 '+esc(t('un_apply_all',{n:tips}))+'</button>':'')+'</div>'+
    '<div class="un-sum">'+esc(t('un_sum',{a:n.ok,b:n.tip,c:n.bad,n:all.length}))+'</div><div id="unList">'+unItemCards()+'</div>';}
function unEdGet(id){return UN_ED[id]=UN_ED[id]||{};}
function unEdSel(el){const id=el.dataset.id,f=el.dataset.f,it=itemById(id);if(!it)return;const e=unEdGet(id),c=unCur(it);e[f]=el.value;
  if(f==='unit'){if(c.buy_unit===el.value)e.buy_unit='';if(c.count_unit===c.unit)e.count_unit=el.value;}
  if(f==='buy_unit'){const s=unitConv(null,el.value,c.unit);e.buy_qty=s!=null?s:'';
    if(c.buy_unit&&c.count_unit===c.buy_unit&&el.value!==c.buy_unit&&num(c.buy_qty)>0){e.count_unit=c.buy_unit;e.cq=c.buy_qty;}}   // นับเป็นหน่วยซื้อเดิม → จำขนาดเดิมไว้ (ถุงเดิม 500 กรัม)
  if(f==='count_unit'){const ex=packsOf(it).find(p=>p.u===el.value);e.cq=ex?ex.q:'';}
  if(f==='su'){const m=unMerged(it,c),fo=unitFactor(m,c.su),fn=unitFactor(m,el.value);   // เปลี่ยนหน่วย = แปลงตัวเลขตาม (24 ถุง → 2 ลัง)
    ['smin','smax'].forEach(k=>{if(fo>0&&fn>0&&String(c[k]==null?'':c[k]).trim()!=='')e[k]=rnd4(num(c[k])*fo/fn);});}
  delete UN_ERR[id];unDraftSave();unEdRepaint(id);}
function unEdIn(el){const e=unEdGet(el.dataset.id);e[el.dataset.f]=el.value;unDraftSave();}
function unEdRepaint(id){const it=itemById(id),old=document.getElementById('unI_'+id);if(!it||!old||!old.isConnected)return;
  const tmp=document.createElement('div');tmp.innerHTML=unCardHtml(it);try{old.replaceWith(tmp.firstChild);}catch(e){}unPin();}   // ช่องที่โฟกัสอยู่ blur ระหว่างวาด = onchange ซ้อน — การ์ดถูกวาดใหม่ไปแล้ว ข้ามได้
function unApply(el){const it=itemById(el.dataset.id);if(!it||!canKitchen())return;const e=unEdGet(it.id),u=el.dataset.u;
  e.count_unit=u;const ex=packsOf(it).find(p=>p.u===u);e.cq=ex?ex.q:'';unDraftSave();unEdRepaint(it.id);}
function unApplyAll(){if(!canKitchen())return;let n=0;
  activeItems().forEach(it=>{if(!unInDept(unItemDept(it)))return;const tip=unItemAdvice(unMerged(it)).msgs.find(m=>m.apply);if(!tip)return;
    const e=unEdGet(it.id);e.count_unit=tip.apply;const ex=packsOf(it).find(p=>p.u===tip.apply);e.cq=ex?ex.q:'';n++;});
  unDraftSave();unPaint();if(n)toast(t('un_applied_n',{n}));}

/* ---------- สินค้า: ตัวคูณหน่วยของสาขา แก้ในการ์ด ---------- */
function unLkCur(x){const e=UN_LK[x.name];return e&&e.rid===x.rid?e.f:x.factor;}
function unProdRows(){const q=supKey(UN_Q);
  return activeRecipes().map(r=>({r,d:unRecDept(r)})).filter(x=>unInDept(x.d)&&(!q||supKey(x.r.name).includes(q)||supKey(dispName(x.r)).includes(q)))
    .map(x=>Object.assign(x,{a:unProdAdvice(x.r)})).filter(x=>!UN_BAD||x.a.lv!=='ok'||x.a.br.some(b=>UN_LK[b.name]))
    .sort((a,b)=>((a.a.lv==='bad'?0:1)-(b.a.lv==='bad'?0:1))||String(dispName(a.r)).localeCompare(String(dispName(b.r)),'th'));}
function unProdCard(r,a){const u=r.yield_unit||'',K=canKitchen();
  let h='<div class="un-row'+(a.lv==='bad'?' warn':'')+'" id="unP_'+esc(r.id)+'"><div class="un-hd">'+thumbHtml(r,'🍳')+'<div class="grow"><b>'+esc(dispName(r))+'</b>'+
    '<div class="xs mut">'+esc(t('un_yield'))+': <b>'+esc(trUnit(u))+'</b></div></div>'+(K?'<button type="button" class="btn gh sm2" data-id="'+esc(r.id)+'" onclick="unProdEdit(this.dataset.id)" aria-label="edit">✏️</button>':'')+'</div>';
  const seen={};
  a.br.forEach(x=>{if(seen[x.name+'|'+x.unit])return;seen[x.name+'|'+x.unit]=1;const f=unLkCur(x),same=x.unit===u;
    h+='<div class="un-br"><span class="un-bn">🏪 '+esc(x.name)+'</span><span class="un-eq">1 '+esc(trUnit(x.unit||u))+' =</span>'+
      '<input type="text" inputmode="decimal" class="un-q" data-n="'+esc(x.name)+'" data-r="'+esc(x.rid)+'" value="'+esc(String(f))+'"'+(K?'':' readonly')+' oninput="unLkIn(this)" onchange="unLkRepaint(this.dataset.r)">'+
      '<span class="un-eq">'+esc(trUnit(u))+'</span>'+(UN_LK[x.name]?'<span class="chip warn">'+esc(t('un_dirty'))+'</span>':'')+'</div>';});
  h+=a.msgs.filter(m=>m.lv==='bad'||m.mut).map(m=>m.mut?'<div class="un-adv xs mut">'+esc(m.txt)+'</div>':'<div class="un-adv bad">⚠ '+esc(m.txt)+'</div>').join('');
  return h+'</div>';}
function unProdCards(){const L=unProdRows();return L.length?L.map(x=>unProdCard(x.r,x.a)).join(''):emptyBox(t('un_none'));}
function unProdsHtml(){
  const every=activeRecipes().map(r=>({r,d:unRecDept(r)})),bar=unDeptBar(every);
  const all=every.filter(x=>unInDept(x.d)).map(x=>({a:unProdAdvice(x.r)})),bad=all.filter(x=>x.a.lv==='bad').length;
  return bar+searchBox('unQ',v=>unSetQ(v))+unBadToggle()+(UN_BR?'':'<div class="spin"></div>')+(UN_BR&&!UN_BR_OK?'<div class="note">'+esc(t('un_noprod'))+'</div>':'')+
    '<div class="un-sum">'+esc(t('un_sum',{a:all.length-bad,b:0,c:bad,n:all.length}))+'</div><div class="xs mut" style="margin-bottom:6px">'+esc(t('un_br_h'))+'</div><div id="unList">'+unProdCards()+'</div>';}
function unLkIn(el){UN_LK[el.dataset.n]={rid:el.dataset.r,f:el.value};unDraftSave();}
function unLkRepaint(rid){const r=recipeById(rid),old=document.getElementById('unP_'+rid);if(!r||!old)return;
  if(!old.isConnected)return;const tmp=document.createElement('div');tmp.innerHTML=unProdCard(r,unProdAdvice(r));try{old.replaceWith(tmp.firstChild);}catch(e){}unPin();}

/* ---------- แถบบันทึกทีเดียว ---------- */
function unChanges(){const items=activeItems().filter(it=>unDirty(it)),links=Object.keys(UN_LK||{});return {items,links,n:items.length+links.length};}
function unPin(){if(S.tab!=='units')return;const c=unChanges();
  if(!c.n||!canKitchen()){pinnedBar(null);return;}
  pinnedBar('<span class="v">'+esc(t('un_pending',{n:c.n}))+'</span><span class="un-acts"><button type="button" class="btn gh" onclick="unDiscard()">'+esc(t('un_discard'))+'</button>'+
    '<button type="button" class="btn" id="unSaveAll" onclick="unSaveAll()">💾 '+esc(t('un_save_n',{n:c.n}))+'</button></span>');}
async function unDiscard(){if(!(await confirm2(t('un_discard_q'))))return;UN_ED={};UN_LK={};UN_ERR={};unDraftSave();unPaint();}
async function unSaveAll(){await once(async()=>{
  if(!canKitchen())return;const c=unChanges();if(!c.n)return;UN_ERR={};let ok=0,bad=0,maxGone=false;
  for(const it of c.items){const cur=unCur(it),m=unMerged(it,cur),e=unItemErr(it,m,cur);if(e){UN_ERR[it.id]=e;bad++;continue;}
    if(m.unit!==it.unit){let hist=true;try{const r=await sb.from('kc_moves').select('id').eq('ref_kind','item').eq('ref_id',it.id).limit(1);hist=!!(r&&(r.error||(r.data||[]).length));}catch(x){}
      if(hist||unBaseLock(it)){UN_ERR[it.id]=t('un_e_base');bad++;continue;}}
    const row={unit:m.unit,buy_unit:m.buy_unit,buy_qty:m.buy_unit?rnd4(num(m.buy_qty)):null,packs:m.packs,count_unit:(m.count_unit&&unitFactor(m,m.count_unit)!=null)?m.count_unit:null};
    if(UN_LIMK.some(k=>k in (UN_ED[it.id]||{}))){const L=unLim(it,cur,m);row.min_qty=L.mn;if(S.itMax!==false&&(L.mx!=null||it.max_qty!=null))row.max_qty=L.mx;}
    try{await itWrite(x=>sb.from('ck_items').update(x).eq('id',it.id),row);}catch(x){UN_ERR[it.id]=String((x&&x.message)||x);bad++;continue;}
    if((itWrite.dropped||[]).includes('max_qty')){delete row.max_qty;maxGone=true;}
    Object.assign(it,row);delete UN_ED[it.id];ok++;}
  for(const name of c.links){const e=UN_LK[name],f=numIn(e&&e.f);if(!(f>0)){bad++;continue;}
    const row={stk_name:name,recipe_id:e.rid,factor:rnd4(f),by_name:S.user&&S.user.name};
    try{await db(()=>sb.from('kc_links').upsert(row,{onConflict:'stk_name'}));}catch(x){bad++;continue;}
    TD_LINKS=(TD_LINKS||[]).filter(x=>supKey(x.stk_name)!==supKey(name)).concat([row]);delete UN_LK[name];ok++;}
  if(ok)UN_BR=null;unDraftSave();
  toast(bad?t('un_saved_bad',{n:ok,b:bad}):maxGone?t('it_max_sql'):t('un_saved',{n:ok}),bad?true:maxGone?'warn':false);
  if(UN_TAB==='prods')await unLoadBranch(true);unPaint();});}
function unUsage(u){let n=0;
  S.items.forEach(it=>{if(it.active===false)return;if(it.unit===u||it.buy_unit===u||it.count_unit===u||(Array.isArray(it.packs)&&it.packs.some(p=>p&&p.u===u)))n++;});
  S.recipes.forEach(r=>{if(r.active!==false&&r.yield_unit===u)n++;});
  (S.recipeItems||[]).forEach(l=>{if(l.unit===u)n++;});return n;}
function unListHtml(){
  const cu=((S.cfg&&S.cfg.units)||[]),boss=isAdminish();
  const std='<div class="un-std">'+UNIT_STD.map(x=>'<div>1 '+esc(trUnit(x[0]))+' = '+fmtI(x[1])+' '+esc(trUnit(x[2]))+'</div>').join('')+'</div>';
  const all='<div class="un-all">'+UNITS.map(u=>{const n=unUsage(u);return '<span class="un-chip">'+esc(trUnit(u))+' <small>'+esc(n?t('un_used',{n}):t('un_unused'))+'</small></span>';}).join('')+'</div>';
  const cust='<div class="un-all" id="unCust">'+(cu.length?cu.map(u=>{const n=unUsage(u);return '<span class="un-chip">'+esc(trUnit(u))+' <small>'+esc(n?t('un_used',{n}):t('un_unused'))+'</small>'+
      (boss?'<button type="button" data-u="'+esc(u)+'" onclick="unDel(this.dataset.u)" aria-label="delete">✕</button>':'')+'</span>';}).join(''):'<span class="mut sm">—</span>')+'</div>'+
    (boss?'<div class="un-add"><input id="unNew" placeholder="'+esc(t('un_ph'))+'" onkeydown="if(event.key===\'Enter\'){event.preventDefault();unAdd()}"><button type="button" class="btn gh" onclick="unAdd()">'+esc(t('un_add'))+'</button></div>':'<div class="xs mut" style="margin-top:6px">'+esc(t('un_boss'))+'</div>');
  return card('🔁 '+esc(t('un_std_t')),std)+card('📏 '+esc(t('un_custom_t')),'<div class="sm mut" style="margin-bottom:8px">'+esc(t('un_custom_h'))+'</div>'+cust)+card('📚 '+esc(t('un_all_t')),all);}

/* ---------- การกระทำ ---------- */
function unBack(){if(S.tab==='units')show('units');}
function unItemEdit(id){if(!canKitchen())return;if(UN_ED&&UN_ED[id]){delete UN_ED[id];unDraftSave();}itEdit(id,{back:unBack});}   // ฟอร์มเต็มชนะร่างในการ์ด
function unProdEdit(id){if(!canKitchen())return;mnEdit(id);}
function unLinkFix(el){sdLinkPickFor(el.dataset.n,el.dataset.u,null);MODAL_BACK=()=>{UN_BR=null;unBack();};}
async function unAdd(){await once(async()=>{
  if(!isAdminish()){toast(t('un_boss'),true);return;}
  const inp=document.getElementById('unNew'),u=String((inp&&inp.value)||'').trim();if(!u)return;
  if(/[<>"'&\\]/.test(u)||u.length>24){toast(t('st_unit_bad'),true);return;}   // กติกาเดียวกับหน้าตั้งค่าเดิม (กันอักขระ HTML)
  const cur=((S.cfg&&S.cfg.units)||[]);if(UNITS.includes(u)||cur.includes(u)){toast(t('un_dup'),true);return;}
  try{await cfgSave({units:cur.concat([u])});}catch(e){return;}
  toast(t('un_added'));unPaint();});}
async function unDel(u){
  if(!isAdminish()){toast(t('un_boss'),true);return;}
  const n=unUsage(u);if(n){toast(t('un_del_used',{n}),true);return;}
  if(!(await confirm2(t('un_del_q',{u:trUnit(u)}),{danger:true})))return;
  await once(async()=>{try{await cfgSave({units:((S.cfg&&S.cfg.units)||[]).filter(x=>x!==u)});}catch(e){return;}toast(t('un_deleted'));unPaint();});}
