/* ============================================================
   ⚙️ ตั้งค่า — set (st*) · เฉพาะหัวหน้า (PAGE_PERM)
   💬 กลุ่มไลน์สาขา (ต่อสาขาในทะเบียน JJBR) · 🏪 ชื่อร้านครัวกลางในแอพนับสต๊อก (ck_sup_names) · 🧾 ตัวหน้าเลขบิล + วันย้อนหลังออเดอร์ + วันเติมสต๊อก ·
   💰 ต้นทุนแฝง (ต่อหน่วย/%) + บวกราคาขาย % (ค่าเดียวกับหน้า 💰 บัญชี) · 📏 หน่วยเพิ่มเติม · 🌐 ภาษา · 🗄️ SQL ติดตั้ง (คัดลอก) · ℹ️ รุ่นแอป
   ทุกค่าอยู่ใน ck_settings.kc_cfg — แก้ในที่ แล้วกด 💾 ที่แถบล่าง (cfgSave อ่าน-รวม-เขียน)
   ============================================================ */
I18N.add({
th:{st_line_t:'กลุ่มไลน์สาขา (ส่งบิลส่งของ)',st_line_h:'เลือกกลุ่มไลน์ของแต่ละสาขา — กด "✅ ส่งแล้ว ออกบิล" แล้วบิลจะเข้ากลุ่มนั้นเอง · บอทตัวเดียวกับระบบนับสต๊อก',st_line_none:'ยังไม่เลือก (จะได้ข้อความให้คัดลอกส่งเอง)',
  st_test:'🔔 ทดสอบส่ง',st_test_txt:'🔔 ทดสอบส่งจากระบบครัวกลาง (JJ ครัวกลาง)\nสาขา: {b}\nเห็นข้อความนี้ = ตั้งกลุ่มไลน์สาขาถูกต้อง ✅',st_test_ok:'ส่งข้อความทดสอบเข้ากลุ่ม {g} แล้ว',st_no_groups:'ยังไม่มีกลุ่มไลน์ — ดึงกลุ่มได้ที่หน้า 🏷️ ร้านค้า',
  st_sup_t:'ชื่อครัวกลางในแอพนับสต๊อก',st_sup_h:'(ไม่บังคับ — สินค้าที่ชื่อตรงกับเมนูครัวกลางถูกนับเป็นออเดอร์ครัวกลางอยู่แล้ว) สาขาสั่งของจากครัวกลางผ่านแอพนับสต๊อก โดยตั้งซัพของสินค้าเป็นชื่อพวกนี้ — ระบบจะดึงออเดอร์ที่ซัพตรงกับชื่อในรายการ (ไม่สนตัวพิมพ์/ช่องว่าง)',
  st_sup_add:'＋ เพิ่มชื่อ',st_sup_ph:'เช่น ครัวกลาง',st_sup_dup:'มีชื่อนี้แล้ว',st_sup_last:'ต้องมีอย่างน้อย 1 ชื่อ',
  st_bill_t:'บิลสาขา & รอบงาน',st_prefix:'ตัวหน้าเลขบิล',st_prefix_h:'เลขบิล = {p}<สาขา>-<ปปดดวว>-<ลำดับ> เช่น {ex}',st_lookback:'ดูออเดอร์สาขาย้อนหลัง (วัน)',st_lookback_h:'1 = ออเดอร์เมื่อวาน (ส่งวันนี้) + วันนี้ (ส่งพรุ่งนี้) · 0 = เฉพาะวันนี้ · ออเดอร์ที่เก่ากว่านี้ถือว่าผ่านไปแล้ว ไม่ขึ้น',
  st_refill:'เติมสต๊อกสำเร็จรูปให้พอกี่วัน',st_refill_h:'ใช้คิด "ต้องทำเติม" เมื่อเมนูไม่ได้ตั้งเป้าเอง = ยอดส่งเฉลี่ยต่อวัน × จำนวนวันนี้',
  st_cost_t:'ต้นทุนแฝง + ราคาขายสาขา',st_cost_h:'ราคาสินค้า = ต้นทุนวัตถุดิบจริงของล็อตที่ทำ + ต้นทุนแฝง (ค่าแรง ไฟ แก๊ส ฯลฯ) · ราคาขายสาขา = ต้นทุน/หน่วย × (1 + % บวก) · ตั้งเมนูเป็น % เฉพาะเมนูได้ที่หน้า 📖 เมนู',
  st_oh_mode:'คิดต้นทุนแฝงแบบ',st_oh_unit:'บาทต่อหน่วยที่ผลิต',st_oh_pct:'% ของต้นทุนวัตถุดิบ',st_oh_val:'ค่าต้นทุนแฝง',st_oh_sug:'💡 หน้า 💰 บัญชี คำนวณค่าแนะนำจากค่าใช้จ่ายจริงของเดือน ÷ จำนวนที่ผลิต แล้วกดใช้ได้เลย',
  st_markup:'บวกราคาขาย (%)',st_markup_h:'0 = ขายสาขาเท่าต้นทุน',st_ex_t:'ตัวอย่าง: {r} 1 รอบ ({y} {u})',st_ex_items:'วัตถุดิบ',st_ex_oh:'ต้นทุนแฝง',st_ex_extra:'ค่าอื่นของเมนู',st_ex_total:'รวม',st_ex_unit:'ต้นทุน/หน่วย',st_ex_sell:'ราคาขายสาขา/หน่วย',st_ex_none:'ยังไม่มีเมนูที่คิดต้นทุนได้ (ต้องมีราคาวัตถุดิบครบ)',
  st_units_t:'หน่วยเพิ่มเติม',st_units_h:'หน่วยที่ไม่มีในรายการมาตรฐาน — ใช้ได้ในสูตร/รับของ (แปลงไม่ได้เองจนกว่าจะตั้งขนาดบรรจุที่วัตถุดิบ)',st_unit_add:'＋ เพิ่มหน่วย',st_unit_ph:'เช่น กระปุก',st_unit_dup:'มีหน่วยนี้อยู่แล้ว',st_unit_bad:'ชื่อหน่วยต้องไม่มี < > " \' & \\ และยาวไม่เกิน 24 ตัวอักษร',
  st_lang_t:'ภาษา / Language',st_sql_t:'ติดตั้งฐานข้อมูล (SQL)',st_sql_ok:'✅ ตาราง kc_* พร้อมใช้แล้ว — รัน SQL ซ้ำได้ ไม่เสียหาย (ไว้ใช้ตอนอัปเดตรุ่น)',st_sql_no:'⚠ ยังไม่ได้รัน SQL — บันทึกรับของ/ทำของ/ส่งของไม่ได้จนกว่าจะรัน',
  st_sql_1:'กด 📋 คัดลอก SQL ข้างล่าง',st_sql_2:'เปิด Supabase → SQL Editor → วาง → Run',st_sql_3:'กลับมากด ⟳ โหลดใหม่ที่หัวแอป',st_sql_copy:'📋 คัดลอก SQL',st_sql_open:'เปิด SQL Editor',
  st_about_t:'เกี่ยวกับแอป',st_ver:'รุ่น',st_user:'ผู้ใช้',st_data:'ข้อมูล',st_data_v:'วัตถุดิบ {i} · เมนู {r} · ร้านค้า {s} · กลุ่มไลน์ {g}',st_dirty:'มีการแก้ไข — ยังไม่บันทึก',st_clean:'บันทึกแล้วทั้งหมด',st_saved:'บันทึกการตั้งค่าแล้ว ✅',st_save:'💾 บันทึกการตั้งค่า'},
en:{st_line_t:'Branch LINE groups (delivery bills)',st_line_h:'Pick each branch\'s LINE group — after "✅ Sent, make bill" the bill goes there · same bot as the stock-count app',st_line_none:'Not set (you will get text to copy and send yourself)',
  st_test:'🔔 Send a test',st_test_txt:'🔔 ทดสอบส่งจากระบบครัวกลาง (JJ ครัวกลาง)\nสาขา: {b}\nเห็นข้อความนี้ = ตั้งกลุ่มไลน์สาขาถูกต้อง ✅',st_test_ok:'Test message sent to {g}',st_no_groups:'No LINE groups yet — refresh them on the 🏷️ Suppliers page',
  st_sup_t:'Kitchen\'s supplier name in the stock-count app',st_sup_h:'(optional — products whose name matches a kitchen menu already count as kitchen orders) Branches order from the kitchen through the stock-count app by setting a product\'s supplier to one of these names — orders whose supplier matches (case/space-insensitive) are picked up',
  st_sup_add:'＋ Add name',st_sup_ph:'e.g. ครัวกลาง',st_sup_dup:'Already listed',st_sup_last:'Keep at least one name',
  st_bill_t:'Branch bills & cycles',st_prefix:'Bill number prefix',st_prefix_h:'Bill no. = {p}<BRANCH>-<YYMMDD>-<n>, e.g. {ex}',st_lookback:'Show branch orders from the last (days)',st_lookback_h:'1 = yesterday\'s orders (deliver today) + today\'s (deliver tomorrow) · 0 = today only · older orders are past and are not shown',
  st_refill:'Refill finished stock to cover (days)',st_refill_h:'Used for "needs refill" when a menu has no target of its own = average sent per day × these days',
  st_cost_t:'Overhead + branch price',st_cost_h:'Product cost = actual ingredient cost of the lot + overhead (labour, power, gas …) · Branch price = cost/unit × (1 + markup %) · a per-menu % can be set on 📖 Menus',
  st_oh_mode:'Overhead calculated as',st_oh_unit:'Baht per unit produced',st_oh_pct:'% of ingredient cost',st_oh_val:'Overhead value',st_oh_sug:'💡 The 💰 Accounts page suggests a value from the month\'s real expenses ÷ units produced, with a button to apply it',
  st_markup:'Markup (%)',st_markup_h:'0 = sell to branches at cost',st_ex_t:'Example: {r} 1 lot ({y} {u})',st_ex_items:'Ingredients',st_ex_oh:'Overhead',st_ex_extra:'Menu extra cost',st_ex_total:'Total',st_ex_unit:'Cost/unit',st_ex_sell:'Branch price/unit',st_ex_none:'No menu can be costed yet (all ingredients need a price)',
  st_units_t:'Extra units',st_units_h:'Units missing from the standard list — usable in recipes/receiving (not convertible until a pack size is set on the ingredient)',st_unit_add:'＋ Add unit',st_unit_ph:'e.g. jar',st_unit_dup:'Unit already exists',st_unit_bad:'Unit names cannot contain < > " \' & \\ and must be 24 characters or less',
  st_lang_t:'Language',st_sql_t:'Database install (SQL)',st_sql_ok:'✅ kc_* tables are ready — re-running the SQL is safe (use it after an app update)',st_sql_no:'⚠ SQL not run yet — receiving/producing/delivering cannot be saved until it is',
  st_sql_1:'Tap 📋 Copy SQL below',st_sql_2:'Open Supabase → SQL Editor → paste → Run',st_sql_3:'Come back and tap ⟳ in the app header',st_sql_copy:'📋 Copy SQL',st_sql_open:'Open SQL Editor',
  st_about_t:'About',st_ver:'Version',st_user:'User',st_data:'Data',st_data_v:'{i} ingredients · {r} menus · {s} suppliers · {g} LINE groups',st_dirty:'Unsaved changes',st_clean:'All saved',st_saved:'Settings saved ✅',st_save:'💾 Save settings'},
lo:{st_line_t:'ກຸ່ມໄລນ໌ສາຂາ (ສົ່ງບິນສົ່ງເຄື່ອງ)',st_line_h:'ເລືອກກຸ່ມໄລນ໌ຂອງແຕ່ລະສາຂາ — ກົດ "✅ ສົ່ງແລ້ວ ອອກບິນ" ແລ້ວບິນຈະເຂົ້າກຸ່ມນັ້ນເອງ · ບອດໂຕດຽວກັບລະບົບນັບສະຕັອກ',st_line_none:'ຍັງບໍ່ເລືອກ (ຈະໄດ້ຂໍ້ຄວາມໃຫ້ຄັດລອກສົ່ງເອງ)',
  st_test:'🔔 ທົດສອບສົ່ງ',st_test_txt:'🔔 ทดสอบส่งจากระบบครัวกลาง (JJ ครัวกลาง)\nสาขา: {b}\nเห็นข้อความนี้ = ตั้งกลุ่มไลน์สาขาถูกต้อง ✅',st_test_ok:'ສົ່ງຂໍ້ຄວາມທົດສອບເຂົ້າກຸ່ມ {g} ແລ້ວ',st_no_groups:'ຍັງບໍ່ມີກຸ່ມໄລນ໌ — ດຶງກຸ່ມໄດ້ທີ່ໜ້າ 🏷️ ຮ້ານຄ້າ',
  st_sup_t:'ຊື່ຄົວກາງໃນແອັບນັບສະຕັອກ',st_sup_h:'(ບໍ່ບັງຄັບ — ສິນຄ້າທີ່ຊື່ກົງກັບເມນູຄົວກາງຖືກນັບເປັນອໍເດີຄົວກາງຢູ່ແລ້ວ) ສາຂາສັ່ງເຄື່ອງຈາກຄົວກາງຜ່ານແອັບນັບສະຕັອກ ໂດຍຕັ້ງຊັບຂອງສິນຄ້າເປັນຊື່ເຫຼົ່ານີ້ — ລະບົບຈະດຶງອໍເດີທີ່ຊັບກົງກັບຊື່ໃນລາຍການ (ບໍ່ສົນຕົວພິມ/ຊ່ອງວ່າງ)',
  st_sup_add:'＋ ເພີ່ມຊື່',st_sup_ph:'ເຊັ່ນ ครัวกลาง',st_sup_dup:'ມີຊື່ນີ້ແລ້ວ',st_sup_last:'ຕ້ອງມີຢ່າງໜ້ອຍ 1 ຊື່',
  st_bill_t:'ບິນສາຂາ & ຮອບວຽກ',st_prefix:'ຕົວໜ້າເລກບິນ',st_prefix_h:'ເລກບິນ = {p}<ສາຂາ>-<ປປດດວວ>-<ລຳດັບ> ເຊັ່ນ {ex}',st_lookback:'ເບິ່ງອໍເດີສາຂາຍ້ອນຫຼັງ (ມື້)',st_lookback_h:'1 = ອໍເດີມື້ວານ (ສົ່ງມື້ນີ້) + ມື້ນີ້ (ສົ່ງມື້ອື່ນ) · 0 = ສະເພາະມື້ນີ້ · ອໍເດີເກົ່າກວ່ານີ້ຖືວ່າຜ່ານໄປແລ້ວ ບໍ່ຂຶ້ນ',
  st_refill:'ເຕີມສະຕັອກສຳເລັດຮູບໃຫ້ພໍຈັກມື້',st_refill_h:'ໃຊ້ຄິດ "ຕ້ອງເຮັດເຕີມ" ເມື່ອເມນູບໍ່ໄດ້ຕັ້ງເປົ້າເອງ = ຍອດສົ່ງສະເລ່ຍຕໍ່ມື້ × ຈຳນວນມື້ນີ້',
  st_cost_t:'ຕົ້ນທຶນແຝງ + ລາຄາຂາຍສາຂາ',st_cost_h:'ລາຄາສິນຄ້າ = ຕົ້ນທຶນວັດຖຸດິບຈິງຂອງລັອດທີ່ເຮັດ + ຕົ້ນທຶນແຝງ (ຄ່າແຮງ ໄຟ ແກັສ ຯລຯ) · ລາຄາຂາຍສາຂາ = ຕົ້ນທຶນ/ຫົວໜ່ວຍ × (1 + % ບວກ) · ຕັ້ງ % ສະເພາະເມນູໄດ້ທີ່ໜ້າ 📖 ເມນູ',
  st_oh_mode:'ຄິດຕົ້ນທຶນແຝງແບບ',st_oh_unit:'ບາດຕໍ່ຫົວໜ່ວຍທີ່ຜະລິດ',st_oh_pct:'% ຂອງຕົ້ນທຶນວັດຖຸດິບ',st_oh_val:'ຄ່າຕົ້ນທຶນແຝງ',st_oh_sug:'💡 ໜ້າ 💰 ບັນຊີ ຄິດຄ່າແນະນຳຈາກຄ່າໃຊ້ຈ່າຍຈິງຂອງເດືອນ ÷ ຈຳນວນທີ່ຜະລິດ ແລ້ວກົດໃຊ້ໄດ້ເລີຍ',
  st_markup:'ບວກລາຄາຂາຍ (%)',st_markup_h:'0 = ຂາຍສາຂາເທົ່າຕົ້ນທຶນ',st_ex_t:'ຕົວຢ່າງ: {r} 1 ຮອບ ({y} {u})',st_ex_items:'ວັດຖຸດິບ',st_ex_oh:'ຕົ້ນທຶນແຝງ',st_ex_extra:'ຄ່າອື່ນຂອງເມນູ',st_ex_total:'ລວມ',st_ex_unit:'ຕົ້ນທຶນ/ຫົວໜ່ວຍ',st_ex_sell:'ລາຄາຂາຍສາຂາ/ຫົວໜ່ວຍ',st_ex_none:'ຍັງບໍ່ມີເມນູທີ່ຄິດຕົ້ນທຶນໄດ້ (ຕ້ອງມີລາຄາວັດຖຸດິບຄົບ)',
  st_units_t:'ຫົວໜ່ວຍເພີ່ມເຕີມ',st_units_h:'ຫົວໜ່ວຍທີ່ບໍ່ມີໃນລາຍການມາດຕະຖານ — ໃຊ້ໄດ້ໃນສູດ/ຮັບເຄື່ອງ (ແປງບໍ່ໄດ້ເອງຈົນກວ່າຈະຕັ້ງຂະໜາດບັນຈຸທີ່ວັດຖຸດິບ)',st_unit_add:'＋ ເພີ່ມຫົວໜ່ວຍ',st_unit_ph:'ເຊັ່ນ ກະປຸກ',st_unit_dup:'ມີຫົວໜ່ວຍນີ້ຢູ່ແລ້ວ',st_unit_bad:'ຊື່ຫົວໜ່ວຍຕ້ອງບໍ່ມີ < > " \' & \\ ແລະຍາວບໍ່ເກີນ 24 ຕົວອັກສອນ',
  st_lang_t:'ພາສາ / Language',st_sql_t:'ຕິດຕັ້ງຖານຂໍ້ມູນ (SQL)',st_sql_ok:'✅ ຕາຕະລາງ kc_* ພ້ອມໃຊ້ແລ້ວ — ແລ່ນ SQL ຊ້ຳໄດ້ ບໍ່ເສຍຫາຍ (ໄວ້ໃຊ້ຕອນອັບເດດລຸ້ນ)',st_sql_no:'⚠ ຍັງບໍ່ໄດ້ແລ່ນ SQL — ບັນທຶກຮັບເຄື່ອງ/ເຮັດເຄື່ອງ/ສົ່ງເຄື່ອງບໍ່ໄດ້ຈົນກວ່າຈະແລ່ນ',
  st_sql_1:'ກົດ 📋 ຄັດລອກ SQL ຂ້າງລຸ່ມ',st_sql_2:'ເປີດ Supabase → SQL Editor → ວາງ → Run',st_sql_3:'ກັບມາກົດ ⟳ ໂຫຼດໃໝ່ທີ່ຫົວແອັບ',st_sql_copy:'📋 ຄັດລອກ SQL',st_sql_open:'ເປີດ SQL Editor',
  st_about_t:'ກ່ຽວກັບແອັບ',st_ver:'ລຸ້ນ',st_user:'ຜູ້ໃຊ້',st_data:'ຂໍ້ມູນ',st_data_v:'ວັດຖຸດິບ {i} · ເມນູ {r} · ຮ້ານຄ້າ {s} · ກຸ່ມໄລນ໌ {g}',st_dirty:'ມີການແກ້ໄຂ — ຍັງບໍ່ບັນທຶກ',st_clean:'ບັນທຶກແລ້ວທັງໝົດ',st_saved:'ບັນທຶກການຕັ້ງຄ່າແລ້ວ ✅',st_save:'💾 ບັນທຶກການຕັ້ງຄ່າ'},
my:{st_line_t:'ဆိုင်ခွဲ LINE အုပ်စုများ (ပို့ဆောင်ဘေလ်)',st_line_h:'ဆိုင်ခွဲတစ်ခုချင်း၏ LINE အုပ်စုကို ရွေးပါ — "✅ ပို့ပြီး ဘေလ်ထုတ်" နှိပ်လျှင် ဘေလ်သည် ထိုအုပ်စုသို့ ရောက်မည် · စတော့ရေတွက်စနစ်နှင့် ဘော့တစ်ကောင်တည်း',st_line_none:'မရွေးရသေး (ကိုယ်တိုင်ကူးပို့ရန် စာသားရမည်)',
  st_test:'🔔 စမ်းပို့ရန်',st_test_txt:'🔔 ทดสอบส่งจากระบบครัวกลาง (JJ ครัวกลาง)\nสาขา: {b}\nเห็นข้อความนี้ = ตั้งกลุ่มไลน์สาขาถูกต้อง ✅',st_test_ok:'{g} သို့ စမ်းသပ်စာ ပို့ပြီး',st_no_groups:'LINE အုပ်စု မရှိသေးပါ — 🏷️ ဆိုင်များ စာမျက်နှာတွင် ပြန်ဆွဲယူပါ',
  st_sup_t:'စတော့ရေတွက်စနစ်ရှိ မီးဖိုချောင် ဆိုင်အမည်',st_sup_h:'(မလိုအပ်ပါ — မီးဖိုချောင်မီနူးနှင့် အမည်တူသော ပစ္စည်းများကို မီးဖိုချောင်အော်ဒါအဖြစ် သတ်မှတ်ပြီးဖြစ်သည်) ဆိုင်ခွဲများသည် စတော့ရေတွက်စနစ်တွင် ထုတ်ကုန်၏ ဆိုင်ကို ဤအမည်များထဲမှ တစ်ခုအဖြစ် သတ်မှတ်ပြီး မီးဖိုချောင်မှ မှာယူသည် — ဆိုင်အမည်ကိုက်ညီသော အော်ဒါများကို ဆွဲယူမည် (စာလုံးအကြီးအသေး/နေရာလွတ် မသက်ရောက်)',
  st_sup_add:'＋ အမည်ထည့်',st_sup_ph:'ဥပမာ ครัวกลาง',st_sup_dup:'ရှိပြီးသား',st_sup_last:'အနည်းဆုံး အမည်တစ်ခု ထားရမည်',
  st_bill_t:'ဆိုင်ခွဲဘေလ် & သံသရာ',st_prefix:'ဘေလ်နံပါတ် ရှေ့ဆွဲ',st_prefix_h:'ဘေလ်နံပါတ် = {p}<ဆိုင်ခွဲ>-<YYMMDD>-<n> ဥပမာ {ex}',st_lookback:'ဆိုင်ခွဲအော်ဒါ နောက်ကြည့်ရက် (ရက်)',st_lookback_h:'1 = မနေ့က အော်ဒါ (ယနေ့ပို့) + ယနေ့ (မနက်ဖြန်ပို့) · 0 = ယနေ့သာ · ဤထက်ဟောင်းသော အော်ဒါများ ကုန်ဆုံးပြီး မပေါ်ပါ',
  st_refill:'ထုတ်ကုန်စတော့ ဖြည့်ရန် (ရက်)',st_refill_h:'မီနူးတွင် ကိုယ်ပိုင်ပစ်မှတ် မရှိလျှင် "ဖြည့်ရန်လို" ကို တွက်ရန် = တစ်နေ့ပျမ်းမျှပို့မှု × ဤရက်',
  st_cost_t:'ဝှက်ကုန်ကျစရိတ် + ဆိုင်ခွဲဈေး',st_cost_h:'ထုတ်ကုန်ဈေး = ထုတ်လုပ်သောအသုတ်၏ အမှန်ကုန်ကြမ်းကုန်ကျစရိတ် + ဝှက်ကုန်ကျစရိတ် (လုပ်အားခ၊ မီး၊ ဂက်စ် …) · ဆိုင်ခွဲဈေး = ကုန်ကျစရိတ်/ယူနစ် × (1 + markup %) · မီနူးတစ်ခုချင်း % ကို 📖 မီနူး တွင် သတ်မှတ်နိုင်',
  st_oh_mode:'ဝှက်ကုန်ကျစရိတ် တွက်နည်း',st_oh_unit:'ထုတ်လုပ်သည့် ယူနစ်တစ်ခုလျှင် ဘတ်',st_oh_pct:'ကုန်ကြမ်းကုန်ကျစရိတ်၏ %',st_oh_val:'ဝှက်ကုန်ကျစရိတ် တန်ဖိုး',st_oh_sug:'💡 💰 စာရင်း စာမျက်နှာက လ၏ အမှန်ကုန်ကျစရိတ် ÷ ထုတ်လုပ်မှုမှ အကြံပြုတန်ဖိုး တွက်ပေးပြီး နှိပ်၍ သုံးနိုင်',
  st_markup:'ဈေးထပ်ပေါင်း (%)',st_markup_h:'0 = ဆိုင်ခွဲသို့ ကုန်ကျစရိတ်အတိုင်း ရောင်း',st_ex_t:'ဥပမာ: {r} 1 အသုတ် ({y} {u})',st_ex_items:'ကုန်ကြမ်း',st_ex_oh:'ဝှက်ကုန်ကျစရိတ်',st_ex_extra:'မီနူး၏ အခြားစရိတ်',st_ex_total:'စုစုပေါင်း',st_ex_unit:'ကုန်ကျစရိတ်/ယူနစ်',st_ex_sell:'ဆိုင်ခွဲဈေး/ယူနစ်',st_ex_none:'ကုန်ကျစရိတ် တွက်နိုင်သော မီနူး မရှိသေး (ကုန်ကြမ်းအားလုံး ဈေးရှိရမည်)',
  st_units_t:'အပိုယူနစ်များ',st_units_h:'စံစာရင်းတွင် မရှိသော ယူနစ်များ — ဖော်မြူလာ/လက်ခံမှုတွင် သုံးနိုင် (ကုန်ကြမ်းတွင် ထုပ်ပိုးအရွယ် မသတ်မှတ်မချင်း မပြောင်းနိုင်)',st_unit_add:'＋ ယူနစ်ထည့်',st_unit_ph:'ဥပမာ ဘူး',st_unit_dup:'ယူနစ် ရှိပြီးသား',st_unit_bad:'ယူနစ်အမည်တွင် < > " \' & \\ မပါရ၊ 24 လုံးထက် မပိုရ',
  st_lang_t:'ဘာသာစကား / Language',st_sql_t:'ဒေတာဘေ့စ် တပ်ဆင်ခြင်း (SQL)',st_sql_ok:'✅ kc_* ဇယားများ အဆင်သင့် — SQL ထပ် run လည်း ဘေးမရှိ (အက်ပ်အပ်ဒိတ်ပြီး သုံးပါ)',st_sql_no:'⚠ SQL မ run ရသေး — run ပြီးမှ လက်ခံ/ထုတ်လုပ်/ပို့ဆောင် သိမ်းနိုင်မည်',
  st_sql_1:'အောက်ရှိ 📋 SQL ကူး ကိုနှိပ်ပါ',st_sql_2:'Supabase → SQL Editor ဖွင့် → paste → Run',st_sql_3:'ပြန်လာပြီး အက်ပ်ခေါင်းစီးရှိ ⟳ ကိုနှိပ်ပါ',st_sql_copy:'📋 SQL ကူး',st_sql_open:'SQL Editor ဖွင့်',
  st_about_t:'အက်ပ်အကြောင်း',st_ver:'ဗားရှင်း',st_user:'အသုံးပြုသူ',st_data:'အချက်အလက်',st_data_v:'ကုန်ကြမ်း {i} · မီနူး {r} · ဆိုင် {s} · LINE အုပ်စု {g}',st_dirty:'ပြင်ဆင်ထားသည် — မသိမ်းရသေး',st_clean:'အားလုံး သိမ်းပြီး',st_saved:'ဆက်တင် သိမ်းပြီး ✅',st_save:'💾 ဆက်တင် သိမ်းရန်'}
});
CSS.add(`
.stbr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)}.stbr:last-child{border-bottom:0}
.stbr .nm{font-weight:700;display:flex;align-items:center;gap:6px;grid-column:1/-1}.stbr .dot{width:12px;height:12px;border-radius:50%;flex:none;border:1px solid rgba(0,0,0,.1)}
.stchips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.stchip{display:inline-flex;align-items:center;gap:4px;border:1.5px solid var(--wine);color:var(--wine);border-radius:99px;padding:2px 2px 2px 14px;font-weight:700;font-family:var(--fh);min-height:44px}
.stchip button{width:44px;height:44px;min-height:44px;border-radius:50%;background:#F6E7E7;color:var(--wine);font-size:15px;padding:0;line-height:1}   /* ปุ่มลบ ≥44px */
.stadd{display:flex;gap:6px}.stadd input{flex:1;min-width:0}.stadd .btn{flex:none}
.stmode{display:flex;gap:8px}.stmode .pill{flex:1;min-width:0;justify-content:center;white-space:normal;text-align:center;line-height:1.2;padding:6px 10px}
@media(max-width:339px){.stmode{flex-direction:column}}
.stex{background:#FBF6EA;border:1.5px solid #F0E8D6;border-radius:12px;padding:10px 12px;font-size:13.5px;margin-top:8px}
.stex table{width:100%;border-collapse:collapse}.stex td{padding:3px 0}.stex td.n{text-align:right;font-variant-numeric:tabular-nums;font-weight:700}
.stex tr.tot td{border-top:1.5px solid #E9D9A8;padding-top:6px}
#stSql{font-family:ui-monospace,monospace;font-size:16px;height:160px;white-space:pre;overflow:auto;resize:vertical}   /* ≥16px ทุกจอ — iPhone/iPad ซูมหน้าเองถ้าช่อง <16px */
.stkv{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13.5px}.stkv b{font-family:var(--fh)}
`);
let ST_W=null;   // สำเนาที่กำลังแก้ (ยังไม่บันทึก)
let ST_DIRTY=false;
const ST_SQL_URL='https://supabase.com/dashboard/project/aikyxvluaiubdidqxwnd/sql/new';
function stCfg(){return cfgClean(S.cfg||{});}
function stSqlText(){const el=document.getElementById('kcSql');return el?el.textContent:'';}
function stDirty(on){ST_DIRTY=on!==false;const el=document.getElementById('stDirty');if(el)el.textContent=ST_DIRTY?t('st_dirty'):t('st_clean');}

