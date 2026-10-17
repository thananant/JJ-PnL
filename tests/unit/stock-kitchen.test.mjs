// สูตร "ต้องสั่ง/ต้องส่ง" — แอพนับสต๊อก (orderPlan) กับครัวกลาง (brRow) ต้องได้ตัวเลขเดียวกันทุกกรณี
// CLAUDE.md: "สูตรพอร์ตมาจาก orderPlan() แบบบรรทัดต่อบรรทัด — แก้สูตรสั่งของในแอพนับสต๊อกเมื่อไร ต้องแก้ฟังก์ชัน br* ในครัวกลางให้ตรงกันด้วย"
// เทสนี้รันโค้ดจริงของทั้ง 2 ไฟล์กับสถานการณ์สุ่มหลายพันแบบ (ซัพวันตายตัว/สั่งล่วงหน้า/ทุกวัน/ทุก N วัน/ไม่มีข้อมูลซัพ + ของกำลังมา + วันขายดี)
import { load, suite } from './lib.mjs';

// วันขายดีจำลอง (ใช้ตัวเดียวกันทั้ง 2 แอป — บล็อก SPD จริงเหมือนกันทุกไบต์ ตรวจแล้วใน precheck)
const SPD_STUB = `function spdHit(bid,ds){ var h=0; for(var i=0;i<ds.length;i++) h=(h*31+ds.charCodeAt(i))%9973; return (window_SPD_ON && (h+bid)%11===0)?{g:2}:null; } var window_SPD_ON=true;`;

const stk = load('jjmk-stockcheck.html', {
  prelude: SPD_STUB + `
    var S={all:[],sups:[],recv:{},lastOrd:{}}; var CD='';
    function $(q){ return q==='#cd'?{value:CD}:null; } function bizToday(){ return CD; }
    function ovrMap(){ return {}; } function buOf(){ return null; } function billName(it){ return it.name; }
    function uSame(){ return true; } function cmpItem(){ return 0; } function covRange(){ return ''; }`,
  vars: ['num', 'DOW_EN', 'supKey', 'counted', 'dowKey', 'supAhead'],
  fns: ['addDays', 'nextDow', 'dayGrp', 'rateOn', 'supSched', 'supModeOf', 'supCyc', 'ivState', 'deliveryDate', 'nextDeliveryAfter', 'sumRate', 'inTransit', 'orderPlan'],
});
const kit = load('jjmk-kitchen.html', {
  prelude: SPD_STUB + `var S={br:{sups:[]}};`,
  vars: ['num', 'BR_DOW', 'brDowKey', 'brSupKey', 'brAhead', 'brCyc'],
  fns: ['brAddDays', 'brNextDow', 'brDayGrp', 'brRateOn', 'brSup', 'brMode', 'brDelivery', 'brIvState', 'brPlanDelivery', 'brNextAfter', 'brSumRate', 'brInTransit', 'brRow'],
});

// สุ่มแบบกำหนดเมล็ด (ผลซ้ำได้ทุกครั้ง)
let seed = 20261017;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = a => a[Math.floor(rnd() * a.length)];
const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const addDays = (ds, n) => stk.addDays(ds, n);

function scenario(i) {
  const cd = addDays('2026-09-01', Math.floor(rnd() * 120));
  const name = pick(['ซัพ ก', 'ครัวกลาง', 'Makro ', 'ไม่มีในตาราง']);
  const mode = pick(['fixed', 'fixed', 'any', 'interval', 'interval', 'legacy', 'none']);
  let sup = null;
  if (mode !== 'none') {
    sup = { name: name.trim().toUpperCase() === name.trim() ? name : '  ' + name + ' ' };   // ชื่อเว้นวรรค/ตัวพิมพ์ต่าง ต้องจับคู่ได้
    if (mode === 'fixed' || mode === 'legacy') {
      const sc = {}; const n = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) sc[pick(DOW)] = pick(DOW);
      sup.schedule = sc; if (mode === 'fixed') sup.order_mode = 'fixed';
      sup.order_ahead = pick([0, 0, 1, 2, 6, 9, -1, '3', null]);
    } else {
      sup.order_mode = mode;
      sup.lead_days = pick([1, 2, 3, null, 0, '2']);
      if (mode === 'interval') sup.cycle_days = pick([2, 7, 15, 30, 60, 90, 1, 120, null, '10']);
    }
  }
  const items = [];
  const nItems = 1 + Math.floor(rnd() * 3);
  for (let k = 0; k < nItems; k++) {
    const st = rnd();
    items.push({ id: 'p' + i + '_' + k, name: 'ของ' + k, sup: name, branch_id: 1 + (k % 2),
      rate_wk: pick([0, 1, 2.5, 4, '3']), rate_fri: pick([0, 2, 5.25, 8]), rate_we: pick([0, 3, 6, 12.125]),
      qty: st < 0.15 ? null : st < 0.25 ? '' : +(rnd() * 40).toFixed(2), out: st > 0.92 });
  }
  const recv = {};
  for (const it of items) if (rnd() < 0.5) {
    recv[it.id] = {};
    for (let k = 0; k < 3; k++) recv[it.id][addDays(cd, -Math.floor(rnd() * 8))] = +(rnd() * 20).toFixed(1);
  }
  const ords = rnd() < 0.7 ? Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => addDays(cd, -Math.floor(rnd() * 100))) : [];
  return { cd, sup, items, recv, ords, spd: rnd() < 0.5 };
}

