/* ============================================================
   🏷️ ร้านค้า — sups (sp*)
   การ์ดร้าน → หน้าร้าน: 💬 กลุ่มไลน์ (เลือกแล้วบันทึกทันที · แนะนำกลุ่มจากแอพนับสต๊อก `suppliers` อ่านอย่างเดียว · 🔔 ทดสอบส่ง)
   🥬 วัตถุดิบที่ซื้อร้านนี้ (เพิ่ม/ย้าย/เอาออก) · 📝 ข้อมูลร้าน (เบอร์ เครดิต วันสั่ง รอของ หมายเหตุ) · 🗄️ ไม่ใช้แล้ว
   บอทตัวเดียวกับแอพนับสต๊อก: ส่งผ่าน line-order · รายชื่อกลุ่ม line_groups (อ่านอย่างเดียว) · ดึงกลุ่มใหม่ = sync-line-groups
   ============================================================ */
I18N.add({
th:{sp_hint:'ร้านที่ครัวสั่งของ — ตั้งกลุ่มไลน์ของร้านไว้ เวลากดสั่งของ ใบสั่งจะเข้ากลุ่มร้านเอง',sp_bot:'บอทไลน์ — ตัวเดียวกับระบบนับสต๊อก',
  sp_bot_txt:'บอทอยู่ใน {n} กลุ่ม · ตั้งกลุ่มแล้ว {a} จาก {b} ร้าน',sp_lg_sync:'ดึงกลุ่มไลน์ใหม่',sp_lg_syncing:'กำลังดึงกลุ่มไลน์…',sp_lg_found:'เจอ {n} กลุ่ม ✓',
  sp_lg_none:'ยังไม่เจอกลุ่มไลน์ — เชิญบอทเข้ากลุ่ม แล้วพิมพ์ 1 ข้อความในกลุ่มก่อน',sp_use_stock:'ใช้กลุ่มไลน์จากระบบนับสต๊อก ({n} ร้าน)',
  sp_use_stock_q:'ตั้งกลุ่มไลน์ให้ {n} ร้าน ตามที่ระบบนับสต๊อกผูกไว้?',sp_use_stock_ok:'ตั้งกลุ่มไลน์ให้ {n} ร้านแล้ว',sp_how_q:'เพิ่มกลุ่มไลน์ใหม่ ทำยังไง?',
  sp_how1:'สร้างกลุ่มไลน์กับร้าน (หรือใช้กลุ่มเดิมที่คุยกับร้านอยู่แล้ว)',sp_how2:'เชิญบอทของร้านเราเข้ากลุ่ม — บอทตัวเดียวกับที่ระบบนับสต๊อกใช้ส่งใบสั่ง',
  sp_how3:'พิมพ์อะไรก็ได้ในกลุ่ม 1 ข้อความ (บอทถึงจะรู้จักกลุ่ม)',sp_how4:'กลับมากด 🔄 ดึงกลุ่มไลน์ใหม่ แล้วเลือกกลุ่มให้ร้าน',
  sp_new:'เพิ่มร้านใหม่',sp_none:'ยังไม่มีร้าน — กด ＋ เพิ่มร้านใหม่',sp_no_match:'ไม่พบร้านที่ค้นหา',sp_no_line:'ยังไม่ได้ตั้งกลุ่มไลน์',
  sp_no_line_long:'ยังไม่ได้ตั้งกลุ่มไลน์ — เวลาสั่งของต้องเลือกกลุ่มเองทุกครั้ง',sp_items_n:'{n} วัตถุดิบ',sp_orphans:'ร้านที่มีในวัตถุดิบ แต่ยังไม่ได้เพิ่มเป็นร้าน',sp_add_this:'เพิ่มร้านนี้',
  sp_line:'กลุ่มไลน์ของร้าน',sp_line_on:'ใบสั่งของจะเข้ากลุ่ม "{g}"',sp_used_by:'ใช้กับ {s} อยู่',sp_stk_has:'ระบบนับสต๊อกใช้กลุ่ม "{g}" กับร้านนี้',sp_stk_use:'ใช้กลุ่มเดียวกัน',
  sp_test:'🔔 ทดสอบส่ง',sp_test_ok:'ส่งข้อความทดสอบเข้ากลุ่ม {g} แล้ว',sp_test_txt:'🔔 ทดสอบส่งจากระบบครัวกลาง (JJ ครัวกลาง)\nร้าน: {s}\nเห็นข้อความนี้ = ตั้งกลุ่มไลน์ถูกต้อง ✅',
  sp_line_saved:'ตั้งกลุ่มไลน์ "{g}" แล้ว',sp_line_cleared:'เอากลุ่มไลน์ออกแล้ว',sp_items:'วัตถุดิบที่ซื้อร้านนี้',sp_items_none:'ยังไม่มีวัตถุดิบ — กด ＋ เพิ่มวัตถุดิบเข้าร้านนี้',
  sp_add_items:'＋ เพิ่มวัตถุดิบเข้าร้านนี้',sp_new_item:'＋ วัตถุดิบใหม่',sp_item_off_q:'เอา "{n}" ออกจากร้าน {s}?',sp_pick_hint:'แตะเลือกวัตถุดิบที่ซื้อจากร้าน {s} แล้วกดปุ่มด้านล่าง',
  sp_now_at:'ตอนนี้ซื้อที่ {s}',sp_no_shop:'ยังไม่มีร้าน',sp_pick_none:'วัตถุดิบทุกอย่างอยู่ร้านนี้แล้ว',sp_pick_go:'เพิ่ม {n} อย่าง',sp_move_q:'มี {n} อย่างที่ซื้อร้านอื่นอยู่ — ย้ายมาซื้อร้าน {s} แทนใช่ไหม?',
  sp_added:'เพิ่ม {n} อย่างเข้าร้านแล้ว',sp_info:'ข้อมูลร้าน',sp_edit_info:'แก้ข้อมูลร้าน',sp_dup:'มีร้านชื่อนี้อยู่แล้ว',sp_del:'🗑 ลบร้าน',
  sp_del_q:'ลบร้าน {s}?\nวัตถุดิบ {n} อย่างของร้านนี้จะกลายเป็น "ยังไม่ระบุร้าน"',sp_phone:'เบอร์โทร',sp_credit:'เครดิต (วัน)',sp_credit_hint:'0 = จ่ายทันที · 30 = จ่ายใน 30 วันหลังรับของ',
  sp_pay_now:'จ่ายทันที',sp_pay_credit:'เครดิต {n} วัน',sp_days:'วันที่สั่งได้',sp_days_hint:'ไม่เลือก = สั่งได้ทุกวัน',sp_days_any:'สั่งได้ทุกวัน',sp_lead:'รอของ (วัน)',sp_lead_hint:'สั่งวันนี้ ของมาอีกกี่วัน',
  sp_lead_s:'รอ {n} วัน',sp_off:'🗄️ ไม่ใช้แล้ว',sp_off_chip:'ไม่ใช้แล้ว',sp_off_q:'ซ่อนร้าน "{s}" เพราะไม่ใช้แล้ว? ประวัติยังอยู่ กลับมาใช้ได้ทุกเมื่อ',sp_restore:'↩️ ใช้ต่อ',
  sp_line_after:'บันทึกแล้ว — ตั้งกลุ่มไลน์ของร้านได้เลย',sp_groups_none:'ยังไม่มีกลุ่มไลน์ให้เลือก',sp_sync_fail:'ดึงกลุ่มไลน์ไม่ได้ — ลองใหม่ภายหลัง'},
en:{sp_hint:'Shops the kitchen buys from — set each shop\'s LINE group and purchase orders go straight into it',sp_bot:'LINE bot — the same one as the stock-count app',
  sp_bot_txt:'Bot is in {n} groups · {a} of {b} shops have a group',sp_lg_sync:'Refresh LINE groups',sp_lg_syncing:'Refreshing LINE groups…',sp_lg_found:'Found {n} groups ✓',
  sp_lg_none:'No LINE groups yet — invite the bot to the group and post 1 message there first',sp_use_stock:'Use LINE groups from the stock-count app ({n} shops)',
  sp_use_stock_q:'Set the LINE group for {n} shops, as linked in the stock-count app?',sp_use_stock_ok:'LINE group set for {n} shops',sp_how_q:'How do I add a new LINE group?',
  sp_how1:'Create a LINE group with the shop (or use the chat you already have)',sp_how2:'Invite our bot to the group — the same bot the stock-count app uses',
  sp_how3:'Post any 1 message in the group (so the bot knows the group)',sp_how4:'Come back, tap 🔄 Refresh LINE groups, then pick the group for the shop',
  sp_new:'Add a shop',sp_none:'No shops yet — tap ＋ Add a shop',sp_no_match:'No shop matches',sp_no_line:'No LINE group yet',
  sp_no_line_long:'No LINE group yet — you must pick the group yourself every time you order',sp_items_n:'{n} ingredients',sp_orphans:'Shops named in ingredients but not added yet',sp_add_this:'Add this shop',
  sp_line:'Shop\'s LINE group',sp_line_on:'Orders go to "{g}"',sp_used_by:'used by {s}',sp_stk_has:'The stock-count app uses "{g}" for this shop',sp_stk_use:'Use the same group',
  sp_test:'🔔 Send a test',sp_test_ok:'Test message sent to {g}',sp_test_txt:'🔔 ทดสอบส่งจากระบบครัวกลาง (JJ ครัวกลาง)\nร้าน: {s}\nเห็นข้อความนี้ = ตั้งกลุ่มไลน์ถูกต้อง ✅',
  sp_line_saved:'LINE group set to "{g}"',sp_line_cleared:'LINE group removed',sp_items:'Ingredients bought here',sp_items_none:'No ingredients yet — tap ＋ Add ingredients to this shop',
  sp_add_items:'＋ Add ingredients to this shop',sp_new_item:'＋ New ingredient',sp_item_off_q:'Remove "{n}" from {s}?',sp_pick_hint:'Tap the ingredients you buy from {s}, then tap the button below',
  sp_now_at:'Now bought at {s}',sp_no_shop:'No shop yet',sp_pick_none:'Every ingredient is already in this shop',sp_pick_go:'Add {n}',sp_move_q:'{n} of these are bought at another shop — move them to {s}?',
  sp_added:'Added {n} to the shop',sp_info:'Shop details',sp_edit_info:'Edit shop details',sp_dup:'A shop with this name already exists',sp_del:'🗑 Delete shop',
  sp_del_q:'Delete {s}?\nIts {n} ingredients will have no shop',sp_phone:'Phone',sp_credit:'Credit (days)',sp_credit_hint:'0 = pay on delivery · 30 = pay within 30 days',
  sp_pay_now:'Pay on delivery',sp_pay_credit:'{n}-day credit',sp_days:'Order days',sp_days_hint:'None selected = any day',sp_days_any:'Any day',sp_lead:'Lead time (days)',sp_lead_hint:'Order today, goods arrive in this many days',
  sp_lead_s:'{n} day lead',sp_off:'🗄️ No longer used',sp_off_chip:'No longer used',sp_off_q:'Hide "{s}" as no longer used? History stays, you can bring it back any time',sp_restore:'↩️ Use again',
  sp_line_after:'Saved — set the shop\'s LINE group now',sp_groups_none:'No LINE groups to choose from yet',sp_sync_fail:'Could not refresh LINE groups — try again later'},
lo:{sp_hint:'ຮ້ານທີ່ຄົວສັ່ງເຄື່ອງ — ຕັ້ງກຸ່ມໄລນ໌ຂອງຮ້ານໄວ້ ເວລາກົດສັ່ງເຄື່ອງ ໃບສັ່ງຈະເຂົ້າກຸ່ມຮ້ານເອງ',sp_bot:'ບອດໄລນ໌ — ໂຕດຽວກັບລະບົບນັບສະຕັອກ',
  sp_bot_txt:'ບອດຢູ່ໃນ {n} ກຸ່ມ · ຕັ້ງກຸ່ມແລ້ວ {a} ຈາກ {b} ຮ້ານ',sp_lg_sync:'ດຶງກຸ່ມໄລນ໌ໃໝ່',sp_lg_syncing:'ກຳລັງດຶງກຸ່ມໄລນ໌…',sp_lg_found:'ພົບ {n} ກຸ່ມ ✓',
  sp_lg_none:'ຍັງບໍ່ພົບກຸ່ມໄລນ໌ — ເຊີນບອດເຂົ້າກຸ່ມ ແລ້ວພິມ 1 ຂໍ້ຄວາມໃນກຸ່ມກ່ອນ',sp_use_stock:'ໃຊ້ກຸ່ມໄລນ໌ຈາກລະບົບນັບສະຕັອກ ({n} ຮ້ານ)',
  sp_use_stock_q:'ຕັ້ງກຸ່ມໄລນ໌ໃຫ້ {n} ຮ້ານ ຕາມທີ່ລະບົບນັບສະຕັອກຜູກໄວ້?',sp_use_stock_ok:'ຕັ້ງກຸ່ມໄລນ໌ໃຫ້ {n} ຮ້ານແລ້ວ',sp_how_q:'ເພີ່ມກຸ່ມໄລນ໌ໃໝ່ ເຮັດແນວໃດ?',
  sp_how1:'ສ້າງກຸ່ມໄລນ໌ກັບຮ້ານ (ຫຼືໃຊ້ກຸ່ມເກົ່າທີ່ລົມກັບຮ້ານຢູ່ແລ້ວ)',sp_how2:'ເຊີນບອດຂອງຮ້ານເຮົາເຂົ້າກຸ່ມ — ບອດໂຕດຽວກັບທີ່ລະບົບນັບສະຕັອກໃຊ້ສົ່ງໃບສັ່ງ',
  sp_how3:'ພິມຫຍັງກໍໄດ້ໃນກຸ່ມ 1 ຂໍ້ຄວາມ (ບອດຈຶ່ງຈະຮູ້ຈັກກຸ່ມ)',sp_how4:'ກັບມາກົດ 🔄 ດຶງກຸ່ມໄລນ໌ໃໝ່ ແລ້ວເລືອກກຸ່ມໃຫ້ຮ້ານ',
  sp_new:'ເພີ່ມຮ້ານໃໝ່',sp_none:'ຍັງບໍ່ມີຮ້ານ — ກົດ ＋ ເພີ່ມຮ້ານໃໝ່',sp_no_match:'ບໍ່ພົບຮ້ານທີ່ຄົ້ນຫາ',sp_no_line:'ຍັງບໍ່ໄດ້ຕັ້ງກຸ່ມໄລນ໌',
  sp_no_line_long:'ຍັງບໍ່ໄດ້ຕັ້ງກຸ່ມໄລນ໌ — ເວລາສັ່ງເຄື່ອງຕ້ອງເລືອກກຸ່ມເອງທຸກເທື່ອ',sp_items_n:'{n} ວັດຖຸດິບ',sp_orphans:'ຮ້ານທີ່ມີໃນວັດຖຸດິບ ແຕ່ຍັງບໍ່ໄດ້ເພີ່ມເປັນຮ້ານ',sp_add_this:'ເພີ່ມຮ້ານນີ້',
  sp_line:'ກຸ່ມໄລນ໌ຂອງຮ້ານ',sp_line_on:'ໃບສັ່ງເຄື່ອງຈະເຂົ້າກຸ່ມ "{g}"',sp_used_by:'ໃຊ້ກັບ {s} ຢູ່',sp_stk_has:'ລະບົບນັບສະຕັອກໃຊ້ກຸ່ມ "{g}" ກັບຮ້ານນີ້',sp_stk_use:'ໃຊ້ກຸ່ມດຽວກັນ',
  sp_test:'🔔 ທົດສອບສົ່ງ',sp_test_ok:'ສົ່ງຂໍ້ຄວາມທົດສອບເຂົ້າກຸ່ມ {g} ແລ້ວ',sp_test_txt:'🔔 ทดสอบส่งจากระบบครัวกลาง (JJ ครัวกลาง)\nร้าน: {s}\nเห็นข้อความนี้ = ตั้งกลุ่มไลน์ถูกต้อง ✅',
  sp_line_saved:'ຕັ້ງກຸ່ມໄລນ໌ "{g}" ແລ້ວ',sp_line_cleared:'ເອົາກຸ່ມໄລນ໌ອອກແລ້ວ',sp_items:'ວັດຖຸດິບທີ່ຊື້ຮ້ານນີ້',sp_items_none:'ຍັງບໍ່ມີວັດຖຸດິບ — ກົດ ＋ ເພີ່ມວັດຖຸດິບເຂົ້າຮ້ານນີ້',
  sp_add_items:'＋ ເພີ່ມວັດຖຸດິບເຂົ້າຮ້ານນີ້',sp_new_item:'＋ ວັດຖຸດິບໃໝ່',sp_item_off_q:'ເອົາ "{n}" ອອກຈາກຮ້ານ {s}?',sp_pick_hint:'ແຕະເລືອກວັດຖຸດິບທີ່ຊື້ຈາກຮ້ານ {s} ແລ້ວກົດປຸ່ມດ້ານລຸ່ມ',
  sp_now_at:'ຕອນນີ້ຊື້ທີ່ {s}',sp_no_shop:'ຍັງບໍ່ມີຮ້ານ',sp_pick_none:'ວັດຖຸດິບທຸກຢ່າງຢູ່ຮ້ານນີ້ແລ້ວ',sp_pick_go:'ເພີ່ມ {n} ຢ່າງ',sp_move_q:'ມີ {n} ຢ່າງທີ່ຊື້ຮ້ານອື່ນຢູ່ — ຍ້າຍມາຊື້ຮ້ານ {s} ແທນແມ່ນບໍ່?',
  sp_added:'ເພີ່ມ {n} ຢ່າງເຂົ້າຮ້ານແລ້ວ',sp_info:'ຂໍ້ມູນຮ້ານ',sp_edit_info:'ແກ້ຂໍ້ມູນຮ້ານ',sp_dup:'ມີຮ້ານຊື່ນີ້ຢູ່ແລ້ວ',sp_del:'🗑 ລຶບຮ້ານ',
  sp_del_q:'ລຶບຮ້ານ {s}?\nວັດຖຸດິບ {n} ຢ່າງຂອງຮ້ານນີ້ຈະກາຍເປັນ "ຍັງບໍ່ລະບຸຮ້ານ"',sp_phone:'ເບີໂທ',sp_credit:'ເຄຣດິດ (ມື້)',sp_credit_hint:'0 = ຈ່າຍທັນທີ · 30 = ຈ່າຍພາຍໃນ 30 ມື້ຫຼັງຮັບເຄື່ອງ',
  sp_pay_now:'ຈ່າຍທັນທີ',sp_pay_credit:'ເຄຣດິດ {n} ມື້',sp_days:'ມື້ທີ່ສັ່ງໄດ້',sp_days_hint:'ບໍ່ເລືອກ = ສັ່ງໄດ້ທຸກມື້',sp_days_any:'ສັ່ງໄດ້ທຸກມື້',sp_lead:'ລໍຖ້າເຄື່ອງ (ມື້)',sp_lead_hint:'ສັ່ງມື້ນີ້ ເຄື່ອງມາອີກຈັກມື້',
  sp_lead_s:'ລໍ {n} ມື້',sp_off:'🗄️ ບໍ່ໃຊ້ແລ້ວ',sp_off_chip:'ບໍ່ໃຊ້ແລ້ວ',sp_off_q:'ເຊື່ອງຮ້ານ "{s}" ເພາະບໍ່ໃຊ້ແລ້ວ? ປະຫວັດຍັງຢູ່ ກັບມາໃຊ້ໄດ້ທຸກເມື່ອ',sp_restore:'↩️ ໃຊ້ຕໍ່',
  sp_line_after:'ບັນທຶກແລ້ວ — ຕັ້ງກຸ່ມໄລນ໌ຂອງຮ້ານໄດ້ເລີຍ',sp_groups_none:'ຍັງບໍ່ມີກຸ່ມໄລນ໌ໃຫ້ເລືອກ',sp_sync_fail:'ດຶງກຸ່ມໄລນ໌ບໍ່ໄດ້ — ລອງໃໝ່ພາຍຫຼັງ'},
my:{sp_hint:'မီးဖိုချောင်က ပစ္စည်းမှာသည့်ဆိုင်များ — ဆိုင်တစ်ဆိုင်ချင်းစီ၏ LINE အုပ်စုကို သတ်မှတ်ထားပါ၊ မှာလိုက်လျှင် အော်ဒါစာ အဲဒီအုပ်စုထဲ တိုက်ရိုက်ရောက်မည်',sp_bot:'LINE ဘော့ — စတော့ရေတွက်စနစ်နှင့် တစ်ကောင်တည်း',
  sp_bot_txt:'ဘော့သည် အုပ်စု {n} ခုတွင်ရှိ · ဆိုင် {b} ဆိုင်တွင် {a} ဆိုင် အုပ်စုသတ်မှတ်ပြီး',sp_lg_sync:'LINE အုပ်စုများ ပြန်ဆွဲယူရန်',sp_lg_syncing:'LINE အုပ်စုများ ဆွဲယူနေသည်…',sp_lg_found:'အုပ်စု {n} ခု တွေ့သည် ✓',
  sp_lg_none:'LINE အုပ်စု မတွေ့သေးပါ — ဘော့ကို အုပ်စုထဲ ဖိတ်ပြီး အုပ်စုထဲ စာ 1 စောင် အရင်ပို့ပါ',sp_use_stock:'စတော့ရေတွက်စနစ်မှ LINE အုပ်စုများ သုံးရန် (ဆိုင် {n})',
  sp_use_stock_q:'စတော့ရေတွက်စနစ်တွင် ချိတ်ထားသည့်အတိုင်း ဆိုင် {n} ဆိုင်အတွက် LINE အုပ်စု သတ်မှတ်မလား?',sp_use_stock_ok:'ဆိုင် {n} ဆိုင်အတွက် LINE အုပ်စု သတ်မှတ်ပြီး',sp_how_q:'LINE အုပ်စုအသစ် ဘယ်လိုထည့်မလဲ?',
  sp_how1:'ဆိုင်နှင့် LINE အုပ်စုတစ်ခု ဖွဲ့ပါ (သို့မဟုတ် ရှိပြီးသားအုပ်စုကို သုံးပါ)',sp_how2:'ကျွန်ုပ်တို့၏ ဘော့ကို အုပ်စုထဲ ဖိတ်ပါ — စတော့ရေတွက်စနစ် သုံးသည့် ဘော့နှင့် တစ်ကောင်တည်း',
  sp_how3:'အုပ်စုထဲ ဘာစာမဆို 1 စောင် ပို့ပါ (ဘော့က အုပ်စုကို သိရန်)',sp_how4:'ပြန်လာပြီး 🔄 LINE အုပ်စုများ ပြန်ဆွဲယူရန် ကိုနှိပ်ကာ ဆိုင်အတွက် အုပ်စုရွေးပါ',
  sp_new:'ဆိုင်အသစ် ထည့်ရန်',sp_none:'ဆိုင် မရှိသေးပါ — ＋ ဆိုင်အသစ် ထည့်ရန် ကိုနှိပ်ပါ',sp_no_match:'ရှာသည့်ဆိုင် မတွေ့ပါ',sp_no_line:'LINE အုပ်စု မသတ်မှတ်ရသေး',
  sp_no_line_long:'LINE အုပ်စု မသတ်မှတ်ရသေး — မှာတိုင်း အုပ်စုကို ကိုယ်တိုင်ရွေးရမည်',sp_items_n:'ကုန်ကြမ်း {n} မျိုး',sp_orphans:'ကုန်ကြမ်းတွင် နာမည်ပါသော်လည်း ဆိုင်အဖြစ် မထည့်ရသေးသည့် ဆိုင်များ',sp_add_this:'ဤဆိုင်ကို ထည့်ရန်',
  sp_line:'ဆိုင်၏ LINE အုပ်စု',sp_line_on:'အော်ဒါများ "{g}" သို့ ရောက်မည်',sp_used_by:'{s} အတွက် သုံးနေသည်',sp_stk_has:'စတော့ရေတွက်စနစ်က ဤဆိုင်အတွက် "{g}" ကို သုံးသည်',sp_stk_use:'အုပ်စုတူကို သုံးရန်',
  sp_test:'🔔 စမ်းပို့ရန်',sp_test_ok:'{g} သို့ စမ်းသပ်စာ ပို့ပြီး',sp_test_txt:'🔔 ทดสอบส่งจากระบบครัวกลาง (JJ ครัวกลาง)\nร้าน: {s}\nเห็นข้อความนี้ = ตั้งกลุ่มไลน์ถูกต้อง ✅',
  sp_line_saved:'LINE အုပ်စု "{g}" သတ်မှတ်ပြီး',sp_line_cleared:'LINE အုပ်စု ဖယ်ရှားပြီး',sp_items:'ဤဆိုင်မှ ဝယ်သည့် ကုန်ကြမ်းများ',sp_items_none:'ကုန်ကြမ်း မရှိသေးပါ — ＋ ဤဆိုင်သို့ ကုန်ကြမ်းထည့်ရန် ကိုနှိပ်ပါ',
  sp_add_items:'＋ ဤဆိုင်သို့ ကုန်ကြမ်းထည့်ရန်',sp_new_item:'＋ ကုန်ကြမ်းအသစ်',sp_item_off_q:'"{n}" ကို {s} မှ ဖယ်မလား?',sp_pick_hint:'{s} မှ ဝယ်သည့် ကုန်ကြမ်းများကို နှိပ်ရွေးပြီး အောက်ရှိခလုတ်ကို နှိပ်ပါ',
  sp_now_at:'လောလောဆယ် {s} တွင် ဝယ်သည်',sp_no_shop:'ဆိုင် မရှိသေး',sp_pick_none:'ကုန်ကြမ်းအားလုံး ဤဆိုင်တွင် ရှိပြီးသား',sp_pick_go:'{n} မျိုး ထည့်ရန်',sp_move_q:'{n} မျိုးကို အခြားဆိုင်တွင် ဝယ်နေသည် — {s} သို့ ပြောင်းမလား?',
  sp_added:'ဆိုင်ထဲသို့ {n} မျိုး ထည့်ပြီး',sp_info:'ဆိုင်အချက်အလက်',sp_edit_info:'ဆိုင်အချက်အလက် ပြင်ရန်',sp_dup:'ဤအမည်ဖြင့် ဆိုင်ရှိပြီးသား',sp_del:'🗑 ဆိုင်ဖျက်',
  sp_del_q:'{s} ကို ဖျက်မလား?\nဤဆိုင်၏ ကုန်ကြမ်း {n} မျိုးသည် "ဆိုင် မသတ်မှတ်ရသေး" ဖြစ်သွားမည်',sp_phone:'ဖုန်း',sp_credit:'အကြွေး (ရက်)',sp_credit_hint:'0 = ချက်ချင်းပေး · 30 = လက်ခံပြီး 30 ရက်အတွင်းပေး',
  sp_pay_now:'ချက်ချင်းပေး',sp_pay_credit:'အကြွေး {n} ရက်',sp_days:'မှာနိုင်သည့်ရက်',sp_days_hint:'မရွေးလျှင် = နေ့တိုင်း',sp_days_any:'နေ့တိုင်း မှာနိုင်',sp_lead:'ပစ္စည်းရောက်ရန် (ရက်)',sp_lead_hint:'ယနေ့မှာလျှင် ဘယ်နှရက်နောက် ရောက်မည်',
  sp_lead_s:'{n} ရက် စောင့်',sp_off:'🗄️ မသုံးတော့',sp_off_chip:'မသုံးတော့',sp_off_q:'ဆိုင် "{s}" ကို မသုံးတော့၍ ဝှက်မလား? မှတ်တမ်းကျန်ပြီး အချိန်မရွေး ပြန်သုံးနိုင်သည်',sp_restore:'↩️ ပြန်သုံး',
  sp_line_after:'သိမ်းပြီး — ဆိုင်၏ LINE အုပ်စုကို ယခု သတ်မှတ်ပါ',sp_groups_none:'ရွေးရန် LINE အုပ်စု မရှိသေးပါ',sp_sync_fail:'LINE အုပ်စုများ ဆွဲယူ၍မရပါ — နောက်မှ ထပ်စမ်းပါ'}
});
CSS.add(`
.spcard .mthumb{background:#FBF6EA}.spcard.spoff{opacity:.62}
.spline{border-radius:12px;padding:10px 12px;font-size:14px;font-weight:600;margin-bottom:8px}
.spline.ok{background:var(--ok-t);color:var(--ok)}.spline.bad{background:var(--gold-t);color:var(--gold)}
.sprow{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--line)}.sprow:last-child{border-bottom:0}
.sprow .x{width:44px;height:44px;min-height:44px;border-radius:10px;border:1.5px solid var(--line);background:#fff;color:var(--mut);font-size:18px;padding:0;flex:none}
.wdpick{display:flex;gap:5px;flex-wrap:wrap}
.wdpick button{min-width:44px;height:44px;min-height:44px;border-radius:10px;border:1.5px solid var(--line);background:#fff;font-weight:700;font-family:var(--fh);padding:0 8px;flex:1}
.wdpick button.on{background:var(--wine);border-color:var(--wine);color:#fff}
.sppick{display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid var(--line);cursor:pointer;min-height:52px}
.sppick .ck{width:26px;height:26px;border-radius:8px;border:2px solid var(--line);display:grid;place-items:center;flex:none;font-size:15px;color:#fff}
.sppick.on .ck{background:var(--ok);border-color:var(--ok)}
.sphow{margin-top:8px;font-size:13px}.sphow summary{cursor:pointer;font-weight:600;color:var(--wine);min-height:44px;display:flex;align-items:center}
.sphow ol{margin:6px 0 0;padding-left:20px;line-height:1.6}
.spsec{font-family:var(--fh);font-weight:700;color:var(--wine);margin:14px 0 6px;font-size:15px}
`);
let SP_Q='';
let SP=null;        // {id} หน้าร้านที่เปิดอยู่
let SP_STK=null;    // ซัพของแอพนับสต๊อก (suppliers · อ่านอย่างเดียว) — null = ยังไม่โหลด
let SP_PICK=null;   // {sel:{}, q:''} ตอนเลือกวัตถุดิบเข้าร้าน
const SP_SYNC_MS=6*3600*1000;   // คีย์ jjsc_lgsync ใช้ร่วมกับแอพนับสต๊อก (โดเมนเดียวกัน) — ไม่ดึงซ้ำ
function spItemsOf(name){const k=supKey(name);return k?activeItems().filter(i=>supKey(i.sup)===k):[];}
function spActive(){return S.sups.filter(s=>s.active!==false);}
async function spStkLoad(force){ // suppliers ของแอพนับสต๊อก — เอากลุ่มไลน์ที่ผูกไว้มาแนะนำ (อ่านอย่างเดียว ห้ามเขียน)
  if(SP_STK&&!force)return SP_STK;let r=null;try{r=await sb.from('suppliers').select('name,line_group_id');}catch(e){r=null;}
  SP_STK=(r&&!r.error&&Array.isArray(r.data))?r.data:[];return SP_STK;}
