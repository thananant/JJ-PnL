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

const f1 = t.done();

// ---------- ส่งออก/นำเข้า CSV (แก้ใน Google Sheet แล้วนำกลับ) ----------
const C = load('jjmk-allergy.html', {
  vars: ['ALG_BUILTIN', 'algNorm', 'KINDS', 'CSV_BASE', 'CSV_TAIL', 'csvYes', 'csvNo', 'kindTxt'],
  fns: ['csvEsc', 'csvParse', 'algCell', 'algCsvHeader', 'algCsvLine', 'algCsvRows', 'algMerge'] });
const u = suite('JJ Allergy · ส่งออก/นำเข้า CSV');
const algs = C.ALG_BUILTIN;
const item = { id: 7, name: 'หมู "พิเศษ", หมัก', kind: 'meat', cat: 'ชุดหมู', ingredients: 'หมู\nซีอิ๊ว', contains: ['pork', 'soy'], may: ['wheat'],
  note: '', checked: true, active: true, updated_at: '2026-10-01T00:00:00Z' };
const csv = '\uFEFF' + C.algCsvHeader(algs).map(C.csvEsc).join(',') + '\r\n' + C.algCsvLine(item, algs, C.KINDS) + '\r\n';
const tab = C.csvParse(csv);
u.eq(tab.length, 2, 'ส่งออกแล้วอ่านกลับได้ 2 แถว (หัว + 1) แม้ชื่อมี " , และส่วนผสมขึ้นบรรทัด');
let P = C.algCsvRows(tab, algs, C.KINDS);
u.eq(P.errors, [], 'ไฟล์ที่ส่งออกเอง ไม่มีข้อผิดพลาด');
u.eq(P.rows[0].d.name, item.name, 'ชื่อกลับมาตรงทุกตัวอักษร');
u.eq(P.rows[0].d.ingredients, 'หมู\nซีอิ๊ว', 'ส่วนผสมหลายบรรทัดกลับมาตรง');
u.eq(C.algMerge(item, P.rows[0].d).ch, [], 'ส่งออกแล้วนำกลับโดยไม่แก้ = ไม่เปลี่ยนอะไร (ไม่เขียนทับ)');
u.eq([P.rows[0].id, P.rows[0].updated_at], [7, '2026-10-01T00:00:00Z'], 'จับคู่ด้วย id + แก้ล่าสุด (กันทับงานคนอื่น)');

// แก้ในชีต: ใส่ อาจปน ที่ไข่ · เอา มี ออกจากถั่วเหลือง · เพิ่มแถวใหม่
const head = tab[0], ci = k => head.findIndex(h => h.endsWith('[' + k + ']'));
const r1 = [...tab[1]]; r1[ci('egg')] = 'อาจปน'; r1[ci('soy')] = '';
const r2 = head.map(() => ''); r2[1] = 'น้ำจิ้มใหม่'; r2[2] = 'น้ำจิ้ม/ซอส'; r2[ci('sesame')] = 'มี';
P = C.algCsvRows([head, r1, r2, head.map(() => '')], algs, C.KINDS);
u.eq(P.rows.length, 2, 'แถวว่างท้ายชีตไม่นับ');
let m = C.algMerge(item, P.rows[0].d);
u.eq([m.nw.contains.sort(), m.nw.may.sort()], [['pork'], ['egg', 'wheat']], 'แก้ช่องสิ่งที่แพ้ในชีต → มี/อาจปนตรงตามชีต');
u.eq(m.ch.sort(), ['contains', 'may'], 'บอกช่องที่เปลี่ยน');
u.eq([P.rows[1].id, P.rows[1].d.kind, C.algMerge(null, P.rows[1].d).nw.contains], [null, 'sauce', ['sesame']], 'แถวใหม่ (id ว่าง) · ประเภทพิมพ์ภาษาไทยได้');
u.eq(C.algMerge(null, P.rows[1].d).nw.checked, false, 'แถวใหม่ไม่ได้ใส่ ยืนยัน = ❔ ยังไม่ยืนยัน');

// คอลัมน์สิ่งที่แพ้ที่ไม่มีในไฟล์ = คงค่าเดิม (เช่น เพิ่มสิ่งที่แพ้ใหม่หลังส่งออก)
const extra = [...algs, { k: 'x_cor', ic: '🌿', n: 'ผักชี' }];
m = C.algMerge({ ...item, contains: ['pork', 'soy', 'x_cor'] }, C.algCsvRows(tab, algs, C.KINDS).rows[0].d);
u.ok(m.nw.contains.includes('x_cor') && !m.ch.includes('contains'), 'สิ่งที่แพ้ที่ไม่มีคอลัมน์ในไฟล์ = ไม่ลบทิ้ง');
u.ok(C.algCsvHeader(extra).includes('ผักชี [x_cor]'), 'สิ่งที่แพ้ที่เพิ่มเองมีคอลัมน์ตอนส่งออก');