const t = suite('นับสต๊อก orderPlan ↔ ครัวกลาง brRow (สถานการณ์สุ่ม)');
const N = 4000;
let bad = 0, nonZero = 0;
for (let i = 0; i < N && bad < 5; i++) {
  const sc = scenario(i);
  // ฝั่งแอพนับสต๊อก
  stk.S.all = sc.items.map(x => ({ ...x }));
  stk.S.sups = sc.sup ? [sc.sup] : [];
  stk.S.recv = sc.recv;
  stk.S.lastOrd = sc.ords.length ? { [stk.supKey(sc.items[0].sup)]: sc.ords } : {};
  stk.CD = sc.cd; stk.window_SPD_ON = sc.spd; kit.window_SPD_ON = sc.spd;
  const plan = stk.orderPlan();
  // ฝั่งครัวกลาง: ยอดนับ = cnt · ใบสั่งล่าสุดของซัพ (ก่อนวันขาย) = last  — เหมือนที่ brLoadBranch เตรียมให้
  kit.S.br.sups = stk.S.sups;
  const prior = sc.ords.filter(d => d < sc.cd).sort();
  const last = prior.length ? { [kit.brSupKey(sc.items[0].sup)]: prior[prior.length - 1] } : {};
  for (const it of sc.items) {
    const row = plan.flatMap(g => g.rows).find(r => r.it.id === it.id);
    const cnt = it.qty === null && !it.out ? {} : it.qty === '' && !it.out ? {} : { [it.id]: { qty: it.qty, out: it.out } };
    const k = kit.brRow(it, cnt, sc.cd, sc.recv, last);
    const a = { have: row.have, need: row.need, order: row.sug, left: row.left, onWay: row.onWay, d: row.cov.days ? row.cov.days : 0 };
    const b = { have: k.have, need: k.need, order: k.order, left: k.left, onWay: k.onWay, d: k.cov.days ? k.cov.days : 0 };
    if (a.order > 0) nonZero++;
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      bad++;
      t.ok(false, `ต่างกันที่สถานการณ์ ${i} (วันขาย ${sc.cd} · ซัพ ${JSON.stringify(sc.sup)} · ของ ${JSON.stringify(it)}):\n      นับสต๊อก ${JSON.stringify(a)}\n      ครัวกลาง ${JSON.stringify(b)}`);
    }
  }
}
t.ok(!bad, `${N} สถานการณ์ได้ตัวเลขเดียวกัน (มียอดต้องสั่ง > 0 อยู่ ${nonZero} บรรทัด)`);
t.ok(nonZero > N / 10, 'สถานการณ์สุ่มครอบคลุมกรณีที่ต้องสั่งจริง (ไม่ใช่ 0 หมด)');

// กรณีที่รู้คำตอบแน่นอน (ตามกติกาเจ้าของ)
{
  const it = { id: 'x', name: 'หมู', sup: 'ซัพ ก', branch_id: 1, rate_wk: 2, rate_fri: 5, rate_we: 10, qty: 3, out: false };
  const run = (sup, cd, lastOrd = []) => { stk.S.all = [{ ...it }]; stk.S.sups = sup ? [sup] : []; stk.S.recv = {}; stk.S.lastOrd = { 'ซัพ ก': lastOrd }; stk.CD = cd; stk.window_SPD_ON = false; return stk.orderPlan()[0]; };
  // พฤ 2026-10-15 นับตอนปิดร้าน · ซัพสั่งได้ทุกวัน ส่งพรุ่งนี้ (ศ) → ชุดนี้ครอบคลุม 1 วัน (ศ=5) · ระหว่างรอใช้ 0 วัน → ต้องสั่ง 5−3 = 2
  let p = run({ name: 'ซัพ ก', order_mode: 'any', lead_days: 1 }, '2026-10-15');
  t.eq([p.dl.d, p.rows[0].sug], ['2026-10-16', 2], 'สั่งได้ทุกวัน ส่งพรุ่งนี้: ต้องสั่ง = ใช้วันศุกร์ 5 − มี 3');
  // สั่งทุก 7 วัน เคยสั่ง 2026-10-10 → ยังไม่ครบรอบ (ครบ 17) = ไม่มียอด
  p = run({ name: 'ซัพ ก', order_mode: 'interval', cycle_days: 7, lead_days: 1 }, '2026-10-15', ['2026-10-10']);
  t.eq([p.dl.d, p.rows[0].sug], ['', null], 'สั่งทุก 7 วัน ยังไม่ครบรอบ = วันนี้ไม่สั่ง');
  // ครบรอบ → ครอบคลุม 7 วัน ศ–พฤ = 5 + 10 + 10 + 2×4 = 33 → ต้องสั่ง 33 − 3 = 30
  p = run({ name: 'ซัพ ก', order_mode: 'interval', cycle_days: 7, lead_days: 1 }, '2026-10-15', ['2026-10-08']);
  t.eq([p.dl.d, p.covDays, p.rows[0].sug], ['2026-10-16', 7, 30], 'สั่งทุก 7 วัน ครบรอบ: ครอบคลุม 7 วัน = 33 − 3');
  // ไม่ได้ตั้ง/ผิดช่วง (1 วัน) = 15 วัน
  t.eq(stk.supCyc({ cycle_days: 1 }), 15, 'รอบสั่ง 1 วัน (ผิดช่วง) → ใช้ 15 วัน');
  t.eq(stk.supCyc({ cycle_days: '90' }), 90, 'รอบสั่ง 90 วัน ใช้ได้');
}
process.exitCode = t.done() ? 1 : 0;