function spStkGroup(name){const k=supKey(name);if(!k)return null;const x=(SP_STK||[]).find(s=>supKey(s.name)===k&&s.line_group_id);return x?String(x.line_group_id):null;}
function spFromStk(){return spActive().filter(s=>!s.line_group_id&&spStkGroup(s.name));}
function spOrphans(){const have=new Set(S.sups.map(s=>supKey(s.name)));const out=[];
  activeItems().forEach(i=>{const n=String(i.sup||'').trim();if(n&&!have.has(supKey(n))&&!out.some(x=>supKey(x)===supKey(n)))out.push(n);});
  return out.sort((a,b)=>a.localeCompare(b,'th'));}
function spDays(s){return Array.isArray(s&&s.order_days)?s.order_days.map(Number).filter(d=>d>=0&&d<=6):[];}
function spDaysTxt(s){const d=spDays(s);return (!d.length||d.length>=7)?t('sp_days_any'):d.map(i=>t('wd')[i]).join(' ');}
function spMetaTxt(s){const c=Math.max(0,parseInt(s.credit_days,10)||0),l=s.lead_days==null?1:Math.max(0,parseInt(s.lead_days,10)||0);
  return '🥬 '+t('sp_items_n',{n:spItemsOf(s.name).length})+' · 💳 '+(c>0?t('sp_pay_credit',{n:c}):t('sp_pay_now'))+' · 📅 '+spDaysTxt(s)+' · 🚚 '+t('sp_lead_s',{n:l});}

