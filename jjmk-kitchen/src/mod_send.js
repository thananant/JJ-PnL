/* ============================================================
   🚚 ส่งสาขา — send (sd*)
   ออเดอร์สาขา = stock_receipts ที่แอพนับสต๊อกเขียนตอนสาขากดสั่ง (sup = cfg.ck_sup_names · order_date ≥ วันนี้ − lookback)
   จัดกลุ่ม สาขา+วันสั่ง (เฉพาะสาขาที่เห็น = JJBR ∩ _br) · หักจำนวนที่ส่งไปแล้ว (kc_deliveries status≠void + lines ต่อสินค้า) → เหลือ = ค้างส่ง
   ชื่อสินค้าสาขา → เมนู ใช้ tdLinkOf()/TD_LINKS ของหน้าวันนี้ (kc_links → ชื่อตรงกัน) · ยังไม่ผูก = เลือกเมนูแล้วบันทึก kc_links
   ส่ง (ตั้งต้น = น้อยสุดของ ค้างส่ง/ของที่เหลือหลังจัดให้ใบสั่งก่อนหน้า) แก้ในที่ · ขาด → ⚡ ทำของ (หน้าทำของ ชิป ด่วน)
   ✅ ส่งแล้ว ออกบิล = kc_deliveries + kc_delivery_lines (ต้นทุน/ราคา ณ ตอนส่ง) → kc_moves 'send' + ck_add_qty (ห้ามส่งเกินสต๊อกสด)
     · ยอดสดอ่านไม่ได้ = ไม่ออกบิล (sd_live_fail) · หลังกดยืนยัน อ่านซ้ำทั้งยอดสด + ใบสั่ง/ที่ส่งแล้ว (อีกเครื่องอาจส่ง/ทำของ/สาขาแก้ยอดระหว่างหน้าต่างเปิด) ไม่ตรง = ไม่ออกบิล (sd_changed)
     · เลขบิลอ่านใหม่หลังหน้าต่าง · ชน (23505 — unique index ใน SQL) = อ่านเลขใหม่แล้วลองอีก ≤3 ครั้ง
   → ข้อความบิล (ไทยเสมอ) เข้ากลุ่มไลน์ของสาขา (cfg.branch_line) · ไม่มีกลุ่ม/ส่งไม่ได้ = กล่องคัดลอก + เปิดไลน์
   เขียนไม่ครบ = ถอนทั้งหมด (sdRollback) · ส่งบางส่วน = ที่เหลือยังขึ้น "ค้างส่ง" · setBadge('send', จำนวนใบสั่งที่ยังค้าง)
   ➕ ส่งเพิ่ม (เจ้าของสั่ง 2026-10-17 "ต้องมีปุ่ม เพิ่ม ด้วยเผื่อ สาขาเรียกของเพิ่มแล้วต้องใส่รายละเอียดเอง") — sdManual*:
     หัวหน้า 🚚 / กล่องว่าง → หน้าต่าง ① เลือกสาขา (S.branches ตามสิทธิ์ · ปุ่มสีสาขา) ② แตะรูปเมนู → ใส่จำนวน (หน่วย yield_unit ตั้งต้น 1)
     → กลุ่ม "✋ สาขาเรียกเพิ่ม" เป็นการ์ดใน SD.groups ต่อท้ายออเดอร์ปกติ (g.manual=true · key 'manual|<สาขา>|<วันนี้>' · บรรทัด rid 'manual|<สาขา>|<recipe_id>' pid '' link factor 1)
     · ร่าง localStorage jjck_sd_manual {d:วันนี้,g:{<สาขา>:[{recipe_id,qty}]}} เฉพาะวันเดียวกัน (รีเฟรชแล้วอยู่) · แก้จำนวนในที่ = แก้ร่าง (ส่ง = น้อยสุดของ จำนวน/ของที่เหลือ — ไม่พอ = ส่งเท่าที่มี ขาดขึ้นในบิล)
     · ✅ ส่งแล้ว ออกบิล ใช้ sdSend เส้นทางเดิมทุกขั้น (ยอดสดก่อน/หลังหน้าต่าง · เลขบิล · ถอนทั้งหมดถ้าพลาด) — head.order_date = วันนี้ · head.note = SD_MANUAL_NOTE (ไทยเสมอ) · บรรทัด stk_product_id null
       · ตรวจซ้ำหลังหน้าต่างเทียบกับร่างปัจจุบัน (ไม่ใช่ sdCalcGroups) · สำเร็จ = เหลือในร่างเฉพาะส่วนที่ส่งไม่ครบ (sdManualAfterBill — ขอ − ส่ง · ส่งครบ = เอาออก · ตรงกับบรรทัด "ค้างส่ง" ในบิลไลน์ · ผู้ตรวจ V2) · ข้อความไลน์มีบรรทัด "✋ สาขาเรียกของเพิ่ม" · 🧾 บิล/ยกเลิกบิล/ประวัติ เหมือนบิลปกติ
     · บิลที่ note = SD_MANUAL_NOTE ไม่ถูกหักออกจากออเดอร์ของแอพนับสต๊อก (sdCalcGroups ข้าม — ของเพิ่มไม่ใช่ของที่สั่งไว้) · ☀️ วันนี้/🍳 ทำของ ใช้ sdCalcGroups (ฟังก์ชันล้วน) จึงไม่เห็นร่างเรียกเพิ่ม ป้าย 🚚 นับเฉพาะออเดอร์ปกติ (ตัวเลขตรงกับหน้าวันนี้)
   ============================================================ */
