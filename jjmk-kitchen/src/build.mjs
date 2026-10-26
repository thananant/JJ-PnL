// build.mjs — inline k2/mod_<name>.js (order: modules.json) into shell.html at /*__MODULES__*/,
// embed jjmk_kitchen2.sql into <script type="text/plain" id="kcSql">, syntax-check every <script>,
// write ../../jjmk-kitchen.html (or argv[2]).  Usage: node build.mjs [outPath] [--check]
// ไฟล์ .sql ไม่อยู่ใน main (กติกา repo) — ไม่มีไฟล์ = เอา SQL ที่ฝังอยู่ในไฟล์ที่สร้างไว้ก่อนหน้า (#kcSql) มาใช้ต่อ
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv.slice(2).find(a => !a.startsWith('--')) || path.resolve(HERE, '../../jjmk-kitchen.html');
const CHECK_ONLY = process.argv.includes('--check');

const shell = fs.readFileSync(path.join(HERE, 'shell.html'), 'utf8');
if(!shell.includes('/*__MODULES__*/')) throw new Error('shell.html: marker /*__MODULES__*/ missing');
const order = JSON.parse(fs.readFileSync(path.join(HERE, 'modules.json'), 'utf8'));
const included = [], skipped = [];
let mods = '';
for(const name of order){
  const f = path.join(HERE, 'mod_' + name + '.js');
  if(!fs.existsSync(f)){ skipped.push(name); continue; }
  const src = fs.readFileSync(f, 'utf8');
  if(/<\/script/i.test(src)) throw new Error('mod_' + name + '.js contains "</script" — not allowed inside the inline script');
  try{ new Function(src); }catch(e){ throw new Error('mod_' + name + '.js syntax error: ' + e.message); }
  mods += '\n/* ===================== module: ' + name + ' (mod_' + name + '.js) ===================== */\n' + src.trim() + '\n/* ===================== /module: ' + name + ' ===================== */\n';
  included.push(name);
}
let html = shell.replace('/*__MODULES__*/', () => mods);
// SQL for the ⚙️ settings install card
const sqlFile = path.join(HERE, 'jjmk_kitchen2.sql');
let sql = fs.existsSync(sqlFile) ? fs.readFileSync(sqlFile, 'utf8') : '';
for(const prev of [OUT, path.resolve(HERE, '../../jjmk-kitchen.html')]){   // ไม่มีไฟล์ .sql (main ไม่เก็บ) → ใช้ที่ฝังอยู่ในไฟล์ที่ build ไว้ก่อน
  if(sql || !fs.existsSync(prev)) continue;
  const m = fs.readFileSync(prev, 'utf8').match(/<script type="text\/plain" id="kcSql">([\s\S]*?)<\/script>/);
  if(m && !/missing at build time/.test(m[1])) sql = m[1];
}
if(!sql) sql = '-- jjmk_kitchen2.sql missing at build time (ดูที่ branch sql)';
if(/<\/script/i.test(sql)) throw new Error('SQL contains </script');
html = html.replace('/*__SQL__*/', () => sql.replace(/\r/g, ''));
// stamp build time into APP_VER (keeps 'KC 2.0' prefix)
const stamp = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
html = html.replace(/const APP_VER='KC 2\.0[^']*';/, "const APP_VER='KC 2.0 · " + stamp + "';");

// syntax-check every <script> (skip src= and text/plain)
const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
let m, n = 0;
while((m = re.exec(html))){
  const attrs = m[1] || '';
  if(/\bsrc=/.test(attrs) || /text\/plain/.test(attrs)) continue;
  n++;
  try{ new Function(m[2]); }
  catch(e){
    const line = html.slice(0, m.index).split('\n').length;
    throw new Error('script #' + n + ' (starts line ' + line + ') syntax error: ' + e.message);
  }
}
// sanity: byte-identical blocks still present
for(const k of ["var APP='kitchen'", 'window.JJLogin=JJLogin', '<!-- JJBR-BEGIN', '<!-- JJBR-END -->', 'ลากหน้าลง = รีเฟรช', 'Cache-Control']){
  if(!html.includes(k)) throw new Error('built file missing required block: ' + k);
}
if(!CHECK_ONLY){
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html);
}
const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
console.log((CHECK_ONLY ? 'checked' : 'wrote') + ' ' + OUT + ' — ' + kb + ' KB, ' + html.split('\n').length + ' lines, ' + n + ' scripts OK');
console.log('modules included: ' + (included.join(', ') || '(none)') + (skipped.length ? ' · skipped (no file): ' + skipped.join(', ') : ''));
