/* ============================================================
   🛒 สั่งของ — buy (po*)
   คำแนะนำแยกตามร้านค้า (ck_sups จับคู่ด้วยชื่อร้านของวัตถุดิบ it.sup):
     Max (max_qty · 2026-10-19): ถึงจุดสั่งแล้ว → ต้องมี = Max (ปัดขึ้นเป็นบรรจุเต็ม) · ไม่ตั้งขั้นต่ำ = ต่ำกว่า Max ก็สั่ง
     ต้องมี = มากกว่าระหว่าง "ขั้นต่ำ" (min_qty) กับ "ที่ต้องใช้ทำของ" (สูตร × รอบที่ 🍳 แนะนำ — ⚡ ด่วนจากออเดอร์สาขา / 🔄 เติมให้ถึงที่ควรมี · ใช้ mkLoad/mkNeeds ของโมดูลทำของ ไม่คิดซ้ำ)
     ต้องสั่ง = ต้องมี − ที่มีในสต๊อก − ที่สั่งไว้แล้วกำลังมา (kc_pos status sent)  → ปัดขึ้นเป็นจำนวนบรรจุ (หน่วยซื้อ buy_unit/buy_qty หรือบรรจุแรกใน packs)
     แก้ตัวเลขในที่ได้ (0 = ไม่สั่ง · จำไว้ต่อวันใน localStorage jjck_po_ovr) · ＋ เพิ่มรายการของร้านเอง · ร้านอื่นที่ไม่มีคำแนะนำกดเพิ่มได้
   ส่ง = ข้อความใบสั่ง (ไทยเสมอ — ร้านอ่าน) → มีกลุ่มไลน์: บันทึก kc_pos (draft) + kc_po_lines → lineSend → status sent + line_sent_at
     · ส่งไม่สำเร็จ = ใบยังเป็น draft + กล่องคัดลอก (✅ ส่งเองแล้ว / 🗑 ยกเลิกใบนี้) · ไม่มีกลุ่ม = กล่องคัดลอก/เปิดไลน์ แล้วถาม "ส่งแล้วใช่ไหม?" → บันทึกเป็น sent
   รายการใบที่สั่งไปแล้ว (30 วัน) → รายละเอียด: 📥 รับของตามใบนี้ (rcFromPo ของโมดูลรับของ) · ส่งไลน์อีกครั้ง · คัดลอก · ยกเลิก
   สิทธิ์: canKitchen (ทุกคนที่ทำงานครัว)
   ใบที่สั่งไปแล้ว/บรรทัดอ่านไม่ครบ (PO_LIST_OK=false) = ไม่แสดงคำแนะนำ แถบเตือน + ⟳ เท่านั้น (คิดจากข้อมูลครึ่ง ๆ = ของที่กำลังมาถูกสั่งซ้ำ) · เลขใบชน 23505 = อ่านรายการใหม่แล้วออกเลขถัดไป
   ============================================================ */
