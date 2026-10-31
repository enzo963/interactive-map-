"""Conservative image identity and unpublished cover proposals; no media downloads."""
import copy
import re
from urllib.parse import unquote, urljoin, urlparse

from .errors import PipelineError
from .image_licenses import license_state
from .site_identity import GOVERNORATES, governorate_key, site_names, normalize_name
from .utils import normalize_url, host_matches

GENERIC_NAMES = {"heritage site", "heritage", "site", "citadel", "bridge", "museum", "iraq", "kurdistan", "ancient city"}
DECORATIVE = re.compile(r"(?:^|[\s_./-])(?:logo|icon|avatar|spinner|placeholder|spacer|tracking|banner-ad)(?:$|[\s_./-])", re.I)


def _text(node):
    return " ".join(node.get_text(" ", strip=True).split()) if node else ""


def _names(site):
    return {name for name in site_names(site) if name not in GENERIC_NAMES and governorate_key(name) not in GOVERNORATES and len(name) >= 4}


def _matches(value, names):
    normalized = " " + normalize_name(value) + " "
    return sorted(name for name in names if " " + name + " " in normalized)


def _dimension(value):
    return int(value) if isinstance(value, (str, int)) and re.fullmatch(r"[1-9][0-9]{0,5}", str(value)) else None


def _absolute(value, page_url):
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        return normalize_url(urljoin(page_url, value.strip()))
    except ValueError:
        return None


def _srcset(value, page_url):
    result = []
    if not isinstance(value, str):
        return result
    for item in value.split(","):
        parts = item.split()
        if not parts or len(parts) > 2:
            continue
        url = _absolute(parts[0], page_url)
        if not url:
            continue
        descriptor = parts[1] if len(parts) == 2 else "1x"
        if re.fullmatch(r"[1-9][0-9]*w", descriptor):
            width = int(descriptor[:-1])
            result.append((width, url, width))
        elif re.fullmatch(r"(?:[1-9][0-9]*|[0-9]+\.[0-9]+)x", descriptor):
            result.append((float(descriptor[:-1]), url, None))
    return result


class ImageIdentityIndex:
    """Prepared catalog names for bulk image matching; same exact-name rules."""
    def __init__(self, records):
        self.by_first = {}
        for record in records:
            if not isinstance(record, dict):
                continue
            owner = record.get("id")
            if not isinstance(owner, (str, int, float, bool, type(None))):
                owner = None
            for name in _names(record):
                tokens = tuple(name.split())
                self.by_first.setdefault(tokens[0], {}).setdefault(tokens, set()).add(owner)

    def match(self, text):
        tokens = normalize_name(text).split()
        owners = set()
        for start, token in enumerate(tokens):
            for name, ids in self.by_first.get(token, {}).items():
                if tuple(tokens[start:start + len(name)]) == name:
                    owners.update(ids)
        return owners


def _association(contexts, site, known_sites):
    if site is None:
        return None, "unassigned", [], ["No target site was supplied; page location is not an identity match."]
    names = _names(site)
    direct, filename, matched_sites = [], [], set()
    catalog = known_sites if isinstance(known_sites, ImageIdentityIndex) else ImageIdentityIndex(list(known_sites or []) + [site])
    for context in contexts:
        for key in ("alt", "caption", "title"):
            hits = _matches(context.get(key, ""), names)
            if hits:
                direct.append({"kind": key, "matched_names": hits, "text": context[key]})
                matched_sites.add(site["id"])
            matched_sites.update(catalog.match(context.get(key, "")))
        hits = _matches(context.get("filename", ""), names)
        if hits:
            filename.append({"kind": "filename", "matched_names": hits, "text": context["filename"]})
            matched_sites.add(site["id"])
        matched_sites.update(catalog.match(context.get("filename", "")))
    others = matched_sites - {site["id"]}
    if others:
        return None, "ambiguous" if direct or filename else "unmatched", direct + filename, ["Image metadata identifies other catalog sites: " + ", ".join(sorted(str(value) for value in others))]
    if direct:
        return site["id"], "matched-unverified", direct + filename, ["Explicit image metadata names the target; visual and identity review is still required."]
    if filename:
        return None, "uncertain", filename, ["Only the image filename matches. No siteId was assigned."]
    return None, "unmatched", [], ["No image-specific name or alias match; governorate and page placement are insufficient."]


