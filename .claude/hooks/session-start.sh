#!/bin/bash
# ทุก session บนคลาวด์: ติดตั้งของที่เทสต้องใช้ (jsdom · playwright · สำเนาไลบรารี CDN) ให้พร้อมรัน
#   node tests/precheck.mjs      — ตรวจบล็อกร่วม/กติกา repo (ไม่ต้องติดตั้งอะไร)
#   node tests/unit/run.mjs      — เทสสูตรทุกระบบ
#   node tests/mobile/mobile-check.mjs — ตรวจหน้าจอโทรศัพท์
set -euo pipefail
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then exit 0; fi
cd "$CLAUDE_PROJECT_DIR"
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
for d in tests kpi/test jjmk-payroll/test; do
  if [ -f "$d/package.json" ]; then
    (cd "$d" && npm install --no-audit --no-fund --silent) || echo "⚠ npm install ไม่สำเร็จที่ $d" >&2
  fi
done
exit 0