/* ---------- รายการร้าน ---------- */
RENDER.sups=function(el){
  const K=canKitchen(),sups=spActive(),withG=sups.filter(s=>s.line_group_id).length,nOff=S.sups.length-sups.length;
  let h=dhead('🏷️ '+t('nav_sups'),esc(sups.length))+sqlNeedBox()+'<div class="note">'+esc(t('sp_hint'))+'</div>';
  h+=card('🤖 '+esc(t('sp_bot')),'<div class="sm" id="spBotTxt">'+esc(t('sp_bot_txt',{n:(S.lineGroups||[]).length,a:withG,b:sups.length}))+'</div>'+
    (K?'<div class="row" style="margin-top:8px" id="spBotBtns">'+spBotBtnsHtml()+'</div>':'')+
    '<details class="sphow"><summary>❓ '+esc(t('sp_how_q'))+'</summary><ol>'+[1,2,3,4].map(i=>'<li>'+esc(t('sp_how'+i))+'</li>').join('')+'</ol></details>');
  if(K)h+='<button class="btn big" style="margin-bottom:12px" onclick="spEdit()">＋ '+esc(t('sp_new'))+'</button>';
  h+=searchBox('spQ','spSearch')+'<div id="spList"></div>';
  const orph=spOrphans();
  if(orph.length)h+='<div class="spsec">🏷️ '+esc(t('sp_orphans'))+'</div>'+orph.map(n=>'<div class="card"><div class="row"><div class="mthumb">🏷️</div><div class="grow"><div class="b">'+esc(n)+'</div><div class="xs mut">🥬 '+esc(t('sp_items_n',{n:spItemsOf(n).length}))+'</div></div>'+
    (K?'<button class="btn ok sm2" data-n="'+esc(n)+'" onclick="spAddName(this.dataset.n)">＋ '+esc(t('sp_add_this'))+'</button>':'')+'</div></div>').join('');
  if(nOff)h+='<details class="sphow" id="spOffBox"><summary>🗄️ '+esc(t('sp_off_chip'))+' <span class="bdg chip mid">'+nOff+'</span></summary>'+
    S.sups.filter(s=>s.active===false).map(s=>'<div class="rowline"><div class="grow b">'+esc(s.name)+'</div>'+(K?'<button class="btn gh sm2" data-id="'+esc(s.id)+'" onclick="spActiveSet(this.dataset.id,true)">'+esc(t('sp_restore'))+'</button>':'')+'</div>').join('')+'</details>';
  el.innerHTML=h;const q=document.getElementById('spQ');if(q)q.value=SP_Q;spPaintList();
  if(SP_STK==null)spStkLoad().then(()=>{const b=document.getElementById('spBotBtns');if(b&&S.tab==='sups')b.innerHTML=spBotBtnsHtml();});
  spAutoSync();
};
function spBotBtnsHtml(){const n=spFromStk().length;return '<button class="btn gh sm2" onclick="spSync()">🔄 '+esc(t('sp_lg_sync'))+'</button>'+
  (n?'<button class="btn ok sm2" onclick="spUseStock()">📥 '+esc(t('sp_use_stock',{n}))+'</button>':'');}
