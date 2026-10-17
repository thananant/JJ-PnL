/* ============================================================
   📖 เมนู/สูตร — menus (mn*)
   การ์ดสินค้า (รูป · ได้/รอบ · สต๊อก · ต้นทุนถัวเฉลี่ยจริง · ล็อตล่าสุด · ราคาขายสาขา) + ฟอร์ม (ชื่อ หมวด ได้กี่/รอบ+หน่วย
   บวกกำไร % · สต๊อกที่ควรมี · ค่าอื่นต่อรอบ · รูป · วิธีทำ (#/*) · ส่วนผสม: เลือกวัตถุดิบ + จำนวน + หน่วยที่แปลงได้ → หน่วยหลัก + ต้นทุน ณ ราคาปัจจุบัน)
   + 🗄️ ไม่ใช้แล้ว + 📈 ต้นทุนรายล็อต (kc_productions)
   🎯 Safety / Max ของสินค้าแต่ละตัว (เจ้าของสั่ง 2026-10-17 "หน้าตั้ง safety/max ของสินค้า แต่ละตัว") = มุมมองในแท็บนี้ (MN_VIEW='target' · จำใน localStorage jjck_mnview · ‹ กลับ = การ์ดเมนู)
     1 แถว/สินค้า: รูป · ตอนนี้มี · ส่งเฉลี่ย/วัน 14 วัน (MK_ORD ของ 🍳 — ชุดเดียวกัน) · ช่อง Safety [target_qty] · Max [max_qty] · หรือ N วัน [target_days] · "ต้องทำเติม" สด
     บันทึกเองเมื่อแก้ (debounce 600 มิลลิวินาที · เขียนทีละแถวต่อกัน `mnTgFlush` กันผลเขียนเก่าทับใหม่ · ว่าง = null · ติดลบ/ไม่ใช่ตัวเลข = ไม่บันทึก + ขอบแดง)
     สูตร `mnTargetCalc(r,stock,daily)` ที่เดียว ใช้ร่วมกับ 🍳 mkNeeds + ☀️ tdPaintRefill: Safety = target_qty หรือ target_days × ยอดส่งเฉลี่ย · สต๊อก < Safety → ต้องเติม = max(Max,Safety) − สต๊อก (Max ว่าง = Safety)
     ยังไม่รัน SQL รุ่นล่าสุด (ไม่มีคอลัมน์ max_qty · 42703/PGRST204) = S.kcMax=false ตรวจครั้งเดียว (`mnTgProbe`) → เขียนใหม่โดยไม่มี max_qty + แถบ mn_tg_sql + ช่อง Max ปิด — ช่องอื่นบันทึกได้ปกติ
   กติกาเจ้าของ: สูตร/วิธีทำ/รูปคงเดิม · ราคาสินค้า = ต้นทุนจริงของล็อตที่ทำ (avg_cost/unit_cost มาจากหน้า 🍳 ทำของ) — หน้านี้ไม่กรอกราคาเอง
   ร่างฟอร์มเก็บ localStorage (jjck_mn_draft) — ลากหน้าลงรีเฟรชแล้วไม่หาย
   ============================================================ */
