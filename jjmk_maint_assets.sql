-- jjmk_maint_assets.sql — 📦 นับอุปกรณ์รายเดือน + สถิติอัตราเสียหาย
-- ใช้กับแอพซ่อมบำรุง jjmk-maint.html (แท็บ "นับอุปกรณ์")
-- รันครั้งเดียวใน Supabase → SQL Editor · รันซ้ำได้ ไม่กระทบข้อมูลเดิม

-- รายการอุปกรณ์ที่ต้องนับ (แยกตามสาขา)
create table if not exists maint_assets (
  id text primary key,
  branch_id text not null,            -- อิง branches.id ชุดเดียวกับแอพนับสต๊อก
  name text not null,
  unit text default 'ชิ้น',
  cat text,                           -- หมวด เช่น ครัว / หน้าร้าน
  sort integer default 0,
  deleted_at timestamptz,             -- ลบ = ซ่อนจากรายการนับ (ประวัติยังอยู่)
  created_at timestamptz default now());
create index if not exists maint_assets_b on maint_assets(branch_id);

-- บันทึกการนับ 1 งวด (เดือน) ต่อ 1 อุปกรณ์
create table if not exists maint_counts (
  id text primary key,
  asset_id text not null,
  branch_id text not null,
  period text not null,               -- งวดเดือน รูปแบบ 'YYYY-MM'
  count_date date not null,
  qty numeric not null default 0,     -- นับได้จริง
  added numeric not null default 0,   -- ซื้อเพิ่มระหว่างงวด
  broken numeric not null default 0,  -- ชำรุด/เสียหายที่พนักงานแจ้ง (ต้องมีรูป)
  by_name text,
  note text,
  photos jsonb default '[]'::jsonb,   -- URL รูปใน bucket maint-photos (1–10 รูป)
  created_at timestamptz default now());
create index if not exists maint_counts_a on maint_counts(asset_id);
create index if not exists maint_counts_b on maint_counts(branch_id, period);
create unique index if not exists maint_counts_uni on maint_counts(asset_id, period);

-- สิทธิ์: เหมือนตาราง maint_* เดิม (ล็อกอิน+อนุมัติแล้วทำได้ทุกอย่าง / anon อ่านอย่างเดียว)
do $$ declare tb text; begin
  foreach tb in array array['maint_assets','maint_counts'] loop
    execute format('alter table %I enable row level security', tb);
    if not exists (select 1 from pg_policies where tablename=tb and policyname='mt_auth_all') then
      execute format('create policy mt_auth_all on %I for all to authenticated using (true) with check (exists (select 1 from app_users au where au.auth_uid = auth.uid() and au.status = ''active''))', tb);
    end if;
    if not exists (select 1 from pg_policies where tablename=tb and policyname='mt_anon_read') then
      execute format('create policy mt_anon_read on %I for select to anon using (true)', tb);
    end if;
    execute format('grant select on %I to anon', tb);
    execute format('grant select, insert, update, delete on %I to authenticated', tb);
  end loop;
end $$;

-- รูปใช้ bucket maint-photos เดิมของระบบซ่อมบำรุง (เผื่อยังไม่ได้สร้าง)
insert into storage.buckets (id, name, public) values ('maint-photos','maint-photos',true)
on conflict (id) do nothing;

-- อุปกรณ์ตั้งต้น — ใส่ให้เฉพาะสาขาที่ยังไม่มีรายการอุปกรณ์เลย
-- (ไม่อยากได้ ลบ 3 บรรทัดสุดท้ายของไฟล์นี้ออกก่อนรัน หรือลบทีหลังจากปุ่ม ⚙️ ในแอพ)
insert into maint_assets (id, branch_id, name, unit, cat, sort)
select 'ma-'||b.id||'-'||t.n, b.id, t.name, t.unit, t.cat, t.n*10
from branches b cross join (values
  (1,'เตาปิ้งย่าง','เตา','หน้าร้าน'),
  (2,'หม้อ/กระทะย่าง','ใบ','หน้าร้าน'),
  (3,'ถังแก๊ส','ถัง','ครัว'),
  (4,'จานเมลามีน','ใบ','หน้าร้าน'),
  (5,'ชามซุป','ใบ','หน้าร้าน'),
  (6,'แก้วน้ำ','ใบ','หน้าร้าน'),
  (7,'ตะเกียบ/ช้อนส้อม','ชุด','หน้าร้าน'),
  (8,'คีมคีบ/กรรไกร','อัน','ครัว'),
  (9,'ถาดเสิร์ฟ','ใบ','หน้าร้าน'),
  (10,'เก้าอี้','ตัว','หน้าร้าน')
) as t(n,name,unit,cat)
where not exists (select 1 from maint_assets m where m.branch_id = b.id)
on conflict (id) do nothing;