function spSearch(v){SP_Q=v||'';spPaintList();}
function spPaintList(){
  const box=document.getElementById('spList');if(!box)return;
  const q=supKey(SP_Q),K=canKitchen();
  const list=spActive().filter(s=>!q||supKey(s.name).includes(q)).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'th'));
  if(!list.length){box.innerHTML='<div class="card"><div class="empty">'+esc(t(q?'sp_no_match':'sp_none'))+'</div></div>';return;}
  box.innerHTML=list.map(s=>{const g=s.line_group_id?String(s.line_group_id):'';
    return '<div class="card tap spcard" data-id="'+esc(s.id)+'" onclick="spOpen(this.dataset.id)"><div class="row" style="flex-wrap:nowrap"><div class="mthumb">🏷️</div>'+
      '<div class="grow"><div class="b">'+esc(s.name)+'</div><div class="sm '+(g?'green':'amber')+'">'+(g?'💬 '+esc(lgName(g)):'⚠ '+esc(t('sp_no_line')))+'</div>'+
      '<div class="xs mut">'+esc(spMetaTxt(s))+'</div></div><span class="mut" style="font-size:22px">›</span></div></div>';}).join('');
}
async function spSync(auto){ // ดึงกลุ่มที่บอทอยู่ (Edge Function ของแอพนับสต๊อก) แล้วอ่าน line_groups ใหม่
  if(spSync._on)return;spSync._on=true;
  if(!auto)toast('⏳ '+t('sp_lg_syncing'));
  const before=JSON.stringify((S.lineGroups||[]).map(g=>[g.group_id,g.name]));
  const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),12000);   // ฟังก์ชันไม่ตอบ = ไม่ค้าง
  try{await fetch(SB_URL+'/functions/v1/sync-line-groups',{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_ANON,Authorization:'Bearer '+SB_ANON},body:'{}',signal:ctl.signal});}catch(e){}
  clearTimeout(tm);
  try{await lineGroupsLoad(true);}catch(e){}
  try{localStorage.setItem('jjsc_lgsync',String(Date.now()));}catch(e){}
  spSync._on=false;const n=(S.lineGroups||[]).length;
  if(!auto)toast(n?t('sp_lg_found',{n}):t('sp_lg_none'),!n);
  const after=JSON.stringify((S.lineGroups||[]).map(g=>[g.group_id,g.name]));
  if(!auto||after!==before)spRepaint();}
