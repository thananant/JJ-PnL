// สูตร "ต้องสั่ง" ของแอพนับสต๊อก (orderPlan) — รันโค้ดจริงจาก jjmk-stockcheck.html กับสถานการณ์สุ่มหลายพันแบบ + กรณีที่รู้คำตอบ
// ⚠️ 2026-10-17 ครัวกลาง v2 ไม่พอร์ตสูตรนี้แล้ว (brRow/SPD/STK_BR ถูกถอดออก) — ครัวกลางอ่านออเดอร์ที่แอพนับเขียนลง stock_receipts
//    ตอนสาขากดส่งไลน์ แล้วคิด "ส่งมา/มี/ส่ง/ขาด" เอง (sdCalcGroups ใน jjmk-kitchen/src/mod_send.js) จึงไม่มีสูตรซ้ำ 2 ที่ให้เทียบอีก
//    เทสของครัวกลาง v2 อยู่ใน scratchpad ของ session ที่สร้าง (Playwright + Supabase จำลอง · ดู CLAUDE.md หัวข้อ ครัวกลาง v2)
import { load, suite } from './lib.mjs';

// วันขายดีจำลอง (แทนบล็อก SPD จริง — ให้ผลซ้ำได้)
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

// สถานการณ์สุ่ม: สูตรต้องไม่พัง · ยอดสั่ง/วันครอบคลุมต้องสมเหตุสมผล · ผลซ้ำได้ (deterministic)
const t = suite('นับสต๊อก orderPlan (สถานการณ์สุ่ม + กรณีที่รู้คำตอบ)');
const N = 4000;
let bad = 0, nonZero = 0, withDl = 0;
for (let i = 0; i < N && bad < 5; i++) {
  const sc = scenario(i);
  const run = () => {
    stk.S.all = sc.items.map(x => ({ ...x }));
    stk.S.sups = sc.sup ? [sc.sup] : [];
    stk.S.recv = sc.recv;
    stk.S.lastOrd = sc.ords.length ? { [stk.supKey(sc.items[0].sup)]: sc.ords } : {};
    stk.CD = sc.cd; stk.window_SPD_ON = sc.spd;
    return stk.orderPlan();
  };
  let plan, plan2;
  try { plan = run(); plan2 = run(); } catch (e) { bad++; t.ok(false, `orderPlan พังที่สถานการณ์ ${i}: ${e.message} · ${JSON.stringify(sc.sup)}`); continue; }
  if (JSON.stringify(plan) !== JSON.stringify(plan2)) { bad++; t.ok(false, `orderPlan ให้ผลไม่ซ้ำกันที่สถานการณ์ ${i}`); continue; }
  for (const it of sc.items) {
    const row = plan.flatMap(g => g.rows).find(r => r.it.id === it.id);
    if (!row) { bad++; t.ok(false, `สถานการณ์ ${i}: ของ ${it.id} หายจากแผน`); break; }
    const g = plan.find(x => x.rows.includes(row));
    const sug = row.sug == null ? null : Number(row.sug);
    if (sug != null && !(sug >= 0 && Number.isFinite(sug))) { bad++; t.ok(false, `สถานการณ์ ${i}: ยอดสั่งผิดรูป ${row.sug}`); break; }
    if (sug > 0) nonZero++;
    if (g && g.dl && g.dl.d) { withDl++; if (g.dl.d < sc.cd) { bad++; t.ok(false, `สถานการณ์ ${i}: วันส่ง ${g.dl.d} ก่อนวันขาย ${sc.cd}`); break; } }
    if (sug != null && sug > 0 && !(g && g.dl && g.dl.d)) { bad++; t.ok(false, `สถานการณ์ ${i}: มียอดสั่ง ${sug} ทั้งที่ไม่มีวันส่ง`); break; }
  }
}
t.ok(!bad, `${N} สถานการณ์ไม่พัง ผลซ้ำได้ และยอดสั่ง/วันส่งสมเหตุสมผล (มียอดต้องสั่ง > 0 อยู่ ${nonZero} บรรทัด · มีวันส่ง ${withDl} บรรทัด)`);
t.ok(nonZero > N / 10, 'สถานการณ์สุ่มครอบคลุมกรณีที่ต้องสั่งจริง (ไม่ใช่ 0 หมด)');

// กรณีที่รู้คำตอบแน่นอน (ตามกติกาเจ้าของ)
{
  const it = { id: 'x', name: 'หมู', sup: 'ซัพ ก', branch_id: 1, rate_wk: 2, rate_fri: 5, rate_we: 10, qty: 3, out: false };
  const run = (sup, cd, lastOrd = []) => { stk.S.all = [{ ...it }]; stk.S.sups = sup ? [sup] : []; stk.S.recv = {}; stk.S.lastOrd = { 'ซัพ ก': lastOrd }; stk.CD = cd; stk.window_SPD_ON = false; return stk.orderPlan()[0]; };
  // พฤ 2026-10-15 นับตอนปิดร้าน · ซัพสั่งได้ทุกวัน ส่งพรุ่งนี้ (ศ) → ชุดนี้ครอบคลุม 1 วัน (ศ=5) → ต้องสั่ง 5 − 3 = 2
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
