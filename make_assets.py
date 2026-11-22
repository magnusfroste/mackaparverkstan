#!/usr/bin/env python3
"""Ikoner, og-bild och småfiler för Mackapärverkstan – allt lokalt, inga CDN:er."""
from __future__ import annotations

import json
import math
import pathlib
import shutil

from PIL import Image, ImageDraw, ImageFont

APP = pathlib.Path("/opt/data/projects/mackaparverkstan/public")
KÄLLA = pathlib.Path("/opt/data/projects/marre-marta/public")
PAPPER = (250, 247, 242)
INK = (20, 24, 31)
BLÅ = (47, 111, 159)
RÖD = (217, 74, 61)
GRÄDDE = (253, 251, 247)
TRÄ = (201, 154, 104)
GRÖN = (47, 125, 111)


def typsnitt(vikt: int, storlek: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(KÄLLA / f"fonts/fredoka-{vikt}.ttf"), storlek)


def kugghjul(d: ImageDraw.ImageDraw, cx: float, cy: float, r: float, fyll, tänder: int = 10) -> None:
    """Ett kugghjul: tandad ring med hål i mitten."""
    yttre = r * 1.22
    for i in range(tänder):
        a = 2 * math.pi * i / tänder
        dx, dy = math.cos(a), math.sin(a)
        px, py = -dy, dx
        d.polygon(
            [
                (cx + dx * r * 0.92 + px * r * 0.20, cy + dy * r * 0.92 + py * r * 0.20),
                (cx + dx * yttre + px * r * 0.14, cy + dy * yttre + py * r * 0.14),
                (cx + dx * yttre - px * r * 0.14, cy + dy * yttre - py * r * 0.14),
                (cx + dx * r * 0.92 - px * r * 0.20, cy + dy * r * 0.92 - py * r * 0.20),
            ],
            fill=fyll,
        )
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=fyll)
    d.ellipse((cx - r * 0.34, cy - r * 0.34, cx + r * 0.34, cy + r * 0.34), fill=BLÅ)


def tile(sida: int, märke: float = 1.0) -> Image.Image:
    """Rundad blå ruta med kugghjul, planka och boll."""
    s = sida * 4
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * 0.235), fill=BLÅ)

    kugghjul(d, s * 0.40, s * 0.40, s * 0.20, GRÄDDE)

    # planka
    d.line([(s * 0.14, s * 0.74), (s * 0.86, s * 0.60)], fill=TRÄ, width=int(s * 0.10), joint="curve")
    # boll
    d.ellipse((s * 0.60, s * 0.34, s * 0.84, s * 0.58), fill=RÖD)
    d.ellipse((s * 0.645, s * 0.375, s * 0.70, s * 0.43), fill=(255, 255, 255, 110))

    if märke < 1.0:
        ins = int(s * (1 - märke) / 2)
        im = im.crop((ins, ins, s - ins, s - ins))
    return im.resize((sida, sida), Image.LANCZOS)


def og() -> None:
    W, H = 1200, 630
    im = Image.new("RGB", (W, H), PAPPER)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W, H), fill=PAPPER)

    ikon = tile(150, 1.0)
    im.paste(ikon, (86, 96), ikon)

    d.text((86, 288), "Mackapärverkstan", font=typsnitt(700, 70), fill=INK)
    d.text((90, 382), "en uppgift, några fasta saker", font=typsnitt(500, 34), fill=(74, 82, 96))
    d.text((90, 424), "och en låda full av prylar", font=typsnitt(500, 34), fill=(74, 82, 96))
    d.text((90, 528), "Gratis · 7–12 år · iPad & dator · ingen inloggning", font=typsnitt(500, 26), fill=(120, 128, 140))

    # höger: en liten byggrad – planka + boll på väg mot en korg
    bx, by = 720, 150
    d.rounded_rectangle((bx, by, W - 70, 500), radius=44, fill=(246, 241, 232))

    d.line([(bx + 60, 400), (bx + 240, 300)], fill=TRÄ, width=22, joint="curve")
    d.ellipse((bx + 250, 232, bx + 322, 304), fill=RÖD)
    d.line([(bx + 250, 330), (bx + 250, 470)], fill=(169, 174, 182), width=10)
    d.line([(bx + 326, 330), (bx + 326, 470)], fill=(169, 174, 182), width=10)
    d.line([(bx + 250, 470), (bx + 326, 470)], fill=(169, 174, 182), width=10)
    d.line([(bx + 240, 330), (bx + 336, 330)], fill=(60, 68, 78), width=8)
    d.line([(bx + 250, 344), (bx + 262, 400)], fill=(214, 220, 226), width=3)
    d.line([(bx + 326, 344), (bx + 314, 400)], fill=(214, 220, 226), width=3)

    im.save(APP / "og.png", optimize=True)


def main() -> None:
    APP.mkdir(parents=True, exist_ok=True)
    if not (APP / "fonts").exists():
        shutil.copytree(KÄLLA / "fonts", APP / "fonts")

    tile(512).save(APP / "icon-512.png")
    tile(512, 0.78).save(APP / "icon-maskable-512.png")
    tile(192).save(APP / "icon-192.png")
    tile(180).save(APP / "apple-touch-icon.png")
    tile(48).save(APP / "favicon.png")

    (APP / "favicon.svg").write_text(
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="15" fill="#2f6f9f"/>
  <g fill="#fdfbf7">
    <circle cx="26" cy="26" r="11"/>
    <rect x="23.5" y="9" width="5" height="7" rx="1.5"/>
    <rect x="23.5" y="36" width="5" height="7" rx="1.5"/>
    <rect x="9" y="23.5" width="7" height="5" rx="1.5"/>
    <rect x="36" y="23.5" width="7" height="5" rx="1.5"/>
    <rect x="13.5" y="13.5" width="5" height="7" rx="1.5" transform="rotate(-45 16 17)"/>
    <rect x="33.5" y="33.5" width="5" height="7" rx="1.5" transform="rotate(-45 36 37)"/>
    <rect x="33.5" y="13.5" width="5" height="7" rx="1.5" transform="rotate(45 36 17)"/>
    <rect x="13.5" y="33.5" width="5" height="7" rx="1.5" transform="rotate(45 16 37)"/>
  </g>
  <circle cx="26" cy="26" r="4" fill="#2f6f9f"/>
  <circle cx="45" cy="45" r="9" fill="#d94a3d"/>
</svg>
""",
        encoding="utf-8",
    )

    (APP / "site.webmanifest").write_text(
        json.dumps(
            {
                "name": "Mackapärverkstan",
                "short_name": "Mackapär",
                "description": "Bygg en kedja av plankor, vippor och kanoner som löser uppdraget. Fysikpussel för barn 7–12 år.",
                "lang": "sv-SE",
                "start_url": "/",
                "scope": "/",
                "display": "standalone",
                "orientation": "any",
                "background_color": "#faf7f2",
                "theme_color": "#2f6f9f",
                "icons": [
                    {"src": "/icon-192.png", "sizes": "192x192", "type": "image/png"},
                    {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png"},
                    {"src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
                ],
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    (APP / "robots.txt").write_text(
        "User-agent: *\nAllow: /\n\nSitemap: https://mackaparverkstan.shipholm.dev/sitemap.xml\n",
        encoding="utf-8",
    )
    (APP / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        "  <url>\n    <loc>https://mackaparverkstan.shipholm.dev/</loc>\n"
        "    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>\n"
        "</urlset>\n",
        encoding="utf-8",
    )

    og()
    print("klart:", sorted(p.name for p in APP.iterdir()))


if __name__ == "__main__":
    main()