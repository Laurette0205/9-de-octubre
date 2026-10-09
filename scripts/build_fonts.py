#!/usr/bin/env python3
"""Descarga y autoaloja las tipografías de la plataforma (sin CDN).

Genera en `public/assets/fonts/`:
  * los ficheros .woff2 (subconjuntos `latin` y `latin-ext`)
  * `fonts.css` con las reglas @font-face locales

Fuentes: Inter (SIL OFL) y Playfair Display (SIL OFL) — licencia libre que
permite redistribución. Ejecutar con red:

    python scripts/build_fonts.py

El resultado es estable: repetirlo sólo sustituye los mismos ficheros.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "assets" / "fonts"
CSS_PATH = OUT_DIR / "fonts.css"

FAMILIES = [
    "Inter:ital,wght@0,400;0,500;0,600;0,700;1,400",
    "Playfair+Display:ital,wght@0,700;0,800;1,400",
]
SOURCE_URL = "https://fonts.googleapis.com/css2?" + "&".join(f"family={f}" for f in FAMILIES) + "&display=swap"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
WANTED_SUBSETS = {"latin"}  # el español no necesita latin-ext: ahorramos ~400 KB

BLOCK_RE = re.compile(r"/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*\{.*?\})", re.S)


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    response = httpx.get(SOURCE_URL, timeout=30, headers={"User-Agent": USER_AGENT}, follow_redirects=True)
    response.raise_for_status()

    blocks = [(subset, block) for subset, block in BLOCK_RE.findall(response.text) if subset in WANTED_SUBSETS]
    if not blocks:
        print("No se recibieron @font-face; comprueba la conexión.", file=sys.stderr)
        return 1

    rules: list[str] = []
    downloaded: set[str] = set()

    for subset, block in blocks:
        family = re.search(r"font-family:\s*'([^']+)'", block)
        weight = re.search(r"font-weight:\s*(\d+)", block)
        style = re.search(r"font-style:\s*(\w+)", block)
        source = re.search(r"url\((https://[^)]+\.woff2)\)", block)
        unicode_range = re.search(r"unicode-range:\s*([^;]+);", block)
        if not (family and weight and source):
            continue

        name = f"{slug(family.group(1))}-{weight.group(1)}-{style.group(1) if style else 'normal'}-{subset}.woff2"
        if name not in downloaded:
            font = httpx.get(source.group(1), timeout=30, headers={"User-Agent": USER_AGENT}, follow_redirects=True)
            font.raise_for_status()
            (OUT_DIR / name).write_bytes(font.content)
            downloaded.add(name)
            print(f"  ↓ {name} ({len(font.content) // 1024} KB)")

        rule = [
            "@font-face {",
            f"  font-family: '{family.group(1)}';",
            f"  font-style: {style.group(1) if style else 'normal'};",
            f"  font-weight: {weight.group(1)};",
            "  font-display: swap;",
            f"  src: url('./{name}') format('woff2');",
        ]
        if unicode_range:
            rule.append(f"  unicode-range: {unicode_range.group(1).strip()};")
        rule.append("}")
        rules.append("\n".join(rule))

    header = (
        "/* Tipografías autoalojadas — generadas por scripts/build_fonts.py.\n"
        "   Inter y Playfair Display, licencia SIL Open Font License 1.1.\n"
        "   No dependemos de CDN: se sirven desde 'self'. */\n\n"
    )
    CSS_PATH.write_text(header + "\n\n".join(rules) + "\n", encoding="utf-8")

    total = sum(p.stat().st_size for p in OUT_DIR.glob("*.woff2"))
    print(f"✔ {len(downloaded)} ficheros ({total // 1024} KB) y {CSS_PATH.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
