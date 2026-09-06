#!/bin/bash
# ตรวจ syntax ของ script ใน index.html แบบเร็ว
cd "$(dirname "$0")/.."
python3 - << 'PY'
import re, subprocess, tempfile, sys
html = open('index.html', encoding='utf-8').read()
b = re.findall(r'<script>(.*?)</script>', html, re.S)
assert len(b) == 1, f'พบ script {len(b)} บล็อก (ต้องมี 1)'
with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
    f.write(b[0]); tmp = f.name
r = subprocess.run(['node','--check',tmp], capture_output=True, text=True)
sys.exit(('พัง:\n'+r.stderr) if r.returncode else print('syntax OK'))
PY
