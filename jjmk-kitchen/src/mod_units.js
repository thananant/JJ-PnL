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
th:{un_g7:'📌 ตัวอย่าง: ซื้อเป็น กก. · ใช้ในสูตรเป็นกรัม · นับเป็นถุง → หน่วยหลัก = กรัม (เล็กสุดที่ใช้) · หน่วยซื้อ = กก. (ระบบรู้เองว่า 1 กก. = 1,000 กรัม) · บรรจุอื่น = ถุง ใส่ว่า 1 ถุง = กี่กรัม · หน่วยนับ = ถุง',un_d_all:'ทุกแผนก',un_d_main:'🍳 ครัวกลาง',un_d_dessert:'🍮 ของหวาน',un_d_both:'ใช้ทั้ง 2 แผนก',nav_units:'หน่วย',un_sub:'จัดการหน่วยทั้งหมดในที่เดียว — ระบบบอกว่าส่วนไหนใช้หน่วยเดียวกันได้ ส่วนไหนเป็นหน่วยเฉพาะหน้า',
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
en:{un_g7:'📌 Example: bought in kg · used in g · counted in bags → base unit = g (the smallest you use) · buying unit = kg (the app knows 1 kg = 1,000 g) · other pack = bag, enter 1 bag = ? g · count unit = bag',un_d_all:'All sections',un_d_main:'🍳 Central kitchen',un_d_dessert:'🍮 Desserts',un_d_both:'Used by both sections',nav_units:'Units',un_sub:'Manage every unit in one place — the app shows which units can be shared and which belong to one page only',
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
lo:{un_g7:'📌 ຕົວຢ່າງ: ຊື້ເປັນ ກິໂລ · ໃຊ້ໃນສູດເປັນກຣາມ · ນັບເປັນຖົງ → ຫົວໜ່ວຍຫຼັກ = ກຣາມ · ຫົວໜ່ວຍຊື້ = ກິໂລ (ລະບົບຮູ້ເອງວ່າ 1 ກິໂລ = 1,000 ກຣາມ) · ບັນຈຸອື່ນ = ຖົງ ໃສ່ວ່າ 1 ຖົງ = ຈັກກຣາມ · ຫົວໜ່ວຍນັບ = ຖົງ',un_d_all:'ທຸກພະແນກ',un_d_main:'🍳 ຄົວກາງ',un_d_dessert:'🍮 ຂອງຫວານ',un_d_both:'ໃຊ້ທັງ 2 ພະແນກ',nav_units:'ຫົວໜ່ວຍ',un_sub:'ຈັດການຫົວໜ່ວຍທັງໝົດໃນບ່ອນດຽວ — ລະບົບບອກວ່າສ່ວນໃດໃຊ້ຫົວໜ່ວຍດຽວກັນໄດ້ ສ່ວນໃດເປັນຫົວໜ່ວຍສະເພາະໜ້າ',
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
my:{un_g7:'📌 ဥပမာ: ကီလိုဖြင့်ဝယ် · နည်းတွင် ဂရမ်ဖြင့်သုံး · အိတ်ဖြင့်ရေတွက် → အဓိကယူနစ် = ဂရမ် · ဝယ်ယူနစ် = ကီလို (1 ကီလို = 1,000 ဂရမ် အလိုအလျောက်သိ) · အခြားထုပ် = အိတ်၊ 1 အိတ် = ဂရမ် ဘယ်လောက် ထည့် · ရေတွက်ယူနစ် = အိတ်',un_d_all:'ဌာနအားလုံး',un_d_main:'🍳 ဗဟိုမီးဖိုချောင်',un_d_dessert:'🍮 အချိုပွဲ',un_d_both:'ဌာန ၂ ခုလုံး သုံး',nav_units:'ယူနစ်',un_sub:'ယူနစ်အားလုံးကို တစ်နေရာတည်းတွင် စီမံ — ဘယ်အပိုင်းက ယူနစ်တူသုံးနိုင်ပြီး ဘယ်အပိုင်းက စာမျက်နှာသီးသန့်လဲ ပြပေးသည်',
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
  br.forEach(x=>{const f=num(x.factor)||1;
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

/* ---------- หน้า ---------- */
RENDER.units=function(el){
  const tabs=[{k:'items',lb:t('un_t_items')},{k:'prods',lb:t('un_t_prods')},{k:'list',lb:t('un_t_list')}];
  el.innerHTML=dhead('📏 '+t('nav_units'))+'<div class="un-sub">'+esc(t('un_sub'))+'</div>'+
    '<details class="un-guide"'+(LS.get('jjck_un_g')===0?'':' open')+' ontoggle="try{LS.set(\'jjck_un_g\',this.open?1:0)}catch(e){}"><summary>'+esc(t('un_guide_t'))+'</summary><ul>'+
      ['un_g1','un_g2','un_g3','un_g4','un_g5','un_g6','un_g7'].map(k=>'<li>'+esc(t(k))+'</li>').join('')+'</ul></details>'+
    '<div id="unTabs">'+pillBar(tabs,UN_TAB,'unSetTab',{scroll:true})+'</div><div id="unBody"></div>';
  unPaint();
  if(UN_TAB==='prods')unLoadBranch().then(()=>{if(S.tab==='units'&&UN_TAB==='prods')unPaint();});
};
function unSetTab(k){UN_TAB=k;unSaveUi();document.querySelectorAll('#unTabs .pill').forEach(b=>b.classList.toggle('on',b.dataset.k===k));unPaint();
  if(k==='prods')unLoadBranch().then(()=>{if(S.tab==='units'&&UN_TAB==='prods')unPaint();});}
function unSetBad(){UN_BAD=!UN_BAD;unSaveUi();unPaint();}
function unPaint(){const b=document.getElementById('unBody');if(!b)return;
  b.innerHTML=UN_TAB==='items'?unItemsHtml():UN_TAB==='prods'?unProdsHtml():unListHtml();}
function unBadToggle(){return '<label class="row" style="gap:8px;margin:4px 0 8px;min-height:44px;cursor:pointer"><input type="checkbox" id="unBad"'+(UN_BAD?' checked':'')+' onchange="unSetBad()" style="width:22px;height:22px"> '+esc(t('un_only_bad'))+'</label>';}
function unAdvHtml(m){return '<div class="un-adv '+m.lv+'">'+(m.lv==='ok'?'✓ ':m.lv==='tip'?'💡 ':'⚠ ')+esc(m.txt)+
  (m.apply&&canKitchen()?'<button type="button" class="btn sm2 gh" data-u="'+esc(m.apply)+'" onclick="event.stopPropagation();unApply(this)">'+esc(t('un_apply'))+'</button>':'')+
  (m.link&&canKitchen()&&m.lv==='bad'?'<button type="button" class="btn sm2 gh" data-n="'+esc(m.link.name)+'" data-u="'+esc(m.link.unit)+'" onclick="event.stopPropagation();unLinkFix(this)">'+esc(t('un_fix'))+'</button>':'')+'</div>';}
function unItemsHtml(){
  const every=activeItems().map(it=>({it,d:unItemDept(it)})),bar=unDeptBar(every);
  const all=every.filter(x=>unInDept(x.d)).map(x=>({it:x.it,d:x.d,a:unItemAdvice(x.it)})),n={ok:0,tip:0,bad:0};all.forEach(x=>n[x.a.lv]++);
  const rank={bad:0,tip:1,ok:2};
  const L=all.filter(x=>!UN_BAD||x.a.lv!=='ok').sort((a,b)=>(rank[a.a.lv]-rank[b.a.lv])||String(dispName(a.it)).localeCompare(String(dispName(b.it)),'th'));
  let h=bar+unBadToggle()+'<div class="un-sum">'+esc(t('un_sum',{a:n.ok,b:n.tip,c:n.bad,n:all.length}))+'</div>';
  if(!all.length)return h+emptyBox(t('un_none'));
  if(!L.length)return h+'<div class="okbox">'+esc(t('un_allok'))+'</div>';
  return h+L.map(({it,a,d})=>{const base=it.unit||'',bu=it.buy_unit&&it.buy_unit!==base?it.buy_unit:'',cu=countUnitOf(it);
    const packs=packsOf(it).filter(p=>p.u!==bu);
    return '<div class="un-row'+(a.lv==='bad'?' warn':a.lv==='tip'?' tip':'')+'" id="unI_'+esc(it.id)+'"><div class="un-hd" data-id="'+esc(it.id)+'" onclick="unItemEdit(this.dataset.id)">'+thumbHtml(it,'🥬')+
      '<div class="grow"><b>'+esc(dispName(it))+'</b><div class="un-us">'+
      '<span class="un-u"><i>'+esc(t('un_base'))+'</i>'+esc(trUnit(base))+'</span>'+
      (bu?'<span class="un-u"><i>'+esc(t('un_buy'))+'</i>'+esc(trUnit(bu))+(unitFactor(it,bu)!=null?' = '+fmtQ(unitFactor(it,bu))+' '+esc(trUnit(base)):' = ?')+'</span>':'')+
      '<span class="un-u"><i>'+esc(t('un_count'))+'</i>'+esc(trUnit(cu))+'</span>'+
      (packs.length?'<span class="un-u"><i>'+esc(t('un_packs'))+'</i>'+packs.map(p=>esc(trUnit(p.u))+' = '+fmtQ(p.q)+' '+esc(trUnit(base))).join(' · ')+'</span>':'')+
      (d==='both'?'<span class="un-u un-both">🍳🍮 '+esc(t('un_d_both'))+'</span>':(!UN_DEPT&&d==='dessert')?'<span class="un-u un-both">'+esc(t('un_d_dessert'))+'</span>':'')+
      '</div></div><span class="mut">›</span></div>'+a.msgs.map(unAdvHtml).join('')+'</div>';}).join('');}
function unProdsHtml(){
  const every=activeRecipes().map(r=>({r,d:unRecDept(r)})),bar=unDeptBar(every);
  const all=every.filter(x=>unInDept(x.d)).map(x=>({r:x.r,a:unProdAdvice(x.r)})),bad=all.filter(x=>x.a.lv==='bad').length;
  const L=all.filter(x=>!UN_BAD||x.a.lv!=='ok').sort((a,b)=>((a.a.lv==='bad'?0:1)-(b.a.lv==='bad'?0:1))||String(dispName(a.r)).localeCompare(String(dispName(b.r)),'th'));
  let h=bar+unBadToggle()+(UN_BR?'':'<div class="spin"></div>')+(UN_BR&&!UN_BR_OK?'<div class="note">'+esc(t('un_noprod'))+'</div>':'')+
    '<div class="un-sum">'+esc(t('un_sum',{a:all.length-bad,b:0,c:bad,n:all.length}))+'</div>';
  if(!all.length)return h+emptyBox(t('un_none'));
  if(!L.length)return h+'<div class="okbox">'+esc(t('un_allok'))+'</div>';
  return h+L.map(({r,a})=>{const bus=[...new Set(a.br.map(x=>x.unit).filter(Boolean))];
    return '<div class="un-row'+(a.lv==='bad'?' warn':'')+'" id="unP_'+esc(r.id)+'"><div class="un-hd" data-id="'+esc(r.id)+'" onclick="unProdEdit(this.dataset.id)">'+thumbHtml(r,'🍳')+
      '<div class="grow"><b>'+esc(dispName(r))+'</b><div class="un-us"><span class="un-u"><i>'+esc(t('un_yield'))+'</i>'+esc(trUnit(r.yield_unit||''))+'</span>'+
      (bus.length?'<span class="un-u"><i>'+esc(t('un_branch'))+'</i>'+bus.map(u=>esc(trUnit(u))).join(' · ')+'</span>':'')+'</div></div><span class="mut">›</span></div>'+
      a.msgs.map(m=>m.mut?'<div class="un-adv xs mut">'+esc(m.txt)+'</div>':unAdvHtml(m)).join('')+'</div>';}).join('');}
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
function unItemEdit(id){if(!canKitchen())return;itEdit(id,{back:unBack});}
function unProdEdit(id){if(!canKitchen())return;mnEdit(id);}
function unLinkFix(el){sdLinkPickFor(el.dataset.n,el.dataset.u,null);MODAL_BACK=()=>{UN_BR=null;unBack();};}
async function unApply(el){await once(async()=>{
  const u=el.dataset.u,row=el.closest('.un-row'),id=row&&row.id.replace(/^unI_/,''),it=itemById(id);if(!it||!u||!canKitchen())return;
  if(unitFactor(it,u)==null)return;
  try{await db(()=>sb.from('ck_items').update({count_unit:u}).eq('id',id));}catch(e){return;}
  it.count_unit=u;toast(t('un_applied',{u:trUnit(u)}));unPaint();});}
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
