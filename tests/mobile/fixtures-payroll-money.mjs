// ข้อมูลจำลองสำหรับตรวจหน้า 🛡️ เงินประกัน (#dep) และ 🐷 เงินสำรองเลี้ยงชีพ (#pvd) ของแอปเงินเดือน บนมือถือ
// ชื่อสมมติทั้งหมด · พนักงาน 10 คน 2 สาขา (+ออฟฟิศ) · สแกน 70 วันล่าสุด · deposit_entries มีแถว ✎ / 🔒 / 💸 · deposit_payouts 💵 · pvd_* มีสมาชิก/แก้รายงวด/ปิดยอด/ถอน
// ใช้กับ tests/mobile/mobile-check.mjs (แอป id payroll-dep / payroll-pvd) และสคริปต์ถ่ายภาพ — เวลาสแกนอิงเวลาไทยตอนรัน
const BKK = 7 * 3600e3;
const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
/* งวดหน้าร้าน 26 → 25 (คีย์ YYYY-MM) */
const periodOf = d => { const x = new Date(d); if (x.getUTCDate() > 25) x.setUTCMonth(x.getUTCMonth() + 1, 1); return x.getUTCFullYear() + '-' + pad(x.getUTCMonth() + 1); };
const addP = (p, n) => { const [y, m] = p.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1); };

