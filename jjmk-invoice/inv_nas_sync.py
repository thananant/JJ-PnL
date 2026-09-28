#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
inv_nas_sync.py — ตัวเก็บไฟล์ PDF ใบกำกับภาษีลง NAS (จริงใจหมูกระทะ)
=========================================================================
รันบน Synology ผ่าน Task Scheduler ทุก 5 นาที (แบบเดียวกับสคริปต์สำรองข้อมูลของ P&L)
NAS เป็นฝ่าย "ดึง" ข้อมูลบิลที่ยังไม่มีไฟล์จาก Supabase มาสร้าง PDF เก็บเอง
  → ไม่ต้องเปิดพอร์ต / ไม่ต้องทำ DDNS / ไม่ต้องตั้งอะไรในเครื่องที่ใช้ออกบิล
  → ออกบิลจากมือถือหรือเครื่องไหนก็ได้ ไฟล์เข้า NAS ภายใน 5 นาที
  → บิลที่ถูกแก้ไข / ยกเลิก / เรียกคืน แอปจะสั่งให้ NAS สร้างไฟล์ใหม่ทับให้เอง
  → Supabase เก็บแค่ตัวหนังสือ ไม่มีไฟล์ใด ๆ ขึ้นไป

วิธีติดตั้ง (ทำครั้งเดียว — ขั้นตอนละเอียดอยู่ในหน้า ⚙ ตั้งค่า ของแอปใบกำกับภาษี)
  1) สร้างโฟลเดอร์ย่อยชื่อ _sync ในโฟลเดอร์เก็บบิล แล้ววางไฟล์นี้ลงไป
       เช่น  /volume1/Tax invoice/_sync/inv_nas_sync.py
     (ถ้ามีลายเซ็น วาง signature.png ไว้ในโฟลเดอร์ _sync เดียวกัน)
  2) Task Scheduler → User-defined script (user: root) รันครั้งเดียว:
       python3 "/volume1/Tax invoice/_sync/inv_nas_sync.py" --install
     แล้วเปิดไฟล์ _sync/inv_nas_sync.log ต้องเห็นบรรทัด "พร้อมใช้งาน"
  3) Task Scheduler → User-defined script (user: root) ทุกวัน ทุก 5 นาที:
       python3 "/volume1/Tax invoice/_sync/inv_nas_sync.py"

คำสั่งเสริม
  --install        ติดตั้งไลบรารีสร้าง PDF (fpdf2 + uharfbuzz) ลงโฟลเดอร์ _lib ข้างไฟล์นี้
  --check          ตรวจความพร้อมทุกข้อ (Python / ไลบรารี / ฟอนต์ / โฟลเดอร์ / Supabase / ลายเซ็น)
  --test           สร้างบิลตัวอย่างลงโฟลเดอร์ _test (ไม่แตะข้อมูลจริง) ไว้เปิดดูว่าตัวหนังสือไทยถูกต้อง
  --force JJRD1006 สร้างไฟล์บิลใบนั้นใหม่ทันที

