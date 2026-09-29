#!/bin/bash
# ตรวจ syntax ของ <script> ทุกก้อน (inline) ใน jjmk-payroll.html
cd "$(dirname "$0")/../.."
python3 - << 'PY'
import re, subprocess, tempfile, sys
html = open('jjmk-payroll.html', encoding='utf-8').read()
blocks = re.findall(r'<script>(.*?)</script>', html, re.S)
bad = []
for i, b in enumerate(blocks):
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
        f.write(b); tmp = f.name
    r = subprocess.run(['node','--check',tmp], capture_output=True, text=True)
    if r.returncode: bad.append(f'ก้อนที่ {i+1}:\n' + r.stderr)
if bad: sys.exit('พัง:\n' + '\n'.join(bad))
print(f'syntax OK ({len(blocks)} ก้อน)')
PY
