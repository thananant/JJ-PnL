#!/usr/bin/env node
// รันเทสทุกระบบในครั้งเดียว: tests/unit/*.test.mjs + เทสเดิมของ KPI (kpi/test) + เงินเดือน (jjmk-payroll/test)
// ใช้: node tests/unit/run.mjs  [ชื่อบางส่วน เช่น invoice]   · VERBOSE=1 = โชว์ทุกข้อที่ผ่าน
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { ROOT } from './lib.mjs';

const only = process.argv.slice(2).filter(a => !a.startsWith('-'));
const HERE = path.join(ROOT, 'tests', 'unit');
const jobs = fs.readdirSync(HERE).filter(f => f.endsWith('.test.mjs')).sort()
  .map(f => ({ name: f.replace('.test.mjs', ''), cmd: [process.execPath, [path.join(HERE, f)], ROOT] }));
// เทสเดิมที่อยู่คู่แอป (มี package.json + jsdom ของตัวเอง)
const legacy = [
  { name: 'kpi', dir: 'kpi/test', scripts: ['check', 'test'] },
  { name: 'payroll', dir: 'jjmk-payroll/test', scripts: ['test'] },
];
for (const l of legacy) {
  const dir = path.join(ROOT, l.dir);
  if (!fs.existsSync(path.join(dir, 'package.json'))) continue;
  for (const s of l.scripts) jobs.push({ name: l.name + (s === 'test' ? '' : ':' + s), cmd: ['npm', ['run', '-s', s], dir], dir });
}

const sel = jobs.filter(j => !only.length || only.some(o => j.name.includes(o)));
const results = [];
for (const j of sel) {
  if (j.dir && !fs.existsSync(path.join(j.dir, 'node_modules'))) {
    process.stdout.write(`(ติดตั้ง jsdom ให้ ${path.relative(ROOT, j.dir)} …)\n`);
    spawnSync('npm', ['install', '--silent', '--no-audit', '--no-fund'], { cwd: j.dir, stdio: 'inherit' });
  }
  const t0 = Date.now();
  const r = spawnSync(j.cmd[0], j.cmd[1], { cwd: j.cmd[2], encoding: 'utf8', env: { ...process.env, TZ: 'Asia/Bangkok' }, maxBuffer: 64 << 20 });
  const out = (r.stdout || '') + (r.stderr || '');
  const ok = r.status === 0;
  results.push({ name: j.name, ok, ms: Date.now() - t0 });
  // ผ่าน = สรุปบรรทัดเดียว · ไม่ผ่าน = โชว์ผลเต็ม
  if (ok) console.log(`✓ ${j.name.padEnd(14)} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  else console.log(`✗ ${j.name}\n${out.split('\n').filter(l => !/^\s*✓/.test(l) || process.env.VERBOSE).join('\n')}`);
}
const bad = results.filter(r => !r.ok);
console.log(`\n${bad.length ? '✗ ' + bad.length + ' ชุดไม่ผ่าน: ' + bad.map(b => b.name).join(', ') : 'ALL PASSED'} (${results.length} ชุด)`);
process.exit(bad.length ? 1 : 0);
