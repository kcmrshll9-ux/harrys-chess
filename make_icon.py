"""Generate the Harry's Chess icon: a Staunton-style King chess piece on a badge.
Writes Icon Preview.png (1024) and app-icon.ico (256,128,64,48,32,16).
The King has the classic cross-on-top, rounded crown band, tapering body,
and a wide stepped base — recognizable even at 16px."""
from PIL import Image, ImageDraw
import math

S = 1024
img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# Badge: rounded square, dark purple with gold ring
def rounded(rect, r, fill):
    d.rounded_rectangle(rect, radius=r, fill=fill)
rounded((40, 40, S-40, S-40), 180, (26, 16, 48, 255))
rounded((70, 70, S-70, S-70), 155, (36, 24, 69, 255))
d.ellipse((60, 60, S-60, S-60), outline=(255, 176, 31, 255), width=14)

cx = S // 2
GOLD = (255, 217, 74, 255)
GOLD_D = (214, 168, 40, 255)
OUT = (90, 44, 16, 255)

# --- Real King silhouette, built as a symmetric profile (right half), mirrored ---
# Coordinates are (dx, dy) from center; y grows downward. Piece spans y ~ -360..+300.
# Cross on top:
cross_v = 28   # half-width of vertical bar
cross_h = 150  # half-width of horizontal bar
# Build the full outline as a list going clockwise from top-left of cross.
pts = [
    (cx - cross_v, -360 + 300),
    (cx + cross_v, -360 + 300),
    (cx + cross_v, -300 + 300),
    (cx + cross_h, -300 + 300),
    (cx + cross_h, -250 + 300),
    (cx + 60, -250 + 300),
    # crown shoulder curve down into the body
    (cx + 95, -190 + 300),
    (cx + 120, -120 + 300),
    (cx + 110, -40 + 300),
    (cx + 95, 20 + 300),
    # body waist then flare to base
    (cx + 105, 90 + 300),
    (cx + 150, 150 + 300),
    (cx + 175, 200 + 300),
    (cx + 175, 250 + 300),
    (cx + 150, 250 + 300),
    (cx + 150, 300 + 300),
    (cx - 150, 300 + 300),
    (cx - 150, 250 + 300),
    (cx - 175, 250 + 300),
    (cx - 175, 200 + 300),
    (cx - 150, 150 + 300),
    (cx - 105, 90 + 300),
    (cx - 95, 20 + 300),
    (cx - 110, -40 + 300),
    (cx - 120, -120 + 300),
    (cx - 95, -190 + 300),
    (cx - 60, -250 + 300),
    (cx - cross_h, -250 + 300),
    (cx - cross_h, -300 + 300),
    (cx - cross_v, -300 + 300),
]
d.polygon(pts, fill=GOLD, outline=OUT)
d.line(pts + [pts[0]], fill=OUT, width=12, joint='round')

# Collar band across the crown (a horizontal ring below the cross)
d.rectangle((cx - 120, -210 + 300, cx + 120, -170 + 300), fill=GOLD_D, outline=OUT, width=6)
# Base band (a ring near the bottom)
d.rectangle((cx - 165, 180 + 300, cx + 165, 215 + 300), fill=GOLD_D, outline=OUT, width=6)

# Subtle shading on the right side for a 3D feel
shade = [(cx + 60, -250 + 300), (cx + 95, -190 + 300), (cx + 120, -120 + 300),
         (cx + 110, -40 + 300), (cx + 95, 20 + 300), (cx + 105, 90 + 300),
         (cx + 150, 150 + 300), (cx + 175, 200 + 300), (cx + 175, 250 + 300),
         (cx + 150, 250 + 300), (cx + 150, 300 + 300), (cx + 90, 300 + 300),
         (cx + 60, 100 + 300), (cx + 40, -100 + 300), (cx + 30, -250 + 300)]
d.polygon(shade, fill=(230, 185, 55, 120))

img.save('Icon Preview.png')
img.resize((512,512), Image.LANCZOS).save('app-icon.png')  # 512 PNG for the PWA manifest (manifest declares app-icon.png)
img.save('app-icon.ico', sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
print('wrote Icon Preview.png, app-icon.png and app-icon.ico')
