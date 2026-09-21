'use strict';
const { makeDb, makeClient, boot, sleep, ok, txt, noErr, click, change, pwHash, ticketFor, failures: getFailures } = require('./harness');
(async () => {
  console.log('\n[1] dashboard — daily / monthly / staff / settings');
  {
    const db = makeDb();
    /* วันทำการที่แดชบอร์ดเปิดมาโชว์ (ตัด 05:00 เวลาไทย — รัน npm test ด้วย TZ=Asia/Bangkok)
       ต้องคิดเองแบบเดียวกับแอป ไม่งั้นเทสจะพังเองตอนรันหลังเที่ยงคืน */
    const bz = new Date(); bz.setHours(bz.getHours() - 5);
    const bizToday = bz.getFullYear() + '-' + String(bz.getMonth() + 1).padStart(2, '0') + '-' + String(bz.getDate()).padStart(2, '0');
    const addResp = (dept, score) => {
      const id = db.nextId++;
      db.responses.push({ id, branch: 'JJRD', biz_date: bizToday, created_at: new Date().toISOString(), device: 'JJRD-x', staff_id: null });
      db.scores.push({ response_id: id, department_id: dept, score: score });
    };
    for (let i = 0; i < 40; i++) addResp(1, 5);                // ดันให้เกิน 30 ครั้ง ปุ่ม "ดูทั้งหมด" จะโผล่แน่
    addResp(1, 3);                                             // ข้อมูลเก่าที่ยังมีคะแนน 😐 → กราฟต้องคง 5 แท่ง
    const { w, d, client, errors } = boot('https://thananant.github.io/JJ-PnL/jjmk-kpi.html', db);
    await sleep(80);
    ok(!!d.querySelector('.hdr'), 'header rendered');
    ok(d.querySelectorAll('.tab').length === 4, '4 tabs');
    ok(noErr(d) && !!d.querySelector('.summary'), 'daily summary rendered');
    ok(d.querySelectorAll('.dept').length === 3, 'daily shows 3 active departments (inactive one without data hidden)');
    ok(/\d\.\d\d/.test(txt(d, '.gauge-num')), 'gauge shows average ' + txt(d, '.gauge-num'));
    ok(!!d.querySelector('.hours') && d.querySelectorAll('.hour-col').length === 18, 'hourly chart 11:00 → 04:00 = 18 columns');
    ok(d.querySelector('.hist') && d.querySelector('.hist').children.length === 5, 'กราฟยังมี 5 แท่งเมื่อข้อมูลเก่ามีคะแนน 😐 อยู่');
    ok(d.querySelectorAll('.lb-row').length >= 1, 'staff leaderboard (today) has rows');
    const nRecent = d.querySelectorAll('#recentCard tbody tr').length;
    ok(nRecent === 30, 'รายการล่าสุดแสดง ' + nRecent + ' แถว (เดิมตัน 15)');
    ok(d.querySelector('#recentCard h3').textContent.includes('ทั้งหมด'), 'บอกจำนวนครั้งทั้งหมดของวันนั้น');
    await click(w, d, '[data-act=toggleRecent]'); await sleep(60);
    const nAll = d.querySelectorAll('#recentCard tbody tr').length;
    ok(nAll > nRecent, 'กด "ดูทั้งหมด" แล้วเห็นครบ ' + nAll + ' แถว');
    await click(w, d, '[data-act=toggleRecent]'); await sleep(60);
    ok(d.querySelectorAll('#recentCard tbody tr').length === nRecent, 'กดย่อลงกลับมาเท่าเดิม');
    ok(d.querySelector('#app').textContent.includes('วันนี้'), 'today label');
    await click(w, d, '[data-act=prevDay]');
    ok(noErr(d) && d.querySelector('[data-act=today]'), 'prev day → "วันนี้" button appears');
    ok(d.querySelector('.delta.up, .delta.down, .delta.flat') !== null, 'delta vs yesterday computed');
    await change(w, d, '#branchSel', 'ALL');
    ok(noErr(d) && d.body.textContent.includes('เปรียบเทียบสาขา') && d.querySelectorAll('.card table tbody tr').length >= 2, 'ALL branches → comparison table');
    ok(w.localStorage.getItem('kpi_branch') === 'ALL', 'branch persisted');

    await click(w, d, '[data-tab=monthly]'); await sleep(60);
    ok(noErr(d) && !!d.querySelector('.trend'), 'monthly trend svg rendered');
    ok(d.querySelectorAll('.trend .dot').length >= 1, 'trend has dots');
    ok(d.querySelectorAll('.dow-c').length === 7, 'day-of-week 7 cells');
    ok(d.querySelectorAll('.mcol').length === 12, '12-month bars');
    ok(d.body.textContent.includes('พนักงานดีเด่นประจำเดือน'), 'staff of month card');
    ok(d.querySelector('#monthSel').options.length >= 24, 'month select has 24 options');
    await click(w, d, '[data-act=prevMonth]'); await sleep(60);
    ok(noErr(d) && !d.querySelector('[data-act=nextMonth]').disabled, 'prev month → next enabled');
    await click(w, d, '[data-act=exportCsv]'); await sleep(60);
    ok(/^jj-kpi-ALL-\d{4}-\d{2}\.csv$/.test(w._download || ''), 'csv download name ' + w._download);

    await click(w, d, '[data-tab=staff]'); await sleep(60);
    ok(noErr(d) && d.querySelectorAll('.lb-row').length >= 4, 'staff leaderboard month (ALL) rows=' + d.querySelectorAll('.lb-row').length);
    ok(txt(d, '.lb-rank.top') === '★', 'top rank star');
    await click(w, d, '[data-p=custom]'); await sleep(60);
    ok(!!d.querySelector('#staffFrom'), 'custom range inputs');
    await change(w, d, '#staffFrom', '2026-01-01'); await sleep(60);
    ok(noErr(d), 'custom range rerender ok');

    await click(w, d, '[data-tab=settings]');
    ok(d.querySelectorAll('#deptList .edit-row').length === 4 && d.querySelectorAll('#staffList .f-active').length === 4, 'settings: 4 depts + รายชื่อพนักงานที่เปิดใช้ (อ่านอย่างเดียว)');
    ok(d.body.textContent.includes('?kiosk=JJRD') && d.body.textContent.includes('?kiosk=JJLP'), 'kiosk links shown');
    await click(w, d, '[data-act=addDept]');
    d.querySelector('#deptList .edit-row:last-child .f-name').value = 'ที่จอดรถ';
    await click(w, d, '#deptList .edit-row:last-child [data-act=rowUp]');
    ok(d.querySelectorAll('#deptList .edit-row')[3].querySelector('.f-name').value === 'ที่จอดรถ', 'new dept moved up one');
    await click(w, d, '[data-act=saveDepts]'); await sleep(80);
    ok(db.departments.length === 5 && db.departments.find(x => x.name === 'ที่จอดรถ').sort_order === 4, 'dept saved with sort_order 4');
    ok(db.departments.find(x => x.id === 4).sort_order === 5, 'existing dept re-ordered to 5');
    await change(w, d, '#setBranch', 'JJLP');
    ok(d.querySelectorAll('#staffList .f-active').length === 2, 'กรองรายชื่อตามสาขาได้');
    ok(!d.querySelector('[data-act=addStaff]'), 'ไม่มีปุ่มเพิ่มพนักงานมือแล้ว (ต้องมาจากระบบเงินเดือน)');
    /* ซ่อนรายคนเป็นกรณียกเว้น — ติ๊กออกแล้วบันทึก */
    const cb = d.querySelector('#staffList .f-active');
    const hideId = Number(cb.dataset.id); cb.checked = false;
    await click(w, d, '[data-act=saveStaff]'); await sleep(80);
    ok(db.staff.find(x => x.id === hideId).active === false, 'ติ๊กออก = ซ่อนรายคนได้');
    await click(w, d, '[data-act=openKioskB]');
    ok(/\?kiosk=JJRD$/.test(w._opened || ''), 'open kiosk link: ' + w._opened);
    ok(errors.length === 0, 'no jsdom errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  }

  {
    /* ข้อมูลใหม่ล้วน (ไม่มีคะแนน 😐 เพราะจอลูกค้าเหลือ 4 ปุ่มแล้ว) → กราฟต้องเหลือ 4 แท่ง ไม่ทิ้งช่องว่าง */
    const db = makeDb();
    for (const sc of db.scores) if (sc.score === 3) sc.score = 4;
    const { d } = boot('https://x.test/a.html', db);
    await sleep(160);
    const bars = d.querySelector('.hist').children.length;
    ok(bars === 4, 'ไม่มีคะแนน 😐 ในช่วงที่ดู → กราฟเหลือ 4 แท่ง (ได้ ' + bars + ')');
    ok(!d.querySelector('.hist').textContent.includes('😐'), 'ไม่มีหน้ายิ้มเฉยๆ ค้างในกราฟ');
  }

  console.log('\n[2] dashboard — missing tables');
  {
    const db = makeDb({ missing: true }); const { d, errors } = boot('https://x.test/a.html', db);
    await sleep(80);
    ok(d.body.textContent.includes('jjmk-kpi.sql'), 'setup hint shown when tables missing');
    ok(errors.length === 0, 'no jsdom errors');
  }

  console.log('\n[3] kiosk — full flow');
  {
    const db = makeDb(); const before = db.responses.length;
    const { w, d, client, errors } = boot('https://x.test/a.html?kiosk=jjrd', db, { pin: '2468' });
    await sleep(80);
    ok(d.body.classList.contains('kiosk'), 'kiosk body class');
    ok(d.querySelector('meta[name=viewport]').content.includes('user-scalable=no'), 'zoom locked');
    ok(!!d.querySelector('.k-start'), 'idle screen');
    await click(w, d, '.k-start');
    ok(txt(d, '.k-name') === 'อาหาร' && d.querySelectorAll('.k-face').length === 4, 'first dept + 4 faces');
    ok(!d.querySelector('.k-face[data-s="3"]'), 'no เฉยๆ (score 3) choice');
    ok(d.querySelectorAll('.k-dot').length === 4 && d.querySelector('.k-dot.cur'), '4 dots (3 depts + staff)');
    await click(w, d, '.k-face[data-s="5"]'); await sleep(350);
    ok(txt(d, '.k-name') === 'บริการ', 'advanced to dept 2');
    await click(w, d, '[data-act=kBack]');
    ok(txt(d, '.k-name') === 'อาหาร' && d.querySelector('.k-face[data-s="5"]').classList.contains('sel'), 'back keeps previous selection');
    await click(w, d, '.k-face[data-s="4"]'); await sleep(350);
    await click(w, d, '[data-act=kSkip]');
    ok(txt(d, '.k-name') === 'ความสะอาด', 'skip → dept 3');
    await click(w, d, '.k-face[data-s="2"]'); await sleep(350);
    ok(txt(d, '.k-name') === 'ชมพนักงาน' && d.querySelectorAll('.k-chip').length === 2, 'staff screen shows 2 active JJRD staff');
    await click(w, d, '.k-chip[data-id="2"]'); await sleep(320);
    ok(!!d.querySelector('.k-check'), 'thank-you screen');
    const rpc = client._calls.filter(c => c.op === 'rpc' && c.name === 'kpi_submit');
    ok(rpc.length === 1, 'one rpc submit');
    const a = rpc[0].args;
    ok(a.p_branch === 'JJRD' && a.p_staff_id === 2 && /^\d{4}-\d{2}-\d{2}$/.test(a.p_biz_date), 'payload branch/staff/biz_date');
    ok(JSON.stringify(a.p_scores) === JSON.stringify([{ department_id: 1, score: 4 }, { department_id: 3, score: 2 }]), 'payload scores (dept2 skipped, dept1 overwritten to 4)');
    ok(db.responses.length === before + 1, 'db got the response');
    // done → idle after KIOSK_DONE_SEC
    w.eval('CONFIG.KIOSK_DONE_SEC=0.4;CONFIG.KIOSK_IDLE_SEC=0.5;');
    await sleep(3100);
    ok(!!d.querySelector('.k-start'), 'auto back to idle');
    // idle timeout with partial scores → submitted   (t=0 start, t≈40 tap, kNext t≈360 → idle fires t≈860, done until ≈1260)
    await click(w, d, '.k-start'); await click(w, d, '.k-face[data-s="2"]'); await sleep(350);
    ok(txt(d, '.k-name') === 'บริการ', 'moved to dept 2 while waiting');
    await sleep(520);
    ok(!!d.querySelector('.k-check'), 'idle timeout mid-flow → submits partial');
    ok(client._calls.filter(c => c.op === 'rpc' && c.name === 'kpi_submit').length === 2 && client._calls.filter(c => c.op === 'rpc' && c.name === 'kpi_submit')[1].args.p_scores.length === 1, 'partial submit has 1 score');
    await sleep(500);
    ok(!!d.querySelector('.k-start'), 'back to idle after thank-you');
    // idle timeout with no scores → back to idle silently
    await click(w, d, '.k-start'); await sleep(600);
    ok(!!d.querySelector('.k-start') && client._calls.filter(c => c.op === 'rpc' && c.name === 'kpi_submit').length === 2, 'idle timeout with nothing → idle, no submit');
    // restart button
    await click(w, d, '.k-start'); await click(w, d, '[data-act=kRestart]');
    ok(!!d.querySelector('.k-start'), '✕ restart → idle');
    // long-press exit with PIN
    const br = d.querySelector('.k-branch');
    br.dispatchEvent(new w.Event('pointerdown', { bubbles: true }));
    await sleep(2600);
    ok(errors.some(x => /navigation/.test(x)), 'long-press + PIN → navigates to dashboard (jsdom reports navigation attempt)');
    const other = errors.filter(x => !/navigation/.test(x));
    ok(other.length === 0, 'no other jsdom errors' + (other.length ? ': ' + other.join(' | ') : ''));
  }

  console.log('\n[4] kiosk — offline queue + no staff branch');
  {
    const db = makeDb({}); db.staff = db.staff.filter(s => s.branch !== 'JJLP');
    let fail = true; const realRpc = db.rpc; db.rpc = (n, a) => fail ? { data: null, error: { message: 'offline' } } : realRpc(n, a);
    const { w, d, client, errors } = boot('https://x.test/a.html?kiosk=JJLP', db);
    await sleep(80);
    await click(w, d, '.k-start');
    ok(d.querySelectorAll('.k-dot').length === 3, '3 dots (no staff step)');
    await click(w, d, '.k-face[data-s="5"]'); await sleep(350);
    await click(w, d, '.k-face[data-s="5"]'); await sleep(350);
    await click(w, d, '.k-face[data-s="4"]'); await sleep(350);
    ok(!!d.querySelector('.k-check'), 'no staff → finishes right after last dept');
    ok(JSON.parse(w.localStorage.getItem('kpi_queue')).length === 1, 'failed submit queued in localStorage');
    fail = false;
    w.eval('flushQueue()'); await sleep(60);
    ok(JSON.parse(w.localStorage.getItem('kpi_queue')).length === 0 && db.responses[db.responses.length - 1].branch === 'JJLP', 'queue flushed when back online');
    ok(errors.length === 0, 'no jsdom errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  }

  console.log('\n[5] kiosk — bad branch param → chooser');
  {
    const db = makeDb(); const { d } = boot('https://x.test/a.html?kiosk=', db);
    await sleep(40);
    ok(d.querySelectorAll('a.k-chip').length === 2, 'branch chooser shows 2 links');
  }

  console.log('\n[6] payroll sync — รายชื่อพนักงานจากระบบเงินเดือน + กรองตำแหน่ง/คนเข้างาน');
  const EMPLOYEES = [
    { id: 101, code: 'C101', branch: 'JJRD', nick: 'ชาย', full_name: 'สมชาย ใจดี', position: 'เสิร์ฟ', active: true },   // ตรงแถวเดิม → link ไม่เพิ่มซ้ำ
    { id: 102, code: 'C102', branch: 'JJRD', nick: 'บอย', full_name: 'บอย มาใหม่', position: 'เซอร์วิส', active: true }, // คนใหม่ → เพิ่ม
    { id: 103, code: 'C103', branch: 'JJLP', nick: 'นี', full_name: 'มานี มีนา', position: 'เสิร์ฟ', active: true },      // link ผ่านชื่อเล่น + อัพเดตชื่อจริง
    { id: 104, code: 'C104', branch: 'JJCK', nick: 'กลาง', full_name: 'ครัว กลาง', position: null, active: true },       // นอกสาขา kiosk → ไม่เพิ่ม
    { id: 105, code: 'C105', branch: 'JJRD', nick: 'เก่า', full_name: 'คน ลาออก', position: null, active: false },       // พ้นสภาพ → ไม่เพิ่ม
    { id: 106, code: 'C106', branch: 'JJRD', nick: 'สา', full_name: 'สา สไลด์', position: 'สไลด์หมู', active: true },     // หลังร้าน → sync แต่ไม่โชว์หน้าลูกค้า
    { id: 107, code: 'C107', branch: 'JJRD', nick: 'มีน', full_name: 'มีน ล้าง', position: 'ล้างจาน', active: true }      // หลังร้าน → sync แต่ไม่โชว์หน้าลูกค้า
  ];
  {
    const db = makeDb({ employees: EMPLOYEES });
    db.staff.find(s => s.id === 2).employee_id = 999; // เคยผูกกับพนักงานที่ไม่อยู่แล้ว → ต้องถูกปิดใช้
    const { w, d, client, errors } = boot('https://x.test/a.html?kiosk=JJRD', db);
    await sleep(80);
    ok(db.staff.find(s => s.id === 1).employee_id === 101, 'existing row linked to payroll by name');
    ok(db.staff.filter(s => s.name === 'สมชาย ใจดี').length === 1, 'linked staff not duplicated');
    const boy = db.staff.find(s => s.employee_id === 102);
    ok(!!boy && boy.branch === 'JJRD' && boy.active === true && boy.nickname === 'บอย', 'new payroll employee added');
    ok(db.staff.find(s => s.id === 4).employee_id === 103 && db.staff.find(s => s.id === 4).name === 'มานี มีนา', 'nickname-linked row got full name from payroll');
    ok(!db.staff.some(s => s.employee_id === 104) && !db.staff.some(s => s.employee_id === 105), 'JJCK / resigned employees not added');
    ok(db.staff.find(s => s.id === 2).active === false, 'row of departed employee auto-hidden');
    ok(!!db.staff.find(s => s.employee_id === 106) && !!db.staff.find(s => s.employee_id === 107), 'back-of-house staff still synced to DB');
    /* ไม่มีข้อมูลสแกนเลย → ไม่รู้ว่าใครอยู่ร้าน = ข้ามคำถามชมพนักงาน (ห้ามโชว์ทั้งร้านแบบเดิม ลูกค้ากดผิด) */
    await click(w, d, '.k-start');
    ok(d.querySelectorAll('.k-dot').length === 3, 'ไม่มีข้อมูลสแกน → มีแต่ 3 แผนก ไม่มีขั้นชมพนักงาน');
    await click(w, d, '.k-face[data-s="5"]'); await sleep(350);
    await click(w, d, '.k-face[data-s="5"]'); await sleep(350);
    await click(w, d, '.k-face[data-s="5"]'); await sleep(350);
    ok(!!d.querySelector('.k-check') && !d.querySelector('.k-chip'), 'จบที่หน้าขอบคุณ ไม่มีรายชื่อให้กดผิด');
    ok(errors.length === 0, 'no jsdom errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  }
  {
    // มีข้อมูลสแกน: ชาย สแกนเข้า (คี่=อยู่) · บอย เข้า-ออกแล้ว (คู่=กลับ) → โชว์เฉพาะ ชาย
    const db = makeDb({ employees: EMPLOYEES });
    db.staff.find(s => s.id === 2).employee_id = 999;
    const now = new Date(); const biz = new Date(now); if (now.getHours() < 6) biz.setDate(biz.getDate() - 1);
    const at = (hh, mm) => new Date(biz.getFullYear(), biz.getMonth(), biz.getDate(), hh, mm);
    db.punches.push({ emp_code: 'C101', ts: at(11, 0) }, { emp_code: 'C102', ts: at(11, 0) }, { emp_code: 'C102', ts: at(11, 30) });
    const { w, d, errors } = boot('https://x.test/a.html?kiosk=JJRD', db);
    await sleep(80);
    await click(w, d, '.k-start');
    await click(w, d, '.k-face[data-s="5"]'); await sleep(350);
    await click(w, d, '.k-face[data-s="5"]'); await sleep(350);
    await click(w, d, '.k-face[data-s="5"]'); await sleep(350);
    const chips = Array.from(d.querySelectorAll('.k-chip .n')).map(x => x.textContent);
    ok(chips.length === 1 && chips[0] === 'ชาย', 'only on-duty staff shown: ' + chips.join(','));
    ok(errors.length === 0, 'no jsdom errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  }

  console.log('\n[7] settings — แถวซิงก์ล็อกชื่อ + ซิงก์ล้มไม่พังแอป');
  {
    const employees = [{ id: 101, branch: 'JJRD', nick: 'ชาย', full_name: 'สมชาย ใจดี', position: 'เสิร์ฟ', active: true }];
    const db = makeDb({ employees });
    const { w, d } = boot('https://x.test/a.html', db);
    await sleep(80);
    await click(w, d, '[data-tab=settings]');
    /* รายชื่อเป็นแบบอ่านอย่างเดียว จัดกลุ่มตามตำแหน่ง (แก้ชื่อทำที่แอป Payroll) */
    ok(!d.querySelector('#staffList input.f-name, #staffList .f-branch'), 'ไม่มีช่องแก้ชื่อ/สาขาแล้ว');
    ok(d.querySelectorAll('#staffList .stf-group').length >= 1 && d.querySelectorAll('#staffList .f-active').length >= 1, 'รายชื่อจัดกลุ่มตามตำแหน่ง + ติ๊กซ่อนรายคนได้');
    ok(d.querySelector('#app').textContent.includes('ซิงก์จากระบบเงินเดือน'), 'บอกว่ารายชื่อมาจากระบบเงินเดือน');
    // การ์ดเลือกตำแหน่ง: ค่าเริ่มต้นตาม CONFIG (ครัว ซ่อน, เสิร์ฟ โชว์) → ติ๊ก เสิร์ฟ ออก แล้วบันทึกลง kpi_settings
    const cbServe = d.querySelector('#posList input[data-pos="เสิร์ฟ"]'), cbKitchen = d.querySelector('#posList input[data-pos="ครัว"]');
    ok(!!cbServe && cbServe.checked && !!cbKitchen && !cbKitchen.checked, 'position card: default from CONFIG (เสิร์ฟ shown, ครัว hidden)');
    cbServe.checked = false;
    await click(w, d, '[data-act=saveHidePos]'); await sleep(80);
    const st = db.settings.find(x => x.key === 'kiosk_hide_pos');
    ok(!!st && st.value.includes('เสิร์ฟ') && st.value.includes('ครัว'), 'hidden positions saved to kpi_settings: ' + JSON.stringify(st && st.value));
    ok(!d.querySelector('#posList input[data-pos="เสิร์ฟ"]').checked, 'position card re-rendered from saved setting');
  }
  {
    // ตั้งค่าจากฐานข้อมูลทับ fallback: ซ่อนเฉพาะ "เสิร์ฟ" → ครัว (ที่ CONFIG เคยซ่อน) กลับมาโชว์
    const db = makeDb({ settings: [{ key: 'kiosk_hide_pos', value: ['เสิร์ฟ'] }] });
    const { w, d, client } = boot('https://x.test/a.html?kiosk=JJLP', db);
    await sleep(80);
    await click(w, d, '.k-start');
    await click(w, d, '.k-face[data-s="5"]'); await sleep(350);
    await click(w, d, '.k-face[data-s="5"]'); await sleep(350);
    await click(w, d, '.k-face[data-s="5"]'); await sleep(350);
    const chips = Array.from(d.querySelectorAll('.k-chip .n')).map(x => x.textContent);
    ok(chips.length === 1 && chips[0] === 'มานะ', 'saved setting overrides CONFIG (เสิร์ฟ hidden, ครัว back): ' + chips.join(','));
    ok(client._calls.filter(c => c.op === 'rpc' && c.name === 'kpi_on_duty').length >= 2, 'on-duty refreshed again when customer taps start');
  }
  {
    const db = makeDb({ syncFail: true });
    const { w, d } = boot('https://x.test/a.html', db);
    await sleep(80);
    await click(w, d, '[data-tab=settings]');
    ok(d.body.textContent.includes('ซิงก์รายชื่อจากระบบเงินเดือนไม่สำเร็จ'), 'sync fail → warning shown');
    ok(d.querySelectorAll('#staffList .f-active').length === 4, 'ยังเห็นรายชื่อเดิมที่บันทึกไว้');
  }

  console.log('\n[8] pure helpers');
  {
    const db = makeDb(); const { w } = boot('https://x.test/a.html', db);
    await sleep(60);
    const r = w.eval(`[
      bizDateOf(new Date('2026-08-27T20:30:00Z')),  // 03:30 BKK 28th → biz 27th
      bizDateOf(new Date('2026-08-27T22:30:00Z')),  // 05:30 BKK 28th → biz 28th
      bizDateOf(new Date('2026-08-27T03:00:00Z')),  // 10:00 BKK 27th → 27th
      addMonths('2026-01', -1), addMonths('2026-12', 1), monthRange('2026-02').join(','), addDays('2026-02-28', 1),
      thDate('2026-08-27'), thMonth('2026-08'), bkkTime('2026-08-27T17:05:00Z'),
      scoreClass(4.5), scoreClass(4.0), scoreClass(3.99), scoreClass(null),
      JSON.stringify(aggDaily([{department_id:1,n:3,n1:0,n2:0,n3:1,n4:1,n5:1},{department_id:1,n:2,n1:1,n2:0,n3:0,n4:0,n5:1}]).byDept[1]),
      esc('<b>"x"&\\'')
    ]`);
    ok(r[0] === '2026-08-27' && r[1] === '2026-08-28' && r[2] === '2026-08-27', 'bizDateOf cutoff logic: ' + r.slice(0, 3).join(' '));
    ok(r[3] === '2025-12' && r[4] === '2027-01' && r[5] === '2026-02-01,2026-02-28' && r[6] === '2026-03-01', 'month/day math');
    ok(r[7] === 'พฤหัสบดี 27 ส.ค. 2569' && r[8] === 'สิงหาคม 2569' && r[9] === '00:05', 'thai formatting: ' + r[7] + ' / ' + r[8] + ' / ' + r[9]);
    ok(r[10] === 'good' && r[11] === 'ok' && r[12] === 'bad' && r[13] === 'none', 'score classes');
    const agg = JSON.parse(r[14]);
    ok(agg.n === 5 && Math.abs(agg.avg - 3.6) < 1e-9 && agg.csat === 0.6 && agg.neg === 1, 'aggDaily merge: ' + r[14]);
    ok(r[15] === '&lt;b&gt;&quot;x&quot;&amp;&#39;', 'esc()');
  }

  console.log('\n[9] ล็อกอิน — ใบผ่านจากหน้าศูนย์รวมแอพ / เปิดลิงก์ตรงต้องใส่รหัส');
  {
    /* เปิดลิงก์แดชบอร์ดตรง ๆ ไม่มีใบผ่าน = ต้องเจอหน้าใส่รหัส ห้ามเห็นข้อมูลลูกค้า */
    const db = makeDb(); const { w, d } = boot('https://thananant.github.io/JJ-PnL/jjmk-kpi.html', db, { noAuth: true });
    await sleep(90);
    ok(!!d.querySelector('#loginForm'), 'ลิงก์ตรง (ไม่มีใบผ่าน) → หน้าเข้าสู่ระบบ');
    ok(!d.querySelector('.hdr') && !d.querySelector('.summary'), 'ยังไม่เห็นแดชบอร์ด/ข้อมูลลูกค้า');

    d.querySelector('#lgU').value = 'boss'; d.querySelector('#lgP').value = 'ผิด';
    await click(w, d, '#lgBtn'); await sleep(90);
    ok(txt(d, '#lgMsg').includes('ไม่ถูกต้อง') && !!d.querySelector('#loginForm'), 'รหัสผิด → แจ้งเตือน ไม่ปล่อยเข้า');

    d.querySelector('#lgU').value = 'boss'; d.querySelector('#lgP').value = 'kpi1234';
    await click(w, d, '#lgBtn'); await sleep(160);
    ok(!d.querySelector('#loginForm') && !!d.querySelector('.hdr') && !!d.querySelector('.summary'), 'รหัสถูก → เข้าแดชบอร์ดได้');
    const sv = JSON.parse(w.sessionStorage.getItem('kpi_auth') || 'null');
    ok(sv && sv.username === 'boss' && sv.h === pwHash('boss', 'kpi1234'), 'เก็บใบอนุญาตไว้ที่แท็บ (sessionStorage) ไม่ใช่ localStorage');
    ok(!w.localStorage.getItem('kpi_auth'), 'ไม่เขียนลง localStorage (ปิดแท็บแล้วต้องล็อกอินใหม่)');
    ok(d.body.textContent.includes('เจ้าของร้าน'), 'แถบบนบอกว่าใครใช้อยู่');
  }
  {
    /* กดไอคอนมาจากหน้าศูนย์รวมแอพ = มีใบผ่าน → เข้าได้เลย และใบผ่านถูกใช้ทิ้ง */
    const db = makeDb(); const { w, d } = boot('https://thananant.github.io/JJ-PnL/jjmk-kpi.html', db);
    await sleep(140);
    ok(!d.querySelector('#loginForm') && !!d.querySelector('.summary'), 'มีใบผ่านจากหน้าแรก → เข้าได้เลยไม่ต้องกรอกซ้ำ');
    ok(!w.localStorage.getItem('jjsso_ticket'), 'ใบผ่านถูกใช้ทิ้งทันที (ใช้ซ้ำไม่ได้)');
  }
  {
    /* ใบผ่านเก่าเกิน 2 นาที (เช่น คนอื่นไปเจอใบเก่าในเครื่อง) = ใช้ไม่ได้ */
    const db = makeDb(); const { d } = boot('https://thananant.github.io/JJ-PnL/jjmk-kpi.html', db, { authAge: 3 * 60 * 1000 });
    await sleep(120);
    ok(!!d.querySelector('#loginForm'), 'ใบผ่านเกิน 2 นาที → ต้องใส่รหัส');
  }
  {
    /* ใบผ่านที่ออกให้แอพอื่น ใช้กับ KPI ไม่ได้ */
    const db = makeDb(); const { d } = boot('https://thananant.github.io/JJ-PnL/jjmk-kpi.html', db, { ticketApp: 'payroll' });
    await sleep(120);
    ok(!!d.querySelector('#loginForm'), 'ใบผ่านของแอพอื่น → ใช้กับ KPI ไม่ได้');
  }
  {
    /* บัญชีที่ admin ยังไม่เปิดสิทธิ์ KPI ให้ */
    const db = makeDb(); const { d } = boot('https://thananant.github.io/JJ-PnL/jjmk-kpi.html', db, { as: 'nokpi' });
    await sleep(120);
    ok(d.body.textContent.includes('ยังไม่ได้รับสิทธิ์') && !d.querySelector('.summary'), 'ไม่มีสิทธิ์ KPI → เข้าไม่ได้');
  }
  {
    /* ผู้จัดการที่ได้สิทธิ์ kpi → เข้าได้ */
    const db = makeDb(); const { d } = boot('https://thananant.github.io/JJ-PnL/jjmk-kpi.html', db, { as: 'manager' });
    await sleep(120);
    ok(!d.querySelector('#loginForm') && !!d.querySelector('.summary'), 'ผู้จัดการที่มีสิทธิ์ kpi → เข้าได้');
  }
  {
    /* บัญชีถูกปิดใช้งาน แต่ยังถือใบผ่านอยู่ */
    const db = makeDb(); db.users.find(u => u.username === 'manager').active = false;
    const { d } = boot('https://thananant.github.io/JJ-PnL/jjmk-kpi.html', db, { as: 'manager' });
    await sleep(120);
    ok(!!d.querySelector('#loginForm'), 'บัญชีถูกปิด → ใบผ่านใช้ไม่ได้');
  }
  {
    /* เปลี่ยนรหัสผ่านจากเครื่องอื่น → ใบผ่านเดิมใช้ไม่ได้ */
    const db = makeDb(); db.users.find(u => u.username === 'boss').pass_hash = pwHash('boss', 'newpass');
    const { d } = boot('https://thananant.github.io/JJ-PnL/jjmk-kpi.html', db);
    await sleep(120);
    ok(!!d.querySelector('#loginForm'), 'รหัสผ่านถูกเปลี่ยน → ใบผ่านเดิมใช้ไม่ได้');
  }
  {
    /* ลากหน้าลงบนมือถือ (pull-to-refresh) = โหลดใหม่ — ต้องไม่ล็อกอินซ้ำ และกลับมาแท็บเดิม */
    const db = makeDb();
    const { w, d } = boot('https://thananant.github.io/JJ-PnL/jjmk-kpi.html', db, { sess: 'boss', before(w) { try { w.localStorage.setItem('kpi_tab', 'monthly'); } catch (e) {} } });
    await sleep(160);
    ok(!d.querySelector('#loginForm') && !!d.querySelector('.hdr'), 'ลากลง/รีเฟรช → ไม่ต้องล็อกอินซ้ำ (ใบอนุญาตอยู่ที่แท็บ)');
    const at = d.querySelector('.tab.active');
    ok(at && at.dataset.tab === 'monthly' && !!d.querySelector('.trend'), 'รีเฟรชแล้วกลับมาแท็บเดิม (รายเดือน)');
    ok(!w.localStorage.getItem('jjsso_ticket'), 'รีเฟรชไม่ต้องใช้ใบผ่านอีก');
  }
  {
    /* รีเฟรชตอนเน็ต/ฐานข้อมูลล่ม → ไม่เตะคนทำงานออกจากระบบ */
    const db = makeDb({ usersMissing: true }); const { d } = boot('https://thananant.github.io/JJ-PnL/jjmk-kpi.html', db, { sess: 'boss' });
    await sleep(160);
    ok(!d.querySelector('#loginForm') && !!d.querySelector('.summary'), 'เน็ตล่มตอนรีเฟรช → ใช้งานต่อได้');
  }
  {
    /* สิทธิ์ถูกถอนระหว่างที่เปิดค้าง → รีเฟรชแล้วเข้าไม่ได้ */
    const db = makeDb(); db.users.find(u => u.username === 'manager').apps = { pnl: { dash: 'v' } };
    const { d } = boot('https://thananant.github.io/JJ-PnL/jjmk-kpi.html', db, { sess: 'manager' });
    await sleep(140);
    ok(d.body.textContent.includes('ยังไม่ได้รับสิทธิ์'), 'สิทธิ์ถูกถอน → รีเฟรชแล้วเข้าไม่ได้');
  }
  {
    /* หน้าจอลูกค้าที่ร้าน (kiosk) ต้องไม่ต้องล็อกอิน */
    const db = makeDb(); const { d } = boot('https://thananant.github.io/JJ-PnL/jjmk-kpi.html' + '?kiosk=JJRD', db, { noAuth: true });
    await sleep(120);
    ok(!d.querySelector('#loginForm') && !!d.querySelector('.k-screen'), 'kiosk ลูกค้าไม่ต้องล็อกอิน');
  }

  console.log('\n[10] สิทธิ์รายหน้าจอ (dash / kiosk ที่ติ๊กไว้ในหน้า JJ Access)');
  {
    /* ได้แค่ "ดู" แดชบอร์ด → ไม่มีแท็บตั้งค่า ไม่มีปุ่มหน้าจอลูกค้า และแก้ข้อมูลไม่ได้ */
    const db = makeDb(); const before = db.departments.length;
    const { w, d } = boot('https://thananant.github.io/JJ-PnL/jjmk-kpi.html', db, { as: 'manager' });
    await sleep(160);
    ok(!!d.querySelector('.summary'), 'ดูอย่างเดียว: เข้าแดชบอร์ดได้');
    ok(d.querySelectorAll('.tab').length === 3 && !d.querySelector('[data-tab=settings]'), 'ไม่มีแท็บตั้งค่า');
    ok(!d.querySelector('[data-act=openKiosk]'), 'ไม่มีสิทธิ์ kiosk → ซ่อนปุ่มหน้าจอลูกค้า');
    w.eval("S.tab='settings';renderTab()"); await sleep(80);
    ok(!d.querySelector('#deptList') && !d.querySelector('#posList'), 'บังคับเปิดแท็บตั้งค่าก็ไม่เข้า');
    w.eval('saveDepts()'); await sleep(80);
    ok(db.departments.length === before, 'สั่งบันทึกตรง ๆ ก็ไม่ผ่าน (กันอีกชั้น)');
  }
  {
    /* ได้ ดู+เพิ่ม+แก้ และหน้าจอลูกค้า → ครบทุกแท็บ */
    const db = makeDb();
    const { d } = boot('https://thananant.github.io/JJ-PnL/jjmk-kpi.html', db, { as: 'kpimgr' });
    await sleep(160);
    ok(d.querySelectorAll('.tab').length === 4 && !!d.querySelector('[data-act=openKiosk]'), 'มีสิทธิ์แก้ + kiosk → ครบทุกแท็บ');
  }
  {
    /* ยังไม่เคยตั้งสิทธิ์ (apps ว่าง) = ไม่ล็อกใคร — กติกาเดียวกับหน้าศูนย์รวมแอพ */
    const db = makeDb();
    const { d } = boot('https://thananant.github.io/JJ-PnL/jjmk-kpi.html', db, { as: 'boss' });
    await sleep(160);
    ok(d.querySelectorAll('.tab').length === 4, 'เจ้าของ/ยังไม่ตั้งสิทธิ์ → เห็นครบ');
  }

  console.log('\n[11] จอลูกค้า: ชื่อที่ขึ้น = เฉพาะคนที่สแกนเข้างานอยู่จริง');
  const toStaff = async (w, d) => {   // กดผ่าน 3 แผนกให้ถึงขั้นชมพนักงาน
    await click(w, d, '.k-start');
    for (let i = 0; i < 3; i++) { await click(w, d, '.k-face[data-s="5"]'); await sleep(350); }
  };
  {
    /* ค่าเริ่มต้น: JJRD สแกนเข้า 2 คน → ขึ้น 2 ชื่อ */
    const db = makeDb(); const { w, d } = boot('https://x.test/a.html?kiosk=JJRD', db, { noAuth: true });
    await sleep(120); await toStaff(w, d);
    const names = Array.from(d.querySelectorAll('.k-chip .n')).map(x => x.textContent).sort();
    ok(names.join(',') === 'ชาย,หญิง', 'สแกนเข้าอยู่ 2 คน → ขึ้นแค่ 2 ชื่อ: ' + names.join(','));
  }
  {
    /* "หญิง" สแกนออกแล้ว (จำนวนสแกนเป็นคู่) → เหลือชื่อเดียว */
    const db = makeDb();
    const now = new Date(); const bz = new Date(now); if (now.getHours() < 6) bz.setDate(bz.getDate() - 1);
    db.punches.push({ emp_code: 'S202', ts: new Date(bz.getFullYear(), bz.getMonth(), bz.getDate(), 20, 0) });
    const { w, d } = boot('https://x.test/a.html?kiosk=JJRD', db, { noAuth: true });
    await sleep(120); await toStaff(w, d);
    const names = Array.from(d.querySelectorAll('.k-chip .n')).map(x => x.textContent);
    ok(names.length === 1 && names[0] === 'ชาย', 'สแกนออกแล้วหายจากจอ: ' + names.join(','));
  }
  {
    /* พนักงานที่ยังไม่ผูกกับระบบเงินเดือน (กรอกมือ) → ไม่ขึ้น เพราะเช็คไม่ได้ว่าอยู่ร้านไหม */
    const db = makeDb();
    db.staff.push({ id: 90, branch: 'JJRD', name: 'พาร์ทไทม์ ไม่มีในเงินเดือน', nickname: 'พาร์ท', position: 'เสิร์ฟ', sort_order: 9, active: true });
    const { w, d } = boot('https://x.test/a.html?kiosk=JJRD', db, { noAuth: true });
    await sleep(120); await toStaff(w, d);
    const names = Array.from(d.querySelectorAll('.k-chip .n')).map(x => x.textContent);
    ok(!names.includes('พาร์ท') && names.length === 2, 'แถวที่ไม่ผูก payroll ไม่ขึ้นจอลูกค้า: ' + names.join(','));
  }
  {
    /* ยังไม่ได้รัน SQL (ไม่มีฟังก์ชัน kpi_on_duty) → ข้ามคำถามชมพนักงาน ไม่ใช่โชว์ทั้งร้าน */
    const db = makeDb({ dutyFail: true });
    const { w, d } = boot('https://x.test/a.html?kiosk=JJRD', db, { noAuth: true });
    await sleep(120);
    await click(w, d, '.k-start');
    ok(d.querySelectorAll('.k-dot').length === 3, 'RPC ใช้ไม่ได้ → ไม่มีขั้นชมพนักงาน');
    for (let i = 0; i < 3; i++) { await click(w, d, '.k-face[data-s="5"]'); await sleep(350); }
    ok(!!d.querySelector('.k-check') && !d.querySelector('.k-chip'), 'จบที่ขอบคุณ ไม่มีชื่อให้กดผิด');
  }
  {
    /* หน้าตั้งค่ามีการ์ดบอกว่าตอนนี้ระบบเห็นใครเข้างาน */
    const db = makeDb(); const { w, d } = boot('https://thananant.github.io/JJ-PnL/jjmk-kpi.html', db);
    await sleep(160);
    await click(w, d, '[data-tab=settings]'); await sleep(200);
    const card = d.querySelector('#dutyBody');
    ok(!!card && /ชาย/.test(card.textContent) && /เข้างานอยู่ 2 คน/.test(card.textContent), 'การ์ดตั้งค่าโชว์คนเข้างาน: ' + (card ? card.textContent.slice(0, 60) : '-'));
  }
  {
    /* ยังไม่ได้รัน SQL → การ์ดบอกสาเหตุให้เจ้าของแก้ได้เอง */
    const db = makeDb({ dutyFail: true }); const { w, d } = boot('https://thananant.github.io/JJ-PnL/jjmk-kpi.html', db);
    await sleep(160);
    await click(w, d, '[data-tab=settings]'); await sleep(200);
    const card = d.querySelector('#dutyBody');
    ok(!!card && card.textContent.includes('jjmk-kpi.sql'), 'ยังไม่ได้รัน SQL → การ์ดบอกให้รันไฟล์');
  }

  console.log('\n[12] ยังไม่ได้รัน SQL (ไม่มีตาราง kpi_settings) → บอกล่วงหน้า ไม่ปล่อยให้กดแล้วเด้ง error');
  {
    const db = makeDb({ noSettingsTable: true });
    const { w, d } = boot('https://thananant.github.io/JJ-PnL/jjmk-kpi.html', db);
    await sleep(160);
    await click(w, d, '[data-tab=settings]'); await sleep(200);
    const A = d.querySelector('#app').textContent;
    ok(A.includes('kpi_settings') && A.includes('kpi_upgrade.sql'), 'การ์ดตำแหน่งบอกว่าต้องรัน SQL ตัวไหน');
    ok(d.querySelector('[data-act=saveHidePos]').disabled, 'ปุ่มบันทึกตำแหน่งกดไม่ได้ (กันกดแล้วเด้ง error)');
    ok(!!d.querySelector('#posList input[data-pos]'), 'ยังเลือกดูตำแหน่งได้ตามค่าเริ่มต้นใน CONFIG');
    ok(!!d.querySelector('#deptList') && noErr(d), 'ส่วนอื่นของหน้าตั้งค่ายังใช้ได้ปกติ');
  }

  const failures = getFailures(); console.log('\n' + (failures ? failures + ' FAILED' : 'ALL PASSED'));
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
