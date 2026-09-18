-- ============================================================
-- JJ เช็คสต๊อก · คลังคำแปลกลาง (18 ก.ย. 2569) — รันซ้ำได้
--   ปัญหา: เปลี่ยนภาษาทีไรต้องรอแปลใหม่ทุกเครื่อง (แคชอยู่แค่ในเบราว์เซอร์ที่แปล)
--   แก้  : เก็บคำแปลไว้ในฐานข้อมูล → แปลครั้งเดียว ทุกเครื่อง/ทุกคนใช้ได้เลย
--          และรอบถัดไปส่งไปแปลเฉพาะ "คำที่ยังไม่เคยแปล" เท่านั้น
--   หมายเหตุ: อยากล้างคำแปลของภาษาใดภาษาหนึ่งเพื่อให้แปลใหม่
--             delete from sc_i18n where lang='lo';   (แล้วรีเฟรชแอพ)
-- ============================================================
create table if not exists sc_i18n (
  lang text not null,                       -- en / lo / my
  src  text not null,                       -- ข้อความต้นฉบับ (ส่วนใหญ่เป็นไทย)
  txt  text not null,                       -- คำแปล
  updated_at timestamptz not null default now(),
  primary key (lang, src)
);
create index if not exists sc_i18n_lang_idx on sc_i18n(lang);

alter table sc_i18n enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sc_i18n' and policyname='jjsc_allow') then
    create policy jjsc_allow on sc_i18n for all using (true) with check (true);
  end if;
end $$;

grant select, insert, update on sc_i18n to anon, authenticated;

-- ---------- ตรวจผล ----------
select lang as ภาษา, count(*) as จำนวนคำแปล from sc_i18n group by lang order by lang;
select string_agg(privilege_type,', ' order by privilege_type) as สิทธิ์ของ_anon
from information_schema.role_table_grants
where table_schema='public' and table_name='sc_i18n' and grantee='anon';
-- คาด: สิทธิ์ของ_anon = INSERT, SELECT, UPDATE · ตารางว่าง (จะค่อย ๆ เต็มเองตอนใช้งาน)
--      หลังรัน ให้เข้าแอพแล้วสลับภาษา 1 รอบ (แปลเสร็จมันจะเก็บลงตารางนี้ให้เอง)
--      แล้วรัน  select lang, count(*) from sc_i18n group by lang;  ดูว่ามีคำแปลเข้ามาแล้ว
