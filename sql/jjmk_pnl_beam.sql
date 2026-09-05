-- ============================================================
-- JJ P&L · ตารางกระทบยอดเงินโอน Beam (5 ก.ย. 2569) — รันครั้งเดียว รันซ้ำได้
--   แท็บ "ตรวจสอบเงิน" อัปโหลดไฟล์รายการจาก Beam (CSV) แล้วแอพสรุปยอด
--   ต่อ "วันขายจริง" (รายการก่อน 06:00 นับเป็นวันก่อนหน้า) เก็บลงตารางนี้
--   ไว้เทียบกับยอดเงินโอนที่พนักงานคีย์ในหน้ารายรับ — อัปโหลดครั้งเดียวดูย้อนหลังได้
--   1 แถว = 1 บัญชี Beam (merchant_id) × 1 วันขาย · อัปโหลดซ้ำ = ทับแถวเดิม
-- ============================================================
create table if not exists pnl_beam_daily (
  acct text not null,                       -- merchant_id ของบัญชี Beam เช่น jingjaimookt
  d date not null,                          -- วันขายจริง (ตัดตี 6 แล้ว)
  gross numeric not null default 0,         -- ยอดโอนก่อนหักค่าธรรมเนียม
  fee numeric not null default 0,           -- ค่าธรรมเนียม + VAT ของค่าธรรมเนียม
  net numeric not null default 0,           -- ยอดเข้าบัญชีจริง
  tx_count int not null default 0,          -- จำนวนรายการ
  pending_net numeric not null default 0,   -- ส่วนที่ยังไม่เข้าบัญชี (PENDING) ณ วันอัปโหลด
  pending_count int not null default 0,
  complete boolean not null default true,   -- false = วันหัว/ท้ายช่วงไฟล์ อาจยังไม่ครบวัน
  uploaded_at timestamptz not null default now(),
  primary key (acct, d)
);
alter table pnl_beam_daily enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='pnl_beam_daily' and policyname='allow_all') then
    create policy allow_all on pnl_beam_daily for all using (true) with check (true);
  end if;
end $$;
grant select, insert, update, delete on pnl_beam_daily to anon, authenticated;

-- อัปโหลดซ้ำต้องอัปเดต uploaded_at ให้เอง (แอพไม่ส่งค่านี้)
create or replace function pnl_beam_touch() returns trigger language plpgsql as $$
begin new.uploaded_at := now(); return new; end $$;
drop trigger if exists trg_pnl_beam_touch on pnl_beam_daily;
create trigger trg_pnl_beam_touch before insert or update on pnl_beam_daily
  for each row execute function pnl_beam_touch();

-- ---------- ตรวจผล ----------
select 'pnl_beam_daily'::text as ตาราง,
       (select count(*) from pnl_beam_daily) as จำนวนแถว,
       (select count(*) from pg_policies where tablename='pnl_beam_daily') as นโยบาย,
       (select count(*) from pg_trigger where tgname='trg_pnl_beam_touch' and not tgisinternal) as ทริกเกอร์;
-- คาด: จำนวนแถว 0 (ครั้งแรก) · นโยบาย 1 · ทริกเกอร์ 1