I18N.add({
th:{po_hint:'ระบบแนะนำจาก: วัตถุดิบที่ต่ำกว่าขั้นต่ำ + ของที่ต้องใช้ทำของ (⚡ ด่วน / 🔄 เติม) − ที่มี − ที่สั่งไว้แล้ว · แก้ตัวเลขได้เลย · 0 = ไม่สั่ง',
  po_none:'ตอนนี้ไม่มีอะไรต้องสั่ง 👍',po_nosup:'ยังไม่มีร้าน',po_nosup_h:'วัตถุดิบพวกนี้ยังไม่ได้ตั้งร้านค้า — ตั้งได้ที่ 🥬 วัตถุดิบ',po_group_no:'ยังไม่มีกลุ่มไลน์',po_group_empty:'ยังไม่มีรายการ — กด ＋ เพิ่มรายการ',
  po_why_max:'เติมให้ถึง Max {m}',po_why_min:'ต่ำกว่าขั้นต่ำ (มี {s} · ขั้นต่ำ {m})',po_why_prod:'ใช้ทำของ {q} {u}',po_lots:'รอบ',po_have:'มี {q}',po_incoming:'สั่งไว้แล้ว {q} กำลังมา',po_need:'ต้องสั่ง {q} {u}',
  po_est_none:'ไม่มีราคา',po_est_col:'ประมาณ',po_lines_n:'{n} รายการ',po_total_est:'รวม {n} รายการ · ประมาณ {m}',po_pack_eq:'1 {u} = {q} {b}',po_skip:'ไม่สั่ง',
  po_send:'📤 ส่งไลน์',po_send_copy:'📋 คัดลอก/ส่งเอง',po_add_item:'＋ เพิ่มรายการ',po_other_sups:'สั่งร้านอื่น:',po_reset:'↺ ค่าแนะนำ',
  po_pick_t:'เลือกวัตถุดิบของ {s}',po_pick_none:'ร้านนี้ยังไม่มีวัตถุดิบ — ตั้งร้านค้าให้วัตถุดิบที่ 🥬 วัตถุดิบ',po_pick_all_in:'วัตถุดิบของร้านนี้อยู่ในรายการครบแล้ว',
  po_nothing:'ยังไม่มีรายการที่จะสั่ง (ทุกรายการเป็น 0)',po_send_q:'ส่งใบสั่งให้ {s} เข้ากลุ่มไลน์ "{g}" ใช่ไหม?',po_sent_ok:'ส่งใบสั่งให้ {s} แล้ว ✅',
  po_manual_t:'ส่งใบสั่งให้ {s} เอง',po_manual_h:'ร้านนี้ยังไม่มีกลุ่มไลน์ — คัดลอกข้อความไปส่งเอง แล้วกด "ส่งแล้ว" เพื่อบันทึกใบสั่ง (ตั้งกลุ่มไลน์ได้ที่ 🏷️ ร้านค้า)',
  po_manual_q:'ส่งให้ร้านแล้วใช่ไหม?',po_mark_sent:'✅ ส่งแล้ว',po_not_yet:'ยังไม่ส่ง',
  po_fail_t:'ส่งไลน์ไม่สำเร็จ',po_fail_h:'บันทึกใบสั่งไว้แล้ว แต่ส่งเข้ากลุ่มไม่ได้ — คัดลอกไปส่งเองแล้วกด "ส่งแล้ว" หรือยกเลิกใบนี้แล้วลองใหม่',po_fail_drop:'🗑 ยกเลิกใบนี้',
  po_not_saved:'บันทึกใบสั่งไม่สำเร็จ — ยังไม่ได้ส่ง ลองใหม่อีกครั้ง',po_sent_but:'ส่งไลน์แล้ว แต่บันทึกสถานะไม่สำเร็จ — ใบนี้ยังขึ้นว่า "ยังไม่ส่ง" (ไม่ต้องสั่งซ้ำ)',
  po_line_local:'ส่งไลน์ถึงร้านแล้วเมื่อ {t} แต่บันทึกสถานะไม่ได้ — กด "✅ ส่งแล้ว" เพื่อบันทึก',po_resend_q:'ใบนี้ส่งเข้ากลุ่มไลน์ของร้านไปแล้ว — ส่งอีกครั้ง ร้านจะได้ใบสั่งซ้ำ ส่งเลยไหม?',
  po_list_t:'📋 ใบที่สั่งไปแล้ว',po_list_none:'ยังไม่เคยสั่งของ',po_noread:'อ่านข้อมูลไม่ได้',
  po_st_draft:'ยังไม่ส่ง',po_st_sent:'สั่งแล้ว รอรับ',po_st_received:'รับของแล้ว',po_st_void:'ยกเลิก',
  po_detail_t:'ใบสั่งของ',po_recv_btn:'📥 รับของตามใบนี้',po_resend:'💬 ส่งไลน์อีกครั้ง',po_send_now:'📤 ส่งไลน์',po_void_btn:'🗑 ยกเลิกใบนี้',
  po_void_q:'ยกเลิกใบสั่ง {n} ของ {s}? (ร้านจะไม่รู้ — ต้องแจ้งร้านเอง)',po_voided:'ยกเลิกใบสั่งแล้ว',po_by:'โดย',po_text_t:'ข้อความที่ส่ง',
  po_order_err:'อ่านออเดอร์สาขาไม่ได้ — คำแนะนำนี้ยังไม่รวมของที่ต้องทำด่วน',po_due:'ขอรับของ',
  po_list_noread:'อ่านใบที่สั่งไปแล้วไม่ได้ — ยังไม่แสดงคำแนะนำ',po_list_noread_h:'ถ้าแสดง อาจสั่งของที่กำลังมาซ้ำอีกรอบ — กด ⟳ โหลดใหม่',po_reload:'⟳ โหลดใหม่'},
en:{po_hint:'Suggested from: ingredients below minimum + what production needs (⚡ urgent / 🔄 refill) − in stock − already ordered · edit any number · 0 = skip',
  po_none:'Nothing to order right now 👍',po_nosup:'No supplier',po_nosup_h:'These ingredients have no supplier yet — set one on 🥬 Ingredients',po_group_no:'No LINE group',po_group_empty:'No lines — tap ＋ Add item',
  po_why_max:'top up to Max {m}',po_why_min:'below minimum (have {s} · min {m})',po_why_prod:'production needs {q} {u}',po_lots:'lots',po_have:'have {q}',po_incoming:'{q} already ordered, on the way',po_need:'order {q} {u}',
  po_est_none:'no price',po_est_col:'Est.',po_lines_n:'{n} lines',po_total_est:'{n} lines · est. {m}',po_pack_eq:'1 {u} = {q} {b}',po_skip:'skip',
  po_send:'📤 Send to LINE',po_send_copy:'📋 Copy / send yourself',po_add_item:'＋ Add item',po_other_sups:'Other suppliers:',po_reset:'↺ Suggested',
  po_pick_t:'Pick an ingredient from {s}',po_pick_none:'This supplier has no ingredients yet — set the supplier on 🥬 Ingredients',po_pick_all_in:'All of this supplier\'s ingredients are already listed',
  po_nothing:'Nothing to order (every line is 0)',po_send_q:'Send the order to {s} in LINE group "{g}"?',po_sent_ok:'Order sent to {s} ✅',
  po_manual_t:'Send the order to {s} yourself',po_manual_h:'This supplier has no LINE group — copy the text and send it yourself, then tap "Sent" to record the order (set the group on 🏷️ Suppliers)',
  po_manual_q:'Did you send it to the supplier?',po_mark_sent:'✅ Sent',po_not_yet:'Not yet',
  po_fail_t:'LINE send failed',po_fail_h:'The order was saved but could not be sent to the group — copy and send it yourself then tap "Sent", or cancel this order and retry',po_fail_drop:'🗑 Cancel this order',
  po_not_saved:'Could not save the order — nothing was sent, please try again',po_sent_but:'Sent to LINE, but the status could not be saved — this order still shows "Not sent" (do not order again)',
  po_line_local:'Sent to the supplier on LINE at {t} but the status could not be saved — tap "✅ Sent" to record it',po_resend_q:'This order was already sent to the supplier LINE group — sending again gives them a duplicate. Send anyway?',
  po_list_t:'📋 Orders placed',po_list_none:'No orders yet',po_noread:'Could not read',
  po_st_draft:'Not sent',po_st_sent:'Ordered, waiting',po_st_received:'Received',po_st_void:'Cancelled',
  po_detail_t:'Order',po_recv_btn:'📥 Receive this order',po_resend:'💬 Send to LINE again',po_send_now:'📤 Send to LINE',po_void_btn:'🗑 Cancel this order',
  po_void_q:'Cancel order {n} to {s}? (the supplier is not told — tell them yourself)',po_voided:'Order cancelled',po_by:'by',po_text_t:'Message sent',
  po_order_err:'Could not read branch orders — urgent production needs are not included yet',po_due:'Deliver by',
  po_list_noread:'Could not read the orders already sent — suggestions hidden',po_list_noread_h:'Showing them could order what is already on the way a second time — tap ⟳ to reload',po_reload:'⟳ Reload'},
lo:{po_hint:'ແນະນຳຈາກ: ວັດຖຸດິບຕ່ຳກວ່າຂັ້ນຕ່ຳ + ທີ່ຕ້ອງໃຊ້ເຮັດເຄື່ອງ (⚡ ດ່ວນ / 🔄 ຕື່ມ) − ທີ່ມີ − ທີ່ສັ່ງໄວ້ແລ້ວ · ແກ້ຕົວເລກໄດ້ເລີຍ · 0 = ບໍ່ສັ່ງ',
  po_none:'ຕອນນີ້ບໍ່ມີຫຍັງຕ້ອງສັ່ງ 👍',po_nosup:'ຍັງບໍ່ມີຮ້ານ',po_nosup_h:'ວັດຖຸດິບເຫຼົ່ານີ້ຍັງບໍ່ໄດ້ຕັ້ງຮ້ານຄ້າ — ຕັ້ງໄດ້ທີ່ 🥬 ວັດຖຸດິບ',po_group_no:'ຍັງບໍ່ມີກຸ່ມໄລນ໌',po_group_empty:'ຍັງບໍ່ມີລາຍການ — ກົດ ＋ ເພີ່ມລາຍການ',
  po_why_max:'ເຕີມໃຫ້ຮອດ Max {m}',po_why_min:'ຕ່ຳກວ່າຂັ້ນຕ່ຳ (ມີ {s} · ຂັ້ນຕ່ຳ {m})',po_why_prod:'ໃຊ້ເຮັດເຄື່ອງ {q} {u}',po_lots:'ຮອບ',po_have:'ມີ {q}',po_incoming:'ສັ່ງໄວ້ແລ້ວ {q} ກຳລັງມາ',po_need:'ຕ້ອງສັ່ງ {q} {u}',
  po_est_none:'ບໍ່ມີລາຄາ',po_est_col:'ປະມານ',po_lines_n:'{n} ລາຍການ',po_total_est:'ລວມ {n} ລາຍການ · ປະມານ {m}',po_pack_eq:'1 {u} = {q} {b}',po_skip:'ບໍ່ສັ່ງ',
  po_send:'📤 ສົ່ງໄລນ໌',po_send_copy:'📋 ຄັດລອກ/ສົ່ງເອງ',po_add_item:'＋ ເພີ່ມລາຍການ',po_other_sups:'ສັ່ງຮ້ານອື່ນ:',po_reset:'↺ ຄ່າແນະນຳ',
  po_pick_t:'ເລືອກວັດຖຸດິບຂອງ {s}',po_pick_none:'ຮ້ານນີ້ຍັງບໍ່ມີວັດຖຸດິບ — ຕັ້ງຮ້ານຄ້າໃຫ້ວັດຖຸດິບທີ່ 🥬 ວັດຖຸດິບ',po_pick_all_in:'ວັດຖຸດິບຂອງຮ້ານນີ້ຢູ່ໃນລາຍການຄົບແລ້ວ',
  po_nothing:'ຍັງບໍ່ມີລາຍການທີ່ຈະສັ່ງ (ທຸກລາຍການເປັນ 0)',po_send_q:'ສົ່ງໃບສັ່ງໃຫ້ {s} ເຂົ້າກຸ່ມໄລນ໌ "{g}" ແມ່ນບໍ?',po_sent_ok:'ສົ່ງໃບສັ່ງໃຫ້ {s} ແລ້ວ ✅',
  po_manual_t:'ສົ່ງໃບສັ່ງໃຫ້ {s} ເອງ',po_manual_h:'ຮ້ານນີ້ຍັງບໍ່ມີກຸ່ມໄລນ໌ — ຄັດລອກຂໍ້ຄວາມໄປສົ່ງເອງ ແລ້ວກົດ "ສົ່ງແລ້ວ" ເພື່ອບັນທຶກໃບສັ່ງ (ຕັ້ງກຸ່ມໄລນ໌ໄດ້ທີ່ 🏷️ ຮ້ານຄ້າ)',
  po_manual_q:'ສົ່ງໃຫ້ຮ້ານແລ້ວແມ່ນບໍ?',po_mark_sent:'✅ ສົ່ງແລ້ວ',po_not_yet:'ຍັງບໍ່ສົ່ງ',
  po_fail_t:'ສົ່ງໄລນ໌ບໍ່ສຳເລັດ',po_fail_h:'ບັນທຶກໃບສັ່ງໄວ້ແລ້ວ ແຕ່ສົ່ງເຂົ້າກຸ່ມບໍ່ໄດ້ — ຄັດລອກໄປສົ່ງເອງແລ້ວກົດ "ສົ່ງແລ້ວ" ຫຼືຍົກເລີກໃບນີ້ແລ້ວລອງໃໝ່',po_fail_drop:'🗑 ຍົກເລີກໃບນີ້',
  po_not_saved:'ບັນທຶກໃບສັ່ງບໍ່ສຳເລັດ — ຍັງບໍ່ໄດ້ສົ່ງ ລອງໃໝ່ອີກຄັ້ງ',po_sent_but:'ສົ່ງໄລນ໌ແລ້ວ ແຕ່ບັນທຶກສະຖານະບໍ່ສຳເລັດ — ໃບນີ້ຍັງຂຶ້ນວ່າ "ຍັງບໍ່ສົ່ງ" (ບໍ່ຕ້ອງສັ່ງຊ້ຳ)',
  po_line_local:'ສົ່ງໄລນ໌ເຖິງຮ້ານແລ້ວເມື່ອ {t} ແຕ່ບັນທຶກສະຖານະບໍ່ໄດ້ — ກົດ "✅ ສົ່ງແລ້ວ" ເພື່ອບັນທຶກ',po_resend_q:'ໃບນີ້ສົ່ງເຂົ້າກຸ່ມໄລນ໌ຂອງຮ້ານໄປແລ້ວ — ສົ່ງອີກຄັ້ງ ຮ້ານຈະໄດ້ໃບສັ່ງຊ້ຳ ສົ່ງເລີຍບໍ?',
  po_list_t:'📋 ໃບທີ່ສັ່ງໄປແລ້ວ',po_list_none:'ຍັງບໍ່ເຄີຍສັ່ງເຄື່ອງ',po_noread:'ອ່ານຂໍ້ມູນບໍ່ໄດ້',
  po_st_draft:'ຍັງບໍ່ສົ່ງ',po_st_sent:'ສັ່ງແລ້ວ ລໍຮັບ',po_st_received:'ຮັບເຄື່ອງແລ້ວ',po_st_void:'ຍົກເລີກ',
  po_detail_t:'ໃບສັ່ງເຄື່ອງ',po_recv_btn:'📥 ຮັບເຄື່ອງຕາມໃບນີ້',po_resend:'💬 ສົ່ງໄລນ໌ອີກຄັ້ງ',po_send_now:'📤 ສົ່ງໄລນ໌',po_void_btn:'🗑 ຍົກເລີກໃບນີ້',
  po_void_q:'ຍົກເລີກໃບສັ່ງ {n} ຂອງ {s}? (ຮ້ານຈະບໍ່ຮູ້ — ຕ້ອງແຈ້ງຮ້ານເອງ)',po_voided:'ຍົກເລີກໃບສັ່ງແລ້ວ',po_by:'ໂດຍ',po_text_t:'ຂໍ້ຄວາມທີ່ສົ່ງ',
  po_order_err:'ອ່ານອໍເດີສາຂາບໍ່ໄດ້ — ຄຳແນະນຳນີ້ຍັງບໍ່ລວມເຄື່ອງທີ່ຕ້ອງເຮັດດ່ວນ',po_due:'ຂໍຮັບເຄື່ອງ',
  po_list_noread:'ອ່ານໃບທີ່ສັ່ງໄປແລ້ວບໍ່ໄດ້ — ຍັງບໍ່ສະແດງຄຳແນະນຳ',po_list_noread_h:'ຖ້າສະແດງ ອາດສັ່ງເຄື່ອງທີ່ກຳລັງມາຊ້ຳອີກຮອບ — ກົດ ⟳ ໂຫຼດໃໝ່',po_reload:'⟳ ໂຫຼດໃໝ່'},
my:{po_hint:'အကြံပြုချက်: အနည်းဆုံးအောက် ကုန်ကြမ်း + ထုတ်လုပ်ရန် လိုအပ်သည် (⚡ အရေးပေါ် / 🔄 ဖြည့်) − လက်ကျန် − မှာပြီးသား · နံပါတ်ပြင်နိုင် · 0 = မမှာ',
  po_none:'ယခု မှာယူရန် မရှိပါ 👍',po_nosup:'ဆိုင်မရှိ',po_nosup_h:'ဤကုန်ကြမ်းများ ဆိုင်မသတ်မှတ်ရသေး — 🥬 ကုန်ကြမ်း တွင် သတ်မှတ်ပါ',po_group_no:'LINE အုပ်စု မရှိ',po_group_empty:'စာရင်းမရှိ — ＋ ထည့်ရန် နှိပ်ပါ',
  po_why_max:'Max {m} အထိ ဖြည့်',po_why_min:'အနည်းဆုံးအောက် (ရှိ {s} · အနည်းဆုံး {m})',po_why_prod:'ထုတ်လုပ်ရန် လို {q} {u}',po_lots:'အသုတ်',po_have:'ရှိ {q}',po_incoming:'မှာပြီး {q} ရောက်လာမည်',po_need:'မှာရန် {q} {u}',
  po_est_none:'ဈေးမရှိ',po_est_col:'ခန့်မှန်း',po_lines_n:'{n} ကြောင်း',po_total_est:'စုစုပေါင်း {n} ကြောင်း · ခန့်မှန်း {m}',po_pack_eq:'1 {u} = {q} {b}',po_skip:'မမှာ',
  po_send:'📤 LINE ပို့',po_send_copy:'📋 ကူး/ကိုယ်တိုင်ပို့',po_add_item:'＋ ထည့်ရန်',po_other_sups:'အခြားဆိုင်:',po_reset:'↺ အကြံပြုချက်',
  po_pick_t:'{s} ၏ ကုန်ကြမ်း ရွေးပါ',po_pick_none:'ဤဆိုင်တွင် ကုန်ကြမ်းမရှိသေး — 🥬 ကုန်ကြမ်း တွင် ဆိုင်သတ်မှတ်ပါ',po_pick_all_in:'ဤဆိုင်၏ ကုန်ကြမ်းအားလုံး စာရင်းတွင် ရှိပြီး',
  po_nothing:'မှာရန် မရှိပါ (အားလုံး 0)',po_send_q:'{s} သို့ မှာယူစာကို LINE အုပ်စု "{g}" တွင် ပို့မလား?',po_sent_ok:'{s} သို့ မှာယူစာ ပို့ပြီး ✅',
  po_manual_t:'{s} သို့ ကိုယ်တိုင်ပို့ရန်',po_manual_h:'ဤဆိုင်တွင် LINE အုပ်စုမရှိ — စာသားကူးပြီး ကိုယ်တိုင်ပို့ပါ၊ ပြီးလျှင် "ပို့ပြီး" နှိပ်၍ မှတ်တမ်းတင်ပါ (🏷️ ဆိုင်များ တွင် အုပ်စုသတ်မှတ်နိုင်)',
  po_manual_q:'ဆိုင်သို့ ပို့ပြီးပြီလား?',po_mark_sent:'✅ ပို့ပြီး',po_not_yet:'မပို့ရသေး',
  po_fail_t:'LINE ပို့မရပါ',po_fail_h:'မှာယူစာ သိမ်းပြီးသော်လည်း အုပ်စုသို့ ပို့မရပါ — ကူးပြီး ကိုယ်တိုင်ပို့ကာ "ပို့ပြီး" နှိပ်ပါ သို့မဟုတ် ဤစာကို ပယ်ဖျက်ပြီး ထပ်စမ်းပါ',po_fail_drop:'🗑 ဤစာကို ပယ်ဖျက်',
  po_not_saved:'မှာယူစာ သိမ်းမရပါ — မပို့ရသေးပါ ထပ်စမ်းပါ',po_sent_but:'LINE ပို့ပြီးသော်လည်း အခြေအနေ သိမ်းမရပါ — ဤစာ "မပို့ရသေး" ဟု ပြနေမည် (ထပ်မမှာပါနှင့်)',
  po_line_local:'{t} တွင် ဆိုင်သို့ LINE ပို့ပြီးသော်လည်း အခြေအနေ သိမ်းမရပါ — မှတ်ရန် "✅ ပို့ပြီး" ကို နှိပ်ပါ',po_resend_q:'ဤစာကို ဆိုင် LINE အုပ်စုသို့ ပို့ပြီးသား — ထပ်ပို့လျှင် ဆိုင်တွင် မှာယူစာ နှစ်ထပ်ရမည်။ ပို့မလား?',
  po_list_t:'📋 မှာယူပြီးသော စာများ',po_list_none:'မမှာယူရသေးပါ',po_noread:'ဖတ်မရပါ',
  po_st_draft:'မပို့ရသေး',po_st_sent:'မှာပြီး စောင့်နေ',po_st_received:'လက်ခံပြီး',po_st_void:'ပယ်ဖျက်',
  po_detail_t:'မှာယူစာ',po_recv_btn:'📥 ဤစာအတိုင်း လက်ခံ',po_resend:'💬 LINE ထပ်ပို့',po_send_now:'📤 LINE ပို့',po_void_btn:'🗑 ဤစာကို ပယ်ဖျက်',
  po_void_q:'{s} သို့ မှာယူစာ {n} ကို ပယ်ဖျက်မလား? (ဆိုင်မသိပါ — ကိုယ်တိုင်ပြောပါ)',po_voided:'မှာယူစာ ပယ်ဖျက်ပြီး',po_by:'မှ',po_text_t:'ပို့သောစာ',
  po_order_err:'ဆိုင်ခွဲအော်ဒါ ဖတ်မရပါ — အရေးပေါ် ထုတ်လုပ်ရန် လိုအပ်ချက် မပါဝင်သေး',po_due:'ရောက်စေချင်သည့်ရက်',
  po_list_noread:'ပို့ပြီးသော အော်ဒါများ ဖတ်မရပါ — အကြံပြုချက် ဖျောက်ထားသည်',po_list_noread_h:'ပြလျှင် လမ်းပေါ်ရောက်နေသော ပစ္စည်းကို ထပ်မှာမိနိုင်သည် — ⟳ နှိပ်၍ ပြန်ဖွင့်ပါ',po_reload:'⟳ ပြန်ဖွင့်'}
});
CSS.add(`
.po-hint{margin-top:0}
.po-card .po-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);flex-wrap:wrap}
.po-card .po-row:last-of-type{border-bottom:0}
.po-row .grow{flex:1;min-width:150px}.po-row b{font-size:14.5px}
.po-row.skip .grow,.po-row.skip .mthumb{opacity:.5}
.po-qty{flex:none;width:100%;max-width:272px;margin-left:auto}.po-qty .skstep{margin-top:0;display:grid;grid-template-columns:44px minmax(52px,1fr) 44px 96px;gap:6px}   /* ทุกแถวกว้างเท่ากัน — ปุ่ม/ช่อง/หน่วยตรงกันทุกบรรทัด (เจ้าของ 2026-10-19 "อยากให้เรียงเท่ากัน") */
.po-qty .skstep input{width:100%}.po-qty .skstep>span.b{white-space:normal;line-height:1.2;font-size:13.5px;overflow-wrap:anywhere;min-width:0}
@media(max-width:340px){.po-qty .skstep{grid-template-columns:44px minmax(44px,1fr) 44px 72px}}
.po-foot{display:flex;flex-direction:column;gap:10px;padding-top:12px;margin-top:4px;border-top:1.5px solid var(--line)}
.po-foot .po-acts{display:flex;gap:8px;flex-wrap:wrap}.po-foot .po-acts .btn{flex:1;white-space:nowrap}
@media(min-width:640px){.po-foot{flex-direction:row;align-items:center;flex-wrap:wrap}.po-foot .grow{flex:1;min-width:160px}.po-foot .po-acts{flex:none}.po-foot .po-acts .btn{flex:none}}
.po-others{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0 4px}
.po-btns{display:flex;flex-direction:column;gap:8px;margin-top:14px}
.po-txt{margin-top:12px}.po-txt summary{cursor:pointer;font-weight:600;color:var(--mut);font-size:13px;min-height:44px;display:flex;align-items:center}
.po-txt pre{white-space:pre-wrap;font:inherit;font-size:13.5px;background:#FBF6EA;border-radius:12px;padding:10px 12px;margin:6px 0 0;overflow-wrap:anywhere}
.po-pick{max-height:52dvh;overflow-y:auto}
`);
let PO_SUG=null;                     // ผลคิดรอบล่าสุด {groups:[{key,name,sup,gid,rows:[...]}],ordersOk}
let PO_LIST=[],PO_LINES={},PO_LIST_OK=true;   // ใบที่สั่งไปแล้ว 30 วัน (รายการ + ที่กำลังมา)
let PO_OVR={d:'',v:{},add:{}};       // ตัวเลขที่แก้เอง (ต่อวัน) · add = {supKey:[item_id]} รายการที่เพิ่มเอง/ร้านที่เปิดเอง
const PO_OVR_K='jjck_po_ovr';
let PO_SEQ=0;
function poOvrLoad(){const o=LS.get(PO_OVR_K,null),d=bizTodayISO();
  PO_OVR=(o&&o.d===d&&o.v&&typeof o.v==='object')?{d,v:o.v,add:(o.add&&typeof o.add==='object')?o.add:{}}:{d,v:{},add:{}};}
