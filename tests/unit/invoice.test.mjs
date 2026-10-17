// ใบกำกับภาษี (jjmk-invoice.html) — สูตรเงิน · ตัวอักษรไทย · เลขบิล · แท็บ · หมายเหตุ · ตรงกับสคริปต์ NAS ทุกหลัก
import { load, py, suite } from './lib.mjs';

const app = load('jjmk-invoice.html', {
  prelude: `var CONFIG={VAT_RATE:0.07}; var STATUS={ISSUED:'ออกแล้ว',CANCELLED:'ยกเลิก'};
            var EMAIL_STATUS={SENDING:'กำลังส่ง',DELIVERED:'ส่งถึงแล้ว',FAILED:'ส่งไม่สำเร็จ',ERROR:'ผิดพลาด'};`,
  vars: ['IMP_BY', 'NAS_CANCEL_DIR'],
  fns: ['fmt', 'round2', 'pad2', 'bkkParts', 'fmtDate', 'readSix', 'readThai', 'bahtText', 'computeTotals',
    'nasBranch', 'nasMonth', 'nasDirs', 'cleanGasUrl', 'gasVerCmp', 'withNote', 'billEditInfo', 'billSeq',
    'isMailFailed', 'isLegacyClosed', 'billNum', 'byBillDesc'],
});
let fails = 0;

// ---------- 1. สูตรเงิน (ราคาในรายการ = รวม VAT แล้ว) ----------
{
  const t = suite('ใบกำกับ · คำนวณยอด/VAT');
  const T = (items, d) => { const r = app.computeTotals(items, d); return [r.gross, r.discount, r.net, r.vat, r.total]; };
  t.eq(T([{ qty: 1, price: 107 }]), [107, 0, 100, 7, 107], '107 บาท → ก่อน VAT 100 + VAT 7');
  t.eq(T([{ qty: 2, price: 299 }], 0), [598, 0, 558.88, 39.12, 598], '2×299');
  t.eq(T([{ qty: 1.5, price: 299.95 }]), [449.92, 0, 420.49, 29.43, 449.92], '1.5×299.95 ในคอมคือ 449.92499… → 449.92 (CLAUDE.md: สคริปต์ NAS ต้องได้เท่านี้ด้วย)');
  t.eq(T([{ qty: 3, price: 100 }], 50), [300, 50, 233.64, 16.36, 250], 'ส่วนลด 50 หักก่อนแยก VAT');
  t.eq(T([{ qty: 0, price: 120 }, { qty: '', price: 80 }]), [200, 0, 186.92, 13.08, 200], 'จำนวน 0/ว่าง = ใช้ราคาเป็นยอดของบรรทัด');
  t.eq(T([]), [0, 0, 0, 0, 0], 'ไม่มีรายการ = 0 ทั้งหมด');
  for (let i = 0; i < 2000; i++) {   // ก่อน VAT + VAT ต้องเท่ายอดสุทธิเสมอ (ห้ามเพี้ยน 1 สตางค์)
    const items = Array.from({ length: 1 + (i % 5) }, (_, k) => ({ qty: 1 + ((i * 7 + k) % 9), price: ((i * 9973 + k * 31) % 500000) / 100 }));
    const r = app.computeTotals(items, (i % 4) * 12.5);
    if (Math.round((r.net + r.vat) * 100) !== Math.round(r.total * 100)) { t.ok(false, `net+vat ≠ total ที่รอบ ${i}: ${JSON.stringify(r)}`); break; }
  }
  t.ok(true, 'net+vat = total 2,000 ชุดสุ่ม');
  fails += t.done();
}

// ---------- 2. จำนวนเงินเป็นตัวอักษร ----------
{
  const t = suite('ใบกำกับ · จำนวนเงินตัวอักษรไทย');
  const cases = [[0, 'ศูนย์บาทถ้วน'], [1, 'หนึ่งบาทถ้วน'], [11, 'สิบเอ็ดบาทถ้วน'], [21, 'ยี่สิบเอ็ดบาทถ้วน'], [101, 'หนึ่งร้อยเอ็ดบาทถ้วน'],
    [0.5, 'ห้าสิบสตางค์'], [0.01, 'หนึ่งสตางค์'], [1234.75, 'หนึ่งพันสองร้อยสามสิบสี่บาทเจ็ดสิบห้าสตางค์'],
    [1000000, 'หนึ่งล้านบาทถ้วน'], [21000001, 'ยี่สิบเอ็ดล้านหนึ่งบาทถ้วน'], [598, 'ห้าร้อยเก้าสิบแปดบาทถ้วน'], [449.925, 'สี่ร้อยสี่สิบเก้าบาทเก้าสิบสามสตางค์']];
  for (const [n, s] of cases) t.eq(app.bahtText(n), s, `bahtText(${n})`);
  fails += t.done();
}

