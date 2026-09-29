#!/usr/bin/env python3
# แยก <script> ตัวหลักของแอป (ก้อนสุดท้ายก่อน </body>) ออกจาก jjmk-payroll.html -> app.js (เอาไว้แก้ JS สะดวกๆ)
# ไฟล์มี <script> หลายก้อน (ด่าน JJ Gate / ปุ่มล็อกอินกลาง / mount) — ต้องเลือกก้อนท้ายสุดเท่านั้น ห้ามใช้ regex แบบ greedy
import pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root.parent/'jjmk-payroll.html').read_text(encoding='utf-8')
tail = '\n</script>\n</body>\n</html>'
end = html.rindex(tail)
start = html.rindex('<script>\n', 0, end) + len('<script>\n')
(root/'app.js').write_text(html[start:end], encoding='utf-8')
print(f'แยกแล้ว -> app.js ({end-start:,} chars)')