/* ---------- หน้า ---------- */
RENDER.set=function(el){
  ST_W=stCfg();ST_DIRTY=false;
  const sqlCard=card('🗄️ '+esc(t('st_sql_t')),stSqlHtml());
  let h=dhead('⚙️ '+t('nav_set'),esc(APP_VER));
  if(!S.kcSql)h+=sqlNeedBox()+sqlCard;
  h+=card('💬 '+esc(t('st_line_t')),'<div class="sm mut" style="margin-bottom:8px">'+esc(t('st_line_h'))+'</div>'+stBrHtml());
  h+=card('🏪 '+esc(t('st_sup_t')),'<div class="sm mut" style="margin-bottom:8px">'+esc(t('st_sup_h'))+'</div><div class="stchips" id="stSupChips">'+stSupChips()+'</div>'+
    '<div class="stadd"><input id="stSupNew" placeholder="'+esc(t('st_sup_ph'))+'" onkeydown="if(event.key===\'Enter\'){event.preventDefault();stSupAdd()}"><button class="btn gh" onclick="stSupAdd()">'+esc(t('st_sup_add'))+'</button></div>');
  h+=card('🧾 '+esc(t('st_bill_t')),'<div class="md2">'+fld(t('st_prefix'),'<input id="stPrefix" value="'+esc(ST_W.bill_prefix)+'" maxlength="8" oninput="ST_W.bill_prefix=this.value.trim().slice(0,8);stDirty();stPrefixHint()"><div class="xs mut" id="stPrefixH">'+esc(stPrefixHintTxt())+'</div>')+
    fld(t('st_lookback'),'<input id="stLook" type="text" inputmode="numeric" value="'+esc(ST_W.order_lookback_days)+'" oninput="ST_W.order_lookback_days=this.value;stDirty()"><div class="xs mut">'+esc(t('st_lookback_h'))+'</div>')+'</div>'+
    fld(t('st_refill'),'<input id="stRefill" type="text" inputmode="numeric" value="'+esc(ST_W.refill_days)+'" oninput="ST_W.refill_days=this.value;stDirty()"><div class="xs mut">'+esc(t('st_refill_h'))+'</div>'));
  h+=card('💰 '+esc(t('st_cost_t')),'<div class="sm mut" style="margin-bottom:8px">'+esc(t('st_cost_h'))+'</div>'+
    fld(t('st_oh_mode'),'<div class="stmode" id="stMode">'+['per_unit','pct'].map(m=>'<button type="button" class="pill'+(ST_W.overhead_mode===m?' on':'')+'" data-m="'+m+'" onclick="stMode(this.dataset.m)">'+esc(t(m==='pct'?'st_oh_pct':'st_oh_unit'))+'</button>').join('')+'</div>')+
    '<div class="md2">'+fld(t('st_oh_val'),'<div class="row" style="flex-wrap:nowrap"><input id="stOh" type="text" inputmode="decimal" value="'+esc(ST_W.overhead_value)+'" oninput="ST_W.overhead_value=this.value;stDirty();stExample()"><span class="b" id="stOhU" style="flex:none">'+esc(ST_W.overhead_mode==='pct'?'%':t('baht'))+'</span></div><div class="xs mut">'+esc(t('st_oh_sug'))+'</div>')+
    fld(t('st_markup'),'<div class="row" style="flex-wrap:nowrap"><input id="stMk" type="text" inputmode="decimal" value="'+esc(ST_W.markup_pct)+'" oninput="ST_W.markup_pct=this.value;stDirty();stExample()"><span class="b" style="flex:none">%</span></div><div class="xs mut">'+esc(t('st_markup_h'))+'</div>')+'</div>'+
    '<div id="stEx">'+stExampleHtml()+'</div>');
  h+=card('📏 '+esc(t('st_units_t')),'<div class="sm mut" style="margin-bottom:8px">'+esc(t('st_units_h'))+'</div><div class="stchips" id="stUnitChips">'+stUnitChips()+'</div>'+
    '<div class="stadd"><input id="stUnitNew" placeholder="'+esc(t('st_unit_ph'))+'" onkeydown="if(event.key===\'Enter\'){event.preventDefault();stUnitAdd()}"><button class="btn gh" onclick="stUnitAdd()">'+esc(t('st_unit_add'))+'</button></div>');
  h+=card('🌐 '+esc(t('st_lang_t')),'<div class="langrow">'+['th','en','lo','my'].map(l=>'<button type="button" class="'+(l===LANG?'on':'')+'" onclick="setLang(\''+l+'\')"><span class="fl">'+({th:'🇹🇭',en:'🇬🇧',lo:'🇱🇦',my:'🇲🇲'}[l])+'</span>'+esc(I18N[l].lang_name)+'</button>').join('')+'</div>');
  if(S.kcSql)h+=sqlCard;
  h+=card('ℹ️ '+esc(t('st_about_t')),'<div class="stkv"><span class="mut">'+esc(t('st_ver'))+'</span><b>'+esc(APP_VER)+'</b><span class="mut">'+esc(t('st_user'))+'</span><b>'+esc(S.user?S.user.name:'')+' · '+esc(S.prof?S.prof.role:'')+'</b>'+
    '<span class="mut">'+esc(t('st_data'))+'</span><span>'+esc(t('st_data_v',{i:S.items.length,r:S.recipes.length,s:S.sups.length,g:(S.lineGroups||[]).length}))+'</span></div>');
  el.innerHTML=h;
  pinnedBar('<span class="v sm" id="stDirty">'+esc(t('st_clean'))+'</span><button class="btn" id="stSaveBtn" onclick="stSave()">'+esc(t('st_save'))+'</button>');
};
function stBrHtml(){const gl=S.lineGroups||[];const rows=(S.branchesAll||[]);
  if(!rows.length)return '<div class="empty">'+esc(t('empty'))+'</div>';
  return rows.map(b=>'<div class="stbr"><div class="nm"><span class="dot" style="background:'+esc(b.color||'#ccc')+'"></span>'+esc(b.short||b.name)+' <span class="xs mut">'+esc(b.code)+'</span></div>'+
    '<select data-br="'+esc(b.code)+'" onchange="stBrSet(this.dataset.br,this.value)"><option value="">'+esc(t('st_line_none'))+'</option>'+gl.map(g=>'<option value="'+esc(g.group_id)+'"'+(String(ST_W.branch_line[b.code]||'')===String(g.group_id)?' selected':'')+'>'+esc(lgName(g.group_id))+'</option>').join('')+
    (ST_W.branch_line[b.code]&&!gl.some(g=>String(g.group_id)===String(ST_W.branch_line[b.code]))?'<option value="'+esc(ST_W.branch_line[b.code])+'" selected>'+esc(lgName(ST_W.branch_line[b.code]))+'</option>':'')+'</select>'+
    '<button type="button" class="btn gh sm2" data-br="'+esc(b.code)+'" onclick="stBrTest(this.dataset.br)">'+esc(t('st_test'))+'</button></div>').join('')+(gl.length?'':'<div class="hintbox">'+esc(t('st_no_groups'))+'</div>');}