function spAutoSync(){let last=0;try{last=+(localStorage.getItem('jjsc_lgsync')||0)||0;}catch(e){}if(Date.now()-last>=SP_SYNC_MS)spSync(true);}
function spRepaint(){if(S.tab==='sups'&&!modalOpen())show('sups');else if(SP&&modalOpen()&&document.querySelector('#modalBox [data-sp]'))spPaint();}
async function spUseStock(){ // ร้านชื่อเดียวกับในแอพนับสต๊อก → ใช้กลุ่มไลน์เดียวกัน (เขียนเฉพาะ ck_sups)
  if(!canKitchen())return;await spStkLoad();const list=spFromStk();if(!list.length)return;
  if(!await confirm2(t('sp_use_stock_q',{n:list.length})))return;
  await once(async()=>{let n=0;for(const s of list){const g=spStkGroup(s.name);await spWrite(x=>sb.from('ck_sups').update(x).eq('id',s.id),{line_group_id:g});s.line_group_id=g;n++;}
    toast(t('sp_use_stock_ok',{n}));if(S.tab==='sups')show('sups');});}
async function spWrite(build,row){return (typeof itWrite==='function')?itWrite(build,row):db(()=>build(row));}

/* ---------- หน้าร้าน ---------- */
async function spOpen(id){const s=supById(id);if(!s)return;SP={id};if(SP_STK==null){spPaint();await spStkLoad();if(SP&&SP.id===id&&modalOpen())spPaint();}else spPaint();}
function spPaint(){
  const s=SP&&supById(SP.id);if(!s){SP=null;MODAL_BACK=null;closeModal();return;}
  const K=canKitchen(),gid=s.line_group_id?String(s.line_group_id):'';
  const gl=(S.lineGroups||[]).slice().sort((a,b)=>lgName(a.group_id).localeCompare(lgName(b.group_id),'th'));
  const stk=spStkGroup(s.name),its=spItemsOf(s.name).sort((a,b)=>dispName(a).localeCompare(dispName(b),'th'));
  let h='<div data-sp="1"></div><div class="row" style="margin-bottom:10px"><h3 class="grow" style="margin:0">🏷️ '+esc(s.name)+'</h3><button class="btn gh sm2" onclick="spClose()">✕ '+esc(t('close'))+'</button></div>';
  h+='<div class="spsec">💬 '+esc(t('sp_line'))+'</div><div class="spline '+(gid?'ok':'bad')+'">'+(gid?'✓ '+esc(t('sp_line_on',{g:lgName(gid)})):'⚠ '+esc(t('sp_no_line_long')))+'</div>';
  if(K){h+='<select id="spG" onchange="spSetGroup(this.value)"><option value="">'+esc(t('sp_no_line'))+'</option>'+
      gl.map(g=>{const used=spActive().filter(x=>x.id!==s.id&&String(x.line_group_id||'')===String(g.group_id)).map(x=>x.name);
        return '<option value="'+esc(g.group_id)+'"'+(String(g.group_id)===gid?' selected':'')+'>'+esc(lgName(g.group_id))+(used.length?' · '+esc(t('sp_used_by',{s:used.slice(0,2).join(', ')+(used.length>2?' …':'')})):'')+'</option>';}).join('')+
      (gid&&!gl.some(g=>String(g.group_id)===gid)?'<option value="'+esc(gid)+'" selected>'+esc(lgName(gid))+'</option>':'')+'</select>';
    if(!gl.length)h+='<div class="hintbox">'+esc(t('sp_lg_none'))+'</div>';
    if(stk&&stk!==gid)h+='<div class="okbox row">📦 '+esc(t('sp_stk_has',{g:lgName(stk)}))+'<button class="btn ok sm2" style="margin-left:auto" data-g="'+esc(stk)+'" onclick="spSetGroup(this.dataset.g)">'+esc(t('sp_stk_use'))+'</button></div>';
    h+='<div class="row" style="margin-top:8px"><button class="btn gh sm2" onclick="spTest()"'+(gid?'':' disabled')+'>'+esc(t('sp_test'))+'</button><button class="btn gh sm2" onclick="spSync()">🔄 '+esc(t('sp_lg_sync'))+'</button></div>';}
  h+='<div class="spsec">🥬 '+esc(t('sp_items'))+' <span class="bdg chip mid">'+its.length+'</span></div>';
  h+=its.length?'<div>'+its.map(i=>{const c=itemCost(i);return '<div class="sprow">'+thumbHtml(i,(typeof itIcon==='function')?itIcon(i):'🥬')+'<div class="grow"><div class="b">'+esc(dispName(i))+'</div><div class="xs mut">'+fmtQ(i.qty)+' '+esc(trUnit(i.unit))+(c!=null?' · ฿'+fmtQ(c)+'/'+esc(trUnit(i.unit)):'')+'</div></div>'+
      (K?'<button class="x" data-id="'+esc(i.id)+'" onclick="spItemOff(this.dataset.id)" aria-label="remove">✕</button>':'')+'</div>';}).join('')+'</div>'
    :'<div class="empty" style="padding:12px">'+esc(t('sp_items_none'))+'</div>';
  if(K)h+='<div class="row" style="margin-top:8px"><button class="btn gh sm2" onclick="spPick()">'+esc(t('sp_add_items'))+'</button><button class="btn gh sm2" onclick="spNewItem()">'+esc(t('sp_new_item'))+'</button></div>';
  h+='<div class="spsec">📝 '+esc(t('sp_info'))+'</div><div class="sm">'+(s.phone?'📞 '+esc(s.phone)+'<br>':'')+esc(spMetaTxt(s))+(s.note?'<br>📝 '+esc(s.note):'')+'</div>';
  if(K)h+='<div class="row" style="margin-top:10px"><button class="btn gh" onclick="spEdit(\''+esc(s.id)+'\')">✎ '+esc(t('sp_edit_info'))+'</button></div>';
  MODAL_BACK=null;openModal(h,'task');
}
function spClose(){SP=null;MODAL_BACK=null;closeModal();if(S.tab==='sups')show('sups');}
async function spSetGroup(v){ // เลือกแล้วบันทึกทันที
  const s=SP&&supById(SP.id);if(!s||!canKitchen())return;v=String(v||'').trim()||null;
  await once(async()=>{await spWrite(x=>sb.from('ck_sups').update(x).eq('id',s.id),{line_group_id:v});s.line_group_id=v;
    toast(v?t('sp_line_saved',{g:lgName(v)}):t('sp_line_cleared'));spPaint();});}