I18N.add({
th:{sd_sub:'ออเดอร์ที่สาขานับสต๊อกแล้วสั่งมา — ใส่จำนวนที่ส่ง แล้วกดออกบิล',sd_none:'ไม่มีออเดอร์ค้างส่ง 👍',sd_none_h:'สาขาสั่งของผ่านแอพนับสต๊อก (ร้านค้า = {s}) ย้อนหลัง {d} วัน',
  sd_noread:'อ่านออเดอร์สาขาไม่ได้ — ลองโหลดใหม่',sd_reload:'⟳ โหลดออเดอร์ใหม่',sd_ordered:'สั่งมา',sd_have:'มี',sd_send:'ส่ง',sd_short:'ขาด',sd_full:'ครบ',sd_make:'⚡ ทำของ',
  sd_unlinked:'ยังไม่ผูกเมนู',sd_unlinked_h:'แตะเลือกเมนูที่ตรงกับ "{n}" — ระบบจะจำไว้ให้ครั้งต่อไป',sd_link_t:'ผูกชื่อสินค้าสาขากับเมนู',sd_link_factor:'1 {u} ของสาขา = กี่หน่วยของเมนู (ปกติ 1)',
  sd_link_saved:'ผูกเมนูแล้ว ✅',sd_link_bad:'ตัวคูณต้องมากกว่า 0',sd_link_first:'ผูกเมนูก่อนจึงส่งได้',sd_partial:'ค้างส่ง',sd_partial_h:'ส่งไปแล้ว {q} {u}',sd_lines_n:'{n} รายการ',sd_order_d:'สั่งเมื่อ {d}',
  sd_go:'✅ ส่งแล้ว ออกบิล',sd_confirm:'ส่งให้สาขา {b} {n} รายการ รวม {m}\nออกบิลเลขที่ {no} และตัดสต๊อกของที่ผลิตแล้ว?',sd_nothing:'ยังไม่ได้ใส่จำนวนที่ส่ง',
  sd_stock_short:'{n}: ในสต๊อกมี {h} {u} ส่ง {s} ไม่ได้ — ลดจำนวนหรือทำของก่อน',sd_max_order:'ส่งได้ไม่เกินที่สั่งมา ({q} {u})',sd_sql_block:'ยังไม่ได้รัน SQL — ออกบิลไม่ได้',
  sd_not_saved:'ออกบิลไม่สำเร็จ — ยังไม่ตัดสต๊อก ลองใหม่อีกครั้ง',sd_saved:'ออกบิล {no} แล้ว ✅',sd_line_sent:'ส่งบิลเข้ากลุ่มไลน์ {g} แล้ว ✅',sd_line_fail:'ส่งไลน์ไม่สำเร็จ — คัดลอกข้อความไปส่งเอง',
  sd_line_none:'สาขานี้ยังไม่ได้ตั้งกลุ่มไลน์ (⚙️ ตั้งค่า) — คัดลอกข้อความไปส่งเอง',sd_done_t:'ออกบิลแล้ว',sd_view_bill:'🧾 ดูบิล',
  sd_noread_h:'ยังไม่แสดงใบสั่ง — อ่านของที่ส่งไปแล้วไม่ครบ ถ้าแสดงอาจส่งซ้ำ',sd_no_price:'{n}: ยังไม่มีราคา — ส่งไม่ได้ (ทำของที่ 🍳 หรือใส่ต้นทุนใน 📖 เมนู)',
  sd_live_fail:'อ่านยอดสดของสินค้าไม่ได้ — ยังไม่ออกบิล ลองใหม่อีกครั้ง',sd_changed:'ใบสั่งนี้เปลี่ยนไประหว่างยืนยัน (อีกเครื่องส่งแล้ว / สาขาแก้ยอด / ราคาเปลี่ยน) — ยังไม่ออกบิล ดูตัวเลขใหม่แล้วกดอีกครั้ง',
  sd_no_price_h:'ไม่มีราคา — ส่งไม่ได้ · ทำของก่อน (🍳) หรือใส่ต้นทุนใน 📖 เมนู',sd_line_nosave:'ส่งไลน์แล้ว แต่บันทึกสถานะไม่ได้ — บิลจะขึ้นว่ายังไม่ส่งไลน์ ไม่ต้องส่งซ้ำ'},
en:{sd_sub:'Orders the branches placed after their stock count — enter what you deliver, then issue the bill',sd_none:'No orders waiting 👍',sd_none_h:'Branches order through the stock-count app (supplier = {s}), last {d} days',
  sd_noread:'Could not read branch orders — try reloading',sd_reload:'⟳ Reload orders',sd_ordered:'Ordered',sd_have:'In stock',sd_send:'Send',sd_short:'Short',sd_full:'Complete',sd_make:'⚡ Produce',
  sd_unlinked:'Not linked to a product',sd_unlinked_h:'Tap the product that matches "{n}" — remembered for next time',sd_link_t:'Link branch item to a product',sd_link_factor:'1 branch {u} = how many product units (usually 1)',
  sd_link_saved:'Linked ✅',sd_link_bad:'Factor must be above 0',sd_link_first:'Link the product first to deliver it',sd_partial:'Remainder',sd_partial_h:'already sent {q} {u}',sd_lines_n:'{n} lines',sd_order_d:'ordered {d}',
  sd_go:'✅ Delivered — issue bill',sd_confirm:'Deliver {n} lines to {b}, total {m}\nIssue bill {no} and deduct finished stock?',sd_nothing:'Enter the quantities to send first',
  sd_stock_short:'{n}: only {h} {u} in stock, cannot send {s} — lower the quantity or produce first',sd_max_order:'Cannot send more than ordered ({q} {u})',sd_sql_block:'SQL not run yet — cannot issue bills',
  sd_not_saved:'Bill not issued — stock untouched, please try again',sd_saved:'Bill {no} issued ✅',sd_line_sent:'Bill sent to LINE group {g} ✅',sd_line_fail:'LINE send failed — copy the text and send it yourself',
  sd_line_none:'This branch has no LINE group yet (⚙️ Settings) — copy the text and send it yourself',sd_done_t:'Bill issued',sd_view_bill:'🧾 View bill',
  sd_noread_h:'Orders are hidden — what was already delivered could not be read fully; showing them could send twice',sd_no_price:'{n}: no price yet — cannot send (produce it on 🍳 or set a cost on 📖 Menus)',
  sd_live_fail:'Could not read live stock — bill not issued, please try again',sd_changed:'This order changed while confirming (another device delivered / the branch changed it / price changed) — bill not issued, check the new numbers and tap again',
  sd_no_price_h:'No price — cannot send · produce first (🍳) or set a cost on 📖 Menus',sd_line_nosave:'Sent to LINE, but the status could not be saved — the bill will show "LINE not sent"; do not resend'},
lo:{sd_sub:'ອໍເດີທີ່ສາຂານັບສະຕັອກແລ້ວສັ່ງມາ — ໃສ່ຈຳນວນທີ່ສົ່ງ ແລ້ວກົດອອກບິນ',sd_none:'ບໍ່ມີອໍເດີຄ້າງສົ່ງ 👍',sd_none_h:'ສາຂາສັ່ງເຄື່ອງຜ່ານແອັບນັບສະຕັອກ (ຮ້ານຄ້າ = {s}) ຍ້ອນຫຼັງ {d} ມື້',
  sd_noread:'ອ່ານອໍເດີສາຂາບໍ່ໄດ້ — ລອງໂຫຼດໃໝ່',sd_reload:'⟳ ໂຫຼດອໍເດີໃໝ່',sd_ordered:'ສັ່ງມາ',sd_have:'ມີ',sd_send:'ສົ່ງ',sd_short:'ຂາດ',sd_full:'ຄົບ',sd_make:'⚡ ເຮັດເຄື່ອງ',
  sd_unlinked:'ຍັງບໍ່ຜູກເມນູ',sd_unlinked_h:'ແຕະເລືອກເມນູທີ່ກົງກັບ "{n}" — ລະບົບຈະຈື່ໄວ້ໃຫ້ຄັ້ງຕໍ່ໄປ',sd_link_t:'ຜູກຊື່ສິນຄ້າສາຂາກັບເມນູ',sd_link_factor:'1 {u} ຂອງສາຂາ = ຈັກໜ່ວຍຂອງເມນູ (ປົກກະຕິ 1)',
  sd_link_saved:'ຜູກເມນູແລ້ວ ✅',sd_link_bad:'ຕົວຄູນຕ້ອງຫຼາຍກວ່າ 0',sd_link_first:'ຜູກເມນູກ່ອນ ຈຶ່ງສົ່ງໄດ້',sd_partial:'ຄ້າງສົ່ງ',sd_partial_h:'ສົ່ງໄປແລ້ວ {q} {u}',sd_lines_n:'{n} ລາຍການ',sd_order_d:'ສັ່ງເມື່ອ {d}',
  sd_go:'✅ ສົ່ງແລ້ວ ອອກບິນ',sd_confirm:'ສົ່ງໃຫ້ສາຂາ {b} {n} ລາຍການ ລວມ {m}\nອອກບິນເລກທີ {no} ແລະຕັດສະຕັອກເຄື່ອງທີ່ຜະລິດແລ້ວ?',sd_nothing:'ຍັງບໍ່ໄດ້ໃສ່ຈຳນວນທີ່ສົ່ງ',
  sd_stock_short:'{n}: ໃນສະຕັອກມີ {h} {u} ສົ່ງ {s} ບໍ່ໄດ້ — ຫຼຸດຈຳນວນ ຫຼື ເຮັດເຄື່ອງກ່ອນ',sd_max_order:'ສົ່ງໄດ້ບໍ່ເກີນທີ່ສັ່ງມາ ({q} {u})',sd_sql_block:'ຍັງບໍ່ໄດ້ແລ່ນ SQL — ອອກບິນບໍ່ໄດ້',
  sd_not_saved:'ອອກບິນບໍ່ສຳເລັດ — ຍັງບໍ່ຕັດສະຕັອກ ລອງໃໝ່ອີກຄັ້ງ',sd_saved:'ອອກບິນ {no} ແລ້ວ ✅',sd_line_sent:'ສົ່ງບິນເຂົ້າກຸ່ມໄລນ໌ {g} ແລ້ວ ✅',sd_line_fail:'ສົ່ງໄລນ໌ບໍ່ສຳເລັດ — ຄັດລອກຂໍ້ຄວາມໄປສົ່ງເອງ',
  sd_line_none:'ສາຂານີ້ຍັງບໍ່ໄດ້ຕັ້ງກຸ່ມໄລນ໌ (⚙️ ຕັ້ງຄ່າ) — ຄັດລອກຂໍ້ຄວາມໄປສົ່ງເອງ',sd_done_t:'ອອກບິນແລ້ວ',sd_view_bill:'🧾 ເບິ່ງບິນ',
  sd_noread_h:'ຍັງບໍ່ສະແດງໃບສັ່ງ — ອ່ານເຄື່ອງທີ່ສົ່ງໄປແລ້ວບໍ່ຄົບ ຖ້າສະແດງອາດສົ່ງຊ້ຳ',sd_no_price:'{n}: ຍັງບໍ່ມີລາຄາ — ສົ່ງບໍ່ໄດ້ (ເຮັດເຄື່ອງທີ່ 🍳 ຫຼື ໃສ່ຕົ້ນທຶນໃນ 📖 ເມນູ)',
  sd_live_fail:'ອ່ານຍອດສົດຂອງສິນຄ້າບໍ່ໄດ້ — ຍັງບໍ່ອອກບິນ ລອງໃໝ່ອີກຄັ້ງ',sd_changed:'ໃບສັ່ງນີ້ປ່ຽນໄປລະຫວ່າງຢືນຢັນ (ອີກເຄື່ອງສົ່ງແລ້ວ / ສາຂາແກ້ຍອດ / ລາຄາປ່ຽນ) — ຍັງບໍ່ອອກບິນ ເບິ່ງຕົວເລກໃໝ່ແລ້ວກົດອີກຄັ້ງ',
  sd_no_price_h:'ບໍ່ມີລາຄາ — ສົ່ງບໍ່ໄດ້ · ເຮັດເຄື່ອງກ່ອນ (🍳) ຫຼື ໃສ່ຕົ້ນທຶນໃນ 📖 ເມນູ',sd_line_nosave:'ສົ່ງໄລນ໌ແລ້ວ ແຕ່ບັນທຶກສະຖານະບໍ່ໄດ້ — ບິນຈະຂຶ້ນວ່າຍັງບໍ່ສົ່ງໄລນ໌ ບໍ່ຕ້ອງສົ່ງຊ້ຳ'},
my:{sd_sub:'ဆိုင်ခွဲများ စာရင်းကောက်ပြီး မှာထားသော အော်ဒါ — ပို့မည့်အရေအတွက် ထည့်ပြီး ဘေလ်ထုတ်ပါ',sd_none:'ပို့ရန်ကျန် အော်ဒါ မရှိပါ 👍',sd_none_h:'ဆိုင်ခွဲများသည် စာရင်းကောက်အက်ပ်မှ မှာယူသည် (ဆိုင် = {s}) နောက် {d} ရက်',
  sd_noread:'ဆိုင်ခွဲအော်ဒါ ဖတ်မရပါ — ပြန်ဖွင့်ကြည့်ပါ',sd_reload:'⟳ အော်ဒါ ပြန်ဖွင့်',sd_ordered:'မှာထား',sd_have:'ရှိ',sd_send:'ပို့',sd_short:'လို',sd_full:'ပြည့်',sd_make:'⚡ ထုတ်လုပ်',
  sd_unlinked:'မီနူးနှင့် မချိတ်ရသေး',sd_unlinked_h:'"{n}" နှင့် ကိုက်ညီသော မီနူးကို နှိပ်ပါ — နောက်တစ်ကြိမ်အတွက် မှတ်ထားမည်',sd_link_t:'ဆိုင်ခွဲထုတ်ကုန်အမည်ကို မီနူးနှင့် ချိတ်ရန်',sd_link_factor:'ဆိုင်ခွဲ 1 {u} = မီနူးယူနစ် ဘယ်လောက် (ပုံမှန် 1)',
  sd_link_saved:'မီနူး ချိတ်ပြီး ✅',sd_link_bad:'မြှောက်ဖော်ကိန်း 0 ထက် ကြီးရမည်',sd_link_first:'မီနူးချိတ်ပြီးမှ ပို့နိုင်သည်',sd_partial:'ပို့ရန်ကျန်',sd_partial_h:'ပို့ပြီး {q} {u}',sd_lines_n:'{n} ကြောင်း',sd_order_d:'မှာသည့်ရက် {d}',
  sd_go:'✅ ပို့ပြီး ဘေလ်ထုတ်',sd_confirm:'ဆိုင်ခွဲ {b} သို့ {n} ကြောင်း စုစုပေါင်း {m} ပို့မည်\nဘေလ်နံပါတ် {no} ထုတ်ပြီး ထုတ်ကုန်လက်ကျန် နုတ်မလား?',sd_nothing:'ပို့မည့်အရေအတွက် မထည့်ရသေးပါ',
  sd_stock_short:'{n}: လက်ကျန် {h} {u} သာရှိ၍ {s} မပို့နိုင်ပါ — အရေအတွက်လျှော့ပါ သို့မဟုတ် အရင်ထုတ်လုပ်ပါ',sd_max_order:'မှာထားသည်ထက် မပို့နိုင်ပါ ({q} {u})',sd_sql_block:'SQL မလုပ်ရသေး — ဘေလ်မထုတ်နိုင်ပါ',
  sd_not_saved:'ဘေလ်ထုတ်မရပါ — လက်ကျန် မနုတ်ရသေး ထပ်စမ်းပါ',sd_saved:'ဘေလ် {no} ထုတ်ပြီး ✅',sd_line_sent:'LINE အုပ်စု {g} သို့ ဘေလ်ပို့ပြီး ✅',sd_line_fail:'LINE ပို့မရပါ — စာသားကူးပြီး ကိုယ်တိုင်ပို့ပါ',
  sd_line_none:'ဤဆိုင်ခွဲအတွက် LINE အုပ်စု မသတ်မှတ်ရသေး (⚙️ ဆက်တင်) — စာသားကူးပြီး ကိုယ်တိုင်ပို့ပါ',sd_done_t:'ဘေလ်ထုတ်ပြီး',sd_view_bill:'🧾 ဘေလ်ကြည့်',
  sd_noread_h:'အော်ဒါများ ဖျောက်ထားသည် — ပို့ပြီးသားများကို အပြည့်ဖတ်မရ၍ ပြလျှင် နှစ်ကြိမ်ပို့မိနိုင်သည်',sd_no_price:'{n}: ဈေးမရှိသေး — မပို့နိုင်ပါ (🍳 တွင်ထုတ်လုပ်ပါ သို့မဟုတ် 📖 မီနူးတွင် ကုန်ကျစရိတ်ထည့်ပါ)',
  sd_live_fail:'လက်ကျန်အသစ် ဖတ်မရပါ — ဘေလ်မထုတ်ရသေး ထပ်စမ်းပါ',sd_changed:'အတည်ပြုနေစဉ် ဤအော်ဒါ ပြောင်းသွားသည် (အခြားစက်မှ ပို့ပြီး / ဆိုင်ခွဲ ပြင်သည် / ဈေးပြောင်းသည်) — ဘေလ်မထုတ်ရသေး၊ အသစ်ကိုကြည့်ပြီး ထပ်နှိပ်ပါ',
  sd_no_price_h:'ဈေးမရှိ — မပို့နိုင်ပါ · အရင်ထုတ်လုပ်ပါ (🍳) သို့မဟုတ် 📖 မီနူးတွင် ကုန်ကျစရိတ်ထည့်ပါ',sd_line_nosave:'LINE ပို့ပြီးသော်လည်း အခြေအနေ သိမ်းမရပါ — ဘေလ်တွင် "LINE မပို့ရသေး" ဟုပြမည်၊ ထပ်မပို့ပါနှင့်'}
});
I18N.add({ // ➕ ส่งเพิ่ม — สาขาเรียกของเพิ่ม (2026-10-17)
th:{sd_m_btn:'➕ ส่งเพิ่ม',sd_m_title:'ส่งเพิ่ม — สาขาเรียกของเพิ่ม',sd_m_chip:'✋ สาขาเรียกเพิ่ม',sd_m_pick_br:'สาขาไหนเรียกของเพิ่ม? แตะเลือก',sd_m_pick_menu:'แตะรูปเมนูที่สาขาขอเพิ่ม แล้วใส่จำนวน',
  sd_m_change_br:'เปลี่ยนสาขา',sd_m_qty:'จำนวนที่ส่งเพิ่ม',sd_m_ok:'✓ ตกลง',sd_m_done:'✓ เสร็จ ({n} รายการ)',sd_m_remove:'เอาออก',sd_m_drop:'🗑 ยกเลิกรายการเรียกเพิ่ม',
  sd_m_drop_q:'ยกเลิกรายการที่สาขา {b} เรียกเพิ่มทั้งหมด ({n} รายการ)? ยังไม่ได้ออกบิล ไม่กระทบสต๊อก',sd_m_bad_qty:'ใส่จำนวนมากกว่า 0',sd_m_none_br:'ไม่มีสาขาที่ส่งได้',
  sd_m_no_menu:'ยังไม่มีเมนูที่ใช้ได้ — เพิ่มที่ 📖 เมนู',sd_m_empty_h:'สาขาโทรมาเรียกของเพิ่ม? กด ➕ ส่งเพิ่ม แล้วใส่รายการเอง',sd_m_draft:'รายการเรียกเพิ่มเก็บไว้ในเครื่องนี้จนกว่าจะออกบิล (วันนี้เท่านั้น)',sd_m_asked:'ขอเพิ่ม'},
en:{sd_m_btn:'➕ Extra delivery',sd_m_title:'Extra delivery — the branch asked for more',sd_m_chip:'✋ Branch asked for more',sd_m_pick_br:'Which branch asked for more? Tap it',sd_m_pick_menu:'Tap the products the branch asked for, then enter the quantity',
  sd_m_change_br:'Change branch',sd_m_qty:'Extra quantity',sd_m_ok:'✓ OK',sd_m_done:'✓ Done ({n} lines)',sd_m_remove:'Remove',sd_m_drop:'🗑 Discard this extra request',
  sd_m_drop_q:'Discard everything branch {b} asked for ({n} lines)? No bill was issued, stock untouched',sd_m_bad_qty:'Enter a quantity above 0',sd_m_none_br:'No branch available',
  sd_m_no_menu:'No product available yet — add one on 📖 Menus',sd_m_empty_h:'A branch called for more? Tap ➕ Extra delivery and enter the lines yourself',sd_m_draft:'Extra requests stay on this device until billed (today only)',sd_m_asked:'Asked'},
lo:{sd_m_btn:'➕ ສົ່ງເພີ່ມ',sd_m_title:'ສົ່ງເພີ່ມ — ສາຂາເອີ້ນເຄື່ອງເພີ່ມ',sd_m_chip:'✋ ສາຂາເອີ້ນເພີ່ມ',sd_m_pick_br:'ສາຂາໃດເອີ້ນເຄື່ອງເພີ່ມ? ແຕະເລືອກ',sd_m_pick_menu:'ແຕະຮູບເມນູທີ່ສາຂາຂໍເພີ່ມ ແລ້ວໃສ່ຈຳນວນ',
  sd_m_change_br:'ປ່ຽນສາຂາ',sd_m_qty:'ຈຳນວນທີ່ສົ່ງເພີ່ມ',sd_m_ok:'✓ ຕົກລົງ',sd_m_done:'✓ ສຳເລັດ ({n} ລາຍການ)',sd_m_remove:'ເອົາອອກ',sd_m_drop:'🗑 ຍົກເລີກລາຍການເອີ້ນເພີ່ມ',
  sd_m_drop_q:'ຍົກເລີກລາຍການທີ່ສາຂາ {b} ເອີ້ນເພີ່ມທັງໝົດ ({n} ລາຍການ)? ຍັງບໍ່ໄດ້ອອກບິນ ບໍ່ກະທົບສະຕັອກ',sd_m_bad_qty:'ໃສ່ຈຳນວນຫຼາຍກວ່າ 0',sd_m_none_br:'ບໍ່ມີສາຂາທີ່ສົ່ງໄດ້',
  sd_m_no_menu:'ຍັງບໍ່ມີເມນູທີ່ໃຊ້ໄດ້ — ເພີ່ມທີ່ 📖 ເມນູ',sd_m_empty_h:'ສາຂາໂທມາເອີ້ນເຄື່ອງເພີ່ມ? ກົດ ➕ ສົ່ງເພີ່ມ ແລ້ວໃສ່ລາຍການເອງ',sd_m_draft:'ລາຍການເອີ້ນເພີ່ມເກັບໄວ້ໃນເຄື່ອງນີ້ຈົນກວ່າຈະອອກບິນ (ມື້ນີ້ເທົ່ານັ້ນ)',sd_m_asked:'ຂໍເພີ່ມ'},
my:{sd_m_btn:'➕ ထပ်ပို့',sd_m_title:'ထပ်ပို့ — ဆိုင်ခွဲက ထပ်တောင်းသည်',sd_m_chip:'✋ ဆိုင်ခွဲ ထပ်တောင်း',sd_m_pick_br:'ဘယ်ဆိုင်ခွဲက ထပ်တောင်းသလဲ? နှိပ်ရွေးပါ',sd_m_pick_menu:'ဆိုင်ခွဲ ထပ်တောင်းသော မီနူးပုံကို နှိပ်ပြီး အရေအတွက် ထည့်ပါ',
  sd_m_change_br:'ဆိုင်ခွဲ ပြောင်း',sd_m_qty:'ထပ်ပို့မည့် အရေအတွက်',sd_m_ok:'✓ အိုကေ',sd_m_done:'✓ ပြီးပြီ ({n} ကြောင်း)',sd_m_remove:'ဖယ်ရှား',sd_m_drop:'🗑 ဤထပ်တောင်းမှုကို ဖျက်ရန်',
  sd_m_drop_q:'ဆိုင်ခွဲ {b} ထပ်တောင်းသော အားလုံး ({n} ကြောင်း) ဖျက်မလား? ဘေလ်မထုတ်ရသေး၊ လက်ကျန် မထိပါ',sd_m_bad_qty:'0 ထက်ကြီးသော အရေအတွက် ထည့်ပါ',sd_m_none_br:'ပို့နိုင်သော ဆိုင်ခွဲ မရှိပါ',
  sd_m_no_menu:'အသုံးပြုနိုင်သော မီနူး မရှိသေးပါ — 📖 မီနူးတွင် ထည့်ပါ',sd_m_empty_h:'ဆိုင်ခွဲက ဖုန်းဆက်ပြီး ထပ်တောင်းသလား? ➕ ထပ်ပို့ ကိုနှိပ်ပြီး ကိုယ်တိုင်ထည့်ပါ',sd_m_draft:'ထပ်တောင်းမှုများကို ဘေလ်မထုတ်မချင်း ဤစက်တွင် သိမ်းထားသည် (ယနေ့သာ)',sd_m_asked:'တောင်းထား'}
});
CSS.add(`
.sd-sub{font-size:13px;color:var(--mut);margin:-4px 0 10px}
.sd-hd{display:inline-flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.sd-empty-add{margin-top:12px;display:flex;flex-direction:column;gap:8px;align-items:center}.sd-empty-add .btn{min-width:200px}
.sd-mbrs{display:flex;flex-direction:column;gap:8px;margin:6px 0 12px}
.sd-mbr{justify-content:flex-start;gap:12px;border-width:2px;font-size:17px;text-align:left}.sd-mbr .sd-dot{width:16px;height:16px}
.sd-mhead{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 8px;font-size:15px}.sd-mhead b{font-family:var(--fh)}
.sd-mgrid{margin:8px 0 10px;padding:2px}   /* หน้าต่างเลื่อนทั้งก้อน (ไม่ซ้อนกล่องเลื่อน — กติกาจอมือถือ: ปุ่มต้องไม่ค้างใต้แถบโฮม) */
.sd-mtile{padding:8px;gap:6px}.sd-mtile .ithumb{height:96px;font-size:36px}.sd-mtile .iname{font-size:13.5px;min-height:auto}
.sd-mtile.on{border:2px solid #3E9E64;background:#F4FBF6}.sd-mtile.nop{opacity:.75}
.sd-mbadge{position:absolute;top:6px;right:6px;background:#2E7D4F;color:#fff;border-radius:999px;padding:3px 9px;font-size:12.5px;font-weight:800;box-shadow:var(--sh);z-index:2;white-space:nowrap}
.sd-mqty{margin:8px 0 4px}.sd-mqty .skstep input{font-size:22px;height:52px}.sd-mqty .skstep button{width:52px;height:52px}
.sdl-x{width:44px;height:44px;min-height:44px;border-radius:50%;border:1.5px solid var(--line);background:#fff;color:var(--mut);font-size:16px;flex:none;padding:0;cursor:pointer}
.sdl-top.sdm{flex-wrap:nowrap;align-items:center}.sdl-top.sdm .sdl-name{flex:1;min-width:0;overflow-wrap:anywhere}
.sd-drop{flex:none}
.sd-card h3 .sp{display:inline-flex;gap:6px;flex-wrap:wrap;align-items:center}
.sd-dot{width:12px;height:12px;border-radius:50%;flex:none;display:inline-block;border:1px solid rgba(0,0,0,.08)}
.sdl{padding:10px 0;border-bottom:1px solid var(--line)}.sdl.last{border-bottom:0}
.sdl-top{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline}.sdl-name{font-size:16px;font-family:var(--fh)}
.sdl-stats{display:flex;gap:12px;flex-wrap:wrap;font-size:13.5px;color:var(--mut);margin:4px 0 2px;align-items:center}.sdl-stats b{color:var(--ink)}.sdl-stats b.red{color:var(--bad)}.sdl-stats b.green{color:var(--ok)}
.sdl-send{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.sdl-send .skstep{flex:1;min-width:170px;max-width:420px;margin-top:4px}.sdl-lb{font-weight:700;font-family:var(--fh);min-width:28px}
.sdl-short{margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:22px}
.sd-foot{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px}.sd-tot{display:flex;flex-direction:column;flex:none}.sd-tot b{font-size:20px;font-family:var(--fh)}
.sd-go{flex:1;min-width:180px}
.sd-pick{max-height:52vh;overflow-y:auto}
@media(max-width:700px){#sdBody .sd-card:last-child{margin-bottom:72px}}
.sdl-send .chip.bad{white-space:normal;line-height:1.35;padding:4px 10px;max-width:100%}   /* ⛔ ไม่มีราคา — ข้อความยาว พับบรรทัดบนจอแคบ */
`);
I18N.add({ // ➕ ส่งเพิ่ม: ของไม่พอส่ง (จัดให้ใบสั่งสาขาก่อน) — ผู้ตรวจ V1 เจอว่าขึ้น "ยังไม่ได้ใส่จำนวนที่ส่ง" ทั้งที่การ์ดเรียกเพิ่มไม่มีช่องส่ง
th:{sd_m_nothing:'ของไม่พอส่ง — จัดให้ใบสั่งสาขาก่อนแล้ว · ⚡ ทำของก่อน หรือลดจำนวนที่ขอ',sd_m_nothing_s:'⛔ ของไม่พอส่ง (จัดให้ใบสั่งสาขาก่อน)'},
en:{sd_m_nothing:'Not enough stock to send — branch orders are served first · make more first, or lower the requested amount',sd_m_nothing_s:'⛔ Not enough stock (branch orders first)'},
lo:{sd_m_nothing:'ເຄື່ອງບໍ່ພໍສົ່ງ — ຈັດໃຫ້ໃບສັ່ງສາຂາກ່ອນແລ້ວ · ⚡ ເຮັດເຄື່ອງກ່ອນ ຫຼືຫຼຸດຈຳນວນທີ່ຂໍ',sd_m_nothing_s:'⛔ ເຄື່ອງບໍ່ພໍສົ່ງ (ຈັດໃຫ້ໃບສັ່ງສາຂາກ່ອນ)'},
my:{sd_m_nothing:'ပို့ရန် လက်ကျန်မလုံလောက်ပါ — ဆိုင်ခွဲအော်ဒါများကို ဦးစွာထုတ်ပေးပြီးပါပြီ · ⚡ အရင်ထုတ်လုပ်ပါ သို့မဟုတ် တောင်းဆိုအရေအတွက် လျှော့ပါ',sd_m_nothing_s:'⛔ လက်ကျန်မလုံလောက် (ဆိုင်ခွဲအော်ဒါ ဦးစွာ)'}
});
I18N.add({ // ➕ ส่งเพิ่ม ส่งได้ไม่ครบ = ส่วนที่ขาดยังอยู่ในการ์ด ✋ (ตรงกับบรรทัด "ค้างส่ง" ในบิลไลน์ — ผู้ตรวจ V2 2026-10-17) · ร่างของวันก่อนถูกทิ้ง = บอกครั้งเดียว
th:{sd_m_left:'ยังค้างส่ง {n} รายการ — อยู่ในการ์ด ✋ สาขาเรียกเพิ่ม ทำของเสร็จแล้วกดส่งอีกครั้ง (วันนี้เท่านั้น)',sd_m_dropped:'รายการเรียกเพิ่มของวัน {d} ที่ยังไม่ได้ออกบิล ถูกทิ้งแล้ว (เก็บไว้วันเดียว) — ถ้ายังต้องส่งให้กด ➕ ส่งเพิ่ม ใหม่'},
en:{sd_m_left:'{n} line(s) still owed — kept on the ✋ extra-request card, send again once made (today only)',sd_m_dropped:'The unbilled extra request from {d} was dropped (kept one day only) — tap ➕ Extra delivery again if it is still needed'},
lo:{sd_m_left:'ຍັງຄ້າງສົ່ງ {n} ລາຍການ — ຢູ່ໃນກາດ ✋ ສາຂາເອີ້ນເພີ່ມ ເຮັດເຄື່ອງແລ້ວກົດສົ່ງອີກຄັ້ງ (ມື້ນີ້ເທົ່ານັ້ນ)',sd_m_dropped:'ລາຍການເອີ້ນເພີ່ມຂອງວັນ {d} ທີ່ຍັງບໍ່ໄດ້ອອກບິນ ຖືກຖິ້ມແລ້ວ (ເກັບໄວ້ມື້ດຽວ) — ຖ້າຍັງຕ້ອງສົ່ງໃຫ້ກົດ ➕ ສົ່ງເພີ່ມ ໃໝ່'},
my:{sd_m_left:'{n} ကြောင်း ပို့ရန်ကျန်သေးသည် — ✋ ထပ်တောင်းကတ်တွင် ရှိနေသည် ထုတ်လုပ်ပြီးလျှင် ထပ်ပို့ပါ (ယနေ့သာ)',sd_m_dropped:'{d} ၏ ဘေလ်မထုတ်ရသေးသော ထပ်တောင်းမှုကို ဖယ်ရှားပြီး (တစ်ရက်သာသိမ်းသည်) — လိုသေးလျှင် ➕ ထပ်ပို့ ကို ပြန်နှိပ်ပါ'}
});
let SD={at:0,ok:true,err:null,groups:[],raw:null,loading:null,quiet:false};
document.addEventListener('kc:booted',()=>{ // บูตบนแท็บอื่น = ป้าย 🚚 ต้องขึ้นเหมือนกัน (☀️ วันนี้/🚚 ส่งสาขา โหลดเองอยู่แล้ว)
  if(!S.user||!canKitchen()||S.tab==='today'||S.tab==='send'||SD.at)return;sdLoad({noRefresh:true}).catch(()=>{});});
