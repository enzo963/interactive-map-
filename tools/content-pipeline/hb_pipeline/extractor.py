from __future__ import annotations

import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .errors import ValidationError
from .models import PageExtraction
from .utils import ensure_http_url, normalize_url
from .validation import validate_extraction
from .images import discover_images
from .site_identity import normalize_name


def text(node):
    return " ".join(node.get_text(" ", strip=True).split()) if node else ""


def _meta_content(soup, *queries):
    for key, value in queries:
        tag = soup.find("meta", attrs={key: re.compile("^" + re.escape(value) + "$", re.I)})
        if tag and isinstance(tag.get("content"), str) and tag["content"].strip():
            return " ".join(tag["content"].split())
    return ""


NOISE = re.compile(r"(?:^|[\s_-])(?:navigation|navbar|menu|breadcrumb|footer|sidebar|cookie|consent|share|sharing|social|related|recommended|newsletter|pagination|advertisement|advert|comments)(?:$|[\s_-])", re.I)


def clean_content(soup):
    for node in list(soup.find_all(True)):
        if node.parent is None:
            continue
        role = str(node.get("role", "")).casefold()
        label = " ".join([str(node.get("id", "")), " ".join(node.get("class", [])), str(node.get("aria-label", ""))])
        style = re.sub(r"\s+", "", str(node.get("style", "")).casefold())
        hidden = node.has_attr("hidden") or str(node.get("aria-hidden", "")).lower() == "true" or "display:none" in style or "visibility:hidden" in style
        banner = node.name == "header" and not node.find_parent(["main", "article"])
        if node.name in {"script", "style", "noscript", "template", "nav", "footer", "aside", "form", "button", "svg", "iframe"} or role in {"navigation", "contentinfo", "complementary", "banner", "dialog"} or (node.name not in {"html", "body"} and NOISE.search(label)) or hidden or banner:
            node.decompose()

    # Some official templates label supplementary card modules with named
    # anchors rather than semantic headings or related-content classes.
    for anchor in list(soup.select('a[name="news"], a[name="activities"], a[name="links"]')):
        module = anchor.find_parent("section") or anchor.find_parent(class_="border-top")
        if module and module.name not in {"html", "body", "main", "article"} and not module.find("h1"):
            module.decompose()


def content_root(soup):
    # Main landmarks preserve multiple useful sections. Article headers remain.
    roots = soup.select("main, [role=main]")
    if not roots:
        roots = soup.select("article")
    if not roots:
        roots = soup.select("#content, #main-content, .entry-content, .article-content, .mw-parser-output")
    if roots:
        return max(roots, key=lambda root: len(text(root)))
    return soup.body or soup


def useful_text(node):
    value = text(node)
    # Link lists and navigation-like paragraphs should not become descriptions.
    linked = sum(len(text(link)) for link in node.find_all("a"))
    return value if len(value) >= 40 and linked / max(len(value), 1) < .65 else ""


def extract_page(html: bytes, base_url: str, target_site=None, source=None, known_sites=None) -> PageExtraction:
    if not html or not html.strip():
        raise ValidationError("Extraction received empty HTML; no draft was saved.")
    base_url = ensure_http_url(base_url)
    soup = BeautifulSoup(html, "html.parser")
    document_title = text(soup.title)
    meta_title = _meta_content(soup, ("property", "og:title"), ("name", "twitter:title"))
    description = _meta_content(soup, ("name", "description"), ("property", "og:description"), ("name", "twitter:description"))
    language = str(soup.html.get("lang") or soup.html.get("xml:lang") or "") if soup.html else ""
    language = language.strip() or _meta_content(soup, ("http-equiv", "content-language"), ("property", "og:locale"))
    language = language.replace("_", "-")
    if not re.fullmatch(r"[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*", language):
        language = ""
    canonical = ""
    for link in soup.find_all("link"):
        if "canonical" in [str(value).lower() for value in link.get("rel", [])] and link.get("href"):
            try:
                canonical = normalize_url(urljoin(base_url, link["href"].strip()))
                break
            except ValueError:
                pass
    # Keep image metadata before cleaning the page; it is not identity evidence.
    image_meta = []
    for key in ("og:image", "og:image:url", "twitter:image", "twitter:image:src"):
        value = _meta_content(soup, ("property", key), ("name", key))
        if value:
            alt_key = "og:image:alt" if key.startswith("og:") else "twitter:image:alt"
            image_meta.append((value, key, _meta_content(soup, ("property", alt_key), ("name", alt_key))))
    clean_content(soup)
    root = content_root(soup)
    headings = list(dict.fromkeys(value for node in root.find_all(["h1", "h2", "h3", "h4"]) if (value := text(node))))
    h1 = root.find("h1")
    # Error pages must still be rejected even when their article heading looks valid.
    blocked = ("access denied", "just a moment", "verify you are human", "403 forbidden", "404 not found", "page not found")
    if any(term in document_title.casefold() for term in blocked):
        raise ValidationError("Extraction appears to be an error or access-challenge page; inspect the source manually.")
    title = text(h1) or meta_title or document_title
    # A corporate masthead H1 can precede the real page heading on older sites.
    title_parts = {normalize_name(part) for part in re.split(r"[|»]", document_title) if part.strip()}
    for heading in headings:
        if normalize_name(heading) in title_parts:
            title = heading
            break
    paragraphs = []
    for node in root.find_all(["p", "li", "dd", "blockquote"]):
        if node.name in {"li", "blockquote", "dd"} and node.find(["p", "li", "dd", "blockquote"]):
            continue
        value = useful_text(node)
        if value and value not in paragraphs:
            paragraphs.append(value)
    if not paragraphs:
        # Plain text content containers are common on older official pages.
        for node in root.find_all("div"):
            if not node.find(["div", "p", "li", "table", "figure"]):
                value = useful_text(node)
                if value and value not in paragraphs:
                    paragraphs.append(value)
    if len(description) < 40 and paragraphs:
        description = paragraphs[0]
    images = discover_images(root, image_meta, base_url, target_site, source, known_sites)
    extraction = PageExtraction(title=title, canonical_url=canonical, meta_description=description,
                                language=language, headings=headings[:100], paragraphs=paragraphs[:500],
                                image_candidates=images[:100])
    validate_extraction(extraction)
    return extraction