I18N.add({
th:{mn_new:'เพิ่มเมนู',mn_edit:'แก้เมนู',mn_n:'{n} เมนู',mn_none:'ยังไม่มีเมนู — กด ➕ เพิ่มเมนู',mn_no_match:'ไม่พบเมนูที่ค้นหา',
  mn_off_chip:'ไม่ใช้แล้ว',mn_off_none:'ไม่มีเมนูที่ไม่ใช้แล้ว',mn_off_view:'เมนูที่ไม่ใช้แล้ว — กด "↩️ ใช้ต่อ" เพื่อเอากลับมา',mn_restore:'↩️ ใช้ต่อ',mn_off_btn:'🗄️ ไม่ใช้แล้ว',
  mn_off_q:'ซ่อน "{n}" เพราะไม่ใช้แล้ว?\nจะไม่ขึ้นในหน้าทำของ ส่งสาขา และนับของ — สูตร/ประวัติยังอยู่ กด "↩️ ใช้ต่อ" ได้ทุกเมื่อ',mn_off_stock:'📦 ยังมีของเหลือ {q} {u}',mn_off_done:'ซ่อนแล้ว 🗄️',mn_restored:'กลับมาใช้แล้ว ✅',
  mn_name:'ชื่อเมนู (ภาษาไทย — ระบบแปลให้อัตโนมัติ)',mn_cat:'หมวด',mn_cat_new:'＋ หมวดใหม่',mn_cat_new_ph:'ชื่อหมวดใหม่',
  mn_yield:'ทำ 1 รอบ ได้',mn_yield_hint:'เช่น 1 รอบ = 10 ถุง · ต้นทุน/ราคาขายคิดต่อหน่วยนี้',mn_lot_eq:'1 รอบ = {q} {u}',mn_per_lot:'/รอบ',
  mn_markup:'บวกกำไร % (ราคาขายสาขา)',mn_markup_def:'ว่าง = ใช้ค่ากลาง {p}%',mn_sell:'ราคาขายสาขา',
  mn_target:'สต๊อกสำเร็จรูปที่ควรมี',mn_target_qty:'จำนวนตายตัว',mn_target_days:'หรือ = กี่วันของยอดส่งเฉลี่ย',mn_target_hint:'ต่ำกว่านี้จะขึ้นใน 🍳 ทำของ → 🔄 เติม',
  mn_extra:'ค่าอื่นต่อรอบ (แก๊ส/น้ำ/ถุง) บาท',mn_method:'📝 วิธีทำ',mn_method_edit:'แก้วิธีทำ',mn_method_ok:'เสร็จ — ดูแบบขั้นตอน',mn_method_tip:'1 บรรทัด = 1 ขั้น · ขึ้นต้นด้วย # = หัวข้อ · ขึ้นต้นด้วย * = เคล็ดลับ · ตัวเลขเป็นของ 1 รอบ',mn_method_ph:'# เตรียมก่อนทำ\nปอกกระเทียม\n# วิธีทำ\nต้มน้ำปลา+น้ำตาล\n* ชิมก่อนบรรจุ',
  mn_bom:'🥬 ส่วนผสมต่อ 1 รอบ',mn_bom_add:'＋ เพิ่มส่วนผสม',mn_bom_none:'ยังไม่มีส่วนผสม — กด ＋ เพิ่มส่วนผสม',mn_lines_n:'{n} อย่าง',
  mn_pick_t:'เลือกวัตถุดิบ',mn_pick_none:'ไม่พบวัตถุดิบ',mn_pick_new:'➕ วัตถุดิบใหม่ (ไปที่ 🥬 วัตถุดิบ)',mn_line_eq:'= {q} {u}',mn_line_bad:'หน่วยนี้แปลงเป็น {u} ไม่ได้',mn_line_qty:'จำนวน',
  mn_cost_t:'💰 ต้นทุนต่อรอบ (ราคาวัตถุดิบปัจจุบัน)',mn_cost_items:'ส่วนผสม',mn_cost_extra:'ค่าอื่น',mn_cost_oh:'ค่าใช้จ่ายแฝง',mn_cost_total:'รวม/รอบ',mn_cost_unit:'ต่อ {u}',
  mn_cost_missing:'ยังไม่มีราคา: {list} — จะได้ราคาเมื่อรับของครั้งแรก',
  mn_real_t:'ต้นทุนจริง (จากล็อตที่ทำ)',mn_real_avg:'ถัวเฉลี่ย',mn_real_last:'ล็อตล่าสุด',mn_real_none:'ยังไม่เคยทำ — ต้นทุนจริงจะมาเมื่อทำของครั้งแรก',mn_by_recipe:'ตามสูตร',
  mn_lots:'📈 ต้นทุนรายล็อต',mn_lots_t:'ต้นทุนรายล็อต',mn_lots_none:'ยังไม่เคยทำเมนูนี้',mn_col_lots:'รอบ',mn_col_got:'ได้',mn_col_items:'ส่วนผสม',mn_col_total:'รวม',mn_col_unit:'ต่อหน่วย',
  mn_dup:'มีเมนูชื่อนี้อยู่แล้ว',mn_del:'🗑 ลบถาวร',mn_del_q:'ลบ "{n}" ถาวร?\nใช้เฉพาะเมนูที่เพิ่มผิด — ถ้าเลิกทำให้กด "ไม่ใช้แล้ว" แทน',
  mn_draft:'📝 กู้ร่างที่ค้างไว้ให้แล้ว',mn_draft_drop:'ทิ้งร่าง',mn_photo:'📷 ใส่รูป / เปลี่ยนรูป',
  mn_need_yield:'ใส่จำนวนที่ได้ต่อรอบ (มากกว่า 0)',mn_need_qty:'ส่วนผสม "{n}" ยังไม่ได้ใส่จำนวน',mn_need_item:'มีแถวส่วนผสมที่ยังไม่ได้เลือกวัตถุดิบ',
  mn_unit_lost:'ยังไม่ได้รัน SQL — หน่วยของส่วนผสมถูกแปลงเป็นหน่วยหลักก่อนบันทึก',mn_make:'🍳 ทำของ',mn_stock:'ในสต๊อก',mn_price_rule:'ราคาสินค้า = ต้นทุนจริงของล็อตที่ทำ + ค่าใช้จ่ายแฝง (ตั้งที่ 💰 บัญชี) — ไม่ต้องกรอกราคาที่นี่',mn_lock:'🔒 เปลี่ยนหน่วยของสินค้าไม่ได้ — {why} (สต๊อก/ต้นทุน/บิลเก็บเป็นหน่วยนี้)',mn_lock_stock:'ยังมีสต๊อก {q} {u} — ปรับเป็น 0 ก่อน',mn_lock_hist:'มีประวัติทำของ/ส่งแล้ว',mn_lock_link:'ผูกกับสินค้าของสาขาไว้แล้ว',mn_lines_fail:'บันทึกส่วนผสมไม่สำเร็จ — สูตรเดิมยังอยู่ ลองใหม่อีกครั้ง',mn_lines_lost:'บันทึกส่วนผสมไม่สำเร็จ — กด 💾 อีกครั้งเมื่อเน็ตกลับมา (ส่วนผสมยังอยู่ในฟอร์ม)'},
en:{mn_new:'Add menu',mn_edit:'Edit menu',mn_n:'{n} menus',mn_none:'No menus yet — tap ➕ Add menu',mn_no_match:'No menu matches the search',
  mn_off_chip:'Not used',mn_off_none:'No hidden menus',mn_off_view:'Menus no longer used — tap "↩️ Use again" to bring one back',mn_restore:'↩️ Use again',mn_off_btn:'🗄️ Not used',
  mn_off_q:'Hide "{n}" as no longer used?\nIt will not show on Produce, Deliver and Count — recipe/history stay, tap "↩️ Use again" any time',mn_off_stock:'📦 Still in stock {q} {u}',mn_off_done:'Hidden 🗄️',mn_restored:'Back in use ✅',
  mn_name:'Menu name (Thai — translated automatically)',mn_cat:'Category',mn_cat_new:'＋ New category',mn_cat_new_ph:'New category name',
  mn_yield:'One lot makes',mn_yield_hint:'e.g. 1 lot = 10 bags · cost/price are per this unit',mn_lot_eq:'1 lot = {q} {u}',mn_per_lot:'/lot',
  mn_markup:'Markup % (branch price)',mn_markup_def:'blank = default {p}%',mn_sell:'Branch price',
  mn_target:'Finished stock to keep',mn_target_qty:'Fixed quantity',mn_target_days:'or = days of average sending',mn_target_hint:'Below this it shows in 🍳 Produce → 🔄 Refill',
  mn_extra:'Other cost per lot (gas/water/bags) THB',mn_method:'📝 Method',mn_method_edit:'Edit method',mn_method_ok:'Done — show as steps',mn_method_tip:'1 line = 1 step · start with # = heading · start with * = tip · numbers are for 1 lot',mn_method_ph:'# Prepare\nPeel garlic\n# Method\nBoil fish sauce + sugar\n* Taste before packing',
  mn_bom:'🥬 Ingredients per lot',mn_bom_add:'＋ Add ingredient',mn_bom_none:'No ingredients yet — tap ＋ Add ingredient',mn_lines_n:'{n} items',
  mn_pick_t:'Pick an ingredient',mn_pick_none:'No ingredient found',mn_pick_new:'➕ New ingredient (go to 🥬 Ingredients)',mn_line_eq:'= {q} {u}',mn_line_bad:'This unit cannot convert to {u}',mn_line_qty:'Qty',
  mn_cost_t:'💰 Cost per lot (current ingredient prices)',mn_cost_items:'Ingredients',mn_cost_extra:'Other',mn_cost_oh:'Overhead',mn_cost_total:'Total/lot',mn_cost_unit:'per {u}',
  mn_cost_missing:'No price yet: {list} — set after the first receipt',
  mn_real_t:'Actual cost (from lots made)',mn_real_avg:'Average',mn_real_last:'Last lot',mn_real_none:'Never produced — actual cost appears after the first lot',mn_by_recipe:'by recipe',
  mn_lots:'📈 Cost per lot',mn_lots_t:'Cost per lot',mn_lots_none:'This menu has never been produced',mn_col_lots:'Lots',mn_col_got:'Got',mn_col_items:'Ingredients',mn_col_total:'Total',mn_col_unit:'Per unit',
  mn_dup:'A menu with this name already exists',mn_del:'🗑 Delete permanently',mn_del_q:'Delete "{n}" permanently?\nOnly for menus added by mistake — if it is no longer made, tap "Not used" instead',
  mn_draft:'📝 Unsaved draft restored',mn_draft_drop:'Discard draft',mn_photo:'📷 Add / change photo',
  mn_need_yield:'Enter the quantity per lot (more than 0)',mn_need_qty:'Ingredient "{n}" has no quantity',mn_need_item:'An ingredient row has no item selected',
  mn_unit_lost:'SQL not run yet — ingredient units were converted to the base unit before saving',mn_make:'🍳 Produce',mn_stock:'In stock',mn_price_rule:'Product price = actual cost of the lot made + overhead (set in 💰 Accounts) — no price to type here',mn_lock:'🔒 Product unit cannot change — {why} (stock, costs and bills are stored in it)',mn_lock_stock:'still {q} {u} in stock — set it to 0 first',mn_lock_hist:'has production/delivery history',mn_lock_link:'linked to a branch product',mn_lines_fail:'Ingredients NOT saved — the old recipe is kept, please try again',mn_lines_lost:'Ingredients NOT saved — tap 💾 again when the network is back (they are still in the form)'},
lo:{mn_new:'ເພີ່ມເມນູ',mn_edit:'ແກ້ເມນູ',mn_n:'{n} ເມນູ',mn_none:'ຍັງບໍ່ມີເມນູ — ກົດ ➕ ເພີ່ມເມນູ',mn_no_match:'ບໍ່ພົບເມນູທີ່ຄົ້ນຫາ',
  mn_off_chip:'ບໍ່ໃຊ້ແລ້ວ',mn_off_none:'ບໍ່ມີເມນູທີ່ບໍ່ໃຊ້ແລ້ວ',mn_off_view:'ເມນູທີ່ບໍ່ໃຊ້ແລ້ວ — ກົດ "↩️ ໃຊ້ຕໍ່" ເພື່ອເອົາກັບມາ',mn_restore:'↩️ ໃຊ້ຕໍ່',mn_off_btn:'🗄️ ບໍ່ໃຊ້ແລ້ວ',
  mn_off_q:'ເຊື່ອງ "{n}" ເພາະບໍ່ໃຊ້ແລ້ວ?\nຈະບໍ່ຂຶ້ນໃນໜ້າເຮັດເຄື່ອງ ສົ່ງສາຂາ ແລະນັບ — ສູດ/ປະຫວັດຍັງຢູ່ ກົດ "↩️ ໃຊ້ຕໍ່" ໄດ້ທຸກເວລາ',mn_off_stock:'📦 ຍັງມີເຄື່ອງເຫຼືອ {q} {u}',mn_off_done:'ເຊື່ອງແລ້ວ 🗄️',mn_restored:'ກັບມາໃຊ້ແລ້ວ ✅',
  mn_name:'ຊື່ເມນູ (ພາສາໄທ — ລະບົບແປໃຫ້ອັດຕະໂນມັດ)',mn_cat:'ໝວດ',mn_cat_new:'＋ ໝວດໃໝ່',mn_cat_new_ph:'ຊື່ໝວດໃໝ່',
  mn_yield:'ເຮັດ 1 ຮອບ ໄດ້',mn_yield_hint:'ເຊັ່ນ 1 ຮອບ = 10 ຖົງ · ຕົ້ນທຶນ/ລາຄາຂາຍຄິດຕໍ່ຫົວໜ່ວຍນີ້',mn_lot_eq:'1 ຮອບ = {q} {u}',mn_per_lot:'/ຮອບ',
  mn_markup:'ບວກກຳໄລ % (ລາຄາຂາຍສາຂາ)',mn_markup_def:'ຫວ່າງ = ໃຊ້ຄ່າກາງ {p}%',mn_sell:'ລາຄາຂາຍສາຂາ',
  mn_target:'ສະຕັອກສຳເລັດຮູບທີ່ຄວນມີ',mn_target_qty:'ຈຳນວນຕາຍຕົວ',mn_target_days:'ຫຼື = ຈັກມື້ຂອງຍອດສົ່ງສະເລ່ຍ',mn_target_hint:'ຕ່ຳກວ່ານີ້ຈະຂຶ້ນໃນ 🍳 ເຮັດເຄື່ອງ → 🔄 ເຕີມ',
  mn_extra:'ຄ່າອື່ນຕໍ່ຮອບ (ແກັສ/ນ້ຳ/ຖົງ) ບາດ',mn_method:'📝 ວິທີເຮັດ',mn_method_edit:'ແກ້ວິທີເຮັດ',mn_method_ok:'ແລ້ວ — ເບິ່ງແບບຂັ້ນຕອນ',mn_method_tip:'1 ແຖວ = 1 ຂັ້ນ · ຂຶ້ນຕົ້ນດ້ວຍ # = ຫົວຂໍ້ · ຂຶ້ນຕົ້ນດ້ວຍ * = ເຄັດລັບ · ຕົວເລກເປັນຂອງ 1 ຮອບ',mn_method_ph:'# ກຽມກ່ອນເຮັດ\nປອກຜັກທຽມ\n# ວິທີເຮັດ\nຕົ້ມນ້ຳປາ+ນ້ຳຕານ\n* ຊີມກ່ອນບັນຈຸ',
  mn_bom:'🥬 ສ່ວນປະສົມຕໍ່ 1 ຮອບ',mn_bom_add:'＋ ເພີ່ມສ່ວນປະສົມ',mn_bom_none:'ຍັງບໍ່ມີສ່ວນປະສົມ — ກົດ ＋ ເພີ່ມສ່ວນປະສົມ',mn_lines_n:'{n} ຢ່າງ',
  mn_pick_t:'ເລືອກວັດຖຸດິບ',mn_pick_none:'ບໍ່ພົບວັດຖຸດິບ',mn_pick_new:'➕ ວັດຖຸດິບໃໝ່ (ໄປທີ່ 🥬 ວັດຖຸດິບ)',mn_line_eq:'= {q} {u}',mn_line_bad:'ຫົວໜ່ວຍນີ້ແປງເປັນ {u} ບໍ່ໄດ້',mn_line_qty:'ຈຳນວນ',
  mn_cost_t:'💰 ຕົ້ນທຶນຕໍ່ຮອບ (ລາຄາວັດຖຸດິບປັດຈຸບັນ)',mn_cost_items:'ສ່ວນປະສົມ',mn_cost_extra:'ຄ່າອື່ນ',mn_cost_oh:'ຄ່າໃຊ້ຈ່າຍແຝງ',mn_cost_total:'ລວມ/ຮອບ',mn_cost_unit:'ຕໍ່ {u}',
  mn_cost_missing:'ຍັງບໍ່ມີລາຄາ: {list} — ຈະໄດ້ລາຄາເມື່ອຮັບເຄື່ອງຄັ້ງທຳອິດ',
  mn_real_t:'ຕົ້ນທຶນຈິງ (ຈາກລັອດທີ່ເຮັດ)',mn_real_avg:'ສະເລ່ຍ',mn_real_last:'ລັອດລ່າສຸດ',mn_real_none:'ຍັງບໍ່ເຄີຍເຮັດ — ຕົ້ນທຶນຈິງຈະມາເມື່ອເຮັດເຄື່ອງຄັ້ງທຳອິດ',mn_by_recipe:'ຕາມສູດ',
  mn_lots:'📈 ຕົ້ນທຶນລາຍລັອດ',mn_lots_t:'ຕົ້ນທຶນລາຍລັອດ',mn_lots_none:'ຍັງບໍ່ເຄີຍເຮັດເມນູນີ້',mn_col_lots:'ຮອບ',mn_col_got:'ໄດ້',mn_col_items:'ສ່ວນປະສົມ',mn_col_total:'ລວມ',mn_col_unit:'ຕໍ່ຫົວໜ່ວຍ',
  mn_dup:'ມີເມນູຊື່ນີ້ຢູ່ແລ້ວ',mn_del:'🗑 ລຶບຖາວອນ',mn_del_q:'ລຶບ "{n}" ຖາວອນ?\nໃຊ້ສະເພາະເມນູທີ່ເພີ່ມຜິດ — ຖ້າເລີກເຮັດໃຫ້ກົດ "ບໍ່ໃຊ້ແລ້ວ" ແທນ',
  mn_draft:'📝 ກູ້ຮ່າງທີ່ຄ້າງໄວ້ໃຫ້ແລ້ວ',mn_draft_drop:'ຖິ້ມຮ່າງ',mn_photo:'📷 ໃສ່ຮູບ / ປ່ຽນຮູບ',
  mn_need_yield:'ໃສ່ຈຳນວນທີ່ໄດ້ຕໍ່ຮອບ (ຫຼາຍກວ່າ 0)',mn_need_qty:'ສ່ວນປະສົມ "{n}" ຍັງບໍ່ໄດ້ໃສ່ຈຳນວນ',mn_need_item:'ມີແຖວສ່ວນປະສົມທີ່ຍັງບໍ່ໄດ້ເລືອກວັດຖຸດິບ',
  mn_unit_lost:'ຍັງບໍ່ໄດ້ແລ່ນ SQL — ຫົວໜ່ວຍຂອງສ່ວນປະສົມຖືກແປງເປັນຫົວໜ່ວຍຫຼັກກ່ອນບັນທຶກ',mn_make:'🍳 ເຮັດເຄື່ອງ',mn_stock:'ໃນສະຕັອກ',mn_price_rule:'ລາຄາສິນຄ້າ = ຕົ້ນທຶນຈິງຂອງລັອດທີ່ເຮັດ + ຄ່າໃຊ້ຈ່າຍແຝງ (ຕັ້ງທີ່ 💰 ບັນຊີ) — ບໍ່ຕ້ອງໃສ່ລາຄາທີ່ນີ້',mn_lock:'🔒 ປ່ຽນຫົວໜ່ວຍຂອງສິນຄ້າບໍ່ໄດ້ — {why} (ສະຕັອກ/ຕົ້ນທຶນ/ບິນເກັບເປັນຫົວໜ່ວຍນີ້)',mn_lock_stock:'ຍັງມີສະຕັອກ {q} {u} — ປັບເປັນ 0 ກ່ອນ',mn_lock_hist:'ມີປະຫວັດເຮັດເຄື່ອງ/ສົ່ງແລ້ວ',mn_lock_link:'ຜູກກັບສິນຄ້າຂອງສາຂາໄວ້ແລ້ວ',mn_lines_fail:'ບັນທຶກສ່ວນປະສົມບໍ່ສຳເລັດ — ສູດເດີມຍັງຢູ່ ລອງໃໝ່ອີກຄັ້ງ',mn_lines_lost:'ບັນທຶກສ່ວນປະສົມບໍ່ສຳເລັດ — ກົດ 💾 ອີກຄັ້ງເມື່ອເນັດກັບມາ (ສ່ວນປະສົມຍັງຢູ່ໃນຟອມ)'},
my:{mn_new:'မီနူးထည့်ရန်',mn_edit:'မီနူးပြင်ရန်',mn_n:'မီနူး {n} ခု',mn_none:'မီနူး မရှိသေးပါ — ➕ မီနူးထည့်ရန် ကိုနှိပ်ပါ',mn_no_match:'ရှာသည့် မီနူး မတွေ့ပါ',
  mn_off_chip:'မသုံးတော့',mn_off_none:'ဝှက်ထားသော မီနူး မရှိ',mn_off_view:'မသုံးတော့သော မီနူးများ — ပြန်ယူရန် "↩️ ပြန်သုံး" နှိပ်ပါ',mn_restore:'↩️ ပြန်သုံး',mn_off_btn:'🗄️ မသုံးတော့',
  mn_off_q:'"{n}" ကို မသုံးတော့၍ ဝှက်မလား?\nထုတ်လုပ်၊ ပို့၊ ရေတွက် စာမျက်နှာများတွင် မပေါ်တော့ — နည်း/မှတ်တမ်း ကျန်သည် "↩️ ပြန်သုံး" ကို အချိန်မရွေး နှိပ်နိုင်',mn_off_stock:'📦 လက်ကျန်ရှိနေဆဲ {q} {u}',mn_off_done:'ဝှက်ပြီး 🗄️',mn_restored:'ပြန်သုံးပြီ ✅',
  mn_name:'မီနူးအမည် (ထိုင်းဘာသာ — အလိုအလျောက် ဘာသာပြန်ပေးမည်)',mn_cat:'အမျိုးအစား',mn_cat_new:'＋ အမျိုးအစားအသစ်',mn_cat_new_ph:'အမျိုးအစားအသစ် အမည်',
  mn_yield:'တစ်သုတ် လုပ်လျှင် ရသည်',mn_yield_hint:'ဥပမာ 1 သုတ် = 10 အိတ် · ကုန်ကျစရိတ်/ဈေးကို ဤယူနစ်ဖြင့် တွက်သည်',mn_lot_eq:'1 သုတ် = {q} {u}',mn_per_lot:'/သုတ်',
  mn_markup:'အမြတ် % (ဆိုင်ခွဲဈေး)',mn_markup_def:'ဗလာ = ပုံသေ {p}%',mn_sell:'ဆိုင်ခွဲဈေး',
  mn_target:'ထားရမည့် ထုတ်ကုန်လက်ကျန်',mn_target_qty:'ပုံသေပမာဏ',mn_target_days:'သို့မဟုတ် = ပျမ်းမျှပို့မှု ရက်အရေအတွက်',mn_target_hint:'ဤထက်နည်းလျှင် 🍳 ထုတ်လုပ် → 🔄 ဖြည့် တွင် ပေါ်မည်',
  mn_extra:'တစ်သုတ်လျှင် အခြားစရိတ် (ဂက်စ်/ရေ/အိတ်) ဘတ်',mn_method:'📝 လုပ်နည်း',mn_method_edit:'လုပ်နည်းပြင်',mn_method_ok:'ပြီးပြီ — အဆင့်လိုက်ကြည့်',mn_method_tip:'1 ကြောင်း = 1 အဆင့် · # ဖြင့်စ = ခေါင်းစဉ် · * ဖြင့်စ = အကြံပြုချက် · ကိန်းဂဏန်းများသည် 1 သုတ်အတွက်',mn_method_ph:'# ကြိုပြင်ရန်\nကြက်သွန်ဖြူ အခွံခွာ\n# လုပ်နည်း\nငံပြာရည်+သကြား ကျို\n* မထုပ်မီ မြည်းပါ',
  mn_bom:'🥬 တစ်သုတ်အတွက် ပါဝင်ပစ္စည်း',mn_bom_add:'＋ ပါဝင်ပစ္စည်းထည့်',mn_bom_none:'ပါဝင်ပစ္စည်း မရှိသေး — ＋ ပါဝင်ပစ္စည်းထည့် နှိပ်ပါ',mn_lines_n:'{n} မျိုး',
  mn_pick_t:'ကုန်ကြမ်းရွေးပါ',mn_pick_none:'ကုန်ကြမ်း မတွေ့ပါ',mn_pick_new:'➕ ကုန်ကြမ်းအသစ် (🥬 ကုန်ကြမ်း သို့သွားပါ)',mn_line_eq:'= {q} {u}',mn_line_bad:'ဤယူနစ်ကို {u} သို့ ပြောင်း၍မရ',mn_line_qty:'အရေအတွက်',
  mn_cost_t:'💰 တစ်သုတ်ကုန်ကျစရိတ် (လက်ရှိကုန်ကြမ်းဈေး)',mn_cost_items:'ပါဝင်ပစ္စည်း',mn_cost_extra:'အခြား',mn_cost_oh:'ဝှက်ထားစရိတ်',mn_cost_total:'စုစုပေါင်း/သုတ်',mn_cost_unit:'{u} တစ်ခုလျှင်',
  mn_cost_missing:'ဈေးမရှိသေး: {list} — ပထမလက်ခံပြီးမှ ရမည်',
  mn_real_t:'အမှန်ကုန်ကျစရိတ် (လုပ်ခဲ့သော သုတ်များမှ)',mn_real_avg:'ပျမ်းမျှ',mn_real_last:'နောက်ဆုံးသုတ်',mn_real_none:'မလုပ်ရသေးပါ — ပထမသုတ်ပြီးမှ အမှန်ကုန်ကျစရိတ် ပေါ်မည်',mn_by_recipe:'နည်းအရ',
  mn_lots:'📈 သုတ်အလိုက် ကုန်ကျစရိတ်',mn_lots_t:'သုတ်အလိုက် ကုန်ကျစရိတ်',mn_lots_none:'ဤမီနူးကို မလုပ်ရသေးပါ',mn_col_lots:'သုတ်',mn_col_got:'ရ',mn_col_items:'ပါဝင်ပစ္စည်း',mn_col_total:'စုစုပေါင်း',mn_col_unit:'တစ်ယူနစ်',
  mn_dup:'ဤအမည်ဖြင့် မီနူး ရှိပြီးသား',mn_del:'🗑 အပြီးဖျက်',mn_del_q:'"{n}" ကို အပြီးဖျက်မလား?\nမှားထည့်သော မီနူးအတွက်သာ — မလုပ်တော့လျှင် "မသုံးတော့" ကို နှိပ်ပါ',
  mn_draft:'📝 မသိမ်းရသေးသော မူကြမ်း ပြန်ရပြီ',mn_draft_drop:'မူကြမ်းဖျက်',mn_photo:'📷 ဓာတ်ပုံထည့် / ပြောင်း',
  mn_need_yield:'တစ်သုတ်ရသည့် အရေအတွက် ထည့်ပါ (0 ထက်များ)',mn_need_qty:'ပါဝင်ပစ္စည်း "{n}" တွင် အရေအတွက် မထည့်ရသေး',mn_need_item:'ကုန်ကြမ်း မရွေးရသေးသော အတန်း ရှိသည်',
  mn_unit_lost:'SQL မလုပ်ရသေး — ပါဝင်ပစ္စည်းယူနစ်များကို မသိမ်းမီ အခြေခံယူနစ်သို့ ပြောင်းလိုက်သည်',mn_make:'🍳 ထုတ်လုပ်',mn_stock:'လက်ကျန်',mn_price_rule:'ထုတ်ကုန်ဈေး = လုပ်ခဲ့သော သုတ်၏ အမှန်ကုန်ကျစရိတ် + ဝှက်ထားစရိတ် (💰 စာရင်း တွင် သတ်မှတ်) — ဤနေရာတွင် ဈေးထည့်ရန် မလို',mn_lock:'🔒 ထုတ်ကုန်ယူနစ် ပြောင်း၍မရ — {why} (လက်ကျန်/စရိတ်/ဘေလ်များ ဤယူနစ်ဖြင့် သိမ်းထား)',mn_lock_stock:'လက်ကျန် {q} {u} ရှိနေသေး — အရင် 0 ထားပါ',mn_lock_hist:'ထုတ်လုပ်/ပို့ဆောင် မှတ်တမ်း ရှိသည်',mn_lock_link:'ဆိုင်ခွဲထုတ်ကုန်နှင့် ချိတ်ထားသည်',mn_lines_fail:'ပါဝင်ပစ္စည်း မသိမ်းရပါ — နည်းဟောင်း ရှိနေဆဲ၊ ထပ်စမ်းပါ',mn_lines_lost:'ပါဝင်ပစ္စည်း မသိမ်းရပါ — ကွန်ရက်ပြန်ရလျှင် 💾 ထပ်နှိပ်ပါ (ဖောင်တွင် ရှိနေဆဲ)'}
});
I18N.add({ // 🎯 Safety / Max ของสินค้าแต่ละตัว
th:{mn_tg_btn:'🎯 Safety / Max',mn_tg_title:'ตั้ง Safety / Max ของสินค้า',mn_safety:'ขั้นต่ำที่ต้องมี (Safety)',mn_max:'ทำเติมให้ถึง (Max)',mn_max_hint:'ว่าง = เติมถึง Safety',
  mn_tg_hint:'Safety = ขั้นต่ำที่ต้องมี — สต๊อกสำเร็จรูปต่ำกว่านี้จะขึ้นใน 🍳 ทำของ → 🔄 เติม · Max = ทำเติมให้ถึง (ว่าง = เติมถึง Safety) · แก้แล้วบันทึกให้เอง',
  mn_tg_days:'หรือ N วัน',mn_tg_days_s:'ของยอดส่งเฉลี่ย/วัน',mn_tg_stock:'ตอนนี้มี {q} {u}',mn_tg_avg:'ส่งเฉลี่ย/วัน {q}',mn_tg_avg_na:'ส่งเฉลี่ย/วัน — (อ่านบิลไม่ได้)',mn_tg_open:'สาขาสั่งค้าง {q}',
  mn_tg_need:'ต้องทำเติม {q} {u}',mn_tg_ok:'สต๊อกพอ ✓',mn_tg_none:'ยังไม่ตั้ง',mn_tg_bad:'ใส่ได้เฉพาะตัวเลข 0 ขึ้นไป — ยังไม่บันทึก',
  mn_tg_sql:'ต้องรัน SQL รุ่นล่าสุด (jjmk_kitchen2.sql) — ช่อง Max ยังบันทึกไม่ได้ · ช่องอื่นบันทึกได้ปกติ (ดูหน้า ⚙️ ตั้งค่า)'},
en:{mn_tg_btn:'🎯 Safety / Max',mn_tg_title:'Safety / Max per product',mn_safety:'Minimum to keep (Safety)',mn_max:'Refill up to (Max)',mn_max_hint:'blank = up to Safety',
  mn_tg_hint:'Safety = minimum to keep — finished stock below it shows in 🍳 Produce → 🔄 Refill · Max = refill up to (blank = up to Safety) · saves as you type',
  mn_tg_days:'or N days',mn_tg_days_s:'of average daily sending',mn_tg_stock:'Now {q} {u}',mn_tg_avg:'avg sent/day {q}',mn_tg_avg_na:'avg sent/day — (bills unreadable)',mn_tg_open:'branches waiting {q}',
  mn_tg_need:'Refill {q} {u}',mn_tg_ok:'Stock OK ✓',mn_tg_none:'not set',mn_tg_bad:'Numbers ≥ 0 only — not saved',
  mn_tg_sql:'Run the latest SQL (jjmk_kitchen2.sql) — the Max field cannot be saved yet · other fields save normally (see ⚙️ Settings)'},
lo:{mn_tg_btn:'🎯 Safety / Max',mn_tg_title:'ຕັ້ງ Safety / Max ຂອງສິນຄ້າ',mn_safety:'ຂັ້ນຕ່ຳທີ່ຕ້ອງມີ (Safety)',mn_max:'ເຮັດເຕີມໃຫ້ເຖິງ (Max)',mn_max_hint:'ຫວ່າງ = ເຕີມເຖິງ Safety',
  mn_tg_hint:'Safety = ຂັ້ນຕ່ຳທີ່ຕ້ອງມີ — ສະຕັອກສຳເລັດຮູບຕ່ຳກວ່ານີ້ຈະຂຶ້ນໃນ 🍳 ເຮັດເຄື່ອງ → 🔄 ເຕີມ · Max = ເຮັດເຕີມໃຫ້ເຖິງ (ຫວ່າງ = ເຕີມເຖິງ Safety) · ແກ້ແລ້ວບັນທຶກໃຫ້ເອງ',
  mn_tg_days:'ຫຼື N ມື້',mn_tg_days_s:'ຂອງຍອດສົ່ງສະເລ່ຍ/ມື້',mn_tg_stock:'ຕອນນີ້ມີ {q} {u}',mn_tg_avg:'ສົ່ງສະເລ່ຍ/ມື້ {q}',mn_tg_avg_na:'ສົ່ງສະເລ່ຍ/ມື້ — (ອ່ານບິນບໍ່ໄດ້)',mn_tg_open:'ສາຂາສັ່ງຄ້າງ {q}',
  mn_tg_need:'ຕ້ອງເຮັດເຕີມ {q} {u}',mn_tg_ok:'ສະຕັອກພໍ ✓',mn_tg_none:'ຍັງບໍ່ຕັ້ງ',mn_tg_bad:'ໃສ່ໄດ້ສະເພາະຕົວເລກ 0 ຂຶ້ນໄປ — ຍັງບໍ່ບັນທຶກ',
  mn_tg_sql:'ຕ້ອງແລ່ນ SQL ລຸ້ນລ່າສຸດ (jjmk_kitchen2.sql) — ຊ່ອງ Max ຍັງບັນທຶກບໍ່ໄດ້ · ຊ່ອງອື່ນບັນທຶກໄດ້ປົກກະຕິ (ເບິ່ງໜ້າ ⚙️ ຕັ້ງຄ່າ)'},
my:{mn_tg_btn:'🎯 Safety / Max',mn_tg_title:'ထုတ်ကုန်တစ်ခုချင်း Safety / Max သတ်မှတ်',mn_safety:'အနည်းဆုံး ထားရမည့် (Safety)',mn_max:'ဖြည့်ရမည့် အထိ (Max)',mn_max_hint:'ဗလာ = Safety အထိ',
  mn_tg_hint:'Safety = အနည်းဆုံး ထားရမည့် ပမာဏ — ထုတ်ကုန်လက်ကျန် ဤထက်နည်းလျှင် 🍳 ထုတ်လုပ် → 🔄 ဖြည့် တွင် ပေါ်မည် · Max = ဖြည့်ရမည့် အထိ (ဗလာ = Safety အထိ) · ပြင်ပြီး အလိုအလျောက် သိမ်းသည်',
  mn_tg_days:'သို့မဟုတ် N ရက်',mn_tg_days_s:'ပျမ်းမျှ နေ့စဉ်ပို့မှု၏',mn_tg_stock:'ယခု {q} {u}',mn_tg_avg:'ပျမ်းမျှ ပို့/နေ့ {q}',mn_tg_avg_na:'ပျမ်းမျှ ပို့/နေ့ — (ဘေလ်ဖတ်မရ)',mn_tg_open:'ဆိုင်ခွဲ စောင့်နေ {q}',
  mn_tg_need:'ဖြည့်ရန် {q} {u}',mn_tg_ok:'လက်ကျန် လုံလောက် ✓',mn_tg_none:'မသတ်မှတ်ရသေး',mn_tg_bad:'0 နှင့်အထက် ဂဏန်းသာ — မသိမ်းရသေး',
  mn_tg_sql:'နောက်ဆုံး SQL (jjmk_kitchen2.sql) ကို လုပ်ပါ — Max အကွက် မသိမ်းနိုင်သေးပါ · အခြားအကွက်များ ပုံမှန်သိမ်းသည် (⚙️ ဆက်တင် ကြည့်ပါ)'}
});
CSS.add(`
.mntg{background:var(--card);border:1.5px solid var(--line);border-radius:14px;padding:10px 11px;margin-bottom:8px;box-shadow:var(--sh);transition:border-color .3s,box-shadow .3s}
.mntg.saved{border-color:var(--ok);box-shadow:0 0 0 2px rgba(31,122,67,.16)}.mntg.err{border-color:var(--red)}
#mnTgBack{white-space:nowrap}
.mntg-h{display:flex;align-items:center;gap:10px;min-height:44px}.mntg-h .iname{font-weight:700;overflow-wrap:anywhere}
.mntg-need{flex:none;text-align:right;font-size:13px;font-family:var(--fh);max-width:44%;overflow-wrap:anywhere}
.mntg-tick{color:var(--ok);font-weight:800;opacity:0;transition:opacity .25s;margin-left:4px}.mntg.saved .mntg-tick{opacity:1}
.mntg-f{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px}
.mntg-f label{display:block;min-width:0}.mntg-f label>.xs{display:block;font-weight:700;color:var(--wine);margin-bottom:3px;line-height:1.25}
.mntg-in{display:flex;align-items:center;gap:5px;min-width:0}.mntg-in input{flex:1;min-width:0;width:auto;text-align:right;padding:9px 8px}
.mntg-in .xs{flex:none;max-width:42%;overflow-wrap:anywhere;line-height:1.2}
.mntg-in input.bad{border-color:var(--red);background:var(--bad-t)}.mntg-in input:disabled{background:#F3EEE4;color:var(--mut)}
@media(max-width:399px){.mntg-f{grid-template-columns:1fr 1fr}.mntg-f label.days{grid-column:1/-1}}
.icard.mnoff{opacity:.62}.icard.mnoff .ithumb{filter:grayscale(1)}
.mnform .mthumb.lg{width:72px;height:72px;font-size:32px;border-radius:14px}
.mnline{border:1.5px solid var(--line);border-radius:12px;padding:8px 10px;margin-bottom:8px;background:#fff}
.mnline .r1{display:flex;align-items:center;gap:8px}.mnline .r1 .nm{flex:1;min-width:0;font-weight:700;overflow-wrap:anywhere}
.mnline .r1 .x{width:44px;height:44px;min-height:44px;border-radius:10px;border:1.5px solid var(--line);background:#fff;color:var(--mut);font-size:18px;padding:0;flex:none}
.mnline .r2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:6px;margin-top:6px;align-items:center}
.mnline .r2 input,.mnline .r2 select{min-height:44px}
.mnline .eq{font-size:12.5px;color:var(--mut);margin-top:4px;font-variant-numeric:tabular-nums}.mnline .eq.bad{color:var(--bad);font-weight:700}
.mncost{background:#FBF6EA;border:1.5px solid #F0E8D6;border-radius:12px;padding:10px 12px;font-size:13.5px;margin-bottom:10px}
.mncost .ln{display:flex;justify-content:space-between;gap:8px;padding:2px 0}.mncost .ln.tot{border-top:1.5px solid #E6DBC3;margin-top:4px;padding-top:6px;font-weight:700}
.mncost b{font-family:var(--fh);font-size:16px}
.mndraft{display:flex;align-items:center;gap:8px;background:var(--gold-t);border:1.5px solid #E9D9A8;border-radius:12px;padding:8px 12px;margin-bottom:10px;font-size:13px}
.mndraft button{margin-left:auto;min-height:36px}
.mnacts{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}.mnacts .btn.big{flex:1;min-width:140px}
.mnreal{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
`);
let MN_CAT=String(LS.get('jjck_mncat','')||'');   // '' ทั้งหมด · ชื่อหมวด · '__off' ไม่ใช้แล้ว
let MN_Q='';
let MN_D=null;                                     // ร่างฟอร์ม
let MN_EDITM=false;                                // วิธีทำ: false = โชว์เป็นขั้น ๆ แบบระบบเดิม (เจ้าของสั่ง 2026-10-17 "เอาแบบระบบที่แล้ว ดูสวยดี") · true = กล่องพิมพ์ + ตัวอย่างสด
const MN_DRAFT='jjck_mn_draft',MN_DRAFT_MS=12*3600*1000;
const MN_IC={'น้ำจิ้ม':'🥣','ของหมัก':'🥩','น้ำซุป':'🍲','ของหวาน':'🍰','อื่นๆ':'🍳'};
const mnIcon=r=>MN_IC[(r&&r.cat)||'']||'🍳';
const mnMoney=c=>'฿'+fmtQ(c);
let MN_VIEW=LS.get('jjck_mnview','')==='target'?'target':'';   // '' = การ์ดเมนู · 'target' = 🎯 หน้าตั้ง Safety/Max (รีเฟรชแล้วอยู่หน้าเดิม)
let MN_TGQ='';                                                   // ค้นหาในหน้า 🎯
const MN_TG={seq:{},tm:{},pend:{},bad:{},busy:{},again:{}};      // ต่อแถว: seq = ลำดับการเขียน · tm = debounce · pend = ช่องที่แก้แล้วรอเขียน · bad = ช่องที่ค่าใช้ไม่ได้ · busy/again = เขียนต่อกันทีละแถว
function mnTargetCalc(r,stock,daily){ // สูตร Safety/Max ที่เดียว — 🍳 mkNeeds · ☀️ tdPaintRefill · 🎯 หน้านี้ ต้องตรงกัน (เจ้าของสั่ง 2026-10-17)
  // Safety = ขั้นต่ำที่ต้องมี (target_qty · หรือ target_days × ยอดส่งเฉลี่ย/วัน) · Max = ทำเติมให้ถึง (max_qty · ว่าง/0 = Safety · ต่ำกว่า Safety = ใช้ Safety)
  // สต๊อก < Safety → ต้องเติม = Max − สต๊อก · ไม่ต่ำกว่า = 0 (ส่วน open/short ของออเดอร์สาขาคิดแยกใน mkNeeds ตามเดิม)
  const safety=num(r.target_qty)>0?num(r.target_qty):(num(r.target_days)>0?rnd4(num(r.target_days)*num(daily)):0);
  const max=num(r.max_qty)>0?num(r.max_qty):0,upto=max>0?Math.max(max,safety):safety;
  const below=safety>0&&num(stock)<safety-1e-9?Math.max(0,rnd4(upto-num(stock))):0;
  return {safety,max,upto,below};}