function poOvrSave(){LS.set(PO_OVR_K,PO_OVR);}
function poPack(it){const p=packsOf(it)[0];return p?{u:p.u,q:p.q}:{u:(it&&it.unit)||'',q:1};}   // หน่วยที่สั่ง = หน่วยซื้อ (หรือบรรจุแรก) · ไม่มี = หน่วยหลัก
function poStLb(st){return ['draft','sent','received','void'].includes(st)?t('po_st_'+st):String(st||'');}

RENDER.buy=function(el){
  pinnedBar(null,el);poOvrLoad();
  el.innerHTML=dhead('🛒 '+t('nav_buy'),'<button type="button" class="btn gh sm2" onclick="poRefresh()">⟳ '+esc(t('refresh_tip'))+'</button>')+sqlNeedBox()+
    '<div class="hintbox po-hint">'+esc(t('po_hint'))+'</div><div id="poOrdErr"></div><div id="poBody"><div class="spin"></div></div>'+
    '<div class="card" style="margin-top:14px"><h3>'+esc(t('po_list_t'))+'<span class="sp" id="poListN"></span></h3><div id="poList"><div class="spin"></div></div></div>';
  poLoad();
};
function poRefresh(){poLoad(true);}
async function poLoad(force){
  const seq=++PO_SEQ;
  if(typeof mkLoad==='function'){try{await mkLoad(force);}catch(e){}}   // ออเดอร์สาขา + ที่ควรมี — ตัวช่วยของ 🍳 ทำของ (ไม่คิดซ้ำ)
  await poListLoad();
  if(seq!==PO_SEQ||S.tab!=='buy')return;
  PO_SUG=poCalc();poPaint();poPaintList();
}
async function poListLoad(){ // ใบสั่ง 30 วันหลัง + บรรทัด — ใบหรือบรรทัดอ่านไม่ได้ = PO_LIST_OK=false คงชุดล่าสุดที่อ่านได้ไว้ (ห้ามคิดคำแนะนำจากข้อมูลครึ่ง ๆ — เหมือน 🚚 sdLoad) · ยังไม่รัน SQL + ตารางไม่มีจริง = ว่าง (sdTblGone)
  const td=bizTodayISO();
  const get=async q=>{try{const r=await q;if(!r||r.error){const x={ok:false,rows:[],err:r&&r.error};sdTblGone(x);return x.ok?[]:null;}return r.data||[];}catch(e){return null;}};
  const pos=await get(sb.from('kc_pos').select('*').gte('d',addDays(td,-30)).order('d',{ascending:false}).order('created_at',{ascending:false}).limit(60));
  if(pos==null){PO_LIST_OK=false;return;}
  const lines={};
  if(pos.length){const ln=await get(sb.from('kc_po_lines').select('*').in('po_id',pos.map(p=>p.id)).order('sort').order('id'));
    if(ln==null){PO_LIST_OK=false;return;}
    ln.forEach(l=>{(lines[l.po_id]=lines[l.po_id]||[]).push(l);});}
  PO_LIST=pos;PO_LINES=lines;PO_LIST_OK=true;
}
const PO_LINE_OK='jjck_po_lineok';   // {id ใบสั่ง: เวลา} ไลน์ถึงร้านแล้วแต่เขียนสถานะไม่ได้ — เครื่องนี้จำไว้ (ไม่แนะนำให้สั่งซ้ำ · ส่งซ้ำถามก่อน)
function poLineOkMap(){const m=LS.get(PO_LINE_OK,{});return (m&&typeof m==='object'&&!Array.isArray(m))?m:{};}
function poLineOkMark(id){const m=poLineOkMap(),cut=Date.now()-3*86400e3;Object.keys(m).forEach(k=>{if(!(Date.parse(m[k])>cut))delete m[k];});m[id]=new Date().toISOString();LS.set(PO_LINE_OK,m);}
function poLineOkAt(id){return poLineOkMap()[id]||null;}
const poIsIncoming=p=>p.status==='sent'||(p.status==='draft'&&!!poLineOkAt(p.id));   // ร่างที่ไลน์ถึงร้านแล้ว = ของกำลังมาเหมือนใบที่สั่งแล้ว
function poIncoming(){ // ที่สั่งไว้แล้วกำลังมา (ใบ status sent · ร่างที่ไลน์ถึงแล้ว) ต่อวัตถุดิบ เป็นหน่วยหลัก
  const out={};PO_LIST.filter(poIsIncoming).forEach(p=>(PO_LINES[p.id]||[]).forEach(l=>{if(!l.item_id)return;out[l.item_id]=rnd4(num(out[l.item_id])+num(l.qty_base));}));return out;}
