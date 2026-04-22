"""Helpers for deriving a presentable candidate name."""
import re
from typing import Optional

# Words/phrases that often appear at the top of a CV but are NOT the candidate's name.
_HEADER_NOISE = {
    "curriculum vitae", "curriculum", "vitae", "resume", "résumé", "cv",
    "personal profile", "profile", "summary", "professional summary",
    "contact", "contact information", "contact details", "personal details",
    "about me", "about", "objective", "career objective", "biodata",
}

# Section words that, if a "name-shaped" line equals one of these, we should skip.
_SECTION_WORDS = {
    "education", "experience", "work experience", "skills", "projects",
    "certifications", "languages", "references", "interests", "hobbies",
    "achievements", "awards", "publications",
}

# Filename prefixes to strip when falling back to the file stem.
_FILENAME_PREFIXES = (
    "cv", "c.v", "resume", "résumé", "curriculum vitae", "curriculum",
    "candidate",
)

_NAME_TOKEN_RE = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'’\-\.]{0,30}$")


def _looks_like_name(line: str) -> bool:
    stripped = line.strip().strip("•·-—_=*").strip()
    if not stripped:
        return False
    if any(ch.isdigit() for ch in stripped):
        return False
    if any(ch in stripped for ch in "@/\\|{}[]()<>"):
        return False
    lower = stripped.lower()
    if lower in _HEADER_NOISE or lower in _SECTION_WORDS:
        return False
    # Reject if any header noise phrase consumes most of the line.
    for noise in _HEADER_NOISE:
        if lower == noise or lower.startswith(noise + " ") or lower.endswith(" " + noise):
            return False
    tokens = stripped.split()
    if not (2 <= len(tokens) <= 5):
        return False
    if not all(_NAME_TOKEN_RE.match(t) for t in tokens):
        return False
    # At least two tokens should look like proper name parts (start uppercase or all caps).
    proper = sum(1 for t in tokens if t[0].isupper() or t.isupper())
    if proper < 2:
        return False
    return True


def _normalize_name(line: str) -> str:
    cleaned = line.strip().strip("•·-—_=*").strip()
    # If the line is in ALL CAPS or all lower, title-case it; otherwise preserve casing.
    if cleaned.isupper() or cleaned.islower():
        return " ".join(part.capitalize() for part in cleaned.split())
    return " ".join(cleaned.split())


def extract_candidate_name(cv_text: str) -> Optional[str]:
    """Best-effort extraction of a candidate's name from the top of a CV.

    Returns None when no plausible name is found, so callers can fall back to
    the filename. Designed to be cheap (no LLM call) and conservative — better
    to return None than to surface garbage.
    """
    if not cv_text:
        return None
    # Look at a generous window of the top of the document — many CVs have
    # logos/headers above the name.
    lines = [ln for ln in cv_text.splitlines() if ln.strip()]
    for line in lines[:20]:
        candidate = line.strip()
        # Strip an optional "Name:" / "Full Name:" prefix.
        m = re.match(r"^(?:full\s+name|name)\s*[:\-]\s*(.+)$", candidate, re.IGNORECASE)
        if m:
            candidate = m.group(1).strip()
        if _looks_like_name(candidate):
            return _normalize_name(candidate)
    return None


def clean_name_from_filename(filename: str) -> str:
    """Title-case a filename stem into something presentable.

    Strips common prefixes like ``cv_``/``resume-`` and collapses separators.
    """
    if not filename:
        return "Unnamed candidate"
    stem = filename.rsplit("/", 1)[-1].rsplit(".", 1)[0]
    cleaned = re.sub(r"[_\-]+", " ", stem).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    if not cleaned:
        return "Unnamed candidate"
    lower = cleaned.lower()
    # Strip a leading prefix like "cv ", "resume ", "curriculum vitae ".
    for prefix in sorted(_FILENAME_PREFIXES, key=len, reverse=True):
        if lower == prefix:
            cleaned = ""
            break
        if lower.startswith(prefix + " "):
            cleaned = cleaned[len(prefix) + 1:].strip()
            break
    if not cleaned:
        return "Unnamed candidate"
    # Title-case while preserving already-mixed-case tokens (e.g. "McAdam").
    parts = []
    for part in cleaned.split():
        parts.append(part if any(c.isupper() for c in part[1:]) else part.capitalize())
    return " ".join(parts)