ที่มาของไฟล์: https://github.com/thananant/JJ-PnL/blob/main/jjmk-invoice/inv_nas_sync.py
"""
import os
import sys
import re
import json
import time
import datetime
import platform
import subprocess
import urllib.request
import urllib.parse
import urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
LIB_DIR = os.path.join(HERE, '_lib')
if os.path.isdir(LIB_DIR):
    sys.path.insert(0, LIB_DIR)

# ====================== ตั้งค่า (ปกติไม่ต้องแก้) ======================
# โฟลเดอร์เก็บบิล · เว้นว่าง = ถ้าไฟล์นี้อยู่ในโฟลเดอร์ที่ชื่อขึ้นต้นด้วย _ (เช่น _sync)
# จะเก็บลงโฟลเดอร์แม่ของมัน ไม่งั้นเก็บลงโฟลเดอร์เดียวกับไฟล์นี้
# สคริปต์แยกโฟลเดอร์รายเดือนให้เอง เช่น 2026-09/JJRD1006.pdf (เหมือนที่แอปเก็บ)
BASE_DIR = ''
WITH_COPY = False        # True = แนบหน้า "สำเนา" ต่อท้ายทุกไฟล์ (หน้าแรกเป็นต้นฉบับเสมอ)
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


def base_dir():
    if BASE_DIR:
        return BASE_DIR
    if os.path.basename(HERE).startswith('_'):
        return os.path.dirname(HERE)
    return HERE


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


def fetch_pending(limit):
    return sb_req('GET', '/rest/v1/inv_invoices?select=*&nas_path=is.null'
                         '&order=issued_at.asc&limit=%d' % limit) or []


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


def round2(n):
    return round(num(n) + 1e-9, 2)


def fmt(n):
    return '{:,.2f}'.format(round2(n))


def fmt_qty(v):
    f = num(v)
    return str(int(f)) if f == int(f) else ('%g' % f)


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
    v = round2(v)
    b = int(v)
    sa = int(round((v - b) * 100))
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
        """ข้อความบรรทัดเดียว จัดกึ่งกลางแนวตั้งในกล่องสูง h"""
        self.font(style, size)
        self.pdf.set_text_color(*color)
        self.pdf.set_xy(x, y)
        self.pdf.cell(w, h, s, align=align)

    def lines(self, w, s, style, size):
        from fpdf.enums import MethodReturnValue
        self.font(style, size)
        out = self.pdf.multi_cell(w, size * 1.5, s, dry_run=True, output=MethodReturnValue.LINES)
        return out or ['']

    def para(self, x, y, w, s, style='', size=None, color=INK, lh=None, align='L'):
        """ข้อความหลายบรรทัด ตัดบรรทัดเอง คืนความสูงที่ใช้"""
        self.font(style, size)
        self.pdf.set_text_color(*color)
        self.pdf.set_xy(x, y)
        self.pdf.multi_cell(w, lh or size * 1.5, s, align=align)
        return self.pdf.get_y() - y

    def width(self, s, style, size):
        self.font(style, size)
        return self.pdf.get_string_width(s)


def build_pdf(inv):
    fpdf = load_fpdf()
    ensure_fonts()
    pdf = fpdf.FPDF(unit='pt', format='A4')
    pdf.set_auto_page_break(False)
    pdf.set_margins(0, 0, 0)
    pdf.add_font('Prompt', '', os.path.join(FONT_DIR, FONTS['R']))
    pdf.add_font('Prompt', 'B', os.path.join(FONT_DIR, FONTS['B']))
    pdf.add_font('PromptSB', '', os.path.join(FONT_DIR, FONTS['SB']))
    pdf.set_text_shaping(True)          # HarfBuzz วางสระบน/ล่าง + วรรณยุกต์ไทยให้ถูกตำแหน่ง
    pdf.set_title('ใบเสร็จรับเงิน / ใบกำกับภาษี ' + str(inv.get('bill_no') or ''))
    pdf.set_creator('JJ Invoice · inv_nas_sync.py')
    copies = ['ต้นฉบับ'] + (['สำเนา'] if WITH_COPY else [])
    for label in copies:
        pdf.add_page()
        draw_sheet(pdf, inv, label)
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

    # ---------- ลูกค้า (ป้ายสีแดง + ข้อความต่อท้าย ตัดบรรทัดแบบในเว็บ) ----------
    rows = [('ลูกค้า :', inv.get('customer_name') or '-')]
    if inv.get('phone'):
        rows.append(('เบอร์โทร :', str(inv.get('phone'))))
    rows.append(('ที่อยู่ :', str(inv.get('address') or '-').replace('\r', '')))
    rows.append(('เลขประจำตัวผู้เสียภาษีอากร :', inv.get('tax_id') or '-'))
    lhc = FS * 1.7
    pdf.set_left_margin(X0 + padx)
    pdf.set_right_margin(pdf.w - (X0 + W - padx))
    pdf.set_xy(X0 + padx, y + P(8))
    for lbl, val in rows:
        S.font('B', FS); pdf.set_text_color(*RED)
        pdf.write(lhc, lbl + ' ')
        S.font('', FS); pdf.set_text_color(*INK)
        pdf.write(lhc, str(val))
        pdf.ln(lhc)
    y = pdf.get_y() + P(8)
    pdf.set_margins(0, 0, 0)
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
                    S.para(x + cpx, y + cpy, cw[i] - cpx * 2, val, '', FS, INK, lh=line_h)
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
    S.put(cx + box + P(5), py, bw - lw - box - P(14), line_h,
          str(inv.get('payment_method') or 'เงินสด / QR Payment'), '', FS, INK)
    ny = py + line_h + P(6)
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
    S.para(X0 + padx, y + foot_h - P(8) - fth, flw - padx * 2, ft, '', ffs, MUTED, lh=ffs * 1.5)
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


# ------------------------------------------------------------------ เก็บไฟล์
def safe_bill(bill_no):
    return re.match(r'^[A-Za-z0-9_-]{1,32}$', str(bill_no or '')) is not None


def write_pdf(bill_no, iso, data):
    ym = ym_of(iso)
    folder = os.path.join(base_dir(), ym)
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, bill_no + '.pdf')
    tmp = path + '.part'
    with open(tmp, 'wb') as f:
        f.write(data)
    os.replace(tmp, path)          # เขียนเสร็จทั้งไฟล์ก่อนค่อยสลับชื่อ — ไม่มีไฟล์ครึ่ง ๆ ค้างใน NAS
    return ym + '/' + bill_no + '.pdf'


def process(inv, force=False):
    bill = inv.get('bill_no')
    if not safe_bill(bill):
        log('ข้าม — เลขบิลผิดรูปแบบ: %r' % bill)
        return False
    data = build_pdf(inv)
    rel = write_pdf(bill, inv.get('issued_at'), data)
    if mark_saved(inv, rel, force=force):
        log('เก็บ %s (%d KB)%s' % (rel, len(data) // 1024 + 1,
                                   ' · ยกเลิก' if inv.get('status') == STATUS_CANCELLED else ''))
        return True
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
    if not os.path.isdir(bd):
        ok = row(False, 'ไม่พบโฟลเดอร์เก็บบิล %s' % bd) and ok
    else:
        try:
            t = os.path.join(bd, '.inv_nas_sync_write_test')
            with open(t, 'w') as f:
                f.write('ok')
            os.remove(t)
            row(True, 'โฟลเดอร์เก็บบิล %s (เขียนได้)' % bd)
        except Exception as e:
            ok = row(False, 'เขียนโฟลเดอร์ %s ไม่ได้ (%s) — ตั้ง Task ให้รันด้วย user root' % (bd, e)) and ok
    try:
        n = len(fetch_pending(1000))
        row(True, 'ต่อ Supabase ได้ — บิลรอเก็บไฟล์ %d ใบ' % n)
    except Exception as e:
        ok = row(False, str(e)) and ok
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
        log('ไม่พบโฟลเดอร์เก็บบิล %s — วางสคริปต์ไว้ในโฟลเดอร์ _sync ของโฟลเดอร์เก็บบิล' % base_dir())
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