// ---------- 3. ตัวเลขในไฟล์ PDF ของ NAS ต้องตรงกับแอปทุกหลัก (CLAUDE.md: แก้สูตรเงินในแอปต้องแก้สคริปต์ด้วย) ----------
{
  const t = suite('ใบกำกับ · แอป ↔ สคริปต์ NAS (inv_nas_sync.py) ตรงกันทุกหลัก');
  const vals = [0, 0.005, 1.005, 2.675, 449.925, 1.5 * 299.95, 0.1 + 0.2, 1e7 + 0.005, 999999.995, 12345678.9];
  for (let i = 0; i < 1500; i++) vals.push(((i * 2654435761) % 1e8) / 1000, (i * 37 % 1000) * ((i % 13) / 4 + 0.25), i / 200);
  const calls = [];
  for (const v of vals) calls.push(['round2', v], ['fmt', v], ['baht_text', v]);
  const qty = [1, 1.5, 0.1 + 0.2, 2.25, 1e21, 1e-7, 0.000001, 123456789012, 7];
  for (const q of qty) calls.push(['fmt_qty', q]);
  let res;
  try { res = py('jjmk-invoice/inv_nas_sync.py', calls); } catch (e) { t.ok(false, 'รันสคริปต์ NAS ไม่ได้: ' + String(e.message).split('\n')[0]); }
  if (res) {
    let k = 0, bad = 0;
    for (const v of vals) {
      const [r2, f, b] = [res[k++], res[k++], res[k++]];
      if (r2 !== app.round2(v) && bad++ < 3) t.ok(false, `round2(${v}) แอป ${app.round2(v)} · NAS ${r2}`);
      if (f !== app.fmt(v) && bad++ < 3) t.ok(false, `fmt(${v}) แอป ${app.fmt(v)} · NAS ${f}`);
      if (b !== app.bahtText(v) && bad++ < 3) t.ok(false, `bahtText(${v}) แอป ${app.bahtText(v)} · NAS ${b}`);
    }
    for (const q of qty) { const r = res[k++]; if (r !== String(q)) { bad++; t.ok(false, `fmt_qty(${q}) NAS ${r} · JS ${String(q)}`); } }
    t.ok(!bad, `${vals.length} ค่าเงิน × 3 สูตร + ${qty.length} จำนวน ตรงกัน`);
    // โฟลเดอร์เก็บไฟล์ต้องตรงกัน (แก้โครงที่ไหนต้องแก้ทั้งสคริปต์และแอป)
    const bills = [['JJRD1244', '2026-09-30T17:30:00Z', false], ['jjlp1181', '2026-01-31T16:59:59Z', true], ['1234', '2026-12-31T18:00:00+00:00', false]];
    const pr = py('jjmk-invoice/inv_nas_sync.py', bills.map(b => ['bill_parts', ...b]));
    bills.forEach((b, i) => t.eq(app.nasDirs({ bill_no: b[0], issued_at: b[1], status: b[2] ? 'ยกเลิก' : 'ออกแล้ว' }), pr[i], `โฟลเดอร์ NAS ของ ${b[0]} (${b[1]})`));
  }
  fails += t.done();
}

