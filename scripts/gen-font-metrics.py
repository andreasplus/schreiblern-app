"""Erzeugt src/shared/fontMetrics.ts aus der ABeeZee-Schriftdatei.

Die Breiten entsprechen reportlab.pdfbase.pdfmetrics.stringWidth (Vorschübe ohne Kerning)
und werden für die proportionale Verkleinerung langer Wörter benötigt.
Aufruf: python scripts/gen-font-metrics.py   (benötigt fonttools und Pillow)
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from PIL import ImageFont

root = Path(__file__).resolve().parent.parent
font_path = root / "public" / "fonts" / "ABeeZee.ttf"
font = TTFont(str(font_path))
upm = font["head"].unitsPerEm
hmtx = font["hmtx"]
cmap = font.getBestCmap()
widths = {cp: hmtx[name][0] / upm for cp, name in sorted(cmap.items())}
fallback = hmtx[".notdef"][0] / upm
measure = ImageFont.truetype(str(font_path), 1000)
x_height = -measure.getbbox("a", anchor="ls")[1] / 1000

lines = [
    "// Automatisch erzeugt von scripts/gen-font-metrics.py. Nicht von Hand bearbeiten.",
    "// Schrift: ABeeZee Regular (SIL Open Font License 1.1).",
    f"export const FONT_X_HEIGHT = {x_height!r};",
    f"export const FALLBACK_ADVANCE = {fallback!r};",
    "export const ADVANCES: Record<number, number> = {",
]
lines += [f"  {cp}: {w!r}," for cp, w in widths.items()]
lines += ["};", ""]
(root / "src" / "shared" / "fontMetrics.ts").write_text("\n".join(lines), encoding="utf-8")
print(f"{len(widths)} Zeichen, x-Höhe {x_height}")
