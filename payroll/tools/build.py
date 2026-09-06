#!/usr/bin/env python3
# ประกอบ app.js กลับเข้า index.html + ตรวจ syntax ทั้งก้อน
import re, pathlib, subprocess, sys, tempfile
root = pathlib.Path(__file__).resolve().parent.parent
html = (root/'index.html').read_text(encoding='utf-8')
js = (root/'app.js').read_text(encoding='utf-8')
r = subprocess.run(['node','--check',str(root/'app.js')], capture_output=True, text=True)
if r.returncode: sys.exit('app.js พัง:\n' + r.stderr)
m = re.search(r'<script>\n.*\n</script>\n</body>\n</html>', html, re.S)
assert m, 'ไม่พบบล็อก <script> ท้ายไฟล์'
out = html[:m.start()] + '<script>\n' + js + '\n</script>\n</body>\n</html>'
(root/'index.html').write_text(out, encoding='utf-8')
with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
    f.write(re.search(r'<script>\n(.*)\n</script>', out, re.S).group(1)); tmp = f.name
r = subprocess.run(['node','--check',tmp], capture_output=True, text=True)
if r.returncode: sys.exit('inline script พัง:\n' + r.stderr)
print(f'ประกอบแล้ว -> index.html ({len(out.encode("utf-8")):,} bytes) · syntax OK')
