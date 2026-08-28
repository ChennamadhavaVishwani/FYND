import urllib.parse
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import json as _json

from app.auth.dependencies import get_current_user
from app.services.supabase_service import get_user_latest_full_profile
from app.services.llm_service import client as _llm_client

router = APIRouter(
    prefix="/networking",
    tags=["Networking"]
)


class OutreachGenerateRequest(BaseModel):
    company: str
    role_title: str
    recipient_name: Optional[str] = "Hiring Team"
    persona_type: str = "recruiter"  # "recruiter" | "hiring_manager" | "peer_engineer" | "alumni"
    channel: str = "linkedin_note"  # "linkedin_note" | "cold_email" | "referral_request" | "follow_up"
    tone: Optional[str] = "direct"  # "direct" | "technical" | "enthusiastic"
    custom_note: Optional[str] = None


@router.get("/company-personas")
def get_company_personas(
    company: str,
    role_title: str = "Software Engineer",
    user_id: str = Depends(get_current_user)
):
    """
    Returns the key networking personas to target for a given company and role,
    with direct LinkedIn live search query URLs and tactical outreach tips.
    """
    clean_company = company.strip()
    clean_role = role_title.strip()
    encoded_comp = urllib.parse.quote_plus(clean_company)
    encoded_role = urllib.parse.quote_plus(clean_role)

    personas = [
        {
            "id": "recruiter",
            "title": "Technical Recruiter / Talent Acquisition",
            "search_query": f"Technical Recruiter {clean_company}",
            "linkedin_search_url": f"https://www.linkedin.com/search/results/people/?keywords=Technical+Recruiter+{encoded_comp}",
            "description": "Screens incoming applicants, manages candidate pipelines, and routes strong talent to hiring teams.",
            "best_approach": "Keep it concise, mention the exact job requisition or title, highlight 2 core matching skills, and attach your portfolio/GitHub.",
            "response_rate": "High (35-45%)",
            "recommended_channel": "LinkedIn Connection Note or Short Email"
        },
        {
            "id": "hiring_manager",
            "title": "Engineering Manager / Team Lead",
            "search_query": f"Engineering Manager {clean_company}",
            "linkedin_search_url": f"https://www.linkedin.com/search/results/people/?keywords=Engineering+Manager+{encoded_comp}",
            "description": "Makes the actual hiring decision and cares deeply about problem-solving capability and team velocity.",
            "best_approach": "Focus on a specific technical challenge their team solves, reference a project you built with their stack, and ask a high-signal technical question.",
            "response_rate": "Medium (25-35%)",
            "recommended_channel": "Cold Email or Thoughtful InMail"
        },
        {
            "id": "peer_engineer",
            "title": f"Senior {clean_role} (Peer)",
            "search_query": f"Senior {clean_role} {clean_company}",
            "linkedin_search_url": f"https://www.linkedin.com/search/results/people/?keywords=Senior+{encoded_role}+{encoded_comp}",
            "description": "Fellow engineer who can submit an internal employee referral and speak to team culture.",
            "best_approach": "Ask for an informational coffee chat about the engineering workflow or tech stack rather than asking directly for a referral right away.",
            "response_rate": "Very High (40-50%)",
            "recommended_channel": "LinkedIn Connection Note"
        },
        {
            "id": "alumni",
            "title": "Alumni / Shared Community Member",
            "search_query": f"Engineer {clean_company}",
            "linkedin_search_url": f"https://www.linkedin.com/search/results/people/?keywords=Engineer+{encoded_comp}",
            "description": "Shares your university, bootcamp, or open-source community background.",
            "best_approach": "Open with the shared connection/alumni bond, mention your transition into tech, and ask how they navigated their journey to the company.",
            "response_rate": "Highest (50-65%)",
            "recommended_channel": "LinkedIn Note or Email"
        }
    ]

    return {
        "company": clean_company,
        "role_title": clean_role,
        "personas": personas
    }


