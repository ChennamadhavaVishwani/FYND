import asyncio
import math
from typing import Optional

from app.services.embedding_service import create_embedding
from app.services.llm_service import client  # reuse existing LLM client
from app.services.supabase_service import get_job_by_id, get_user_latest_full_profile


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    if not vec_a or not vec_b:
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def extract_skill_names(skills: list[dict]) -> list[str]:
    return [s["skill_name"] for s in skills if s.get("skill_name")]


def extract_all_candidate_skills(profile: dict) -> list[str]:
    """
    Extract candidate skills from ALL profile sources:
    - Explicit skills table entries
    - tech_stack arrays inside each project

    This ensures a candidate who built a RAG pipeline in a project
    but didn't explicitly list it as a skill is still credited for it
    during matching and gap analysis.
    """
    skills = [s["skill_name"] for s in profile.get("skills", []) if s.get("skill_name")]

    for proj in profile.get("projects", []):
        tech_stack = proj.get("tech_stack")
        if isinstance(tech_stack, list):
            skills.extend([str(t).strip() for t in tech_stack if t])
        elif isinstance(tech_stack, str):
            skills.extend([t.strip() for t in tech_stack.split(",") if t.strip()])

    # Deduplicate case-insensitively, preserving first occurrence.
    seen: set[str] = set()
    unique: list[str] = []
    for s in skills:
        cleaned = s.strip()
        if cleaned and cleaned.lower() not in seen:
            seen.add(cleaned.lower())
            unique.append(cleaned)
    return unique


def extract_job_skills(job: dict) -> list[str]:
    """
    Extract the best available skill signal from a job.
    Priority:
    1. required_skills (set by extract_job_requirements Gemini call)
    2. tags (always available from Arbeitnow ingestion)
    3. Title keywords as a last-resort signal
    """
    required = job.get("required_skills") or []
    if required:
        return [str(s).strip() for s in required if s]

    tags = job.get("tags") or []
    if tags:
        return [str(t).strip() for t in tags if t]

    # Final fallback: tokenize the title into words (≥4 chars, not stop words)
    _stop = {"and", "the", "for", "with", "are", "you", "our", "this", "that", "have", "will"}
    title_words = [
        w for w in (job.get("title") or "").split()
        if len(w) >= 4 and w.lower() not in _stop
    ]
    return title_words


def build_candidate_summary(profile: dict) -> str:
    """
    Build a rich text summary of the candidate for semantic matching.
    Uses the stored summary if present, otherwise synthesizes one
    from skills, project tech stacks, and experience roles.
    This avoids the flat-score problem caused by an empty summary.
    """
    summary = (profile.get("summary") or "").strip()
    if summary:
        return summary

    parts = []

    # Skills
    skills = [s["skill_name"] for s in profile.get("skills", []) if s.get("skill_name")]
    if skills:
        parts.append("Skills: " + ", ".join(skills[:30]))

    # Experience roles
    for exp in profile.get("experience", [])[:3]:
        role = exp.get("role", "")
        company = exp.get("company", "")
        desc = (exp.get("description") or "")[:200]
        if role:
            parts.append(f"{role} at {company}. {desc}")

    # Project tech stacks
    for proj in profile.get("projects", [])[:3]:
        tech_stack = proj.get("tech_stack", [])
        if isinstance(tech_stack, list) and tech_stack:
            parts.append(f"Project: {proj.get('title', '')} using {', '.join(tech_stack[:8])}")

    return " ".join(parts)[:1500]


def extract_experience_years(profile: dict) -> Optional[float]:
    """
    Pulls total years of experience from profile_json if your extraction
    stored it there (e.g. profile_json["experience_years"]).
    Falls back to counting experience rows as a rough proxy if not present.
    """
    profile_json = profile.get("profile_json") or {}
    years = profile_json.get("experience_years") or profile_json.get("total_experience_years")
    if years is not None:
        try:
            return float(years)
        except (ValueError, TypeError):
            pass
    experience_rows = profile.get("experience", [])
    return float(len(experience_rows)) if experience_rows else None


def extract_education(profile: dict) -> list[str]:
    profile_json = profile.get("profile_json") or {}
    education = profile_json.get("education", [])
    if isinstance(education, list):
        return education
    return [education] if education else []


async def compute_semantic_skill_overlap(
    resume_skills: list[str],
    job_skills: list[str],
    cache: dict | None = None,
) -> float:
    """
    Compute skill overlap using exact matching first, then embedding similarity.

    Replaces the old raw set-intersection that failed for synonyms like
    "NLP" vs "Natural Language Processing" or "RAG" vs "RAG engineering".

    The optional cache parameter allows a shared embedding cache to be passed in
    to avoid redundant API calls when scoring multiple jobs in one request.
    """
    if not job_skills or not resume_skills:
        return 0.0

    if cache is None:
        cache = {}

    matched_count = 0

    for job_skill in job_skills:
        js_clean = job_skill.strip().lower()

        # Stage 1: exact case-insensitive match (fast path).
        if any(js_clean == rs.strip().lower() for rs in resume_skills):
            matched_count += 1
            continue

        # Stage 2: embedding cosine similarity.
        if js_clean not in cache:
            result = await asyncio.to_thread(create_embedding, job_skill)
            cache[js_clean] = result.get("embedding", [])

        job_vec = cache[js_clean]
        if not job_vec:
            continue

        best_sim = 0.0
        for rs in resume_skills:
            rs_clean = rs.strip().lower()
            if rs_clean not in cache:
                result = await asyncio.to_thread(create_embedding, rs)
                cache[rs_clean] = result.get("embedding", [])

            rs_vec = cache[rs_clean]
            if rs_vec:
                best_sim = max(best_sim, cosine_similarity(job_vec, rs_vec))

        if best_sim >= 0.80:
            matched_count += 1

    return matched_count / len(job_skills)