const SD_EDIT={};      // 'สาขา|วันสั่ง|สินค้า' → จำนวนที่ผู้ใช้แก้เอง (คงไว้ตอนคิดใหม่/วาดใหม่)
let SD_PICK=null;      // บรรทัดที่กำลังผูกเมนู {name,unit}
const SD_SHOP='ครัวกลาง จริงใจหมูกระทะ';   // หัวข้อความไลน์ (ไทยเสมอ)
const SD_LINE_OK='jjck_line_ok';   // {id บิล: เวลา} ส่งไลน์ถึงแล้วแต่เขียน line_sent_at ไม่ได้ — เครื่องนี้จำไว้ (บิลขึ้นสถานะตรง · ส่งซ้ำถามก่อน)
const SD_MANUAL='jjck_sd_manual';         // ร่าง ➕ ส่งเพิ่ม {d:วันนี้,g:{<สาขา>:[{recipe_id,qty}]}} — วันเดียวกันเท่านั้น
const SD_MANUAL_NOTE='สาขาเรียกของเพิ่ม';  // kc_deliveries.note ของบิลส่งเพิ่ม (ไทยเสมอ) — ตัวบอกว่าบิลนี้ไม่ใช่ของที่สาขาสั่งผ่านแอพนับสต๊อก
let SD_M=null;          // หน้าต่าง ➕ ส่งเพิ่มที่เปิดอยู่ {code,q}
const sdIsManual=d=>String(d&&d.note||'')===SD_MANUAL_NOTE;
function sdLineOkMap(){const m=LS.get(SD_LINE_OK,{});return (m&&typeof m==='object'&&!Array.isArray(m))?m:{};}
function sdLineOkMark(id,at){const m=sdLineOkMap(),cut=Date.now()-3*86400e3;Object.keys(m).forEach(k=>{if(!(Date.parse(m[k])>cut))delete m[k];});m[id]=at;LS.set(SD_LINE_OK,m);}
function sdLineOkAt(id){return sdLineOkMap()[id]||null;}

