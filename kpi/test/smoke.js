'use strict';
const { makeDb, makeClient, boot, sleep, ok, txt, noErr, click, change, failures: getFailures } = require('./harness');
(async () => {
  console.log('\n[1] dashboard — daily / monthly / staff / settings');
  {
    const db = makeDb(); const { w, d, client, errors } = boot('https://thananant.github.io/JJ-PnL/jjmk-kpi.html', db);
    await sleep(80);
    ok(!!d.querySelector('.hdr'), 'header rendered');
    ok(d.querySelectorAll('.tab').length === 4, '4 tabs');
    ok(noErr(d) && !!d.querySelector('.summary'), 'daily summary rendered');
    ok(d.querySelectorAll('.dept').length === 3, 'daily shows 3 active departments (inactive one without data hidden)');
    ok(/\d\.\d\d/.test(txt(d, '.gauge-num')), 'gauge shows average ' + txt(d, '.gauge-num'));
    ok(!!d.querySelector('.hours') && d.querySelectorAll('.hour-col').length === 18, 'hourly chart 11:00 → 04:00 = 18 columns');
    ok(d.querySelectorAll('.lb-row').length >= 1, 'staff leaderboard (today) has rows');
    ok(!!d.querySelector('table') && d.querySelectorAll('tbody tr').length <= 15, 'recent list (≤15 rows)');
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
    ok(d.querySelectorAll('#deptList .edit-row').length === 4 && d.querySelectorAll('#staffList .edit-row').length === 5, 'settings lists all depts & staff');
    ok(d.body.textContent.includes('?kiosk=JJRD') && d.body.textContent.includes('?kiosk=JJLP'), 'kiosk links shown');
    await click(w, d, '[data-act=addDept]');
    d.querySelector('#deptList .edit-row:last-child .f-name').value = 'ที่จอดรถ';
    await click(w, d, '#deptList .edit-row:last-child [data-act=rowUp]');
    ok(d.querySelectorAll('#deptList .edit-row')[3].querySelector('.f-name').value === 'ที่จอดรถ', 'new dept moved up one');
    await click(w, d, '[data-act=saveDepts]'); await sleep(80);
    ok(db.departments.length === 5 && db.departments.find(x => x.name === 'ที่จอดรถ').sort_order === 4, 'dept saved with sort_order 4');
    ok(db.departments.find(x => x.id === 4).sort_order === 5, 'existing dept re-ordered to 5');
    await change(w, d, '#setBranch', 'JJLP');
    ok(d.querySelectorAll('#staffList .edit-row').length === 2, 'staff filter by branch');
    await click(w, d, '[data-act=addStaff]');
    d.querySelector('#staffList .edit-row:last-child .f-nick').value = 'ต้อม';
    await click(w, d, '[data-act=saveStaff]'); await sleep(80);
    const added = db.staff.find(x => x.nickname === 'ต้อม');
    ok(added && added.branch === 'JJLP' && added.name === 'ต้อม' && added.sort_order === 3, 'staff added (name falls back to nickname)');
    await click(w, d, '[data-act=openKioskB]');
    ok(/\?kiosk=JJRD$/.test(w._opened || ''), 'open kiosk link: ' + w._opened);
    ok(errors.length === 0, 'no jsdom errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
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
    ok(txt(d, '.k-name') === 'อาหาร' && d.querySelectorAll('.k-face').length === 5, 'first dept + 5 faces');
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
    await click(w, d, '.k-start'); await click(w, d, '.k-face[data-s="3"]'); await sleep(350);
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

  console.log('\n[6] payroll sync — รายชื่อพนักงานจากระบบเงินเดือน');
  {
    const employees = [
      { id: 101, branch: 'JJRD', nick: 'ชาย', full_name: 'สมชาย ใจดี', position: 'เสิร์ฟ', active: true },  // ตรงแถวเดิม → link ไม่เพิ่มซ้ำ
      { id: 102, branch: 'JJRD', nick: 'บอย', full_name: 'บอย มาใหม่', position: 'ครัว', active: true },    // คนใหม่ → เพิ่ม
      { id: 103, branch: 'JJLP', nick: 'นี', full_name: 'มานี มีนา', position: 'เสิร์ฟ', active: true },     // link ผ่านชื่อเล่น + อัพเดตชื่อจริง
      { id: 104, branch: 'JJCK', nick: 'กลาง', full_name: 'ครัว กลาง', position: null, active: true },      // นอกสาขา kiosk → ไม่เพิ่ม
      { id: 105, branch: 'JJRD', nick: 'เก่า', full_name: 'คน ลาออก', position: null, active: false }       // พ้นสภาพ → ไม่เพิ่ม
    ];
    const db = makeDb({ employees });
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
    await click(w, d, '.k-start');
    await click(w, d, '.k-face[data-s="5"]'); await sleep(350);
    await click(w, d, '.k-face[data-s="5"]'); await sleep(350);
    await click(w, d, '.k-face[data-s="5"]'); await sleep(350);
    ok(txt(d, '.k-name') === 'ชมพนักงาน' && (txt(d, '.k-q') || '').includes('อยากชมพนักงานคนไหนเป็นพิเศษ'), 'question 5: อยากชมพนักงาน…');
    const chips = Array.from(d.querySelectorAll('.k-chip .n')).map(x => x.textContent);
    ok(chips.includes('ชาย') && chips.includes('บอย') && !chips.includes('หญิง'), 'choices from payroll (hidden one gone): ' + chips.join(','));
    await click(w, d, '[data-act=kNoStaff]'); await sleep(320);
    ok(!!d.querySelector('.k-check'), 'submit with ไม่ระบุ still works');
    ok(errors.length === 0, 'no jsdom errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  }

  console.log('\n[7] settings — แถวซิงก์ล็อกชื่อ + ซิงก์ล้มไม่พังแอป');
  {
    const employees = [{ id: 101, branch: 'JJRD', nick: 'ชาย', full_name: 'สมชาย ใจดี', position: 'เสิร์ฟ', active: true }];
    const db = makeDb({ employees });
    const { w, d } = boot('https://x.test/a.html', db);
    await sleep(80);
    await click(w, d, '[data-tab=settings]');
    const row = d.querySelector('#staffList .edit-row.synced');
    ok(!!row && row.querySelector('.f-name').disabled && row.querySelector('.f-branch').disabled && !row.querySelector('.f-active').disabled, 'synced row: name/branch locked, "ใช้" editable');
    ok(d.querySelectorAll('#staffList .edit-row:not(.synced)').length >= 1, 'manual rows still editable');
    ok(d.body.textContent.includes('รายชื่อดึงอัตโนมัติจากระบบเงินเดือน'), 'payroll hint shown');
  }
  {
    const db = makeDb({ syncFail: true });
    const { w, d } = boot('https://x.test/a.html', db);
    await sleep(80);
    await click(w, d, '[data-tab=settings]');
    ok(d.body.textContent.includes('ซิงก์รายชื่อจากระบบเงินเดือนไม่สำเร็จ'), 'sync fail → warning shown');
    ok(d.querySelectorAll('#staffList .edit-row').length === 5, 'old staff list still usable');
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

  const failures = getFailures(); console.log('\n' + (failures ? failures + ' FAILED' : 'ALL PASSED'));
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
