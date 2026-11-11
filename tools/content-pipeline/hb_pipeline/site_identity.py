"""Conservative identity normalization used only for review, never for rewriting records."""
import unicodedata
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from .utils import normalize_url

GOVERNORATES = {"nineveh", "duhok", "erbil", "kirkuk", "salahaldin", "sulaymaniyah", "baghdad", "anbar", "babylon", "basra", "dhiqar", "diyala", "karbala", "maysan", "muthanna", "najaf", "qadisiyyah", "wasit", "halabja"}
ALIASES = {"ninewa": "nineveh", "ninawa": "nineveh", "ninevah": "nineveh", "dohuk": "duhok", "arbil": "erbil", "slemani": "sulaymaniyah", "sulaimaniyah": "sulaymaniyah", "sulaimaniya": "sulaymaniyah", "sulaymaniya": "sulaymaniyah", "saladin": "salahaldin", "salahuddin": "salahaldin", "salahaddin": "salahaldin"}
NAME_FIELDS = ("alternativeNames", "alternative_names", "altNames", "aliases")


def normalize_name(value):
    if not isinstance(value, str):
        return ""
    text = "".join(char for char in unicodedata.normalize("NFKD", value.casefold()) if not unicodedata.combining(char))
    return " ".join("".join(char if char.isalnum() else " " for char in text).split())


def governorate_key(value):
    key = normalize_name(value).replace("governorate", "")
    key = "".join(char for char in key if char.isalnum())
    return ALIASES.get(key, key)


def site_names(record):
    if not isinstance(record, dict):
        return set()
    values = [record.get("name")]
    for field in NAME_FIELDS:
        aliases = record.get(field, [])
        values.extend(aliases if isinstance(aliases, list) else [aliases])
    return {text for value in values if (text := normalize_name(value))}


def identity_url(value):
    """Normalized source URL, or None when it cannot be parsed."""
    try:
        parsed = urlparse(normalize_url(value))
    except (ValueError, TypeError):
        return None
    # Tracking parameters are irrelevant to a possible identity match.
    query = [(key, value) for key, value in parse_qsl(parsed.query, keep_blank_values=True) if not key.casefold().startswith("utm_") and key.casefold() not in {"fbclid", "gclid"}]
    return urlunparse(parsed._replace(query=urlencode(sorted(query))))


def source_urls(record):
    if not isinstance(record, dict) or not isinstance(record.get("sources"), list):
        return set()
    return {url for source in record["sources"] if isinstance(source, dict) and (url := identity_url(source.get("url")))}


def primary_source_url(record):
    sources = record.get("sources") if isinstance(record, dict) else None
    if isinstance(sources, list) and sources and isinstance(sources[0], dict):
        return identity_url(sources[0].get("url"))
    return None


def site_wikidata_item(record):
    """Wikidata item whose coordinates mark this exact site (not a town or an approximate point)."""
    if not isinstance(record, dict) or record.get("coordinates_precision") != "site":
        return None
    value = record.get("coordinates_source")
    return value if isinstance(value, str) and value.startswith("wikidata:") else None
