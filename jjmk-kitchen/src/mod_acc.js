/* ============================================================
   💰 บัญชี — acc (ac*)  · เฉพาะหัวหน้า/ผู้ดูแล (PAGE_PERM acc = admin → show() กันให้แล้ว · โค้ดเช็ค isAdminish ซ้ำ)
   เลือกเดือน (AC_YM · จำใน localStorage jjck_ac_ym) →
     รายรับจากสาขา = Σ kc_deliveries.total (status ≠ void · เฉพาะสาขาที่เห็น inBr) แยกสาขา
     ต้นทุนของที่ส่ง (COGS) = Σ kc_delivery_lines sent × unit_cost (ต้นทุนจริงต่อหน่วยตอนส่ง) · กำไรขั้นต้น = รายรับ − COGS
     ซื้อของ = Σ kc_receipts.total · ค่าใช้จ่ายแฝง = Σ kc_expenses (ym) · เงินคงเหลือ (มุมมองเงินสด) = รายรับ − ซื้อของ − ค่าใช้จ่ายแฝง
     ยอดสาขายังไม่จ่าย = kc_deliveries status 'sent' ทุกเดือน แยกสาขา
     ค่าใช้จ่ายแฝง: เพิ่ม/แก้/ลบ (kc_expenses) · รายการประจำ (recurring) คัดลอกจากเดือนก่อนปุ่มเดียว (ข้ามชื่อที่มีแล้ว)
     ต้นทุนแฝงต่อหน่วยที่แนะนำ = ค่าใช้จ่ายแฝง(เดือน) ÷ หน่วยที่ทำได้ (Σ kc_productions.actual_qty) → ปุ่มเขียน cfg overhead_mode='per_unit' + overhead_value (cfgSave) — ล็อตใหม่ใช้ · ล็อตเก่าไม่เปลี่ยน
     บวกราคาขายสาขา (markup_pct) + คำอธิบาย/ตัวอย่าง · ⬇ CSV ของเดือน
   ทุกตารางอ่านแบบ fail-soft (อ่านไม่ได้ = ส่วนนั้นบอก "อ่านข้อมูลไม่ได้" ส่วนอื่นยังทำงาน)
   ============================================================ */
