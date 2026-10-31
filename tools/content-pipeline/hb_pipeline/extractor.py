from __future__ import annotations

from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .errors import ValidationError
from .models import PageExtraction
from .utils import ensure_http_url, normalize_url
from .validation import validate_extraction


def _meta_content(soup: BeautifulSoup, *queries: tuple[str, str]) -> str:
    for key, value in queries:
        tag = soup.find("meta", attrs={key: value})
        if tag and tag.get("content"):
            return tag["content"].strip()
    return ""


def extract_page(html: bytes, base_url: str) -> PageExtraction:
    if not html or not html.strip():
        raise ValidationError("Extraction received empty HTML; no draft was saved.")
    base_url = ensure_http_url(base_url)
    soup = BeautifulSoup(html, "html.parser")

    for tag in soup(["script", "style", "noscript", "template", "nav", "footer", "aside", "form"]):
        tag.decompose()

    title = ""
    if soup.title and soup.title.string:
        title = " ".join(soup.title.string.split())

    canonical = ""
    canonical_tag = soup.find(
        "link",
        rel=lambda value: value and "canonical" in value,
    )
    if canonical_tag and canonical_tag.get("href"):
        try:
            canonical = ensure_http_url(urljoin(base_url, canonical_tag["href"]))
        except ValueError:
            canonical = ""

    description = _meta_content(
        soup,
        ("name", "description"),
        ("property", "og:description"),
        ("name", "twitter:description"),
    )

    language = ""
    if soup.html and soup.html.get("lang"):
        language = soup.html.get("lang", "").strip()

    headings: list[str] = []
    for heading in soup.find_all(["h1", "h2", "h3"]):
        text = " ".join(heading.get_text(" ", strip=True).split())
        if text and text not in headings:
            headings.append(text)

    paragraphs: list[str] = []
    for paragraph in soup.find_all("p"):
        text = " ".join(paragraph.get_text(" ", strip=True).split())
        if len(text) >= 40 and text not in paragraphs:
            paragraphs.append(text)

    image_candidates: list[dict[str, str]] = []

    def add_image(url: str, source: str, alt: str = "") -> None:
        if not url.strip():
            return
        try:
            absolute = normalize_url(urljoin(base_url, url.strip()))
        except ValueError:
            return
        if any(item["url"] == absolute for item in image_candidates):
            return
        image_candidates.append(
            {
                "url": absolute,
                "source": source,
                "alt": alt.strip(),
                "license_status": "unverified",
            }
        )

    for prop in ("og:image", "twitter:image"):
        tag = (
            soup.find("meta", attrs={"property": prop})
            or soup.find("meta", attrs={"name": prop})
        )
        if tag and tag.get("content"):
            add_image(tag["content"], prop)

    for image in soup.find_all("img")[:50]:
        src = image.get("src") or image.get("data-src")
        if src:
            add_image(src, "img", image.get("alt", ""))

    extraction = PageExtraction(
        title=title,
        canonical_url=canonical,
        meta_description=description,
        language=language,
        headings=headings[:100],
        paragraphs=paragraphs[:500],
        image_candidates=image_candidates[:100],
    )

    validate_extraction(extraction)
    return extraction