def discover_images(root, metadata, page_url, target_site=None, source=None, known_sites=None):
    if target_site is not None and (not isinstance(target_site, dict) or not isinstance(target_site.get("id"), str) or not target_site["id"].strip() or not site_names(target_site)):
        raise ValueError("Image association requires a target site with a stable id and name.")
    source_trusted = source is not None and host_matches(urlparse(page_url).hostname or "", source.domains)
    images = {}

    def add(url, kind, alt="", caption="", title="", width=None, height=None, license_hint="", license_url="", credit="", variants=None):
        absolute = _absolute(url, page_url)
        if not absolute or DECORATIVE.search(unquote(urlparse(absolute).path) + " " + alt):
            return
        if width and height and (width < 80 or height < 80):
            return
        context = {"kind": kind, "alt": alt.strip(), "caption": caption.strip(), "title": title.strip(),
                   "filename": unquote(urlparse(absolute).path.rsplit("/", 1)[-1]),
                   "license_hint": license_hint, "license_url": license_url, "credit": credit}
        item = images.setdefault(absolute, {"url": absolute, "alt": alt.strip(), "caption": caption.strip(), "source": kind,
            "source_url": page_url, "source_id": source.id if source_trusted else None,
            "source_name": source.name if source_trusted else "", "trust_tier": source.trust_tier if source_trusted else None,
            "license_status": "unverified" if license_hint or license_url else "unknown", "license_hint": license_hint, "license_url": license_url,
            "credit": credit, "width": width, "height": height, "contexts": [], "variants": variants or []})
        if context not in item["contexts"]:
            item["contexts"].append(context)
        for key, value in (("alt", alt), ("caption", caption), ("license_hint", license_hint), ("license_url", license_url), ("credit", credit)):
            if value and not item[key]:
                item[key] = value
        item["license_status"] = "unverified" if item["license_hint"] or item["license_url"] else "unknown"
        if width:
            item["width"] = max(item["width"] or 0, width)
        if height:
            item["height"] = max(item["height"] or 0, height)

    for value, kind, alt in metadata:
        add(value, kind, alt=alt)
    for image in root.find_all("img")[:500]:
        figure = image.find_parent("figure")
        caption = _text(figure.find("figcaption")) if figure else ""
        title = str(image.get("title", ""))
        license_tag = figure.find("a", rel=lambda value: value and "license" in value) if figure else None
        license_hint = _text(license_tag)
        license_url = _absolute(license_tag.get("href"), page_url) if license_tag else ""
        credit_tag = figure.select_one(".credit, .attribution, [itemprop=creditText]") if figure else None
        width, height = _dimension(image.get("width")), _dimension(image.get("height"))
        variants = []
        for attr in ("data-srcset", "srcset"):
            variants.extend(_srcset(image.get(attr), page_url))
        picture = image.find_parent("picture")
        if picture:
            for tag in picture.find_all("source"):
                variants.extend(_srcset(tag.get("data-srcset") or tag.get("srcset"), page_url))
        urls = [image.get(attr) for attr in ("data-src", "data-original", "data-lazy-src", "src")]
        src = next((value for value in urls if _absolute(value, page_url) and not DECORATIVE.search(str(value))), None)
        if variants:
            _, src, declared_width = max(variants, key=lambda item: item[0])
            if declared_width:
                # A srcset width describes that variant, not the fallback's height.
                height = round(height * declared_width / width) if width and height else None
                width = declared_width
        if src:
            add(src, "img", str(image.get("alt", "")), caption, title, width, height,
                license_hint, license_url or "", _text(credit_tag),
                [{"url": url, "declared_width": w} for _, url, w in variants])
    result = []
    for item in images.values():
        sid, status, basis, notes = _association(item["contexts"], target_site, known_sites)
        item.update({"siteId": sid, "targetSiteId": target_site["id"] if target_site else None,
                     "association_status": status, "association_evidence": basis,
                     "review_required": True, "verification_status": "unverified", "review_notes": notes})
        result.append(item)
    # Relevant matches survive the output limit ahead of page-wide unknowns.
    return sorted(result, key=lambda item: (item["association_status"] != "matched-unverified", item["association_status"] != "uncertain"))


