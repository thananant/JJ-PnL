#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
inv_nas_sync.py — ตัวเก็บไฟล์ PDF ใบกำกับภาษีลง NAS (จริงใจหมูกระทะ)
=========================================================================
รันบน Synology ผ่าน Task Scheduler ทุก 5 นาที (แบบเดียวกับสคริปต์สำรองข้อมูลของ P&L)
NAS เป็นฝ่าย "ดึง" ข้อมูลบิลที่ยังไม่มีไฟล์จาก Supabase มาสร้าง PDF เก็บเอง
  → ไม่ต้องเปิดพอร์ต / ไม่ต้องทำ DDNS / ไม่ต้องตั้งอะไรในเครื่องที่ใช้ออกบิล
  → ออกบิลจากมือถือหรือเครื่องไหนก็ได้ ไฟล์เข้า NAS ภายใน 5 นาที
  → เก็บเป็น <สาขา>/<MMYYYY>/<เลขบิล>.pdf เช่น JJRD/092026/JJRD1244.pdf (ชื่อไฟล์ = เลขบิล เรียงตามเลขเอง)
  → บิลที่ถูกแก้ไข = ลบใบเดิมทิ้งแล้วเก็บใบใหม่ · บิลยกเลิก = ลบใบเดิม แล้วเก็บใบที่มีตรา "ยกเลิก"
    ลงโฟลเดอร์ย่อย ยกเลิก/ ของเดือนนั้น · เรียกคืน = ย้ายกลับ (แอปสั่งให้ NAS ทำเองทั้งหมด)
  → Supabase เก็บแค่ตัวหนังสือ ไม่มีไฟล์ใด ๆ ขึ้นไป

วิธีติดตั้ง (ทำครั้งเดียว — ขั้นตอนละเอียดอยู่ในหน้า ⚙ ตั้งค่า ของแอปใบกำกับภาษี)
  🔒 สคริปต์นี้รันด้วย root → เก็บไว้ในโฟลเดอร์แชร์ที่ "เฉพาะ administrators" เข้าได้ แยกจากโฟลเดอร์เก็บบิล
     (ถ้าเก็บในโฟลเดอร์ที่เครื่องพนักงาน map ไว้ ใครแก้ไฟล์นี้ได้ = สั่งงาน NAS ได้ทั้งเครื่อง)
  1) Control Panel → Shared Folder → สร้างโฟลเดอร์แชร์ชื่อ scripts
       สิทธิ์: administrators = อ่าน/เขียน · ผู้ใช้อื่นทุกคน = ไม่มีสิทธิ์ (No access)
     สร้างโฟลเดอร์ย่อย inv_sync แล้ววางไฟล์นี้ลงไป → /volume1/scripts/inv_sync/inv_nas_sync.py
     (ถ้ามีลายเซ็น วาง signature.png ไว้ในโฟลเดอร์ inv_sync เดียวกัน)
  2) Task Scheduler → User-defined script (user: root) รันครั้งเดียว:
       python3 "/volume1/scripts/inv_sync/inv_nas_sync.py" --install --base "/volume1/Tax invoice"
     แล้วเปิดไฟล์ inv_sync/inv_nas_sync.log ต้องเห็นบรรทัด "พร้อมใช้งาน"
  3) Task Scheduler → User-defined script (user: root) ทุกวัน ทุก 5 นาที (เวลาสิ้นสุด 23:55):
       python3 "/volume1/scripts/inv_sync/inv_nas_sync.py" --base "/volume1/Tax invoice"
     --base = โฟลเดอร์เก็บบิล (ใส่เครื่องหมายคำพูดครอบเสมอ เพราะชื่อมีเว้นวรรค)
  * แบบเดิมยังใช้ได้ ไม่ต้องย้ายก็ได้: ไฟล์อยู่ที่ /volume1/Tax invoice/_sync/inv_nas_sync.py
    แล้วรัน  python3 "/volume1/Tax invoice/_sync/inv_nas_sync.py"  (ไม่ใส่ --base = เก็บลงโฟลเดอร์แม่ของ _sync)
    แต่ต้องล็อกโฟลเดอร์ _sync ให้แก้ไขได้เฉพาะ administrators (File Station → คุณสมบัติ → สิทธิ์)
    ย้ายมาแบบแนะนำ: ก๊อปทั้งโฟลเดอร์ _sync (มี _lib / fonts / signature.png) ไปเป็น /volume1/scripts/inv_sync
    → แก้คำสั่งใน Task Scheduler เป็นแบบข้อ 3 → รัน --check ดูว่าบรรทัด "โฟลเดอร์เก็บบิล" ถูก → ลบ _sync เดิมทิ้ง
  * ไฟล์ที่เคยเก็บแบบเดิม (YYYY-MM/ และ _ฉบับก่อนหน้า) สคริปต์ย้ายเข้าโครงใหม่ให้เองแล้วลบของเดิมทิ้ง
  * หน้า "สำเนา" ทำตามสวิตช์ "แนบหน้า สำเนา" ในแอป (อ่านจาก inv_settings รอบละครั้ง) — บังคับเองได้ที่ WITH_COPY

คำสั่งเสริม (ใส่ --base "<โฟลเดอร์เก็บบิล>" ต่อท้ายได้ทุกคำสั่ง)
  --install        ติดตั้งไลบรารีสร้าง PDF (fpdf2 + uharfbuzz) ลงโฟลเดอร์ _lib ข้างไฟล์นี้
  --check          ตรวจความพร้อมทุกข้อ (Python / ไลบรารี / ฟอนต์ / โฟลเดอร์เก็บบิลที่ใช้อยู่ / Supabase / ลายเซ็น)
  --test           สร้างบิลตัวอย่างลงโฟลเดอร์ _test (ไม่แตะข้อมูลจริง) ไว้เปิดดูว่าตัวหนังสือไทยถูกต้อง
  --force JJRD1006 สร้างไฟล์บิลใบนั้นใหม่ทันที
  --base "<path>"  โฟลเดอร์เก็บบิล (ชนะ BASE_DIR และกฎโฟลเดอร์แม่ของ _sync)

