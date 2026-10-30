# Generates the app icons into ../icons: the game's burger, bold on red.
# Run: python3 tools/make-icons.py   (needs Pillow). The maskable icon keeps everything inside the centre safe zone.
from PIL import Image, ImageDraw
import math, os

RED = (230, 57, 70)
BUN, BUN_LIGHT, BUN_DARK = (224, 160, 80), (238, 184, 112), (200, 138, 62)   # the game's 0xe0a050 bun
PATTY, LETTUCE, CHEESE, INK = (107, 58, 30), (76, 184, 76), (255, 200, 40), (60, 15, 20)
OUT = os.path.join(os.path.dirname(__file__), '..', 'icons')

def draw_art(d, S, scale):
    """The in-game burger (same colours and layers: bun, patty, lettuce, cheese diamond, domed top bun), centred in S x S."""
    u = S * scale / 100.0
    ox = oy = S * (1 - scale) / 2
    X = lambda v: ox + v * u
    Y = lambda v: oy + v * u
    ink = max(2, int(u * 1.5))
    # bottom bun (slightly tapered), patty, lettuce
    d.polygon([(X(17), Y(78)), (X(83), Y(78)), (X(79), Y(92)), (X(21), Y(92))], fill=BUN)
    d.line([(X(17), Y(78)), (X(83), Y(78)), (X(79), Y(92)), (X(21), Y(92)), (X(17), Y(78))], fill=INK, width=ink, joint='curve')
    d.rounded_rectangle((X(13), Y(64), X(87), Y(78)), radius=int(u * 3), fill=PATTY, outline=INK, width=ink)
    d.rounded_rectangle((X(12), Y(57), X(88), Y(65)), radius=int(u * 3), fill=LETTUCE, outline=INK, width=ink)
    # cheese: the flat square turned 45 degrees in the game, corners poking out past the bun
    d.polygon([(X(5), Y(55)), (X(50), Y(49)), (X(95), Y(55)), (X(50), Y(62))], fill=CHEESE)
    d.line([(X(5), Y(55)), (X(50), Y(49)), (X(95), Y(55)), (X(50), Y(62)), (X(5), Y(55))], fill=INK, width=ink, joint='curve')
    # domed top bun, low-poly: flat-shaded arc with a lighter facet on the left and a darker rim
    arc = [(50 + 37 * math.cos(math.radians(a)), 53 - 38 * math.sin(math.radians(a))) for a in range(0, 181, 20)]
    P = [(X(x), Y(y)) for x, y in arc]
    d.polygon(P, fill=BUN)
    d.polygon([P[5], P[6], P[7], P[8], P[9], (X(13), Y(53)), (X(26), Y(48)), (X(32), Y(36))], fill=BUN_LIGHT)
    d.polygon([P[0], P[-1], (X(13), Y(53)), (X(50), Y(53)), (X(87), Y(53))], fill=BUN)
    d.polygon([(X(13), Y(47)), (X(87), Y(47)), (X(87), Y(53)), (X(13), Y(53))], fill=BUN_DARK)
    d.line(P + [P[0]], fill=INK, width=ink, joint='curve')

def make(size, scale, rounded, name):
    S = size * 4
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if rounded:
        d.rounded_rectangle((0, 0, S, S), radius=S // 5, fill=RED)
    else:
        d.rectangle((0, 0, S, S), fill=RED)
    draw_art(d, S, scale)
    im.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name))

make(180, 0.86, False, 'icon-180.png')       # apple-touch-icon: iOS rounds the corners itself
make(192, 0.84, True, 'icon-192.png')
make(512, 0.84, True, 'icon-512.png')
make(512, 0.58, False, 'icon-maskable-512.png')
