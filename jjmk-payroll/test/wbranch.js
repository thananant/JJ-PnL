// เทสชื่อ/ลำดับสาขาใน Cloudflare Worker (jjmk-payroll/worker.js) — อ่านทะเบียนสาขากลาง pnl_branches · อ่านไม่ได้ = เหมือนเดิม
// รันโค้ดจริงของ worker.js ใน vm (ตัด export default ออก) กับ Supabase ปลอม — ไม่ยิงเน็ตจริง
const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(__dirname + '/../worker.js', 'utf8').replace('export default {', 'var __worker = {') +
  '\n;globalThis.__T = { brName, branchOrder, branchList, branchReg, loadBranchReg, checkCounts, storeHint, runReportCheck, buildDailySummary, getReg: () => REG, resetReg: () => { REG = { names: {}, stores: [], at: 0 }; } };';
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };

const TODAY_REG = [
  { code: 'JJRD', name: 'สาขารัชดา', short: 'รัชดา', kind: 'store', sort: 1, active: true },
  { code: 'JJLP', name: 'สาขาลาดพร้าว', short: 'ลาดพร้าว', kind: 'store', sort: 2, active: true },
  { code: 'JJOF', name: 'ออฟฟิศ', short: 'ออฟฟิศ', kind: 'office', sort: 9, active: true }];
const BN = { code: 'JJBN', name: 'สาขาบางนา', short: 'บางนา', kind: 'store', sort: 3, color: '#2E8B57', active: true };

