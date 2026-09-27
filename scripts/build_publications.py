#!/usr/bin/env python3
"""Render publication cards from publications.toml into index.html and index-ja.html.

Usage:
    python3 scripts/build_publications.py          # rewrite both pages
    python3 scripts/build_publications.py --check  # exit 1 if a page is out of date

Only the block between the PUBLICATIONS:START / PUBLICATIONS:END markers in each
page is touched; everything else (news, bio, footer) stays hand-edited.
Needs Python 3.11+ (tomllib), no third-party packages.
"""
from __future__ import annotations

import html
import re
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "publications.toml"
PAGES = {"en": ROOT / "index.html", "ja": ROOT / "index-ja.html"}
START = "<!-- PUBLICATIONS:START"
END = "<!-- PUBLICATIONS:END -->"
BLOCK_RE = re.compile(rf"({re.escape(START)}[^\n]*\n)(.*?)(\n?{re.escape(END)})", re.DOTALL)
DEFAULT_WIDTH = 190

# One small inline icon per link kind (stroke icons in the style of the header
# links; colour follows the link via currentColor).
def _svg(body, box="0 0 24 24", fill="none"):
    stroke = '' if fill != "none" else ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
    return (f'<svg class="link-icon" width="14" height="14" viewBox="{box}" fill="{fill}"{stroke} aria-hidden="true">'
            f'{body}</svg>')


LINK_ICONS = {
    # document with folded corner
    "paper": _svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>'),
    "paper_ja": _svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>'),
    # arXiv logo (Simple Icons, CC0)
    "arxiv": _svg('<path d="M3.8423 0a1.0037 1.0037 0 0 0-.922.6078c-.1536.3687-.0438.6275.2938 1.1113l6.9185 8.3597-1.0223 1.1058a1.0393 1.0393 0 0 0 .003 1.4229l1.2292 1.3135-5.4391 6.4444c-.2803.299-.4538.823-.2971 1.1986a1.0253 1.0253 0 0 0 .9585.635.9133.9133 0 0 0 .6891-.3405l5.783-6.126 7.4902 8.0051a.8527.8527 0 0 0 .6835.2597.9575.9575 0 0 0 .8777-.6138c.1577-.377-.017-.7502-.306-1.1407l-7.0518-8.3418 1.0632-1.13a.9626.9626 0 0 0 .0089-1.3165L4.6336.4639s-.3733-.4535-.768-.463zm0 .272h.0166c.2179.0052.4874.2715.5644.3639l.005.006.0052.0055 10.169 10.9905a.6915.6915 0 0 1-.0072.945l-1.0666 1.133-1.4982-1.7724-8.5994-10.39c-.3286-.472-.352-.6183-.2592-.841a.7307.7307 0 0 1 .6704-.4401Zm14.341 1.5701a.877.877 0 0 0-.6554.2418l-5.6962 6.1584 1.6944 1.8319 5.3089-6.5138c.3251-.4335.479-.6603.3247-1.0292a1.1205 1.1205 0 0 0-.9763-.689zm-7.6557 12.2823 1.3186 1.4135-5.7864 6.1295a.6494.6494 0 0 1-.4959.26.7516.7516 0 0 1-.706-.4669c-.1119-.2682.0359-.6864.2442-.9083l.0051-.0055.0047-.0055z"/>', box="0 0 24 24", fill="currentColor"),
    # globe
    "website": _svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"/>'),
    # GitHub mark
    "code": _svg('<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>', box="0 0 16 16", fill="currentColor"),
    # database cylinder
    "data": _svg('<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/>'),
    # play button
    "video": _svg('<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"/>'),
    # presentation screen
    "slides": _svg('<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8"/>'),
    # framed picture
    "poster": _svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.6"/><path d="M21 16l-5-5-9 9"/>'),
    # quotation marks
    "bibtex": _svg('<path d="M10 7H6a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v3H5"/><path d="M20 7h-4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v3h-3"/>'),
}



