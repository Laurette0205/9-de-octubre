#!/usr/bin/env python
"""Genera los iconos PWA (PNG) y la imagen Open Graph del proyecto.

Requiere Pillow. Uso:
    python scripts/generate_icons.py

Todos los assets son originales: no se usa material de terceros.
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ICONS_DIR = ROOT / "public" / "assets" / "icons"
IMAGES_DIR = ROOT / "public" / "assets" / "images"

ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

NIGHT = (10, 15, 26, 255)
GOLD = (201, 168, 76, 255)
CHAMPAGNE = (232, 213, 183, 255)
WARM_WHITE = (245, 240, 232, 255)


def _font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    candidates = [
        Path("C:/Windows/Fonts/georgiab.ttf" if bold else "C:/Windows/Fonts/georgia.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        Path("/System/Library/Fonts/Supplemental/Georgia Bold.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def render_icon(size: int) -> Image.Image:
    """Icono: sello dorado con el 9 sobre fondo azul noche."""
    scale = max(1, size // 64)
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    radius = size // 6
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=NIGHT)

    ring = [size * 0.17, size * 0.17, size * 0.83, size * 0.83]
    draw.ellipse(ring, outline=GOLD, width=max(2, 3 * scale))

    font = _font(int(size * 0.46))
    text = "9"
    bbox = draw.textbbox((0, 0), text, font=font)
    width = bbox[2] - bbox[0]
    height = bbox[3] - bbox[1]
    draw.text(
        ((size - width) / 2 - bbox[0], (size - height) / 2 - bbox[1] - size * 0.01),
        text,
        font=font,
        fill=CHAMPAGNE,
    )
    return image


def render_og(width: int = 1200, height: int = 630) -> Image.Image:
    """Imagen para compartir: degradado nocturno + sello + tipografía."""
    image = Image.new("RGB", (width, height), NIGHT)
    draw = ImageDraw.Draw(image)

    for y in range(height):
        t = y / height
        r = int(10 + t * 8)
        g = int(15 + t * 14)
        b = int(26 + t * 32)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # resplandor dorado
    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    cx, cy, radius = int(width * 0.78), int(height * 0.42), 320
    for step in range(radius, 0, -6):
        alpha = int(70 * (1 - step / radius))
        gdraw.ellipse([cx - step, cy - step, cx + step, cy + step], fill=(201, 168, 76, alpha))
    image = Image.alpha_composite(image.convert("RGBA"), glow)
    draw = ImageDraw.Draw(image)

    # sello
    seal_r = 96
    sx, sy = int(width * 0.16), int(height * 0.5)
    draw.ellipse([sx - seal_r, sy - seal_r, sx + seal_r, sy + seal_r], outline=GOLD, width=5)
    num_font = _font(116)
    bbox = draw.textbbox((0, 0), "9", font=num_font)
    draw.text(
        (sx - (bbox[2] - bbox[0]) / 2 - bbox[0], sy - (bbox[3] - bbox[1]) / 2 - bbox[1] - 6),
        "9",
        font=num_font,
        fill=CHAMPAGNE,
    )

    title_font = _font(84)
    draw.text((int(width * 0.28), int(height * 0.3)), "9 DE OCTUBRE", font=title_font, fill=WARM_WHITE)

    sub_font = _font(54, bold=False)
    draw.text((int(width * 0.28), int(height * 0.47)), "Un día para celebrarte", font=sub_font, fill=GOLD)

    small_font = _font(34, bold=False)
    draw.text(
        (int(width * 0.28), int(height * 0.62)),
        "Feliz cumpleaños · Una celebración desde el corazón",
        font=small_font,
        fill=(232, 213, 183),
    )

    # línea decorativa
    line_y = int(height * 0.78)
    draw.line([(int(width * 0.28), line_y), (int(width * 0.72), line_y)], fill=GOLD, width=3)

    return image.convert("RGB")


def main() -> None:
    ICONS_DIR.mkdir(parents=True, exist_ok=True)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    for size in ICON_SIZES:
        icon = render_icon(size)
        target = ICONS_DIR / f"icon-{size}.png"
        icon.save(target, "PNG", optimize=True)
        print(f"  ok {target.relative_to(ROOT)}")

    # icono táctil 180x180 derivado del de 192 (recorte centrado)
    touch = render_icon(192).resize((180, 180), Image.LANCZOS)
    touch.save(ICONS_DIR / "icon-180.png", "PNG", optimize=True)
    print(f"  ok {(ICONS_DIR / 'icon-180.png').relative_to(ROOT)}")

    og = render_og()
    og_path = IMAGES_DIR / "og-image.png"
    og.save(og_path, "PNG", optimize=True)
    print(f"  ok {og_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
