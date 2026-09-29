// ดึงฟังก์ชันจริงจาก app.js มาทดสอบ (ไม่เขียนซ้ำ)
const fs=require('fs'), vm=require('vm');
const html=fs.readFileSync(__dirname+'/../../jjmk-payroll.html','utf8');
const tail='\n</script>\n</body>\n</html>', e=html.lastIndexOf(tail);
const src=html.slice(html.lastIndexOf('<script>\n',e)+9, e);
const pick=(re)=>{const m=src.match(re); if(!m) throw new Error('not found '+re); return m[0];};
const code=[
 "var settings={cutDay:25,payDay:5,advDay:15};",
 pick(/const localYMD = [^\n]+/),
 pick(/function periodOf\(dayStr\)\{[\s\S]*?\n\}/),
 pick(/function periodRange\(p\)\{[\s\S]*?\n\}/),
 pick(/function liveFromDate\(cached, today\)\{[\s\S]*?\n\}/),
].join('\n');
const ctx={}; vm.createContext(ctx); vm.runInContext(code+'\nthis.liveFromDate=liveFromDate;',ctx);
let fail=0; const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fail++;};
const rows=last=>[{date:'2026-06-01'},{date:last}];
// เคสจริงของเจ้าของ: แคชล่าสุด 24/9 เปิดเครื่อง 29/9
ok(ctx.liveFromDate(rows('2026-09-24'),'2026-09-29')<='2026-09-24','แคชค้าง 24/9 เปิด 29/9 → โหลดสดตั้งแต่ ≤24/9 (25/9 ไม่หาย) ได้ '+ctx.liveFromDate(rows('2026-09-24'),'2026-09-29'));
ok(ctx.liveFromDate(rows('2026-09-29'),'2026-09-29')==='2026-08-26','ช่วงปิดงวด (29/9 ยังไม่ถึงจ่าย 5/10) → โหลดงวดก.ย.ทั้งงวดสด ได้ '+ctx.liveFromDate(rows('2026-09-29'),'2026-09-29'));
ok(ctx.liveFromDate(rows('2026-10-05'),'2026-10-05')==='2026-08-26','วันจ่าย 5/10 ยังนับเป็นช่วงปิดงวด');
ok(ctx.liveFromDate(rows('2026-10-06'),'2026-10-06')==='2026-09-26','หลังจ่ายแล้ว 6/10 → โหลดสดแค่งวดปัจจุบัน ได้ '+ctx.liveFromDate(rows('2026-10-06'),'2026-10-06'));
ok(ctx.liveFromDate(rows('2026-10-20'),'2026-10-20')==='2026-09-26','กลางงวดปกติ → งวดปัจจุบัน');
ok(ctx.liveFromDate(rows('2026-07-10'),'2026-10-20')==='2026-07-10','เครื่องไม่ได้เปิดนานหลายงวด → โหลดต่อจากวันสุดท้ายที่มี');
ok(ctx.liveFromDate(null,'2026-10-20')==='2026-09-26','ไม่มีแคช → ค่าเริ่มต้นงวดปัจจุบัน (ตัวเรียกจะโหลดเต็มอยู่แล้ว)');
ok(ctx.liveFromDate(rows('2027-01-03'),'2027-01-03')==='2026-11-26','ข้ามปี: 3/1/2027 ยังปิดงวด ม.ค.? งวดก่อน=ธ.ค.(26/11–25/12 จ่าย 5/1) ได้ '+ctx.liveFromDate(rows('2027-01-03'),'2027-01-03'));
console.log(fail?fail+' FAILED':'ALL PASSED'); process.exit(fail?1:0);