/* ---------- คิดคำแนะนำ ---------- */
function poCalc(){
  const ordersOk=!!(typeof MK_ORD!=='undefined'&&MK_ORD.ok);
  if(!PO_LIST_OK)return {groups:[],ordersOk,listOk:false};   // ใบที่สั่งไปแล้วอ่านไม่ครบ = ไม่มีคำแนะนำ (ของที่กำลังมาจะถูกสั่งซ้ำ)
  const needs=(typeof mkNeeds==='function')?mkNeeds():{};
  const prod={},why={};
  activeRecipes().forEach(r=>{const n=needs[r.id];if(!n||!(n.sugg>0))return;
    bomOf(r).forEach(l=>{if(l.qty_base==null)return;const id=l.item.id;prod[id]=rnd4(num(prod[id])+l.qty_base*n.sugg);(why[id]=why[id]||[]).push({r,lots:n.sugg});});});
  const inc=poIncoming(),groups={};
  const grp=(key,supName)=>{if(groups[key])return groups[key];const s=S.sups.find(x=>supKey(x.name)===key)||null;
    return groups[key]={key,name:s?s.name:(String(supName||'').trim()||t('po_nosup')),sup:s,gid:(s&&s.line_group_id)||null,rows:[]};};
  activeItems().forEach(it=>{
    const stock=Math.max(0,num(it.qty)),mn=Math.max(0,num(it.min_qty)),mx=Math.max(0,num(it.max_qty)),pr=num(prod[it.id]),incoming=num(inc[it.id]);
    const trig=Math.max(mn>0?mn:mx,pr),topUp=mx>0&&stock+incoming<trig-1e-9&&mx>=trig-1e-9,want=topUp?mx:trig;   // ถึงจุดสั่ง (ต่ำกว่าขั้นต่ำ · ไม่ตั้งขั้นต่ำ = ต่ำกว่า Max · หรือไม่พอทำของ) → เติมให้ถึง Max · ปัดขึ้นเป็นบรรจุเต็มเสมอ (เจ้าของ 2026-10-19 "เหลือดีกว่าขาด")
    const need=rnd4(want-stock-incoming),key=supKey(it.sup),manual=(PO_OVR.add[key]||[]).includes(it.id);
    if(need<=0&&!manual)return;
    const pk=poPack(it),sug=need>0?Math.ceil(need/pk.q-1e-9):0,ov=PO_OVR.v[key+'|'+it.id];
    const packs=(ov==null||ov==='')?(need>0?sug:1):Math.max(0,num(ov)),c=itemCost(it);
    grp(key,it.sup).rows.push({it,stock,mn,mx,topUp,pr,want,incoming,need,pu:pk.u,pq:pk.q,sug,packs,ov:!(ov==null||ov===''),why:why[it.id]||[],lowMin:mn>0&&stock+incoming<mn,c,est:c==null?null:rnd2(c*pk.q*packs),manual:need<=0&&manual});
  });
  Object.keys(PO_OVR.add).forEach(key=>{if(!groups[key])grp(key,(S.sups.find(x=>supKey(x.name)===key)||{}).name||key);});
  const G=Object.values(groups).sort((a,b)=>((a.key==='')-(b.key===''))||a.name.localeCompare(b.name,'th'));
  G.forEach((g,i)=>{g.gi=i;});
  return {groups:G,ordersOk,listOk:true};
}
function poEstOf(r){return r.c==null?null:rnd2(r.c*r.pq*r.packs);}
function poGroupSum(g){const act=g.rows.filter(r=>r.packs>0);const est=act.some(r=>r.est==null)?null:rnd2(act.reduce((a,r)=>a+r.est,0));return {n:act.length,est};}
/* ---------- วาด ---------- */
function poPaint(){
  const box=document.getElementById('poBody');if(!box||!PO_SUG)return;
  const err=document.getElementById('poOrdErr');if(err)err.innerHTML=PO_SUG.ordersOk?'':'<div class="badbox">⚠ '+esc(t('po_order_err'))+'</div>';
  if(!PO_SUG.listOk){box.innerHTML='<div class="badbox">⚠ '+esc(t('po_list_noread'))+'<div class="xs" style="margin-top:4px">'+esc(t('po_list_noread_h'))+'</div></div>'+
    '<button type="button" class="btn gh" onclick="poRefresh()">'+esc(t('po_reload'))+'</button>';return;}
  const G=PO_SUG.groups;
  let h=G.length?G.map(poGroupHtml).join(''):'<div class="card"><div class="empty">'+esc(t('po_none'))+'</div></div>';
  const others=S.sups.filter(s=>s.active!==false&&!G.some(g=>g.key===supKey(s.name)));
  if(others.length)h+='<div class="po-others"><span class="sm mut">'+esc(t('po_other_sups'))+'</span>'+others.map(s=>'<button type="button" class="pill" data-k="'+esc(supKey(s.name))+'" onclick="poAddGroup(this.dataset.k)">🏷️ '+esc(s.name)+'</button>').join('')+'</div>';
  box.innerHTML=h;
}
function poGroupHtml(g){
  const gi=g.gi,sum=poGroupSum(g),hasOv=g.rows.some(r=>r.ov);
  const chip=g.gid?'<span class="chip ok">💬 '+esc(lgName(g.gid))+'</span>':'<span class="chip warn">⚠ '+esc(t('po_group_no'))+'</span>';
  return '<div class="card po-card" id="poG'+gi+'" data-gi="'+gi+'"><h3>🏷️ '+esc(g.name)+'<span class="sp">'+chip+'</span></h3>'+
    (g.key===''?'<div class="xs mut" style="margin:-6px 0 8px">'+esc(t('po_nosup_h'))+'</div>':'')+
    (g.rows.length?g.rows.map((r,i)=>poRowHtml(gi,r,i)).join(''):'<div class="empty" style="padding:12px">'+esc(t('po_group_empty'))+'</div>')+
    '<div class="po-foot"><span class="grow b" id="poSum'+gi+'">'+esc(t('po_total_est',{n:sum.n,m:sum.est==null?t('po_est_none'):money(sum.est)}))+'</span><div class="po-acts">'+
      (hasOv?'<button type="button" class="btn gh sm2" id="poReset'+gi+'" onclick="poReset('+gi+')">'+esc(t('po_reset'))+'</button>':'')+
      '<button type="button" class="btn gh sm2" id="poAdd'+gi+'" onclick="poPickItem('+gi+')">'+esc(t('po_add_item'))+'</button>'+
      '<button type="button" class="btn sm2" id="poSend'+gi+'" onclick="poSend('+gi+')">'+esc(g.gid?t('po_send'):t('po_send_copy'))+'</button></div></div></div>';
}
function poRowHtml(gi,r,i){
  const it=r.it,u=trUnit(it.unit),why=[];
  if(r.lowMin)why.push(t('po_why_min',{s:fmtQ(r.stock)+' '+u,m:fmtQ(r.mn)+' '+u}));else why.push(t('po_have',{q:fmtQ(r.stock)+' '+u}));
  if(r.pr>0)why.push(t('po_why_prod',{q:fmtQ(r.pr),u})+' ('+r.why.map(w=>dispName(w.r)+' '+fmtQ(w.lots)+' '+t('po_lots')).join(', ')+')');
  if(r.topUp)why.push(t('po_why_max',{m:qtyTxt(it,r.mx)}));
  if(r.incoming>0)why.push(t('po_incoming',{q:fmtQ(r.incoming)+' '+u}));
  if(r.pq!==1||r.pu!==it.unit)why.push(t('po_pack_eq',{u:trUnit(r.pu),q:fmtQ(r.pq),b:u}));
  return '<div class="po-row'+(r.packs>0?'':' skip')+'" id="poR'+gi+'_'+i+'">'+thumbHtml(it,'🥬')+'<div class="grow"><b>'+esc(dispName(it))+'</b>'+
    (r.need>0?' <span class="chip bad">'+esc(t('po_need',{q:fmtQ(r.need),u}))+'</span>':'')+'<div class="xs mut">'+esc(why.join(' · '))+'</div></div>'+
    '<div class="po-qty">'+stepper('poP'+gi+'_'+i,r.packs,{step:1,min:0,unit:r.pu,on:v=>poSetPacks(gi,i,v)})+'<div class="xs right" id="poE'+gi+'_'+i+'">'+poEstTxt(r)+'</div></div></div>';
}
function poEstTxt(r){if(!(r.packs>0))return esc(t('po_skip'));
  return (r.ov?'<span class="mut">✎ </span>':'')+'= '+esc(fmtQ(rnd4(r.packs*r.pq)))+' '+esc(trUnit(r.it.unit))+' · '+(r.est==null?esc(t('po_est_none')):'≈ '+esc(money(r.est)));}
