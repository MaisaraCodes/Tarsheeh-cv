"""Report Agent — generates a PDF hiring report using ReportLab."""
from datetime import datetime
from io import BytesIO
from typing import List, Dict, Any, Optional

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)
from reportlab.lib.enums import TA_LEFT


GOLD = colors.HexColor("#B08D57")
NOIR = colors.HexColor("#1A1A1A")
INK = colors.HexColor("#2C2C2C")
MUTED = colors.HexColor("#7A7A7A")
RULE = colors.HexColor("#D9D2C5")


def _styles() -> Dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "h1": ParagraphStyle(
            "h1", parent=base["Heading1"], fontName="Times-Roman",
            fontSize=26, leading=30, textColor=NOIR, spaceAfter=4,
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Heading2"], fontName="Times-Roman",
            fontSize=16, leading=20, textColor=NOIR, spaceBefore=14, spaceAfter=6,
        ),
        "h3": ParagraphStyle(
            "h3", parent=base["Heading3"], fontName="Times-Bold",
            fontSize=12, leading=15, textColor=NOIR, spaceBefore=10, spaceAfter=2,
        ),
        "meta": ParagraphStyle(
            "meta", parent=base["Normal"], fontName="Helvetica",
            fontSize=9, leading=12, textColor=MUTED, spaceAfter=2,
        ),
        "body": ParagraphStyle(
            "body", parent=base["Normal"], fontName="Helvetica",
            fontSize=10, leading=14, textColor=INK, spaceAfter=6, alignment=TA_LEFT,
        ),
        "rank": ParagraphStyle(
            "rank", parent=base["Normal"], fontName="Times-Roman",
            fontSize=22, leading=24, textColor=GOLD,
        ),
        "score": ParagraphStyle(
            "score", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=14, leading=16, textColor=NOIR,
        ),
    }


def _format_skills(skills: Optional[List[str]]) -> str:
    if not skills:
        return "—"
    return ", ".join(skills)


def generate_report(
    job: Dict[str, Any],
    ranked_candidates: List[Dict[str, Any]],
    candidate_details: Optional[Dict[str, Dict[str, Any]]] = None,
) -> bytes:
    """
    Render a clean hiring report PDF and return the bytes.

    job: {"title": str, "description": str, "parsed_profile": dict|None}
    ranked_candidates: list of {"candidate_id","name","score","rank","summary"}
    candidate_details: optional {candidate_id: {"scorecard": {...}, "interview_questions": [...]}}
    """
    candidate_details = candidate_details or {}
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=LETTER,
        leftMargin=0.9 * inch, rightMargin=0.9 * inch,
        topMargin=0.9 * inch, bottomMargin=0.9 * inch,
        title=f"Tarsheeh Hiring Report — {job.get('title', '')}",
        author="Tarsheeh.cv",
    )
    s = _styles()
    story: List[Any] = []

    # Header
    story.append(Paragraph("Tarsheeh.cv — Hiring Report", s["meta"]))
    story.append(Paragraph(job.get("title", "Untitled Role"), s["h1"]))
    story.append(Paragraph(
        f"Generated {datetime.utcnow().strftime('%B %d, %Y · %H:%M UTC')}",
        s["meta"],
    ))
    story.append(Spacer(1, 0.18 * inch))

    # Job profile block
    profile = job.get("parsed_profile") or {}
    if profile:
        story.append(Paragraph("Role Profile", s["h2"]))
        rows = [
            ["Title", profile.get("title", job.get("title", "—"))],
            ["Required Skills", _format_skills(profile.get("required_skills"))],
            ["Experience (years)", str(profile.get("experience_years", "—"))],
            ["Priorities", _format_skills(profile.get("priorities"))],
        ]
        t = Table(rows, colWidths=[1.6 * inch, 4.4 * inch])
        t.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("TEXTCOLOR", (0, 0), (0, -1), MUTED),
            ("TEXTCOLOR", (1, 0), (1, -1), INK),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("LINEBELOW", (0, 0), (-1, -2), 0.25, RULE),
        ]))
        story.append(t)

    # Ranked candidates
    story.append(Paragraph("Ranked Candidates", s["h2"]))
    if not ranked_candidates:
        story.append(Paragraph("No candidates were ranked for this job.", s["body"]))
    else:
        for c in ranked_candidates:
            cid = c.get("candidate_id", "")
            rank = c.get("rank", "—")
            name = c.get("name") or "Unnamed candidate"
            score = c.get("score", 0)
            summary = c.get("summary", "")

            header = Table(
                [[
                    Paragraph(f"0{rank}" if isinstance(rank, int) and rank < 10 else str(rank), s["rank"]),
                    Paragraph(name, s["h3"]),
                    Paragraph(f"{score}/100", s["score"]),
                ]],
                colWidths=[0.7 * inch, 4.3 * inch, 1.0 * inch],
            )
            header.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (2, 0), (2, 0), "RIGHT"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(header)
            story.append(Paragraph(summary, s["body"]))

            details = candidate_details.get(cid) or {}
            scorecard = details.get("scorecard") or {}
            if scorecard:
                matching = _format_skills(scorecard.get("matching_skills"))
                missing = _format_skills(scorecard.get("missing_skills"))
                story.append(Paragraph(
                    f"<b>Matching skills:</b> {matching}<br/>"
                    f"<b>Gaps:</b> {missing}",
                    s["body"],
                ))
            story.append(Spacer(1, 0.05 * inch))
            story.append(Table(
                [[""]], colWidths=[6.0 * inch],
                style=TableStyle([("LINEABOVE", (0, 0), (-1, 0), 0.25, RULE)]),
            ))
            story.append(Spacer(1, 0.08 * inch))

    # Job description appendix
    desc = (job.get("description") or "").strip()
    if desc:
        story.append(PageBreak())
        story.append(Paragraph("Original Job Description", s["h2"]))
        for para in desc.split("\n\n"):
            para = para.strip()
            if para:
                story.append(Paragraph(para.replace("\n", "<br/>"), s["body"]))

    doc.build(story)
    pdf_bytes = buf.getvalue()
    buf.close()
    return pdf_bytes


if __name__ == "__main__":
    sample = generate_report(
        job={
            "title": "Senior Backend Engineer",
            "description": "Python, FastAPI, PostgreSQL.",
            "parsed_profile": {
                "title": "Senior Backend Engineer",
                "required_skills": ["Python", "FastAPI", "PostgreSQL"],
                "experience_years": 5,
                "priorities": ["Scalability", "LLM integration"],
            },
        },
        ranked_candidates=[
            {"candidate_id": "a", "name": "Ahmed", "score": 90, "rank": 1, "summary": "Excellent fit."},
            {"candidate_id": "o", "name": "Osama", "score": 60, "rank": 2, "summary": "Solid but missing FastAPI."},
        ],
        candidate_details={
            "a": {"scorecard": {"matching_skills": ["Python", "FastAPI"], "missing_skills": []}},
            "o": {"scorecard": {"matching_skills": ["Python"], "missing_skills": ["FastAPI"]}},
        },
    )
    with open("/tmp/sample_report.pdf", "wb") as f:
        f.write(sample)
    print(f"Wrote /tmp/sample_report.pdf ({len(sample)} bytes)")
