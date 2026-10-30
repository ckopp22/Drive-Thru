# Generates placeholder icons into ../icons. Run: python3 tools/make-icons.py
from PIL import Image, ImageDraw, ImageFont
import os

RED, YELLOW, DARK = (230, 57, 70), (255, 200, 40), (120, 20, 30)
OUT = os.path.join(os.path.dirname(__file__), '..', 'icons')

def font(size):
    for p in ('/System/Library/Fonts/Helvetica.ttc', '/Library/Fonts/Arial Bold.ttf'):
        try:
            return ImageFont.truetype(p, size, index=1) if p.endswith('.ttc') else ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default(size)

def make(size, scale, rounded, name):
    S = size * 4
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if rounded:
        d.rounded_rectangle((0, 0, S, S), radius=S // 5, fill=RED)
    else:
        d.rectangle((0, 0, S, S), fill=RED)
    c, r = S / 2, S * scale / 2
    d.ellipse((c - r, c - r, c + r, c + r), fill=YELLOW, outline=DARK, width=int(S * 0.02))
    f = font(int(r * 1.3))
    d.text((c, c), 'D', font=f, fill=RED, anchor='mm')
    # drive-thru "window" stripe under the letter
    d.rounded_rectangle((c - r * 0.55, c + r * 0.55, c + r * 0.55, c + r * 0.68), radius=S // 100, fill=DARK)
    im.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name))

make(180, 0.78, False, 'icon-180.png')
make(192, 0.78, True, 'icon-192.png')
make(512, 0.78, True, 'icon-512.png')
make(512, 0.52, False, 'icon-maskable-512.png')