function mnCats(){const c=MENU_CATS.slice();S.recipes.forEach(r=>{const x=String(r.cat||'').trim();if(x&&!c.includes(x))c.push(x);});return c;}
function mnOffN(){return S.recipes.filter(r=>r.active===false).length;}
function mnRealCost(r){ // ต้นทุนจริง/หน่วย: ถัวเฉลี่ยล็อต → ล็อตล่าสุด → null
  if(!r)return null;if(r.avg_cost!=null&&num(r.avg_cost)>0)return num(r.avg_cost);if(r.unit_cost!=null&&num(r.unit_cost)>0)return num(r.unit_cost);return null;}

/* ---------- รายการ ---------- */
RENDER.menus=function(el){
  if(MN_VIEW==='target')return mnTgRender(el);   // 🎯 หน้าตั้ง Safety/Max (มุมมองในแท็บเดียวกัน)
  const K=canKitchen(),act=activeRecipes(),nOff=mnOffN();
  if(MN_CAT==='__off'&&!nOff)MN_CAT='';
  const cats=mnCats().filter(c=>act.some(r=>(r.cat||'อื่นๆ')===c));
  if(MN_CAT&&MN_CAT!=='__off'&&!cats.includes(MN_CAT))MN_CAT='';
  const pills=[{k:'',lb:t('all'),n:act.length}].concat(cats.map(c=>({k:c,lb:(MN_IC[c]||'🍳')+' '+trCat(c),n:act.filter(r=>(r.cat||'อื่นๆ')===c).length})));
  if(nOff)pills.push({k:'__off',lb:'🗄️ '+t('mn_off_chip'),n:nOff});
  let h=dhead('📖 '+t('nav_menus'),esc(t('mn_n',{n:act.length})))+sqlNeedBox();
  if(K)h+='<div class="row" style="margin-bottom:10px"><button class="btn" onclick="mnEdit()">➕ '+esc(t('mn_new'))+'</button>'+
    '<button class="btn gh" onclick="show(\'make\')">'+esc(t('mn_make'))+'</button>'+
    '<button class="btn gh" id="mnTgBtn" onclick="mnViewSet(\'target\')">'+esc(t('mn_tg_btn'))+'</button></div>';
  h+='<div class="note">💡 '+esc(t('mn_price_rule'))+'</div>';
  h+=pillBar(pills,MN_CAT,k=>mnSetCat(k),{scroll:1});   // closure — คีย์ภาษาไทยใน onclick string จะพังเครื่องหมายคำพูด
  if(MN_CAT==='__off')h+='<div class="hintbox">🗄️ '+esc(t('mn_off_view'))+'</div>';
  h+=searchBox('mnQ','mnSearch')+'<div id="mnGrid" class="igrid"></div>';
  el.innerHTML=h;const q=document.getElementById('mnQ');if(q)q.value=MN_Q;mnPaintGrid();
};
function mnSetCat(k){MN_CAT=k||'';LS.set('jjck_mncat',MN_CAT);show('menus');}
function mnSearch(v){MN_Q=v||'';mnPaintGrid();}
function mnPaintGrid(){
  const box=document.getElementById('mnGrid');if(!box)return;
  const off=MN_CAT==='__off',q=supKey(MN_Q),K=canKitchen();
  const list=S.recipes.filter(r=>(off?r.active===false:(r.active!==false&&(!MN_CAT||(r.cat||'อื่นๆ')===MN_CAT)))&&
    (!q||supKey(r.name).includes(q)||supKey(dispName(r)).includes(q)));
  if(!list.length){box.innerHTML='<div class="empty" style="grid-column:1/-1">'+esc(t(off?'mn_off_none':(q?'mn_no_match':'mn_none')))+'</div>';return;}
  box.innerHTML=list.map(r=>mnCardHtml(r,off,K)).join('');
}
function mnCardHtml(r,off,K){
  const real=mnRealCost(r),rc=recipeCost(r,1),n=bomOf(r).length,sp=sellPrice(r);
  let cost;
  if(real!=null)cost='💰 '+esc(mnMoney(real))+'/'+esc(trUnit(r.yield_unit))+(r.unit_cost!=null&&num(r.unit_cost)>0&&num(r.unit_cost)!==real?' <span class="xs">('+esc(t('mn_real_last'))+' '+esc(mnMoney(r.unit_cost))+')</span>':'');
  else if(rc.items>0)cost='<span class="mut">'+esc(t('mn_by_recipe'))+' '+esc(mnMoney(rc.perUnit))+'/'+esc(trUnit(r.yield_unit))+'</span>';
  else cost='<span class="amber">'+esc(t('no_price'))+'</span>';
  return '<div class="icard'+(off?' mnoff':'')+(K?' tap':'')+'" data-id="'+esc(r.id)+'"'+(K?' onclick="mnEdit(this.dataset.id)"':'')+'>'+
    thumbHtml(r,mnIcon(r),'ithumb')+
    '<div class="iname">'+esc(dispName(r))+'</div>'+
    '<div class="isub">'+esc(t('mn_lot_eq',{q:fmtQ(r.yield_qty),u:trUnit(r.yield_unit)}))+' · '+esc(t('mn_lines_n',{n}))+'</div>'+
    '<div class="isub">'+cost+(sp!=null?' · '+esc(t('mn_sell'))+' <b>'+esc(mnMoney(sp))+'</b>':'')+'</div>'+
    '<div class="row" style="justify-content:space-between"><span class="chip '+(num(r.qty)>0?'ok':'mid')+'">📦 '+fmtQ(r.qty)+' '+esc(trUnit(r.yield_unit))+'</span>'+
      (r.target_qty!=null&&num(r.target_qty)>0?'<span class="xs mut">🎯 '+fmtQ(r.target_qty)+mnMaxTxt(r)+'</span>':(r.target_days!=null&&num(r.target_days)>0?'<span class="xs mut">🎯 '+fmtQ(r.target_days)+'d'+mnMaxTxt(r)+'</span>':''))+'</div>'+
    (off&&K?'<button class="btn sm2 gh" data-id="'+esc(r.id)+'" onclick="event.stopPropagation();mnOff(this.dataset.id,true)">'+esc(t('mn_restore'))+'</button>':'')+'</div>';}

