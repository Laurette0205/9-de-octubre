#!/usr/bin/env python
"""Genera las tres láminas de la escena ninja (arte original, sin licencias).

Crea en public/assets/images/:
  ninja-01.svg  silueta de guerrero frente a la luna
  ninja-02.svg  estela de viento en línea recta
  ninja-03.svg  llama dorada contenida en un círculo de luz

Sustitúyelas por tus propias fotos/banners manteniendo los mismos nombres
(en public/birthday.config.json → sections.naruto.images).

Uso:
    python scripts/generate_scenes.py
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "assets" / "images"

W, H = 960, 720
NIGHT = "#0a0f1a"
NAVY = "#111827"
GOLD = "#c9a84c"
CHAMPAGNE = "#e8d5b7"
BLUE = "#3b82f6"
WHITE = "#f5f0e8"

MOON = f"""  <circle cx="700" cy="190" r="110" fill="{CHAMPAGNE}" opacity="0.92"/>
  <circle cx="742" cy="160" r="110" fill="{NIGHT}"/>
  <circle cx="700" cy="190" r="150" fill="none" stroke="{GOLD}" stroke-opacity="0.35" stroke-width="2"/>"""


def svg(body: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
        f'role="img" aria-label="Ilustración original de la escena ninja">\n'
        f'  <defs>\n'
        f'    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">\n'
        f'      <stop offset="0%" stop-color="{NAVY}"/>\n'
        f'      <stop offset="100%" stop-color="{NIGHT}"/>\n'
        f'    </linearGradient>\n'
        f'    <linearGradient id="ridge" x1="0" y1="0" x2="1" y2="1">\n'
        f'      <stop offset="0%" stop-color="#16203a"/>\n'
        f'      <stop offset="100%" stop-color="#0d1424"/>\n'
        f'    </linearGradient>\n'
        f'  </defs>\n'
        f'  <rect width="{W}" height="{H}" fill="url(#sky)"/>\n'
        f'{body}\n'
        f'</svg>\n'
    )


def ninja_01() -> str:
    body = (
        MOON + "\n"
        '  <path d="M0 560 L180 430 L330 540 L520 380 L700 520 L960 400 L960 720 L0 720 Z" fill="url(#ridge)"/>\n'
        '  <path d="M0 640 L240 540 L470 630 L720 520 L960 610 L960 720 L0 720 Z" fill="#080d17"/>\n'
        f'  <g fill="{WHITE}" opacity="0.9">\n'
        '    <path d="M470 300 q22 -34 44 0 l10 120 q-32 22 -64 0 Z"/>\n'
        '    <path d="M466 420 l68 0 16 150 -34 0 -16 -96 -18 96 -34 0 Z"/>\n'
        '    <path d="M508 330 l84 -26 6 16 -84 30 Z"/>\n'
        '  </g>\n'
        f'  <path d="M520 300 l120 -110 14 12 -108 116 Z" fill="{GOLD}" opacity="0.85"/>\n'
        '  <g fill="' + CHAMPAGNE + '" opacity="0.5">'
        '<circle cx="140" cy="120" r="3"/><circle cx="240" cy="200" r="2"/>'
        '<circle cx="330" cy="90" r="2.5"/><circle cx="880" cy="330" r="2.5"/>'
        '<circle cx="620" cy="70" r="2"/><circle cx="60" cy="300" r="2"/>'
        '</g>'
    )
    return svg(body)


def ninja_02() -> str:
    streaks = []
    for index in range(9):
        y = 130 + index * 58
        x1 = 60 + index * 26
        x2 = 560 + index * 34
        opacity = 0.18 + (index % 3) * 0.12
        streaks.append(
            f'  <path d="M{x1} {y} L{x2} {y - 46}" stroke="{BLUE if index % 2 else GOLD}" '
            f'stroke-width="{3 + (index % 3)}" stroke-linecap="round" opacity="{opacity:.2f}"/>'
        )
    body = (
        "\n".join(streaks) + "\n"
        f'  <path d="M470 330 q34 -46 74 0 l14 132 q-46 30 -102 0 Z" fill="{WHITE}" opacity="0.92"/>\n'
        f'  <path d="M470 470 l146 0 26 148 -58 0 -34 -104 -30 104 -56 0 Z" fill="{WHITE}" opacity="0.92"/>\n'
        f'  <path d="M470 470 L300 560 L320 596 L486 512 Z" fill="{GOLD}" opacity="0.75"/>\n'
        f'  <path d="M0 660 L960 660 L960 720 L0 720 Z" fill="#080d17"/>'
    )
    return svg(body)


def ninja_03() -> str:
    body = (
        f'  <circle cx="480" cy="360" r="230" fill="none" stroke="{GOLD}" stroke-width="3" opacity="0.75"/>\n'
        f'  <circle cx="480" cy="360" r="285" fill="none" stroke="{GOLD}" stroke-width="1.5" opacity="0.35"/>\n'
        f'  <path d="M480 200 c70 80 130 130 130 210 a130 130 0 0 1 -260 0 c0 -60 40 -96 74 -140 '
        f'c10 44 34 56 34 84 a56 56 0 0 0 46 54 c-14 -40 16 -74 60 -120 c-18 60 -74 74 -74 120 '
        f'a74 74 0 0 0 148 0 c0 -104 -96 -154 -158 -208 Z" fill="url(#sky)"/>\n'
        f'  <path d="M480 260 c48 58 92 94 92 152 a92 92 0 0 1 -184 0 c0 -44 30 -70 54 -102 '
        f'c8 32 24 42 24 62 a40 40 0 0 0 80 0 c0 -46 -54 -62 -66 -112 Z" fill="{CHAMPAGNE}" opacity="0.95"/>\n'
        f'  <path d="M480 330 c26 34 50 54 50 90 a50 50 0 0 1 -100 0 c0 -26 18 -40 32 -60 Z" fill="{GOLD}"/>\n'
        f'  <path d="M0 640 L960 640 L960 720 L0 720 Z" fill="#080d17" opacity="0.9"/>'
    )
    return svg(body)


SCENES = {
    "ninja-01.svg": ninja_01,
    "ninja-02.svg": ninja_02,
    "ninja-03.svg": ninja_03,
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for filename, builder in SCENES.items():
        target = OUT / filename
        target.write_text(builder(), encoding="utf-8")
        print(f"ok {target.relative_to(ROOT)} ({target.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