I18N.add({
th:{ac_this_month:'เดือนนี้',ac_noread:'อ่านข้อมูลไม่ได้',ac_scope:'🔒 เห็นเฉพาะสาขา {b} — ตัวเลขรวมเฉพาะสาขาที่ดูแล',
  ac_rev:'รายรับจากสาขา',ac_bills_n:'{n} บิล',ac_cogs:'ต้นทุนของที่ส่ง',ac_cogs_s:'ต้นทุนจริง/หน่วย × ที่ส่ง',ac_gross:'กำไรขั้นต้น',ac_gross_s:'รายรับ − ต้นทุนของที่ส่ง',
  ac_purch:'ซื้อของเข้าครัว',ac_rcpts_n:'{n} ใบรับของ',ac_exp:'ค่าใช้จ่ายแฝง',ac_items_n:'{n} รายการ',ac_net:'เงินคงเหลือ',ac_net_s:'รายรับ − ซื้อของ − ค่าใช้จ่ายแฝง',
  ac_explain:'กำไรขั้นต้น = รายรับ − ต้นทุนของที่ส่งให้สาขา (ต้นทุนจริงต่อหน่วยตอนส่ง ซึ่งรวมต้นทุนแฝงที่ตั้งไว้แล้ว) · เงินคงเหลือ = รายรับ − เงินที่จ่ายซื้อของ − ค่าใช้จ่ายแฝงของเดือน (มุมมองเงินสด: ของที่ซื้อแล้วยังอยู่ในสต๊อกไม่ได้หักออก)',
  ac_rev_t:'🚚 รายรับแยกสาขา',ac_col_bills:'บิล',ac_col_amt:'ยอด',ac_col_cost:'ต้นทุน',ac_col_gross:'กำไร',ac_rev_none:'เดือนนี้ยังไม่มีบิลส่งสาขา',ac_bills_go:'🧾 ดูบิล',
  ac_recv_t:'💸 ยอดที่สาขายังไม่จ่าย',ac_recv_h:'บิลทุกเดือนที่ยังไม่ติ๊ก "จ่ายแล้ว" — ติ๊กได้ที่ 🧾 บิลสาขา',ac_recv_none:'ไม่มีบิลค้างจ่าย 👍',ac_recv_old:'เก่าสุด {d}',
  ac_exp_t:'🧾 ค่าใช้จ่ายแฝง',ac_exp_h:'ค่าแรง ค่าไฟ ค่าแก๊ส ค่าเช่า … ของครัวกลางในเดือนนี้ — ใช้คิดต้นทุนแฝงต่อหน่วย',ac_exp_add:'＋ เพิ่มค่าใช้จ่าย',ac_exp_none:'เดือนนี้ยังไม่มีค่าใช้จ่าย',
  ac_exp_copy:'📋 คัดลอกรายการประจำจากเดือนก่อน ({n})',ac_exp_copy_q:'คัดลอกรายการประจำ {n} รายการจาก {m} มาเดือนนี้?',ac_exp_copied:'คัดลอกมา {n} รายการแล้ว ✅',
  ac_recur:'ประจำทุกเดือน',ac_recur_h:'ติ๊กไว้ = เดือนหน้ากดคัดลอกมาได้ปุ่มเดียว',ac_exp_f_t:'ค่าใช้จ่ายแฝง',ac_exp_name:'รายการ',ac_exp_ph:'เช่น ค่าแรงครัว · ค่าไฟ',ac_exp_cat:'หมวด',ac_exp_amt:'จำนวนเงิน (บาท)',ac_exp_d:'วันที่',
  ac_exp_need:'ใส่ชื่อรายการและจำนวนเงิน',ac_exp_del_q:'ลบ "{n}" {m}?',
  ac_oh_t:'🧮 ต้นทุนแฝงต่อหน่วย',ac_oh_units:'ทำของเดือนนี้ {q} หน่วย ({n} รอบ · นับรวมทุกเมนู)',ac_oh_calc:'ค่าใช้จ่ายแฝง {m} ÷ {q} หน่วย = {x} /หน่วย',
  ac_oh_now:'ตอนนี้ตั้งไว้: {v}',ac_oh_now_unit:'{v} บาท/หน่วย',ac_oh_now_pct:'{v}% ของค่าวัตถุดิบ',ac_oh_use:'✅ ใช้ {x} /หน่วย',
  ac_oh_h:'กดแล้วล็อตที่ทำหลังจากนี้จะบวกค่านี้ในต้นทุนทุกหน่วย — ล็อตที่ทำไปแล้วไม่เปลี่ยน · ตั้งเองได้ที่ ⚙️ ตั้งค่า',
  ac_oh_none:'เดือนนี้ยังไม่ได้ทำของ จึงคิดต่อหน่วยไม่ได้',ac_oh_noexp:'เดือนนี้ยังไม่มีค่าใช้จ่ายแฝง — ใส่ก่อนแล้วค่อยคิดต่อหน่วย',ac_oh_applied:'ตั้งต้นทุนแฝง {x} /หน่วยแล้ว ✅ ล็อตใหม่จะใช้ค่านี้',ac_oh_same:'ตั้งไว้เท่านี้อยู่แล้ว',
  ac_mk_t:'🏷️ บวกราคาขายสาขา',ac_mk_h:'ราคาที่คิดสาขา = ต้นทุน/หน่วย (รวมต้นทุนแฝง) × (1 + %) · 0 = คิดเท่าต้นทุน · เมนูที่ตั้ง % เองใน 📖 เมนู/สูตร ใช้ค่าของเมนูนั้น',
  ac_mk_ex:'ตัวอย่าง: {r} ต้นทุน {c}/{u} → คิดสาขา {p}/{u}',ac_mk_lbl:'บวก (%)',ac_mk_save:'💾 บันทึก %',ac_mk_saved:'บันทึก {v}% แล้ว ✅ บิลที่ออกหลังจากนี้ใช้ค่านี้',ac_mk_bad:'ใส่ % เป็นตัวเลข 0–1000 (เช่น 10 หรือ 12.5) — ยังไม่บันทึก',
  ac_csv:'⬇ CSV',ac_csv_none:'เดือนนี้ยังไม่มีข้อมูล',ac_by:'โดย',ac_total:'รวม'},
en:{ac_this_month:'This month',ac_noread:'Could not read',ac_scope:'🔒 Only branches {b} — totals cover only those branches',
  ac_rev:'Revenue from branches',ac_bills_n:'{n} bills',ac_cogs:'Cost of goods sent',ac_cogs_s:'actual cost/unit × sent',ac_gross:'Gross profit',ac_gross_s:'revenue − cost of goods sent',
  ac_purch:'Purchases',ac_rcpts_n:'{n} receipts',ac_exp:'Overheads',ac_items_n:'{n} items',ac_net:'Cash left',ac_net_s:'revenue − purchases − overheads',
  ac_explain:'Gross profit = revenue − cost of the goods sent to branches (actual cost per unit at the time of sending, which already includes the overhead setting) · Cash left = revenue − money paid for purchases − this month\'s overheads (cash view: purchases still in stock are not deducted)',
  ac_rev_t:'🚚 Revenue by branch',ac_col_bills:'Bills',ac_col_amt:'Amount',ac_col_cost:'Cost',ac_col_gross:'Profit',ac_rev_none:'No branch bills this month',ac_bills_go:'🧾 Bills',
  ac_recv_t:'💸 Unpaid by branches',ac_recv_h:'Bills of any month not yet marked "paid" — mark them on 🧾 Branch bills',ac_recv_none:'No unpaid bills 👍',ac_recv_old:'oldest {d}',
  ac_exp_t:'🧾 Overheads',ac_exp_h:'Wages, power, gas, rent … of the central kitchen this month — used for the overhead per unit',ac_exp_add:'＋ Add expense',ac_exp_none:'No expenses this month yet',
  ac_exp_copy:'📋 Copy recurring items from last month ({n})',ac_exp_copy_q:'Copy {n} recurring items from {m} into this month?',ac_exp_copied:'Copied {n} items ✅',
  ac_recur:'Every month',ac_recur_h:'Ticked = next month copies it with one tap',ac_exp_f_t:'Overhead expense',ac_exp_name:'Item',ac_exp_ph:'e.g. kitchen wages · electricity',ac_exp_cat:'Category',ac_exp_amt:'Amount (THB)',ac_exp_d:'Date',
  ac_exp_need:'Enter a name and an amount',ac_exp_del_q:'Delete "{n}" {m}?',
  ac_oh_t:'🧮 Overhead per unit',ac_oh_units:'Produced this month: {q} units ({n} lots · all products together)',ac_oh_calc:'Overheads {m} ÷ {q} units = {x} per unit',
  ac_oh_now:'Current setting: {v}',ac_oh_now_unit:'{v} THB per unit',ac_oh_now_pct:'{v}% of ingredient cost',ac_oh_use:'✅ Use {x} per unit',
  ac_oh_h:'Lots produced from now on add this to the cost of every unit — lots already made do not change · you can also set it on ⚙️ Settings',
  ac_oh_none:'Nothing produced this month yet, so a per-unit figure cannot be computed',ac_oh_noexp:'No overheads this month yet — add them first',ac_oh_applied:'Overhead set to {x} per unit ✅ new lots will use it',ac_oh_same:'Already set to this value',
  ac_mk_t:'🏷️ Branch price markup',ac_mk_h:'Branch price = cost/unit (incl. overhead) × (1 + %) · 0 = at cost · a product with its own % on 📖 Menus uses that instead',
  ac_mk_ex:'Example: {r} cost {c}/{u} → branch price {p}/{u}',ac_mk_lbl:'Markup (%)',ac_mk_save:'💾 Save %',ac_mk_saved:'Saved {v}% ✅ bills issued from now on use it',ac_mk_bad:'Enter the % as a number 0–1000 (e.g. 10 or 12.5) — not saved',
  ac_csv:'⬇ CSV',ac_csv_none:'No data this month',ac_by:'by',ac_total:'Total'},
lo:{ac_this_month:'ເດືອນນີ້',ac_noread:'ອ່ານຂໍ້ມູນບໍ່ໄດ້',ac_scope:'🔒 ເຫັນສະເພາະສາຂາ {b} — ຕົວເລກລວມສະເພາະສາຂາທີ່ດູແລ',
  ac_rev:'ລາຍຮັບຈາກສາຂາ',ac_bills_n:'{n} ບິນ',ac_cogs:'ຕົ້ນທຶນເຄື່ອງທີ່ສົ່ງ',ac_cogs_s:'ຕົ້ນທຶນຈິງ/ຫົວໜ່ວຍ × ທີ່ສົ່ງ',ac_gross:'ກຳໄລຂັ້ນຕົ້ນ',ac_gross_s:'ລາຍຮັບ − ຕົ້ນທຶນເຄື່ອງທີ່ສົ່ງ',
  ac_purch:'ຊື້ເຄື່ອງເຂົ້າຄົວ',ac_rcpts_n:'{n} ໃບຮັບເຄື່ອງ',ac_exp:'ຄ່າໃຊ້ຈ່າຍແຝງ',ac_items_n:'{n} ລາຍການ',ac_net:'ເງິນຄົງເຫຼືອ',ac_net_s:'ລາຍຮັບ − ຊື້ເຄື່ອງ − ຄ່າໃຊ້ຈ່າຍແຝງ',
  ac_explain:'ກຳໄລຂັ້ນຕົ້ນ = ລາຍຮັບ − ຕົ້ນທຶນເຄື່ອງທີ່ສົ່ງໃຫ້ສາຂາ (ຕົ້ນທຶນຈິງຕໍ່ຫົວໜ່ວຍຕອນສົ່ງ ເຊິ່ງລວມຕົ້ນທຶນແຝງທີ່ຕັ້ງໄວ້ແລ້ວ) · ເງິນຄົງເຫຼືອ = ລາຍຮັບ − ເງິນທີ່ຈ່າຍຊື້ເຄື່ອງ − ຄ່າໃຊ້ຈ່າຍແຝງຂອງເດືອນ (ມຸມມອງເງິນສົດ: ເຄື່ອງທີ່ຊື້ແລ້ວຍັງຢູ່ໃນສະຕັອກບໍ່ໄດ້ຫັກອອກ)',
  ac_rev_t:'🚚 ລາຍຮັບແຍກສາຂາ',ac_col_bills:'ບິນ',ac_col_amt:'ຍອດ',ac_col_cost:'ຕົ້ນທຶນ',ac_col_gross:'ກຳໄລ',ac_rev_none:'ເດືອນນີ້ຍັງບໍ່ມີບິນສົ່ງສາຂາ',ac_bills_go:'🧾 ເບິ່ງບິນ',
  ac_recv_t:'💸 ຍອດທີ່ສາຂາຍັງບໍ່ຈ່າຍ',ac_recv_h:'ບິນທຸກເດືອນທີ່ຍັງບໍ່ຕິກ "ຈ່າຍແລ້ວ" — ຕິກໄດ້ທີ່ 🧾 ບິນສາຂາ',ac_recv_none:'ບໍ່ມີບິນຄ້າງຈ່າຍ 👍',ac_recv_old:'ເກົ່າສຸດ {d}',
  ac_exp_t:'🧾 ຄ່າໃຊ້ຈ່າຍແຝງ',ac_exp_h:'ຄ່າແຮງ ຄ່າໄຟ ຄ່າແກັສ ຄ່າເຊົ່າ … ຂອງຄົວກາງໃນເດືອນນີ້ — ໃຊ້ຄິດຕົ້ນທຶນແຝງຕໍ່ຫົວໜ່ວຍ',ac_exp_add:'＋ ເພີ່ມຄ່າໃຊ້ຈ່າຍ',ac_exp_none:'ເດືອນນີ້ຍັງບໍ່ມີຄ່າໃຊ້ຈ່າຍ',
  ac_exp_copy:'📋 ຄັດລອກລາຍການປະຈຳຈາກເດືອນກ່ອນ ({n})',ac_exp_copy_q:'ຄັດລອກລາຍການປະຈຳ {n} ລາຍການຈາກ {m} ມາເດືອນນີ້?',ac_exp_copied:'ຄັດລອກມາ {n} ລາຍການແລ້ວ ✅',
  ac_recur:'ປະຈຳທຸກເດືອນ',ac_recur_h:'ຕິກໄວ້ = ເດືອນໜ້າກົດຄັດລອກມາໄດ້ປຸ່ມດຽວ',ac_exp_f_t:'ຄ່າໃຊ້ຈ່າຍແຝງ',ac_exp_name:'ລາຍການ',ac_exp_ph:'ເຊັ່ນ ຄ່າແຮງຄົວ · ຄ່າໄຟ',ac_exp_cat:'ໝວດ',ac_exp_amt:'ຈຳນວນເງິນ (ບາດ)',ac_exp_d:'ວັນທີ',
  ac_exp_need:'ໃສ່ຊື່ລາຍການ ແລະ ຈຳນວນເງິນ',ac_exp_del_q:'ລຶບ "{n}" {m}?',
  ac_oh_t:'🧮 ຕົ້ນທຶນແຝງຕໍ່ຫົວໜ່ວຍ',ac_oh_units:'ເຮັດເຄື່ອງເດືອນນີ້ {q} ຫົວໜ່ວຍ ({n} ຮອບ · ນັບລວມທຸກເມນູ)',ac_oh_calc:'ຄ່າໃຊ້ຈ່າຍແຝງ {m} ÷ {q} ຫົວໜ່ວຍ = {x} /ຫົວໜ່ວຍ',
  ac_oh_now:'ຕອນນີ້ຕັ້ງໄວ້: {v}',ac_oh_now_unit:'{v} ບາດ/ຫົວໜ່ວຍ',ac_oh_now_pct:'{v}% ຂອງຄ່າວັດຖຸດິບ',ac_oh_use:'✅ ໃຊ້ {x} /ຫົວໜ່ວຍ',
  ac_oh_h:'ກົດແລ້ວລັອດທີ່ເຮັດຫຼັງຈາກນີ້ຈະບວກຄ່ານີ້ໃນຕົ້ນທຶນທຸກຫົວໜ່ວຍ — ລັອດທີ່ເຮັດໄປແລ້ວບໍ່ປ່ຽນ · ຕັ້ງເອງໄດ້ທີ່ ⚙️ ຕັ້ງຄ່າ',
  ac_oh_none:'ເດືອນນີ້ຍັງບໍ່ໄດ້ເຮັດເຄື່ອງ ຈຶ່ງຄິດຕໍ່ຫົວໜ່ວຍບໍ່ໄດ້',ac_oh_noexp:'ເດືອນນີ້ຍັງບໍ່ມີຄ່າໃຊ້ຈ່າຍແຝງ — ໃສ່ກ່ອນແລ້ວຄ່ອຍຄິດ',ac_oh_applied:'ຕັ້ງຕົ້ນທຶນແຝງ {x} /ຫົວໜ່ວຍແລ້ວ ✅ ລັອດໃໝ່ຈະໃຊ້ຄ່ານີ້',ac_oh_same:'ຕັ້ງໄວ້ເທົ່ານີ້ຢູ່ແລ້ວ',
  ac_mk_t:'🏷️ ບວກລາຄາຂາຍສາຂາ',ac_mk_h:'ລາຄາທີ່ຄິດສາຂາ = ຕົ້ນທຶນ/ຫົວໜ່ວຍ (ລວມຕົ້ນທຶນແຝງ) × (1 + %) · 0 = ຄິດເທົ່າຕົ້ນທຶນ · ເມນູທີ່ຕັ້ງ % ເອງໃນ 📖 ເມນູ/ສູດ ໃຊ້ຄ່າຂອງເມນູນັ້ນ',
  ac_mk_ex:'ຕົວຢ່າງ: {r} ຕົ້ນທຶນ {c}/{u} → ຄິດສາຂາ {p}/{u}',ac_mk_lbl:'ບວກ (%)',ac_mk_save:'💾 ບັນທຶກ %',ac_mk_saved:'ບັນທຶກ {v}% ແລ້ວ ✅ ບິນທີ່ອອກຫຼັງຈາກນີ້ໃຊ້ຄ່ານີ້',ac_mk_bad:'ໃສ່ % ເປັນຕົວເລກ 0–1000 (ເຊັ່ນ 10 ຫຼື 12.5) — ຍັງບໍ່ບັນທຶກ',
  ac_csv:'⬇ CSV',ac_csv_none:'ເດືອນນີ້ຍັງບໍ່ມີຂໍ້ມູນ',ac_by:'ໂດຍ',ac_total:'ລວມ'},
my:{ac_this_month:'ယခုလ',ac_noread:'ဖတ်မရပါ',ac_scope:'🔒 ဆိုင်ခွဲ {b} သာ — စုစုပေါင်းသည် ထိုဆိုင်ခွဲများသာ',
  ac_rev:'ဆိုင်ခွဲမှ ဝင်ငွေ',ac_bills_n:'ဘေလ် {n}',ac_cogs:'ပို့သောကုန် ကုန်ကျစရိတ်',ac_cogs_s:'အမှန်ကုန်ကျစရိတ်/ယူနစ် × ပို့သည်',ac_gross:'အကြမ်းအမြတ်',ac_gross_s:'ဝင်ငွေ − ပို့သောကုန် ကုန်ကျစရိတ်',
  ac_purch:'ဝယ်ယူမှု',ac_rcpts_n:'လက်ခံစာ {n}',ac_exp:'ဝှက်ကုန်ကျစရိတ်',ac_items_n:'{n} ခု',ac_net:'ကျန်ငွေ',ac_net_s:'ဝင်ငွေ − ဝယ်ယူမှု − ဝှက်ကုန်ကျစရိတ်',
  ac_explain:'အကြမ်းအမြတ် = ဝင်ငွေ − ဆိုင်ခွဲသို့ ပို့သောကုန် ကုန်ကျစရိတ် (ပို့ချိန် အမှန်ကုန်ကျစရိတ်/ယူနစ်၊ သတ်မှတ်ထားသော ဝှက်ကုန်ကျစရိတ် ပါဝင်ပြီး) · ကျန်ငွေ = ဝင်ငွေ − ဝယ်ယူရန်ပေးချေငွေ − ဤလ ဝှက်ကုန်ကျစရိတ် (ငွေသားအမြင်: လက်ကျန်ထဲရှိ ဝယ်ထားသောကုန် မနုတ်ပါ)',
  ac_rev_t:'🚚 ဆိုင်ခွဲအလိုက် ဝင်ငွေ',ac_col_bills:'ဘေလ်',ac_col_amt:'ပမာဏ',ac_col_cost:'ကုန်ကျစရိတ်',ac_col_gross:'အမြတ်',ac_rev_none:'ဤလ ဆိုင်ခွဲဘေလ် မရှိသေး',ac_bills_go:'🧾 ဘေလ်များ',
  ac_recv_t:'💸 ဆိုင်ခွဲ မပေးရသေးသော ငွေ',ac_recv_h:'"ပေးပြီး" ဟု မအမှတ်အသားရသေးသော မည်သည့်လ ဘေလ်မဆို — 🧾 ဆိုင်ခွဲဘေလ် တွင် အမှတ်အသားပြုပါ',ac_recv_none:'မပေးရသေးသော ဘေလ် မရှိ 👍',ac_recv_old:'အဟောင်းဆုံး {d}',
  ac_exp_t:'🧾 ဝှက်ကုန်ကျစရိတ်',ac_exp_h:'ဤလ ဗဟိုမီးဖိုချောင်၏ လုပ်အားခ၊ မီး၊ ဂက်စ်၊ ငှားရမ်းခ … — ယူနစ်တစ်ခုလျှင် ဝှက်ကုန်ကျစရိတ် တွက်ရန် သုံးသည်',ac_exp_add:'＋ ကုန်ကျစရိတ် ထည့်',ac_exp_none:'ဤလ ကုန်ကျစရိတ် မရှိသေး',
  ac_exp_copy:'📋 ယခင်လမှ လစဉ်စာရင်း ကူးယူ ({n})',ac_exp_copy_q:'{m} မှ လစဉ်စာရင်း {n} ခုကို ဤလသို့ ကူးမလား?',ac_exp_copied:'{n} ခု ကူးပြီး ✅',
  ac_recur:'လစဉ်',ac_recur_h:'အမှန်ခြစ်ထားလျှင် နောက်လတွင် တစ်ချက်နှိပ်၍ ကူးနိုင်',ac_exp_f_t:'ဝှက်ကုန်ကျစရိတ်',ac_exp_name:'အမည်',ac_exp_ph:'ဥပမာ မီးဖိုချောင်လုပ်အားခ · မီးခ',ac_exp_cat:'အမျိုးအစား',ac_exp_amt:'ပမာဏ (ဘတ်)',ac_exp_d:'ရက်စွဲ',
  ac_exp_need:'အမည်နှင့် ပမာဏ ထည့်ပါ',ac_exp_del_q:'"{n}" {m} ကို ဖျက်မလား?',
  ac_oh_t:'🧮 ယူနစ်တစ်ခုလျှင် ဝှက်ကုန်ကျစရိတ်',ac_oh_units:'ဤလ ထုတ်လုပ်မှု {q} ယူနစ် ({n} အသုတ် · ထုတ်ကုန်အားလုံးပေါင်း)',ac_oh_calc:'ဝှက်ကုန်ကျစရိတ် {m} ÷ {q} ယူနစ် = {x} /ယူနစ်',
  ac_oh_now:'လက်ရှိ သတ်မှတ်ချက်: {v}',ac_oh_now_unit:'{v} ဘတ်/ယူနစ်',ac_oh_now_pct:'ကုန်ကြမ်းစရိတ်၏ {v}%',ac_oh_use:'✅ {x} /ယူနစ် သုံးမည်',
  ac_oh_h:'နှိပ်ပြီးနောက် ထုတ်လုပ်သော အသုတ်များတွင် ယူနစ်တိုင်း ဤတန်ဖိုး ထည့်တွက်မည် — ထုတ်ပြီးသား အသုတ်များ မပြောင်းပါ · ⚙️ ဆက်တင် တွင်လည်း သတ်မှတ်နိုင်',
  ac_oh_none:'ဤလ မထုတ်လုပ်ရသေး၍ ယူနစ်တစ်ခုလျှင် တွက်မရပါ',ac_oh_noexp:'ဤလ ဝှက်ကုန်ကျစရိတ် မရှိသေး — အရင်ထည့်ပါ',ac_oh_applied:'ဝှက်ကုန်ကျစရိတ် {x} /ယူနစ် သတ်မှတ်ပြီး ✅ အသုတ်သစ်များ သုံးမည်',ac_oh_same:'ဤတန်ဖိုး သတ်မှတ်ပြီးသား',
  ac_mk_t:'🏷️ ဆိုင်ခွဲဈေး ထပ်ပေါင်း',ac_mk_h:'ဆိုင်ခွဲဈေး = ကုန်ကျစရိတ်/ယူနစ် (ဝှက်ကုန်ကျစရိတ်ပါ) × (1 + %) · 0 = ကုန်ကျစရိတ်အတိုင်း · 📖 မီနူး တွင် ကိုယ်ပိုင် % ရှိသော ထုတ်ကုန်သည် ၎င်းကို သုံးမည်',
  ac_mk_ex:'ဥပမာ: {r} ကုန်ကျစရိတ် {c}/{u} → ဆိုင်ခွဲဈေး {p}/{u}',ac_mk_lbl:'ထပ်ပေါင်း (%)',ac_mk_save:'💾 % သိမ်း',ac_mk_saved:'{v}% သိမ်းပြီး ✅ ယခုမှစ၍ ထုတ်သော ဘေလ်များ သုံးမည်',ac_mk_bad:'% ကို 0–1000 ဂဏန်းဖြင့် ထည့်ပါ (ဥပမာ 10 သို့မဟုတ် 12.5) — မသိမ်းရသေးပါ',
  ac_csv:'⬇ CSV',ac_csv_none:'ဤလ အချက်အလက် မရှိသေး',ac_by:'မှ',ac_total:'စုစုပေါင်း'}
});
CSS.add(`
@media(max-width:339px){#acRevT .c-n{display:none}}   /* Galaxy Fold: ซ่อนจำนวนบิล ให้คอลัมน์กำไรอยู่ในจอ */
.ac-mon{display:flex;gap:8px;align-items:center;margin:0 0 12px;flex-wrap:wrap}
.ac-mon b{font-family:var(--fh);font-size:17px;min-width:128px;text-align:center;flex:1}
@media(min-width:640px){.ac-mon b{flex:none}}
.ac-mon .btn{min-width:48px}
.kpis.ack .kpi.hero{grid-column:1/-1}
@media(min-width:760px){.kpis.ack{grid-template-columns:repeat(3,1fr)}.kpis.ack .kpi.hero{grid-column:auto}}
.ac-row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--line);flex-wrap:wrap}
.ac-row:last-of-type{border-bottom:0}.ac-row .grow{flex:1;min-width:140px}
.ac-row .amt{font-family:var(--fh);font-weight:700;font-size:15px;white-space:nowrap}
.ac-big{font-family:var(--fh);font-weight:700;font-size:18px;margin:6px 0;overflow-wrap:anywhere}
.ac-chk{display:flex;align-items:center;gap:8px;min-height:44px;cursor:pointer;flex-wrap:wrap}
.ac-chk input{width:22px;height:22px;min-height:0;flex:none;margin:0}
.ac-foot{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.ac-mk{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0}
.ac-mk input{flex:1;min-width:72px;max-width:140px}.ac-mk .btn{flex:none}
`);
let AC_YM=(function(){const v=LS.get('jjck_ac_ym','');return /^\d{4}-\d{2}$/.test(String(v))?String(v):ymNow();})();
let AC=null,AC_SEQ=0;
RENDER.acc=function(el){
  if(!isAdminish()){el.innerHTML='<div class="card"><div class="empty">🔒 '+esc(t('admin_only'))+'</div></div>';return;}
  pinnedBar(null,el);
  el.innerHTML=dhead('💰 '+t('nav_acc'),'<button type="button" class="btn gh sm2" id="acCsvBtn" onclick="acCsv()">'+esc(t('ac_csv'))+'</button>')+sqlNeedBox()+
    '<div class="ac-mon"><button type="button" class="btn gh sm2" id="acPrev" onclick="acMonth(-1)">‹</button><b id="acYm">'+esc(dispMonth(AC_YM))+'</b><button type="button" class="btn gh sm2" id="acNext" onclick="acMonth(1)">›</button>'+
    (AC_YM!==ymNow()?'<button type="button" class="btn gh sm2" id="acNow" onclick="acMonth(0)">'+esc(t('ac_this_month'))+'</button>':'')+'</div>'+
    (brScoped()?'<div class="hintbox">'+esc(t('ac_scope',{b:brScopeTxt()}))+'</div>':'')+'<div id="acBody"><div class="spin"></div></div>';
  acLoad();
};
function acMonth(d){AC_YM=d===0?ymNow():(d<0?prevMonth(AC_YM):nextMonth(AC_YM));LS.set('jjck_ac_ym',AC_YM);rerender();}
async function acGet(tb,fn){try{let q=sb.from(tb).select('*');q=fn?fn(q):q;const r=await q;if(!r||r.error)return {ok:false,rows:[]};return {ok:true,rows:r.data||[]};}catch(e){return {ok:false,rows:[]};}}
async function acLoad(){
  const seq=++AC_SEQ,ym=AC_YM,from=ym+'-01',to=ym+'-'+String(monthDays(ym)).padStart(2,'0');
  const [dl,rc,ex,pd,un,pv]=await Promise.all([
    acGet('kc_deliveries',q=>q.gte('d',from).lte('d',to)),
    acGet('kc_receipts',q=>q.gte('d',from).lte('d',to)),
    acGet('kc_expenses',q=>q.eq('ym',ym).order('d').order('created_at')),
    acGet('kc_productions',q=>q.gte('d',from).lte('d',to)),
    acGet('kc_deliveries',q=>q.eq('status','sent')),
    acGet('kc_expenses',q=>q.eq('ym',prevMonth(ym)).eq('recurring',true))]);
  let dll={ok:true,rows:[]};const okDl=dl.rows.filter(d=>d.status!=='void'&&inBr(d.branch));
  if(dl.ok&&okDl.length)dll=await acGet('kc_delivery_lines',q=>q.in('delivery_id',okDl.map(d=>d.id)));
  if(seq!==AC_SEQ||S.tab!=='acc')return;
  AC={ym,from,to,dl,dll,rc,ex,pd,un,pv};acPaint();
}
function acBrIdx(code){const i=(S.branchesAll||[]).findIndex(b=>b.code===code);return i<0?999:i;}
function acCalc(A){ // ตัวเลขทั้งหมดของเดือน (ใช้ทั้งหน้า + CSV + เทส)
  const dls=A.dl.rows.filter(d=>d.status!=='void'&&inBr(d.branch)),ids=new Set(dls.map(d=>String(d.id))),byId={};dls.forEach(d=>{byId[String(d.id)]=d;});
  const rev={};dls.forEach(d=>{const k=d.branch||'?';const r=rev[k]||(rev[k]={code:k,name:d.branch_name||branchName(k),n:0,total:0,cogs:0});r.n++;r.total+=num(d.total);});
  let cogs=0;A.dll.rows.forEach(l=>{if(!ids.has(String(l.delivery_id)))return;const c=num(l.sent)*num(l.unit_cost);cogs+=c;const d=byId[String(l.delivery_id)];if(d&&rev[d.branch||'?'])rev[d.branch||'?'].cogs+=c;});
  const revRows=Object.values(rev).map(r=>Object.assign(r,{total:rnd2(r.total),cogs:rnd2(r.cogs),gross:rnd2(r.total-r.cogs)})).sort((a,b)=>acBrIdx(a.code)-acBrIdx(b.code)||a.name.localeCompare(b.name,'th'));
  const revTotal=rnd2(revRows.reduce((a,r)=>a+r.total,0)),purch=rnd2(A.rc.rows.reduce((a,r)=>a+num(r.total),0)),exp=rnd2(A.ex.rows.reduce((a,r)=>a+num(r.amount),0));
  const units=rnd4(A.pd.rows.reduce((a,p)=>a+num(p.actual_qty!=null?p.actual_qty:p.plan_qty),0)),lots=A.pd.rows.length;
  const un={};A.un.rows.filter(d=>d.status==='sent'&&inBr(d.branch)).forEach(d=>{const k=d.branch||'?';const u=un[k]||(un[k]={code:k,name:d.branch_name||branchName(k),n:0,total:0,oldest:null});u.n++;u.total+=num(d.total);const dd=String(d.d).slice(0,10);if(!u.oldest||dd<u.oldest)u.oldest=dd;});
  const unRows=Object.values(un).map(u=>Object.assign(u,{total:rnd2(u.total)})).sort((a,b)=>acBrIdx(a.code)-acBrIdx(b.code)||a.name.localeCompare(b.name,'th'));
  return {rev:revRows,revTotal,bills:dls.length,cogs:rnd2(cogs),gross:rnd2(revTotal-cogs),purch,rcpts:A.rc.rows.length,exp,expN:A.ex.rows.length,net:rnd2(revTotal-purch-exp),
    units,lots,ohSug:(units>0&&exp>0)?rnd2(exp/units):null,unpaid:unRows,unpaidTotal:rnd2(unRows.reduce((a,u)=>a+u.total,0))};
}
/* ---------- วาด ---------- */
function acPaint(){
  const box=document.getElementById('acBody');if(!box||!AC)return;const A=AC,X=acCalc(A);AC.X=X;
  const nr=t('ac_noread');
  const kpi=(id,title,v,sub,cls)=>'<div class="kpi'+(cls?' '+cls:'')+'" id="acK_'+id+'"><div class="t">'+esc(title)+'</div><div class="kpi-v">'+esc(v)+'</div><div class="s mut">'+esc(sub)+'</div></div>';
  const kpis='<div class="kpis ack">'+
    kpi('rev',t('ac_rev'),A.dl.ok?money(X.revTotal):'—',A.dl.ok?t('ac_bills_n',{n:X.bills}):nr,'hero')+
    kpi('cogs',t('ac_cogs'),A.dl.ok&&A.dll.ok?money(X.cogs):'—',A.dl.ok&&A.dll.ok?t('ac_cogs_s'):nr)+
    kpi('gross',t('ac_gross'),A.dl.ok&&A.dll.ok?money(X.gross):'—',t('ac_gross_s'),X.gross<0?'bad':'')+
    kpi('purch',t('ac_purch'),A.rc.ok?money(X.purch):'—',A.rc.ok?t('ac_rcpts_n',{n:X.rcpts}):nr)+
    kpi('exp',t('ac_exp'),A.ex.ok?money(X.exp):'—',A.ex.ok?t('ac_items_n',{n:X.expN}):nr)+
    kpi('net',t('ac_net'),A.dl.ok&&A.rc.ok&&A.ex.ok?money(X.net):'—',t('ac_net_s'),X.net<0?'bad':'')+'</div>'+
    '<div class="note">'+esc(t('ac_explain'))+'</div>';
  box.innerHTML=kpis+acRevCard(A,X)+acUnpaidCard(A,X)+acExpCard(A,X)+acOhCard(A,X)+acMkCard();
}
function acRevCard(A,X){
  let body;
  if(!A.dl.ok)body='<div class="empty">'+esc(t('ac_noread'))+'</div>';
  else if(!X.rev.length)body='<div class="empty">'+esc(t('ac_rev_none'))+'</div>';
  else body='<div class="twrap"><table class="t" id="acRevT"><thead><tr><th>'+esc(t('branch'))+'</th><th class="n c-n">'+esc(t('ac_col_bills'))+'</th><th class="n">'+esc(t('ac_col_amt'))+'</th><th class="n">'+esc(t('ac_col_cost'))+'</th><th class="n">'+esc(t('ac_col_gross'))+'</th></tr></thead><tbody>'+
    X.rev.map(r=>'<tr data-br="'+esc(r.code)+'"><td><b>'+esc(r.name)+'</b></td><td class="n c-n">'+esc(fmtI(r.n))+'</td><td class="n">'+esc(money(r.total))+'</td><td class="n">'+esc(money(r.cogs))+'</td><td class="n'+(r.gross<0?' red':'')+'">'+esc(money(r.gross))+'</td></tr>').join('')+
    '<tr class="tot"><td>'+esc(t('ac_total'))+'</td><td class="n c-n">'+esc(fmtI(X.bills))+'</td><td class="n">'+esc(money(X.revTotal))+'</td><td class="n">'+esc(money(X.cogs))+'</td><td class="n">'+esc(money(X.gross))+'</td></tr></tbody></table></div>';
  return card(esc(t('ac_rev_t')),body,{sp:'<button type="button" class="btn gh sm2" onclick="show(\'bills\')">'+esc(t('ac_bills_go'))+'</button>'});
}
function acUnpaidCard(A,X){
  let body='<div class="xs mut" style="margin-bottom:6px">'+esc(t('ac_recv_h'))+'</div>';
  if(!A.un.ok)body+='<div class="empty">'+esc(t('ac_noread'))+'</div>';
  else if(!X.unpaid.length)body+='<div class="okbox">'+esc(t('ac_recv_none'))+'</div>';
  else body+=X.unpaid.map(u=>'<div class="ac-row" data-br="'+esc(u.code)+'"><div class="grow"><b>'+esc(u.name)+'</b><div class="xs mut">'+esc(t('ac_bills_n',{n:u.n}))+(u.oldest?' · '+esc(t('ac_recv_old',{d:dispDate(u.oldest)})):'')+'</div></div><span class="amt">'+esc(money(u.total))+'</span></div>').join('')+
    '<div class="ac-row"><div class="grow b">'+esc(t('ac_total'))+'</div><span class="amt" id="acUnTot">'+esc(money(X.unpaidTotal))+'</span></div>';
  return card(esc(t('ac_recv_t')),body,{id:'acUnpaid'});
}
function acExpCard(A,X){
  let body='<div class="xs mut" style="margin-bottom:6px">'+esc(t('ac_exp_h'))+'</div>';
  if(!A.ex.ok)body+='<div class="empty">'+esc(t('ac_noread'))+'</div>';
  else{
    body+=(A.ex.rows.length?A.ex.rows.map(e=>'<div class="ac-row ac-ex" data-id="'+esc(e.id)+'"><div class="grow"><b>'+esc(e.name||'')+'</b>'+(e.recurring?' <span class="chip blue">🔁 '+esc(t('ac_recur'))+'</span>':'')+
        '<div class="xs mut">'+esc(dispDate(e.d))+' · '+esc(trCat(e.cat))+(e.note?' · '+esc(e.note):'')+(e.by_name?' · '+esc(e.by_name):'')+'</div></div><span class="amt">'+esc(money(e.amount))+'</span>'+
        '<button type="button" class="btn gh sm2" data-id="'+esc(e.id)+'" onclick="acExpEdit(this.dataset.id)" aria-label="'+esc(t('edit'))+'">✏️</button></div>').join('')+
      '<div class="ac-row"><div class="grow b">'+esc(t('ac_total'))+'</div><span class="amt" id="acExpTot">'+esc(money(X.exp))+'</span></div>':'<div class="empty">'+esc(t('ac_exp_none'))+'</div>');
    const have=new Set(A.ex.rows.map(e=>nameKey(e.name))),cp=A.pv.ok?A.pv.rows.filter(e=>!have.has(nameKey(e.name))):[];
    body+='<div class="ac-foot"><button type="button" class="btn sm2" id="acExpAdd" onclick="acExpEdit()">'+esc(t('ac_exp_add'))+'</button>'+
      (cp.length?'<button type="button" class="btn gh sm2" id="acExpCopy" onclick="acCopyRecur()">'+esc(t('ac_exp_copy',{n:cp.length}))+'</button>':'')+'</div>';
  }
  return card(esc(t('ac_exp_t')),body,{id:'acExpCard',sp:A.ex.ok?'<span>'+esc(money(X.exp))+'</span>':''});
}
function acOhCard(A,X){
  const c=S.cfg||CFG_DEF,nowTxt=c.overhead_mode==='pct'?t('ac_oh_now_pct',{v:fmtQ(c.overhead_value)}):t('ac_oh_now_unit',{v:fmtQ(c.overhead_value)});
  let body='<div class="sm">'+esc(A.pd.ok?t('ac_oh_units',{q:fmtQ(X.units),n:X.lots}):t('ac_noread'))+'</div>';
  if(X.ohSug!=null)body+='<div class="ac-big" id="acOhSug">'+esc(t('ac_oh_calc',{m:money(X.exp),q:fmtQ(X.units),x:moneyU(X.ohSug)}))+'</div>';
  else if(A.pd.ok&&A.ex.ok)body+='<div class="mut sm" style="margin:6px 0">'+esc(X.units>0?t('ac_oh_noexp'):t('ac_oh_none'))+'</div>';
  body+='<div class="xs mut" id="acOhNow">'+esc(t('ac_oh_now',{v:nowTxt}))+'</div>';
  if(X.ohSug!=null)body+='<div style="margin-top:10px"><button type="button" class="btn ok" id="acOhBtn" onclick="acOhApply()">'+esc(t('ac_oh_use',{x:moneyU(X.ohSug)}))+'</button></div>';
  body+='<div class="hintbox" style="margin-bottom:0">'+esc(t('ac_oh_h'))+'</div>';
  return card(esc(t('ac_oh_t')),body,{id:'acOhCard'});
}
function acMkCard(){
  const c=S.cfg||CFG_DEF,r=activeRecipes().find(x=>recipeUnitCost(x)!=null);
  let ex='';if(r){const uc=recipeUnitCost(r),mk=r.markup_pct!=null?num(r.markup_pct):num(c.markup_pct);ex='<div class="sm" id="acMkEx">'+esc(t('ac_mk_ex',{r:dispName(r),c:moneyU(uc),u:trUnit(r.yield_unit),p:moneyU(rnd4(uc*(1+mk/100)))}))+'</div>';}
  const body='<div class="xs mut">'+esc(t('ac_mk_h'))+'</div><div class="ac-mk"><label class="b" for="acMk" style="flex:none">'+esc(t('ac_mk_lbl'))+'</label><input id="acMk" type="text" inputmode="decimal" value="'+esc(c.markup_pct)+'"><span class="b">%</span>'+
    '<button type="button" class="btn sm2" id="acMkSave" onclick="acMkSave()">'+esc(t('ac_mk_save'))+'</button></div>'+ex;
  return card(esc(t('ac_mk_t')),body,{id:'acMkCard'});
}
/* ---------- ค่าใช้จ่ายแฝง ---------- */
function acExpEdit(id){
  if(!isAdminish())return;
  const e=id?(AC&&AC.ex.rows.find(x=>String(x.id)===String(id)))||null:null;
  const d0=e?String(e.d).slice(0,10):(AC_YM===ymNow()?bizTodayISO():AC_YM+'-01');
  const cats=EXP_CATS.slice();if(e&&e.cat&&!cats.includes(e.cat))cats.push(e.cat);
  openModal('<h3>'+(e?'✏️':'＋')+' '+esc(t('ac_exp_f_t'))+'</h3>'+
    fld(t('ac_exp_name'),'<input id="acEn" value="'+esc(e?e.name:'')+'" placeholder="'+esc(t('ac_exp_ph'))+'">')+
    '<div class="grid2">'+fld(t('ac_exp_amt'),'<input id="acEa" type="text" inputmode="decimal" value="'+esc(e?e.amount:'')+'">')+fld(t('ac_exp_d'),'<input id="acEd" type="date" value="'+esc(d0)+'">')+'</div>'+
    fld(t('ac_exp_cat'),'<select id="acEc">'+selOpts(cats,e?e.cat:cats[0],trCat)+'</select>')+fld(t('note'),'<input id="acEnote" value="'+esc(e?(e.note||''):'')+'">')+
    '<label class="ac-chk"><input type="checkbox" id="acEr"'+(e&&e.recurring?' checked':'')+'><span class="b">'+esc(t('ac_recur'))+'</span><span class="xs mut">'+esc(t('ac_recur_h'))+'</span></label>'+
    '<div class="row" style="margin-top:14px">'+(e?'<button type="button" class="btn gh" id="acExpDel" onclick="'+hreg(()=>acExpDel(e.id))+'">🗑 '+esc(t('delete'))+'</button>':'')+
    '<button type="button" class="btn grow" id="acExpSave" onclick="'+hreg(()=>acExpSave(e?e.id:null))+'">💾 '+esc(t('save'))+'</button></div>');
  setTimeout(()=>{const n=document.getElementById('acEn');if(n&&!e)n.focus();},60);
}
async function acExpSave(id){await once(async()=>{
  if(!isAdminish())return;
  const g=x=>{const el=document.getElementById(x);return el?el.value:'';};
  const name=String(g('acEn')).trim(),amount=rnd2(num(g('acEa'))),d=/^\d{4}-\d{2}-\d{2}$/.test(g('acEd'))?g('acEd'):bizTodayISO();
  if(!name||!(amount>0)){toast(t('ac_exp_need'),true);return;}
  const row={d,ym:ymOf(d),cat:g('acEc')||null,name,amount,recurring:!!(document.getElementById('acEr')&&document.getElementById('acEr').checked),note:String(g('acEnote')).trim()||null};
  try{if(id)await db(()=>sb.from('kc_expenses').update(row).eq('id',id));
    else await db(()=>sb.from('kc_expenses').insert(Object.assign({id:uid('ex'),by_name:(S.user&&S.user.name)||null},row)));}
  catch(e){return;}
  closeModal();toast(t('sv_ok'));await acLoad();
});}
async function acExpDel(id){await once(async()=>{
  if(!isAdminish())return;const e=AC&&AC.ex.rows.find(x=>String(x.id)===String(id));if(!e)return;
  if(!(await confirm2(t('ac_exp_del_q',{n:e.name||'',m:money(e.amount)}),{danger:true,ok:t('delete')})))return;
  try{await db(()=>sb.from('kc_expenses').delete().eq('id',id));}catch(err){return;}
  closeModal();toast(t('sv_ok'));await acLoad();
});}
async function acCopyRecur(){await once(async()=>{ // รายการประจำของเดือนก่อน (recurring) ที่ยังไม่มีชื่อเดียวกันในเดือนนี้
  if(!isAdminish()||!AC)return;
  const have=new Set(AC.ex.rows.map(e=>nameKey(e.name))),cp=(AC.pv.ok?AC.pv.rows:[]).filter(e=>!have.has(nameKey(e.name)));
  if(!cp.length)return;
  if(!(await confirm2(t('ac_exp_copy_q',{n:cp.length,m:dispMonth(prevMonth(AC_YM))}))))return;
  const rows=cp.map(e=>({id:uid('ex'),d:AC_YM+'-01',ym:AC_YM,cat:e.cat||null,name:e.name,amount:rnd2(num(e.amount)),recurring:true,note:e.note||null,by_name:(S.user&&S.user.name)||null}));
  try{await db(()=>sb.from('kc_expenses').insert(rows));}catch(err){return;}
  toast(t('ac_exp_copied',{n:rows.length}));await acLoad();
});}
/* ---------- ต้นทุนแฝง / บวกราคา ---------- */
async function acOhApply(){await once(async()=>{
  if(!isAdminish()||!AC)return;const X=acCalc(AC);if(X.ohSug==null)return;
  const c=S.cfg||CFG_DEF;if(c.overhead_mode==='per_unit'&&rnd2(num(c.overhead_value))===X.ohSug){toast(t('ac_oh_same'));return;}
  try{await cfgSave({overhead_mode:'per_unit',overhead_value:X.ohSug});}catch(e){return;}
  toast(t('ac_oh_applied',{x:moneyU(X.ohSug)}));acPaint();
});}
async function acMkSave(){await once(async()=>{
  if(!isAdminish())return;const el=document.getElementById('acMk');if(!el)return;
  const sv=String(el.value==null?'':el.value).trim().replace(',','.');   // จุลภาค = จุดทศนิยม (คีย์บอร์ดบางเครื่อง) · ว่าง/ตัวหนังสือ/ติดลบ = ไม่บันทึก (เดิมกลายเป็น 0% เงียบ ๆ = คิดสาขาเท่าต้นทุน)
  if(!/^\d+(\.\d+)?$/.test(sv)||num(sv)>1000){toast(t('ac_mk_bad'),true);return;}
  const v=rnd2(num(sv));
  try{await cfgSave({markup_pct:v});}catch(e){return;}
  toast(t('ac_mk_saved',{v:fmtQ(v)}));acPaint();
});}
/* ---------- CSV ---------- */
function acCsvText(){ // ข้อความ CSV ของเดือน (UTF-8 BOM ใส่ตอนดาวน์โหลด) — เทสเรียกได้
  if(!AC)return '';const A=AC,X=acCalc(A),q=v=>{v=String(v==null?'':v);if(/^[=+\-@\t\r]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';},L=[];   // ช่องขึ้นต้น = + - @ = สูตรใน Excel/Sheets → นำหน้าด้วย ' (กันสูตรแฝงในชื่อรายการ)
  L.push([q(t('nav_acc')),q(dispMonth(A.ym))].join(','));
  L.push([q(t('ac_rev')),X.revTotal].join(','));L.push([q(t('ac_cogs')),X.cogs].join(','));L.push([q(t('ac_gross')),X.gross].join(','));
  L.push([q(t('ac_purch')),X.purch].join(','));L.push([q(t('ac_exp')),X.exp].join(','));L.push([q(t('ac_net')),X.net].join(','));L.push('');
  L.push([q(t('ac_rev_t')),q(t('ac_col_bills')),q(t('ac_col_amt')),q(t('ac_col_cost')),q(t('ac_col_gross'))].join(','));
  X.rev.forEach(r=>L.push([q(r.code+' '+r.name),r.n,r.total,r.cogs,r.gross].join(',')));L.push('');
  L.push([q(t('nav_bills')),q(t('date')),q(t('branch')),q(t('status')),q(t('total'))].join(','));
  A.dl.rows.filter(d=>inBr(d.branch)).forEach(d=>L.push([q(d.bill_no),q(String(d.d).slice(0,10)),q(d.branch),q(d.status),num(d.total)].join(',')));L.push('');
  L.push([q(t('nav_recv')),q(t('date')),q(t('sup')),q(t('total'))].join(','));
  A.rc.rows.forEach(r=>L.push([q(r.bill_no),q(String(r.d).slice(0,10)),q(r.sup_name),num(r.total)].join(',')));L.push('');
  L.push([q(t('ac_exp_t')),q(t('date')),q(t('ac_exp_cat')),q(t('ac_exp_amt')),q(t('ac_recur'))].join(','));
  A.ex.rows.forEach(e=>L.push([q(e.name),q(String(e.d).slice(0,10)),q(e.cat),num(e.amount),e.recurring?1:0].join(',')));
  return L.join('\n');}
function acCsv(){const tx=acCsvText();if(!tx){toast(t('ac_csv_none'));return;}
  try{const blob=new Blob(['﻿'+tx],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='kitchen_'+AC_YM+'.csv';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},800);}
  catch(e){copyText(tx);}}
