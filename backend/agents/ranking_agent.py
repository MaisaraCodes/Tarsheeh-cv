import os
import json
from typing import List, Dict, Any
from dotenv import load_dotenv

from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import PydanticOutputParser

from backend.models.ranking import RankedList

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)


_LANG_DIRECTIVE = {
    "ar": (
        "Write each candidate `summary` in fluent Modern Standard Arabic. "
        "Keep candidate names exactly as provided (do not transliterate). "
        "Keep technical skill names (Python, FastAPI, etc.) in their original form."
    ),
    "en": (
        "Write each candidate `summary` in clear professional English. "
        "Keep candidate names and technical skills exactly as provided."
    ),
}


def rank_candidates(analyses: List[Dict[str, Any]], locale: str = "en") -> RankedList:
    """Rank candidate analyses, producing summaries in the requested locale."""
    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    parser = PydanticOutputParser(pydantic_object=RankedList)

    prompt_template = """You are a Senior Strategic Recruitment Consultant.
Your task is to take a list of candidate CV analysis results and rank them to create a shortlist for the Hiring Manager.

Requirements:
1. Compare candidates based on their Score, Reasoning, Matching Skills, and Missing Skills.
2. Do not just rely on the numerical score; look into the job fit and essential skills.
3. Rank them from highest (best fit, rank 1) to lowest. Write a summary for each candidate outlining why they deserve this rank.
4. The ranking must be completely objective and fair based strictly on the provided analysis.

Localization directive: {lang_directive}

Candidate Analyses:
{analyses_data}

{format_instructions}
"""

    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["analyses_data", "lang_directive"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )

    chain = prompt | llm | parser
    return chain.invoke({
        "analyses_data": json.dumps(analyses, indent=2, ensure_ascii=False),
        "lang_directive": _LANG_DIRECTIVE.get(locale, _LANG_DIRECTIVE["en"]),
    })


if __name__ == "__main__":
    dummy = [{"candidate_id": "1", "name": "Ahmed", "analysis": {"score": 90, "reasoning": "Strong fit.", "matching_skills": ["Python"], "missing_skills": []}}]
    print(rank_candidates(dummy, locale="ar").model_dump_json(indent=2))
