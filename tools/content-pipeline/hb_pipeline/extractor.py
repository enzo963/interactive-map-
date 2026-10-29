from __future__ import annotations

from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .models import PageExtraction


def _meta_content(soup: BeautifulSoup, *queries: tuple[str, str]) -> str:
    for key, value in queries:
        tag = soup.find("meta", attrs={key: value})
        if tag and tag.get("content"):
            return tag["content"].strip()
    return ""


def extract_page(html: bytes, base_url: str) -> PageExtraction:
    soup = BeautifulSoup(html, "html.parser")

    for tag in soup(["script", "style", "noscript", "template"]):
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
        canonical = urljoin(base_url, canonical_tag["href"])

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
        if len(text) >= 40:
            paragraphs.append(text)

    image_candidates: list[dict[str, str]] = []

    def add_image(url: str, source: str, alt: str = "") -> None:
        absolute = urljoin(base_url, url.strip())
        if not absolute.startswith(("http://", "https://")):
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

    return PageExtraction(
        title=title,
        canonical_url=canonical,
        meta_description=description,
        language=language,
        headings=headings[:100],
        paragraphs=paragraphs[:500],
        image_candidates=image_candidates[:100],
    )