@router.post("/generate-outreach")
async def generate_outreach(
    data: OutreachGenerateRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Generates a personalized, high-converting outreach message for a specific
    persona and channel based on the candidate's actual resume profile.
    """
    # 1. Fetch user's profile context
    profile_data = get_user_latest_full_profile(user_id)
    candidate_name = "Candidate"
    skills_summary = ""
    projects_summary = ""
    experience_summary = ""

    if profile_data:
        candidate_name = profile_data.get("full_name") or "Candidate"
        skills = [s.get("skill_name") for s in profile_data.get("skills", []) if s.get("skill_name")]
        skills_summary = ", ".join(skills[:8]) if skills else "Fullstack Development, React, Python, APIs"
        
        projects = profile_data.get("projects", [])
        if projects:
            p_list = [f"{p.get('title')}: {p.get('description', '')[:100]}" for p in projects[:2]]
            projects_summary = " | ".join(p_list)
        
        experience = profile_data.get("experience", [])
        if experience:
            e_list = [f"{e.get('title', 'Engineer')} at {e.get('company', 'Previous Org')}" for e in experience[:2]]
            experience_summary = ", ".join(e_list)

    # 2. Prompt constraints based on channel
    channel_constraints = ""
    if data.channel == "linkedin_note":
        channel_constraints = "CRITICAL: The LinkedIn connection note MUST be STRICTLY under 280 characters total (including greeting and signoff). Do NOT include a subject line."
    elif data.channel == "cold_email":
        channel_constraints = "Provide an attention-grabbing subject line (under 8 words) and a 3-paragraph email (total under 130 words). Focus on value and low friction."
    elif data.channel == "referral_request":
        channel_constraints = "Polite and respectful referral request. Include proof of work and an easy out ('If you feel comfortable, otherwise no worries!')."
    elif data.channel == "follow_up":
        channel_constraints = "Short follow-up after submitting a job application. Reiterate enthusiasm and highlight one key match."

    prompt = f"""You are a Silicon Valley executive career coach and cold outreach specialist.
Write an authentic, highly personalized, non-generic networking message.

Context:
- Target Company: {data.company}
- Target Role: {data.role_title}
- Recipient Name: {data.recipient_name}
- Recipient Persona: {data.persona_type}
- Outreach Channel: {data.channel}
- Tone: {data.tone}
- Candidate Name: {candidate_name}
- Candidate Key Skills: {skills_summary}
- Candidate Notable Projects: {projects_summary}
- Candidate Background: {experience_summary}
- Additional Custom Note/Hook from User: {data.custom_note or "None"}

Channel Guidelines:
{channel_constraints}

Requirements:
- Sound like a genuine, smart human engineer — NOT an AI marketing bot. Avoid clichés like "I hope this email finds you well" or "I am writing to express my eager interest".
- Lead with an engaging, relevant hook.
- Mention 1-2 specific matching skills or technical achievements naturally.
- Keep the Call-to-Action (CTA) low friction and respectful.

Return ONLY a valid JSON object matching this schema (no markdown, no other text):

{{
  "subject_line": "<string, email subject line if channel is cold_email or referral_request, or empty string for linkedin_note>",
  "message_body": "<string, the complete ready-to-send message with realistic placeholders like [Portfolio Link] if relevant>",
  "character_count": <integer, total length of message_body>,
  "hook_used": "<one sentence explaining the strategy behind the opening hook>",
  "pro_tips": [
    "<Pro tip 1 for maximizing response rate>",
    "<Pro tip 2 on when to follow up>"
  ]
}}
"""

    try:
        response = await _llm_client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={"temperature": 0.3, "response_mime_type": "application/json"},
        )
        raw = (response.text or "").strip()
        if raw.startswith("```"):
            raw = raw.strip("`")
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        parsed = _json.loads(raw)
        return parsed

    except Exception as e:
        # Graceful fallback
        if data.channel == "linkedin_note":
            body = f"Hi {data.recipient_name}, saw {data.company}'s work in {data.role_title}. As a builder working with {skills_summary[:25] or 'modern stacks'}, I'd love to connect and follow your team's engineering updates!"
            return {
                "subject_line": "",
                "message_body": body[:280],
                "character_count": len(body[:280]),
                "hook_used": "Short connection request expressing admiration for the team's engineering updates.",
                "pro_tips": [
                    "Send requests on Tuesday-Thursday morning between 8 AM and 10 AM local time for best acceptance.",
                    "If they accept, wait 24 hours before sending a follow-up question."
                ]
            }
        else:
            subject = f"{data.role_title} candidate with {skills_summary.split(',')[0] if skills_summary else 'relevant'} background"
            body = f"""Hi {data.recipient_name},

I've been following {data.company}'s engineering journey and noticed your team is hiring for a {data.role_title}. 

With hands-on experience in {skills_summary or 'full-stack systems and scalable web applications'}, I recently developed projects focusing on performance and modular architecture that align closely with what {data.company} builds.

Would you be open to a brief 10-minute chat next week, or could you point me to the hiring lead for this role?

Best regards,
{candidate_name}"""
            return {
                "subject_line": subject,
                "message_body": body,
                "character_count": len(body),
                "hook_used": "Direct, value-first pitch connecting key skills to open team needs.",
                "pro_tips": [
                    "Keep follow-ups 4 to 5 business days apart.",
                    "Include a link to your live projects or GitHub profile in your signature."
                ]
            }