def localized(value, lang: str, what: str) -> str:
    """Return the text for `lang` from a plain string or an {en, ja} table."""
    if isinstance(value, dict):
        if lang in value:
            return str(value[lang])
        if "en" in value:
            return str(value["en"])
        sys.exit(f"publications.toml: {what} has no '{lang}' or 'en' text")
    return str(value)


def author_html(entry, people: dict, lang: str, card: str) -> str:
    equal = isinstance(entry, str) and entry.endswith("*")
    if isinstance(entry, str):
        key = entry.rstrip("*")
        if key not in people:
            sys.exit(f"publications.toml: card '{card}' uses unknown author '{key}' (add it under [people.{key}])")
        person = people[key]
    else:
        person = entry
    name = html.escape(localized(person["name"], lang, "author name")) + ("*" if equal else "")
    url = person.get("url")
    if url:
        name = f'<a href="{html.escape(localized(url, lang, "author url"), quote=True)}">{name}</a>'
    if person.get("bold"):
        name = f"<strong>{name}</strong>"
    return name


def card_html(pub: dict, cfg: dict, lang: str) -> str:
    title = localized(pub["title"], lang, "title")
    authors = ", ".join(author_html(a, cfg.get("people", {}), lang, title) for a in pub["authors"])
    venue = f"<em>{localized(pub['venue'], lang, f'venue of {title!r}')}</em>"
    if "year" in pub:
        venue += f", {pub['year']}" + ("年" if lang == "ja" else "")

    labels = cfg.get("link_labels", {})
    links = []
    for key, url in pub.get("links", {}).items():
        if key not in labels:
            sys.exit(f"publications.toml: card '{title}' uses unknown link '{key}' (add it under [link_labels])")
        label = html.escape(localized(labels[key], lang, f"link label '{key}'"))
        icon = LINK_ICONS.get(key, "")
        links.append(f'<a href="{html.escape(str(url), quote=True)}">{icon}{label}</a>')

    width = pub.get("image_width", DEFAULT_WIDTH)
    alt = html.escape(title.split(":")[0].strip(), quote=True)
    return "\n".join([
        "<tr>",
        '<td style="padding:20px;width:25%;vertical-align:middle;text-align:center;">',
        f'<img src="{html.escape(str(pub["image"]), quote=True)}" width="{width}" alt="{alt}" class="paper-thumb">',
        "</td>",
        '<td style="padding:20px;width:75%;vertical-align:middle">',
        f"<papertitle>{html.escape(title)}</papertitle>",
        "<br>",
        f"{authors} <br>",
        "<br>",
        f"{venue} &nbsp;",
        "<br>",
        " /\n".join(links),
        "<p></p>",
        "</td>",
        "</tr>",
    ])


def render(cfg: dict, lang: str) -> str:
    cards = [p for p in cfg.get("publications", []) if not p.get("hidden")]
    return "\n\n".join(card_html(p, cfg, lang) for p in cards)


def main() -> int:
    check = "--check" in sys.argv[1:]
    cfg = tomllib.loads(DATA.read_text(encoding="utf-8"))
    stale = []
    for lang, page in PAGES.items():
        original = page.read_text(encoding="utf-8")
        if not BLOCK_RE.search(original):
            sys.exit(f"{page.name}: PUBLICATIONS:START / PUBLICATIONS:END markers not found")
        block = render(cfg, lang)
        updated = BLOCK_RE.sub(lambda m: m.group(1) + block + "\n" + END, original, count=1)
        if updated == original:
            print(f"{page.name}: up to date")
            continue
        stale.append(page.name)
        if not check:
            page.write_text(updated, encoding="utf-8")
            print(f"{page.name}: regenerated")
    if check and stale:
        print(f"Out of date: {', '.join(stale)}. Run scripts/build_publications.py and commit.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
