"""Text -> Gemini LLM extraction -> JSON profile"""

import os
import json
import re
from dotenv import load_dotenv
from google import genai


load_dotenv()


client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

EXTRACTION_PROMPT = """
You are a resume parser. Extract structured information from the resume text below 
and return ONLY valid JSON, no preamble, no markdown fences, no commentary.

Return this exact JSON shape:

{{
  "full_name": string or null,
  "email": string or null,
  "phone": string or null,
  "summary": string or null,
  "skills": [
    {{"skill_name": string, "category": string}}
  ],
  "projects": [
    {{"title": string, "description": string, "tech_stack": [string]}}
  ],
  "experience": [
    {{
      "company": string,
      "role": string,
      "start_date": string or null,
      "end_date": string or null,
      "description": string
    }}
  ],
  "education": [
    {{
      "institution": string,
      "degree": string,
      "start_date": string or null,
      "end_date": string or null
    }}
  ]
}}

Rules:
- category for skills should be one of:
  "language", "ml", "framework", "tool", "cloud", 
  "database", "soft_skill", "other"

- dates should be YYYY-MM or YYYY format if known, else null

- If a section is missing from the resume, return an empty array for it

- Do not invent information that is not present in the resume text

Resume text:
---
{resume_text}
---
"""




def extract_profile_from_text(
        resume_text: str,
        model_name: str = "gemini-2.5-flash"
) -> dict:
    """
    Calls Gemini and parses JSON response
    """

    response = client.models.generate_content(
        model=model_name,
        contents=EXTRACTION_PROMPT.format(
            resume_text=resume_text
        ),
        config={
            "temperature": 0,
            "response_mime_type": "application/json"
        }
    )

    raw_text = response.text.strip()

    # Remove markdown fences if Gemini adds them
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

    return profile_json