/* ---------- 🎯 Safety / Max ของสินค้าแต่ละตัว ---------- */
const mnMaxTxt=r=>num(r&&r.max_qty)>0?' → '+fmtQ(r.max_qty):'';   // ป้ายบนการ์ด: 🎯 Safety → Max
function mnViewSet(v){MN_VIEW=v==='target'?'target':'';LS.set('jjck_mnview',MN_VIEW);MN_TGQ='';show('menus');}
function mnTgColGone(e,col){const c=(e&&e.code)||'',m=String((e&&e.message)||'');return (c==='42703'||c==='PGRST204')&&m.includes(col);}   // ไม่มีคอลัมน์นั้น (select = 42703 · update = PGRST204)
async function mnTgProbe(){ // ตรวจครั้งเดียวว่าฐานข้อมูลมีคอลัมน์ max_qty ไหม (ยังไม่รัน SQL รุ่นล่าสุด = ไม่มี) · อ่านไม่ได้ด้วยเหตุอื่น = ยังไม่รู้ ลองใหม่คราวหน้า
  if(S.kcMax!==undefined)return;
  try{const r=await sb.from('ck_recipes').select('id,max_qty').limit(1);if(!r)return;if(!r.error)S.kcMax=true;else if(mnTgColGone(r.error,'max_qty'))S.kcMax=false;}catch(e){}}