export function payrollMoneyFixture(nowMs = Date.now()) {
  const wall = new Date(nowMs + BKK);
  const biz = new Date(wall); if (biz.getUTCHours() < 6) biz.setUTCDate(biz.getUTCDate() - 1); biz.setUTCHours(0, 0, 0, 0);
  const cur = periodOf(biz), prev = addP(cur, -1), prev2 = addP(cur, -2);
  const NAMES = [['แพร', 'สมใจ ใจดี', 'JJLP'], ['ต้น', 'AUNG KYAW', 'JJLP'], ['ฝน', 'นภา แก้วตา', 'JJLP'], ['บี', 'KHAM SENG', 'JJLP'], ['มายด์', 'วิภาวรรณ ศรีสุข', 'JJLP'],
    ['จูน', 'MYINT OO', 'JJRD'], ['ไอซ์', 'ธนพล ทองดี', 'JJRD'], ['กิ๊ฟ', 'NANG HLA', 'JJRD'], ['ปอนด์', 'กมลวรรณ มีสุข', 'OFFICE'], ['ออม', 'SOMPHONE KEO', 'JJRD'],
    ['โอ๋', 'PHONE SAI', 'JJLP']];
  // ออม/โอ๋ = พ้นสภาพ สะสมเกินเป้า (🏦 โอนคืนนอกสลิป — ออมยังไม่โอน · โอ๋บันทึกโอนแล้ว) · ฝน/มายด์ เบิกเกินค่าแรงงวดนี้ (เงินประกันไม่ได้หัก/หักได้บางส่วน)
  const OPEN = [5000, 2500, 0, 1800, 0, 4000, 0, 1200, 0, 4200, 3800];
  const emps = NAMES.map(([nick, full, branch], i) => ({
    id: i + 1, code: String(5100000000 + i * 7919), nick, full_name: full, branch, dept: branch === 'OFFICE' ? 'ออฟฟิศ' : 'หน้าร้าน', position: branch === 'OFFICE' ? 'บัญชี' : 'เสิร์ฟ',
    wage_type: i % 3 === 2 ? 'daily' : 'monthly', rate: i % 3 === 2 ? 450 : 12000 + i * 500, work_mode: 'shift', shift_id: 1, target_hours: 10, active: i < 9,
    off_weekdays: '', off_count: 0, holiday_pay: branch !== 'OFFICE', must_work_exempt: true,
    deposit_target: i === 4 ? 4000 : 3000, deposit_monthly: i === 4 ? 500 : 300, deposit_opening: OPEN[i], deposit_on: i !== 6,
    deposit_target_v1: 5000, deposit_monthly_v1: 500, bank_name: 'กสิกรไทย', bank_account: String(1000000000 + i * 1111111).slice(0, 10),
    // งวดเริ่มหักรายคน (jj_emp_start.sql · 2026-10-21): ฝนเพิ่งเริ่มหักเงินประกันงวดนี้ · แพรเริ่มหัก สปส. งวดนี้ · ครึ่งหนึ่งเข้า สปส.
    deposit_start: i === 2 ? cur : '', sso_start: i === 0 ? cur : '', sso_on: i % 2 === 0, sso_id: String(1100000000000 + i),
  }));
  const punches = [];
  for (const e of emps) {
    if (!e.active) continue;
    for (let k = 70; k >= 0; k--) {
      if ((e.id + k) % 7 === 0) continue;
      const day = new Date(biz); day.setUTCDate(day.getUTCDate() - k);
      punches.push({ emp_code: e.code, punch_date: ymd(day), punch_time: '08:5' + (k % 10) + ':00', device_sn: '' });
      punches.push({ emp_code: e.code, punch_date: ymd(day), punch_time: '18:0' + (k % 10) + ':00', device_sn: '' });
    }
  }
  let id = 0;
  const dep = [
    { employee_id: 2, period: prev2, amount: 500, note: 'lock' }, { employee_id: 2, period: prev, amount: 500, note: 'lock' },
    { employee_id: 4, period: prev2, amount: 500, note: 'lock' },
    { employee_id: 3, period: prev, amount: 200, note: '' },
    { employee_id: 6, period: cur, amount: -2000, note: 'refund' },
    { employee_id: 11, period: cur, amount: -800, note: 'xfer:' + ymd(biz) },
  ].map(r => ({ id: ++id, created_at: '', ...r }));
  // เบิกกลางเดือนเกินค่าแรง → สุทธิก่อนหักเงินประกันติดลบ (ฝน) / เหลือ ~150 (มายด์ หักได้บางส่วน) — ใช้กับงวด ≥ 2026-10 เท่านั้น
  const adv = cur >= '2026-10' ? [{ id: 1, employee_id: 3, period: cur, amount: 30000, taken_date: ymd(biz), note: '' },
    { id: 2, employee_id: 5, period: cur, amount: 13850, taken_date: ymd(biz), note: '' }] : [];
  const pvdM = [
    { id: 1, employee_id: 1, emp_mode: 'pct', emp_value: 5, er_mode: 'match', er_value: 50, start_period: prev2, stop_period: '', opening_emp: 1000, opening_er: 500, join_date: null, consent: true, note: 'ส่วนร้านสมทบได้คืนเมื่อทำงานครบ 1 ปี (ยังไม่สรุป)' },
    { id: 2, employee_id: 3, emp_mode: 'fixed', emp_value: 500, er_mode: 'fixed', er_value: 200, start_period: prev, stop_period: '', opening_emp: 0, opening_er: 0, join_date: null, consent: false, note: '' },
    { id: 3, employee_id: 7, emp_mode: 'pct', emp_value: 3, er_mode: 'pct', er_value: 3, start_period: prev2, stop_period: '', opening_emp: 0, opening_er: 0, join_date: null, consent: true, note: '' },
    { id: 4, employee_id: 9, emp_mode: 'fixed', emp_value: 1000, er_mode: 'none', er_value: 0, start_period: prev2, stop_period: cur, opening_emp: 2000, opening_er: 0, join_date: null, consent: true, note: '' },
  ];
  const pvdE = [{ id: 1, employee_id: 1, period: prev2, emp_amount: 600, er_amount: 300, note: 'lock' }, { id: 2, employee_id: 3, period: cur, emp_amount: 300, er_amount: null, note: '' }];
  const pvdP = [{ id: 1, employee_id: 9, pay_date: ymd(biz), period: cur, amount: 1500, via: 'cash', note: 'ลาออก — ถอนบางส่วน' }];
  // 🔒 ปิดงวด (2026-10-21): ต้นงวด prev2 ปิดแล้ว 1 คน (ต้น) + ไฟล์ K BIZ ที่จดไว้ (แพร/ฝน ยอดไม่ตรงระบบ) — หน้าต่างปิดงวด/เปิดงวดใหม่ + หน้ารายคนงวดที่ปิด
  const at = new Date(nowMs - 3 * 864e5).toISOString();
  const pay = { days: 22, hours: 198, base: 12500, addSum: 0, deduSum: 500, net: 12000, dep: { target: 5000, monthly: 500, ded: 500, collected: 3000, before: 2500, src: 'lock', on: true } };
  const paySlips = [{ id: 1, employee_id: 2, period: prev2, ver: 1, kind: 'close', batch_id: 1, cycle: 'store', branch: 'JJLP', src: 'calc', net: 12000, base: 12500, add_sum: 0, dedu_sum: 500,
    paid: null, carry: { v: 1, dep: { ded: 500, refund: 0, xfer: 0, collected: 3000, target: 5000 } }, pay, note: '', sha: '', app_ver: '', created_at: at }];
  const payBatches = [
    { id: 1, kind: 'close', period: prev2, cycle: 'all', branch: '', src: 'manual', reason: '', n: 1, total: 12000, meta: {}, app_ver: '', username: 'jjtest', display_name: 'ผู้ทดสอบ', at },
    { id: 2, kind: 'kbiz', period: prev2, cycle: 'all', branch: '', src: 'kbiz', n: 2, total: 2233.5, app_ver: '', username: 'jjtest', display_name: 'ผู้ทดสอบ', at,
      meta: { name: 'KBIZ_Payroll_ALL_' + prev2 + '.xlsx', eff: '05/01/2027', rows: [{ emp_id: 1, nick: 'แพร', acc: '1000000000', name: 'สมใจ ใจดี', amount: 1234.5 }, { emp_id: 3, nick: 'ฝน', acc: '1022222222', name: 'นภา แก้วตา', amount: 999 }] } },
  ];
  // 💵 เบิกเงินประกันคืนนอกสลิป (deposit_payouts · 2026-10-21) — บี ยังทำงานอยู่ เบิกคืนบางส่วนงวดนี้
  const depPo = [{ id: 1, employee_id: 4, period: cur, amount: 500, pay_date: ymd(biz), via: 'cash', note: 'ขอเบิกคืนบางส่วน', created_at: '' }];
  return {
    pay_slips: paySlips, pay_batches: payBatches,
    shifts: [{ id: 1, name: 'กะเช้า', start_time: '09:00', end_time: '18:00', in_grace: 5, out_grace: 0, sort_order: 1, dept_only: '' }],
    employees: emps, punches, deposit_entries: dep, deposit_payouts: depPo, pvd_members: pvdM, pvd_entries: pvdE, pvd_payouts: pvdP, advances: adv,
    payroll_settings: [{ id: 1, cutoff_hour: 6, default_wage: 400, min_fine: 0, late_fine: 0, cut_day: 25, pay_day: 5, adv_day: 15, dep_start: prev2, month_divisor: 30 }],
    devices: [{ sn: 'SN_LP', branch: 'JJLP', name: 'ลาดพร้าว' }],
  };
}