function stBrSet(code,v){if(!ST_W)return;v=String(v||'').trim();if(v)ST_W.branch_line[code]=v;else delete ST_W.branch_line[code];stDirty();}
async function stBrTest(code){const sel=document.querySelector('select[data-br="'+code+'"]'),gid=String((sel&&sel.value)||'');
  if(!gid){toast(t('line_no_group'),true);return;}
  await once(async()=>{try{await lineSend(gid,t('st_test_txt',{b:branchName(code)})+'\n'+thDate(bizTodayISO())+' '+dispTime(new Date().toISOString()));toast(t('st_test_ok',{g:lgName(gid)}));}
    catch(e){toast(t('line_fail')+': '+((e&&e.message)||e),true);}});}
function stSupChips(){return ST_W.ck_sup_names.map((n,i)=>'<span class="stchip">'+esc(n)+'<button type="button" onclick="stSupDel('+i+')" aria-label="remove">✕</button></span>').join('');}
function stSupAdd(){const inp=document.getElementById('stSupNew');const n=String((inp&&inp.value)||'').trim();if(!n)return;
  if(ST_W.ck_sup_names.some(x=>supKey(x)===supKey(n))){toast(t('st_sup_dup'),true);return;}
  ST_W.ck_sup_names.push(n);inp.value='';document.getElementById('stSupChips').innerHTML=stSupChips();stDirty();}
