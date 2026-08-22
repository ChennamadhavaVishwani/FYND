"""Text / PDF -> Gemini LLM extraction -> JSON profile"""

import os
import json
import re
from dotenv import load_dotenv
from google import genai
from google.genai import types


load_dotenv()


client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


EXTRACTION_PROMPT_DIRECT = """You are an expert AI resume parser with deep understanding of technical candidates, skills, and resume structures.
Examine the attached resume document thoroughly and extract structured candidate information into JSON.

Return ONLY a single valid JSON object, with no markdown fences, no preamble, no commentary.

Use this EXACT JSON schema:

{
  "full_name": string or null,
  "email": string or null,
  "phone": string or null,
  "summary": string or null,
  "location": string or null,
  "website": string or null,
  "linkedin": string or null,
  "github": string or null,
  "skills": [
    {
      "skill_name": string,
      "category": string
    }
  ],
  "projects": [
    {
      "title": string,
      "description": string,
      "tech_stack": [string]
    }
  ],
  "experience": [
    {
      "company": string,
      "role": string,
      "start_date": string or null,
      "end_date": string or null,
      "description": string
    }
  ],
  "education": [
    {
      "school": string,
      "degree": string,
      "start_date": string or null,
      "end_date": string or null
    }
  ]
}

Extraction Rules:
1. Contact Details: Thoroughly scan headers, sidebars, and sub-headers for Name, Email, Phone, Location (City, State/Country), Portfolio/Personal Website URL, LinkedIn profile URL, and GitHub profile URL.
2. Skills:
   - Extract all explicitly listed skills from skills sections.
   - ALSO extract implicit tech stacks, tools, frameworks, and languages mentioned in work experience bullets and project descriptions (e.g., if a bullet says "Built RAG app with Pinecone & LangChain", extract RAG, Pinecone, LangChain, Python).
   - Set category to ONE of: "Languages", "Frontend", "Backend", "DevOps", "Database", "General".
   - Normalize skill names (e.g. "ReactJS" -> "React", "Python 3" -> "Python", "PostgreSQL" -> "PostgreSQL").
3. Experience & Education:
   - Preserve clean readable dates (e.g. "2022", "Jan 2023", "Present").
4. If any section is not present in the resume, return an empty array [] for it.
5. Do NOT invent details not supported by the document.
"""

EXTRACTION_PROMPT_TEXT = """You are an expert AI resume parser with deep understanding of technical candidates, skills, and resume structures.
Examine the resume text below thoroughly and extract structured candidate information into JSON.

Return ONLY a single valid JSON object, with no markdown fences, no preamble, no commentary.

Use this EXACT JSON schema:

{
  "full_name": string or null,
  "email": string or null,
  "phone": string or null,
  "summary": string or null,
  "location": string or null,
  "website": string or null,
  "linkedin": string or null,
  "github": string or null,
  "skills": [
    {
      "skill_name": string,
      "category": string
    }
  ],
  "projects": [
    {
      "title": string,
      "description": string,
      "tech_stack": [string]
    }
  ],
  "experience": [
    {
      "company": string,
      "role": string,
      "start_date": string or null,
      "end_date": string or null,
      "description": string
    }
  ],
  "education": [
    {
      "school": string,
      "degree": string,
      "start_date": string or null,
      "end_date": string or null
    }
  ]
}

Extraction Rules:
1. Contact Details: Thoroughly scan headers, sidebars, and sub-headers for Name, Email, Phone, Location (City, State/Country), Portfolio/Personal Website URL, LinkedIn profile URL, and GitHub profile URL.
2. Skills:
   - Extract all explicitly listed skills from skills sections.
   - ALSO extract implicit tech stacks, tools, frameworks, and languages mentioned in work experience bullets and project descriptions.
   - Set category to ONE of: "Languages", "Frontend", "Backend", "DevOps", "Database", "General".
   - Normalize skill names (e.g. "ReactJS" -> "React", "Python 3" -> "Python", "PostgreSQL" -> "PostgreSQL").
3. Experience & Education:
   - Preserve clean readable dates (e.g. "2022", "Jan 2023", "Present").
4. If any section is not present in the resume, return an empty array [] for it.
5. Do NOT invent details not supported by the document.

Resume text:
---
{resume_text}
---
"""


CATEGORY_MAP = {
    "language": "Languages",
    "languages": "Languages",
    "programming": "Languages",
    "frontend": "Frontend",
    "ui": "Frontend",
    "web": "Frontend",
    "backend": "Backend",
    "server": "Backend",
    "framework": "Backend",
    "devops": "DevOps",
    "cloud": "DevOps",
    "infrastructure": "DevOps",
    "tool": "DevOps",
    "tools": "DevOps",
    "database": "Database",
    "databases": "Database",
    "data": "Database",
    "ml": "Backend",
    "ai": "Backend",
    "soft_skill": "General",
    "other": "General",
    "general": "General",
}


