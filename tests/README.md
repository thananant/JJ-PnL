# tests — ตัวตรวจกลางของทุกระบบ

| คำสั่ง | ทำอะไร | เวลา |
|---|---|---|
| `node tests/precheck.mjs` | ตรวจกติกา repo ก่อน commit: บล็อกร่วม (JJ Login · JJ Gate · JJBR · SPD) · ล็อกอินไม่หาย · ไม่มี `.sql` · no-cache · syntax · ค่าข้ามไฟล์ | ~2 วิ |
| `node tests/precheck.mjs --remote` | + fetch main ล่าสุด + เทียบโค้ด Edge Function ที่ฝังในแอปกับ branch `sql`/Social | ~10 วิ |
| `node tests/unit/run.mjs` | เทสสูตรทุกระบบ (ใบกำกับ · นับสต๊อก↔ครัวกลาง · หน้าแรก · KPI · เงินเดือน) | ~70 วิ |
| `node tests/mobile/mobile-check.mjs` | เปิดทุกแอปบนโทรศัพท์จำลอง 5 รุ่น (`--all` = 15 รุ่น) ตรวจปุ่มโดนรอยบาก/แถบโฮม · เลื่อนข้าง · ช่องกรอก <16px | ~2 / 8 นาที |

ติดตั้งครั้งแรก: `cd tests && npm install` (session บนคลาวด์ทำให้เองผ่าน `.claude/hooks/session-start.sh`)

วิธีใช้ละเอียด + วิธีเขียนเทสใหม่: `.claude/skills/jj-precheck` · `jj-mobile-check` · `jj-tests`

ไม่แตะฐานข้อมูลจริงเลย — ทุกคำขอไป Supabase ถูกตอบด้วยข้อมูลจำลอง · ผลของตัวตรวจมือถืออยู่ `tests/mobile/out/` (ไม่ commit)
