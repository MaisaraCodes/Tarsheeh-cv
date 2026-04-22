"""Locale plumbing for the AR/EN-aware pipeline.

The API contract carries `locale` ("en" or "ar") on POST /job. Persisting it
without a schema migration is done by stashing the value inside the existing
`parsed_profile` JSONB column under the reserved key `_locale`. Helpers here
add or strip that key so the rest of the code never sees it leak into the
JobProfile pydantic model.
"""
from typing import Any, Dict, Optional, Tuple

LOCALE_KEY = "_locale"
DEFAULT_LOCALE = "en"
SUPPORTED_LOCALES = {"en", "ar"}


def normalize_locale(value: Optional[str]) -> str:
    """Coerce arbitrary input into one of the supported locale codes."""
    if not value:
        return DEFAULT_LOCALE
    v = value.strip().lower()
    return v if v in SUPPORTED_LOCALES else DEFAULT_LOCALE


def stash_locale(profile_dict: Dict[str, Any], locale: str) -> Dict[str, Any]:
    """Return a copy of profile_dict with the resolved locale embedded."""
    out: Dict[str, Any] = dict(profile_dict or {})
    out[LOCALE_KEY] = normalize_locale(locale)
    return out


def pop_locale(profile_dict: Optional[Dict[str, Any]]) -> Tuple[Dict[str, Any], str]:
    """Split a stored parsed_profile into (clean JobProfile dict, locale)."""
    if not profile_dict:
        return {}, DEFAULT_LOCALE
    out = dict(profile_dict)
    locale = normalize_locale(out.pop(LOCALE_KEY, None))
    return out, locale