def _clean_and_normalize_profile(profile_json: dict) -> dict:
    """Post-processes and standardizes the parsed JSON profile."""
    if not isinstance(profile_json, dict):
        profile_json = {}

    # Ensure root fields exist
    for key in ["full_name", "email", "phone", "summary", "location", "website", "linkedin", "github"]:
        if key not in profile_json or profile_json[key] == "":
            profile_json[key] = None

    # Normalize skills
    raw_skills = profile_json.get("skills", [])
    if not isinstance(raw_skills, list):
        raw_skills = []

    seen_skills = set()
    cleaned_skills = []

    for s in raw_skills:
        if not isinstance(s, dict):
            continue
        name = str(s.get("skill_name") or s.get("name") or "").strip()
        if not name or len(name) > 60:
            continue

        lower_name = name.lower()
        if lower_name in seen_skills:
            continue
        seen_skills.add(lower_name)

        raw_cat = str(s.get("category") or "").strip().lower()
        category = CATEGORY_MAP.get(raw_cat, "General")

        cleaned_skills.append({
            "skill_name": name,
            "category": category,
        })

    profile_json["skills"] = cleaned_skills

    # Normalize projects
    raw_projects = profile_json.get("projects", [])
    if not isinstance(raw_projects, list):
        raw_projects = []
    cleaned_projects = []
    for p in raw_projects:
        if isinstance(p, dict) and p.get("title"):
            tech_stack = p.get("tech_stack", [])
            if not isinstance(tech_stack, list):
                tech_stack = [str(tech_stack)] if tech_stack else []
            cleaned_projects.append({
                "title": str(p["title"]).strip(),
                "description": str(p.get("description") or "").strip(),
                "tech_stack": [str(t).strip() for t in tech_stack if t],
            })
    profile_json["projects"] = cleaned_projects

    # Normalize experience
    raw_exp = profile_json.get("experience", [])
    if not isinstance(raw_exp, list):
        raw_exp = []
    cleaned_exp = []
    for e in raw_exp:
        if isinstance(e, dict) and (e.get("company") or e.get("role")):
            cleaned_exp.append({
                "company": str(e.get("company") or "").strip(),
                "role": str(e.get("role") or "").strip(),
                "start_date": e.get("start_date"),
                "end_date": e.get("end_date"),
                "description": str(e.get("description") or "").strip(),
            })
    profile_json["experience"] = cleaned_exp

    # Normalize education
    raw_edu = profile_json.get("education", [])
    if not isinstance(raw_edu, list):
        raw_edu = []
    cleaned_edu = []
    for ed in raw_edu:
        if isinstance(ed, dict):
            school = ed.get("school") or ed.get("institution") or ""
            degree = ed.get("degree") or ""
            if school or degree:
                cleaned_edu.append({
                    "school": str(school).strip(),
                    "degree": str(degree).strip(),
                    "start_date": ed.get("start_date"),
                    "end_date": ed.get("end_date"),
                })
    profile_json["education"] = cleaned_edu

    return profile_json


def extract_profile_from_text(
    resume_text: str,
    pdf_bytes: bytes = None,
    model_name: str = "gemini-2.5-flash"
) -> dict:
    """
    Calls Gemini using multimodal PDF bytes (when available) or extracted text,
    and returns a clean, structured JSON profile.
    """
    raw_text = ""
    success = False

    # Attempt 1: Multimodal PDF bytes direct to Gemini 2.5 Flash
    if pdf_bytes:
        try:
            pdf_part = types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf")
            response = client.models.generate_content(
                model=model_name,
                contents=[pdf_part, EXTRACTION_PROMPT_DIRECT],
                config={
                    "temperature": 0,
                    "response_mime_type": "application/json"
                }
            )
            raw_text = response.text.strip()
            success = True
        except Exception as e:
            print(f"[llm_service] Multimodal PDF extraction failed, falling back to text prompt: {e}")

    # Attempt 2: Text prompt fallback
    if not success:
        if not resume_text or not resume_text.strip():
            raise ValueError("No text or valid PDF bytes provided for resume extraction.")
        response = client.models.generate_content(
            model=model_name,
            contents=EXTRACTION_PROMPT_TEXT.format(resume_text=resume_text),
            config={
                "temperature": 0,
                "response_mime_type": "application/json"
            }
        )
        raw_text = response.text.strip()

    # Clean JSON markdown fences
    cleaned = re.sub(
        r"^```(?:json)?\s*|\s*```$",
        "",
        raw_text,
        flags=re.MULTILINE
    ).strip()

    try:
        profile_json = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Gemini did not return valid JSON: {e}\n"
            f"Raw output: {raw_text[:500]}"
        )

    return _clean_and_normalize_profile(profile_json)


async def extract_job_requirements(job_description: str) -> dict:
    """
    Use the LLM to extract structured requirements from a raw job description.
    """
    prompt = f"""Extract structured requirements from this job description.

Return ONLY valid JSON, no markdown formatting, no preamble, in exactly this shape:
{{
  "required_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill1", "skill2"],
  "experience_years": <number or null>,
  "education": ["degree1", "degree2"]
}}

Job description:
{job_description}
"""

    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config={
            "temperature": 0,
            "response_mime_type": "application/json"
        }
    )
    raw_text = response.text.strip()

    if raw_text.startswith("```"):
        raw_text = raw_text.strip("`")
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        return {
            "required_skills": [],
            "preferred_skills": [],
            "experience_years": None,
            "education": [],
        }