function mnTgSqlHtml(){return S.kcMax===false?'<div class="badbox" id="mnTgSqlBox">⚠ '+esc(t('mn_tg_sql'))+'</div>':'';}
function mnTgMaxLock(){const lock=S.kcMax===false||!canKitchen();document.querySelectorAll('#mnTgList input[data-f="max_qty"]').forEach(i=>{i.disabled=lock;});}
function mnTgRender(el){
  const act=activeRecipes(),cats=mnCats().filter(c=>act.some(r=>(r.cat||'อื่นๆ')===c));
  if(MN_CAT==='__off'||(MN_CAT&&!cats.includes(MN_CAT)))MN_CAT='';
  const pills=[{k:'',lb:t('all'),n:act.length}].concat(cats.map(c=>({k:c,lb:(MN_IC[c]||'🍳')+' '+trCat(c),n:act.filter(r=>(r.cat||'อื่นๆ')===c).length})));
  el.innerHTML=dhead('🎯 '+t('mn_tg_title'),'<button class="btn gh sm2" id="mnTgBack" onclick="mnViewSet(\'\')">'+esc(t('back'))+'</button>')+sqlNeedBox()+
    '<div id="mnTgSql">'+mnTgSqlHtml()+'</div><div class="hintbox">💡 '+esc(t('mn_tg_hint'))+'</div>'+
    pillBar(pills,MN_CAT,k=>mnSetCat(k),{scroll:1})+searchBox('mnTgQ','mnTgSearch')+'<div id="mnTgList"></div>';   // closure — คีย์ภาษาไทยใน onclick string จะพังเครื่องหมายคำพูด
  const q=document.getElementById('mnTgQ');if(q)q.value=MN_TGQ;mnTgPaintList();
  mnTgProbe().then(()=>{if(S.tab!=='menus'||MN_VIEW!=='target')return;const b=document.getElementById('mnTgSql');if(b)b.innerHTML=mnTgSqlHtml();mnTgMaxLock();});
  if(typeof mkLoad==='function')Promise.resolve(mkLoad()).then(()=>{if(S.tab==='menus'&&MN_VIEW==='target')mnTgInfoPaintAll();}).catch(()=>{});   // ยอดส่งเฉลี่ย 14 วัน + ออเดอร์ค้าง = ชุดเดียวกับ 🍳 (MK_ORD · แคช 60 วิ = คืน undefined) · วาดเฉพาะบรรทัดข้อมูล ไม่แตะช่องที่กำลังพิมพ์
}
function mnTgSearch(v){MN_TGQ=v||'';mnTgPaintList();}
function mnTgPaintList(){
  const box=document.getElementById('mnTgList');if(!box)return;const q=supKey(MN_TGQ);
  const list=activeRecipes().filter(r=>(!MN_CAT||(r.cat||'อื่นๆ')===MN_CAT)&&(!q||supKey(r.name).includes(q)||supKey(dispName(r)).includes(q)));
  if(!list.length){box.innerHTML='<div class="empty">'+esc(t(q?'mn_no_match':'mn_none'))+'</div>';return;}
  box.innerHTML=list.map(mnTgRowHtml).join('');mnTgMaxLock();}
function mnTgCur(r){return Object.assign({},r,MN_TG.pend[r.id]||{});}   // ค่าที่ใช้คิด = ที่บันทึกแล้ว + ที่แก้แล้วรอเขียน (เฉพาะค่าที่ใช้ได้)
function mnTgOrd(){return (typeof MK_ORD!=='undefined'&&MK_ORD.ok)?MK_ORD:null;}
function mnTgInfoHtml(r){
  const o=mnTgOrd(),u=trUnit(r.yield_unit);let h=esc(t('mn_tg_stock',{q:fmtQ(r.qty),u}));
  h+=' · '+esc(o?t('mn_tg_avg',{q:fmtQ(num(o.daily[r.id]))}):t('mn_tg_avg_na'));
  if(o){const open=Math.max(0,rnd4(num(o.ordered[r.id])-num(o.sent[r.id])));if(open>0)h+=' · '+esc(t('mn_tg_open',{q:fmtQ(open)}));}
  return h;}
function mnTgNeedHtml(r){
  const o=mnTgOrd(),x=mnTgCur(r),c=mnTargetCalc(x,num(r.qty),o?num(o.daily[r.id]):0);
  const tick='<span class="mntg-tick">✓</span>';
  if(!(num(x.target_qty)>0||num(x.target_days)>0))return '<span class="mut">'+esc(t('mn_tg_none'))+'</span>'+tick;   // ยังไม่ตั้งทั้ง Safety และ N วัน (ตั้ง N วันแต่ยังไม่เคยส่ง = Safety 0 = สต๊อกพอ)
  if(c.below>0)return '<b class="red">'+esc(t('mn_tg_need',{q:fmtQ(c.below),u:trUnit(r.yield_unit)}))+'</b>'+tick;
  return '<span class="green">'+esc(t('mn_tg_ok'))+'</span>'+tick;}
function mnTgNeedPaint(id){const r=recipeById(id),n=document.getElementById('mnTgN_'+id);if(r&&n)n.innerHTML=mnTgNeedHtml(r);}
function mnTgInfoPaintAll(){document.querySelectorAll('#mnTgList .mntg').forEach(el=>{const r=recipeById(el.dataset.id);if(!r)return;const i=document.getElementById('mnTgI_'+r.id);if(i)i.innerHTML=mnTgInfoHtml(r);mnTgNeedPaint(r.id);});}
function mnTgRowHtml(r){
  const K=canKitchen(),u=trUnit(r.yield_unit),dis=K?'':' disabled',v=x=>x==null?'':String(x);
  const inp=(f,val,extra)=>'<input type="text" inputmode="decimal" id="mnTg'+(f==='target_qty'?'S':f==='max_qty'?'M':'D')+'_'+esc(r.id)+'" data-id="'+esc(r.id)+'" data-f="'+f+'" value="'+esc(v(val))+'" oninput="mnTgInput(this)"'+(extra||'')+dis+'>';
  return '<div class="mntg" id="mnTgR_'+esc(r.id)+'" data-id="'+esc(r.id)+'">'+
    '<div class="mntg-h">'+thumbHtml(r,mnIcon(r))+'<div class="grow"><div class="iname">'+esc(dispName(r))+'</div><div class="xs mut" id="mnTgI_'+esc(r.id)+'">'+mnTgInfoHtml(r)+'</div></div>'+
      '<div class="mntg-need" id="mnTgN_'+esc(r.id)+'">'+mnTgNeedHtml(r)+'</div></div>'+
    '<div class="mntg-f">'+
      '<label><span class="xs">'+esc(t('mn_safety'))+'</span><div class="mntg-in">'+inp('target_qty',r.target_qty)+'<span class="xs mut">'+esc(u)+'</span></div></label>'+
      '<label><span class="xs">'+esc(t('mn_max'))+'</span><div class="mntg-in">'+inp('max_qty',r.max_qty,S.kcMax===false?' disabled':'')+'<span class="xs mut">'+esc(u)+'</span></div></label>'+
      '<label class="days"><span class="xs">'+esc(t('mn_tg_days'))+'</span><div class="mntg-in">'+inp('target_days',r.target_days)+'<span class="xs mut">'+esc(t('mn_tg_days_s'))+'</span></div></label>'+
    '</div><div class="xs red mntg-bad" id="mnTgB_'+esc(r.id)+'" style="display:none;margin-top:4px">'+esc(t('mn_tg_bad'))+'</div></div>';}
function mnTgParse(s){ // ค่าในช่อง → null (ว่าง) · ตัวเลข ≥ 0 (ปัด 4 ตำแหน่ง · "1,5" = 1.5 แบบ numIn) · NaN = ใช้ไม่ได้ (ติดลบ/ตัวอักษร)
  s=String(s==null?'':s).trim();if(s==='')return null;
  if(!/^[0-9][0-9,]*(\.[0-9]+)?$/.test(s)&&!/^[0-9]+,[0-9]{1,2}$/.test(s))return NaN;
  const n=numIn(s);return (isFinite(n)&&n>=0)?rnd4(n):NaN;}
function mnTgInput(el){
  const id=el.dataset.id,f=el.dataset.f,r=recipeById(id);if(!r||!canKitchen()||!['target_qty','max_qty','target_days'].includes(f))return;
  const n=mnTgParse(el.value),bad=MN_TG.bad[id]=MN_TG.bad[id]||{};
  if(Number.isNaN(n)){el.classList.add('bad');bad[f]=1;}else{el.classList.remove('bad');delete bad[f];(MN_TG.pend[id]=MN_TG.pend[id]||{})[f]=n;}
  const bb=document.getElementById('mnTgB_'+id);if(bb)bb.style.display=Object.keys(bad).length?'':'none';
  mnTgNeedPaint(id);
  clearTimeout(MN_TG.tm[id]);MN_TG.tm[id]=setTimeout(()=>mnTgFlush(id),600);}
async function mnTgFlush(id){ // เขียนแถวนี้ทีละครั้งต่อกัน — มีการเขียนค้างอยู่ = รอให้เสร็จแล้วเขียนรอบถัดไป (ค่าใหม่ไม่ถูกค่าเก่าที่มาช้าทับ)
  clearTimeout(MN_TG.tm[id]);
  if(MN_TG.busy[id]){MN_TG.again[id]=1;return;}
  const p=MN_TG.pend[id];if(!p||!Object.keys(p).length)return;delete MN_TG.pend[id];
  MN_TG.busy[id]=1;try{await mnTgSave(id,p);}finally{delete MN_TG.busy[id];}
  if(MN_TG.again[id]){delete MN_TG.again[id];mnTgFlush(id);}}
async function mnTgSave(id,patch){ // เขียน ck_recipes เฉพาะช่องที่แก้ · ไม่มีคอลัมน์ max_qty (ยังไม่รัน SQL รุ่นล่าสุด) = เขียนใหม่โดยไม่มี + จำ S.kcMax=false + แถบบอก · เขียนพลาด = คืนค่าไว้รอเขียนรอบหน้า + ขอบแดง + toast
  const r=recipeById(id);if(!r||!canKitchen())return false;
  const row={};['target_qty','max_qty','target_days'].forEach(f=>{if(f in patch)row[f]=patch[f]==null?null:rnd4(num(patch[f]));});
  if(S.kcMax===false)delete row.max_qty;
  const seq=MN_TG.seq[id]=(MN_TG.seq[id]||0)+1;
  if(!Object.keys(row).length){mnTgMaxLock();return false;}
  let res=null,dropped=false;setBusy(true);
  try{for(let i=0;i<3;i++){res=await sb.from('ck_recipes').update(row).eq('id',id);if(!res||!res.error)break;
      if(('max_qty' in row)&&mnTgColGone(res.error,'max_qty')){delete row.max_qty;S.kcMax=false;dropped=true;if(!Object.keys(row).length){res={error:null};break;}continue;}
      break;}}
  catch(e){res={error:e};}finally{setBusy(false);}
  const el=document.getElementById('mnTgR_'+id);
  if(res&&res.error){MN_TG.pend[id]=Object.assign({},patch,MN_TG.pend[id]||{});toast(t('sv_err')+(res.error.message||res.error),true);if(el)el.classList.add('err');return false;}
  Object.assign(r,row);
  if(el){el.classList.remove('err');el.classList.remove('saved');void el.offsetWidth;el.classList.add('saved');clearTimeout(el._tgT);el._tgT=setTimeout(()=>el.classList.remove('saved'),1500);}
  if(dropped){const b=document.getElementById('mnTgSql');if(b)b.innerHTML=mnTgSqlHtml();mnTgMaxLock();toast(t('mn_tg_sql'),'warn');}
  mnTgNeedPaint(id);return seq===MN_TG.seq[id];}

