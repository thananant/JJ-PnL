-- ============================================================
-- JJ P&L · ย้ายบิลที่ลงผิดเดือน: ก.ย. 2569 (วันที่ 2–30) -> ส.ค. 2569 วันเดียวกัน
--   (1 ก.ย. 2569) รันครั้งเดียวใน SQL Editor · รันซ้ำไม่มีผลข้างเคียง (ไม่มีอะไรให้ย้ายแล้ว)
--   ครอบคลุม: รายการในบิล + ยอดรายจ่ายรายวัน · ถ้าวันปลายทางมีบิลซัพเดิมอยู่แล้ว จะต่อเลขบิลให้ ไม่ทับกัน
-- ============================================================
begin;

-- [1] รายการในบิล: เลื่อนเดือน + ต่อเลขบิลกันชนกับบิลเดิมของวันนั้น
with mv as (
  select branch, d, supplier_id, coalesce(bill_no,1) as bill_no
  from pnl_bill_items
  where d between date '2026-09-02' and date '2026-09-30'
  group by 1,2,3,4
), tgt as (
  select mv.*, (mv.d - interval '1 month')::date as nd,
         coalesce((select max(coalesce(b2.bill_no,1)) from pnl_bill_items b2
                   where b2.branch=mv.branch and b2.supplier_id=mv.supplier_id
                     and b2.d=(mv.d - interval '1 month')::date),0) as base
  from mv
)
update pnl_bill_items b
   set d=t.nd, bill_no=t.base+t.bill_no
  from tgt t
 where b.branch=t.branch and b.d=t.d and b.supplier_id=t.supplier_id and coalesce(b.bill_no,1)=t.bill_no;

-- [2] ยอดรายจ่ายรายวัน (ตัวที่หน้ารายจ่าย/แดชบอร์ดใช้): รวมเข้ากับวันปลายทางถ้ามีอยู่แล้ว
update pnl_expense_daily t
   set amount = coalesce(t.amount,0) + coalesce(s.amount,0)
  from pnl_expense_daily s
 where s.d between date '2026-09-02' and date '2026-09-30'
   and t.branch=s.branch and t.supplier_id=s.supplier_id
   and t.d=(s.d - interval '1 month')::date;
delete from pnl_expense_daily s
 using pnl_expense_daily t
 where s.d between date '2026-09-02' and date '2026-09-30'
   and t.branch=s.branch and t.supplier_id=s.supplier_id
   and t.d=(s.d - interval '1 month')::date;
update pnl_expense_daily
   set d=(d - interval '1 month')::date
 where d between date '2026-09-02' and date '2026-09-30';

commit;

-- ตรวจผล
select 'บิลที่ยังค้างอยู่ใน ก.ย. (2–30) ต้องเป็น 0' as ตรวจ, count(*)::text as ค่า
  from pnl_bill_items where d between date '2026-09-02' and date '2026-09-30'
union all
select 'จำนวนใบบิล ส.ค. 24–31 หลังย้าย', count(*)::text
  from (select distinct branch,d,supplier_id,coalesce(bill_no,1) from pnl_bill_items
        where d between date '2026-08-24' and date '2026-08-31') x
union all
select 'ยอดรายจ่าย ส.ค. 24–31 หลังย้าย (บาท)', to_char(coalesce(sum(amount),0),'FM999,999,999.00')
  from pnl_expense_daily where d between date '2026-08-24' and date '2026-08-31';