/* สร้าง worker ใหม่ทุกสถานการณ์ — reg = แถวในตาราง pnl_branches (null = HTTP 500 · 'nokind' = ยังไม่รัน SQL ไม่มีคอลัมน์ kind/short) */
function mkWorker(reg) {
  const calls = [];
  const data = {
    employees: [{ code: 'A', nick: 'เอ', branch: 'JJLP', active: true }, { code: 'B', nick: 'บี', branch: 'JJBN', active: true },
      { code: 'C', nick: 'ซี', branch: 'JJCK', active: true }, { code: 'D', nick: 'ดี', branch: 'OFFICE', active: true }],
    devices: [{ sn: 'SN_LP', branch: 'JJLP' }, { sn: 'SN_BN', branch: 'JJBN' }],
    shifts: [{ id: 1, name: 'กะเช้า', start_time: '10:00', end_time: '19:00', in_grace: 5, out_grace: 0, sort_order: 1 }],
  };
  const fetch = async (url) => {
    const u = new URL(url), t = u.pathname.split('/').pop();
    calls.push(t + '?' + decodeURIComponent(u.search.slice(1)));
    const J = (body, status = 200) => ({ ok: status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });
    if (t === 'pnl_branches') {
      if (reg === null) return J({ message: 'boom' }, 500);
      if (reg === 'nokind') return J(TODAY_REG.map((r) => ({ code: r.code, name: r.name, sort: r.sort, is_central: r.kind !== 'store' })));
      return J(reg);
    }
    if (t === 'payroll_settings') return J([{ cutoff_hour: 6 }]);
    if (t === 'shifts') return J(data.shifts);
    if (t === 'employees') return J(data.employees);
    if (t === 'devices') return J(data.devices);
    if (t === 'holidays') return J([]);
    if (t === 'punches') {
      const m = /punch_date=in\.\(([^,]+),/.exec(decodeURIComponent(u.search)); const day = m ? m[1] : '';
      if (!/order=punch_date/.test(u.search) || !day) return J([]);
      return J([{ emp_code: 'A', punch_date: day, punch_time: '10:00:00', device_sn: 'SN_LP' },
        { emp_code: 'B', punch_date: day, punch_time: '10:01:00', device_sn: 'SN_BN' },
        { emp_code: 'C', punch_date: day, punch_time: '10:02:00', device_sn: 'SN_LP' },
        { emp_code: 'D', punch_date: day, punch_time: '10:03:00', device_sn: 'SN_LP' }]);
    }
    return J([]);
  };
  const ctx = { fetch, URL, console, Date, Math, JSON, Promise, setTimeout, TextDecoder, Response: class {} };
  vm.createContext(ctx); vm.runInContext(src, ctx);
  return { T: ctx.__T, calls, env: { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_KEY: 'sb_publishable_test' } };
}
const recsOf = (list) => new Map(list.map(([code, wb]) => [code, { code, wb }]));
const dataOf = (emps) => ({ emps: new Map(emps.map(([code, branch]) => [code, { code, branch }])) });

(async () => {
  try {
    console.log('[ไม่ได้อ่านทะเบียน = ชื่อ/ลำดับเดิมทุกอย่าง]');
    let { T } = mkWorker(TODAY_REG);
    ok(T.brName('JJLP') === 'ลาดพร้าว' && T.brName('JJRD') === 'รัชดา' && T.brName('JJCK') === 'ครัวกลาง' && T.brName('OFFICE') === 'ออฟฟิศ', 'ชื่อสาขาเดิม 4 แห่ง');
    ok(T.brName('') === 'ไม่ระบุสาขา' && T.brName('JJBN') === 'JJBN', 'ไม่มีชื่อ = รหัสดิบ/ไม่ระบุสาขา (เหมือนเดิม)');
    ok(T.branchOrder(['OFFICE', 'ZZ', 'JJBN', 'JJRD', 'JJCK', 'JJLP']).join() === 'JJLP,JJRD,JJCK,OFFICE,JJBN,ZZ', 'ลำดับเดิม: 4 สาขาหลัก แล้วรหัสอื่นเรียงตัวอักษร');
    ok(T.storeHint() === 'JJLP หรือ JJRD', 'ข้อความเตือนเครื่องไม่ผูกสาขาเหมือนเดิม');

    console.log('[ทะเบียน = สาขาวันนี้ (JJRD/JJLP/JJOF) → เหมือนเดิมทุกอย่าง]');
    let w = mkWorker(TODAY_REG); await w.T.loadBranchReg(w.env); T = w.T;
    ok(T.brName('JJLP') === 'ลาดพร้าว' && T.brName('OFFICE') === 'ออฟฟิศ' && T.brName('JJBN') === 'JJBN', 'ชื่อเหมือนเดิม');
    ok(T.branchOrder(['OFFICE', 'ZZ', 'JJBN', 'JJRD', 'JJCK', 'JJLP']).join() === 'JJLP,JJRD,JJCK,OFFICE,JJBN,ZZ', 'ลำดับเหมือนเดิม');
    ok(T.storeHint() === 'JJLP หรือ JJRD', 'ข้อความเตือนเหมือนเดิม');
    ok(w.calls.filter((c) => c.startsWith('pnl_branches')).length === 1 && /select=\*/.test(w.calls[0]), 'อ่าน pnl_branches ครั้งเดียวด้วยคีย์เดิม');

    console.log('[ทะเบียนมีสาขาใหม่ JJBN (บางนา)]');
    w = mkWorker([...TODAY_REG, BN]); await w.T.loadBranchReg(w.env); T = w.T;
    ok(T.brName('JJBN') === 'บางนา', 'ชื่อสาขาใหม่ = ชื่อสั้นจากทะเบียน');
    ok(T.brName('JJLP') === 'ลาดพร้าว' && T.brName('JJCK') === 'ครัวกลาง', 'สาขาเดิมยังใช้ชื่อเดิม');
    ok(T.branchOrder(['OFFICE', 'ZZ', 'JJBN', 'JJRD', 'JJCK', 'JJLP']).join() === 'JJLP,JJRD,JJBN,JJCK,OFFICE,ZZ', 'สาขาใหม่ต่อจากรัชดา ก่อนครัวกลาง/ออฟฟิศ');
    ok(T.storeHint() === 'JJLP, JJRD หรือ JJBN', 'ข้อความเตือนรวมรหัสสาขาใหม่');
    ok(T.branchList(dataOf([['A', 'JJLP'], ['B', 'JJBN']]), recsOf([['A', 'JJLP'], ['B', 'JJBN'], ['X', 'OFFICE']])).join() === 'JJLP,JJBN,OFFICE', 'branchList (ลำดับข้อความ LINE) ใช้ลำดับใหม่');
    ok(T.checkCounts(dataOf([['A', 'JJLP'], ['B', 'JJBN'], ['C', 'JJCK'], ['E', '']]), recsOf([['A', 'JJLP'], ['B', 'JJBN'], ['C', 'JJCK'], ['E', '']])) ===
      'ลาดพร้าว 1 · รัชดา 0 · บางนา 1 · ครัวกลาง 1 · ออฟฟิศ 0 · ไม่ระบุ 1', '/report/check นับทุกสาขา (ครัวกลาง/บางนาไม่ตกไป "ไม่ระบุ")');
    await T.loadBranchReg(w.env); await T.loadBranchReg(w.env);
    ok(w.calls.filter((c) => c.startsWith('pnl_branches')).length === 1, 'เรียกซ้ำใน 5 นาทีไม่อ่านซ้ำ (รอบละครั้ง)');
    const inactive = mkWorker([...TODAY_REG, { ...BN, active: false }]); await inactive.T.loadBranchReg(inactive.env);
    ok(inactive.T.brName('JJBN') === 'บางนา' && inactive.T.branchOrder(['JJBN', 'JJCK', 'JJLP']).join() === 'JJLP,JJCK,JJBN', 'สาขาที่ปิดแล้ว: ยังมีชื่อ แต่ไม่อยู่ในกลุ่มสาขาหลัก');

    console.log('[อ่านทะเบียนไม่ได้ (HTTP 500) / ยังไม่รัน SQL]');
    w = mkWorker(null); await w.T.loadBranchReg(w.env); T = w.T;
    ok(T.brName('JJBN') === 'JJBN' && T.brName('JJRD') === 'รัชดา' && T.branchOrder(['JJBN', 'OFFICE', 'JJLP']).join() === 'JJLP,OFFICE,JJBN', 'HTTP 500 = ชื่อ/ลำดับเดิม ไม่พัง');
    ok(w.calls.filter((c) => c.startsWith('pnl_branches')).length === 2, 'ลองอ่านแบบไม่เรียงตาม sort อีกครั้งแล้วเลิก');
    w = mkWorker('nokind'); await w.T.loadBranchReg(w.env); T = w.T;
    ok(T.getReg().stores.join() === 'JJRD,JJLP' && T.brName('JJLP') === 'ลาดพร้าว' && T.storeHint() === 'JJLP หรือ JJRD', 'ไม่มีคอลัมน์ kind/short = เดาจากรหัส (JJOF ไม่ใช่หน้าร้าน) ผลเหมือนเดิม');
    ok(T.branchReg([{ code: 'JJBN', name: 'สาขาบางนา' }]).names.JJBN === 'บางนา', 'ไม่มีชื่อสั้น = ตัดคำว่า "สาขา" ออกจากชื่อเต็ม');
    ok(T.branchReg([{ code: 'jj bn<x>' }, { code: '' }, null]).stores.length === 0, 'รหัสแปลก ๆ จากตาราง (คีย์สาธารณะแก้ได้) ถูกข้าม');

    console.log('[รายงานจริง: สรุปประจำวัน + /report/check]');
    w = mkWorker([...TODAY_REG, BN]);
    const texts = await w.T.buildDailySummary(w.env);
    const all = texts.join('\n---\n');
    const heads = texts.map((t) => t.split('\n')[0]).filter((h) => h.startsWith('📋'));
    ok(heads.join('|') === '📋 สรุปวันนี้ · ลาดพร้าว|📋 สรุปวันนี้ · บางนา|📋 สรุปวันนี้ · ครัวกลาง|📋 สรุปวันนี้ · ออฟฟิศ', 'สรุป LINE: 1 ข้อความ/สาขา เรียงลาดพร้าว → บางนา → ครัวกลาง → ออฟฟิศ (' + heads.length + ')');
    ok(!/JJBN/.test(all), 'ข้อความ LINE ไม่มีรหัสดิบ JJBN');
    const chk = await w.T.runReportCheck(w.env);
    ok(/SN_BN : 1 ครั้ง {2}-> {2}บางนา/.test(chk) && /เข้างาน: ลาดพร้าว \d+ · รัชดา 0 · บางนา 1 · ครัวกลาง \d+ · ออฟฟิศ \d+/.test(chk), '/report/check โชว์ชื่อบางนา + นับแยก');
    ok(/• บางนา : 1 คน/.test(chk), '/report/check สาขาของพนักงานใช้ชื่อบางนา');
    const w0 = mkWorker(TODAY_REG);
    const heads0 = (await w0.T.buildDailySummary(w0.env)).map((t) => t.split('\n')[0]).filter((h) => h.startsWith('📋'));
    ok(heads0.join('|') === '📋 สรุปวันนี้ · ลาดพร้าว|📋 สรุปวันนี้ · ครัวกลาง|📋 สรุปวันนี้ · ออฟฟิศ|📋 สรุปวันนี้ · JJBN', 'ไม่มีบางนาในทะเบียน = ลำดับ/ชื่อเหมือนเดิม (รหัสใหม่ต่อท้าย)');
  } catch (e) { console.log('CRASH', e.stack); fail++; }
  console.log(fail ? fail + ' FAILED' : 'ALL PASSED'); process.exit(fail ? 1 : 0);
})();
