#!/usr/bin/env python3
"""Auditoría automática de la plataforma de cumpleaños.

Comprueba: contraste WCAG de los tokens, assets referenciados, metadatos SEO,
accesibilidad básica del HTML, CSP/scripts inline, PWA (manifest/service worker),
rutas del backend y textos de la configuración.

Uso:  python scripts/audit.py [--json informe.json]
Código de salida: 0 si no hay fallos críticos, 1 en caso contrario.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
PUBLIC = ROOT / "public"
DIST = ROOT / "dist"
BACKEND = ROOT / "backend"
CONFIG = PUBLIC / "birthday.config.json"


def resolve_reference(reference: str) -> Path | None:
    """Resuelve una referencia del HTML en la estructura Vite (raíz / public / src)."""
    path = reference.split("?")[0].split("#")[0]
    if not path or path.startswith(("#", "data:", "mailto:", "tel:", "http://", "https://", "javascript:")):
        return None
    if path.endswith("/"):
        return None
    rel = path[2:] if path.startswith("./") else path.lstrip("/")
    for base in (SRC, PUBLIC, ROOT):
        candidate = base / rel
        if candidate.exists():
            return candidate
    if rel.startswith("src/"):
        return ROOT / rel
    return PUBLIC / rel


def asset_exists(reference: str) -> bool:
    target = resolve_reference(reference)
    return bool(target and target.exists())



# --------------------------------------------------------------------------- #
# Resultados
# --------------------------------------------------------------------------- #
@dataclass
class Finding:
    level: str  # "PASS" | "FAIL" | "WARN"
    category: str
    message: str
    location: str = ""


@dataclass
class Report:
    findings: list[Finding] = field(default_factory=list)

    def add(self, level: str, category: str, message: str, location: str = "") -> None:
        self.findings.append(Finding(level, category, message, location))

    @property
    def failures(self) -> list[Finding]:
        return [f for f in self.findings if f.level == "FAIL"]

    @property
    def warnings(self) -> list[Finding]:
        return [f for f in self.findings if f.level == "WARN"]

    @property
    def passes(self) -> list[Finding]:
        return [f for f in self.findings if f.level == "PASS"]


# --------------------------------------------------------------------------- #
# Contraste (WCAG 2.1)
# --------------------------------------------------------------------------- #
def _srgb_to_linear(channel: float) -> float:
    return channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4


def relative_luminance(hex_color: str) -> float:
    value = hex_color.lstrip("#")
    if len(value) == 3:
        value = "".join(ch * 2 for ch in value)
    red, green, blue = (int(value[i : i + 2], 16) / 255 for i in (0, 2, 4))
    r, g, b = (_srgb_to_linear(c) for c in (red, green, blue))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(foreground: str, background: str) -> float:
    first = relative_luminance(foreground)
    second = relative_luminance(background)
    lighter, darker = max(first, second), min(first, second)
    return (lighter + 0.05) / (darker + 0.05)


def audit_contrast(report: Report) -> None:
    tokens = _extract_css_tokens()
    palettes = {
        "dark": ("#0a0f1a", {"text": "#f5f0e8", "text-secondary": "#c9c4bb", "accent": "#c9a84c"}),
        "light": ("#f5f0e8", {"text": "#111827", "text-secondary": "#4b5563", "accent": "#8a6d1f"}),
        "high-contrast": ("#000000", {"text": "#ffffff", "text-secondary": "#ffffff", "accent": "#ffe100"}),
    }

    for theme, (background, foregrounds) in palettes.items():
        for label, color in foregrounds.items():
            ratio = contrast_ratio(color, background)
            required = 4.5 if label != "accent" else 3.0
            level = "PASS" if ratio >= required else "FAIL"
            report.add(
                level,
                "contraste",
                f"[{theme}] {label} ({color}) sobre {background}: {ratio:.2f}:1 (mín. {required}:1)",
                "src/css/variables.css",
            )

    for name, value in tokens.items():
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", value):
            report.add("WARN", "tokens", f"token {name} con valor no hexadecimal: {value}", "src/css/variables.css")

    # Texto sobre superficies con imagen o acento (warn si el par es ambiguo)
    ratio = contrast_ratio("#c9c4bb", "#111827")
    report.add(
        "PASS" if ratio >= 4.5 else "FAIL",
        "contraste",
        f"texto secundario sobre tarjeta oscura: {ratio:.2f}:1",
        "src/css/base.css",
    )


def _extract_css_tokens() -> dict[str, str]:
    path = SRC / "css" / "variables.css"
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8")
    root_block = re.search(r":root\s*\{(.*?)\}", text, re.S)
    if not root_block:
        return {}
    return dict(re.findall(r"--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;", root_block.group(1)))


# --------------------------------------------------------------------------- #
# HTML
# --------------------------------------------------------------------------- #
class _Inspector(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tags: list[tuple[str, dict[str, str]]] = []
        self.images: list[dict[str, str]] = []
        self.links: list[dict[str, str]] = []
        self.scripts: list[dict[str, str]] = []
        self.inline_handlers: list[str] = []
        self.ids: list[str] = []
        self.headings: list[tuple[str, str]] = []
        self.labels: list[str] = []
        self.buttons: list[str] = []
        self._in_heading: str | None = None
        self._heading_text: list[str] = []
        self._in_button = False
        self._button_text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        data = {k: (v or "") for k, v in attrs}
        self.tags.append((tag, data))

        for key in data:
            if key.startswith("on"):
                self.inline_handlers.append(f"{tag}[{key}]")

        if data.get("id"):
            self.ids.append(data["id"])
        if tag == "img":
            self.images.append(data)
        if tag == "a":
            self.links.append(data)
        if tag == "script":
            self.scripts.append(data)
        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self._in_heading = tag
            self._heading_text = []
        if tag == "button":
            self._in_button = True
            self._button_text = []
        if tag == "label":
            self.labels.append(data.get("for", ""))

    def handle_endtag(self, tag: str) -> None:
        if self._in_heading == tag:
            self.headings.append((tag, "".join(self._heading_text).strip()))
            self._in_heading = None
        if tag == "button" and self._in_button:
            self.buttons.append("".join(self._button_text).strip())
            self._in_button = False

    def handle_data(self, data: str) -> None:
        if self._in_heading:
            self._heading_text.append(data)
        if self._in_button:
            self._button_text.append(data)


def audit_html(report: Report) -> None:
    index = ROOT / "index.html"
    if not index.exists():
        report.add("FAIL", "html", "no existe index.html en la raíz", str(index))
        return

    html = index.read_text(encoding="utf-8")
    parser = _Inspector()
    parser.feed(html)

    # Idioma y metadatos
    report.add("PASS" if re.search(r"<html[^>]*\slang=", html) else "FAIL", "seo", "el elemento <html> declara lang", "index.html")
    report.add("PASS" if re.search(r"<title>[^<]{10,}</title>", html) else "FAIL", "seo", "<title> descriptivo (>=10 caracteres)", "index.html")
    report.add("PASS" if 'name="description"' in html else "FAIL", "seo", "meta description presente", "index.html")
    report.add("PASS" if 'property="og:title"' in html else "FAIL", "seo", "Open Graph presente", "index.html")

    has_canonical = bool(re.search(r'<link\s+rel="canonical"', html))
    has_og_url = 'property="og:url"' in html
    seo_url = (json.loads(CONFIG.read_text(encoding="utf-8")) if CONFIG.exists() else {}).get("seo", {}).get("url", "")
    if seo_url:
        report.add(
            "PASS" if has_canonical and has_og_url else "FAIL",
            "seo",
            f"canonical y og:url fijados a {seo_url} (npm run publish:url)"
            if has_canonical and has_og_url
            else "seo.url definida en la configuración pero no aplicada en index.html",
            "index.html",
        )
    else:
        report.add(
            "WARN" if not has_canonical else "PASS",
            "seo",
            "sin URL pública: fija seo.url y ejecuta `npm run publish:url -- <url>` antes de publicar"
            if not has_canonical
            else "canonical presente",
            "index.html",
        )
    report.add("PASS" if 'name="viewport"' in html else "FAIL", "responsive", "meta viewport presente", "index.html")
    report.add("PASS" if re.search(r"<main\b", html) else "FAIL", "accesibilidad", "<main> presente", "index.html")
    report.add("PASS" if 'class="skip-link"' in html or "skip-link" in html else "FAIL", "accesibilidad", "skip link presente", "index.html")

    # Imágenes
    missing_alt = [img for img in parser.images if not img.get("alt", "").strip()]
    report.add(
        "PASS" if parser.images and not missing_alt else ("WARN" if not parser.images else "FAIL"),
        "accesibilidad",
        f"{len(parser.images)} imágenes con alt" if not missing_alt else f"{len(missing_alt)} imágenes sin alt",
        "index.html",
    )

    # Jerarquía de encabezados
    levels = [int(level[1]) for level, _ in parser.headings]
    h1_count = levels.count(1)
    report.add("PASS" if h1_count >= 1 else "FAIL", "accesibilidad", f"{h1_count} encabezado <h1>", "index.html")
    if levels:
        jumps = [b for a, b in zip(levels, levels[1:]) if b - a > 1]
        report.add("PASS" if not jumps else "WARN", "accesibilidad", "sin saltos de nivel" if not jumps else f"salto de nivel detectado: {jumps}", "index.html")

    # Texto alternativo de controles
    empty_buttons = [b for b in parser.buttons if not b.strip()]
    report.add(
        "PASS" if not empty_buttons else "FAIL",
        "accesibilidad",
        f"{len(parser.buttons)} botones con texto" if not empty_buttons else f"{len(empty_buttons)} botones sin texto accesible",
        "index.html",
    )

    # Scripts inline (CSP estricta)
    external_scripts = [s for s in parser.scripts if s.get("src")]
    inline_scripts = [s for s in parser.scripts if not s.get("src")]
    report.add(
        "PASS" if not parser.inline_handlers else "FAIL",
        "seguridad",
        "sin manejadores de eventos inline" if not parser.inline_handlers else f"handlers inline: {parser.inline_handlers}",
        "index.html",
    )
    report.add(
        "PASS" if not inline_scripts else "FAIL",
        "seguridad",
        "sin <script> inline (CSP script-src 'self')" if not inline_scripts else f"{len(inline_scripts)} scripts inline",
        "index.html",
    )
    if external_scripts:
        remote = [s["src"] for s in external_scripts if s["src"].startswith(("http://", "https://"))]
        report.add(
            "PASS" if not remote else "FAIL",
            "seguridad",
            "scripts sólo locales" if not remote else f"scripts remotos: {remote}",
            "index.html",
        )

    # Hojas de estilo y preconnect remotos (deben desaparecer: todo se autoaloja)
    remote_styles = [lnk for lnk in parser.links if lnk.get("rel") == "stylesheet" and lnk.get("href", "").startswith(("http://", "https://"))]
    preconnects = [lnk for lnk in parser.links if lnk.get("rel") in {"preconnect", "dns-prefetch"}]
    report.add(
        "PASS" if not remote_styles and not preconnects else "FAIL",
        "seguridad",
        "sin hojas de estilo ni preconnect remotos"
        if not remote_styles and not preconnects
        else f"remotos: styles={remote_styles} preconnect={preconnects}",
        "index.html",
    )

    # Tipografías autoalojadas
    fonts_css = PUBLIC / "assets" / "fonts" / "fonts.css"
    if fonts_css.exists():
        faces = fonts_css.read_text(encoding="utf-8").count("@font-face")
        woff2 = list(fonts_css.parent.glob("*.woff2"))
        report.add(
            "PASS" if faces >= 6 and woff2 else "FAIL",
            "assets",
            f"tipografías autoalojadas: {faces} @font-face y {len(woff2)} .woff2"
            if faces >= 6 and woff2
            else f"fonts.css incompleto ({faces} @font-face, {len(woff2)} woff2)",
            "public/assets/fonts/fonts.css",
        )
        content = fonts_css.read_text(encoding="utf-8")
        report.add(
            "PASS" if "http://" not in content and "https://" not in content else "FAIL",
            "seguridad",
            "fonts.css sin referencias remotas",
            "public/assets/fonts/fonts.css",
        )
    else:
        report.add("FAIL", "assets", "public/assets/fonts/fonts.css ausente (npm run build:fonts)")

    # Imágenes remotas
    remote_imgs = [img.get("src", "") for img in parser.images if img.get("src", "").startswith(("http://", "https://"))]
    report.add(
        "PASS" if not remote_imgs else "WARN",
        "seguridad",
        "sin imágenes externas" if not remote_imgs else f"imágenes externas: {remote_imgs}",
        "index.html",
    )

    # Enlaces
    blank_targets = [lnk for lnk in parser.links if lnk.get("target") == "_blank"]
    unsafe = [lnk for lnk in blank_targets if "noopener" not in lnk.get("rel", "")]
    report.add(
        "PASS" if not unsafe else "FAIL",
        "seguridad",
        "enlaces target=_blank con noopener" if not unsafe else f"{len(unsafe)} enlaces _blank sin noopener",
        "index.html",
    )
    report.add(
        "PASS" if not [l for l in parser.links if not l.get("href")] else "FAIL",
        "accesibilidad",
        "sin enlaces sin href",
        "index.html",
    )

    # Identificadores duplicados
    duplicated = sorted({i for i in parser.ids if parser.ids.count(i) > 1})
    report.add(
        "PASS" if not duplicated else "FAIL",
        "accesibilidad",
        "ids únicos" if not duplicated else f"ids duplicados: {duplicated}",
        "index.html",
    )

    # Recursos referenciados
    for tag, data in parser.tags:
        for attr in ("src", "href"):
            reference = data.get(attr, "")
            target = resolve_reference(reference)
            if target is None:
                continue
            if not target.exists():
                report.add("FAIL", "assets", f"recurso ausente: {reference}", "index.html")


# --------------------------------------------------------------------------- #
# CSS / JS / PWA
# --------------------------------------------------------------------------- #
def audit_styles_and_scripts(report: Report) -> None:
    css_files = sorted((SRC / "css").glob("*.css"))
    if not css_files:
        report.add("FAIL", "css", "no hay hojas de estilo en src/css")
    else:
        report.add("PASS", "css", f"{len(css_files)} hojas de estilo presentes")

    critical = [
        SRC / "css" / "variables.css",
        SRC / "css" / "base.css",
        SRC / "css" / "sections.css",
        SRC / "css" / "responsive.css",
        SRC / "js" / "main.js",
        SRC / "js" / "config.js",
        SRC / "js" / "date.js",
        SRC / "js" / "config-fallback.js",
        PUBLIC / "sw.js",
        PUBLIC / "manifest.json",
        PUBLIC / "js" / "theme-boot.js",
    ]
    for path in critical:
        report.add("PASS" if path.exists() else "FAIL", "estructura", f"{path.relative_to(ROOT)} {'presente' if path.exists() else 'ausente'}")

    # Fallback de configuración desactualizado
    config_path = SRC / "js" / "config-fallback.js"
    if config_path.exists() and CONFIG.exists():
        stale = config_path.stat().st_mtime < CONFIG.stat().st_mtime
        report.add(
            "FAIL" if stale else "PASS",
            "configuración",
            "config-fallback.js desactualizado (regenera con npm run build:config)" if stale else "config-fallback.js sincronizado",
            "src/js/config-fallback.js",
        )

    # PWA
    manifest = PUBLIC / "manifest.json"
    if manifest.exists():
        try:
            data = json.loads(manifest.read_text(encoding="utf-8"))
            required = ["name", "short_name", "start_url", "display", "icons"]
            missing = [k for k in required if k not in data]
            report.add("PASS" if not missing else "FAIL", "pwa", "manifest completo" if not missing else f"manifest sin {missing}")
            icons_dir = PUBLIC
            absent = [i["src"] for i in data.get("icons", []) if not (icons_dir / i["src"]).exists()]
            report.add("PASS" if not absent else "FAIL", "pwa", "iconos del manifest existen" if not absent else f"iconos ausentes: {absent}")
        except json.JSONDecodeError as exc:
            report.add("FAIL", "pwa", f"manifest.json inválido: {exc}")

    sw = PUBLIC / "sw.js"
    if sw.exists():
        text = sw.read_text(encoding="utf-8")
        report.add("PASS" if "addEventListener" in text else "FAIL", "pwa", "service worker registra eventos")
        report.add("PASS" if re.search(r"\bVERSION\b|CACHE_VERSION|const VERSION", text) else "WARN", "pwa", "service worker versionado")
        report.add(
            "PASS" if "birthday.config.json" in text else "WARN",
            "pwa",
            "config excluida del caché duro" if "birthday.config.json" in text else "considera excluir birthday.config.json del caché",
            "public/sw.js",
        )

    # Build de producción
    dist_index = DIST / "index.html"
    if dist_index.exists():
        built = dist_index.read_text(encoding="utf-8", errors="ignore")
        report.add(
            "PASS" if re.search(r'(src|href)="\.\/assets/', built) else "WARN",
            "build",
            "dist/index.html usa rutas relativas (base './')" if re.search(r'(src|href)="\.\/assets/', built) else "dist/index.html sin rutas ./assets (revisa base en vite.config.js)",
            "dist/index.html",
        )
        report.add("PASS", "build", f"build de producción presente ({sum(p.stat().st_size for p in DIST.rglob('*') if p.is_file()) // 1024} KB)")
    else:
        report.add("WARN", "build", "dist/ ausente (ejecuta npm run build antes de desplegar)")


    # Media queries de responsive
    all_css = "\n".join(p.read_text(encoding="utf-8") for p in sorted((SRC / "css").glob("*.css")))
    widths = sorted({int(w) for w in re.findall(r"@media[^{]*?(\d{3,4})\s*px", all_css)})
    report.add("PASS" if widths else "FAIL", "responsive", f"breakpoints: {widths}")
    for required_width in (360, 480, 768, 1024, 1280):
        if widths and min(widths) <= required_width <= max(widths):
            report.add("PASS", "responsive", f"cubierto el ancho {required_width}px")
    report.add(
        "PASS" if "clamp(" in all_css else "WARN",
        "responsive",
        "tipografía fluida con clamp()" if "clamp(" in all_css else "sin tipografía fluida (clamp)",
    )
    report.add(
        "PASS" if "touch-action" in all_css or "min-height: 44px" in all_css or "44px" in all_css else "WARN",
        "accesibilidad",
        "objetivos táctiles >=44px" if "44px" in all_css else "revisa el tamaño de los objetivos táctiles",
    )


# --------------------------------------------------------------------------- #
# Configuración
# --------------------------------------------------------------------------- #
def audit_config(report: Report) -> dict:
    if not CONFIG.exists():
        report.add("FAIL", "configuración", "no existe birthday.config.json")
        return {}

    try:
        config = json.loads(CONFIG.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        report.add("FAIL", "configuración", f"JSON inválido: {exc}")
        return {}

    required = ["project", "birthday", "hero", "sections", "countdown", "accessibility"]
    missing = [k for k in required if k not in config]
    report.add("PASS" if not missing else "FAIL", "configuración", "bloques obligatorios" if not missing else f"faltan: {missing}")

    birthday = config.get("birthday", {})
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(birthday.get("date", ""))):
        report.add("PASS", "configuración", f"fecha válida: {birthday.get('date')}")
    else:
        report.add("FAIL", "configuración", f"fecha inválida: {birthday.get('date')}")
    report.add("PASS" if birthday.get("timezone") else "FAIL", "configuración", "zona horaria definida")
    report.add(
        "PASS" if not birthday.get("autoPlay") else "FAIL",
        "accesibilidad",
        "el audio nunca arranca solo",
    )

    # Textos placeholder sin rellenar (configuración, HTML y defaults del JS)
    blob = json.dumps(config, ensure_ascii=False)
    scan_targets = {"birthday.config.json": blob}
    for relative in ("index.html", "src/js/config.js", "src/js/config-fallback.js"):
        target = ROOT / relative
        if target.exists():
            scan_targets[relative] = target.read_text(encoding="utf-8", errors="ignore")

    placeholders: dict[str, set[str]] = {}
    for location, content in scan_targets.items():
        found = set(re.findall(r"\[[A-ZÁÉÍÓÚÑ ]{3,}\]", content))
        if found:
            placeholders[location] = found

    report.add(
        "PASS" if not placeholders else "FAIL",
        "contenido",
        "sin marcadores de posición en configuración, HTML ni fallback"
        if not placeholders
        else f"placeholders sin rellenar: {placeholders}",
        "birthday.config.json",
    )

    # Assets de la galería
    images = config.get("sections", {}).get("gallery", {}).get("images", [])
    if images:
        missing_assets = [i.get("src") for i in images if i.get("src") and not asset_exists(i["src"])]
        long_alts = [i.get("id") for i in images if len(i.get("alt", "").strip()) <= 10]
        report.add("PASS" if not missing_assets else "FAIL", "assets", "galería completa" if not missing_assets else f"assets ausentes: {missing_assets}")
        report.add("PASS" if not long_alts else "WARN", "accesibilidad", "alts descriptivos" if not long_alts else f"alts demasiado cortos: {long_alts}")
    else:
        report.add("FAIL", "configuración", "la galería no tiene imágenes")

    wishes = config.get("sections", {}).get("wishes", {}).get("items", [])
    report.add("PASS" if len(wishes) >= 6 else "WARN", "contenido", f"{len(wishes)} deseos (mín. recomendado 6)")

    intro = config.get("sections", {}).get("intro", {}).get("paragraphs", [])
    report.add("PASS" if len(intro) >= 4 else "WARN", "contenido", f"{len(intro)} párrafos de introducción (mín. 4)")

    return config


# --------------------------------------------------------------------------- #
# Backend
# --------------------------------------------------------------------------- #
def audit_backend(report: Report) -> None:
    if not BACKEND.exists():
        report.add("WARN", "backend", "no hay backend (modo estático)")
        return

    main = BACKEND / "main.py"
    if not main.exists():
        report.add("FAIL", "backend", "backend/main.py ausente")
        return

    text = main.read_text(encoding="utf-8")
    for label, needle in [
        ("CORS", "CORSMiddleware"),
        ("cabeceras de seguridad", "SecurityHeadersMiddleware"),
        ("servición de la configuración", "birthday.config.json"),
    ]:
        report.add("PASS" if needle in text else "FAIL", "backend", f"{label} en main.py" if needle in text else f"main.py sin {label}")

    security = BACKEND / "core" / "security.py"
    if security.exists():
        sec = security.read_text(encoding="utf-8")
        report.add("PASS" if "Content-Security-Policy" in sec else "FAIL", "seguridad", "CSP definida en el backend")
        report.add("PASS" if re.search(r"rate.?limit|RateLimit|_bucket", sec, re.I) else "WARN", "seguridad", "limitación de tasa presente")
        report.add("PASS" if re.search(r"sanitize|strip_tags|<script", sec, re.I) else "WARN", "seguridad", "sanitización de entradas")
    else:
        report.add("FAIL", "seguridad", "core/security.py ausente")

    secret_patterns = [
        (r"password\s*=\s*[\"'][^\"']+[\"']", "contraseña en claro"),
        (r"api[_-]?key\s*=\s*[\"'][^\"']+[\"']", "clave de API en claro"),
        (r"SECRET\s*=\s*[\"'][^\"']{8,}[\"']", "secreto en claro"),
    ]
    leaked = []
    for path in BACKEND.rglob("*.py"):
        if "tests" in path.parts:
            continue
        source = path.read_text(encoding="utf-8", errors="ignore")
        for pattern, label in secret_patterns:
            if re.search(pattern, source, re.I):
                leaked.append(f"{path.relative_to(ROOT)}: {label}")
    report.add("PASS" if not leaked else "FAIL", "seguridad", "sin secretos en el código" if not leaked else f"posibles secretos: {leaked}")

    requirements = BACKEND / "requirements.txt"
    if requirements.exists():
        report.add("PASS", "backend", "requirements.txt presente")
    else:
        report.add("WARN", "backend", "falta backend/requirements.txt")


# --------------------------------------------------------------------------- #
# Docs y assets
# --------------------------------------------------------------------------- #
def audit_assets(report: Report) -> None:
    assets = PUBLIC / "assets"
    if not assets.exists():
        report.add("FAIL", "assets", "public/assets ausente")
        return

    expected = [
        assets / "images" / "scene-ninja.svg",
        assets / "images" / "scene-stage.svg",
        assets / "images" / "ninja-01.svg",
        assets / "icons" / "favicon.svg",
        assets / "images" / "og-image.png",
    ]
    for path in expected:
        report.add(
            "PASS" if path.exists() else "FAIL",
            "assets",
            f"{path.relative_to(assets)} {'presente' if path.exists() else 'ausente'}",
        )

    gallery = sorted((assets / "images").glob("gallery-*.svg"))
    report.add("PASS" if len(gallery) >= 6 else "FAIL", "assets", f"{len(gallery)} láminas de galería (mín. 6)")

    icons = sorted((assets / "icons").glob("*.png")) if (assets / "icons").exists() else []
    sizes = {int(m.group(1)) for p in icons for m in [re.search(r"(\d+)", p.stem)] if m}
    required_sizes = {72, 96, 128, 144, 152, 192, 384, 512}
    missing_sizes = sorted(required_sizes - sizes)
    report.add("PASS" if not missing_sizes else "WARN", "pwa", "iconos PWA completos" if not missing_sizes else f"faltan tamaños: {missing_sizes}")

    audio = sorted((assets / "audio").glob("*")) if (assets / "audio").exists() else []
    report.add("PASS" if audio else "WARN", "assets", f"{len(audio)} pistas de audio" if audio else "sin audio embebido (opcional)")
    for track in audio:
        report.add(
            "PASS" if track.suffix in {".wav", ".mp3", ".ogg"} else "WARN",
            "assets",
            f"{track.name}: {track.stat().st_size // 1024} KB",
        )

    # Peso total (fuente + assets; el build vive en dist/)
    source_total = sum(
        p.stat().st_size
        for base in (PUBLIC, SRC, ROOT / "index.html")
        for p in (base.rglob("*") if base.is_dir() else [base])
        if p.is_file()
    )
    report.add(
        "PASS" if source_total < 8 * 1024 * 1024 else "WARN",
        "rendimiento",
        f"tamaño total de fuentes y assets: {source_total // 1024} KB (objetivo < 8 MB)",
    )


def audit_docs(report: Report) -> None:
    docs = ROOT / "docs"
    required = [
        "ARCHITECTURE.md",
        "DESIGN-SYSTEM.md",
        "CUSTOMIZATION.md",
        "NAV-MAP.md",
        "AUDIT.md",
        "UX-AUDIT.md",
        "CHECKLISTS.md",
        "PLAN-IMPLEMENTACION.md",
    ]
    for name in required:
        path = docs / name
        report.add("PASS" if path.exists() else "FAIL", "docs", f"docs/{name} {'presente' if path.exists() else 'ausente'}")
    readme = ROOT / "README.md"
    report.add("PASS" if readme.exists() and readme.stat().st_size > 2000 else "FAIL", "docs", "README.md completo")


# --------------------------------------------------------------------------- #
# Ejecución
# --------------------------------------------------------------------------- #
def run_audit() -> Report:
    report = Report()
    audit_config(report)
    audit_html(report)
    audit_styles_and_scripts(report)
    audit_contrast(report)
    audit_assets(report)
    audit_backend(report)
    audit_docs(report)
    return report


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", help="ruta para volcar el informe en JSON")
    args = parser.parse_args()

    report = run_audit()

    symbols = {"PASS": "✓", "FAIL": "✗", "WARN": "!"}
    for level in ("FAIL", "WARN"):
        for finding in report.findings:
            if finding.level == level:
                where = f"  ({finding.location})" if finding.location else ""
                print(f"[{symbols[level]}] {finding.category}: {finding.message}{where}")

    print()
    print(f"PASS {len(report.passes)}  ·  WARN {len(report.warnings)}  ·  FAIL {len(report.failures)}")

    if args.json:
        payload = {
            "summary": {
                "pass": len(report.passes),
                "warn": len(report.warnings),
                "fail": len(report.failures),
            },
            "findings": [asdict(f) for f in report.findings],
        }
        Path(args.json).write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Informe JSON: {args.json}")

    return 1 if report.failures else 0


if __name__ == "__main__":
    sys.exit(main())
