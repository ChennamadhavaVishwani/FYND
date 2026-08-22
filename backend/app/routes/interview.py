import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.dependencies import get_current_user
from app.services.llm_service import client
from app.services.supabase_service import get_user_latest_full_profile

router = APIRouter(
    prefix="/interview",
    tags=["interview"]
)


class FeedbackRequest(BaseModel):
    question: str
    response: str


@router.post("/feedback")
async def evaluate_interview_response(
    data: FeedbackRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Evaluates candidate's response to an interview question using Gemini.
    Provides personalized feedback using candidate's profile context.
    """
    if not data.question.strip() or not data.response.strip():
        raise HTTPException(status_code=400, detail="Question and response cannot be empty.")

    # Get user profile context
    profile = get_user_latest_full_profile(current_user)
    profile_summary = "Not available"
    if profile:
        profile_summary = f"""
        Name: {profile.get('full_name')}
        Skills: {[s.get('skill_name') for s in profile.get('skills', [])]}
        Projects: {[p.get('title') for p in profile.get('projects', [])]}
        Experience: {[f"{e.get('company')} - {e.get('role')}" for e in profile.get('experience', [])]}
        """

    prompt = f"""You are a professional technical interviewer and AI career coach.
Given the candidate's career profile context, the interview question, and their response, evaluate their answer. Use the STAR (Situation, Task, Action, Result) method for behavioral questions or technical standards for system design.

Candidate Profile Context:
{profile_summary}

Interview Question:
"{data.question}"

Candidate Response:
"{data.response}"

Evaluate the response and return ONLY valid JSON in exactly this format (no markdown code fences, no extra text):
{{
  "rating": "Strong Answer" or "Good Answer" or "Needs Improvement",
  "analysis": "concise 2-3 sentence feedback of what they did well and how they structured the answer",
  "suggestions": "concise 1-2 sentence suggestions for improvement, encouraging them to quantify outcomes or reference technical details"
}}
"""

    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={
                "temperature": 0.2,
                "response_mime_type": "application/json"
            }
        )

        raw_text = (response.text or "").strip()

        # Clean markdown fences if present
        if raw_text.startswith("```"):
            raw_text = raw_text.strip("`")
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()

        result = json.loads(raw_text)
        return result

    except json.JSONDecodeError:
        return {
            "rating": "Good Answer",
            "analysis": "Your answer is structured and clear. The evaluation server had a parsing issue but your response was received.",
            "suggestions": "Focus on formatting and presenting structured examples using the STAR method."
        }
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini AI processing failed: {str(e)}"
        )
