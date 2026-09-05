-- jjmk_maint_setup.sql — ระบบตารางบำรุงรักษาสาขา (รันครั้งเดียวใน Supabase → SQL Editor)
-- ตาราง maint_* + bucket รูป + งานตั้งต้นให้ทุกสาขา (รันซ้ำได้ ไม่เพิ่มซ้ำ)

-- งานประจำของแต่ละสาขา (ความถี่เป็น "วัน" เช่น 7=รายสัปดาห์ 30=รายเดือน 90=ทุก 3 เดือน)
create table if not exists maint_tasks (
  id text primary key,
  branch_id text not null,          -- อิง branches.id ของแอพนับสต๊อก
  name text not null,
  detail text,
  freq_days integer not null default 30,
  sort integer default 0,
  deleted_at timestamptz,           -- soft delete: ซ่อนจากตาราง แต่ประวัติยังอยู่
  created_at timestamptz default now());
create index if not exists maint_tasks_b on maint_tasks(branch_id);

-- บันทึกการทำงานแต่ละครั้ง + รูปถ่ายหลังทำ (photos = array ของ URL ใน bucket maint-photos)
create table if not exists maint_logs (
  id text primary key,
  task_id text not null,
  branch_id text not null,
  done_date date not null,
  by_name text,
  note text,
  photos jsonb default '[]'::jsonb,
  created_at timestamptz default now());
create index if not exists maint_logs_t on maint_logs(task_id);
create index if not exists maint_logs_b on maint_logs(branch_id);

-- สิทธิ์แบบเดียวกับตาราง ck_*: ล็อกอิน+อนุมัติแล้วทำได้ทุกอย่าง / anon อ่านอย่างเดียว
do $$ declare tb text; begin
  foreach tb in array array['maint_tasks','maint_logs'] loop
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

-- รูปถ่ายงานซ่อมบำรุง: bucket แยกของตัวเอง (public เพื่อให้เปิดดูรูปได้เลย)
insert into storage.buckets (id, name, public) values ('maint-photos','maint-photos',true)
on conflict (id) do nothing;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='mt_img_up') then
    create policy mt_img_up on storage.objects for insert to authenticated
      with check (bucket_id = 'maint-photos');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='mt_img_read') then
    create policy mt_img_read on storage.objects for select to anon, authenticated
      using (bucket_id = 'maint-photos');
  end if;
end $$;

-- งานตั้งต้นให้ทุกสาขาที่มีอยู่ตอนรัน (id คงที่ต่อสาขา → รันซ้ำไม่เพิ่มซ้ำ)
-- สาขาที่เพิ่มทีหลัง: เพิ่มงานเองได้จากปุ่ม ⚙️ จัดการงาน ในแอพ (เลือกได้หลายสาขา)
insert into maint_tasks (id, branch_id, name, detail, freq_days, sort)
select 'mt-'||b.id||'-'||t.n, b.id, t.name, t.detail, t.freq, t.n*10
from branches b cross join (values
  (1,'ล้างบ่อดักไขมัน','ตักไขมัน + ล้างบ่อดักไขมันหลังร้าน',7),
  (2,'ล้างฟิลเตอร์แอร์','ถอดฟิลเตอร์แอร์ทุกตัวมาล้าง ผึ่งให้แห้งก่อนใส่กลับ',30),
  (3,'ล้างเครื่องดูดควัน / พัดลมระบายอากาศ','ถอดตะแกรง+ใบพัด ล้างคราบไขมัน',30),
  (4,'ตรวจสายแก๊ส วาล์ว และถังแก๊ส','เช็ครอยรั่วด้วยน้ำสบู่ ดูสภาพสาย/วันหมดอายุ',30),
  (5,'ตรวจไฟฉุกเฉิน / ป้ายทางหนีไฟ','กดปุ่มทดสอบไฟฉุกเฉิน เช็คหลอดไฟติดครบ',30),
  (6,'กำจัดแมลง / หนู','ตามรอบบริษัทกำจัดแมลง ถ่ายรูปใบบริการแนบไว้',30),
  (7,'ตรวจสอบถังดับเพลิง','เข็มเกจอยู่โซนเขียว สลัก/สายฉีดครบ ไม่หมดอายุ',90),
  (8,'เปลี่ยน/ล้างไส้กรองเครื่องกรองน้ำ','ตามรอบไส้กรอง จดวันที่เปลี่ยนติดไว้ที่เครื่อง',90),
  (9,'ล้างคอยล์ตู้เย็น/ตู้แช่ + เช็คขอบยาง','ปัดฝุ่นคอยล์ร้อนด้านหลัง เช็คยางขอบประตูเสื่อม',90)
) as t(n,name,detail,freq)
on conflict (id) do nothing;
