"""Regenerate the original brand share graphic. Optional tooling: Pillow + system fonts."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PAPER, INK, GREEN, RULE = '#f4f0e7', '#24362f', '#506b59', '#cdc8ba'


def font(size, serif=False):
    candidates = (['C:/Windows/Fonts/georgia.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'] if serif
                  else ['C:/Windows/Fonts/arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'])
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size=size)


image = Image.new('RGB', (1200, 630), PAPER)
draw = ImageDraw.Draw(image)
draw.rectangle((32, 32, 1167, 597), outline=RULE, width=2)
draw.text((72, 78), 'A HERITAGE ARCHIVE', fill=GREEN, font=font(20))
draw.text((66, 151), 'History', fill=INK, font=font(99, True))
draw.text((66, 265), 'in Cards', fill=INK, font=font(99, True))
draw.line((74, 420, 615, 420), fill=RULE, width=2)
draw.text((74, 453), 'Iraq’s heritage, one card at a time.', fill=INK, font=font(27))
draw.text((74, 537), 'PLACES  /  HISTORY  /  MEMORY', fill=GREEN, font=font(17))

for angle, x, y, fill in [(13, 755, 122, '#d7ddcf'), (-10, 730, 121, '#e4dece'), (0, 770, 151, '#fffdf7')]:
    layer = Image.new('RGBA', (266, 356))
    pen = ImageDraw.Draw(layer)
    pen.rounded_rectangle((1, 1, 264, 354), radius=13, fill=fill, outline=INK, width=2)
    pen.rounded_rectangle((17, 17, 248, 338), radius=7, outline=RULE, width=1)
    if angle == 0:
        # An abstract arch, not a depiction of a specific monument.
        pen.arc((72, 78, 192, 198), 180, 360, fill=GREEN, width=4)
        pen.line((72, 138, 72, 242), fill=GREEN, width=4)
        pen.line((192, 138, 192, 242), fill=GREEN, width=4)
        pen.line((52, 243, 212, 243), fill=GREEN, width=3)
        pen.text((62, 284), 'DISCOVER IRAQ', fill=INK, font=font(18))
    rotated = layer.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)
    image.paste(rotated, (x, y), rotated)

destination = ROOT / 'public' / 'social-card.png'
destination.parent.mkdir(exist_ok=True)
image.save(destination, optimize=True)
print(f'{destination}: {image.size[0]} × {image.size[1]}, {destination.stat().st_size:,} bytes')