/* ---------- ฟอร์ม ---------- */
function mnDraftFrom(r){
  if(r)return {id:r.id,name:r.name||'',cat:r.cat||'อื่นๆ',yield_qty:r.yield_qty==null?'':r.yield_qty,yield_unit:r.yield_unit||'ถุง',markup_pct:r.markup_pct==null?'':r.markup_pct,
    target_qty:r.target_qty==null?'':r.target_qty,max_qty:r.max_qty==null?'':r.max_qty,target_days:r.target_days==null?'':r.target_days,extra_cost:r.extra_cost==null?'':r.extra_cost,note:r.note||'',image_url:r.image_url||null,active:r.active!==false,
    lines:(S.boms[r.id]||[]).filter(l=>itemById(l.item_id)).map(l=>({item_id:l.item_id,qty:l.qty==null?'':l.qty,unit:l.unit||itemById(l.item_id).unit||''})),cat_new:'',restored:false};
  return {id:null,name:'',cat:(MN_CAT&&MN_CAT!=='__off')?MN_CAT:'อื่นๆ',yield_qty:'',yield_unit:'ถุง',markup_pct:'',target_qty:'',max_qty:'',target_days:'',extra_cost:'',note:'',image_url:null,active:true,lines:[],cat_new:'',restored:false};}
function mnDraftRead(id){const d=LS.get(MN_DRAFT,null);if(!d||typeof d!=='object'||!(Date.now()-num(d._t)<MN_DRAFT_MS))return null;
  return String(d.id||'')===String(id||'')?d:null;}
function mnDraftSave(){if(!MN_D)return;clearTimeout(mnDraftSave._t);mnDraftSave._t=setTimeout(()=>{if(MN_D)LS.set(MN_DRAFT,Object.assign({},MN_D,{_t:Date.now()}));},150);}
function mnDraftClear(){clearTimeout(mnDraftSave._t);LS.del(MN_DRAFT);}
function mnEdit(id){
  if(!canKitchen())return;
  const r=id?recipeById(id):null;if(id&&!r)return;
  const dr=mnDraftRead(id);
  MN_D=dr?Object.assign(mnDraftFrom(r),dr,{restored:true}):mnDraftFrom(r);
  MN_D.lines=(MN_D.lines||[]).filter(l=>itemById(l.item_id));
  MN_EDITM=!String(MN_D.note||'').trim();   // ยังไม่มีวิธีทำ = เปิดกล่องพิมพ์ให้เลย · มีแล้ว = โชว์เป็นขั้น ๆ
  delete MN_D._hist;delete MN_D._link;   // ร่างเก่าอาจจำสถานะไว้ — ถามฐานข้อมูลใหม่ทุกครั้งที่เปิดฟอร์ม
  if(r&&MN_D.yield_unit!==r.yield_unit&&mnLockWhy(MN_D))MN_D.yield_unit=r.yield_unit;
  mnPaintForm();mnHistCheck(MN_D);
}
function mnLockWhy(d){ // เปลี่ยนหน่วยของสินค้าไม่ได้เมื่อ: มีสต๊อก · มีประวัติทำของ/ส่ง · ผูกสินค้าสาขา — สต๊อก/ต้นทุน/บิลเก็บเป็นหน่วยนี้ (ตรวจอิสระ 2026-10-16 — กติกาเดียวกับ itLockWhy)
  if(!d||!d.id)return '';const r=recipeById(d.id);if(!r)return '';
  if(Math.abs(num(r.qty))>1e-9)return t('mn_lock_stock',{q:fmtQ(r.qty),u:trUnit(r.yield_unit)});
  if(d._hist)return t('mn_lock_hist');if(d._link)return t('mn_lock_link');return '';}
async function mnHistCheck(d){ // มีล็อต/บิล/ผูกสาขาไหม (อ่านทีหลัง · fail-soft)
  if(!d||!d.id||d._hist!=null)return;let hist=false,link=false;
  const one=async q=>{try{const r=await q;return !!(r&&!r.error&&r.data&&r.data.length);}catch(e){return false;}};
  const [a,b,c]=await Promise.all([one(sb.from('kc_moves').select('id').eq('ref_kind','recipe').eq('ref_id',d.id).limit(1)),one(sb.from('kc_productions').select('id').eq('recipe_id',d.id).limit(1)),one(sb.from('kc_links').select('id').eq('recipe_id',d.id).limit(1))]);
  hist=a||b;link=c;
  if(MN_D!==d)return;d._hist=hist;d._link=link;const r=recipeById(d.id);if((hist||link)&&r&&d.yield_unit!==r.yield_unit){d.yield_unit=r.yield_unit;mnPaintCost();}
  mnYuPaint();}
function mnYuPaint(){const d=MN_D;if(!d)return;const lock=mnLockWhy(d),sel=document.getElementById('mnYu'),note=document.getElementById('mnYuLock');
  if(sel){sel.disabled=!!lock;if(lock)sel.value=d.yield_unit;}if(note){note.textContent=lock?t('mn_lock',{why:lock}):'';note.style.display=lock?'':'none';}}
function mnPaintForm(){
  const d=MN_D;if(!d)return;
  const r=d.id?recipeById(d.id):null,cats=mnCats();
  let h='<div class="mnform"><h3>'+(d.id?'✎ '+esc(t('mn_edit')):'➕ '+esc(t('mn_new')))+'</h3>';
  if(d.restored)h+='<div class="mndraft">'+esc(t('mn_draft'))+'<button class="btn gh sm2" onclick="mnDraftDrop()">'+esc(t('mn_draft_drop'))+'</button></div>';
  h+='<div class="row" style="margin-bottom:10px"><div id="mnThumb">'+mnThumbHtml()+'</div>'+
    '<button class="btn gh sm2" onclick="mnPhoto()">'+esc(t('mn_photo'))+'</button></div>'+
    fld(t('mn_name'),'<input id="mnName" value="'+esc(d.name)+'" oninput="MN_D.name=this.value;mnDraftSave()">')+
    fld(t('mn_cat'),'<select id="mnCat" onchange="mnCatChange(this.value)">'+cats.map(c=>'<option value="'+esc(c)+'"'+(c===d.cat?' selected':'')+'>'+(MN_IC[c]||'🍳')+' '+esc(trCat(c))+'</option>').join('')+
        (cats.includes(d.cat)||d.cat==='__new'?'':'<option value="'+esc(d.cat)+'" selected>'+esc(d.cat)+'</option>')+'<option value="__new"'+(d.cat==='__new'?' selected':'')+'>'+esc(t('mn_cat_new'))+'</option></select>'+
        '<input id="mnCatNew" placeholder="'+esc(t('mn_cat_new_ph'))+'" value="'+esc(d.cat_new)+'" style="margin-top:6px;display:'+(d.cat==='__new'?'':'none')+'" oninput="MN_D.cat_new=this.value;mnDraftSave()">')+
    fld(t('mn_yield'),'<div class="row" style="flex-wrap:nowrap"><input id="mnYq" type="text" inputmode="decimal" style="flex:1" value="'+esc(d.yield_qty)+'" oninput="MN_D.yield_qty=this.value;mnDraftSave();mnPaintCost()">'+
        '<select id="mnYu" style="flex:1.4"'+(mnLockWhy(d)?' disabled':'')+' onchange="mnYuChange(this.value)">'+unitOptions(allUnits(),d.yield_unit)+'</select></div><div class="xs mut">'+esc(t('mn_yield_hint'))+'</div>'+
        '<div class="xs amber" id="mnYuLock" style="margin-top:4px'+(mnLockWhy(d)?'':';display:none')+'">'+esc(mnLockWhy(d)?t('mn_lock',{why:mnLockWhy(d)}):'')+'</div>')+
    '<div class="fld"><label>'+esc(t('mn_bom'))+'</label><div id="mnLines">'+mnLinesHtml()+'</div>'+
      '<button type="button" class="btn gh sm2" onclick="mnPick()">'+esc(t('mn_bom_add'))+'</button></div>'+
    '<div id="mnCost">'+mnCostHtml()+'</div>'+
    '<div class="fld"><label>'+esc(t('mn_method'))+'</label><div id="mnMethod">'+mnMethodHtml()+'</div></div>'+
    '<div class="grid2">'+fld(t('mn_extra'),'<input id="mnExtra" type="text" inputmode="decimal" value="'+esc(d.extra_cost)+'" oninput="MN_D.extra_cost=this.value;mnDraftSave();mnPaintCost()">')+
      fld(t('mn_markup'),'<input id="mnMk" type="text" inputmode="decimal" placeholder="'+esc(t('mn_markup_def',{p:fmtQ((S.cfg||{}).markup_pct||0)}))+'" value="'+esc(d.markup_pct)+'" oninput="MN_D.markup_pct=this.value;mnDraftSave();mnPaintCost()">')+'</div>'+
    '<div class="fld"><label>🎯 '+esc(t('mn_target'))+'</label><div class="grid2">'+   // Safety / Max — ชื่อช่องเดียวกับหน้า 🎯 (id mnTq/mnTm/mnTd)
      '<div><input id="mnTq" type="text" inputmode="decimal" placeholder="'+esc(t('mn_safety'))+'" value="'+esc(d.target_qty)+'" oninput="MN_D.target_qty=this.value;mnDraftSave()"><div class="xs mut">'+esc(t('mn_safety'))+' ('+esc(trUnit(d.yield_unit))+')</div></div>'+
      '<div><input id="mnTm" type="text" inputmode="decimal" placeholder="'+esc(t('mn_max'))+'" value="'+esc(d.max_qty==null?'':d.max_qty)+'" oninput="MN_D.max_qty=this.value;mnDraftSave()"'+(S.kcMax===false?' disabled':'')+'><div class="xs mut">'+esc(t('mn_max'))+' · '+esc(t('mn_max_hint'))+'</div></div></div>'+
      '<div style="margin-top:6px"><input id="mnTd" type="text" inputmode="decimal" placeholder="'+esc(t('mn_target_days'))+'" value="'+esc(d.target_days)+'" oninput="MN_D.target_days=this.value;mnDraftSave()"><div class="xs mut">'+esc(t('mn_target_days'))+'</div></div>'+
      (S.kcMax===false?'<div class="xs amber" style="margin-top:4px">⚠ '+esc(t('mn_tg_sql'))+'</div>':'')+
      '<div class="xs mut">'+esc(t('mn_target_hint'))+'</div></div>'+
    mnRealHtml(r)+
    '<div class="mnacts">'+(d.id?'<button class="btn gh" onclick="mnOff(\''+esc(d.id)+'\','+(d.active?'false':'true')+')">'+esc(d.active?t('mn_off_btn'):t('mn_restore'))+'</button>'+
      (isAdminish()?'<button class="btn gh" onclick="mnDel(\''+esc(d.id)+'\')">'+esc(t('mn_del'))+'</button>':''):'')+
      '<button class="btn big" id="mnSaveBtn" onclick="mnSave()">💾 '+esc(t('save'))+'</button></div></div>';
  MODAL_BACK=null;openModal(h);
}
function mnMethodHtml(){ // วิธีทำ: โชว์เป็นขั้น ๆ (วงกลมแดง · หัวข้อ # · เคล็ดลับ *) แบบหน้ารายละเอียดเมนูของระบบเดิม · ✏️ = กล่องพิมพ์ + ตัวอย่างสดใต้กล่อง
  const d=MN_D;if(!d)return '';const note=String(d.note||'');
  if(MN_EDITM||!note.trim())return '<textarea id="mnNote" rows="7" placeholder="'+esc(t('mn_method_ph'))+'" oninput="mnMethodInput(this.value)">'+esc(note)+'</textarea><div class="xs mut">'+esc(t('mn_method_tip'))+'</div>'+
    '<div id="mnMethodPrev" style="margin-top:8px">'+methodHtml(note)+'</div>'+(note.trim()?'<button type="button" class="btn gh sm2" onclick="mnMethodDone()">✓ '+esc(t('mn_method_ok'))+'</button>':'');
  return methodHtml(note)+'<button type="button" class="btn gh sm2" onclick="mnMethodEdit()">✏️ '+esc(t('mn_method_edit'))+'</button>';}
