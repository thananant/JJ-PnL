// หน้าศูนย์รวมแอพ (index.html) — ใครเห็นแอพไหน · บัญชีพร้อมใช้ · รหัสผ่าน · เวอร์ชันฟังก์ชันลืมรหัสผ่าน
import crypto from 'crypto';
import { load, suite } from './lib.mjs';

const hub = load('index.html', { prelude: 'var ME=null;', fns: ['canOpen', 'userReady', 'verCmp', 'sha256hex', 'pwHash'] });
const t = suite('หน้าแรก · สิทธิ์เห็นแอพ / บัญชี / รหัสผ่าน');
const as = (me, key) => { hub.ME = me; return hub.canOpen(key); };

// "ติ๊กแอปไหนให้ ก็เห็นแอปนั้น" (เจ้าของสั่ง 2026-09-21) + กันล็อกคนโดยไม่ตั้งใจ
t.ok(as({ role: 'staff', apps: { pnl: { inc: 'v' } } }, 'pnl'), 'staff ได้ pnl:v → เห็น P&L');
t.ok(!as({ role: 'staff', apps: { pnl: { inc: 'v' } } }, 'payroll'), 'staff ไม่ได้ติ๊กเงินเดือน → ไม่เห็น');
t.ok(!as({ role: 'staff', apps: { pnl: { inc: '' } } }, 'pnl'), 'มีคีย์แอพแต่ไม่มีสิทธิ์ดูหน้าไหน → ไม่เห็น');
t.ok(!as({ role: 'staff', apps: { stock: { _br: 'JJRD' }, pnl: { inc: 'v' } } }, 'stock'), 'มีแค่ _br (สาขา) ไม่มีหน้าจอ → ไม่เห็น (ค่า _br ไม่ถูกนับเป็นหน้าจอ)');
t.ok(as({ role: 'staff', apps: { stock: { _br: 'JJRD,JJLP', cnt: 'vae' } } }, 'stock'), 'มี _br + หน้าจอ → เห็น');
t.ok(as({ role: 'staff', apps: {} }, 'payroll'), 'apps ว่าง (ยังไม่เคยตั้งสิทธิ์) = เห็นทุกแอพ — ห้ามล็อกคนเดิม');
t.ok(as({ role: 'staff', apps: null }, 'payroll'), 'apps null = เห็นทุกแอพ');
t.ok(as({ role: 'owner', apps: { pnl: { inc: 'v' } } }, 'payroll'), 'เจ้าของ (owner) เห็นทุกแอพ — ห้ามเช็ค role===admin อย่างเดียว');
t.ok(as({ role: 'admin', apps: { pnl: { inc: 'v' } } }, 'admin'), 'admin เห็นทุกแอพ');

// สถานะบัญชี (สมัครเอง + อนุมัติ · ออกงาน = ปิดบัญชี)
t.ok(hub.userReady({ active: true, status: null }), 'status null (ยังไม่รัน SQL สมัครพนักงาน) = ใช้ได้ — ห้ามตัดเงื่อนไขนี้');
t.ok(hub.userReady({ active: true, status: 'active' }), 'active = ใช้ได้');
t.ok(!hub.userReady({ active: true, status: 'pending' }), 'รออนุมัติ = เข้าไม่ได้');
t.ok(!hub.userReady({ active: true, status: 'rejected' }), 'ไม่อนุมัติ = เข้าไม่ได้');
t.ok(!hub.userReady({ active: false, status: 'active' }), 'ออกงาน (active=false) = เข้าไม่ได้');
t.ok(!hub.userReady(null), 'ไม่มีบัญชี = เข้าไม่ได้');

// รหัสผ่าน: ทุกแอพใช้ sha256(user|pass|JJPNL) ชุดเดียวกัน · ผูกกับตัวพิมพ์ของชื่อผู้ใช้
const ref = (u, p) => crypto.createHash('sha256').update(u + '|' + p + '|JJPNL').digest('hex');
for (const [u, p] of [['kim', '1234'], ['Kim', '1234'], ['สมชาย', 'รหัส ไทย!'], ['a', '']]) t.eq(hub.pwHash(u, p), ref(u, p), `pwHash(${u}) = sha256(u|p|JJPNL)`);
t.ok(hub.pwHash('Kim', 'x') !== hub.pwHash('kim', 'x'), 'ชื่อผู้ใช้ตัวพิมพ์ต่างกัน = แฮชต่างกัน (ห้ามแปลงชื่อเป็นตัวเล็กตอนลืมรหัส)');

// เวอร์ชันฟังก์ชัน signup-notify
t.ok(hub.verCmp('2026-09-29.10', '2026-09-29.3') > 0, 'เวอร์ชัน .10 ใหม่กว่า .3');
t.ok(hub.verCmp('2026-10-01.1', '2026-09-29.9') > 0, 'วันใหม่กว่า = ใหม่กว่า');
t.ok(hub.verCmp('', '2026-09-29.3') < 0, 'ไม่มีเวอร์ชัน (ฟังก์ชันรุ่นเก่า) = เก่ากว่า → ซ่อนปุ่มลืมรหัสผ่าน');

process.exitCode = t.done() ? 1 : 0;