function poSetPacks(gi,i,v){ // แก้ในที่ (ไม่วาดใหม่ — คีย์บอร์ดไม่หุบ)
  const g=PO_SUG&&PO_SUG.groups[gi],r=g&&g.rows[i];if(!r)return;
  r.packs=Math.max(0,rnd4(numIn(v)));r.ov=true;r.est=poEstOf(r);   // numIn: "1,5" = 1.5
  PO_OVR.v[g.key+'|'+r.it.id]=r.packs;poOvrSave();
  const e=document.getElementById('poE'+gi+'_'+i);if(e)e.innerHTML=poEstTxt(r);
  const row=document.getElementById('poR'+gi+'_'+i);if(row)row.classList.toggle('skip',!(r.packs>0));
  const sum=poGroupSum(g),s=document.getElementById('poSum'+gi);if(s)s.textContent=t('po_total_est',{n:sum.n,m:sum.est==null?t('po_est_none'):money(sum.est)});
}
function poReset(gi){const g=PO_SUG&&PO_SUG.groups[gi];if(!g)return;Object.keys(PO_OVR.v).forEach(k=>{if(k.startsWith(g.key+'|'))delete PO_OVR.v[k];});poOvrSave();PO_SUG=poCalc();poPaint();}
function poAddGroup(key){PO_OVR.add[key]=PO_OVR.add[key]||[];poOvrSave();PO_SUG=poCalc();poPaint();const g=PO_SUG.groups.find(x=>x.key===key);if(g)poPickItem(g.gi);}
function poPickItem(gi){ // ＋ เพิ่มรายการ: วัตถุดิบของร้านนี้ที่ยังไม่อยู่ในการ์ด
  const g=PO_SUG&&PO_SUG.groups[gi];if(!g)return;
  const all=activeItems().filter(it=>supKey(it.sup)===g.key),left=all.filter(it=>!g.rows.some(r=>r.it.id===it.id));
  const rows=left.map(it=>'<div class="rowline tap po-pk" data-id="'+esc(it.id)+'" data-q="'+esc(supKey(dispName(it)+' '+it.name))+'" onclick="poPickGo('+gi+',this.dataset.id)">'+thumbHtml(it,'🥬')+
    '<div class="grow"><b>'+esc(dispName(it))+'</b><div class="xs mut">'+esc(t('stock'))+' '+esc(fmtQ(it.qty))+' '+esc(trUnit(it.unit))+' · '+esc(trUnit(poPack(it).u))+'</div></div><span class="mut">›</span></div>').join('');
  openModal('<h3>'+esc(t('po_pick_t',{s:g.name}))+'</h3>'+(left.length>6?searchBox('poPickQ',q=>{const k=supKey(q);document.querySelectorAll('#poPickList .po-pk').forEach(el=>{el.style.display=!k||el.dataset.q.includes(k)?'':'none';});}):'')+
    '<div class="po-pick" id="poPickList">'+(rows||'<div class="empty">'+esc(all.length?t('po_pick_all_in'):t('po_pick_none'))+'</div>')+'</div>');
}
function poPickGo(gi,id){const g=PO_SUG&&PO_SUG.groups[gi],it=itemById(id);if(!g||!it)return;
  (PO_OVR.add[g.key]=PO_OVR.add[g.key]||[]).push(id);if(PO_OVR.v[g.key+'|'+id]==null)PO_OVR.v[g.key+'|'+id]=1;poOvrSave();closeModal();PO_SUG=poCalc();poPaint();}