function spTestText(s){return t('sp_test_txt',{s:s.name})+'\n'+thDate(bizTodayISO())+' '+dispTime(new Date().toISOString());}
async function spTest(){const s=SP&&supById(SP.id);if(!s)return;const g=document.getElementById('spG'),gid=String((g&&g.value)||s.line_group_id||'');
  if(!gid){toast(t('line_no_group'),true);return;}
  await once(async()=>{try{await lineSend(gid,spTestText(s));toast(t('sp_test_ok',{g:lgName(gid)}));}catch(e){toast(t('line_fail')+': '+((e&&e.message)||e),true);}});}
async function spItemOff(id){const s=SP&&supById(SP.id),it=itemById(id);if(!s||!it||!canKitchen())return;
  if(!await confirm2(t('sp_item_off_q',{n:dispName(it),s:s.name})))return;
  await once(async()=>{await db(()=>sb.from('ck_items').update({sup:''}).eq('id',id));it.sup='';spPaint();});}
function spNewItem(){const s=SP&&supById(SP.id);if(!s||typeof itEdit!=='function')return;itEdit(null,{sup:s.name,back:()=>spPaint()});}
function spPick(){const s=SP&&supById(SP.id);if(!s)return;SP_PICK={sel:{},q:''};spPickPaint();}
function spPickPaint(){
  const s=SP&&supById(SP.id),P=SP_PICK;if(!s||!P)return;
  const q=supKey(P.q),k=supKey(s.name);
  const list=activeItems().filter(i=>supKey(i.sup)!==k&&(!q||supKey(i.name).includes(q)||supKey(dispName(i)).includes(q)))
    .sort((a,b)=>((a.sup?1:0)-(b.sup?1:0))||dispName(a).localeCompare(dispName(b),'th'));   // ที่ยังไม่มีร้านขึ้นก่อน
  const n=Object.keys(P.sel).filter(x=>P.sel[x]).length;
  let h='<h3>'+esc(t('sp_add_items'))+' · '+esc(s.name)+'</h3><div class="hintbox">'+esc(t('sp_pick_hint',{s:s.name}))+'</div>'+
    '<input class="srch" id="spPq" type="search" placeholder="'+esc(t('search'))+'" value="'+esc(P.q)+'" oninput="SP_PICK.q=this.value;spPickList()" autocomplete="off"><div id="spPickList"></div>'+
    '<div class="row" style="margin-top:12px"><button class="btn gh" onclick="spPickBack()">'+esc(t('back'))+'</button><button class="btn ok grow" id="spPickGo" onclick="spPickGo()"'+(n?'':' disabled')+'>'+esc(t('sp_pick_go',{n}))+'</button></div>';
  MODAL_BACK=null;openModal(h,'task');spPickList(list);
}
function spPickList(list){
  const s=SP&&supById(SP.id),P=SP_PICK,box=document.getElementById('spPickList');if(!s||!P||!box)return;
  if(!list){const q=supKey(P.q),k=supKey(s.name);list=activeItems().filter(i=>supKey(i.sup)!==k&&(!q||supKey(i.name).includes(q)||supKey(dispName(i)).includes(q))).sort((a,b)=>((a.sup?1:0)-(b.sup?1:0))||dispName(a).localeCompare(dispName(b),'th'));}
  box.innerHTML=list.length?list.map(i=>'<div class="sppick'+(P.sel[i.id]?' on':'')+'" data-id="'+esc(i.id)+'" onclick="spPickToggle(this.dataset.id,this)"><span class="ck">✓</span><div class="grow"><div class="b">'+esc(dispName(i))+'</div><div class="xs '+(i.sup?'amber':'mut')+'">'+esc(i.sup?t('sp_now_at',{s:i.sup}):t('sp_no_shop'))+'</div></div></div>').join('')
    :'<div class="empty">'+esc(t('sp_pick_none'))+'</div>';
}
function spPickToggle(id,el){const P=SP_PICK;if(!P)return;P.sel[id]=!P.sel[id];if(el)el.classList.toggle('on',!!P.sel[id]);
  const n=Object.keys(P.sel).filter(x=>P.sel[x]).length,b=document.getElementById('spPickGo');if(b){b.textContent=t('sp_pick_go',{n});b.disabled=!n;}}
