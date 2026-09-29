#!/usr/bin/env python3
# ประกอบ app.js กลับเข้า <script> ก้อนท้ายสุดของ jjmk-payroll.html + ตรวจ syntax ทุกก้อน
import pathlib, subprocess, sys
root = pathlib.Path(__file__).resolve().parent.parent
page = root.parent/'jjmk-payroll.html'
html = page.read_text(encoding='utf-8')
js = (root/'app.js').read_text(encoding='utf-8')
r = subprocess.run(['node','--check',str(root/'app.js')], capture_output=True, text=True)
if r.returncode: sys.exit('app.js พัง:\n' + r.stderr)
tail = '\n</script>\n</body>\n</html>'
end = html.rindex(tail)
start = html.rindex('<script>\n', 0, end) + len('<script>\n')
out = html[:start] + js + html[end:]
page.write_text(out, encoding='utf-8')
r = subprocess.run(['bash', str(root/'tools'/'check.sh')], capture_output=True, text=True)
if r.returncode: sys.exit('ตรวจหลังประกอบไม่ผ่าน:\n' + r.stdout + r.stderr)
print(f'ประกอบแล้ว -> jjmk-payroll.html ({len(out.encode("utf-8")):,} bytes) · syntax OK')