function stSupDel(i){if(ST_W.ck_sup_names.length<=1){toast(t('st_sup_last'),true);return;}ST_W.ck_sup_names.splice(i,1);document.getElementById('stSupChips').innerHTML=stSupChips();stDirty();}
function stPrefixHintTxt(){const b=(S.branches[0]||S.branchesAll[0]||{code:'JJRD'}).code,d=bizTodayISO();return t('st_prefix_h',{p:ST_W.bill_prefix||'',ex:(ST_W.bill_prefix||'')+b+'-'+d.slice(2,4)+d.slice(5,7)+d.slice(8,10)+'-1'});}
function stPrefixHint(){const el=document.getElementById('stPrefixH');if(el)el.textContent=stPrefixHintTxt();}
function stMode(m){ST_W.overhead_mode=m==='pct'?'pct':'per_unit';document.querySelectorAll('#stMode .pill').forEach(b=>b.classList.toggle('on',b.dataset.m===ST_W.overhead_mode));
  const u=document.getElementById('stOhU');if(u)u.textContent=ST_W.overhead_mode==='pct'?'%':t('baht');stDirty();stExample();}
function stExampleHtml(){ // ตัวอย่างสด: เมนูแรกที่คิดต้นทุนได้ ด้วยค่าที่กำลังแก้ (ยังไม่บันทึก)
  const r=activeRecipes().map(x=>({r:x,c:recipeCost(x,1)})).find(x=>x.c.items>0&&!x.c.missing.length);
  if(!r)return '<div class="stex mut">'+esc(t('st_ex_none'))+'</div>';
  const items=r.c.items,yq=num(r.r.yield_qty)||1,extra=num(r.r.extra_cost),v=num(ST_W.overhead_value);
  const oh=rnd2(ST_W.overhead_mode==='pct'?items*v/100:yq*v),total=rnd2(items+oh+extra),unit=rnd4(total/yq),mk=r.r.markup_pct!=null?num(r.r.markup_pct):num(ST_W.markup_pct),sell=rnd4(unit*(1+mk/100));
  return '<div class="stex"><div class="b" style="margin-bottom:4px">'+esc(t('st_ex_t',{r:dispName(r.r),y:fmtQ(yq),u:trUnit(r.r.yield_unit)}))+'</div><table>'+
    '<tr><td>'+esc(t('st_ex_items'))+'</td><td class="n">'+esc(money(items))+'</td></tr><tr><td>'+esc(t('st_ex_oh'))+' ('+(ST_W.overhead_mode==='pct'?fmtQ(v)+'%':fmtQ(v)+' × '+fmtQ(yq))+')</td><td class="n">'+esc(money(oh))+'</td></tr>'+
    (extra?'<tr><td>'+esc(t('st_ex_extra'))+'</td><td class="n">'+esc(money(extra))+'</td></tr>':'')+
    '<tr class="tot"><td>'+esc(t('st_ex_total'))+'</td><td class="n">'+esc(money(total))+'</td></tr><tr><td>'+esc(t('st_ex_unit'))+'</td><td class="n">฿'+fmtQ(unit)+'</td></tr>'+
    '<tr><td>'+esc(t('st_ex_sell'))+' (+'+fmtQ(mk)+'%)</td><td class="n">฿'+fmtQ(sell)+'</td></tr></table></div>';}