function spPickBack(){SP_PICK=null;spPaint();}
async function spPickGo(){
  const s=SP&&supById(SP.id),P=SP_PICK;if(!s||!P||!canKitchen())return;
  const ids=Object.keys(P.sel).filter(x=>P.sel[x]&&itemById(x));if(!ids.length)return;
  const moved=ids.filter(x=>String(itemById(x).sup||'').trim());
  if(moved.length&&!await confirm2(t('sp_move_q',{n:moved.length,s:s.name})))return;
  await once(async()=>{await db(()=>sb.from('ck_items').update({sup:s.name}).in('id',ids));ids.forEach(x=>{itemById(x).sup=s.name;});
    toast(t('sp_added',{n:ids.length}));SP_PICK=null;spPaint();});
}

/* ---------- ข้อมูลร้าน (ฟอร์ม) ---------- */
function spEdit(id){
  if(!canKitchen())return;const s=id?supById(id):null;if(id&&!s)return;
  const days=spDays(s);
  let h='<h3>🏷️ '+esc(s?t('sp_edit_info'):t('sp_new'))+'</h3>'+
    fld(t('name'),'<input id="spName" value="'+esc(s?s.name:'')+'">')+
    fld(t('sp_phone'),'<input id="spPhone" type="tel" inputmode="tel" value="'+esc(s?s.phone||'':'')+'">')+
    '<div class="grid2">'+fld(t('sp_credit'),'<input id="spCredit" type="text" inputmode="numeric" value="'+(s?Math.max(0,parseInt(s.credit_days,10)||0):0)+'"><div class="xs mut">'+esc(t('sp_credit_hint'))+'</div>')+
      fld(t('sp_lead'),'<input id="spLead" type="text" inputmode="numeric" value="'+(s&&s.lead_days!=null?Math.max(0,parseInt(s.lead_days,10)||0):1)+'"><div class="xs mut">'+esc(t('sp_lead_hint'))+'</div>')+'</div>'+
    fld('📅 '+t('sp_days'),'<div class="wdpick" id="spDays">'+t('wd').map((w,i)=>'<button type="button" data-d="'+i+'" class="'+(days.includes(i)?'on':'')+'" onclick="this.classList.toggle(\'on\')">'+esc(w)+'</button>').join('')+'</div><div class="xs mut">'+esc(t('sp_days_hint'))+'</div>')+
    fld(t('note'),'<input id="spNote" value="'+esc(s?s.note||'':'')+'">')+
    '<div class="row" style="margin-top:12px">'+(s?'<button class="btn gh" onclick="spActiveSet(\''+esc(s.id)+'\','+(s.active===false?'true':'false')+')">'+esc(s.active===false?t('sp_restore'):t('sp_off'))+'</button>'+
      (isAdminish()?'<button class="btn gh" onclick="spDel(\''+esc(s.id)+'\')">'+esc(t('sp_del'))+'</button>':''):'')+
    '<button class="btn big grow" style="min-width:140px" onclick="spSave(\''+esc(s?s.id:'')+'\')">💾 '+esc(t('save'))+'</button></div>';
  MODAL_BACK=(s&&SP&&SP.id===s.id)?()=>spPaint():null;openModal(h);
}
async function spSave(id){
  if(!canKitchen())return;
  await once(async()=>{
    const name=String(document.getElementById('spName').value||'').trim();if(!name){toast(t('need_name'),true);return;}
    if(S.sups.some(x=>x.id!==id&&supKey(x.name)===supKey(name))){toast(t('sp_dup'),true);return;}
    const days=[...document.querySelectorAll('#spDays button.on')].map(b=>+b.dataset.d).sort((a,b)=>a-b);
    const row={name,phone:String(document.getElementById('spPhone').value||'').trim()||null,credit_days:Math.max(0,parseInt(document.getElementById('spCredit').value,10)||0),
      lead_days:Math.max(0,parseInt(document.getElementById('spLead').value,10)||0),order_days:(days.length&&days.length<7)?days:null,note:String(document.getElementById('spNote').value||'').trim()||null};
    let s=id?supById(id):null,isNew=!s;
    if(s){const old=s.name;await spWrite(x=>sb.from('ck_sups').update(x).eq('id',s.id),row);Object.assign(s,row);if(old!==name)await spRenameCascade(s,old,name);}
    else{row.id=uid('sp');row.active=true;await spWrite(x=>sb.from('ck_sups').insert(x),row);if(!('active' in row))row.active=true;s=row;S.sups.push(s);}
    S.sups.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'th'));
    toast(isNew?t('sp_line_after'):t('sv_ok'));MODAL_BACK=null;closeModal();
    if(S.tab==='sups')show('sups');
    spOpen(s.id);   // บันทึกแล้วไปหน้าร้าน (ร้านใหม่ = ตั้งกลุ่มไลน์ต่อได้เลย)
  });
}
async function spRenameCascade(s,old,nw){ // เปลี่ยนชื่อร้าน = วัตถุดิบที่ซื้อร้านนี้ + ใบสั่งซื้อที่ยังไม่รับของ ตามชื่อใหม่ (บิลเก่าคงชื่อเดิม)
  const k=supKey(old),ids=S.items.filter(i=>supKey(i.sup)===k).map(i=>i.id);
  if(ids.length){await db(()=>sb.from('ck_items').update({sup:nw}).in('id',ids));S.items.forEach(i=>{if(ids.includes(i.id))i.sup=nw;});}
  try{await sb.from('kc_pos').update({sup_name:nw}).eq('sup_id',s.id).neq('status','received');}catch(e){}}