/* ---------- ข้อความ + ส่ง ---------- */
function poText(g,rows,po_no){ // ข้อความใบสั่ง (ภาษาไทยเสมอ — ร้านค้าอ่าน)
  const td=bizTodayISO(),lead=g.sup&&num(g.sup.lead_days)>0?num(g.sup.lead_days):null;
  const L=['🛒 จริงใจหมูกระทะ','🏭 ครัวกลาง','🏷️ '+g.name+(po_no?' · '+po_no:''),'📅 สั่งวันที่ '+thDate(td)];
  if(lead!=null)L.push('🚚 ขอรับของ '+thDate(addDays(td,lead)));
  L.push('');
  rows.forEach(r=>{L.push('• '+r.it.name+' — '+fmtQ(r.packs)+' '+r.pu+(r.pu!==r.it.unit?' (= '+fmtQ(rnd4(r.packs*r.pq))+' '+r.it.unit+')':''));});
  L.push('','รวม '+rows.length+' รายการ');if(S.user&&S.user.name)L.push('👤 '+S.user.name);
  return L.join('\n');}
function poNextNo(){ // เลขใบถัดไปของวันนี้ · รายการอ่านไม่ได้ = ห้ามออกเลข (จะได้เลขซ้ำ)
  if(!PO_LIST_OK)throw new Error('po list');const td=bizTodayISO(),pre='PO-'+td.slice(2).replace(/-/g,'')+'-';let n=PO_LIST.filter(p=>String(p.d).slice(0,10)===td).length+1;while(PO_LIST.some(p=>p.po_no===pre+n))n++;return pre+n;}
