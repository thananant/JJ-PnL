-- ============================================================
-- JJ P&L · รอบทำใบสำคัญจ่าย (PV) รายซัพ (18 ก.ย. 2569) — รันซ้ำได้
--   ปัญหาเดิม: PV มีแค่งวด 1–15 และ 16–สิ้นเดือน · ซัพที่ให้ "เครดิต 1 เดือน"
--              จ่ายเดือนละครั้ง เลยไม่เข้ารอบไหนเลย ตกหล่นจากใบสำคัญจ่าย
--   แก้: ตั้งรอบจ่ายรายซัพได้ (pay_cycle)
--        'period'  = ตามงวดเดิม 1–15 / 16–สิ้นเดือน (ค่าตั้งต้น)
--        'monthly' = เครดิต 1 เดือน → ไม่ขึ้นงวด 1–15 แต่รวม "ทั้งเดือน" ไปออกงวด 16–สิ้นเดือน
-- ============================================================
alter table pnl_suppliers add column if not exists pay_cycle text not null default 'period';

do $$ begin
  if not exists (select 1 from pg_constraint where conname='pnl_suppliers_pay_cycle_chk') then
    alter table pnl_suppliers add constraint pnl_suppliers_pay_cycle_chk check (pay_cycle in ('period','monthly'));
  end if;
end $$;

-- เดาให้ก่อนจากข้อความ "เงื่อนไขจ่าย" ที่พิมพ์ไว้ (เช่น "เครดิต 1 เดือน", "30 วัน", "รายเดือน")
-- *** ตั้งทับได้เองในแอพ: ตั้งค่า › ซัพพลายเออร์ › รอบทำ PV ***
update pnl_suppliers
   set pay_cycle='monthly'
 where pay_cycle='period'
   and payment_term is not null
   and (payment_term like '%เดือน%' or payment_term like '%30 วัน%' or payment_term like '%30วัน%'
        or lower(payment_term) like '%month%');

-- ---------- ตรวจผล ----------
select pay_cycle as รอบทำ_PV, count(*) as จำนวนซัพ from pnl_suppliers group by pay_cycle order by pay_cycle;

select name as ซัพ, coalesce(payment_term,'-') as เงื่อนไขจ่าย,
       case pay_cycle when 'monthly' then 'เครดิต 1 เดือน (ออกรอบสิ้นเดือน)' else 'ตามงวด 1–15 / 16–สิ้นเดือน' end as รอบทำ_PV
from pnl_suppliers
where active is not false
order by pay_cycle desc, name;
-- คาด: ซัพที่เงื่อนไขมีคำว่า "เดือน" หรือ "30 วัน" ถูกตั้งเป็น monthly ให้อัตโนมัติ
--      ตัวไหนเดาผิด/ตกหล่น แก้เองได้ในแอพที่ ตั้งค่า › ซัพพลายเออร์ (ช่อง "รอบทำ PV")
