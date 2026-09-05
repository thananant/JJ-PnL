#!/usr/bin/env bash
# ชุด regression หลัก (ณ 2 ก.ย. 2569) — ทุกไฟล์ต้องพิมพ์ "errors: []" และไม่มีบรรทัด ": false"
cd "$(dirname "$0")"
LIST="2 12 33 34 36 37 38 40 41 42 44 45 47 51 53 54 55 57 58 59 60 61 62 63 64 65 66 67 68 69 70 71 72 73 74 75 76 77 78 79 80 81 82 83 84 85 86 87 88 89 90 91 92"
fail=0
for n in $LIST; do
  timeout 200 node tests/smoke$n.js > /tmp/r_$n.txt 2>&1; rc=$?
  errs=$(grep -c "errors: \[\]" /tmp/r_$n.txt); falses=$(grep -c ": false" /tmp/r_$n.txt)
  if [ $rc -ne 0 ] || [ $errs -eq 0 ] || [ $falses -ne 0 ]; then fail=1; echo "FAIL smoke$n"; grep ": false" /tmp/r_$n.txt | head -3; tail -2 /tmp/r_$n.txt; fi
done
echo "FAIL=$fail ($(echo $LIST | wc -w) files)"; exit $fail