async function poSave(g,rows,po_no,text,status){ // หัว → บรรทัด · บรรทัดพลาด = ลบหัวทิ้ง (ไม่มีใบครึ่ง ๆ) → {id,po_no,text} · เลขใบชน 23505 (อีกเครื่องสั่งพร้อมกัน) = อ่านรายการใหม่ ออกเลขถัดไป ลองอีก ≤3 ครั้ง
  if(!PO_LIST_OK){toast(t('po_list_noread'),true);return null;}
  const id=uid('po'),d=bizTodayISO();
  const head={id,po_no,d,sup_id:g.sup?g.sup.id:null,sup_name:g.name,status,text,note:null,line_sent_at:null,by_name:(S.user&&S.user.name)||null};
  const lines=rows.map((r,i)=>({po_id:id,item_id:r.it.id,name:r.it.name,packs:rnd4(r.packs),pack_unit:r.pu,pack_qty:rnd4(r.pq),qty_base:rnd4(r.packs*r.pq),unit:r.it.unit||null,price_est:r.est==null?null:rnd2(r.est),sort:i}));
  let ins=false;setBusy(true);
  try{for(let i=0;i<3&&!ins;i++){let r=null;try{r=await sb.from('kc_pos').insert(head);}catch(e){r={error:e};}
      if(r&&!r.error){ins=true;break;}
      if(!r||!r.error||String(r.error.code||'')!=='23505')break;
      await poListLoad();if(!PO_LIST_OK)break;
      head.po_no=po_no=poNextNo();head.text=text=poText(g,rows,po_no);}}
  finally{setBusy(false);}
  if(!ins){toast(t(PO_LIST_OK?'po_not_saved':'po_list_noread'),true);return null;}
  try{await db(()=>sb.from('kc_po_lines').insert(lines));}
  catch(e){try{await sb.from('kc_po_lines').delete().eq('po_id',id);await sb.from('kc_pos').delete().eq('id',id);}catch(_){}toast(t('po_not_saved'),true);return null;}
  return {id,po_no,text};}
async function poSend(gi){await once(async()=>{
  if(!PO_LIST_OK){toast(t('po_list_noread'),true);return;}   // ใบที่สั่งไปแล้วอ่านไม่ครบ = ไม่สั่ง (สั่งซ้ำ/เลขซ้ำ)
  const g=PO_SUG&&PO_SUG.groups[gi];if(!g||!canKitchen())return;const rows=g.rows.filter(r=>r.packs>0);
  if(!rows.length){toast(t('po_nothing'),true);return;}
  const po_no=poNextNo(),text0=poText(g,rows,po_no);
  if(!g.gid){poManualModal(g,rows,po_no,text0);return;}
  if(!(await confirm2(t('po_send_q',{s:g.name,g:lgName(g.gid)}))))return;
  const sv=await poSave(g,rows,po_no,text0,'draft');if(!sv)return;const id=sv.id,text=sv.text;
  try{await lineSend(g.gid,text);}catch(e){await poListLoad();poFailModal(id,g,text,e);return;}
  let ok=false;for(let i=0;i<2&&!ok;i++){try{const r=await sb.from('kc_pos').update({status:'sent',line_sent_at:new Date().toISOString()}).eq('id',id);ok=!!(r&&!r.error);}catch(e){ok=false;}}   // พลาด = ลองอีกครั้ง
  if(ok)toast(t('po_sent_ok',{s:g.name}));else{poLineOkMark(id);toast(t('po_sent_but'),'warn');}
  await poAfterSent(g.key);
});}
async function poAfterSent(key){ // ล้างที่แก้ของร้านนี้ → โหลดใบ/กำลังมาใหม่ → คิดใหม่
  Object.keys(PO_OVR.v).forEach(k=>{if(k.startsWith(key+'|'))delete PO_OVR.v[k];});delete PO_OVR.add[key];poOvrSave();
  await poListLoad();if(S.tab!=='buy')return;PO_SUG=poCalc();poPaint();poPaintList();}
function poManualModal(g,rows,po_no,text){ // ไม่มีกลุ่มไลน์: คัดลอก/เปิดไลน์เอง แล้วถามว่าส่งแล้วไหม
  const ok=hreg(()=>once(async()=>{if(!PO_LIST_OK){toast(t('po_list_noread'),true);return;}const sv=await poSave(g,rows,po_no,text,'sent');if(!sv)return;closeModal();toast(t('po_sent_ok',{s:g.name}));await poAfterSent(g.key);}));
  openModal('<h3>📋 '+esc(t('po_manual_t',{s:g.name}))+'</h3><div class="hintbox">'+esc(t('po_manual_h'))+'</div>'+lineTextBox(text)+
    '<div class="b" style="margin:16px 0 8px">'+esc(t('po_manual_q'))+'</div><div class="row"><button type="button" class="btn ok grow" id="poManualOk" onclick="'+ok+'">'+esc(t('po_mark_sent'))+'</button>'+
    '<button type="button" class="btn gh" id="poManualNo" onclick="closeModal()">'+esc(t('po_not_yet'))+'</button></div>');}