// ---------- 4. เลขบิล · เรียงลำดับ · แท็บ ----------
{
  const t = suite('ใบกำกับ · เลขบิล / แท็บ / หมายเหตุ');
  t.eq(app.billSeq('JJRD1244', 'JJRD'), 1244, 'billSeq เลขของสาขาตัวเอง');
  t.eq(app.billSeq('JJRD1244', 'JJLP'), null, 'billSeq เลขสาขาอื่นไม่นับ');
  t.eq(app.billSeq('JJRD12A4', 'JJRD'), null, 'billSeq มีตัวอักษรปน = ไม่นับ');
  t.eq(app.billSeq('JJRDX1', 'JJRD'), null, 'billSeq รหัสที่ขึ้นต้นเหมือนกันแต่ยาวกว่า ไม่นับ');
  const list = [{ bill_no: 'JJLP1181', issued_at: '2026-09-28' }, { bill_no: 'JJRD1243', issued_at: '2026-09-28' }, { bill_no: 'JJRD1000', issued_at: '2026-01-01' }, { bill_no: 'JJLP1243', issued_at: '2026-09-29' }];
  t.eq(list.slice().sort(app.byBillDesc).map(x => x.bill_no), ['JJLP1243', 'JJRD1243', 'JJLP1181', 'JJRD1000'], 'เรียงเลขใหม่ → เก่า · เลขเท่ากันข้ามสาขา = ใบที่ออกทีหลังก่อน');
  const IMP = app.IMP_BY;
  t.ok(app.isLegacyClosed({ email_status: 'ส่งไม่สำเร็จ', created_by: IMP, updated_by: IMP }), 'บิลระบบเดิมส่งไม่สำเร็จ ยังไม่มีใครแตะ = ปิดเรื่องอีเมล (ไม่ขึ้นแท็บ ⚠)');
  t.ok(!app.isLegacyClosed({ email_status: 'ส่งไม่สำเร็จ', created_by: IMP, updated_by: 'kim' }), 'ส่งซ้ำ/แก้แล้ว (updated_by เปลี่ยน) = กลับมาตัดสินตามผลใหม่');
  t.ok(!app.isLegacyClosed({ email_status: 'ส่งไม่สำเร็จ', created_by: 'kim', updated_by: 'kim' }), 'บิลของแอปนี้ไม่ถูกปิดเรื่อง');
  t.ok(app.isMailFailed({ email_status: 'ผิดพลาด' }) && !app.isMailFailed({ email_status: 'กำลังส่ง' }), 'isMailFailed: ผิดพลาด/ส่งไม่สำเร็จ เท่านั้น');
  const old = 'นำเข้าจากระบบเดิม · PDF เดิม: https://drive/x · ย้ายจากเลข JJRD1200 · แก้ไขล่าสุด 01/10 โดย a';
  const nw = app.withNote(old, /^แก้ไขล่าสุด/, 'แก้ไขล่าสุด 02/10 โดย b');
  t.eq(nw, 'นำเข้าจากระบบเดิม · PDF เดิม: https://drive/x · ย้ายจากเลข JJRD1200 · แก้ไขล่าสุด 02/10 โดย b', 'withNote แทนเฉพาะส่วนของตัวเอง หมายเหตุอื่นอยู่ครบ');
  t.eq(app.billEditInfo({ status_detail: nw }), { edited: true, replaced: 'JJRD1200' }, 'billEditInfo อ่าน "ย้ายจากเลข" → อีเมลติด (ฉบับแก้ไข แทนเลขที่ …)');
  t.eq(app.billEditInfo({ status_detail: 'นำเข้าจากระบบเดิม' }), { edited: false, replaced: '' }, 'บิลไม่เคยแก้ = ไม่ติดฉบับแก้ไข');
  t.ok(app.gasVerCmp('2026-10-04.10', '2026-10-04.3') > 0, 'เทียบเวอร์ชัน .10 > .3 (ห้ามเทียบสตริง)');
  t.ok(app.gasVerCmp('2026-10-04.1', '2026-10-04.1') === 0, 'เวอร์ชันเท่ากัน');
  t.ok(!!app.cleanGasUrl(' https://script.google.com/macros/s/AKfycbx1234567890abcdefghij/exec \n').url, 'URL ตัวส่งอีเมลที่มีช่องว่าง/ขึ้นบรรทัดติดมา = ใช้ได้');
  t.ok(!!app.cleanGasUrl('https://script.google.com/a/macros/jj.co.th/s/AKfycbx1234567890abcdefghij/exec').url, 'URL แบบ Workspace ใช้ได้');
  t.ok(!!app.cleanGasUrl('https://script.google.com/macros/s/AKfycbx1234567890abcdefghij/dev').error, 'URL /dev ถูกปฏิเสธ');
  t.ok(!!app.cleanGasUrl('https://evil.example/macros/s/AKfycbx1234567890abcdefghij/exec').error, 'โดเมนอื่นถูกปฏิเสธ');
  t.eq(app.fmtDate('ไม่ใช่วันที่'), '—', 'วันที่เสีย = — (ไม่ล้มทั้งแอป)');
  t.eq(app.nasDirs({ bill_no: 'JJRD1244', issued_at: '2026-09-30T17:30:00Z', status: 'ยกเลิก' }), ['JJRD', '102026', 'ยกเลิก'], 'บิลยกเลิก → <สาขา>/<เดือนไทย>/ยกเลิก (00:30 ไทย = เดือนถัดไป)');
  fails += t.done();
}

process.exitCode = fails ? 1 : 0;