RENDER.send=function(el){
  el.innerHTML=dhead('🚚 '+t('nav_send'),'<span class="sd-hd">'+(canKitchen()?'<button type="button" class="btn sm2 sd-madd" onclick="sdManualOpen()">'+esc(t('sd_m_btn'))+'</button>':'')+
      '<button type="button" class="btn gh sm2" onclick="sdReload()">'+esc(t('sd_reload'))+'</button></span>')+sqlNeedBox()+
    '<div class="sd-sub">'+esc(t('sd_sub'))+'</div>'+(brScoped()?'<div class="note">'+esc(t('br_scope',{b:brScopeTxt()||'—'}))+'</div>':'')+'<div id="sdBody"><div class="spin"></div></div>';
  if(SD.at){sdCalc();sdPaint();}
  sdLoad().then(()=>{if(S.tab==='send')sdPaint();});
};
function sdReload(){sdLoad().then(()=>{if(S.tab==='send')sdPaint();});}

/* ---------- อ่าน (fail-soft · ใช้ tdGet ของหน้าวันนี้) ---------- */
async function sdLoad(opt){ // opt.noRefresh = แค่นับใบสั่งค้าง (ป้าย 🚚 ตอนบูต) ไม่อ่านยอดสดของเมนู
  const quiet=!!(opt&&opt.noRefresh);
  if(SD.loading){await SD.loading;if(quiet||!SD.quiet)return;}   // โหลดแบบเงียบค้างอยู่ → รอแล้วอ่านยอดสดต่อ
  SD.quiet=quiet;
  SD.loading=(async()=>{
    const R=await sdRead();
    SD.ok=R.ok;SD.err=R.err;
    if(R.lk.ok)TD_LINKS=R.lk.rows;
    if(!SD.ok){SD.at=Date.now();return;}   // อ่านไม่ครบ (เช่น kc_delivery_lines) = ห้ามคิดจากข้อมูลครึ่ง ๆ — ใบที่ส่งไปแล้วจะกลับมาให้ส่งซ้ำ · คงผลรอบที่อ่านได้ล่าสุด (ป้าย 🚚) ไว้
    SD.raw=R.raw;
    const rids=[...new Set(R.raw.sr.map(r=>{const l=tdLinkOf(r.name);return l&&l.recipe_id;}).filter(Boolean))];
    if(rids.length&&!quiet)await refreshRows('recipe',rids);   // "มี" = ยอดสด (อีกเครื่องอาจเพิ่งทำของ/ส่ง)
    SD.at=Date.now();sdCalc();
  })();
  try{await SD.loading;}finally{SD.loading=null;}
}
async function sdRead(){ // อ่านชุดข้อมูลออเดอร์ (ไม่แตะ SD) → {ok,err,raw:{sr,dl,dll},lk} · sdLoad ใช้ตอนโหลด · sdSend ใช้อ่านซ้ำหลังกดยืนยัน
  const td=bizTodayISO(),cfg=S.cfg||CFG_DEF,from=addDays(td,-num(cfg.order_lookback_days));
  const [sr,lk,dl]=await Promise.all([
    tdGet('stock_receipts',q=>q.gte('order_date',from).gt('ordered',0).order('order_date').order('product_id')),   // ตารางจริงไม่มีคอลัมน์ id (คีย์ = สาขา+สินค้า+วันสั่ง)
    tdGet('kc_links'),
    tdGet('kc_deliveries',q=>q.gte('order_date',from).neq('status','void'))]);
  sdTblGone(dl);
  let dll={ok:true,rows:[]};
  if(dl.ok&&dl.rows.length)dll=await tdGet('kc_delivery_lines',q=>q.in('delivery_id',dl.rows.map(d=>d.id)));
  sdTblGone(dll);
  const ok=sr.ok&&dl.ok&&dll.ok;
  return {ok,err:ok?null:String(((sr.err||dl.err||dll.err)||{}).message||''),raw:{sr:sr.rows,dl:dl.rows,dll:dll.rows},lk};}
function sdTblGone(x){ // ยังไม่รัน SQL (S.kcSql=false) + ตารางไม่มีจริง = ยังไม่เคยส่งอะไร → ถือว่าว่าง (ออกบิลถูกกันด้วย sd_sql_block อยู่แล้ว) · permission denied/อ่านพลาด ≠ ตารางไม่มี
  if(x.ok||S.kcSql)return;const e=x.err||{},c=String(e.code||''),m=String(e.message||e||'');
  if(c==='42P01'||c==='PGRST205'||/does not exist|could not find the table/i.test(m)){x.ok=true;x.rows=[];x.gone=true;}}