ที่มาของไฟล์: https://github.com/thananant/JJ-PnL/blob/main/jjmk-invoice/inv_nas_sync.py
"""
import os
import sys
import re
import stat
import json
import math
import time
import datetime
import platform
import subprocess
import unicodedata
import urllib.request
import urllib.parse
import urllib.error
from decimal import Decimal, Context, ROUND_HALF_UP

HERE = os.path.dirname(os.path.abspath(__file__))
LIB_DIR = os.path.join(HERE, '_lib')
if os.path.isdir(LIB_DIR):
    sys.path.insert(0, LIB_DIR)

# ====================== ตั้งค่า (ปกติไม่ต้องแก้) ======================
# โฟลเดอร์เก็บบิล — ลำดับที่ใช้: --base "<path>" ในคำสั่ง > BASE_DIR ข้างล่าง >
# ถ้าไฟล์นี้อยู่ในโฟลเดอร์ที่ชื่อขึ้นต้นด้วย _ (เช่น _sync) เก็บลงโฟลเดอร์แม่ของมัน ไม่งั้นเก็บลงโฟลเดอร์เดียวกับไฟล์นี้
# สคริปต์แยกโฟลเดอร์รายเดือนให้เอง เช่น 2026-09/JJRD1006.pdf (เหมือนที่แอปเก็บ)
BASE_DIR = ''
WITH_COPY = None         # None = ทำตามสวิตช์ "แนบหน้า สำเนา" ในแอป (inv_settings: pdf_with_copy = '1' / '0')
                         # True / False = บังคับแนบ / ไม่แนบหน้า "สำเนา" ทุกไฟล์ (หน้าแรกเป็นต้นฉบับเสมอ)
MAX_PER_RUN = 100        # เก็บสูงสุดกี่ใบต่อรอบ (รอบแรกที่มีบิลเก่าค้างเยอะจะทยอยเก็บ)
# ======================================================================

SUPABASE_URL = os.environ.get('JJ_SB_URL') or 'https://aikyxvluaiubdidqxwnd.supabase.co'
SUPABASE_KEY = os.environ.get('JJ_SB_KEY') or (
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3l4dmx1YWl1YmRpZHF4d25kIiwicm9sZSI6'
    'ImFub24iLCJpYXQiOjE3ODI2Mjc1MjQsImV4cCI6MjA5ODIwMzUyNH0.YSZ-dWsdVisRd3diGA_Cos6U2YQYQZPJzSXYuGp7FfM')

# หัวบิล — ต้องตรงกับ CONFIG.SHOP ในแอป jjmk-invoice.html
SHOP = {
    'name': 'บริษัท พากันรวย ฟู้ด คอร์ปอเรชั่น จำกัด',
    'taxBranch': 'สำนักงานใหญ่',
    'taxId': '0105566172139',
    'address': '244/7 ถนนรัชดาภิเษก แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
}
STATUS_CANCELLED = 'ยกเลิก'

FONT_DIR = os.path.join(HERE, 'fonts')
FONT_SRC = 'https://raw.githubusercontent.com/google/fonts/main/ofl/prompt/'
FONTS = {'R': 'Prompt-Regular.ttf', 'B': 'Prompt-Bold.ttf', 'SB': 'Prompt-SemiBold.ttf'}
LOG_FILE = os.path.join(HERE, 'inv_nas_sync.log')
LOCK_FILE = os.path.join(HERE, '.inv_nas_sync.lock')
BKK = datetime.timezone(datetime.timedelta(hours=7))

# สีเดียวกับเอกสารในแอป
RED = (188, 43, 48)          # #BC2B30
RED_EDGE = (138, 32, 36)     # #8a2024
RED_DARK = (122, 31, 34)     # #7a1f22
CREAM = (253, 244, 225)      # #fdf4e1
CREAM_HEAD = (247, 231, 196) # #f7e7c4
INK = (26, 26, 26)           # #1a1a1a
MUTED = (68, 68, 68)         # #444
NOTE = (85, 85, 85)          # #555
LINE = (51, 51, 51)          # #333
WHITE = (255, 255, 255)
VOID = (155, 28, 28)

# แอปวาดบิลกว้าง 794px แล้ววางลง A4 กว้าง 200 มม. → 1px = 200มม/794 (หน่วย pt)
K = (200.0 / 25.4 * 72.0) / 794.0


def P(px):
    return px * K


# ------------------------------------------------------------------ log
def log(msg):
    line = datetime.datetime.now(BKK).strftime('%Y-%m-%d %H:%M:%S') + '  ' + msg
    try:
        print(line)
        sys.stdout.flush()
    except Exception:
        pass
    try:
        if os.path.exists(LOG_FILE) and os.path.getsize(LOG_FILE) > 1000000:
            os.replace(LOG_FILE, LOG_FILE + '.old')
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(line + '\n')
    except Exception:
        pass


# ค่าที่ได้จากคำสั่งรอบนี้ (main() ตั้งให้ แล้วล้างทิ้งเมื่อจบ)
_OPT = {'base': None}        # --base "<path>"
_RUN = {'copy': None}        # สวิตช์ "แนบหน้า สำเนา" ที่อ่านจากแอปแล้วในรอบนี้ (None = ยังไม่ได้อ่าน)


def base_dir():
    if _OPT['base']:
        return _OPT['base']
    if BASE_DIR:
        return BASE_DIR
    if os.path.basename(HERE).startswith('_'):
        return os.path.dirname(HERE)
    return HERE


def base_source():
    """บอกว่าโฟลเดอร์เก็บบิลได้มาจากไหน (แสดงใน --check)"""
    if _OPT['base']:
        return 'ตั้งด้วย --base'
    if BASE_DIR:
        return 'ตั้งใน BASE_DIR'
    if os.path.basename(HERE).startswith('_'):
        return 'โฟลเดอร์แม่ของ %s' % os.path.basename(HERE)
    return 'โฟลเดอร์เดียวกับสคริปต์'


def take_base_arg(argv):
    """ดึง --base "<path>" (หรือ --base=<path>) ออกจากคำสั่ง คืน (path หรือ None, คำสั่งที่เหลือ)"""
    rest, base, i = [], None, 0
    while i < len(argv):
        a = argv[i]
        if a == '--base' or a.startswith('--base='):
            if a == '--base':
                v = argv[i + 1] if i + 1 < len(argv) else ''
                i += 1
            else:
                v = a[len('--base='):]
            if not v.strip() or v.startswith('--'):
                raise ValueError('--base ต้องตามด้วยโฟลเดอร์เก็บบิล เช่น --base "/volume1/Tax invoice"')
            base = os.path.abspath(os.path.expanduser(v))
        else:
            rest.append(a)
        i += 1
    return base, rest


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


# ------------------------------------------------------------------ Supabase (REST + anon key เหมือนในแอป)
def sb_req(method, path, body=None, prefer=None):
    headers = {'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY,
               'Content-Type': 'application/json', 'Accept': 'application/json'}
    if prefer:
        headers['Prefer'] = prefer
    data = json.dumps(body, ensure_ascii=False).encode('utf-8') if body is not None else None
    req = urllib.request.Request(SUPABASE_URL + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        detail = e.read().decode('utf-8', 'replace')[:300]
        raise RuntimeError('Supabase %s → HTTP %s %s' % (method, e.code, detail))
    except urllib.error.URLError as e:
        raise RuntimeError('ต่อ Supabase ไม่ได้ (%s) — NAS ออกอินเทอร์เน็ตได้ไหม' % e.reason)
    return json.loads(raw) if raw.strip() else None


def q(v):
    return urllib.parse.quote(str(v), safe='')


BILL_RE = r'^[A-Za-z0-9_-]{1,32}$'     # เลขบิลที่รับ — กันชื่อไฟล์หลุดออกนอกโฟลเดอร์


def fetch_pending(limit):
    # บิลใหม่ก่อน (บิลเก่าที่ค้างเยอะหรือเสียจะไม่ขวางบิลวันนี้) · เลขบิลผิดรูปแบบไม่เข้าคิวเลย
    return sb_req('GET', '/rest/v1/inv_invoices?select=*&nas_path=is.null'
                         '&bill_no=match.' + q(BILL_RE) +
                         '&order=issued_at.desc&limit=%d' % limit) or []


def fetch_one(bill_no):
    rows = sb_req('GET', '/rest/v1/inv_invoices?select=*&bill_no=eq.' + q(bill_no) + '&limit=1') or []
    return rows[0] if rows else None


def mark_saved(inv, rel, force=False):
    """บันทึก nas_path กลับเข้าตาราง — แก้เฉพาะช่องนี้ช่องเดียว (ไม่แตะว่าใครแก้บิลล่าสุด)
    ถ้าบิลถูกแก้ระหว่างที่กำลังสร้างไฟล์ (updated_at เปลี่ยน) จะไม่บันทึก
    รอบถัดไปจะสร้างไฟล์ใหม่จากข้อมูลล่าสุดให้เอง"""
    path = '/rest/v1/inv_invoices?bill_no=eq.' + q(inv['bill_no'])
    if not force:
        path += '&nas_path=is.null'
        if inv.get('updated_at'):
            path += '&updated_at=eq.' + q(inv['updated_at'])
    rows = sb_req('PATCH', path, {'nas_path': rel}, prefer='return=representation')
    return bool(rows)


def requeue(bill_no):
    """ส่งบิลกลับเข้าคิว (nas_path = null) — ใช้เมื่อไฟล์ที่เพิ่งเขียนอาจเป็นฉบับเก่า"""
    sb_req('PATCH', '/rest/v1/inv_invoices?bill_no=eq.' + q(bill_no), {'nas_path': None},
           prefer='return=minimal')


def fetch_copy_setting():
    """สวิตช์ "แนบหน้า สำเนา" ในแอป (inv_settings: pdf_with_copy = '1' เปิด / '0' หรือไม่มี = ปิด)"""
    rows = sb_req('GET', '/rest/v1/inv_settings?select=key,value&key=eq.pdf_with_copy') or []
    v = rows[0].get('value') if rows and isinstance(rows[0], dict) else None
    return str(v).strip().lower() in ('1', 'true')


def want_copy():
    """แนบหน้า "สำเนา" ไหม — WITH_COPY บังคับได้ · ไม่งั้นทำตามแอป (อ่านรอบละครั้ง อ่านไม่ได้ = ไม่แนบ)"""
    if WITH_COPY is not None:
        return bool(WITH_COPY)
    if _RUN['copy'] is None:
        try:
            _RUN['copy'] = fetch_copy_setting()
        except Exception as e:
            _RUN['copy'] = False
            log('อ่านสวิตช์ "แนบหน้า สำเนา" จากแอปไม่ได้ (%s) — รอบนี้ไม่แนบหน้าสำเนา' % e)
    return _RUN['copy']


def heartbeat(info):
    """บอกแอปว่า NAS ทำงานล่าสุดเมื่อไหร่ (แสดงในหน้าตั้งค่า) — เก็บแค่ตัวหนังสือ"""
    try:
        sb_req('POST', '/rest/v1/inv_settings',
               [{'key': 'nas_sync_last', 'value': now_iso()},
                {'key': 'nas_sync_info', 'value': info[:300]}],
               prefer='resolution=merge-duplicates,return=minimal')
    except Exception as e:
        log('แจ้งสถานะกลับไปที่แอปไม่ได้: %s' % e)


# ------------------------------------------------------------------ ตัวช่วย (พอร์ตจากแอป ให้ผลตรงกัน)
def num(v, default=0.0):
    try:
        if v is None or v == '':
            return default
        return float(v)
    except (TypeError, ValueError):
        return default


JS_EPSILON = 2.220446049250313e-16      # Number.EPSILON ของ JavaScript
_INF = float('inf')
_DEC = Context(prec=400)                 # พอสำหรับทุกค่าของ double — quantize ไม่ล้น


def js_round(x):
    """Math.round ของ JavaScript: ใกล้สุด ถ้าเท่ากันพอดีปัดไปทาง +∞ (round() ของ Python ปัดเข้าเลขคู่ — ห้ามใช้)
    ลบ 0.5 ออกแบบนี้ได้ผลตรงทุกบิต ไม่พลาดแบบ floor(x + 0.5) ที่ 0.49999999999999994 หรือเลขเกิน 2^52"""
    if x != x or x == _INF or x == -_INF:
        return x
    f = math.floor(x)
    r = float(f + 1 if x - f >= 0.5 else f)
    if r == 0 and (x < 0 or math.copysign(1.0, x) < 0):
        return -0.0                      # JS: Math.round(-0.2) = -0
    return r


def round2(n):
    # แอป: Math.round((Number(n)+Number.EPSILON)*100)/100 — คำนวณแบบ double ลำดับเดียวกันทุกขั้น
    return js_round((num(n) + JS_EPSILON) * 100) / 100


def fmt(n):
    """แอป: Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})
    เบราว์เซอร์ปัดจากเลขทศนิยมที่สั้นที่สุดของค่านั้น (1.005 → "1.01") แบบครึ่งปัดออกจากศูนย์"""
    v = num(n)
    if v != v or v == 0:
        v = 0.0                          # n||0 : 0 / -0 / NaN → 0
    if v == _INF or v == -_INF:
        return '∞' if v > 0 else '-∞'
    d = Decimal(repr(v)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP, context=_DEC)
    return '{:,.2f}'.format(d)


def js_str(f):
    """String(number) ของ JavaScript — ตัวเลขชุดสั้นที่สุดเดียวกับ repr() แต่รูปแบบตามกติกา JS
    (เลขเต็มถึง 21 หลัก · ทศนิยมถึง 0.000001 · นอกนั้น 1e+21 / 1e-7)"""
    if f != f:
        return 'NaN'
    if f == _INF or f == -_INF:
        return 'Infinity' if f > 0 else '-Infinity'
    if f == 0:
        return '0'
    t = Decimal(repr(abs(f))).as_tuple()
    digits = ''.join(str(d) for d in t.digits)
    n = len(digits) + t.exponent                 # ตำแหน่งจุดทศนิยม (n ในสเปก Number::toString)
    digits = digits.rstrip('0')
    k = len(digits)
    if k <= n <= 21:
        s = digits + '0' * (n - k)
    elif 0 < n <= 21:
        s = digits[:n] + '.' + digits[n:]
    elif -6 < n <= 0:
        s = '0.' + '0' * (-n) + digits
    else:
        e = n - 1
        s = digits[0] + ('.' + digits[1:] if k > 1 else '') + 'e' + ('+' if e >= 0 else '-') + str(abs(e))
    return ('-' if f < 0 else '') + s


def fmt_qty(v):
    """จำนวนในตาราง — แอปแสดง it.qty ตามที่เก็บไว้ (String ของตัวเลข)"""
    if isinstance(v, str):
        return v.strip()
    return js_str(num(v))


def bkk(iso):
    if not iso:
        return datetime.datetime.now(BKK)
    s = str(iso).strip().replace(' ', 'T', 1).replace('Z', '+00:00')
    # Python 3.8 รับเศษวินาทีได้แค่ 3 หรือ 6 หลัก — เติม/ตัดให้เป็น 6 หลัก
    s = re.sub(r'\.(\d+)', lambda m: '.' + (m.group(1) + '000000')[:6], s)
    if re.search(r'[+-]\d{2}$', s):
        s += ':00'
    try:
        d = datetime.datetime.fromisoformat(s)
    except ValueError:
        d = datetime.datetime.strptime(s[:19], '%Y-%m-%dT%H:%M:%S')
    if d.tzinfo is None:
        d = d.replace(tzinfo=datetime.timezone.utc)
    return d.astimezone(BKK)


def fmt_date(iso):
    return bkk(iso).strftime('%d/%m/%Y')


def ym_of(iso):
    return bkk(iso).strftime('%Y-%m')


def read_six(s):
    d = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
    p = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน']
    s = str(int(s))
    n = len(s)
    r = ''
    for i, ch in enumerate(s):
        dig = int(ch)
        place = n - i - 1
        if dig == 0:
            continue
        if place == 1:
            r += 'สิบ' if dig == 1 else ('ยี่สิบ' if dig == 2 else d[dig] + 'สิบ')
        elif place == 0:
            r += 'เอ็ด' if (dig == 1 and n > 1) else d[dig]
        else:
            r += d[dig] + p[place]
    return r


def read_thai(n):
    n = int(abs(n))
    if n == 0:
        return 'ศูนย์'
    s = str(n)
    if len(s) > 6:
        return read_thai(int(s[:-6])) + 'ล้าน' + read_six(s[-6:])
    return read_six(s)


def baht_text(v):
    # แอป: num=round2(num); b=Math.floor(num); sa=Math.round((num-b)*100)
    v = round2(v)
    if v != v or v == _INF or v == -_INF:
        return 'ถ้วน'
    b = math.floor(v)
    sa = int(js_round((v - b) * 100))
    if b == 0 and sa == 0:
        return 'ศูนย์บาทถ้วน'
    t = (read_thai(b) + 'บาท') if b > 0 else ''
    t += (read_thai(sa) + 'สตางค์') if sa > 0 else 'ถ้วน'
    return t


# ------------------------------------------------------------------ ไลบรารี + ฟอนต์
def load_fpdf():
    # fpdf2 แอบ import ไลบรารีเข้ารหัส/เซ็น PDF (cryptography) ถ้ามีในเครื่อง — เราไม่ได้ใช้
    # และตัวที่ติดมากับระบบบางเครื่องพังตอน import (ล้มทั้งสคริปต์) → ปิดไว้เลย ให้ fpdf2 ข้ามไป
    for mod in ('cryptography', 'endesive'):
        if mod not in sys.modules:
            sys.modules[mod] = None
    try:
        import fpdf  # noqa
    except ImportError:
        raise RuntimeError('ยังไม่ได้ติดตั้งไลบรารีสร้าง PDF — รันคำสั่ง --install ก่อน')
    try:
        import uharfbuzz  # noqa
    except ImportError:
        raise RuntimeError('ยังไม่ได้ติดตั้ง uharfbuzz (ตัวจัดวางสระ/วรรณยุกต์ไทย) — รันคำสั่ง --install ก่อน')
    return fpdf


def ensure_fonts():
    os.makedirs(FONT_DIR, exist_ok=True)
    for fn in FONTS.values():
        p = os.path.join(FONT_DIR, fn)
        if os.path.exists(p) and os.path.getsize(p) > 20000:
            continue
        log('โหลดฟอนต์ ' + fn)
        try:
            with urllib.request.urlopen(FONT_SRC + fn, timeout=60) as r:
                data = r.read()
        except Exception as e:
            raise RuntimeError('โหลดฟอนต์ %s ไม่ได้ (%s) — วางไฟล์ฟอนต์ไว้ที่ %s เองก็ได้' % (fn, e, FONT_DIR))
        with open(p + '.part', 'wb') as f:
            f.write(data)
        os.replace(p + '.part', p)


def find_signature():
    for n in ('signature.png', 'signature.jpg', 'signature.jpeg'):
        p = os.path.join(HERE, n)
        if os.path.exists(p):
            return p
    return None


# ------------------------------------------------------------------ ตัดบรรทัดภาษาไทย
# fpdf2 ตัดข้อความไทยที่ไม่มีเว้นวรรคตรงตัวอักษรไหนก็ได้ → บรรทัดใหม่ขึ้นต้นด้วยสระบน/ล่าง/วรรณยุกต์
# หรือสระหน้า (เ แ โ ใ ไ) ค้างท้ายบรรทัดแยกจากพยัญชนะของมัน เช่น "...กระดูกหมูแ" / "ละน้ำจิ้ม"
# ทุกข้อความหลายบรรทัดในบิลจึงตัดด้วย wrap_text() ตัวเดียวนี้ แล้ววาดทีละบรรทัดด้วย cell()
TH_NO_START = frozenset(
    [chr(c) for c in (0x0E30, 0x0E31, 0x0E32, 0x0E33, 0x0E45, 0x0E46, 0x0E2F)] +   # ะ ั า ำ ๅ ๆ ฯ
    [chr(c) for c in range(0x0E34, 0x0E3B)] +      # ิ ี ึ ื ุ ู ฺ
    [chr(c) for c in range(0x0E47, 0x0E4F)])       # ็ ่ ้ ๊ ๋ ์ ํ ๎
TH_LEAD = frozenset(chr(c) for c in range(0x0E40, 0x0E45))     # เ แ โ ใ ไ — ต้องอยู่กับพยัญชนะตัวถัดไป
_NO_START_PUNCT = frozenset(')]},.:;!?%')
_NO_END_PUNCT = frozenset('([{')
_WS = re.compile(r'[ \t\r\n\f]+')            # ช่องว่างแบบ HTML (ช่องว่างติดกันหลายตัว = ตัวเดียว)


def _is_thai(ch):
    return '฀' <= ch <= '๿'


def can_break(s, i):
    """ตัดบรรทัดก่อนตัวที่ i ของคำ s (ที่ไม่มีเว้นวรรค) ได้ไหม"""
    if i <= 0 or i >= len(s):
        return False
    a, b = s[i - 1], s[i]
    if b in TH_NO_START or b in _NO_START_PUNCT or unicodedata.category(b).startswith('M'):
        return False
    if a in TH_LEAD or a in _NO_END_PUNCT:
        return False
    return True


def _nice_break(s, i):
    """จุดตัดที่ดูเป็นธรรมชาติกว่า: หน้าสระหน้า (ขึ้นพยางค์ใหม่แน่นอน) · หลัง - / , · ตรงรอยต่อไทย/ไม่ใช่ไทย"""
    a, b = s[i - 1], s[i]
    return b in TH_LEAD or a in '-/,' or _is_thai(a) != _is_thai(b)


def _over(s, room, measure):
    """measure(s) > room — วัดส่วนหน้าที่ยาวขึ้นทีละเท่าก่อน ข้อความยาวมาก ๆ จะวัดแค่ราว ๆ หนึ่งบรรทัด
    (วัดทั้งก้อนทุกบรรทัด = ช้าแบบกำลังสอง: ชื่อรายการ 8,000 ตัวอักษรเคยใช้ 17 วินาที)"""
    n = 64
    while n < len(s):
        if measure(s[:n]) > room:
            return True
        n *= 2
    return measure(s) > room


def _fit(word, head, room, measure, thai_only=False):
    """จุดตัดในคำที่ยาวที่สุดที่ head+word[:k] ยังกว้างไม่เกิน room (ไม่มีเลย = 0)
    thai_only = ตัดได้เฉพาะจุดที่ติดตัวอักษรไทย (ไม่หั่นกลางตัวเลข/คำอังกฤษ)"""
    lim = 32                                    # ตัดหลังตัวที่ lim ไม่ได้แน่ ๆ (ส่วนหน้ายาว lim ก็เกินแล้ว)
    while lim < len(word) and measure(head + word[:lim]) <= room:
        lim *= 2
    cuts = [i for i in range(1, min(lim, len(word))) if can_break(word, i) and
            (not thai_only or _is_thai(word[i - 1]) or _is_thai(word[i]))]
    lo, hi, best = 0, len(cuts) - 1, -1
    while lo <= hi:
        mid = (lo + hi) // 2
        if measure(head + word[:cuts[mid]]) <= room:
            best, lo = mid, mid + 1
        else:
            hi = mid - 1
    if best < 0:
        return 0
    k = cuts[best]
    for j in range(best, -1, -1):               # ถอยไปหาจุดตัดที่สวยกว่า ถ้าไม่ทำให้บรรทัดสั้นลงเกินไป
        if cuts[j] < k * 0.6:
            break
        if _nice_break(word, cuts[j]):
            return cuts[j]
    return k


def wrap_text(text, width, measure, first=None, newlines=False):
    """ตัดข้อความเป็นบรรทัดที่กว้างไม่เกิน width (วัดด้วย measure) คืน list ของบรรทัด (อย่างน้อย 1 บรรทัด)
    first     = ความกว้างของบรรทัดแรก ถ้าไม่เท่าบรรทัดอื่น (มีป้ายนำหน้า) — บรรทัดต่อไปชิดซ้ายเต็มกว้าง
    newlines  = True ขึ้นบรรทัดใหม่ตาม \\n (ที่อยู่ ที่แอปแสดงเป็น <br>) · False ถือเป็นเว้นวรรคแบบหน้าเว็บ
    ตัดที่เว้นวรรคก่อนเสมอ · คำเดียวยาวเกินบรรทัดค่อยตัดกลางคำ เฉพาะจุดที่ can_break() ยอม"""
    out = []

    def room():
        return first if (first is not None and not out) else width

    text = '' if text is None else str(text)
    paras = text.replace('\r\n', '\n').replace('\r', '\n').split('\n') if newlines else [text]
    for para in paras:
        cur = ''
        for word in _WS.split(para):
            if not word:
                continue
            cand = (cur + ' ' + word) if cur else word
            if measure(cand) <= room():
                cur = cand
                continue
            fits_line = measure(word) <= width
            # บรรทัดแรกที่มีแค่ป้าย (เช่น "ที่อยู่ :") + ข้อความไทยติดกันยาว → ต่อท้ายป้ายเลยแบบเบราว์เซอร์
            # ไม่ปล่อยป้ายลอยอยู่บรรทัดเดียว (ตัวเลข/อังกฤษล้วน เช่นเลขภาษี ยังขึ้นบรรทัดใหม่ทั้งก้อน)
            label_only = not cur and room() < width and any(_is_thai(c) for c in word)
            if fits_line and not label_only:
                out.append(cur)                  # ทั้งคำไปบรรทัดใหม่ (บรรทัดแรกอาจเหลือแค่ป้าย)
                cur = word
                continue
            # คำเดียวยาวเกินบรรทัด → เติมบรรทัดปัจจุบันให้เต็มก่อน แล้วตัดกลางคำตรงจุดที่ตัดได้
            head = (cur + ' ') if cur else ''
            while word and _over(head + word, room(), measure):
                k = _fit(word, head, room(), measure, thai_only=fits_line)
                if k:
                    out.append(head + word[:k])
                    word, head = word[k:], ''
                elif head or room() < width:
                    out.append(head[:-1])        # head = cur + ' ' (ไม่ใช้ rstrip() — จะกิน NBSP ท้ายคำไปด้วย)
                    head = ''
                else:                            # พยางค์เดียวก็ยังกว้างเกิน — ยอมล้นแต่ไม่ตัดผิดที่
                    k = next((i for i in range(1, len(word)) if can_break(word, i)), len(word))
                    out.append(word[:k])
                    word = word[k:]
            cur = head + word
        out.append(cur)
    return out


# ------------------------------------------------------------------ วาดบิล (เลย์เอาต์เดียวกับ buildSheetNode ในแอป)
class Sheet(object):
    def __init__(self, pdf):
        self.pdf = pdf

    def font(self, style, size):
        if style == 'SB':
            self.pdf.set_font('PromptSB', '', size)
        else:
            self.pdf.set_font('Prompt', 'B' if style == 'B' else '', size)

    def put(self, x, y, w, h, s, style='', size=None, color=INK, align='L'):
        """ข้อความบรรทัดเดียว จัดกึ่งกลางแนวตั้งในกล่องสูง h (ตัวหนังสือเริ่มที่ x + c_margin)"""
        self.font(style, size)
        self.pdf.set_text_color(*color)
        self.pdf.set_xy(x, y)
        self.pdf.cell(w, h, s, align=align)

    def text_at(self, x, y, h, s, style='', size=None, color=INK):
        """ข้อความบรรทัดเดียวที่ตัวอักษรตัวแรกเริ่มตรง x พอดี (ไม่มีระยะ c_margin ของ cell)"""
        cm = self.pdf.c_margin
        self.put(x - cm, y, self.width(s, style, size) + cm * 2, h, s, style, size, color)

    def wrap(self, s, w, style='', size=None, first=None, newlines=False):
        """ตัดบรรทัดตามความกว้างตัวหนังสือจริง (วัดแบบจัดรูปอักษรไทยด้วย HarfBuzz)"""
        self.font(style, size)
        return wrap_text(s, w, self.pdf.get_string_width, first=first, newlines=newlines)

    def lines(self, w, s, style, size, newlines=False):
        """บรรทัดของข้อความในกล่องกว้าง w (หักระยะ c_margin สองข้างแบบ cell)"""
        return self.wrap(s, w - self.pdf.c_margin * 2, style, size, newlines=newlines)

    def draw_lines(self, x, y, w, lines, style='', size=None, color=INK, lh=None, align='L'):
        lh = lh or size * 1.5
        for i, t in enumerate(lines):
            if t:
                self.put(x, y + i * lh, w, lh, t, style, size, color, align)
        return len(lines) * lh

    def para(self, x, y, w, s, style='', size=None, color=INK, lh=None, align='L', newlines=False):
        """ข้อความหลายบรรทัดในกล่องกว้าง w ตัดบรรทัดด้วย wrap_text คืนความสูงที่ใช้"""
        return self.draw_lines(x, y, w, self.lines(w, s, style, size, newlines), style, size, color, lh, align)

    def width(self, s, style, size):
        self.font(style, size)
        return self.pdf.get_string_width(s)


A4_W, A4_H = 595.28, 841.89


def new_pdf(page_h=A4_H):
    """PDF เปล่าหน้ากว้าง A4 พร้อมฟอนต์ Prompt + จัดรูปอักษรไทย (ใช้วัดความกว้างตัวหนังสือในเทสต์ได้ด้วย)"""
    fpdf = load_fpdf()
    ensure_fonts()
    pdf = fpdf.FPDF(unit='pt', format=(A4_W, page_h))
    pdf.set_auto_page_break(False)
    pdf.set_margins(0, 0, 0)
    pdf.add_font('Prompt', '', os.path.join(FONT_DIR, FONTS['R']))
    pdf.add_font('Prompt', 'B', os.path.join(FONT_DIR, FONTS['B']))
    pdf.add_font('PromptSB', '', os.path.join(FONT_DIR, FONTS['SB']))
    pdf.set_text_shaping(True)          # HarfBuzz วางสระบน/ล่าง + วรรณยุกต์ไทยให้ถูกตำแหน่ง
    return pdf


def build_pdf(inv):
    load_fpdf()
    ensure_fonts()
    copies = ['ต้นฉบับ'] + (['สำเนา'] if want_copy() else [])

    def make(page_h):
        pdf = new_pdf(page_h)
        pdf.set_title('ใบเสร็จรับเงิน / ใบกำกับภาษี ' + str(inv.get('bill_no') or ''))
        pdf.set_creator('JJ Invoice · inv_nas_sync.py')
        # วันที่ในไฟล์ผูกกับข้อมูลบิล → บิลเดิมสร้างซ้ำได้ไฟล์เหมือนเดิมทุกไบต์ (ไม่ต้องเก็บฉบับซ้ำ)
        pdf.set_creation_date(bkk(inv.get('updated_at') or inv.get('issued_at')))
        end = 0
        for label in copies:
            pdf.add_page()
            end = max(end, draw_sheet(pdf, inv, label))
        return pdf, end

    pdf, end = make(A4_H)
    if end > A4_H - 10:
        # รายการเยอะจนล้น A4 — ขยายหน้าให้ยาวพอ ดีกว่าตัดยอดรวม/ลายเซ็นทิ้ง (พิมพ์แบบย่อให้พอดีหน้าได้)
        pdf, end = make(end + 32)
    return bytes(pdf.output())


def draw_sheet(pdf, inv, copy_label):
    S = Sheet(pdf)
    FS = P(12.5)                               # ขนาดตัวหนังสือหลักของบิล
    X0 = 5 / 25.4 * 72 + P(24)                 # ขอบซ้าย: 5 มม. + padding 24px ของแผ่นบิล
    Y0 = X0
    W = P(746)                                 # กว้างกรอบบิล (794 - 24*2)
    padx, pady = P(14), P(10)
    cancelled = (inv.get('status') == STATUS_CANCELLED)
    pdf.set_line_width(P(1))
    pdf.set_draw_color(*LINE)

    # ---------- ป้าย ต้นฉบับ/สำเนา มุมขวาบน ----------
    lab_w = S.width(copy_label, 'B', FS) + P(32)
    lab_h = FS * 1.5 + P(8)
    lab_x = X0 + W - padx - lab_w
    lab_y = Y0 + pady - P(2)
    pdf.rect(lab_x, lab_y, lab_w, lab_h)
    S.put(lab_x, lab_y, lab_w, lab_h, copy_label, 'B', FS, INK, 'C')
    y = lab_y + lab_h + P(6)

    # ---------- หัวบิล: ซ้าย = บริษัท / ขวา = เลขที่บิล + วันที่ ----------
    right_w = P(170)
    left_w = W - padx * 2 - right_w - P(8)
    xl = X0 + padx
    yl = y
    yl += S.para(xl, yl, left_w, '%s (%s)' % (SHOP['name'], SHOP['taxBranch']), 'B', P(15), RED, lh=P(15) * 1.5)
    lh = FS * 1.55
    yl += S.para(xl, yl, left_w, 'ที่อยู่ : ' + SHOP['address'], '', FS, MUTED, lh=lh)
    yl += S.para(xl, yl, left_w, 'เลขประจำตัวผู้เสียภาษีอากร : ' + SHOP['taxId'], '', FS, MUTED, lh=lh)
    xr = X0 + W - padx - right_w
    yr = y
    S.put(xr, yr, right_w, lh, 'เลขที่บิล', 'B', FS, RED, 'R'); yr += lh
    S.put(xr, yr, right_w, lh, str(inv.get('bill_no') or ''), '', FS, MUTED, 'R'); yr += lh + P(6)
    S.put(xr, yr, right_w, lh, 'วันที่', 'B', FS, RED, 'R'); yr += lh
    S.put(xr, yr, right_w, lh, fmt_date(inv.get('issued_at')), '', FS, MUTED, 'R'); yr += lh
    y = max(yl, yr) + pady

    # ---------- แถบชื่อเอกสาร ----------
    th = P(15) * 1.5 + P(16)
    pdf.set_fill_color(*RED)
    pdf.rect(X0, y, W, th, style='F')
    pdf.set_draw_color(*RED_EDGE)
    pdf.line(X0, y, X0 + W, y)
    pdf.line(X0, y + th, X0 + W, y + th)
    pdf.set_draw_color(*LINE)
    S.put(X0, y, W, th, 'ใบเสร็จรับเงิน / ใบกำกับภาษี', 'B', P(15), WHITE, 'C')
    y += th

    # ---------- ลูกค้า (ป้ายสีแดง + ข้อความต่อท้าย บรรทัดที่ล้นกลับไปชิดซ้ายแบบในเว็บ) ----------
    rows = [('ลูกค้า :', inv.get('customer_name') or '-', False)]
    if inv.get('phone'):
        rows.append(('เบอร์โทร :', str(inv.get('phone')), False))
    rows.append(('ที่อยู่ :', str(inv.get('address') or '-'), True))       # ขึ้นบรรทัดใหม่ตาม \n (<br> ในเว็บ)
    rows.append(('เลขประจำตัวผู้เสียภาษีอากร :', inv.get('tax_id') or '-', False))
    lhc = FS * 1.7
    cx0 = X0 + padx + pdf.c_margin              # ตำแหน่งเดิมของ write() — บิลธรรมดาหน้าตาเหมือนเดิมทุกพิกเซล
    cw_full = W - padx * 2 - pdf.c_margin * 2
    yc = y + P(8)
    for lbl, val, nl in rows:
        lw = S.width(lbl + ' ', 'B', FS)
        vl = S.wrap(str(val), cw_full, '', FS, first=cw_full - lw, newlines=nl)
        S.text_at(cx0, yc, lhc, lbl, 'B', FS, RED)
        for i, t in enumerate(vl):
            if t:
                S.text_at(cx0 + (lw if i == 0 else 0), yc, lhc, t, '', FS, INK)
            yc += lhc
    y = yc + P(8)
    pdf.line(X0, y, X0 + W, y)

    # ---------- ตารางรายการ ----------
    cw = [W * 0.09, W * 0.42, W * 0.13, W * 0.17, W * 0.19]
    heads = ['ลำดับ', 'รายการ', 'จำนวน', 'ราคา', 'จำนวนเงิน']
    hfs = P(12)
    hh = hfs * 1.5 + P(12)
    pdf.set_fill_color(*CREAM_HEAD)
    x = X0
    for i, h in enumerate(heads):
        pdf.rect(x, y, cw[i], hh, style='FD')
        S.put(x, y, cw[i], hh, h, 'B', hfs, RED_DARK, 'C')
        x += cw[i]
    y += hh
    items = inv.get('items') or []
    if isinstance(items, str):
        try:
            items = json.loads(items)
        except ValueError:
            items = []
    body = []
    for i, it in enumerate(items):
        it = it or {}
        price = num(it.get('price'))
        has_qty = num(it.get('qty')) > 0
        amt = num(it.get('qty')) * price if has_qty else price
        body.append([str(i + 1), str(it.get('name') or ''), fmt_qty(it.get('qty')) if has_qty else '',
                     fmt(price), fmt(round2(amt))])
    while len(body) < 6:
        body.append(['', '', '', '', ''])
    aligns = ['C', 'L', 'C', 'R', 'R']
    cpx, cpy = P(8), P(6)
    line_h = FS * 1.5
    for r in body:
        name_lines = S.lines(cw[1] - cpx * 2, r[1], '', FS) if r[1] else ['']
        rh = max(1, len(name_lines)) * line_h + cpy * 2
        x = X0
        for i, val in enumerate(r):
            pdf.line(x, y, x, y + rh)
            if val:
                if i == 1:
                    S.draw_lines(x + cpx, y + cpy, cw[i] - cpx * 2, name_lines, '', FS, INK, lh=line_h)
                else:
                    S.put(x + cpx, y, cw[i] - cpx * 2, rh, val, '', FS, INK, aligns[i])
            x += cw[i]
        pdf.line(x, y, x, y + rh)
        y += rh
    pdf.line(X0, y, X0 + W, y)

    # ---------- สรุปยอด ----------
    ys = y
    wl = W * 0.55
    wr = W - wl
    bx = X0 + padx
    bw = wl - padx * 2
    by = ys + P(8)
    bh = FS * 1.5 + P(14)
    pdf.set_fill_color(*CREAM)
    pdf.set_draw_color(*RED)
    pdf.rect(bx, by, bw, bh, style='FD')
    pdf.set_draw_color(*LINE)
    S.put(bx, by, bw, bh, baht_text(inv.get('grand_total')), 'SB', FS, RED_DARK, 'C')
    py = by + bh + P(8)
    pay_lbl = 'ชำระโดย'
    lw = S.width(pay_lbl, 'B', FS)
    S.put(bx, py, lw + 2, line_h, pay_lbl, 'B', FS, INK)
    box = P(14)
    cx = bx + lw + P(8)
    cy = py + (line_h - box) / 2
    pdf.rect(cx, cy, box, box)
    pdf.set_line_width(P(1.6))
    pdf.line(cx + box * 0.22, cy + box * 0.52, cx + box * 0.43, cy + box * 0.75)   # เครื่องหมายถูก
    pdf.line(cx + box * 0.43, cy + box * 0.75, cx + box * 0.80, cy + box * 0.25)
    pdf.set_line_width(P(1))
    # วิธีชำระยาว ๆ ตัดบรรทัดอยู่ในคอลัมน์ซ้ายหลังช่องติ๊ก (เดิมวิ่งเข้าไปใต้ตารางยอดรวมจนมองไม่เห็น)
    tx = cx + box + P(5)
    pay_w = bx + bw - tx
    pay_lines = S.lines(pay_w, str(inv.get('payment_method') or 'เงินสด / QR Payment'), '', FS)
    S.draw_lines(tx, py, pay_w, pay_lines, '', FS, INK, lh=line_h)
    ny = py + len(pay_lines) * line_h + P(6)
    nh = S.para(bx, ny, bw, '(ใบเสร็จรับเงินฉบับนี้จะสมบูรณ์ต่อเมื่อได้รับการชำระเงินเรียบร้อยแล้วเท่านั้น)',
                '', P(11), NOTE, lh=P(11) * 1.5)
    left_bottom = ny + nh + P(8)

    gross = num(inv.get('gross'))
    disc = num(inv.get('discount'))
    tot = [('รวมทั้งสิ้น', fmt(gross)), ('ส่วนลด', fmt(disc)), ('คงเหลือ', fmt(round2(gross - disc))),
           ('มูลค่าสุทธิ', fmt(inv.get('net'))), ('ภาษีมูลค่าเพิ่ม Vat 7 %', fmt(inv.get('vat'))),
           ('รวมเป็นเงินทั้งสิ้น', fmt(inv.get('grand_total')))]
    xr = X0 + wl
    vw = P(110)
    kw = wr - vw
    trh = FS * 1.5 + P(10)
    yt = ys
    for i, (k, v) in enumerate(tot):
        grand = (i == len(tot) - 1)
        pdf.set_fill_color(*(RED if grand else CREAM))
        pdf.rect(xr, yt, kw, trh, style='FD')
        pdf.set_fill_color(*(RED if grand else WHITE))
        pdf.rect(xr + kw, yt, vw, trh, style='FD')
        col = WHITE if grand else INK
        S.put(xr + P(10), yt, kw - P(20), trh, k, 'B' if grand else 'SB', FS, col)
        S.put(xr + kw + P(10), yt, vw - P(20), trh, v, 'B' if grand else '', FS, col, 'R')
        yt += trh
    y = max(left_bottom, yt)

    # ---------- ท้ายบิล: หมายเหตุ (ซ้าย) + ลายเซ็นผู้รับเงิน (ขวา) ----------
    pdf.line(X0, y, X0 + W, y)
    flw = W * 0.62
    frw = W - flw
    sig_h = P(52)
    cap_h = FS * 1.5 + P(4)
    foot_h = P(8) + sig_h + cap_h + P(8)
    sx = X0 + flw + padx
    sw = frw - padx * 2
    ly = y + P(8) + sig_h
    sig = find_signature()
    if sig:
        try:
            from PIL import Image
            with Image.open(sig) as im:
                iw, ih = im.size
            ih_pt = P(58)
            iw_pt = ih_pt * iw / float(ih)
            if iw_pt > sw * 0.96:
                iw_pt = sw * 0.96
                ih_pt = iw_pt * ih / float(iw)
            pdf.image(sig, x=sx + (sw - iw_pt) / 2, y=ly + P(6) - ih_pt, w=iw_pt, h=ih_pt)
        except Exception as e:
            log('ใส่ลายเซ็นไม่ได้ (%s) — ข้ามลายเซ็น' % e)
    pdf.line(sx, ly, sx + sw, ly)
    S.put(sx, ly + P(4), sw, FS * 1.5, 'ผู้รับเงิน / Collecter', '', FS, INK, 'C')
    ffs = P(10.5)
    ft = ('หากต้องการแก้ไขใบเสร็จรับเงินหรือใบกำกับภาษี กรุณาติดต่อทางบริษัทฯ ภายใน 1 วันทำการ '
          'นับจากวันได้รับเอกสาร หากพ้นกำหนด ทางบริษัทฯ จะไม่รับผิดชอบใดๆทั้งสิ้น')
    fl = S.lines(flw - padx * 2, ft, '', ffs)
    fth = len(fl) * ffs * 1.5
    S.draw_lines(X0 + padx, y + foot_h - P(8) - fth, flw - padx * 2, fl, '', ffs, MUTED, lh=ffs * 1.5)
    y += foot_h

    # ---------- กรอบนอก ----------
    pdf.set_draw_color(*LINE)
    pdf.set_line_width(P(1))
    pdf.rect(X0, Y0, W, y - Y0)

    # ---------- ตรา "ยกเลิก" (บิลที่ถูกยกเลิก) ----------
    if cancelled:
        cxs = X0 + W / 2
        cys = Y0 + (y - Y0) * 0.42 + P(36)
        S.font('B', P(72))

        def stamp():
            with pdf.rotation(18, x=cxs, y=cys):
                pdf.set_xy(cxs - P(260), cys - P(60))
                pdf.cell(P(520), P(120), 'ยกเลิก', align='C')
        try:
            with pdf.local_context(fill_opacity=0.28):
                pdf.set_text_color(*VOID)
                stamp()
        except Exception:
            pdf.set_text_color(236, 196, 196)
            stamp()
        pdf.set_text_color(*INK)
    return y


# ------------------------------------------------------------------ เก็บไฟล์
def safe_bill(bill_no):
    return re.match(BILL_RE, str(bill_no or '')) is not None


# โครงโฟลเดอร์ (เจ้าของสั่ง 2026-09-29): <สาขา>/<MMYYYY>/<เลขบิล>.pdf  เช่น JJRD/092026/JJRD1244.pdf
#   บิลยกเลิก → <สาขา>/<MMYYYY>/ยกเลิก/<เลขบิล>.pdf · ชื่อไฟล์ = เลขบิล จึงเรียงตามเลขบิลเอง
#   แก้ไข = เขียนทับใบเดิม · ยกเลิก/เรียกคืน = ลบใบเดิมทิ้งแล้วเก็บใบใหม่อีกฝั่ง → 1 บิล มีไฟล์เดียวเสมอ
CANCEL_DIR = 'ยกเลิก'
BRANCH_OTHER = 'อื่นๆ'
MMYYYY_RE = r'^[0-9]{6}$'
OLD_MONTH_RE = r'^[0-9]{4}-[0-9]{2}$'       # โครงเก่า (ก่อน 2026-09-29): YYYY-MM/<เลขบิล>.pdf
OLD_VERSIONS_DIR = '_ฉบับก่อนหน้า'          # โครงเก่าเก็บฉบับก่อนหน้าไว้ที่นี่ — ตอนนี้ลบทิ้งตามเจ้าของสั่ง


def bill_branch(bill_no):
    m = re.match(r'[A-Za-z]+', str(bill_no or ''))
    return m.group(0).upper() if m else BRANCH_OTHER


def mmyyyy_of(iso):
    return bkk(iso).strftime('%m%Y')


def bill_parts(bill_no, iso, cancelled):
    return [bill_branch(bill_no), mmyyyy_of(iso)] + ([CANCEL_DIR] if cancelled else [])


# ทุกการเปิด/เขียน/ลบ ทำผ่าน "ที่จับโฟลเดอร์" (dir fd) ที่เปิดทีละชั้นแบบห้ามเป็นลิงก์ลัด (O_NOFOLLOW)
# สคริปต์รันด้วย root แต่โฟลเดอร์เก็บบิลถูก map ไว้ที่เครื่องพนักงาน — ถ้าเช็คด้วยชื่อ path แล้วค่อยลงมือทีหลัง
# คนที่สลับโฟลเดอร์เป็นลิงก์ลัดได้ทันเวลาจะพา root ไปเขียน/ลบไฟล์นอกโฟลเดอร์ได้ ทำแบบนี้แล้วปิดช่องนั้น
_DIRFLAGS = os.O_RDONLY | getattr(os, 'O_DIRECTORY', 0) | getattr(os, 'O_NOFOLLOW', 0)
_NOFOLLOW = getattr(os, 'O_NOFOLLOW', 0)


def _sub(dfd, name, create=False):
    """เปิดโฟลเดอร์ย่อย name ใต้ dfd (สร้างให้ถ้า create) — ลิงก์ลัด/ไม่ใช่โฟลเดอร์ = OSError"""
    if create:
        try:
            os.mkdir(name, 0o775, dir_fd=dfd)
        except FileExistsError:
            pass
    return os.open(name, _DIRFLAGS, dir_fd=dfd)


def _sub_or_none(dfd, name):
    try:
        return _sub(dfd, name)
    except OSError:
        return None


def remove_other_copies(bfd, bill_no, keep_parts):
    """1 บิล = 1 ไฟล์ — ลบ <เลขบิล>.pdf ที่อยู่ที่อื่นทิ้งหลังเก็บใบใหม่แล้ว (bfd = ที่จับโฟลเดอร์เก็บบิล):
    · ใบเดิมอีกฝั่งของโฟลเดอร์ ยกเลิก (บิลเพิ่งถูกยกเลิก หรือเพิ่งเรียกคืน)
    · เดือนอื่นของสาขาเดียวกัน (ปุ่มแก้เลขชนในแอป: บิลของแอปย้ายเลขออก บิลระบบเดิมเลขนั้นคนละเดือนเข้ามาแทน)
    · โครงเก่า YYYY-MM/ และฉบับที่เคยเก็บไว้ใน _ฉบับก่อนหน้า (ย้ายมาโครงใหม่ ไม่ต้องมีของซ้ำ)
    ลบเฉพาะไฟล์ชื่อตรงเลขบิลเป๊ะ ในโฟลเดอร์ตามโครงเท่านั้น · ไม่เดินตามลิงก์ลัด · โฟลเดอร์ที่ว่างแล้วลบทิ้ง"""
    name = bill_no + '.pdf'
    keep = tuple(keep_parts)
    br = bill_branch(bill_no)

    def unlink(dfd, fname, shown):
        try:
            st = os.lstat(fname, dir_fd=dfd)
        except OSError:
            return
        if stat.S_ISDIR(st.st_mode):
            return
        try:
            os.unlink(fname, dir_fd=dfd)   # ถ้าเป็นลิงก์ลัด ลบแค่ตัวลิงก์ ไม่แตะไฟล์ปลายทาง
            log('ลบไฟล์เดิม %s' % shown)
        except OSError as e:
            log('ลบไฟล์เดิม %s ไม่ได้: %s' % (shown, e))

    def rmdir(dfd, dname):
        try:
            os.rmdir(dname, dir_fd=dfd)    # ลบได้เฉพาะโฟลเดอร์ที่ว่างแล้ว
        except OSError:
            pass

    b = _sub_or_none(bfd, br)
    if b is not None:
        try:
            for mm in os.listdir(b):
                if not re.match(MMYYYY_RE, mm):
                    continue
                mfd = _sub_or_none(b, mm)
                if mfd is None:
                    continue
                try:
                    if (br, mm) != keep:
                        unlink(mfd, name, '%s/%s/%s' % (br, mm, name))
                    cfd = _sub_or_none(mfd, CANCEL_DIR)
                    if cfd is not None:
                        try:
                            if (br, mm, CANCEL_DIR) != keep:
                                unlink(cfd, name, '%s/%s/%s/%s' % (br, mm, CANCEL_DIR, name))
                        finally:
                            os.close(cfd)
                        rmdir(mfd, CANCEL_DIR)
                finally:
                    os.close(mfd)
        finally:
            os.close(b)
    for top in os.listdir(bfd):
        if not re.match(OLD_MONTH_RE, top):
            continue
        ofd = _sub_or_none(bfd, top)
        if ofd is None:
            continue
        try:
            unlink(ofd, name, '%s/%s' % (top, name))
            vfd = _sub_or_none(ofd, OLD_VERSIONS_DIR)
            if vfd is not None:
                try:
                    for f in os.listdir(vfd):
                        if f.startswith(bill_no + '.') and f.endswith('.pdf'):
                            unlink(vfd, f, '%s/%s/%s' % (top, OLD_VERSIONS_DIR, f))
                finally:
                    os.close(vfd)
                rmdir(ofd, OLD_VERSIONS_DIR)
        finally:
            os.close(ofd)
        rmdir(bfd, top)


def write_pdf(bill_no, iso, data, cancelled=False):
    if not safe_bill(bill_no):
        raise RuntimeError('เลขบิลผิดรูปแบบ')
    base = os.path.realpath(base_dir())
    parts = bill_parts(bill_no, iso, cancelled)
    name = bill_no + '.pdf'
    rel = '/'.join(parts + [name])
    fds = [os.open(base, _DIRFLAGS)]
    try:
        for p in parts:
            try:
                fds.append(_sub(fds[-1], p, create=True))
            except OSError:
                raise RuntimeError('โฟลเดอร์ %s เป็นลิงก์ลัดหรือไม่ใช่โฟลเดอร์ — ไม่เขียนเพื่อความปลอดภัย' % '/'.join(parts))
        fd = fds[-1]
        same = False
        try:
            if stat.S_ISREG(os.lstat(name, dir_fd=fd).st_mode):
                with os.fdopen(os.open(name, os.O_RDONLY | _NOFOLLOW, dir_fd=fd), 'rb') as f:
                    same = (f.read() == data)  # ไฟล์เดิมเหมือนกันทุกไบต์ — ไม่ต้องเขียนซ้ำ
        except FileNotFoundError:
            pass
        if not same:
            tmp = name + '.part'
            try:
                os.unlink(tmp, dir_fd=fd)      # ลบของค้าง (ถ้าเป็นลิงก์ลัดก็ลบแค่ตัวลิงก์)
            except FileNotFoundError:
                pass
            wfd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL | _NOFOLLOW, 0o664, dir_fd=fd)
            with os.fdopen(wfd, 'wb') as f:
                f.write(data)
            # ใบใหม่แทนใบเดิม — เขียนเสร็จทั้งไฟล์ก่อนค่อยสลับชื่อ ไม่มีไฟล์ครึ่ง ๆ ค้าง
            os.replace(tmp, name, src_dir_fd=fd, dst_dir_fd=fd)
        remove_other_copies(fds[0], bill_no, parts)
    finally:
        for x in reversed(fds):
            os.close(x)
    return rel


OLD_PATH_FILTER = 'nas_path=match.' + q('^[0-9]{4}-[0-9]{2}/')


def requeue_old_layout():
    """บิลที่เคยเก็บแบบโครงเก่า (nas_path = YYYY-MM/...) → ส่งกลับเข้าคิว ให้สร้างในโครงใหม่แล้วลบไฟล์เดิมทิ้ง
    อ่านดูก่อน มีจริงค่อยแก้ — รอบปกติที่ไม่มีอะไรต้องย้าย จะไม่เขียนอะไรลงฐานข้อมูล"""
    if not sb_req('GET', '/rest/v1/inv_invoices?select=bill_no&limit=1&' + OLD_PATH_FILTER):
        return 0
    rows = sb_req('PATCH', '/rest/v1/inv_invoices?select=bill_no&' + OLD_PATH_FILTER,
                  {'nas_path': None}, prefer='return=representation') or []
    if rows:
        log('ย้ายไปโครงโฟลเดอร์ใหม่ (สาขา/เดือนปี): ส่ง %d ใบกลับเข้าคิว' % len(rows))
    return len(rows)


def process(inv, force=False):
    bill = inv.get('bill_no')
    if not safe_bill(bill):
        log('ข้าม — เลขบิลผิดรูปแบบ: %r' % bill)
        return False
    data = build_pdf(inv)
    rel = write_pdf(bill, inv.get('issued_at'), data, cancelled=inv.get('status') == STATUS_CANCELLED)
    if mark_saved(inv, rel, force=force):
        log('เก็บ %s (%d KB)%s' % (rel, len(data) // 1024 + 1,
                                   ' · ยกเลิก' if inv.get('status') == STATUS_CANCELLED else ''))
        return True
    # บิลถูกแก้ระหว่างที่กำลังสร้างไฟล์ (หรือคอมที่ผูกโฟลเดอร์เพิ่งเก็บฉบับใหม่ไป แล้วเราเขียนฉบับเก่าทับ)
    # → ส่งกลับเข้าคิว รอบหน้าสร้างใหม่จากข้อมูลล่าสุดทับให้ ไฟล์ใน NAS จะไม่ค้างเป็นฉบับเก่า
    requeue(bill)
    log('เขียน %s แล้ว แต่บิลถูกแก้ระหว่างทาง — รอบหน้าจะสร้างใหม่จากข้อมูลล่าสุด' % rel)
    return False


# ------------------------------------------------------------------ คำสั่ง
def sample_invoice(status='ออกแล้ว', bill='TEST0001'):
    return {
        'bill_no': bill, 'issued_at': now_iso(), 'status': status,
        'customer_name': 'บริษัท ทดสอบระบบ จำกัด (สำนักงานใหญ่)', 'tax_id': '0105566172139',
        'phone': '0812345678',
        'address': '99/9 ถนนตัวอย่าง แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
        'items': [{'name': 'อาหารและเครื่องดื่ม', 'qty': '', 'price': 1070},
                  {'name': 'หมูกระทะบุฟเฟ่ต์ (ผู้ใหญ่) ที่นั่งริมหน้าต่าง น้ำจิ้มสุกี้สูตรพิเศษ', 'qty': 4, 'price': 299},
                  {'name': 'น้ำอัดลม', 'qty': 2, 'price': 30}],
        'gross': 2326, 'discount': 26, 'net': 2149.53, 'vat': 150.47, 'grand_total': 2300,
        'payment_method': 'เงินสด / QR Payment',
    }


def cmd_test():
    if not os.path.isdir(base_dir()):
        log('ไม่พบโฟลเดอร์เก็บบิล %s — เช็ค --base หรือ BASE_DIR' % base_dir())
        return 1
    folder = os.path.join(base_dir(), '_test')
    os.makedirs(folder, exist_ok=True)
    for inv, name in ((sample_invoice(), 'TEST0001.pdf'),
                      (sample_invoice(STATUS_CANCELLED, 'TEST0002'), 'TEST0002-ยกเลิก.pdf')):
        with open(os.path.join(folder, name), 'wb') as f:
            f.write(build_pdf(inv))
    log('สร้างบิลตัวอย่างแล้วที่ %s — เปิดดูว่าตัวหนังสือไทยถูกต้อง' % folder)
    return 0


def cmd_check():
    ok = True

    def row(good, text):
        log(('[ผ่าน] ' if good else '[ยังไม่พร้อม] ') + text)
        return good

    row(sys.version_info >= (3, 8), 'Python %s (%s)' % (platform.python_version(), platform.machine()))
    try:
        fpdf = load_fpdf()
        import uharfbuzz
        row(True, 'ไลบรารี fpdf2 %s + uharfbuzz %s' % (getattr(fpdf, '__version__', '?'),
                                                      getattr(uharfbuzz, '__version__', '?')))
    except Exception as e:
        ok = row(False, str(e)) and ok
    try:
        ensure_fonts()
        row(True, 'ฟอนต์ Prompt ครบ (%s)' % FONT_DIR)
    except Exception as e:
        ok = row(False, str(e)) and ok
    bd = base_dir()
    log('[ข้อมูล] โฟลเดอร์เก็บบิลที่ใช้: %s (%s)' % (bd, base_source()))
    if not os.path.isdir(bd):
        ok = row(False, 'ไม่พบโฟลเดอร์เก็บบิล %s — เช็ค --base "<โฟลเดอร์>" ในคำสั่ง' % bd) and ok
    else:
        try:
            t = os.path.join(bd, '.inv_nas_sync_write_test')
            with open(t, 'w') as f:
                f.write('ok')
            os.remove(t)
            row(True, 'โฟลเดอร์เก็บบิล %s (เขียนได้)' % bd)
        except Exception as e:
            ok = row(False, 'เขียนโฟลเดอร์ %s ไม่ได้ (%s) — ตั้ง Task ให้รันด้วย user root' % (bd, e)) and ok
        rb = os.path.realpath(bd)
        if os.path.realpath(HERE) == rb or os.path.realpath(HERE).startswith(rb.rstrip(os.sep) + os.sep):
            log('[คำแนะนำ] สคริปต์อยู่ในโฟลเดอร์เก็บบิล — แนะนำย้ายไปโฟลเดอร์แชร์ที่เฉพาะ administrators '
                'เข้าได้ (เช่น /volume1/scripts/inv_sync) แล้วรันด้วย --base (ดูวิธีที่หัวไฟล์นี้)')
    try:
        n = len(fetch_pending(1000))
        row(True, 'ต่อ Supabase ได้ — บิลรอเก็บไฟล์ %d ใบ' % n)
    except Exception as e:
        ok = row(False, str(e)) and ok
    if WITH_COPY is not None:
        log('[ข้อมูล] หน้าสำเนา: %s (บังคับไว้ที่ WITH_COPY)' % ('แนบ' if WITH_COPY else 'ไม่แนบ'))
    else:
        log('[ข้อมูล] หน้าสำเนา: %s (ตามสวิตช์ "แนบหน้า สำเนา" ในแอป)' % ('แนบ' if want_copy() else 'ไม่แนบ'))
    sig = find_signature()
    log(('[ผ่าน] ลายเซ็น %s' % os.path.basename(sig)) if sig else
        '[ไม่บังคับ] ไม่มี signature.png ในโฟลเดอร์นี้ — บิลจะเว้นช่องให้เซ็นเอง')
    log('พร้อมใช้งาน ✅ — ตั้ง Task Scheduler ให้รันทุก 5 นาทีได้เลย' if ok else
        'ยังไม่พร้อม — แก้ข้อที่ขึ้น [ยังไม่พร้อม] ก่อน')
    return 0 if ok else 1


def cmd_install():
    import importlib
    py = sys.version_info
    arch = platform.machine().lower()
    log('ติดตั้งไลบรารีสร้าง PDF · Python %s · %s' % (platform.python_version(), arch))
    if py < (3, 8):
        log('Python เก่าเกินไป (ต้อง 3.8 ขึ้นไป) — ติดตั้ง Python 3 จาก Package Center ก่อน')
        return 1
    if arch.startswith('armv7') or arch in ('armv6l', 'armhf', 'ppc', 'ppc64'):
        log('คำเตือน: NAS รุ่นนี้เป็นชิป %s ไลบรารีบางตัวอาจไม่มีไฟล์สำเร็จรูป — ถ้าติดตั้งไม่ผ่าน '
            'ให้ใช้วิธีเลือกโฟลเดอร์ NAS บนคอมแทน' % arch)

    def pip_ok():
        return subprocess.call([sys.executable, '-m', 'pip', '--version'],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0

    if not pip_ok():
        log('ยังไม่มี pip — กำลังติดตั้ง')
        subprocess.call([sys.executable, '-m', 'ensurepip', '--user'],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if not pip_ok():
        gp = os.path.join(HERE, '_get-pip.py')
        for url in ('https://bootstrap.pypa.io/pip/%d.%d/get-pip.py' % (py[0], py[1]),
                    'https://bootstrap.pypa.io/get-pip.py'):
            try:
                with urllib.request.urlopen(url, timeout=60) as r, open(gp, 'wb') as f:
                    f.write(r.read())
            except Exception:
                continue
            if subprocess.call([sys.executable, gp, '--user']) == 0 and pip_ok():
                break
        try:
            os.remove(gp)
        except OSError:
            pass
    if not pip_ok():
        log('ติดตั้ง pip ไม่สำเร็จ — ส่งไฟล์ inv_nas_sync.log นี้ให้ผู้ดูแลดู')
        return 1

    os.makedirs(LIB_DIR, exist_ok=True)
    cmd = [sys.executable, '-m', 'pip', 'install', '--disable-pip-version-check', '--no-warn-script-location',
           '--upgrade', '--prefer-binary', '--target', LIB_DIR, 'fpdf2', 'uharfbuzz']
    log('กำลังดาวน์โหลดไลบรารี (1-3 นาที)...')
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True)
    tail = [l for l in (p.stdout or '').splitlines() if l.strip()][-12:]
    for l in tail:
        log('  pip: ' + l)
    if p.returncode != 0:
        log('ติดตั้งไลบรารีไม่สำเร็จ (ดูข้อความ pip ข้างบน)')
        return 1
    if LIB_DIR not in sys.path:
        sys.path.insert(0, LIB_DIR)
    importlib.invalidate_caches()
    return cmd_check()


def run_sync():
    try:
        load_fpdf()
    except Exception as e:
        log(str(e))
        heartbeat('ผิดพลาด: ' + str(e))
        return 1
    t0 = time.time()
    try:
        requeue_old_layout()
    except Exception as e:
        log('ส่งบิลโครงเก่ากลับเข้าคิวไม่ได้: %s' % e)
    try:
        rows = fetch_pending(MAX_PER_RUN)
    except Exception as e:
        log('ดึงรายการบิลไม่ได้: %s' % e)
        heartbeat('ผิดพลาด: ดึงรายการบิลไม่ได้')
        return 1
    done = fail = 0
    last_err = ''
    for inv in rows:
        try:
            if process(inv):
                done += 1
        except Exception as e:
            fail += 1
            last_err = str(e)
            log('ผิดพลาดที่บิล %s: %s' % (inv.get('bill_no'), e))
    left = None
    try:
        left = len(fetch_pending(1000))
    except Exception:
        pass
    parts = []
    if done:
        parts.append('รอบล่าสุดเก็บ %d ใบ' % done)
    if fail:
        parts.append('ผิดพลาด %d ใบ (%s)' % (fail, last_err[:120]))
    if left is not None:
        parts.append(('ค้างอีก %d ใบ' % left) if left else 'เก็บครบแล้ว')
    info = ' · '.join(parts) or 'ทำงานปกติ'
    heartbeat(('ผิดพลาด: ' + info) if fail and not done else info)
    if done or fail:
        log('%s (%.1f วินาที)' % (info, time.time() - t0))
    return 1 if fail else 0


def main(argv):
    try:
        base, argv = take_base_arg(list(argv))
    except ValueError as e:
        log(str(e))
        return 1
    _OPT['base'] = base
    _RUN['copy'] = None                  # อ่านสวิตช์หน้าสำเนาจากแอปใหม่ทุกรอบ (รอบละครั้ง)
    try:
        return _main(argv)
    finally:
        _OPT['base'] = None


def _main(argv):
    if '--install' in argv:
        return cmd_install()
    if '--check' in argv:
        return cmd_check()
    if '--test' in argv:
        try:
            return cmd_test()
        except Exception as e:
            log('สร้างบิลตัวอย่างไม่ได้: %s' % e)
            return 1
    if not os.path.isdir(base_dir()):
        log('ไม่พบโฟลเดอร์เก็บบิล %s — ใส่ --base "<โฟลเดอร์เก็บบิล>" ในคำสั่ง '
            '(หรือวางสคริปต์ไว้ในโฟลเดอร์ _sync ของโฟลเดอร์เก็บบิล)' % base_dir())
        return 1
    if '--force' in argv:
        i = argv.index('--force')
        bill = argv[i + 1] if len(argv) > i + 1 else ''
        inv = fetch_one(bill) if safe_bill(bill) else None
        if not inv:
            log('ไม่พบบิล %s' % bill)
            return 1
        return 0 if process(inv, force=True) else 1

    # กันรอบซ้อนกัน (ถ้ารอบก่อนยังไม่เสร็จใน 5 นาที)
    lockf = open(LOCK_FILE, 'w')
    try:
        import fcntl
        fcntl.flock(lockf, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except ImportError:
        pass
    except (IOError, OSError):
        return 0
    try:
        return run_sync()
    finally:
        lockf.close()


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
