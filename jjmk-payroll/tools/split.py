#!/usr/bin/env python3
# แยก inline <script> ออกจาก index.html -> app.js (เอาไว้แก้ JS สะดวกๆ)
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root/'index.html').read_text(encoding='utf-8')
m = re.search(r'<script>\n(.*)\n</script>\n</body>\n</html>', html, re.S)
assert m, 'ไม่พบบล็อก <script> ท้ายไฟล์ตามรูปแบบมาตรฐาน'
(root/'app.js').write_text(m.group(1), encoding='utf-8')
print(f'แยกแล้ว -> app.js ({len(m.group(1)):,} chars)')