function sdCalcGroups(R,branches){ // ฟังก์ชันล้วน — ☀️ วันนี้ · 🍳 ทำของ · 🚚 ส่งสาขา ใช้ตัวคิดเดียวกัน ตัวเลขจึงตรงกันทุกหน้า
  // {sr,dl,dll} + สาขาที่นับ → {groups:[{key,code,name,short,color,od,lines:[{rid,pid,name,unit,ordered,already,remaining,link,have:0,sent:0}],unlinked}] (เฉพาะที่ยังค้างส่ง · วันสั่งเก่าก่อน),
  //  ordered:{rid:Σสั่ง×f} · sent:{rid:Σส่งแล้ว×f (ไม่เกินที่สั่ง)} · need:{rid:Σค้างส่ง×f} (= ordered−sent) · unlinked:[ชื่อสินค้าสาขาที่ยังไม่ผูก] · lines:จำนวนบรรทัดค้าง
  // ส่งแล้วหักรายบรรทัด (kc_delivery_lines ต่อ สาขา|วันสั่ง|ไอดีสินค้าสาขา · แถวเก่าไม่มีไอดี = ต่อชื่อ) → ส่งบางส่วน = ที่เหลือยังค้าง
  const names=((S.cfg||CFG_DEF).ck_sup_names||[]).map(supKey);
  const byStk={};(branches||[]).forEach(b=>{if(b.stk)byStk[String(b.stk)]=b;});
  const dById={};(R.dl||[]).forEach(d=>{if(d.status!=='void'&&!sdIsManual(d))dById[String(d.id)]=d;});   // บิล ➕ ส่งเพิ่ม (note = SD_MANUAL_NOTE) ไม่ใช่ของที่สั่งไว้ — ไม่หักออกจากออเดอร์ (ร่างเรียกเพิ่มก็ไม่อยู่ในผลนี้: ☀️/🍳 ไม่นับ)
  const byId={},byName={};
  (R.dll||[]).forEach(l=>{const d=dById[String(l.delivery_id)];if(!d)return;const k0=d.branch+'|'+String(d.order_date||'').slice(0,10),q=num(l.sent);
    if(l.stk_product_id)byId[k0+'|'+l.stk_product_id]=num(byId[k0+'|'+l.stk_product_id])+q;else byName[k0+'|'+supKey(l.name)]=num(byName[k0+'|'+supKey(l.name)])+q;});
  const groups={},ordered={},sent={},need={},unlinked=[];
  (R.sr||[]).forEach(r=>{if(!names.includes(supKey(r.sup)))return;const b=byStk[String(r.branch_id)];if(!b||!(num(r.ordered)>0))return;
    const od=String(r.order_date||'').slice(0,10),k0=b.code+'|'+od,link=tdLinkOf(r.name),rec=link&&recipeById(link.recipe_id);
    let already=num(byId[k0+'|'+r.product_id])+num(byName[k0+'|'+supKey(r.name)]);
    if(rec&&supKey(rec.name)!==supKey(r.name))already+=num(byName[k0+'|'+supKey(rec.name)]);
    already=rnd4(already);const remaining=rnd4(num(r.ordered)-already);
    if(link){const rid=link.recipe_id,f=num(link.factor)||1;ordered[rid]=rnd4(num(ordered[rid])+num(r.ordered)*f);
      if(already>0)sent[rid]=rnd4(num(sent[rid])+Math.min(already,num(r.ordered))*f);
      if(remaining>1e-9)need[rid]=rnd4(num(need[rid])+remaining*f);}
    if(remaining<=1e-9)return;
    const g=groups[k0]=groups[k0]||{key:k0,code:b.code,name:b.name,short:b.short||b.name,color:b.color||'',od,lines:[],unlinked:0};
    if(!link){g.unlinked++;if(!unlinked.includes(r.name))unlinked.push(r.name);}
    g.lines.push({rid:String(r.branch_id)+'|'+String(r.order_date)+'|'+String(r.product_id==null?'':r.product_id),pid:r.product_id==null?'':String(r.product_id),cat:String(r.cat_label||''),name:String(r.name||''),unit:String(r.unit||''),ordered:num(r.ordered),already,remaining,link,have:0,sent:0});});
  const ord={};(branches||[]).forEach((b,i)=>{ord[b.code]=i;});
  const G=Object.values(groups).sort((a,b)=>a.od<b.od?-1:a.od>b.od?1:(num(ord[a.code])-num(ord[b.code])));
  G.forEach(g=>g.lines.sort((a,b)=>String(a.cat).localeCompare(String(b.cat),'th')||String(a.name).localeCompare(String(b.name),'th')||String(a.pid).localeCompare(String(b.pid))));   // เรียงแบบใบสั่งของสาขา: หมวด → ชื่อ (ตารางจริงไม่มี id ให้เรียงตามลำดับที่สั่ง)
  return {groups:G,ordered,sent,need,unlinked,lines:G.reduce((a,g)=>a+g.lines.length,0)};}