async def compute_semantic_similarity(resume_summary: str, job_description: str) -> float:
    resume_vec, job_vec = await asyncio.gather(
        asyncio.to_thread(create_embedding, resume_summary),
        asyncio.to_thread(create_embedding, job_description),
    )
    similarity = cosine_similarity(
        resume_vec.get("embedding", []), job_vec.get("embedding", [])
    )
    # cosine similarity is -1..1, normalize to 0..1
    return max(0.0, (similarity + 1) / 2)


def compute_experience_match(resume_years: Optional[float], required_years: Optional[float]) -> float:
    if required_years is None or required_years == 0:
        return 1.0
    if resume_years is None:
        return 0.0
    if resume_years >= required_years:
        return 1.0
    return max(0.0, resume_years / required_years)


async def generate_match_explanation(profile: dict, job: dict, score: float) -> dict:
    import json

    resume_skills = extract_all_candidate_skills(profile)
    resume_years = extract_experience_years(profile)
    resume_education = extract_education(profile)

    prompt = f"""You are a career matching assistant. Given a candidate's profile and a job,
explain in 2-3 sentences why they match (or don't), and list missing skills.

Return ONLY valid JSON, no markdown, in exactly this shape:
{{
  "explanation": "short 2-3 sentence explanation",
  "missing_skills": ["skill1", "skill2"],
  "strengths": ["skill1", "skill2"]
}}

Candidate skills: {resume_skills}
Candidate experience (years): {resume_years}
Candidate education: {resume_education}

Job title: {job.get('title')}
Job required skills: {job.get('required_skills', [])}
Job preferred skills: {job.get('preferred_skills', [])}
Job required experience (years): {job.get('experience_years')}
Job required education: {job.get('education', [])}

Computed match score: {round(score * 100, 1)}%
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
            "explanation": "Explanation unavailable due to a parsing error.",
            "missing_skills": [],
            "strengths": [],
        }


async def _score_job(profile: dict, job: dict, embedding_cache: dict | None = None) -> dict:
    resume_skills = extract_all_candidate_skills(profile)
    resume_years = extract_experience_years(profile)

    if embedding_cache is None:
        embedding_cache = {}

    # Use smarter job skill extraction (falls back to tags/title if required_skills is empty)
    job_skills = extract_job_skills(job)

    skill_score = await compute_semantic_skill_overlap(
        resume_skills, job_skills, embedding_cache
    )

    # Build a rich candidate text — avoids flat scores when profile.summary is empty
    candidate_text = build_candidate_summary(profile)
    job_text = (job.get("description") or job.get("title") or "").strip()

    semantic_score = await compute_semantic_similarity(candidate_text, job_text)
    experience_score = compute_experience_match(resume_years, job.get("experience_years"))

    final_score = round(
        (skill_score * 0.5) + (semantic_score * 0.3) + (experience_score * 0.2), 4
    )
    return {
        "final_score": final_score,
        "skill_score": skill_score,
        "semantic_score": semantic_score,
        "experience_score": experience_score,
    }


async def match_resume_to_job(user_id: str, job_id: str) -> dict:
    profile = get_user_latest_full_profile(user_id)
    if not profile:
        raise ValueError("No profile found for this user")

    job = get_job_by_id(job_id)
    if not job:
        raise ValueError("Job not found")

    scores = await _score_job(profile, job)
    explanation_data = await generate_match_explanation(profile, job, scores["final_score"])

    return {
        "job_id": job_id,
        "job_title": job.get("title"),
        "company": job.get("company"),
        "match_score": round(scores["final_score"] * 100, 1),
        "skill_score": round(scores["skill_score"] * 100, 1),
        "semantic_score": round(scores["semantic_score"] * 100, 1),
        "experience_score": round(scores["experience_score"] * 100, 1),
        "explanation": explanation_data.get("explanation"),
        "missing_skills": explanation_data.get("missing_skills", []),
        "strengths": explanation_data.get("strengths", []),
    }


async def match_resume_to_all_jobs(user_id: str, limit: int = 20) -> list[dict]:
    from app.services.supabase_service import search_jobs

    profile = get_user_latest_full_profile(user_id)
    if not profile:
        raise ValueError("No profile found for this user")

    jobs = search_jobs(query=None, limit=limit)
    results = []

    # Shared embedding cache across all jobs — each unique skill string
    # is embedded only once regardless of how many jobs reference it.
    embedding_cache: dict = {}

    for job in jobs:
        scores = await _score_job(profile, job, embedding_cache)
        results.append({
            "job_id": job["id"],
            "job_title": job.get("title"),
            "company": job.get("company"),
            "location": job.get("location"),
            "apply_url": job.get("apply_url") or job.get("url"),
            "required_skills": job.get("required_skills", []),
            "preferred_skills": job.get("preferred_skills", []),
            "match_score": round(scores["final_score"] * 100, 1),
        })

    results.sort(key=lambda r: r["match_score"], reverse=True)
    return results