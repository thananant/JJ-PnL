// ตัวช่วยเทส: ดึงฟังก์ชัน "ของจริง" ออกมาจากไฟล์แอป HTML แล้วรันใน vm (ไม่เขียนสูตรซ้ำในเทส)
// แก้สูตรในแอปเมื่อไร เทสจะเห็นของใหม่ทันที · ฟังก์ชันหาย/เปลี่ยนชื่อ = เทสล้มบอกชื่อ
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// ตัดฟังก์ชัน `function name(` ทั้งก้อน — ลองปิดที่ } ทีละตัวจนได้โค้ดที่แปลได้ (ไม่หลงวงเล็บในสตริง/regex)
export function pickFn(src, name) {
  const re = new RegExp('(?:^|\\n)\\s*(?:async\\s+)?function\\s+' + name.replace(/\$/g, '\\$') + '\\s*\\(');
  const m = re.exec(src);
  if (!m) throw new Error('ไม่เจอฟังก์ชัน ' + name + ' ในไฟล์แอป (เปลี่ยนชื่อ/ถูกลบ?)');
  const start = m.index + m[0].indexOf('function') - (/async\s+function/.test(m[0]) ? m[0].match(/async\s+/)[0].length : 0);
  let i = src.indexOf('{', start);
  for (let n = 0; n < 4000; n++) {
    i = src.indexOf('}', i + 1);
    if (i < 0) break;
    const code = src.slice(start, i + 1);
    try { new vm.Script('(' + code + ')'); return code; } catch {}
  }
  throw new Error('ตัดฟังก์ชัน ' + name + ' ไม่ได้');
}
// ตัดบรรทัดประกาศตัวแปร `var|const|let name = …;` (ทั้งคำสั่ง)
export function pickVar(src, name) {
  const re = new RegExp('(?:^|\\n)\\s*(var|const|let)\\s+' + name + '\\s*=');
  const m = re.exec(src);
  if (!m) throw new Error('ไม่เจอตัวแปร ' + name);
  const start = m.index + m[0].indexOf(m[1]);
  let i = start;
  for (let n = 0; n < 4000; n++) {
    i = src.indexOf(';', i + 1);
    if (i < 0) break;
    const code = src.slice(start, i + 1);
    try { new vm.Script(code); return code.replace(/^(const|let)\b/, 'var'); } catch {}
  }
  throw new Error('ตัดตัวแปร ' + name + ' ไม่ได้');
}
// โหลดหลายฟังก์ชัน/ตัวแปรเข้า context เดียว · prelude = โค้ดเตรียม (ค่าคงที่ที่ฟังก์ชันอ้าง)
export function load(file, { fns = [], vars = [], prelude = '' } = {}) {
  const src = read(file);
  const code = [prelude, ...vars.map(v => pickVar(src, v)), ...fns.map(f => pickFn(src, f))].join('\n;\n');
  const ctx = { console, Intl, Date, Math, JSON };
  vm.createContext(ctx);
  vm.runInContext(code + '\n;this.__ok=1;', ctx, { filename: file });
  for (const f of fns) ctx[f] = vm.runInContext(f, ctx);
  return ctx;
}

// เรียกฟังก์ชัน Python จากไฟล์สคริปต์จริง (import แบบไม่รัน main) — args: [[fnName, ...params], ...]
export function py(file, calls) {
  const runner = `
import sys, json, importlib.util
spec = importlib.util.spec_from_file_location('m', sys.argv[1]); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
out = []
for c in json.load(sys.stdin):
    try: out.append(getattr(m, c[0])(*c[1:]))
    except Exception as e: out.append({'__err': repr(e)})
print(json.dumps(out, ensure_ascii=False))`;
  const res = execFileSync('python3', ['-I', '-c', runner, path.join(ROOT, file)], { input: JSON.stringify(calls), encoding: 'utf8', maxBuffer: 64 << 20 });
  return JSON.parse(res);
}

// ตัวนับผลแบบเดียวกับเทสเดิมของ repo (✓/✗ + ALL PASSED)
export function suite(title) {
  let fail = 0, n = 0;
  console.log('\n■ ' + title);
  return {
    ok(c, m) { n++; if (!c) { fail++; console.log('  ✗ ' + m); } else if (process.env.VERBOSE) console.log('  ✓ ' + m); },
    eq(a, b, m) { const s = JSON.stringify; this.ok(s(a) === s(b), m + (s(a) === s(b) ? '' : ` — ได้ ${s(a)} ควรเป็น ${s(b)}`)); },
    done() { console.log(fail ? `  ${fail}/${n} FAILED` : `  ✓ ${n} ข้อผ่าน`); return fail; },
  };
}