// ค่าที่อ่านไม่ออก = ฟ้อง ไม่เดา
for (const [v, want] of [['มี', 'has'], ['h', 'has'], ['✓', 'has'], ['x', 'has'], ['อาจปน', 'may'], ['m', 'may'], ['อาจปนเปื้อน', 'may'], ['ไม่', 'no'], ['ไม่มี', 'no'], ['-', 'no'], ['', ''], ['?', ''], ['ไม่ชัวร์', '']]) u.eq(C.algCell(v), want, `ช่อง "${v}" = ${want || 'ไม่ชัวร์'}`);
u.eq(C.algCell('นิดหน่อย'), null, 'ค่าแปลก ๆ = อ่านไม่ออก (null)');
const r3 = [...tab[1]]; r3[ci('egg')] = 'นิดหน่อย';
P = C.algCsvRows([head, r3], algs, C.KINDS);
u.ok(P.rows.length === 0 && /นิดหน่อย/.test(P.errors[0] || ''), 'แถวที่มีค่าอ่านไม่ออก = ข้ามทั้งแถว + บอกแถว/ช่อง');
const r4 = [...tab[1]]; r4[2] = 'อาหารทะเล';
u.ok(/ประเภท/.test(C.algCsvRows([head, r4], algs, C.KINDS).errors[0] || ''), 'ประเภทที่ไม่รู้จัก = ข้ามแถว');
u.ok(/ชื่อ/.test(C.algCsvRows([['a', 'b'], ['1', '2']], algs, C.KINDS).errors[0] || ''), 'ไฟล์ที่ไม่ใช่แม่แบบ (ไม่มีคอลัมน์ชื่อ) = ไม่นำเข้า');
u.eq(C.csvYes('ใช่') && C.csvYes('✅') && !C.csvYes(''), true, 'ยืนยันแล้ว = ใช่/✅ · ว่าง = ไม่ยืนยัน');

const f2 = u.done();

// ---------- ยืนยันว่าไม่มี รายสิ่ง (ตารางของร้าน h/m/-/?) ----------
const w = suite('JJ Allergy · ยืนยันว่าไม่มี รายสิ่ง (-)');
const sauce = { name: 'น้ำจิ้มหม่าล่า', kind: 'sauce', contains: ['wheat', 'soy'], may: ['peanut'], none: ['crust', 'fish'], checked: false };
w.eq(st(sauce, ['crust']), 'ok', 'กุ้ง = "-" ยืนยันไม่มี → ✅ แม้ทั้งรายการยังไม่ยืนยัน');
w.eq(st(sauce, ['crust', 'fish']), 'ok', 'เลือกหลายอย่าง ยืนยันไม่มีครบทุกอย่าง → ✅');
w.eq(st(sauce, ['crust', 'egg']), 'unk', 'มีอย่างหนึ่งเป็น "?" (ไข่) → ❔ ห้ามบอกทานได้');
w.eq(A.algClassify(sauce, ['crust', 'egg']).unk, ['egg'], 'บอกว่ายังไม่รู้เรื่องไข่');
w.eq(st(sauce, ['soy']), 'no', 'มี → ❌');
w.eq(st(sauce, ['peanut', 'crust']), 'may', 'อาจมี → ⚠️');
w.eq(st(sauce, ['crust'], A.algWords('ผักชี')), 'unk', 'พิมพ์คำเอง + ยังไม่ยืนยันทั้งรายการ → ❔ (ยืนยันรายสิ่งไม่ครอบคลุมคำอิสระ)');
w.eq(st({ ...sauce, checked: true }, ['egg']), 'ok', 'ยืนยันทั้งรายการ → ✅ ทุกสิ่งที่ไม่ได้ใส่ว่ามี');
let mm = C.algMerge({ ...sauce, id: 1 }, { name: sauce.name, alg: { crust: '', egg: 'no' } });
w.eq([mm.nw.none.sort(), mm.ch], [['egg', 'fish'], ['none']], 'นำเข้า: "-" = ยืนยันไม่มี · ช่องว่าง/? = ลบการยืนยันเดิม (ไม่ชัวร์)');
w.ok(C.algCsvLine({ ...sauce, id: 1 }, algs, C.KINDS).includes('ไม่มี'), 'ส่งออก: ยืนยันไม่มี = "ไม่มี"');
w.ok(A.ALG_BUILTIN.some(a => a.k === 'lupin'), 'มีลูพิน (ครบ 14 สารก่อภูมิแพ้หลักตามตารางร้าน)');
w.eq(A.algNorm('นํ้าจิ้มหม่าล่า'), A.algNorm('น้ำจิ้มหม่าล่า'), 'นํ้า (จาก Excel/PDF) = น้ำ — ชื่อจับคู่กันได้');
w.eq(A.algNorm('ยํา'), A.algNorm('ยำ'), 'ยํา = ยำ');

process.exitCode = (f1 || f2 || w.done()) ? 1 : 0;