function sdCalc(){ // SD.raw → SD.groups (sdCalcGroups) + จัดสรรของที่มีตามลำดับ: ใบสั่งเก่าก่อน · ใบหลังได้ที่เหลือ · ป้าย 🚚 = จำนวนใบสั่งที่ยังค้าง
  if(!SD.raw)return;   // ยังไม่เคยอ่านครบ = ไม่มีอะไรให้คิด (ป้าย 🚚 คงเดิม)
  const G0=sdCalcGroups(SD.raw,S.branches).groups,G=G0.concat(sdManualGroups());   // ➕ ส่งเพิ่ม ต่อท้ายออเดอร์ปกติ — ได้ของที่เหลือหลังจัดให้ใบสั่งก่อน
  const left={};
  G.forEach(g=>{g.lines.forEach(l=>{if(!l.link)return;
      const rid=l.link.recipe_id,r=recipeById(rid),f=num(l.link.factor)||1;
      if(!(rid in left))left[rid]=Math.max(0,num(r&&r.qty));
      l.have=rnd4(left[rid]/f);
      const ek=g.key+'|'+l.pid,ed=g.manual?null:SD_EDIT[ek];   // เรียกเพิ่ม: จำนวนในร่างคือที่ขอ · ส่ง = เท่าที่มี (ไม่พอ = ขาด ขึ้นในบิล)
      l.sent=ed!=null?Math.min(l.remaining,Math.max(0,num(ed))):Math.min(l.remaining,l.have);
      l.noPrice=sdPriceOf(l)==null;if(l.noPrice)l.sent=0;   // ไม่มีราคา = ส่งไม่ได้ (บิล ฿0 คิดเงินสาขาขาด — กติกาเจ้าของ: ราคา = ต้นทุนจริงของล็อต)
      left[rid]=Math.max(0,rnd4(left[rid]-l.sent*f));});});
  SD.groups=G;setBadge('send',G0.length);   // ป้าย 🚚 = ใบสั่งจากแอพนับสต๊อกเท่านั้น (ตรงกับการ์ด ☀️ วันนี้ — ร่างเรียกเพิ่มอยู่แค่เครื่องนี้)
}
const sdFactor=l=>num(l.link&&l.link.factor)||1;
function sdBrColor(code,c){c=String(c||(typeof JJBR!=='undefined'&&typeof JJBR.color==='function'?JJBR.color(code):'')||'');return /^#[0-9a-fA-F]{3,8}$/.test(c)?c:'#6B0F12';}   // สีสาขาจากทะเบียนกลาง (ไม่มี = ไวน์)
function sdPriceOf(l){const r=l.link&&recipeById(l.link.recipe_id);const p=sellPrice(r);if(p==null)return null;const v=p*sdFactor(l);return v>=1?rnd2(v):rnd4(v);}   // ราคาขาย/หน่วยของสาขา (≥฿1 ปัด 2 ตำแหน่งเหมือนที่พิมพ์ในบิล → จำนวน × ราคา = เป็นเงิน พอดี)
function sdCostOf(l){const r=l.link&&recipeById(l.link.recipe_id);const c=recipeUnitCost(r);return c==null?null:rnd4(c*sdFactor(l));}
function sdGroupTotal(g){return rnd2(g.lines.reduce((a,l)=>a+(l.link?rnd2(num(l.sent)*num(sdPriceOf(l))):0),0));}

/* ---------- วาด ---------- */
function sdPaint(){
  const b=document.getElementById('sdBody');if(!b)return;
  if(!SD.ok){b.innerHTML='<div class="badbox">⚠ '+esc(t('sd_noread'))+(SD.err?' · '+esc(SD.err):'')+'<div class="xs" style="margin-top:4px">'+esc(t('sd_noread_h'))+'</div></div>'+
    '<button type="button" class="btn gh" onclick="sdReload()">'+esc(t('sd_reload'))+'</button>';return;}
  if(!SD.groups.length){const cfg=S.cfg||CFG_DEF;b.innerHTML='<div class="card"><div class="empty">'+esc(t('sd_none'))+'<div class="xs mut" style="margin-top:6px">'+esc(t('sd_none_h',{s:cfg.ck_sup_names.join(', '),d:cfg.order_lookback_days}))+'</div>'+
    (canKitchen()?'<div class="sd-empty-add"><button type="button" class="btn sd-madd" onclick="sdManualOpen()">'+esc(t('sd_m_btn'))+'</button><div class="xs mut">'+esc(t('sd_m_empty_h'))+'</div></div>':'')+'</div></div>';return;}
  b.innerHTML=SD.groups.map((g,gi)=>sdCardHtml(g,gi)).join('');
}
function sdCardHtml(g,gi){
  const td=bizTodayISO(),partial=g.lines.some(l=>l.already>0),linked=g.lines.filter(l=>l.link&&!l.noPrice).length,anyLink=g.lines.some(l=>l.link);
  const mZero=!!g.manual&&linked>0&&!g.lines.some(l=>l.link&&!l.noPrice&&num(l.sent)>0);   // เรียกเพิ่มแต่ของถูกจัดให้ใบสั่งสาขาหมดแล้ว = บอกตรง ๆ แทนปุ่ม ✅ (ผู้ตรวจ V1)
  let h='<div class="card sd-card'+(g.manual?' sd-manual':'')+'" id="sdG'+gi+'" data-key="'+esc(g.key)+'"><h3><span class="sd-dot" style="background:'+esc(sdBrColor(g.code,g.color))+'"></span>'+esc(g.short||g.name)+
    '<span class="sp">'+(g.manual?'<span class="chip warn sd-mchip">'+esc(t('sd_m_chip'))+'</span>':'')+'<span class="chip '+(g.od===td?'blue':'warn')+'">'+esc(g.od===td?t('today'):t('sd_order_d',{d:dispDate(g.od)}))+'</span>'+(partial?'<span class="chip warn">⏳ '+esc(t('sd_partial'))+'</span>':'')+'</span></h3>';
  h+=g.lines.map((l,li)=>sdLineHtml(gi,l,li,li===g.lines.length-1)).join('');
  h+='<div class="sd-foot"><div class="sd-tot"><span class="mut sm">'+esc(t('sd_lines_n',{n:g.lines.length}))+'</span><b id="sdTot'+gi+'">'+esc(money(sdGroupTotal(g)))+'</b></div>'+
    (linked?(mZero?'<span class="chip bad">'+esc(t('sd_m_nothing_s'))+'</span><button type="button" class="btn gh sm2" onclick="sdMake()">'+esc(t('sd_make'))+'</button>':'<button type="button" class="btn big sd-go" id="sdGo'+gi+'" onclick="sdSend('+gi+')">'+esc(t('sd_go'))+'</button>'):anyLink?'<span class="chip bad">⛔ '+esc(t('no_price'))+'</span>':'<span class="chip warn">🔗 '+esc(t('sd_link_first'))+'</span>')+
    (g.manual?'<button type="button" class="btn gh sm2 sd-drop" style="color:var(--bad)" onclick="sdManualDrop('+gi+')">'+esc(t('sd_m_drop'))+'</button>':'')+'</div></div>';
  return h;}
function sdLineHtml(gi,l,li,last){
  const id=gi+'_'+li,u=trUnit(l.unit),g=SD.groups[gi];
  if(g&&g.manual)return sdManualLineHtml(gi,l,li,last);
  let h='<div class="sdl'+(last?' last':'')+'" id="sdL'+id+'"><div class="sdl-top"><b class="sdl-name">'+esc(l.name)+'</b>'+(l.already>0?'<span class="xs mut">⏳ '+esc(t('sd_partial_h',{q:fmtQ(l.already),u}))+'</span>':'')+'</div>';
  if(!l.link){h+='<div class="sdl-stats"><span>'+esc(t('sd_ordered'))+' <b>'+fmtQ(l.remaining)+' '+esc(u)+'</b></span></div>'+
    '<button type="button" class="btn gh sm2 sd-link" onclick="sdLinkPick('+gi+','+li+')">🔗 '+esc(t('sd_unlinked'))+' ›</button>';return h+'</div>';}
  const p=sdPriceOf(l);
  h+='<div class="sdl-stats"><span>'+esc(t('sd_ordered'))+' <b>'+fmtQ(l.remaining)+' '+esc(u)+'</b></span><span>'+esc(t('sd_have'))+' <b id="sdHv'+id+'" class="'+(l.have>=l.remaining?'green':'red')+'">'+fmtQ(l.have)+'</b></span>'+
    (p==null?'<span class="chip warn">'+esc(t('no_price'))+'</span>':'<span>'+esc(moneyU(p))+'/'+esc(u)+'</span>')+'</div>'+
    (l.noPrice?'<div class="sdl-send"><span class="chip bad">⛔ '+esc(t('sd_no_price_h'))+'</span><button type="button" class="btn gh sm2" onclick="show(\'menus\')">📖 '+esc(t('nav_menus'))+'</button></div>':
    '<div class="sdl-send"><span class="sdl-lb">'+esc(t('sd_send'))+'</span>'+stepper('sdS'+id,l.sent,{step:1,min:0,max:l.remaining,unit:l.unit,on:(v)=>sdSetSent(gi,li,v)})+'</div>')+
    '<div class="sdl-short" id="sdSh'+id+'">'+sdShortHtml(l)+'</div>';
  return h+'</div>';}
function sdShortHtml(l){const sh=Math.max(0,rnd4(l.remaining-num(l.sent)));if(sh<=1e-9)return '<span class="chip ok">✓ '+esc(t('sd_full'))+'</span>';
  return '<span class="chip bad">'+esc(t('sd_short'))+' '+fmtQ(sh)+' '+esc(trUnit(l.unit))+'</span>'+(l.have<l.remaining-1e-9?'<button type="button" class="btn gh sm2 sd-mk" onclick="sdMake()">'+esc(t('sd_make'))+'</button>':'');}
function sdSetSent(gi,li,v){ // แก้จำนวนส่งในที่ (ไม่วาดใหม่ — คีย์บอร์ดไม่หุบ) · เกินที่สั่ง = ตัดเหลือเท่าที่สั่ง
  const g=SD.groups[gi],l=g&&g.lines[li];if(!l||!l.link||l.noPrice)return;
  let q=Math.max(0,rnd4(numIn(v)));   // "1,5" = 1.5 (numIn)
  if(q>l.remaining+1e-9){q=l.remaining;toast(t('sd_max_order',{q:fmtQ(l.remaining),u:trUnit(l.unit)}),'warn');const inp=document.getElementById('sdS'+gi+'_'+li);if(inp)inp.value=q;}
  SD_EDIT[g.key+'|'+l.pid]=q;sdCalc();sdRefresh();}
function sdRefresh(){ // ตัวเลข มี/ขาด/รวม ของทุกบรรทัดตามการจัดสรรใหม่ (ช่องที่กำลังพิมพ์ไม่แตะ)
  SD.groups.forEach((g,gi)=>{g.lines.forEach((l,li)=>{if(!l.link)return;const id=gi+'_'+li,want=g.manual?l.ordered:l.sent;   // ช่องของบรรทัดเรียกเพิ่ม = จำนวนที่ขอ (ร่าง) ไม่ใช่ที่ส่งได้
    const hv=document.getElementById('sdHv'+id);if(hv){hv.textContent=fmtQ(l.have);hv.className=l.have>=l.remaining?'green':'red';}
    const inp=document.getElementById('sdS'+id);if(inp&&document.activeElement!==inp&&num(inp.value)!==num(want))inp.value=want;
    const sh=document.getElementById('sdSh'+id);if(sh)sh.innerHTML=sdShortHtml(l);});
    const tt=document.getElementById('sdTot'+gi);if(tt)tt.textContent=money(sdGroupTotal(g));});}
function sdMake(){if(typeof mkSetPill==='function')mkSetPill('urgent');show('make');}

/* ---------- ผูกชื่อสินค้าสาขา ↔ เมนู (kc_links) ---------- */
function sdLinkPick(gi,li){
  const g=SD.groups[gi],l=g&&g.lines[li];if(!l)return;const rows=activeRecipes();
  const list=q=>{q=supKey(q);return rows.filter(r=>!q||supKey(r.name).includes(q)||supKey(dispName(r)).includes(q)||supKey(r.stock_name).includes(q))
    .map(r=>'<div class="rowline tap" data-id="'+esc(r.id)+'" onclick="sdLinkGo(this.dataset.id)">'+thumbHtml(r,'🍳')+'<div class="grow"><b>'+esc(dispName(r))+'</b><div class="xs mut">'+esc(trCat(r.cat))+' · '+esc(t('stock'))+' '+fmtQ(r.qty)+' '+esc(trUnit(r.yield_unit))+'</div></div></div>').join('')||'<div class="empty">'+esc(t('empty'))+'</div>';};
  SD_PICK={name:l.name,unit:l.unit};
  openModal('<h3>🔗 '+esc(t('sd_link_t'))+'</h3><div class="hintbox">'+esc(t('sd_unlinked_h',{n:l.name}))+'</div>'+
    fld(t('sd_link_factor',{u:trUnit(l.unit)}),'<input id="sdLkF" inputmode="decimal" value="1">')+searchBox('sdLkQ',v=>{const b=document.getElementById('sdLkList');if(b)b.innerHTML=list(v);})+
    '<div class="sd-pick" id="sdLkList">'+list('')+'</div><div class="row" style="margin-top:10px"><button type="button" class="btn gh" style="margin-left:auto" onclick="closeModal()">'+esc(t('cancel'))+'</button></div>');
  setTimeout(()=>{const q=document.getElementById('sdLkQ');if(q&&!('ontouchstart' in window))q.focus();},50);}
async function sdLinkGo(rid){await once(async()=>{
  const p=SD_PICK,r=recipeById(rid);if(!p||!r)return;
  const f=num((document.getElementById('sdLkF')||{}).value||1);if(!(f>0)){toast(t('sd_link_bad'),true);return;}
  const row={stk_name:p.name,recipe_id:r.id,factor:rnd4(f),by_name:S.user&&S.user.name};
  try{await db(()=>sb.from('kc_links').upsert(row,{onConflict:'stk_name'}));}catch(e){return;}
  TD_LINKS=(TD_LINKS||[]).filter(x=>supKey(x.stk_name)!==supKey(p.name)).concat([row]);SD_PICK=null;
  closeModal();toast(t('sd_link_saved'));sdCalc();if(S.tab==='send')sdPaint();});}

/* ---------- ออกบิล ---------- */
async function sdBillNo(code,d){ // <prefix><สาขา>-<ปปดดวว>-<ลำดับของวันนั้น> · อ่านเลขไม่ได้ = ไม่ออกบิล (กันเลขซ้ำ)
  const pre=String((S.cfg||CFG_DEF).bill_prefix||''),stamp=d.slice(2,4)+d.slice(5,7)+d.slice(8,10);
  const r=await sb.from('kc_deliveries').select('bill_no').eq('branch',code).eq('d',d);if(!r||r.error)throw (r&&r.error)||new Error('bill_no');
  let n=0;(r.data||[]).forEach(x=>{const m=/-(\d+)$/.exec(String(x.bill_no||''));if(m)n=Math.max(n,parseInt(m[1],10));});
  return pre+code+'-'+stamp+'-'+(n+1);}
function sdBillText(h,lines){ // ข้อความไลน์ (ไทยเสมอ) — หัวร้าน · สาขา · วันที่ · รายการ "ชื่อ จำนวน หน่วย × ราคา = เป็นเงิน" · รวม · เลขบิล · ค้างส่ง
  const L=lines.filter(l=>num(l.sent)>0);
  const rows=L.map(l=>String(l.name||'')+' '+fmtQ(l.sent)+' '+String(l.unit||'')+' × '+moneyU(l.unit_price)+' = '+money(l.amount));
  const back=lines.filter(l=>num(l.ordered)-num(l.sent)>1e-9).map(l=>String(l.name||'')+' '+fmtQ(rnd4(num(l.ordered)-num(l.sent)))+' '+String(l.unit||''));
  return ['🧾 '+SD_SHOP,'บิลส่งของ '+(h.bill_no||''),'สาขา: '+(h.branch_name||branchName(h.branch)||h.branch||''),
    'วันที่: '+thDate(h.d)+(h.order_date&&String(h.order_date).slice(0,10)!==String(h.d).slice(0,10)?' (สั่ง '+thDate(h.order_date)+')':'')]
    .concat(sdIsManual(h)?['✋ '+SD_MANUAL_NOTE]:[]).concat(['──────────'])   // บิล ➕ ส่งเพิ่ม บอกในไลน์ว่าไม่ใช่ของที่สั่งผ่านแอพนับ
    .concat(rows,['──────────','รวม '+L.length+' รายการ = '+money(h.total)]).concat(back.length?['ค้างส่ง: '+back.join(', ')]:[]).concat(h.by_name?['ส่งโดย '+h.by_name]:[]).join('\n');}
async function sdLineGo(h,lines){ // → {state:'sent'|'fail'|'none',text,gid,err,saveFail} · ส่งได้ = จด line_sent_at (พลาดลองอีกครั้ง · ยังไม่ได้ = จำไว้ในเครื่อง + บอกตรง ๆ)
  const text=sdBillText(h,lines),gid=((S.cfg||CFG_DEF).branch_line||{})[h.branch]||null;
  if(!gid)return {state:'none',text};
  try{await lineSend(gid,text);}catch(e){return {state:'fail',text,gid,err:(e&&e.message)||String(e)};}
  const at=new Date().toISOString();let saved=false;
  for(let i=0;i<2&&!saved;i++){try{const r=await sb.from('kc_deliveries').update({line_sent_at:at,line_group_id:gid}).eq('id',h.id);saved=!!(r&&!r.error);}catch(e){saved=false;}}
  if(saved){h.line_sent_at=at;h.line_group_id=gid;}else sdLineOkMark(h.id,at);
  return {state:'sent',text,gid,saveFail:!saved};}
async function sdRollback(id,step){ // บันทึกไม่ครบ = ถอนทุกอย่างที่เขียนไปแล้ว (best effort · ไม่ throw)
  if(step==='moves')await pushMovesUndo('kc_deliveries',id);
  if(step!=='head'){try{await sb.from('kc_delivery_lines').delete().eq('delivery_id',id);}catch(e){}}
  try{await sb.from('kc_deliveries').delete().eq('id',id);}catch(e){}}
async function sdStockOk(L,rids){ // ยอดสดของเมนูที่จะส่ง: อ่านไม่ได้ = ไม่ออกบิล (ห้ามเช็คกับแคช) · ไม่พอ = บอกแล้วจัดสรรใหม่บนจอ
  if(!(await refreshRows('recipe',rids))){toast(t('sd_live_fail'),true);return false;}
  const need={};L.forEach(l=>{need[l.link.recipe_id]=rnd4(num(need[l.link.recipe_id])+num(l.sent)*sdFactor(l));});
  for(const rid of rids){const r=recipeById(rid),have=Math.max(0,num(r&&r.qty));
    if(need[rid]>have+1e-9){toast(t('sd_stock_short',{n:dispName(r),h:fmtQ(have),u:trUnit(r&&r.yield_unit),s:fmtQ(need[rid])}),true);sdCalc();sdRefresh();return false;}}
  return true;}
function sdRowsOf(g,id){ // บรรทัดบิล = ทุกบรรทัดของใบสั่ง — ส่ง 0 = ค้างส่ง (บิลบอกครบว่าสั่งอะไร ส่งอะไร) · ชื่อ = ชื่อสินค้าที่สาขาสั่ง (recipe_id = เมนูของครัว) · ยังไม่ผูก/ไม่มีราคา = ส่ง 0 ไม่มีราคา
  const rows=g.lines.map((l,i)=>{
    if(!l.link||sdPriceOf(l)==null)return {delivery_id:id,recipe_id:l.link?l.link.recipe_id:null,name:l.name,stk_product_id:l.pid||null,ordered:l.remaining,sent:0,unit:l.unit||'',unit_cost:null,unit_price:null,amount:0,sort:i+1};
    const r=recipeById(l.link.recipe_id),up=num(sdPriceOf(l)),uc=num(sdCostOf(l));
    return {delivery_id:id,recipe_id:r.id,name:l.name||r.name,stk_product_id:l.pid||null,ordered:l.remaining,sent:num(l.sent),unit:l.unit||r.yield_unit||'',unit_cost:uc,unit_price:up,amount:rnd2(num(l.sent)*up),sort:i+1};});
  return {rows,subtotal:rnd2(rows.reduce((a,r)=>a+r.amount,0))};}
const sdSig=g=>g?g.lines.map(l=>[l.pid,supKey(l.name),rnd4(l.remaining)].join('|')).sort().join(';'):'';   // ลายเซ็นใบสั่ง: สินค้า + ที่ยังค้างส่ง (เทียบก่อน/หลังหน้าต่างยืนยัน)
async function sdInsertHead(head,g,d){ // เลขบิลชน (23505 — อีกเครื่องออกบิลสาขาเดียวกันพร้อมกัน · unique index ใน SQL) = อ่านเลขใหม่แล้วลองอีก ≤3 ครั้ง
  let err=null;
  for(let i=0;i<3;i++){let r=null;try{r=await sb.from('kc_deliveries').insert(head);}catch(e){r={error:e};}
    if(r&&!r.error)return;err=(r&&r.error)||new Error('insert');
    if(String(err.code||'')!=='23505')break;head.bill_no=await sdBillNo(g.code,d);}
  throw err;}
async function sdSend(gi){await once(async()=>{
  if(!SD.ok){toast(t('sd_noread'),true);return;}   // อ่านของที่ส่งไปแล้วไม่ครบ = ไม่ออกบิล (กันบิลซ้ำ/ตัดสต๊อกซ้ำ)
  const g=SD.groups[gi];if(!g||!canKitchen())return;
  if(!S.kcSql){toast(t('sd_sql_block'),true);return;}
  const bad=g.lines.find(l=>l.link&&num(l.sent)>0&&sdPriceOf(l)==null);if(bad){toast(t('sd_no_price',{n:bad.name}),true);sdCalc();sdRefresh();return;}
  const L=g.lines.filter(l=>l.link&&num(l.sent)>0);if(!L.length){toast(t(g.manual?'sd_m_nothing':'sd_nothing'),true);return;}
  const d=bizTodayISO(),rids=[...new Set(L.map(l=>l.link.recipe_id))];
  if(!(await sdStockOk(L,rids)))return;   // ยอดสด — อีกเครื่องอาจเพิ่งส่ง/ทำของ (อ่านไม่ได้ = ไม่ออกบิล)
  let no;try{no=await sdBillNo(g.code,d);}catch(e){toast(t('sd_not_saved')+' · '+((e&&e.message)||e),true);return;}
  const id=uid('dl'),by=S.user&&S.user.name;
  let {rows,subtotal}=sdRowsOf(g,id);
  if(!(await confirm2(t('sd_confirm',{b:g.short||g.name,n:L.length,m:money(subtotal),no}))))return;
  // หลังกดยืนยัน — ระหว่างหน้าต่างเปิด อีกเครื่องอาจส่ง/ทำของ/ออกบิล หรือสาขาแก้ยอด: อ่านซ้ำทั้งยอดสด + ใบสั่ง/ที่ส่งแล้ว + ราคา ไม่ตรงกับที่ยืนยัน = ไม่ออกบิล
  if(!(await sdStockOk(L,rids)))return;
  const R=await sdRead();if(!R.ok){toast(t('sd_noread'),true);return;}
  const g2=g.manual?sdManualGroups().find(x=>x.key===g.key):sdCalcGroups(R.raw,S.branches).groups.find(x=>x.key===g.key),again=sdRowsOf(g,id);   // เรียกเพิ่ม: เทียบกับร่างปัจจุบัน (อีกแท็บอาจแก้ร่าง) ไม่ใช่ออเดอร์
  if(sdSig(g2)!==sdSig(g)||again.subtotal!==subtotal||again.rows.some((r,i)=>r.amount!==rows[i].amount||r.sent!==rows[i].sent)){
    SD.raw=R.raw;SD.at=Date.now();sdCalc();if(S.tab==='send')sdPaint();toast(t('sd_changed'),true);return;}
  rows=again.rows;
  try{no=await sdBillNo(g.code,d);}catch(e){toast(t('sd_not_saved')+' · '+((e&&e.message)||e),true);return;}   // เลขบิลอ่านใหม่หลังหน้าต่าง (อีกเครื่องอาจออกบิลไปแล้ว)
  const head={id,bill_no:no,d,branch:g.code,branch_name:g.name,order_date:g.od,status:'sent',subtotal,overhead:0,total:subtotal,line_sent_at:null,line_group_id:null,paid_at:null,note:g.manual?SD_MANUAL_NOTE:null,by_name:by};
  const mv={};L.forEach(l=>{const rid=l.link.recipe_id,q=num(l.sent)*sdFactor(l);const m=mv[rid]=mv[rid]||{q:0,c:0};m.q+=q;m.c+=q*num(recipeUnitCost(recipeById(rid)));});
  let step='head';
  try{
    setBusy(true);try{await sdInsertHead(head,g,d);}finally{setBusy(false);}
    no=head.bill_no;
    step='lines';await db(()=>sb.from('kc_delivery_lines').insert(rows));
    step='moves';await pushMoves(Object.keys(mv).map(rid=>({d,kind:'send',ref_kind:'recipe',ref_id:rid,qty:-rnd4(mv[rid].q),cost:-rnd4(mv[rid].c),ref_table:'kc_deliveries',ref_id2:id,note:no+' · '+g.name})));
  }catch(e){await sdRollback(id,step);toast(t('sd_not_saved')+' · '+((e&&e.message)||e),true);return;}
  let left=0;
  if(g.manual)left=sdManualAfterBill(g);else Object.keys(SD_EDIT).forEach(k=>{if(k.indexOf(g.key+'|')===0)delete SD_EDIT[k];});   // เรียกเพิ่ม: ออกบิลแล้ว = เหลือในร่างเฉพาะส่วนที่ยังส่งไม่ครบ (บิลไลน์บอก "ค้างส่ง" ตรงกับการ์ด ✋)
  if(typeof MK_ORD!=='undefined')MK_ORD.at=0;   // 🍳 ทำของ คิดออเดอร์ใหม่รอบหน้า (ไม่ใช้ที่จำไว้ 60 วิ)
  const res=await sdLineGo(head,rows);
  if(res.saveFail)toast(t('sd_line_nosave'),'warn');else toast(t('sd_saved',{no}));
  await sdLoad();if(S.tab==='send')sdPaint();
  sdDone(head,res,left);});}
function sdManualAfterBill(g){ // ร่างเรียกเพิ่มหลังออกบิล: ส่งครบ = เอาออก · ส่งไม่ครบ (ของไม่พอ/ไม่มีราคา) = เหลือ ขอ − ส่ง ไว้ให้ส่งต่อ (ผู้ตรวจ V2: เดิมลบทั้งสาขาแล้วไม่มีที่ไหนจำว่ายังค้าง) → จำนวนบรรทัดที่ยังค้าง
  let left=0;g.lines.forEach(l=>{const rid=l.link&&l.link.recipe_id;if(!rid)return;const rem=rnd4(num(l.ordered)-num(l.sent));if(rem>1e-9)left++;sdManualSet(g.code,rid,rem>1e-9?rem:0);});return left;}
function sdDone(h,res,left){ // หน้าต่างผล: เลขบิล + สถานะไลน์ (ไม่มีกลุ่ม/ส่งไม่ได้ = กล่องคัดลอก) · left = บรรทัดเรียกเพิ่มที่ยังค้างในการ์ด ✋
  let x='<h3>🧾 '+esc(t('sd_done_t'))+'</h3><div class="okbox">'+esc(t('sd_saved',{no:h.bill_no}))+'<br>'+esc(h.branch_name||'')+' · <b>'+esc(money(h.total))+'</b></div>';
  if(left>0)x+='<div class="hintbox" id="sdLeftNote">✋ '+esc(t('sd_m_left',{n:left}))+'</div>';
  if(res.state==='sent')x+='<div class="okbox">💬 '+esc(t('sd_line_sent',{g:lgName(res.gid)}))+'</div>'+(res.saveFail?'<div class="badbox">⚠ '+esc(t('sd_line_nosave'))+'</div>':'');
  else x+='<div class="'+(res.state==='fail'?'badbox':'hintbox')+'">'+esc(res.state==='fail'?t('sd_line_fail')+(res.err?' ('+res.err+')':''):t('sd_line_none'))+'</div>'+lineTextBox(res.text,res.gid);
  x+='<div class="row" style="margin-top:12px"><button type="button" class="btn gh" data-id="'+esc(h.id)+'" onclick="closeModal();if(typeof blDetail===\'function\')blDetail(this.dataset.id)">'+esc(t('sd_view_bill'))+'</button>'+
    '<button type="button" class="btn" style="margin-left:auto" onclick="closeModal()">'+esc(t('close'))+'</button></div>';
  openModal(x);}

/* ---------- ➕ ส่งเพิ่ม — สาขาเรียกของเพิ่ม (ร่างในเครื่อง · ออกบิลทาง sdSend เดิม) ---------- */
function sdManualLoad(){ // → {<สาขา>:[{recipe_id,qty}]} ของวันนี้ (วันอื่น/ค่าเสีย = ทิ้ง · ร่างของวันก่อนที่ยังมีรายการ = บอกครั้งเดียวว่าทิ้งแล้ว ไม่หายเงียบ ๆ — ผู้ตรวจ V2)
  const d=LS.get(SD_MANUAL,null);if(!d||d.d!==bizTodayISO()||!d.g||typeof d.g!=='object'||Array.isArray(d.g)){
    if(d){LS.del(SD_MANUAL);if(/^\d{4}-\d{2}-\d{2}$/.test(String(d.d||''))&&d.g&&typeof d.g==='object'&&!Array.isArray(d.g)&&Object.keys(d.g).length)toast(t('sd_m_dropped',{d:dispDate(d.d)}),'warn');}return {};}
  const g={};Object.keys(d.g).forEach(c=>{const rows=(Array.isArray(d.g[c])?d.g[c]:[]).filter(x=>x&&typeof x==='object'&&x.recipe_id);if(rows.length)g[c]=rows.map(x=>({recipe_id:String(x.recipe_id),qty:rnd4(num(x.qty))}));});
  return g;}
function sdManualSave(g){if(!g||!Object.keys(g).length)LS.del(SD_MANUAL);else LS.set(SD_MANUAL,{d:bizTodayISO(),g});}
function sdManualRows(code){return sdManualLoad()[code]||[];}
function sdManualSet(code,rid,qty){ // qty>0 = ใส่/แก้ (คงลำดับเดิม) · ≤0 = เอาออก
  const g=sdManualLoad(),rows=g[code]||[],i=rows.findIndex(x=>x.recipe_id===rid);
  if(qty>0){if(i>=0)rows[i].qty=qty;else rows.push({recipe_id:rid,qty});}else if(i>=0)rows.splice(i,1);
  if(rows.length)g[code]=rows;else delete g[code];sdManualSave(g);}
function sdManualDel(code){const g=sdManualLoad();delete g[code];sdManualSave(g);}
function sdManualGroups(){ // ร่าง → กลุ่มรูปแบบเดียวกับ sdCalcGroups (เฉพาะสาขาที่เห็น · เมนูที่หาย/ไม่ใช้แล้ว ข้าม) — ☀️ วันนี้/🍳 ทำของ ไม่เรียกตัวนี้ (ร่างอยู่แค่เครื่องนี้)
  const m=sdManualLoad(),td=bizTodayISO(),out=[];
  (S.branches||[]).forEach(b=>{const rows=m[b.code];if(!rows||!rows.length)return;const lines=[];
    rows.forEach(x=>{const r=recipeById(x.recipe_id),q=rnd4(num(x.qty));if(!r||r.active===false||!(q>0))return;
      lines.push({rid:'manual|'+b.code+'|'+r.id,pid:'',cat:'',name:String(r.name||''),unit:String(r.yield_unit||''),ordered:q,already:0,remaining:q,link:{recipe_id:r.id,factor:1},have:0,sent:0});});
    if(!lines.length)return;
    out.push({key:'manual|'+b.code+'|'+td,code:b.code,name:b.name,short:b.short||b.name,color:b.color||'',od:td,lines,unlinked:0,manual:true});});
  return out;}
function sdThumb(o){const url=o&&imgOk(o.image_url)?String(o.image_url):'';return '<div class="ithumb">'+(url?'<img src="'+esc(url)+'" loading="lazy" data-ic="🍳" onerror="this.parentNode.textContent=this.dataset.ic">':'🍳')+'</div>';}   // รูปเสีย = กลับเป็นอิโมจิ (ผู้ตรวจ V1)   // รูปในช่อง — ไม่ใส่ซูม (แตะรูป = เลือกเมนู)
function sdManualLineHtml(gi,l,li,last){ // บรรทัดเรียกเพิ่ม: ชื่อเมนู + ✕ · มี X · ราคา · ช่อง "ขอเพิ่ม" = แก้ร่างในที่ · ขาด/⚡ เหมือนบรรทัดปกติ
  const id=gi+'_'+li,u=trUnit(l.unit),r=recipeById(l.link.recipe_id),p=sdPriceOf(l);
  let h='<div class="sdl'+(last?' last':'')+'" id="sdL'+id+'"><div class="sdl-top sdm"><b class="sdl-name">'+esc(r?dispName(r):l.name)+'</b>'+
    '<button type="button" class="sdl-x" aria-label="x" onclick="sdManualLineDel('+gi+','+li+')">✕</button></div>';
  h+='<div class="sdl-stats"><span>'+esc(t('sd_have'))+' <b id="sdHv'+id+'" class="'+(l.have>=l.remaining?'green':'red')+'">'+fmtQ(l.have)+'</b> '+esc(u)+'</span>'+(p==null?'<span class="chip warn">'+esc(t('no_price'))+'</span>':'<span>'+esc(moneyU(p))+'/'+esc(u)+'</span>')+'</div>';
  h+=(l.noPrice?'<div class="sdl-send"><span class="chip bad">⛔ '+esc(t('sd_no_price_h'))+'</span><button type="button" class="btn gh sm2" onclick="show(\'menus\')">📖 '+esc(t('nav_menus'))+'</button></div>':
    '<div class="sdl-send"><span class="sdl-lb">'+esc(t('sd_m_asked'))+'</span>'+stepper('sdS'+id,l.ordered,{step:1,min:1,unit:l.unit,on:(v)=>sdManualQtyIn(gi,li,v)})+'</div>')+
    '<div class="sdl-short" id="sdSh'+id+'">'+sdShortHtml(l)+'</div>';
  return h+'</div>';}
function sdManualQtyIn(gi,li,v){ // แก้จำนวนที่ขอในที่ (ไม่วาดใหม่ — คีย์บอร์ดไม่หุบ) · ว่าง/0 ระหว่างพิมพ์ = ยังไม่บันทึก
  const g=SD.groups[gi],l=g&&g.manual&&g.lines[li];if(!l)return;const q=rnd4(numIn(v));if(!(q>0))return;
  sdManualSet(g.code,l.link.recipe_id,q);sdCalc();sdRefresh();}
function sdManualLineDel(gi,li){const g=SD.groups[gi],l=g&&g.manual&&g.lines[li];if(!l)return;sdManualSet(g.code,l.link.recipe_id,0);sdCalc();if(S.tab==='send')sdPaint();}
async function sdManualDrop(gi){const g=SD.groups[gi];if(!g||!g.manual)return;
  if(!(await confirm2(t('sd_m_drop_q',{b:g.short||g.name,n:g.lines.length}),{danger:true})))return;
  sdManualDel(g.code);sdCalc();if(S.tab==='send')sdPaint();}
async function sdManualOpen(){ // ① เลือกสาขา (สาขาเดียว = ข้ามไป ②) · ต้องอ่านออเดอร์ได้ก่อน (ของเพิ่มจัดสรรหลังใบสั่งปกติ)
  if(!canKitchen())return;if(!S.kcSql){toast(t('sd_sql_block'),true);return;}
  if(!SD.at){try{await sdLoad();}catch(e){}}
  if(!SD.ok||!SD.raw){toast(t('sd_noread'),true);return;}
  const B=S.branches||[];if(!B.length){toast(t('sd_m_none_br'),true);return;}
  MODAL_BACK=null;
  if(B.length===1){sdManualBr(B[0].code);return;}
  SD_M={code:null,q:''};
  openModal('<h3>'+esc(t('sd_m_title'))+'</h3><div class="hintbox">'+esc(t('sd_m_pick_br'))+'</div><div class="sd-mbrs">'+
    B.map(b=>'<button type="button" class="btn gh big sd-mbr" data-code="'+esc(b.code)+'" style="border-color:'+esc(sdBrColor(b.code,b.color))+'" onclick="sdManualBr(this.dataset.code)"><span class="sd-dot" style="background:'+esc(sdBrColor(b.code,b.color))+'"></span>'+esc(b.name)+'</button>').join('')+'</div>'+
    '<div class="row"><button type="button" class="btn gh" style="margin-left:auto" onclick="sdManualFinish()">'+esc(t('cancel'))+'</button></div>');}
function sdManualBr(code){const b=(S.branches||[]).find(x=>x.code===code);if(!b||!inBr(code))return;SD_M={code,q:''};sdManualPick();}
function sdManualPick(){ // ② ตารางรูปเมนู (ค้นหากรองในที่ · แตะ = ใส่จำนวน · ✓ บนช่องที่เลือกแล้ว) · ปิดหน้าต่าง = วาดการ์ดใหม่ (MODAL_BACK)
  const m=SD_M;if(!m||!m.code)return;const b=(S.branches||[]).find(x=>x.code===m.code);if(!b)return;const n=sdManualRows(m.code).length;
  MODAL_BACK=()=>sdManualFinish();
  openModal('<h3>'+esc(t('sd_m_title'))+'</h3><div class="sd-mhead"><span class="sd-dot" style="background:'+esc(sdBrColor(b.code,b.color))+'"></span><b>'+esc(b.name)+'</b>'+
      ((S.branches||[]).length>1?'<button type="button" class="btn gh sm2" onclick="sdManualOpen()">'+esc(t('sd_m_change_br'))+'</button>':'')+'</div>'+
    '<div class="hintbox">'+esc(t('sd_m_pick_menu'))+'</div>'+searchBox('sdMQ',v=>{if(SD_M)SD_M.q=String(v||'');const g=document.getElementById('sdMGrid');if(g)g.innerHTML=sdManualGridHtml();})+
    '<div class="igrid sd-mgrid" id="sdMGrid">'+sdManualGridHtml()+'</div>'+
    '<div class="row"><button type="button" class="btn big" id="sdMDone" onclick="sdManualFinish()">'+esc(t('sd_m_done',{n}))+'</button></div><div class="xs mut" style="margin-top:6px">'+esc(t('sd_m_draft'))+'</div>');
  const q=document.getElementById('sdMQ');if(q&&m.q)q.value=m.q;}
function sdManualGridHtml(){const m=SD_M;if(!m||!m.code)return '';const q=supKey(m.q),sel={};sdManualRows(m.code).forEach(x=>{sel[x.recipe_id]=x.qty;});
  const all=activeRecipes();let L=all.filter(r=>!q||supKey(r.name).includes(q)||supKey(dispName(r)).includes(q)||supKey(r.stock_name).includes(q)||supKey(r.cat).includes(q));
  L=L.slice().sort((a,b)=>dispName(a).localeCompare(dispName(b),'th'));
  if(!L.length)return '<div class="empty" style="grid-column:1/-1">'+esc(all.length?t('empty'):t('sd_m_no_menu'))+'</div>';
  return L.map(r=>{const p=sdPriceOf({link:{recipe_id:r.id,factor:1}}),on=sel[r.id]!=null,u=trUnit(r.yield_unit);
    return '<div class="icard sd-mtile tap'+(on?' on':'')+(p==null?' nop':'')+'" data-id="'+esc(r.id)+'" onclick="sdManualTap(this.dataset.id)">'+sdThumb(r)+
      (on?'<span class="sd-mbadge">✓ '+fmtQ(sel[r.id])+' '+esc(u)+'</span>':'')+'<div class="iname">'+esc(dispName(r))+'</div>'+
      '<div class="isub">'+esc(t('sd_have'))+' '+fmtQ(r.qty)+' '+esc(u)+' · '+(p==null?'⛔ '+esc(t('no_price')):esc(moneyU(p))+'/'+esc(u))+'</div></div>';}).join('');}
function sdManualTap(rid){ // แตะรูป → หน้าต่างใส่จำนวน (หน่วย yield_unit ตั้งต้น 1 · มีอยู่แล้ว = จำนวนเดิม + ปุ่มเอาออก) · ปิด = กลับตารางรูป
  const m=SD_M,r=recipeById(rid);if(!m||!m.code||!r)return;const cur=(sdManualRows(m.code).find(x=>x.recipe_id===rid)||{}).qty,p=sdPriceOf({link:{recipe_id:rid,factor:1}}),u=trUnit(r.yield_unit);
  MODAL_BACK=()=>sdManualPick();
  openModal('<div class="row" style="flex-wrap:nowrap;align-items:center">'+thumbHtml(r,'🍳')+'<div class="grow" style="min-width:0"><h3 style="margin:0 0 2px">'+esc(dispName(r))+'</h3><div class="xs mut">'+esc(t('sd_have'))+' '+fmtQ(r.qty)+' '+esc(u)+' · '+(p==null?'⛔ '+esc(t('no_price')):esc(moneyU(p))+'/'+esc(u))+'</div></div></div>'+
    (p==null?'<div class="badbox">⛔ '+esc(t('sd_no_price_h'))+'</div>':'')+
    '<div class="sd-mqty">'+fld(t('sd_m_qty'),stepper('sdMQty',cur!=null?cur:1,{step:1,min:1,unit:r.yield_unit}))+'</div>'+
    '<div class="row" style="margin-top:12px">'+(cur!=null?'<button type="button" class="btn gh" style="color:var(--bad)" data-id="'+esc(rid)+'" onclick="sdManualQtyOk(this.dataset.id,0)">🗑 '+esc(t('sd_m_remove'))+'</button>':'')+
      '<button type="button" class="btn gh" onclick="sdManualPick()">'+esc(t('cancel'))+'</button><button type="button" class="btn" style="flex:1" data-id="'+esc(rid)+'" onclick="sdManualQtyOk(this.dataset.id)">'+esc(t('sd_m_ok'))+'</button></div>');
  setTimeout(()=>{const i=document.getElementById('sdMQty');if(i&&!('ontouchstart' in window)){i.focus();try{i.select();}catch(e){}}},50);}
function sdManualQtyOk(rid,zero){ // ✓ = เก็บลงร่าง (จำนวน > 0) · zero=0 = เอาออก → กลับตารางรูป + การ์ดด้านหลังวาดใหม่
  const m=SD_M;if(!m||!m.code||!recipeById(rid))return;const inp=document.getElementById('sdMQty'),q=zero===0?0:rnd4(numIn(inp?inp.value:''));
  if(zero!==0&&!(q>0)){toast(t('sd_m_bad_qty'),true);return;}
  sdManualSet(m.code,rid,q);sdCalc();if(S.tab==='send')sdPaint();MODAL_BACK=null;sdManualPick();}
function sdManualFinish(){ // ปิดหน้าต่าง ➕ (ปุ่ม ✓ เสร็จ / ยกเลิก / แตะนอกหน้าต่าง) → การ์ดเรียกเพิ่มขึ้นในหน้า + เลื่อนไปที่การ์ด
  const m=SD_M;MODAL_BACK=null;SD_M=null;closeModal();sdCalc();if(S.tab!=='send')return;sdPaint();
  if(m&&m.code){const key='manual|'+m.code+'|'+bizTodayISO();const el=[...document.querySelectorAll('#sdBody .sd-card.sd-manual')].find(x=>x.dataset.key===key);
    if(el&&el.scrollIntoView)try{el.scrollIntoView({block:'start',behavior:'smooth'});}catch(e){}}}