def select_cover(candidates, site_id, registry):
    """Return a review-only cover proposal, never mutate a site's existing cover."""
    eligible, rejected = [], []
    restricted_urls = set()
    for candidate in candidates:
        if license_state(candidate) == "restricted":
            try:
                restricted_urls.add(normalize_url(candidate.get("url")))
            except (ValueError, TypeError):
                pass
    for candidate in candidates:
        reasons = []
        if license_state(candidate) == "restricted":
            reasons.append("Image licensing is restricted.")
        if candidate.get("siteId") != site_id or candidate.get("association_status") != "matched-unverified":
            reasons.append("No explicit, unambiguous association with the requested siteId.")
        try:
            url = normalize_url(candidate.get("url"))
            if url in restricted_urls and license_state(candidate) != "restricted":
                reasons.append("Another observation restricts this same image URL.")
            source = registry.get(candidate.get("source_id"))
            if not host_matches(urlparse(normalize_url(candidate.get("source_url", ""))).hostname or "", source.domains):
                reasons.append("Page URL is outside the registered source domains.")
            if not set(source.allowed_content).intersection({"facts", "image_candidates", "image_metadata"}):
                reasons.append("Source does not permit image content.")
        except (ValueError, TypeError, KeyError, PipelineError) as exc:
            reasons.append(str(exc))
            source = None
        width, height = _dimension(candidate.get("width")), _dimension(candidate.get("height"))
        if (width and width < 320) or (height and height < 180):
            reasons.append("Declared image dimensions are too small for a cover.")
        if reasons:
            rejected.append({"url": candidate.get("url"), "reasons": reasons})
            continue
        strength = max((3 if hit["kind"] == "alt" else 2 for hit in candidate.get("association_evidence", []) if hit.get("kind") != "filename"), default=0)
        area = (width or 0) * (height or 0)
        rank = (source.trust_tier, -strength, -area)
        eligible.append((rank, candidate, url, source))
    eligible.sort(key=lambda item: (item[0], item[2]))
    tied = len(eligible) > 1 and eligible[0][0] == eligible[1][0]
    chosen = eligible[0] if eligible and not tied else None
    proposal = None
    if chosen:
        _, item, url, source = chosen
        proposal = {"src": url, "alt": item.get("alt", ""), "caption": item.get("caption", ""),
                    "credit": item.get("credit", ""), "license": item.get("license_hint", ""),
                    "siteId": site_id, "sourceId": source.id, "sourceName": source.name,
                    "sourceUrl": item["source_url"], "evidenceId": item.get("evidenceId"),
                    "license_status": license_state(item), "verification_status": "unverified", "review_required": True}
        for key in ("license_url", "license_review", "license_tracking", "publication_approval"):
            if key in item:
                proposal[key] = copy.deepcopy(item[key])
    return {"siteId": site_id, "proposed_coverImage": proposal,
            "status": "tie-needs-review" if tied else "proposed-unverified" if chosen else "no-eligible-image",
            "ranked_candidates": [{"url": item[2], "trust_tier": item[3].trust_tier, "rank": list(item[0])} for item in eligible],
            "rejected_candidates": rejected, "manual_review_required": True, "automatically_approved": False,
            "notes": ["Lower registry trust tier ranks first, then explicit name match and declared image area.",
                      "Equal best ranks require manual selection. Dimensions, visual identity, licenses and attribution require review.",
                      "A trusted page is not proof of image ownership or a reuse license. No image was downloaded."]}