function poFailModal(id,g,text,e){ // บันทึกแล้ว (draft) แต่ไลน์ส่งไม่ได้
  openModal('<h3>⚠ '+esc(t('po_fail_t'))+'</h3><div class="badbox">'+esc(t('po_fail_h'))+'<div class="xs" style="margin-top:4px">'+esc((e&&e.message)||e||'')+'</div></div>'+lineTextBox(text)+
    '<div class="row" style="margin-top:14px"><button type="button" class="btn ok grow" id="poFailOk" onclick="'+hreg(()=>poMarkSent(id,g.key))+'">'+esc(t('po_mark_sent'))+'</button>'+
    '<button type="button" class="btn gh" id="poFailDrop" onclick="'+hreg(()=>poDrop(id,g.key))+'">'+esc(t('po_fail_drop'))+'</button></div>');}
async function poMarkSent(id,key){await once(async()=>{try{await db(()=>sb.from('kc_pos').update({status:'sent'}).eq('id',id));}catch(e){return;}closeModal();toast(t('sv_ok'));await poAfterSent(key);});}
async function poDrop(id,key){await once(async()=>{try{await db(()=>sb.from('kc_po_lines').delete().eq('po_id',id));await db(()=>sb.from('kc_pos').delete().eq('id',id));}catch(e){return;}
  closeModal();await poAfterSent(key);});}
/* ---------- ใบที่สั่งไปแล้ว ---------- */
function poPaintList(){
  const box=document.getElementById('poList'),n=document.getElementById('poListN');if(!box)return;
  if(!PO_LIST_OK){box.innerHTML='<div class="empty">'+esc(t('po_noread'))+'</div>';return;}
  if(n)n.textContent=PO_LIST.length?t('po_lines_n',{n:PO_LIST.length}):'';
  if(!PO_LIST.length){box.innerHTML='<div class="empty">'+esc(t('po_list_none'))+'</div>';return;}
  box.innerHTML=PO_LIST.map(p=>{const ln=PO_LINES[p.id]||[];
    return '<div class="rowline tap po-li" data-id="'+esc(p.id)+'" onclick="poDetail(this.dataset.id)"><div class="grow"><b>'+esc(p.sup_name||'')+'</b> <span class="mut sm">'+esc(p.po_no||'')+'</span>'+
      '<div class="xs mut">'+esc(dispDate(p.d))+' · '+esc(t('po_lines_n',{n:ln.length}))+(p.by_name?' · '+esc(p.by_name):'')+'</div></div>'+stPill(p.status,poStLb(p.status))+'</div>';}).join('');
}
async function poDetail(id){ // โมดูลอื่นเรียกได้
  let p=PO_LIST.find(x=>x.id===id),ln=PO_LINES[id];
  if(!p){try{p=await db(()=>sb.from('kc_pos').select('*').eq('id',id).maybeSingle());if(!p)return;ln=await db(()=>sb.from('kc_po_lines').select('*').eq('po_id',id).order('sort').order('id'));}catch(e){return;}}
  ln=ln||[];const s=supById(p.sup_id)||supByName(p.sup_name),gid=(s&&s.line_group_id)||null,est=ln.reduce((a,l)=>a+num(l.price_est),0),anyEst=ln.some(l=>l.price_est!=null);
  const rows=ln.map(l=>'<tr><td>'+esc(l.name||'')+'</td><td class="n">'+esc(fmtQ(l.packs))+' '+esc(trUnit(l.pack_unit||''))+
    ((l.pack_unit||'')!==(l.unit||'')?'<div class="xs mut">= '+esc(fmtQ(l.qty_base))+' '+esc(trUnit(l.unit||''))+'</div>':'')+'</td><td class="n">'+(l.price_est!=null?esc(money(l.price_est)):'–')+'</td></tr>').join('');
  const btns=[],lo=p.status==='draft'?poLineOkAt(p.id):null;
  if(lo)btns.push('<div class="badbox" style="flex-basis:100%">⚠ '+esc(t('po_line_local',{t:dispTime(lo)}))+'</div><button type="button" class="btn ok" id="poMarkBtn" onclick="'+hreg(()=>poMarkSent(id,supKey(p.sup_name)))+'">'+esc(t('po_mark_sent'))+'</button>');
  if(p.status==='sent'&&typeof rcFromPo==='function')btns.push('<button type="button" class="btn ok big" id="poRecvBtn" onclick="'+hreg(()=>{closeModal();rcFromPo(id);})+'">'+esc(t('po_recv_btn'))+'</button>');
  if(gid&&(p.status==='sent'||p.status==='draft'))btns.push('<button type="button" class="btn gh" id="poResendBtn" onclick="'+hreg(()=>poResend(id,gid))+'">'+esc(p.status==='draft'&&!lo?t('po_send_now'):t('po_resend'))+'</button>');
  btns.push('<button type="button" class="btn gh" data-t="'+esc(p.text||'')+'" onclick="copyText(this.dataset.t)">📋 '+esc(t('copy'))+'</button>');
  if(p.status==='sent'||p.status==='draft')btns.push('<button type="button" class="btn gh" id="poVoidBtn" onclick="'+hreg(()=>poVoid(id))+'">'+esc(t('po_void_btn'))+'</button>');
  openModal('<h3>🛒 '+esc(t('po_detail_t'))+' '+esc(p.po_no||'')+' '+stPill(p.status,poStLb(p.status))+'</h3>'+
    '<div class="rowline"><div class="grow"><b>'+esc(p.sup_name||'')+'</b><div class="xs mut">'+esc(dispDate(p.d))+' · '+esc(t('po_by'))+' '+esc(p.by_name||'')+' '+esc(dispTime(p.created_at))+(p.line_sent_at?' · 💬 '+esc(dispTime(p.line_sent_at)):'')+'</div></div></div>'+
    '<div class="twrap"><table class="t"><thead><tr><th>'+esc(t('item'))+'</th><th class="n">'+esc(t('qty'))+'</th><th class="n">'+esc(t('po_est_col'))+'</th></tr></thead><tbody>'+rows+
    '<tr class="tot"><td>'+esc(t('total'))+'</td><td class="n">'+esc(t('po_lines_n',{n:ln.length}))+'</td><td class="n">'+(anyEst?esc(money(est)):'–')+'</td></tr></tbody></table></div>'+
    (p.text?'<details class="po-txt"><summary>'+esc(t('po_text_t'))+'</summary><pre>'+esc(p.text)+'</pre></details>':'')+
    '<div class="po-btns">'+btns.join('')+'</div>');
}
async function poResend(id,gid){await once(async()=>{const p=PO_LIST.find(x=>x.id===id);if(!p||!gid)return;
  if(p.status==='draft'&&poLineOkAt(p.id)&&!(await confirm2(t('po_resend_q'),{danger:true})))return;   // ไลน์ถึงร้านแล้ว (จดไม่ได้) — ถามก่อน กันร้านได้ใบซ้ำ
  try{await lineSend(gid,p.text||'');}catch(e){toast(t('line_fail')+': '+((e&&e.message)||e),true);return;}
  try{await db(()=>sb.from('kc_pos').update({status:'sent',line_sent_at:new Date().toISOString()}).eq('id',id));}catch(e){}
  toast(t('line_ok'));closeModal();await poListLoad();if(S.tab==='buy'){PO_SUG=poCalc();poPaint();poPaintList();}});}
async function poVoid(id){await once(async()=>{const p=PO_LIST.find(x=>x.id===id);if(!p)return;
  if(!(await confirm2(t('po_void_q',{n:p.po_no||'',s:p.sup_name||''}),{danger:true})))return;
  try{if(p.status==='draft'){await db(()=>sb.from('kc_po_lines').delete().eq('po_id',id));await db(()=>sb.from('kc_pos').delete().eq('id',id));}
    else await db(()=>sb.from('kc_pos').update({status:'void'}).eq('id',id));}catch(e){return;}
  toast(t('po_voided'));closeModal();await poListLoad();if(S.tab==='buy'){PO_SUG=poCalc();poPaint();poPaintList();}});}