function stExample(){const el=document.getElementById('stEx');if(el&&ST_W)el.innerHTML=stExampleHtml();}
function stUnitChips(){return ST_W.units.map((u,i)=>'<span class="stchip">'+esc(u)+'<button type="button" onclick="stUnitDel('+i+')" aria-label="remove">✕</button></span>').join('');}
function stUnitAdd(){const inp=document.getElementById('stUnitNew');const u=String((inp&&inp.value)||'').trim();if(!u)return;
  if(/[<>"'&\\]/.test(u)||u.length>24){toast(t('st_unit_bad'),true);return;}
  if(UNITS.includes(u)||ST_W.units.includes(u)){toast(t('st_unit_dup'),true);return;}
  ST_W.units.push(u);inp.value='';document.getElementById('stUnitChips').innerHTML=stUnitChips();stDirty();}
function stUnitDel(i){ST_W.units.splice(i,1);document.getElementById('stUnitChips').innerHTML=stUnitChips();stDirty();}
function stSqlHtml(){return '<div class="'+(S.kcSql?'okbox':'badbox')+'">'+esc(t(S.kcSql?'st_sql_ok':'st_sql_no'))+'</div><ol class="sm" style="margin:6px 0 10px;padding-left:20px;line-height:1.7"><li>'+esc(t('st_sql_1'))+'</li><li>'+esc(t('st_sql_2'))+'</li><li>'+esc(t('st_sql_3'))+'</li></ol>'+
  '<div class="row" style="margin-bottom:8px"><button type="button" class="btn" onclick="copyText(stSqlText())">'+esc(t('st_sql_copy'))+'</button><a class="btn gh" href="'+ST_SQL_URL+'" target="_blank" rel="noopener">↗ '+esc(t('st_sql_open'))+'</a></div>'+
  '<textarea id="stSql" readonly spellcheck="false">'+esc(stSqlText())+'</textarea>';}
async function stSave(){await once(async()=>{
  if(!isAdminish()||!ST_W)return;
  const w=ST_W,patch={branch_line:Object.assign({},w.branch_line),ck_sup_names:w.ck_sup_names.slice(),bill_prefix:String(w.bill_prefix||'').trim().slice(0,8),
    order_lookback_days:Math.round(num(w.order_lookback_days))===0?0:1,refill_days:Math.max(1,Math.min(60,Math.round(num(w.refill_days))||3)),
    overhead_mode:w.overhead_mode==='pct'?'pct':'per_unit',overhead_value:Math.max(0,num(w.overhead_value)),markup_pct:num(w.markup_pct),units:w.units.slice()};
  await cfgSave(patch);toast(t('st_saved'));if(S.tab==='set')show('set');});}
