#!/usr/bin/env python3
# Sinh logo BTMH (monogram maroon #7C0312 + chữ gold #C8A951) — tenant logo Fider.
# Sinh xác định trên VPS để tránh lỗi truyền base64. Cần Pillow.
# Dùng: python3 gen-logo.py <đường-dẫn-xuất.png>
import sys
from PIL import Image, ImageDraw, ImageFont
import glob

out = sys.argv[1] if len(sys.argv) > 1 else "logo.png"
S = 256
img = Image.new("RGB", (S, S), (124, 3, 18))
d = ImageDraw.Draw(img)
gold = (200, 169, 81)
d.rounded_rectangle([13, 13, S - 13, S - 13], radius=34, outline=gold, width=4)

cands = (glob.glob("/usr/share/fonts/**/DejaVuSans-Bold.ttf", recursive=True)
         + glob.glob("/usr/share/fonts/**/*Bold*.ttf", recursive=True))
txt = "BTMH"
target = S - 2 * 44
sz = 20
fp = cands[0] if cands else None
if fp:
    while True:
        f = ImageFont.truetype(fp, sz)
        bb = d.textbbox((0, 0), txt, font=f)
        if bb[2] - bb[0] >= target or sz > 200:
            break
        sz += 2
    f = ImageFont.truetype(fp, sz - 2)
else:
    f = ImageFont.load_default()
bb = d.textbbox((0, 0), txt, font=f)
w, h = bb[2] - bb[0], bb[3] - bb[1]
d.text(((S - w) / 2 - bb[0], (S - h) / 2 - bb[1] - 3), txt, font=f, fill=gold)
img.save(out, optimize=True)
print("wrote", out)