function mnMethodPaint(){const b=document.getElementById('mnMethod');if(b)b.innerHTML=mnMethodHtml();}
function mnMethodInput(v){if(!MN_D)return;MN_D.note=v;mnDraftSave();const p=document.getElementById('mnMethodPrev');if(p)p.innerHTML=methodHtml(v);
  const box=document.getElementById('mnMethod');if(!box)return;const has=!!String(v||'').trim();let b=box.querySelector('button[onclick="mnMethodDone()"]');   // ปุ่ม ✓ มีเฉพาะตอนมีข้อความ (ว่าง = เอาออก · พิมพ์ใหม่ = ใส่กลับ — ผู้ตรวจ B1 เจอว่าหายถาวร)
  if(!has){if(b)b.remove();return;}
  if(!b){b=document.createElement('button');b.type='button';b.className='btn gh sm2';b.setAttribute('onclick','mnMethodDone()');b.textContent='✓ '+t('mn_method_ok');box.appendChild(b);}}
function mnMethodEdit(){MN_EDITM=true;mnMethodPaint();const ta=document.getElementById('mnNote');if(ta&&!('ontouchstart' in window))ta.focus();}
function mnMethodDone(){MN_EDITM=false;mnMethodPaint();}
function mnThumbHtml(){const d=MN_D,url=imgOk(d.image_url)?String(d.image_url):'';return '<div class="mthumb lg" '+(url?'data-url="'+esc(url)+'" onclick="zoomImg(this.dataset.url)"':'')+'>'+(url?'<img src="'+esc(url)+'">':mnIcon({cat:d.cat==='__new'?'':d.cat}))+'</div>';}
function mnPhoto(){const d=MN_D;if(!d)return;pickImage('recipe',d.id,url=>{if(!MN_D||!url)return;MN_D.image_url=url;mnDraftSave();const b=document.getElementById('mnThumb');if(b)b.innerHTML=mnThumbHtml();if(S.tab==='menus')mnPaintGrid();});}
function mnYuChange(v){const d=MN_D;if(!d)return;const lock=mnLockWhy(d);
  if(lock){toast(t('mn_lock',{why:lock}),true);const sel=document.getElementById('mnYu');if(sel)sel.value=d.yield_unit;return;}
  d.yield_unit=v;mnDraftSave();mnPaintCost();}
function mnCatChange(v){const d=MN_D;if(!d)return;d.cat=v;const n=document.getElementById('mnCatNew');if(n){n.style.display=v==='__new'?'':'none';if(v==='__new')n.focus();}mnDraftSave();}
function mnLineCalc(l){ // → {it,f,qty_base,cost} · f null = หน่วยแปลงไม่ได้
  const it=itemById(l.item_id);if(!it)return {it:null,f:null,qty_base:null,cost:null};
  const f=unitFactor(it,l.unit||it.unit),q=num(l.qty);const qb=f==null?null:rnd4(q*f);const c=itemCost(it);
  return {it,f,qty_base:qb,cost:(qb==null||c==null)?null:rnd4(qb*c),uc:c};}
function mnLinesHtml(){
  const d=MN_D;if(!d.lines.length)return '<div class="empty" style="padding:12px">'+esc(t('mn_bom_none'))+'</div>';
  return d.lines.map((l,i)=>{const it=itemById(l.item_id);if(!it)return '';
    return '<div class="mnline" id="mnL'+i+'"><div class="r1">'+thumbHtml(it,'🥬')+'<div class="nm">'+esc(dispName(it))+'<div class="xs mut">'+esc(t('stock'))+' '+fmtQ(it.qty)+' '+esc(trUnit(it.unit))+'</div></div>'+
      '<button type="button" class="x" onclick="mnLineDel('+i+')">✕</button></div>'+
      '<div class="r2"><input type="text" inputmode="decimal" id="mnQ'+i+'" placeholder="'+esc(t('mn_line_qty'))+'" value="'+esc(l.qty)+'" oninput="mnLineQty('+i+',this.value)">'+
      '<select id="mnU'+i+'" onchange="mnLineUnit('+i+',this.value)">'+unitOptions(unitList(it),l.unit||it.unit)+'</select></div>'+
      '<div class="eq" id="mnE'+i+'">'+mnLineEq(l)+'</div></div>';}).join('');}
function mnLineEq(l){const c=mnLineCalc(l);if(!c.it)return '';
  if(c.f==null)return '<span class="bad">'+esc(t('mn_line_bad',{u:trUnit(c.it.unit)}))+'</span>';
  return esc(t('mn_line_eq',{q:fmtQ(c.qty_base),u:trUnit(c.it.unit)}))+' · '+(c.cost==null?'<span class="amber">'+esc(t('no_price'))+'</span>':esc(mnMoney(c.cost)));}
function mnLineEqPaint(i){const e=document.getElementById('mnE'+i);const l=MN_D&&MN_D.lines[i];if(e&&l){e.innerHTML=mnLineEq(l);e.className='eq'+(mnLineCalc(l).f==null?' bad':'');}}
function mnLineQty(i,v){const d=MN_D;if(!d||!d.lines[i])return;d.lines[i].qty=v;mnDraftSave();mnLineEqPaint(i);mnPaintCost();}
function mnLineUnit(i,v){const d=MN_D;if(!d||!d.lines[i])return;d.lines[i].unit=v;mnDraftSave();mnLineEqPaint(i);mnPaintCost();}
function mnLineDel(i){const d=MN_D;if(!d)return;d.lines.splice(i,1);mnDraftSave();mnLinesPaint();}
function mnLinesPaint(){const b=document.getElementById('mnLines');if(b)b.innerHTML=mnLinesHtml();mnPaintCost();}
function mnPick(){ // เลือกวัตถุดิบ (ค้นหาในที่) → เพิ่มแถว → กลับฟอร์ม
  if(!MN_D)return;
  const h='<h3>'+esc(t('mn_pick_t'))+'</h3>'+searchBox('mnPickQ','mnPickSearch')+'<div id="mnPickList">'+mnPickListHtml('')+'</div>'+
    '<div class="row" style="margin-top:10px"><button class="btn gh" onclick="MODAL_BACK=null;closeModal();show(\'items\');typeof itEdit===\'function\'&&itEdit()">'+esc(t('mn_pick_new'))+'</button>'+
    '<button class="btn gh" style="margin-left:auto" onclick="closeModal()">'+esc(t('back'))+'</button></div>';
  MODAL_BACK=()=>mnPaintForm();openModal(h);const q=document.getElementById('mnPickQ');if(q)q.focus();}
function mnPickListHtml(q){
  q=supKey(q);const used=new Set((MN_D&&MN_D.lines||[]).map(l=>l.item_id));
  const list=activeItems().filter(it=>!q||supKey(it.name).includes(q)||supKey(dispName(it)).includes(q)||supKey(it.cat).includes(q));
  if(!list.length)return '<div class="empty">'+esc(t('mn_pick_none'))+'</div>';
  return list.map(it=>{const c=itemCost(it);return '<div class="rowline tap" data-id="'+esc(it.id)+'" onclick="mnPickOne(this.dataset.id)">'+thumbHtml(it,'🥬')+'<div class="grow"><b>'+esc(dispName(it))+'</b>'+(used.has(it.id)?' <span class="chip ok">✓</span>':'')+
    '<div class="xs mut">'+esc(trCat(it.cat||''))+' · '+esc(trUnit(it.unit))+(c!=null?' · '+esc(mnMoney(c))+'/'+esc(trUnit(it.unit)):' · <span class="amber">'+esc(t('no_price'))+'</span>')+'</div></div></div>';}).join('');}
function mnPickSearch(v){const b=document.getElementById('mnPickList');if(b)b.innerHTML=mnPickListHtml(v);}
function mnPickOne(id){const d=MN_D,it=itemById(id);if(!d||!it)return;
  d.lines.push({item_id:id,qty:'',unit:it.unit||''});mnDraftSave();MODAL_BACK=null;mnPaintForm();
  const q=document.getElementById('mnQ'+(d.lines.length-1));if(q){try{q.scrollIntoView({block:'center'});}catch(e){}q.focus();}}
function mnCostCalc(){ // ต้นทุนต่อรอบจากร่าง (ราคาปัจจุบัน)
  const d=MN_D;let items=0;const missing=[];
  d.lines.forEach(l=>{const c=mnLineCalc(l);if(!c.it)return;if(c.cost==null){missing.push(dispName(c.it));return;}items+=c.cost;});
  const yq=num(d.yield_qty)||0,extra=num(d.extra_cost),oh=overheadFor(items,yq);const total=items+extra+oh;
  const mk=String(d.markup_pct).trim()===''?num((S.cfg||{}).markup_pct):num(d.markup_pct);
  return {items:rnd2(items),extra:rnd2(extra),oh:rnd2(oh),total:rnd2(total),perUnit:yq>0?rnd4(total/yq):null,missing,sell:yq>0?rnd4(total/yq*(1+mk/100)):null};}
function mnCostHtml(){
  const d=MN_D,c=mnCostCalc(),u=trUnit(d.yield_unit);
  let h='<div class="mncost"><div class="sm mut" style="margin-bottom:4px">'+esc(t('mn_cost_t'))+'</div>'+
    '<div class="ln"><span>'+esc(t('mn_cost_items'))+' ('+esc(t('mn_lines_n',{n:d.lines.length}))+')</span><span>'+esc(money(c.items))+'</span></div>'+
    (c.extra?'<div class="ln"><span>'+esc(t('mn_cost_extra'))+'</span><span>'+esc(money(c.extra))+'</span></div>':'')+
    (c.oh?'<div class="ln"><span>'+esc(t('mn_cost_oh'))+'</span><span>'+esc(money(c.oh))+'</span></div>':'')+
    '<div class="ln tot"><span>'+esc(t('mn_cost_total'))+'</span><span>'+esc(money(c.total))+'</span></div>'+
    (c.perUnit!=null?'<div class="ln tot"><span>'+esc(t('mn_cost_unit',{u}))+'</span><b>'+esc(mnMoney(c.perUnit))+'</b></div>'+
      '<div class="ln"><span>'+esc(t('mn_sell'))+'</span><span>'+esc(mnMoney(c.sell))+'/'+esc(u)+'</span></div>':'');
  if(c.missing.length)h+='<div class="amber sm" style="margin-top:4px">⚠ '+esc(t('mn_cost_missing',{list:c.missing.join(', ')}))+'</div>';
  return h+'</div>';}
function mnPaintCost(){const b=document.getElementById('mnCost');if(b&&MN_D)b.innerHTML=mnCostHtml();}
function mnRealHtml(r){
  if(!r)return '';const real=mnRealCost(r),u=trUnit(r.yield_unit);
  let h='<div class="mncost"><div class="sm mut">📊 '+esc(t('mn_real_t'))+'</div><div class="mnreal">';
  if(r.avg_cost!=null&&num(r.avg_cost)>0)h+='<span>'+esc(t('mn_real_avg'))+' <b>'+esc(mnMoney(r.avg_cost))+'</b>/'+esc(u)+'</span>';
  if(r.unit_cost!=null&&num(r.unit_cost)>0)h+='<span class="sm mut">· '+esc(t('mn_real_last'))+' '+esc(mnMoney(r.unit_cost))+'/'+esc(u)+'</span>';
  if(real==null)h+='<span class="amber sm">'+esc(t('mn_real_none'))+'</span>';
  else{const sp=sellPrice(r);if(sp!=null)h+='<span class="sm">· '+esc(t('mn_sell'))+' <b>'+esc(mnMoney(sp))+'</b>/'+esc(u)+'</span>';}
  h+='</div><div style="margin-top:6px"><button type="button" class="btn gh sm2" onclick="mnLots(\''+esc(r.id)+'\')">'+esc(t('mn_lots'))+'</button></div></div>';
  return h;}
function mnDraftDrop(){if(!MN_D)return;const id=MN_D.id;mnDraftClear();MN_D=mnDraftFrom(id?recipeById(id):null);mnPaintForm();}
async function mnWrite(build,row){ // ยังไม่รัน SQL บางคอลัมน์ = ตัดช่องนั้น (ออกจาก row ของผู้เรียกด้วย — แคชจะได้ตรงกับฐานข้อมูล) แล้วบันทึกช่องอื่น (PGRST204)
  setBusy(true);
  try{for(let i=0;i<8;i++){const r=await build(row);if(!r||!r.error)return r&&r.data;
      const m=/'([a-z_]+)' column/i.exec(String(r.error.message||''));
      if(r.error.code==='PGRST204'&&m&&(m[1] in row)){delete row[m[1]];if(m[1]==='max_qty')S.kcMax=false;else S.kcSql=false;continue;}   // max_qty = SQL รุ่นล่าสุดยังไม่รัน (คอลัมน์อื่นครบ) — แถบเฉพาะของ 🎯 ไม่ใช่ sql_need ทั้งแอป
      const d=document.getElementById('syncDot');if(d)d.className='err';toast(t('sv_err')+(r.error.message||r.error),true);throw r.error;}}
  finally{setBusy(false);}
  return null;}