async function spEnsure(name){ // หาร้านตามชื่อ (ไม่สนตัวพิมพ์/ช่องว่าง) — ไม่มี = สร้างให้
  name=String(name||'').trim();if(!name)return null;const ex=supByName(name);if(ex)return ex;
  const row={id:uid('sp'),name,phone:null,credit_days:0,lead_days:1,order_days:null,note:null,active:true};
  await spWrite(x=>sb.from('ck_sups').insert(x),row);S.sups.push(row);S.sups.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'th'));return row;}
async function spAddName(name){if(!canKitchen())return;await once(async()=>{const s=await spEnsure(name);if(!s)return;toast(t('sv_ok'));if(S.tab==='sups')show('sups');spOpen(s.id);});}
async function spActiveSet(id,on){ // 🗄️ ไม่ใช้แล้ว / ↩️ ใช้ต่อ (ไม่ลบ)
  if(!canKitchen())return;const s=supById(id);if(!s)return;
  if(!on&&!await confirm2(t('sp_off_q',{s:s.name}),{ok:t('sp_off'),danger:true}))return;
  await once(async()=>{await spWrite(x=>sb.from('ck_sups').update(x).eq('id',id),{active:!!on});s.active=!!on;
    toast(on?t('sp_restore'):t('sp_off'));SP=null;MODAL_BACK=null;closeModal();if(S.tab==='sups')show('sups');});}
async function spDel(id){ // ลบถาวร — เฉพาะหัวหน้า
  if(!isAdminish())return;const s=supById(id);if(!s)return;const its=spItemsOf(s.name);
  if(!await confirm2(t('sp_del_q',{s:s.name,n:its.length}),{ok:t('delete'),danger:true}))return;
  await once(async()=>{
    if(its.length){await db(()=>sb.from('ck_items').update({sup:''}).in('id',its.map(i=>i.id)));its.forEach(i=>{i.sup='';});}
    await db(()=>sb.from('ck_sups').delete().eq('id',id));S.sups=S.sups.filter(x=>x.id!==id);
    SP=null;MODAL_BACK=null;closeModal();toast(t('done'));if(S.tab==='sups')show('sups');});}
