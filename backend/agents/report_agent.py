"""Report Agent — generates a PDF hiring report using ReportLab, 
incorporating an LLM-generated executive summary.

Locale-aware. In Arabic mode the renderer:
  - registers the Amiri TTF (regular + bold) for proper Arabic glyphs
  - shapes Arabic strings via arabic-reshaper + python-bidi so letters connect
    correctly and the visual order respects RTL
  - mirrors table column order (rank moves to the right edge)
  - right-aligns paragraphs and uses an Arabic label dictionary
"""
import os
import json
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional

import arabic_reshaper
from bidi.algorithm import get_display
from dotenv import load_dotenv

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import PydanticOutputParser

from backend.models.report import HiringReport

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)

# ---------------------------------------------------------------------------
# LLM Logic (from Osama's branch)
# ---------------------------------------------------------------------------

def compile_hiring_report(ranked_list: Dict[str, Any], job_profile: Dict[str, Any]) -> HiringReport:
    """
    Generates an executive hiring report summary based on the ranked candidates and job profile.
    
    :param ranked_list: The ranked candidates result dict.
    :param job_profile: The job profile dict.
    """
    llm = ChatOpenAI(model="gpt-4o", temperature=0.7)
    parser = PydanticOutputParser(pydantic_object=HiringReport)
    
    prompt_template = """You are an HR Consultant.
Your task is to write a comprehensive final hiring report summarizing the recruitment process for this role.

1. Inputs:
   - Ranked Candidates Summary: {ranked_list}
   - Job Profile: {job_profile}

2. Instructions:
   - Write an "Executive Summary" explaining how the hiring process went.
   - Provide a "Clear Recommendation" on who should be hired based on their ranking and skills, and explain why.
   - Add "Overall Hiring Insight" about the quality of the applicant pool (e.g., did the applicants possess the required skills, or does the job description need adjustments?).
   - Ensure the tone is formal, professional, and convincing.

Format your response strictly as a JSON object matching the following structure: {format_instructions}
"""
    
    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["ranked_list", "job_profile"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    chain = prompt | llm | parser
    
    result = chain.invoke({
        "ranked_list": json.dumps(ranked_list, ensure_ascii=False),
        "job_profile": json.dumps(job_profile, ensure_ascii=False)
    })
    
    return result


# ---------------------------------------------------------------------------
# PDF Rendering Logic (from remote branch)
# ---------------------------------------------------------------------------

# Brand palette
GOLD = colors.HexColor("#B08D57")
NOIR = colors.HexColor("#1A1A1A")
INK = colors.HexColor("#2C2C2C")
MUTED = colors.HexColor("#7A7A7A")
RULE = colors.HexColor("#D9D2C5")


# Font registration (Arabic). Done once on import; safe to call repeatedly.
_FONTS_DIR = Path(__file__).parent.parent / "assets" / "fonts"
_AR_FONT = "Amiri"
_AR_FONT_BOLD = "Amiri-Bold"
_ARABIC_FONTS_REGISTERED = False


def _register_arabic_fonts() -> bool:
    """Register Amiri Regular/Bold with ReportLab. Returns True on success."""
    global _ARABIC_FONTS_REGISTERED
    if _ARABIC_FONTS_REGISTERED:
        return True
    reg = _FONTS_DIR / "Amiri-Regular.ttf"
    bold = _FONTS_DIR / "Amiri-Bold.ttf"
    if not reg.exists() or not bold.exists():
        print(f"[REPORT] WARNING: Arabic font files missing under {_FONTS_DIR}")
        return False
    try:
        pdfmetrics.registerFont(TTFont(_AR_FONT, str(reg)))
        pdfmetrics.registerFont(TTFont(_AR_FONT_BOLD, str(bold)))
        _ARABIC_FONTS_REGISTERED = True
        return True
    except Exception as e:
        print(f"[REPORT] WARNING: failed to register Arabic fonts: {e}")
        return False


# Localization
_LABELS = {
    "en": {
        "header": "Tarsheeh.cv — Hiring Report",
        "untitled_role": "Untitled Role",
        "generated_fmt": "Generated {when}",
        "role_profile": "Role Profile",
        "ranked_candidates": "Ranked Candidates",
        "no_candidates": "No candidates were ranked for this job.",
        "field_title": "Title",
        "field_skills": "Required Skills",
        "field_experience": "Experience (years)",
        "field_priorities": "Priorities",
        "matching_skills": "Matching skills",
        "gaps": "Gaps",
        "appendix": "Original Job Description",
        "score_suffix": "/100",
        "empty_dash": "—",
        "unnamed_candidate": "Unnamed candidate",
        "exec_summary": "Executive Summary",
        "recommendation": "Recommendation",
        "insights": "Hiring Insights",
    },
    "ar": {
        "header": "Tarsheeh.cv - تقرير الترشيح",
        "untitled_role": "وظيفة بدون عنوان",
        "generated_fmt": "تاريخ الانشاء: {when}",
        "role_profile": "تفاصيل الوظيفة",
        "ranked_candidates": "المرشحون مرتبين",
        "no_candidates": "لا يوجد مرشحون مصنّفون لهذه الوظيفة.",
        "field_title": "المسمى الوظيفي",
        "field_skills": "المهارات المطلوبة",
        "field_experience": "سنوات الخبرة",
        "field_priorities": "الأولويات",
        "matching_skills": "المهارات المتوفرة",
        "gaps": "الفجوات",
        "appendix": "الوصف الوظيفي الأصلي",
        "score_suffix": "/100",
        "empty_dash": "—",
        "unnamed_candidate": "مرشح بدون اسم",
        "exec_summary": "الملخص التنفيذي",
        "recommendation": "التوصية",
        "insights": "رؤى التوظيف",
    },
}


def _shape_ar(text: str) -> str:
    """Reshape + bidi an Arabic-or-mixed string for visual rendering in PDF."""
    if not text:
        return ""
    try:
        return get_display(arabic_reshaper.reshape(text))
    except Exception:
        return text


def _t(text: str, locale: str) -> str:
    """Pass strings through the shaper only when locale is Arabic."""
    if locale == "ar":
        return _shape_ar(text)
    return text


# Styles
def _styles(locale: str) -> Dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    is_ar = locale == "ar"
    have_ar = _register_arabic_fonts() if is_ar else False
    use_ar_fonts = is_ar and have_ar

    body_font = _AR_FONT if use_ar_fonts else "Helvetica"
    bold_font = _AR_FONT_BOLD if use_ar_fonts else "Helvetica-Bold"
    serif_font = _AR_FONT if use_ar_fonts else "Times-Roman"
    serif_bold = _AR_FONT_BOLD if use_ar_fonts else "Times-Bold"
    align = TA_RIGHT if is_ar else TA_LEFT

    return {
        "h1": ParagraphStyle(
            "h1", parent=base["Heading1"], fontName=serif_font,
            fontSize=26, leading=30, textColor=NOIR, spaceAfter=4, alignment=align,
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Heading2"], fontName=serif_font,
            fontSize=16, leading=20, textColor=NOIR, spaceBefore=14, spaceAfter=6, alignment=align,
        ),
        "h3": ParagraphStyle(
            "h3", parent=base["Heading3"], fontName=serif_bold,
            fontSize=12, leading=15, textColor=NOIR, spaceBefore=10, spaceAfter=2, alignment=align,
        ),
        "meta": ParagraphStyle(
            "meta", parent=base["Normal"], fontName=body_font,
            fontSize=9, leading=12, textColor=MUTED, spaceAfter=2, alignment=align,
        ),
        "body": ParagraphStyle(
            "body", parent=base["Normal"], fontName=body_font,
            fontSize=10, leading=14, textColor=INK, spaceAfter=6, alignment=align,
        ),
        "rank": ParagraphStyle(
            "rank", parent=base["Normal"], fontName=serif_font,
            fontSize=22, leading=24, textColor=GOLD,
            alignment=TA_RIGHT if is_ar else TA_LEFT,
        ),
        "score": ParagraphStyle(
            "score", parent=base["Normal"], fontName=bold_font,
            fontSize=14, leading=16, textColor=NOIR,
            alignment=TA_LEFT if is_ar else TA_RIGHT,
        ),
    }


def _format_skills(skills: Optional[List[str]], locale: str) -> str:
    labels = _LABELS[locale]
    if not skills:
        return labels["empty_dash"]
    sep = "، " if locale == "ar" else ", "
    return sep.join(skills)


# Main entrypoint
def generate_report(
    job: Dict[str, Any],
    ranked_candidates: List[Dict[str, Any]],
    candidate_details: Optional[Dict[str, Dict[str, Any]]] = None,
    locale: str = "en",
    llm_report: Optional[HiringReport] = None,
) -> bytes:
    """Render a hiring report PDF and return the bytes."""
    locale = locale if locale in _LABELS else "en"
    is_ar = locale == "ar"
    L = _LABELS[locale]
    candidate_details = candidate_details or {}

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=LETTER,
        leftMargin=0.9 * inch, rightMargin=0.9 * inch,
        topMargin=0.9 * inch, bottomMargin=0.9 * inch,
        title=f"Tarsheeh Hiring Report — {job.get('title', '')}",
        author="Tarsheeh.cv",
    )
    s = _styles(locale)
    story: List[Any] = []

    # ----- Header -----
    story.append(Paragraph(_t(L["header"], locale), s["meta"]))
    story.append(Paragraph(_t(job.get("title") or L["untitled_role"], locale), s["h1"]))
    when = datetime.utcnow().strftime("%Y-%m-%d · %H:%M UTC") if is_ar \
        else datetime.utcnow().strftime("%B %d, %Y · %H:%M UTC")
    story.append(Paragraph(_t(L["generated_fmt"].format(when=when), locale), s["meta"]))
    story.append(Spacer(1, 0.18 * inch))

    # ----- Executive Summary (Optional LLM content) -----
    if llm_report:
        story.append(Paragraph(_t(L["exec_summary"], locale), s["h2"]))
        story.append(Paragraph(_t(llm_report.executive_summary, locale), s["body"]))
        
        story.append(Paragraph(_t(L["recommendation"], locale), s["h3"]))
        story.append(Paragraph(_t(llm_report.top_candidates_recommendation, locale), s["body"]))
        
        story.append(Paragraph(_t(L["insights"], locale), s["h3"]))
        story.append(Paragraph(_t(llm_report.overall_hiring_insight, locale), s["body"]))
        story.append(Spacer(1, 0.1 * inch))

    # ----- Role profile -----
    profile = job.get("parsed_profile") or {}
    if profile:
        story.append(Paragraph(_t(L["role_profile"], locale), s["h2"]))
        rows_def = [
            (L["field_title"], profile.get("title") or job.get("title") or L["empty_dash"]),
            (L["field_skills"], _format_skills(profile.get("required_skills"), locale)),
            (L["field_experience"],
             str(profile["experience_years"]) if profile.get("experience_years") is not None else L["empty_dash"]),
            (L["field_priorities"], _format_skills(profile.get("priorities"), locale)),
        ]
        # In RTL mode the value column should sit on the left and the label on
        # the right, so we swap column order and right-align the label cells.
        body_font = s["body"].fontName
        body_size = 9
        body_leading = 12

        def _cell(text: str, color, align: int) -> Paragraph:
            style = ParagraphStyle(
                "cell",
                fontName=body_font,
                fontSize=body_size,
                leading=body_leading,
                textColor=color,
                alignment=align,
            )
            return Paragraph(_t(text, locale), style)

        if is_ar:
            rows = [
                [_cell(value, INK, TA_RIGHT), _cell(label, MUTED, TA_RIGHT)]
                for label, value in rows_def
            ]
            col_widths = [4.4 * inch, 1.6 * inch]
        else:
            rows = [
                [_cell(label, MUTED, TA_LEFT), _cell(value, INK, TA_LEFT)]
                for label, value in rows_def
            ]
            col_widths = [1.6 * inch, 4.4 * inch]

        t = Table(rows, colWidths=col_widths)
        t.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("LINEBELOW", (0, 0), (-1, -2), 0.25, RULE),
        ]))
        story.append(t)

    # ----- Ranked candidates -----
    story.append(Paragraph(_t(L["ranked_candidates"], locale), s["h2"]))
    if not ranked_candidates:
        story.append(Paragraph(_t(L["no_candidates"], locale), s["body"]))
    else:
        for c in ranked_candidates:
            cid = c.get("candidate_id", "")
            rank = c.get("rank", "—")
            name = c.get("name") or L["unnamed_candidate"]
            score = c.get("score", 0)
            summary = c.get("summary", "")

            rank_str = f"0{rank}" if isinstance(rank, int) and rank < 10 else str(rank)
            score_str = f"{score}{L['score_suffix']}"

            rank_p = Paragraph(rank_str, s["rank"])
            name_p = Paragraph(_t(name, locale), s["h3"])
            score_p = Paragraph(score_str, s["score"])

            if is_ar:
                # Visually: [score][name][rank] with rank on the right margin.
                cells = [[score_p, name_p, rank_p]]
                widths = [1.0 * inch, 4.3 * inch, 0.7 * inch]
                score_idx, name_idx, rank_idx = 0, 1, 2
            else:
                cells = [[rank_p, name_p, score_p]]
                widths = [0.7 * inch, 4.3 * inch, 1.0 * inch]
                rank_idx, name_idx, score_idx = 0, 1, 2

            header = Table(cells, colWidths=widths)
            header.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (rank_idx, 0), (rank_idx, 0), "RIGHT" if is_ar else "LEFT"),
                ("ALIGN", (score_idx, 0), (score_idx, 0), "LEFT" if is_ar else "RIGHT"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(header)
            story.append(Paragraph(_t(summary, locale), s["body"]))

            details = candidate_details.get(cid) or {}
            scorecard = details.get("scorecard") or {}
            if scorecard:
                matching = _format_skills(scorecard.get("matching_skills"), locale)
                missing = _format_skills(scorecard.get("missing_skills"), locale)
                line = (
                    f"<b>{_t(L['matching_skills'], locale)}:</b> {_t(matching, locale)}<br/>"
                    f"<b>{_t(L['gaps'], locale)}:</b> {_t(missing, locale)}"
                )
                story.append(Paragraph(line, s["body"]))
            story.append(Spacer(1, 0.05 * inch))
            story.append(Table(
                [[""]], colWidths=[6.0 * inch],
                style=TableStyle([("LINEABOVE", (0, 0), (-1, 0), 0.25, RULE)]),
            ))
            story.append(Spacer(1, 0.08 * inch))

    # ----- Job description appendix -----
    desc = (job.get("description") or "").strip()
    if desc:
        story.append(PageBreak())
        story.append(Paragraph(_t(L["appendix"], locale), s["h2"]))
        for para in desc.split("\n\n"):
            para = para.strip()
            if para:
                story.append(Paragraph(_t(para, locale).replace("\n", "<br/>"), s["body"]))

    doc.build(story)
    pdf_bytes = buf.getvalue()
    buf.close()
    return pdf_bytes


if __name__ == "__main__":
    sample = generate_report(
        job={
            "title": "مهندس برمجيات",
            "description": "خبرة في بايثون و FastAPI و PostgreSQL.",
            "parsed_profile": {
                "title": "Senior Backend Engineer",
                "required_skills": ["Python", "FastAPI", "PostgreSQL"],
                "experience_years": 5,
                "priorities": ["Scalability", "LLM integration"],
            },
        },
        ranked_candidates=[
            {"candidate_id": "a", "name": "أحمد محمد", "score": 90, "rank": 1,
             "summary": "مرشح ممتاز بخبرة قوية في تطوير الواجهات الخلفية باستخدام Python و FastAPI."},
            {"candidate_id": "o", "name": "Osama", "score": 60, "rank": 2,
             "summary": "خبرة جيدة لكن ينقصه إتقان FastAPI."},
        ],
        candidate_details={
            "a": {"scorecard": {"matching_skills": ["Python", "FastAPI"], "missing_skills": []}},
            "o": {"scorecard": {"matching_skills": ["Python"], "missing_skills": ["FastAPI"]}},
        },
        locale="ar",
    )
    Path("/tmp/sample_report_ar.pdf").write_bytes(sample)
    print(f"Wrote /tmp/sample_report_ar.pdf ({len(sample)} bytes)")
