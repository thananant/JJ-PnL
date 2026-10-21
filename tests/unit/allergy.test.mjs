// JJ Allergy (jjmk-allergy.html) — ตัวตัดสิน ❌/⚠️/❔/✅ ของการค้นหาตามสิ่งที่ลูกค้าแพ้
// ความปลอดภัยของลูกค้ามาก่อน: สงสัย = ไม่บอกว่าทานได้
import { load, suite } from './lib.mjs';

const A = load('jjmk-allergy.html', { vars: ['ALG_BUILTIN', 'algNorm'], fns: ['algWords', 'algResolve', 'algClassify'] });
const t = suite('JJ Allergy · ค้นหาตามสิ่งที่แพ้');
const st = (it, codes, words = []) => A.algClassify(it, codes, words).st;

const pork = { name: 'หมูหมักซีอิ๊ว', ingredients: 'หมูสามชั้น, ซีอิ๊วขาว, น้ำมันหอย, กระเทียม', contains: ['pork', 'soy', 'mollusc'], may: ['wheat'], checked: true };
const veg = { name: 'ผักรวม', ingredients: 'ผักกาด, ผักบุ้ง', contains: [], may: [], checked: true };
const neu = { name: 'น้ำจิ้มสุกี้ใหม่', ingredients: '', contains: [], may: [], checked: false };

t.eq(st(pork, ['soy']), 'no', 'มีถั่วเหลือง (contains) → ❌');
t.eq(st(pork, ['wheat']), 'may', 'แป้งสาลีอยู่ใน "อาจปนเปื้อน" → ⚠️');
t.eq(st(pork, ['soy', 'wheat']), 'no', 'มีทั้ง contains และ may → ❌ ชนะ');
t.eq(st(veg, ['soy']), 'ok', 'ไม่มีสิ่งที่แพ้ + ยืนยันแล้ว → ✅');
t.eq(st(neu, ['soy']), 'unk', 'ยังไม่ยืนยันข้อมูล → ❔ ห้ามบอกว่าทานได้');
t.eq(st(veg, []), 'none', 'ไม่ได้เลือกอะไร → none (แสดงรายการเฉย ๆ)');
t.eq(st({ ...neu, contains: ['egg'] }, ['egg']), 'no', 'ยังไม่ยืนยันแต่ใส่ว่ามี → ❌ (ไม่ใช่ ❔)');

// คำที่พิมพ์เอง → ค้นในชื่อ + ส่วนผสม + หมายเหตุ
t.eq(st(veg, [], A.algWords('ผักบุ้ง')), 'no', 'พิมพ์คำที่อยู่ในส่วนผสม → ❌');
t.eq(st({ ...veg, note: 'ผัดกับน้ำมันงา' }, [], A.algWords('งา')), 'no', 'คำที่อยู่ในหมายเหตุ → ❌');
t.eq(st(veg, [], A.algWords('มะม่วง')), 'ok', 'คำที่ไม่อยู่ในอาหาร + ยืนยันแล้ว → ✅');
t.eq(A.algClassify(pork, [], A.algWords('กระเทียม')).words, ['กระเทียม'], 'บอกคำที่เจอ');
t.eq(A.algWords(' กุ้ง, ปู/ไข่  นม '), ['กุ้ง', 'ปู', 'ไข่', 'นม'], 'แยกคำด้วย , / ช่องว่าง');
t.eq(A.algWords('ก, x'), [], 'คำสั้นกว่า 2 ตัวอักษรไม่นับ (กันเจอทุกเมนู)');

// คำ → สิ่งที่แพ้ในรายการ (เผื่อไว้ก่อน)
const R = q => A.algResolve(A.algWords(q), A.ALG_BUILTIN);
t.ok(R('กุ้ง').includes('crust'), 'พิมพ์ "กุ้ง" = นับ 🦐 กุ้ง/ปู');
t.ok(R('น้ำมันหอย').includes('mollusc'), 'พิมพ์ "น้ำมันหอย" = นับ 🦑 หอย');
t.ok(R('ถั่ว').includes('peanut') && R('ถั่ว').includes('soy'), 'พิมพ์ "ถั่ว" = นับถั่วลิสง + ถั่วเหลือง');
t.ok(R('ปลาหมึก').includes('mollusc'), 'พิมพ์ "ปลาหมึก" = นับหอย/ปลาหมึก');
t.eq(R('ผักชี'), [], 'คำที่ไม่ตรงสิ่งที่แพ้ไหนเลย = ไม่นับเพิ่ม');
t.ok(R('มะม่วง').includes('treenut'), 'พิมพ์ "มะม่วง" = นับถั่วเปลือกแข็งด้วย (มะม่วงหิมพานต์ — เผื่อไว้ก่อน)');
t.eq(new Set(A.ALG_BUILTIN.map(a => a.k)).size, A.ALG_BUILTIN.length, 'รหัสสิ่งที่แพ้มาตรฐานไม่ซ้ำ');

process.exitCode = t.done() ? 1 : 0;