async function mnInsLines(rows){ // insert แถวสูตร · ไม่มีช่อง unit (ยังไม่รัน SQL) = แปลงเป็นหน่วยหลักแล้วเขียนใหม่ → {data,unitLost} · พลาด = throw (toast แล้ว)
  let r=await sb.from('ck_recipe_items').insert(rows).select(),unitLost=false;
  if(r&&r.error&&r.error.code==='PGRST204'&&/'unit'/.test(String(r.error.message||''))){S.kcSql=false;unitLost=true;
    r=await sb.from('ck_recipe_items').insert(rows.map(x=>{const it=itemById(x.item_id);const f=x.unit?unitFactor(it,x.unit):1;const y=Object.assign({},x,{qty:rnd4(x.qty*(f||1))});delete y.unit;return y;})).select();}
  if(r&&r.error){toast(t('sv_err')+(r.error.message||r.error),true);throw r.error;}
  return {data:(r&&r.data&&r.data.length)?r.data:rows,unitLost};}
async function mnWriteLines(rid,lines){ // ลบของเดิมก่อน แล้วเขียนแถวใหม่ — ลบพลาด = ไม่มีอะไรเปลี่ยน · เขียนใหม่พลาด = ใส่ของเดิมคืน (ตรวจอิสระ 2026-10-16: เดิมเขียนก่อนลบ ลบพลาดแล้วสูตรซ้อนสองชุด → ล็อตถัดไปคิดส่วนผสม 2 เท่า)
  const old=(S.boms[rid]||[]).slice(),oldIds=old.map(x=>x.id).filter(x=>x!=null);
  const rows=lines.map((l,i)=>{const it=itemById(l.item_id);return {recipe_id:rid,item_id:l.item_id,qty:rnd4(num(l.qty)),unit:(l.unit&&l.unit!==it.unit)?l.unit:null,sort:i+1};});
  let out=[],unitLost=false;setBusy(true);
  try{
    if(oldIds.length){const r=await sb.from('ck_recipe_items').delete().in('id',oldIds);if(r&&r.error){toast(t('mn_lines_fail')+' · '+(r.error.message||r.error),true);throw r.error;}}
    if(rows.length){try{const w=await mnInsLines(rows);out=w.data;unitLost=w.unitLost;}
      catch(e){   // เขียนใหม่ไม่สำเร็จ → ใส่สูตรเดิมคืน (id เดิม) · ใส่คืนไม่ได้ = ฟอร์มยังมีส่วนผสมครบ กด 💾 ใหม่ได้
        let back=false;if(old.length){try{const keep=old.map(x=>{const y={id:x.id,recipe_id:x.recipe_id,item_id:x.item_id,qty:x.qty,sort:x.sort};if(x.unit!=null)y.unit=x.unit;return y;});await mnInsLines(keep);back=true;}catch(e2){}}
        if(!back){S.recipeItems=S.recipeItems.filter(x=>x.recipe_id!==rid);S.boms[rid]=[];}
        toast(back||!old.length?t('mn_lines_fail'):t('mn_lines_lost'),true);throw e;}}
  }finally{setBusy(false);}
  try{const r=await sb.from('ck_recipe_items').select('*').eq('recipe_id',rid).order('sort').order('id');if(r&&!r.error&&Array.isArray(r.data))out=r.data;}catch(e){}   // อ่านซ้ำให้แคชตรงฐานข้อมูล (fail-soft)
  S.recipeItems=S.recipeItems.filter(x=>x.recipe_id!==rid).concat(out);S.boms[rid]=out.slice();
  return unitLost;}
function mnValidate(d){ // → ข้อความผิดพลาด หรือ null
  if(!d.name)return t('need_name');
  if(S.recipes.some(r=>r.id!==d.id&&r.deleted_at==null&&supKey(r.name)===supKey(d.name)))return t('mn_dup');
  if(!(num(d.yield_qty)>0))return t('mn_need_yield');
  for(const l of d.lines){const c=mnLineCalc(l);if(!c.it)return t('mn_need_item');if(!(num(l.qty)>0))return t('mn_need_qty',{n:dispName(c.it)});if(c.f==null)return dispName(c.it)+': '+t('mn_line_bad',{u:trUnit(c.it.unit)});}
  return null;}
async function mnSave(){await once(async()=>{
  const d=MN_D;if(!d||!canKitchen())return;
  const nm=document.getElementById('mnName');if(nm)d.name=nm.value;const nt=document.getElementById('mnNote');if(nt)d.note=nt.value;
  d.name=String(d.name||'').trim();
  const err=mnValidate(d);if(err){toast(err,true);return;}
  {const r0=d.id?recipeById(d.id):null,lock=mnLockWhy(d);if(r0&&lock&&(d.yield_unit||'ถุง')!==r0.yield_unit){d.yield_unit=r0.yield_unit;mnYuPaint();mnPaintCost();toast(t('mn_lock',{why:lock}),true);return;}}   // กันทางอ้อม (select ถูกปิดอยู่แล้ว) — ร่างกลับเป็นหน่วยเดิม
  let cat=d.cat==='__new'?String(d.cat_new||'').trim():String(d.cat||'').trim();if(!cat)cat='อื่นๆ';
  const nz=v=>String(v==null?'':v).trim()===''?null:rnd4(num(v));
  const row={name:d.name,cat,yield_qty:rnd4(num(d.yield_qty)),yield_unit:d.yield_unit||'ถุง',extra_cost:rnd4(num(d.extra_cost)),markup_pct:nz(d.markup_pct),target_qty:nz(d.target_qty),target_days:nz(d.target_days),note:String(d.note||'')};
  if(S.kcMax!==false)row.max_qty=nz(d.max_qty);   // 🎯 Max — รู้แล้วว่าไม่มีคอลัมน์ (ยังไม่รัน SQL รุ่นล่าสุด) = ไม่ส่ง (mnWrite จะตัดให้ถ้าเพิ่งเจอ)
  let r=d.id?recipeById(d.id):null,renamed=false;
  try{
    if(r){renamed=r.name!==d.name;if(renamed)row.i18n=null;
      await mnWrite(x=>sb.from('ck_recipes').update(x).eq('id',r.id),row);Object.assign(r,row);if(renamed)r.i18n=null;}
    else{row.id=uid('rc');row.qty=0;row.active=true;row.image_url=d.image_url||null;
      row.sort=S.recipes.reduce((m,x)=>Math.max(m,num(x.sort)),0)+1;
      await mnWrite(x=>sb.from('ck_recipes').insert(x),row);if(!('active' in row))row.active=true;r=row;S.recipes.push(r);renamed=true;}
    var unitLost=await mnWriteLines(r.id,d.lines);
  }catch(e){return;}
  S.recipes.sort((a,b)=>(num(a.sort)-num(b.sort))||String(a.name||'').localeCompare(String(b.name||''),'th'));
  const maxLost=S.kcMax===false&&String(d.max_qty==null?'':d.max_qty).trim()!=='';   // กรอก Max ไว้แต่ฐานข้อมูลไม่มีคอลัมน์ = บอกตรง ๆ (ช่องอื่นบันทึกแล้ว)
  MN_D=null;mnDraftClear();MODAL_BACK=null;closeModal();toast(unitLost?t('mn_unit_lost'):maxLost?t('mn_tg_sql'):t('sv_ok'),unitLost?true:(maxLost?'warn':false));
  if(renamed)mnAutoI18n(r);
  if(S.tab==='menus')show('menus');else if(S.tab==='make')rerender();
});}
async function mnOff(id,on){ // on=false → ไม่ใช้แล้ว · on=true → ใช้ต่อ (ไม่ลบ สูตร/ประวัติอยู่ครบ)
  if(!canKitchen())return;const r=recipeById(id);if(!r)return;
  if(!on){let msg=t('mn_off_q',{n:dispName(r)});if(num(r.qty)>0)msg+='\n'+t('mn_off_stock',{q:fmtQ(r.qty),u:trUnit(r.yield_unit)});
    if(!await confirm2(msg,{ok:t('mn_off_btn'),danger:true}))return;}
  await once(async()=>{
    await mnWrite(x=>sb.from('ck_recipes').update(x).eq('id',id),{active:!!on});r.active=!!on;
    if(MN_D&&MN_D.id===id){MN_D=null;mnDraftClear();MODAL_BACK=null;closeModal();}
    toast(on?t('mn_restored'):t('mn_off_done'));
    if(S.tab==='menus')show('menus');else if(S.tab==='make')rerender();});
}
async function mnDel(id){ // ลบถาวร (soft: deleted_at) — เฉพาะหัวหน้า ใช้กับเมนูที่เพิ่มผิด
  if(!isAdminish())return;const r=recipeById(id);if(!r)return;
  if(!await confirm2(t('mn_del_q',{n:dispName(r)}),{ok:t('delete'),danger:true}))return;
  await once(async()=>{
    await db(()=>sb.from('ck_recipes').update({deleted_at:new Date().toISOString()}).eq('id',id));
    S.recipes=S.recipes.filter(x=>x.id!==id);MN_D=null;mnDraftClear();MODAL_BACK=null;closeModal();toast(t('done'));
    if(S.tab==='menus')show('menus');});
}
async function mnLots(id){ // ต้นทุนรายล็อต (kc_productions) — ปิดแล้วกลับฟอร์ม
  const r=recipeById(id);if(!r)return;let rows=[];
  try{const q=await sb.from('kc_productions').select('id,d,lots,actual_qty,unit,cost_items,cost_overhead,cost_total,cost_unit,by_name,created_at').eq('recipe_id',id).order('d',{ascending:false}).order('created_at',{ascending:false}).limit(30);
    if(q&&!q.error&&q.data)rows=q.data;else if(q&&q.error&&MISSING_TBL(q.error))S.kcSql=false;}catch(e){}
  const u=trUnit(r.yield_unit);
  let h='<h3>'+esc(t('mn_lots_t'))+' · '+esc(dispName(r))+'</h3>'+sqlNeedBox();
  if(r.avg_cost!=null&&num(r.avg_cost)>0)h+='<div class="hintbox">'+esc(t('mn_real_avg'))+' <b>'+esc(mnMoney(r.avg_cost))+'</b>/'+esc(u)+'</div>';
  if(!rows.length)h+='<div class="empty">'+esc(t('mn_lots_none'))+'</div>';
  else h+='<div class="twrap"><table class="t"><tr><th>'+esc(t('date'))+'</th><th class="n">'+esc(t('mn_col_lots'))+'</th><th class="n">'+esc(t('mn_col_got'))+'</th><th class="n">'+esc(t('mn_col_items'))+'</th><th class="n">'+esc(t('mn_col_total'))+'</th><th class="n">'+esc(t('mn_col_unit'))+'</th></tr>'+
    rows.map(p=>'<tr class="tap" data-id="'+esc(p.id)+'" onclick="typeof mkDetail===\'function\'&&mkDetail(this.dataset.id)"><td>'+esc(dispDate(p.d))+'<div class="xs mut">'+esc(p.by_name||'')+'</div></td><td class="n">'+fmtQ(p.lots)+'</td><td class="n">'+fmtQ(p.actual_qty)+' '+esc(trUnit(p.unit||r.yield_unit))+'</td>'+
      '<td class="n">'+esc(money(p.cost_items))+'</td><td class="n">'+esc(money(p.cost_total))+'</td><td class="n b">'+esc(mnMoney(p.cost_unit))+'</td></tr>').join('')+'</table></div>';
  h+='<button class="btn gh" style="width:100%;margin-top:10px" onclick="closeModal()">'+esc(t('back'))+'</button>';
  MODAL_BACK=MN_D?()=>mnPaintForm():null;openModal(h);
}
async function mnGtx(text,to){ // th → en/lo/my (Google translate endpoint สาธารณะ) · พลาด = null
  const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),4000);
  try{const r=await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=th&tl='+to+'&dt=t&q='+encodeURIComponent(text),{signal:ctl.signal});
    const j=await r.json();return (j&&j[0]&&j[0].map(x=>x[0]).join(''))||null;}catch(e){return null;}finally{clearTimeout(tm);}}
async function mnAutoI18n(r){ // เติมคำแปลที่ยังว่าง (ไม่บล็อกการบันทึก · ผิดพลาดเงียบ)
  if(!r||!r.name)return;const cur=(r.i18n&&typeof r.i18n==='object')?r.i18n:{};const o=Object.assign({},cur);let got=false;
  for(const L of ['en','lo','my']){if(o[L])continue;const v=await mnGtx(r.name,L);if(v){o[L]=v;got=true;}}
  if(!got)return;const live=recipeById(r.id);if(!live||live.name!==r.name)return;
  live.i18n=o;try{await sb.from('ck_recipes').update({i18n:o}).eq('id',r.id);}catch(e){}
  if(S.tab==='menus'&&LANG!=='th')mnPaintGrid();}
