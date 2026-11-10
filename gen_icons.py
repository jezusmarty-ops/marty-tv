# Gera os ícones do app Android (icon 192x192 + banner 320x180) com Pillow.
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "android", "app", "src", "main", "res", "drawable")
os.makedirs(OUT, exist_ok=True)

BG = (11, 11, 20)
ACCENT = (225, 29, 72)


def gradient(size):
    img = Image.new("RGB", size, BG)
    d = ImageDraw.Draw(img)
    w, h = size
    for y in range(h):
        t = y / h
        d.line([(0, y), (w, y)], fill=(
            int(11 + 45 * t), int(11 + 25 * t), int(20 + 70 * t)))
    return img


def font(size):
    for p in (r"C:\Windows\Fonts\arialbd.ttf", r"C:\Windows\Fonts\arial.ttf"):
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


# ---- ícone ----
icon = gradient((192, 192))
d = ImageDraw.Draw(icon)
d.polygon([(72, 50), (72, 142), (138, 96)], fill=ACCENT)
d.polygon([(76, 58), (76, 134), (130, 96)], fill=(255, 255, 255))
d.polygon([(84, 68), (84, 124), (122, 96)], fill=ACCENT)
icon.save(os.path.join(OUT, "icon.png"))

# ---- banner (TV launcher) ----
banner = gradient((320, 180))
d = ImageDraw.Draw(banner)
d.polygon([(34, 44), (34, 136), (110, 90)], fill=ACCENT)
d.polygon([(40, 54), (40, 126), (98, 90)], fill=(255, 255, 255))
d.text((132, 66), "MartyTV", fill=(255, 255, 255), font=font(52))
d.text((134, 118), "TV gratis e legal", fill=(200, 200, 220), font=font(18))
banner.save(os.path.join(OUT, "banner.png"))

print("icones gerados em", OUT)
