"""Helpers for deriving a presentable candidate name."""
import json
import logging
import os
import re
from typing import Optional

logger = logging.getLogger(__name__)

# Minimum number of characters of extracted text before we bother calling the
# LLM. Below this we assume the PDF is image-only/scanned and the filename is
# the best we have.
_LLM_MIN_TEXT_LEN = 80

# Slice of CV passed to the LLM — keep it small to bound cost/latency. We send
# both the top of the document (where names usually are) and a tail snippet
# (which often contains the email signature when the name isn't at the top).
_LLM_HEAD_CHARS = 2000
_LLM_TAIL_CHARS = 800

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


def _slice_for_llm(cv_text: str) -> str:
    """Return a head+tail slice of the CV bounded by character limits."""
    text = cv_text.strip()
    if len(text) <= _LLM_HEAD_CHARS + _LLM_TAIL_CHARS:
        return text
    return f"{text[:_LLM_HEAD_CHARS]}\n...\n{text[-_LLM_TAIL_CHARS:]}"


def extract_candidate_name_llm(cv_text: str) -> Optional[str]:
    """Ask a small LLM to pick the candidate's name out of the CV text.

    Designed as a fallback for cases the heuristic can't handle:
    non-Latin scripts (Arabic etc.), names buried in email signatures,
    layouts that lead with a logo/address/job title.

    Returns ``None`` on any failure (missing key, network error, ambiguous
    output) so callers can keep falling back to the filename. Skips the call
    entirely when there's almost no extracted text (likely a scanned PDF) to
    avoid wasted spend.
    """
    if not cv_text or len(cv_text.strip()) < _LLM_MIN_TEXT_LEN:
        return None
    if not os.getenv("OPENAI_API_KEY"):
        return None

    try:
        from langchain_openai import ChatOpenAI
    except Exception as e:  # pragma: no cover - import error path
        logger.warning("langchain_openai unavailable for LLM name extraction: %s", e)
        return None

    snippet = _slice_for_llm(cv_text)
    prompt = (
        "You extract the candidate's full name from a CV/resume. "
        "The CV may be in any language or script (Arabic, Chinese, Cyrillic, etc.). "
        "The name might appear at the top, inside an email signature, next to a "
        "photo caption, or after a 'Name:' label. Ignore company names, job "
        "titles, addresses, and section headings like 'Curriculum Vitae'.\n\n"
        "Return strict JSON of the form {\"name\": \"<full name>\"} using the "
        "name exactly as written in the CV (preserve original script and "
        "diacritics). If you cannot confidently identify a person's name, "
        "return {\"name\": null}.\n\n"
        f"CV TEXT:\n{snippet}"
    )

    try:
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, timeout=15)
        response = llm.invoke(prompt)
        raw = (response.content or "").strip()
    except Exception as e:
        logger.warning("LLM name extraction failed: %s", e)
        return None

    # Tolerate ```json fences``` or stray prose around the JSON object.
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return None
    try:
        payload = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None

    name = payload.get("name") if isinstance(payload, dict) else None
    if not isinstance(name, str):
        return None
    name = name.strip()
    if not name or name.lower() in {"null", "none", "unknown"}:
        return None
    # Guard against the model echoing a section header.
    if name.lower() in _HEADER_NOISE or name.lower() in _SECTION_WORDS:
        return None
    # Collapse whitespace; keep original script/casing otherwise.
    return re.sub(r"\s+", " ", name)


def resolve_candidate_name(cv_text: Optional[str], filename: Optional[str]) -> str:
    """Best name we can produce: heuristic → LLM fallback → cleaned filename.

    The heuristic is fast and conservative, so we try it first. When it can't
    find a plausible name (non-Latin script, name buried in a signature, etc.)
    we ask a small LLM. If that also can't help — or there's effectively no
    extracted text (image PDF) — we fall back to the cleaned filename.
    """
    cv_text = cv_text or ""
    heuristic = extract_candidate_name(cv_text)
    if heuristic:
        return heuristic
    llm_name = extract_candidate_name_llm(cv_text)
    if llm_name:
        return llm_name
    return clean_name_from_filename(filename or "")


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
