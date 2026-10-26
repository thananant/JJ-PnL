// 🔑 JJ Access ↔ หน้า 🧑‍🤝‍🧑 แผนผังพนักงาน ของแอปเงินเดือน (payroll.org · 2026-10-20)
// บัญชีที่ยังไม่เคยตั้งสิทธิ์หน้านี้ = เห็นตามหน้า emp/detail (ต้องตรงกับ applyUser ใน jjmk-payroll.html) · เอาติ๊กออก = เขียน org:'' ไว้ชัด ๆ
import { load, suite } from './lib.mjs';

const A = load('jjmk-admin.html', { vars: ['APPS', 'FLAGS', 'PERM_FOLLOW', 'APP_XF', 'xfOn', 'isBoss'], fns: ['scrFlags', 'permOf', 'countScreens', 'appsLine', 'syncDraft'],
  prelude: 'var BR_SCOPED={payroll:{br:["JJLP","JJRD","JJCK","OFFICE"],t:"สาขา"}}; var S={draft:{}}; var BOX=null; function $(s){ return s.startsWith("#box_")?BOX:null; } function brLbl(c){ return c; }' });
const t = suite('JJ Access · สิทธิ์หน้าแผนผังพนักงาน (payroll.org)');
const u = apps => ({ role: 'manager', apps });

t.ok(Object.keys(A.APPS.payroll.s).includes('org') && A.APPS.payroll.s.org === 'แผนผังพนักงาน', 'มีหน้าจอ "แผนผังพนักงาน" ในกล่อง JJ Payroll');
const ks = Object.keys(A.APPS.payroll.s); t.eq(ks.indexOf('org'), ks.indexOf('detail') + 1, 'อยู่ต่อจาก "รายละเอียด" (ข้อมูลพนักงาน)');
t.eq(A.permOf(u({ payroll: { emp: 'vae' } }), 'payroll', 'org'), 'v', 'ยังไม่เคยตั้ง + เห็นหน้าพนักงาน → ช่องแผนผังติ๊ก "ดู" ให้เห็นตรงกับแอป');
t.eq(A.permOf(u({ payroll: { detail: 'v' } }), 'payroll', 'org'), 'v', 'ยังไม่เคยตั้ง + เห็นหน้าข้อมูลพนักงาน → ดู');
t.eq(A.permOf(u({ payroll: { today: 'v' } }), 'payroll', 'org'), '', 'ยังไม่เคยตั้ง + ไม่เห็นหน้าพนักงาน → ซ่อน');
t.eq(A.permOf(u({ payroll: { emp: 'v', org: '' } }), 'payroll', 'org'), '', 'ตั้งไว้ชัด ๆ ว่าซ่อน → ซ่อน');
t.eq(A.permOf(u({ payroll: { emp: 'v' } }), 'payroll', 'emp'), 'v', 'หน้าอื่นเหมือนเดิม');
t.eq(A.permOf(u({ pnl: { dash: 'v' } }), 'pnl', 'detail'), '', 'แอปอื่นไม่ได้รับผล');
t.eq(A.countScreens(u({ payroll: { emp: 'v', detail: 'v' } }), 'payroll'), 3, 'นับหน้าที่เห็น = พนักงาน + ข้อมูลพนักงาน + แผนผัง');
t.eq(A.countScreens({ role: 'owner' }, 'payroll'), 16, 'เจ้าของ = 16 หน้า (รวม 🐷 เงินสำรองเลี้ยงชีพ)');
t.ok(/^3\/16 หน้า/.test(A.appsLine({ payroll: { emp: 'v', detail: 'v' } }, 'payroll')), 'สรุปในประวัติ "3/16 หน้า"');

// syncDraft อ่านติ๊กจากกล่องจริง — จำลองกล่องด้วยรายการช่องติ๊ก
function box(checked) {   // checked = {หน้าจอ: 'vae'}
  const cb = sel => { const s = (sel.match(/data-s="([^"]+)"/) || [])[1], f = (sel.match(/data-f="([^"]+)"/) || [])[1];
    if (/type=radio/.test(sel)) return { checked: false };
    return { checked: !!(checked[s] && f && checked[s].includes(f)) }; };
  return { querySelector: cb, querySelectorAll: () => [] };
}
A.S.draft = {}; A.BOX = box({ emp: 'v', detail: 'v' }); A.syncDraft('payroll');
t.eq(A.S.draft.payroll, { emp: 'v', detail: 'v', org: '' }, 'เอาติ๊กแผนผังออก → บันทึก org:"" (ไม่งั้นแอปถือว่ายังไม่เคยตั้ง แล้วกลับมาเห็นเอง)');
A.S.draft = {}; A.BOX = box({ emp: 'v', org: 'v' }); A.syncDraft('payroll');
t.eq(A.S.draft.payroll, { emp: 'v', org: 'v' }, 'ติ๊กดูแผนผัง → org:"v"');
A.S.draft = { payroll: { emp: 'v' } }; A.BOX = box({}); A.syncDraft('payroll');
t.ok(!('payroll' in A.S.draft), 'ปิดแอปทั้งกล่อง → ไม่เก็บอะไร (เหมือนเดิม)');

// 🔒 ปิดงวดเงินเดือน (2026-10-21): สิทธิ์พิเศษที่ไม่ใช่หน้าจอ apps.payroll._close = '1' (ต้องตรงกับ applyUser ใน jjmk-payroll.html)
t.ok(A.APP_XF.payroll && A.APP_XF.payroll._close, 'มีช่องติ๊ก "🔒 ปิดงวดได้" ในกล่อง JJ Payroll (คีย์ _close — ขึ้นต้น _ = ไม่ใช่หน้าจอ)');
function boxX(checked, xf) {
  const b = box(checked), q = b.querySelector;
  return { querySelector: sel => { const m = sel.match(/data-xf="([^"]+)"/); return m ? { checked: !!(xf && xf[m[1]]) } : q(sel); }, querySelectorAll: () => [] };
}
A.S.draft = {}; A.BOX = boxX({ payroll: 'v' }, { _close: true }); A.syncDraft('payroll');
t.eq(A.S.draft.payroll, { payroll: 'v', org: '', _close: '1' }, 'ติ๊กปิดงวด → บันทึก _close:"1"');
A.S.draft = {}; A.BOX = boxX({ payroll: 'v' }, {}); A.syncDraft('payroll');
t.ok(!('_close' in A.S.draft.payroll), 'ไม่ติ๊ก → ไม่มีคีย์ _close (แอปเงินเดือน = ปิดงวดไม่ได้ · fail closed)');
A.S.draft = {}; A.BOX = boxX({}, { _close: true }); A.syncDraft('payroll');
t.ok(!('payroll' in A.S.draft), 'ปิดแอปทั้งกล่อง → ไม่เก็บ _close');
t.eq(A.countScreens(u({ payroll: { payroll: 'v', _close: '1' } }), 'payroll'), 1, '_close ไม่นับเป็นหน้าจอ');
t.ok(/🔒 ปิดงวด/.test(A.appsLine({ payroll: { payroll: 'v', _close: '1' } }, 'payroll')), 'สรุปในประวัติบอก "🔒 ปิดงวด"');
t.ok(!/ปิดงวด/.test(A.appsLine({ payroll: { payroll: 'v' } }, 'payroll')), 'ไม่มีสิทธิ์ = ไม่ขึ้น');

process.exitCode = t.done() ? 1 : 0;
