// ข้อมูลจำลองที่สมจริงสำหรับตรวจหน้า 🧑‍🤝‍🧑 แผนผังพนักงาน ของแอปเงินเดือน (jjmk-payroll.html#org)
// ชื่อสมมติทั้งหมด · ใช้กับ tests/mobile/mobile-check.mjs (แอป id payroll-org) และสคริปต์ถ่ายภาพ
// ≥40 คน/สาขาหน้าร้าน · สาขาใหม่จากทะเบียนกลาง (บางนา) · คนล็อกกะเช้าแต่เข้างานจริงกะเย็น · ไม่มีตำแหน่ง ·
// ไม่มีสแกน 14 วัน (ตั้งกะไว้ / ไม่ได้ตั้ง) · พาร์ทไทม์ · นับชั่วโมง · คนไม่ระบุสาขา · เวลาสแกนอิงเวลาไทยตอนรัน
const BKK = 7 * 3600e3;
const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
const hm = d => pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());

export function payrollOrgFixture(nowMs = Date.now()) {
  const wall = new Date(nowMs + BKK);                       // นาฬิกาไทยในรูป UTC
  const biz = new Date(wall); if (biz.getUTCHours() < 6) biz.setUTCDate(biz.getUTCDate() - 1);
  biz.setUTCHours(0, 0, 0, 0);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const SHIFTS = [
    { id: 1, name: 'กะเช้า', start_time: '10:00', end_time: '19:00', in_grace: 5, out_grace: 0, sort_order: 1, dept_only: '' },
    { id: 2, name: 'กะกลาง', start_time: '15:00', end_time: '00:00', in_grace: 5, out_grace: 0, sort_order: 2, dept_only: '' },
    { id: 3, name: 'กะเย็น', start_time: '18:00', end_time: '03:00', in_grace: 5, out_grace: 0, sort_order: 3, dept_only: '' },
    { id: 4, name: 'กะเช้า (ล้างจาน)', start_time: '11:00', end_time: '20:00', in_grace: 5, out_grace: 0, sort_order: 4, dept_only: 'ล้างจาน' },
    { id: 5, name: 'กะครัวกลาง', start_time: '07:00', end_time: '16:00', in_grace: 5, out_grace: 0, sort_order: 5, dept_only: 'ครัวกลาง' },
  ];
  const T = { m: ['10:00', '19:00'], d: ['15:00', '00:00'], n: ['18:00', '03:00'], w: ['11:00', '20:00'], k: ['07:00', '16:00'], p: ['18:00', '23:30'], h: ['10:00', '20:00'], o: ['09:00', '18:00'] };
  const POS = [
    ['Manager', ['ผู้จัดการสาขา', 'รองผู้จัดการ', 'ผู้ช่วยผู้จัดการ', 'หัวหน้ากะ']],
    ['หน้าร้าน', ['แคชเชียร์', 'ต้อนรับ', 'เสิร์ฟ', 'บาร์น้ำ']],
    ['Kitchen', ['หัวหน้าครัว', 'ครัว', 'เตรียมของ', 'ล้างจาน']],
    ['ครัวกลาง', ['หัวหน้าครัวกลาง', 'พนักงานครัวกลาง']],
    ['ออฟฟิศ', ['ผู้จัดการฝ่ายบุคคล', 'บัญชี', 'จัดซื้อ']],
  ];
  const deptOf = p => (POS.find(([, ps]) => ps.includes(p)) || ['หน้าร้าน'])[0];
  const NICK = ['ต้น', 'ฝน', 'บี', 'แตง', 'ปอ', 'มายด์', 'จูน', 'ไอซ์', 'กิ๊ฟ', 'เจมส์', 'ปอนด์', 'ปิ๊ป', 'คำแก้ว', 'ดาวเรือง', 'ออม', 'บุญมี', 'ปู', 'ต่าย', 'ยุ้ย', 'แสงเดือน',
    'น้ำ', 'เอ', 'โบว์', 'ตาล', 'มิ้นท์', 'นุ่น', 'แพร', 'หลิน', 'เมย์', 'ฟ้า', 'อ้อม', 'จ๋า', 'เก่ง', 'บอส', 'ภูมิ', 'นัท', 'ก้อย', 'แบงค์', 'ป๊อป', 'ส้ม',
    'หนิง', 'เปิ้ล', 'ตุ๊ก', 'หมิว', 'โอ๋', 'แป้ง', 'อิ๊ก', 'เล็ก', 'ใหม่', 'ขวัญ', 'จอย', 'ปลา', 'แจน', 'กุ้ง', 'ตูน', 'ลูกพีช', 'เฟิร์น', 'กาย', 'ต้อง', 'นิว'];
  const FULL = ['สมชาย ใจดี', 'AUNG KYAW', 'KHAM SENG', 'วิภาวรรณ ศรีสุข', 'MYINT OO', 'นภา แก้วตา', 'SOMPHONE KEO', 'ธนพล ทองดี', 'NANG HLA', 'กมลวรรณ มีสุข'];
  const emps = [], punches = [];
  let id = 0, ni = 0;
  /* แผนเข้างานจริง: main = กะหลักที่ทำจริง · alt = กะอื่นบางวัน · lock = กะที่ตั้งไว้ในข้อมูลพนักงาน · scan:false = ไม่มีสแกน 14 วัน */
  /* รูปพนักงานจำลอง (ทุกคนที่ 3) — SVG ในไฟล์ ไม่ต้องโหลดจากเน็ต */
  const face = n => 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="'
    + ['#5b8def', '#e8590c', '#2f9e44', '#ae3ec9', '#f08c00', '#1098ad'][n % 6] + '"/><circle cx="20" cy="16" r="8" fill="#fff"/><rect x="8" y="27" width="24" height="13" rx="6" fill="#fff"/></svg>');
  function add(br, pos, o = {}) {
    id++;
    const nick = o.nick || NICK[ni++ % NICK.length] + (ni > NICK.length ? String(Math.floor(ni / NICK.length) + 1) : '');
    const code = String(4100000000 + id * 7919);
    emps.push({ id, code, nick, full_name: o.full || FULL[id % FULL.length], dept: pos ? deptOf(pos) : (o.dept || ''), branch: br, position: pos,
      photo_url: o.photo || (id % 3 ? null : face(id)), wage_type: o.mode === 'hourly' ? 'hourly' : 'daily', rate: o.mode === 'hourly' ? 60 : 450, work_mode: o.mode || 'shift',
      shift_id: o.lock || null, target_hours: o.target || 10, active: o.active !== false, off_weekdays: '', off_count: 0 });
    if (o.scan === false) return;
    const sn = o.sn || { JJLP: 'SN_LP', JJRD: 'SN_RD', JJBN: 'SN_BN', JJCK: 'SN_LP', OFFICE: 'SN_LP' }[br] || 'SN_LP';
    const main = o.main || 'm';
    for (let k = 13; k >= 0; k--) {
      if ((id * 3 + k) % 7 === 0 && k) continue;                 // วันหยุดสัปดาห์ละวัน
      const day = new Date(biz); day.setUTCDate(day.getUTCDate() - k);
      const sh = o.alt && rnd() < o.altP ? o.alt : main;
      const [s, e] = T[sh];
      const tIn = new Date(day); tIn.setUTCHours(+s.slice(0, 2), +s.slice(3) - 12 + Math.floor(rnd() * 20));
      const tOut = new Date(day); tOut.setUTCHours(+e.slice(0, 2), +e.slice(3) - 3 + Math.floor(rnd() * 25));
      if (tOut <= tIn) tOut.setUTCDate(tOut.getUTCDate() + 1);
      const s2 = k === 0 && o.todaySn ? o.todaySn : sn;
      for (const t of [tIn, tOut]) if (t.getTime() <= wall.getTime()) punches.push({ emp_code: code, punch_date: ymd(t), punch_time: hm(t) + ':00', device_sn: s2 });
    }
  }
  const store = (br, n, extra) => {
    add(br, 'ผู้จัดการสาขา', { mode: 'hours', main: 'h' });
    add(br, 'รองผู้จัดการ', { main: 'm' });
    add(br, 'รองผู้จัดการ', { main: 'n', lock: 1 });                      // ล็อกกะเช้าไว้ แต่เข้ากะเย็นจริง
    add(br, 'หัวหน้ากะ', { main: 'd' });
    const plan = [['แคชเชียร์', 'm'], ['แคชเชียร์', 'd'], ['แคชเชียร์', 'n'], ['ต้อนรับ', 'n'], ['ต้อนรับ', 'm'],
      ['บาร์น้ำ', 'n'], ['บาร์น้ำ', 'n'], ['บาร์น้ำ', 'm'], ['หัวหน้าครัว', 'n'], ['ครัว', 'm'], ['ครัว', 'm'], ['ครัว', 'n'], ['ครัว', 'n'], ['ครัว', 'd'],
      ['เตรียมของ', 'm'], ['เตรียมของ', 'm'], ['ล้างจาน', 'w'], ['ล้างจาน', 'w'], ['ล้างจาน', 'n']];
    for (const [p, m] of plan.slice(0, n)) add(br, p, { main: m, alt: m === 'n' ? 'm' : 'n', altP: 0.18 });
    for (let i = 0; i < Math.max(0, n - 10); i++) add(br, 'เสิร์ฟ', { main: ['n', 'n', 'd', 'm'][i % 4], alt: 'm', altP: 0.15, lock: i % 5 === 0 ? 1 : null });
    if (extra) extra();
  };
  store('JJLP', 30, () => {
    add('JJLP', 'เสิร์ฟ', { main: 'n', lock: 1, nick: 'ต้นข้าว' });                // ล็อกกะเช้า แต่เข้ากะเย็นทุกวัน
    add('JJLP', 'ผู้ช่วยผู้จัดการ', { scan: false, nick: 'โอ๊ต' });                // รองผจก. ใหม่ ยังไม่มีสแกน ไม่ได้ตั้งกะ
    add('JJLP', 'แคชเชียร์', { scan: false, lock: 2, nick: 'เบล' });              // ไม่มีสแกน 14 วัน ใช้กะที่ตั้ง (กลาง)
    add('JJLP', 'ครัว', { scan: false, nick: 'น้องใหม่' });                        // ไม่มีอะไรเลย = ยังไม่รู้กะ
    add('JJLP', '', { main: 'n', nick: 'มิน', dept: 'หน้าร้าน' });                 // ยังไม่มีตำแหน่ง
    for (let i = 0; i < 4; i++) add('JJLP', 'เสิร์ฟ', { mode: 'hourly', main: 'p' });
    add('JJLP', 'เสิร์ฟ', { main: 'n', photo: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#5b8def"/><circle cx="20" cy="16" r="8" fill="#fff"/><rect x="8" y="27" width="24" height="13" rx="6" fill="#fff"/></svg>'), nick: 'มีรูป' });
  });
  store('JJRD', 30, () => {
    add('JJRD', 'เสิร์ฟ', { main: 'n', todaySn: 'SN_LP', nick: 'ไปช่วย' });         // วันนี้ไปช่วยลาดพร้าว
    add('JJRD', '', { main: 'm', nick: 'ยังไม่ตั้ง', dept: 'Kitchen' });
    for (let i = 0; i < 3; i++) add('JJRD', 'เสิร์ฟ', { mode: 'hourly', main: 'p' });
    add('JJRD', 'บาร์น้ำ', { scan: false, lock: 3, nick: 'ลาป่วย' });
  });
  store('JJBN', 8);                                                              // สาขาใหม่ (บางนา) จากทะเบียนกลาง
  add('JJCK', 'หัวหน้าครัวกลาง', { main: 'k' });
  for (let i = 0; i < 8; i++) add('JJCK', 'พนักงานครัวกลาง', { main: 'k' });
  add('JJCK', '', { main: 'k', dept: 'ครัวกลาง', nick: 'ครัวใหม่' });
  add('OFFICE', 'ผู้จัดการฝ่ายบุคคล', { mode: 'hours', main: 'o', target: 9 });
  for (const p of ['บัญชี', 'บัญชี', 'จัดซื้อ', 'จัดซื้อ', 'บัญชี']) add('OFFICE', p, { mode: 'hours', main: 'o', target: 9 });
  for (let i = 0; i < 3; i++) add('', '', { main: 'n', sn: 'SN_RD' });             // เครื่องสแกนสร้างให้ (ยังไม่ระบุสาขา)
  add('JJLP', 'เสิร์ฟ', { active: false, nick: 'ลาออกแล้ว' });
  const org = []; let oid = 0;
  for (const [d, ps] of POS) ps.forEach((n, i) => org.push({ id: ++oid, dept: d, name: n, sort: i + 1 }));
  return {
    shifts: SHIFTS, employees: emps, punches, org_positions: org,
    devices: [{ sn: 'SN_LP', branch: 'JJLP', name: 'ลาดพร้าว' }, { sn: 'SN_RD', branch: 'JJRD', name: 'รัชดา' }, { sn: 'SN_BN', branch: 'JJBN', name: 'บางนา' }],
    pnl_branches: [
      { code: 'JJRD', name: 'สาขารัชดา', short: 'รัชดา', kind: 'store', sort: 1, stk_id: 'b19f0a17b4472', active: true },
      { code: 'JJLP', name: 'สาขาลาดพร้าว', short: 'ลาดพร้าว', kind: 'store', sort: 2, stk_id: 'b19f0a17b448212', active: true },
      { code: 'JJBN', name: 'สาขาบางนา', short: 'บางนา', kind: 'store', sort: 3, stk_id: 'JJBN', color: '#2E8B57', active: true },
      { code: 'JJOF', name: 'ออฟฟิศ', short: 'ออฟฟิศ', kind: 'office', sort: 9, active: true },
    ],
  };
}
