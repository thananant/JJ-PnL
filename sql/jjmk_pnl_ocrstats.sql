-- ============================================================
-- JJ P&L · สถิติการสแกนบิล (OCR) — เก็บว่าโมเดล AI ตัวไหนอ่านสำเร็จบ่อยสุด
-- รันครั้งเดียวใน Supabase SQL Editor · รันซ้ำได้ ไม่พัง
-- ============================================================
create table if not exists pnl_ocr_stats (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  branch text,
  model text,              -- ชื่อโมเดลที่อ่านสำเร็จ (null ถ้าล้มเหลวทั้งหมด)
  ok boolean not null default true,
  ms integer               -- เวลาที่ใช้ทั้งหมด (มิลลิวินาที)
);
create index if not exists pnl_ocr_stats_ts on pnl_ocr_stats (ts desc);

alter table pnl_ocr_stats enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='pnl_ocr_stats' and policyname='allow_all') then
    create policy allow_all on pnl_ocr_stats for all using (true) with check (true);
  end if;
end $$;
