"""
FYND Skill Gap Analysis Service

This service compares normalized resume skills against job requirements.

IMPORTANT:
Normalization and matching are two different problems.

Normalization answers:
    "What canonical skill does this phrase refer to?"

Matching answers:
    "Does the candidate have enough evidence to satisfy this requirement?"

This module therefore uses:

1. Exact canonical matching
2. Explicit alias/equivalence relationships
3. Skill-family / related-skill relationships
4. Conservative semantic similarity
5. Gemini fallback for genuinely ambiguous cases
6. Evidence-aware scoring where available

The public API remains compatible with the previous implementation:
    compute_skill_gap()
    generate_prep_recommendations()
    get_skill_gap_for_job()
    get_aggregate_skill_gap()
"""

import asyncio
import json
import re
from collections import defaultdict

from app.services.embedding_service import create_embedding
from app.services.llm_service import client
from app.services.match_service import (
    cosine_similarity,
    extract_all_candidate_skills,
    extract_skill_names,
)
from app.services.normalize_service import normalize_skills_async
from app.services.supabase_service import (
    get_job_by_id,
    get_user_latest_full_profile,
    search_jobs,
)


# ============================================================================
# 1. BASIC TEXT HELPERS
# ============================================================================

def _clean(value: str) -> str:
    """Normalize text for safe comparison."""
    if not value:
        return ""

    value = str(value).strip().lower()

    # Normalize common punctuation.
    value = value.replace("&", " and ")
    value = value.replace("-", " ")
    value = value.replace("_", " ")
    value = value.replace("/", " ")

    # Remove punctuation but keep +/#/. for technologies such as C++ and C#.
    value = re.sub(r"[^\w\s+#.]", " ", value)

    # Normalize whitespace.
    value = re.sub(r"\s+", " ", value)

    return value.strip()


# ============================================================================
# 2. EXPLICIT EQUIVALENCE RELATIONSHIPS
#
# These are SAFE relationships where one name is essentially another name
# for the same capability.
# ============================================================================

EXACT_EQUIVALENTS = {
    # JavaScript
    "javascript": {"javascript", "js", "ecmascript"},
    "js": {"javascript", "js", "ecmascript"},

    # TypeScript
    "typescript": {"typescript", "ts"},
    "ts": {"typescript", "ts"},

    # Python
    "python": {"python", "python3", "py"},

    # React
    "react": {"react", "reactjs", "react.js"},

    # Node
    "node.js": {"node.js", "nodejs", "node"},

    # Express
    "express.js": {"express.js", "express", "expressjs"},

    # FastAPI
    "fastapi": {"fastapi", "fast api"},

    # Scikit
    "scikit-learn": {
        "scikit-learn",
        "scikit learn",
        "sklearn",
    },

    # PostgreSQL
    "postgresql": {
        "postgresql",
        "postgres",
        "postgres db",
    },

    # LLM / RAG
    "rag pipelines": {
        "rag",
        "rag pipelines",
        "retrieval augmented generation",
        "retrieval-augmented generation",
    },

    "prompt engineering": {
        "prompt engineering",
        "prompt design",
        "llm prompt engineering",
    },

    # Vector databases
    "vector databases": {
        "vector database",
        "vector databases",
        "vector db",
        "vector dbs",
    },

    # Deep learning
    "deep learning": {
        "deep learning",
        "deep neural networks",
        "deep neural network",
        "dnn",
    },

    # Machine learning
    "machine learning": {
        "machine learning",
        "ml",
    },

    # NLP
    "natural language processing": {
        "natural language processing",
        "nlp",
    },

    # Hugging Face
    "hugging face": {
        "hugging face",
        "huggingface",
        "hugging face transformers",
        "transformers",
    },

    # LoRA
    "lora": {
        "lora",
        "low rank adaptation",
        "low-rank adaptation",
    },

    # MLOps
    "mlops": {
        "mlops",
        "machine learning operations",
    },

    # CI/CD
    "ci/cd": {
        "ci/cd",
        "cicd",
        "continuous integration",
        "continuous delivery",
        "continuous integration and deployment",
    },

    # APIs
    "rest apis": {
        "rest",
        "rest api",
        "rest apis",
        "restful api",
        "restful apis",
        "restful",
    },

    # Kubernetes
    "kubernetes": {
        "kubernetes",
        "k8s",
    },
}


# ============================================================================
# 3. RELATED SKILLS
#
# IMPORTANT:
# These are NOT treated as exact matches.
#
# Example:
#
# RAG -> RAG System Design = RELATED
#
# not:
#
# RAG -> RAG System Design = 100% MATCH
#
# This prevents the system from overclaiming candidate capability.
# ============================================================================

RELATED_SKILLS = {
    # ----------------------------------------------------------------------
    # LLM / RAG
    # ----------------------------------------------------------------------

    "rag pipelines": {
        "vector databases",
        "embedding models",
        "semantic search",
        "information retrieval",
        "chunking strategies",
        "retrieval",
        "llm applications",
        "prompt engineering",
    },

    "rag system design": {
        "rag pipelines",
        "vector databases",
        "embedding models",
        "semantic search",
        "information retrieval",
        "chunking strategies",
        "reranking",
        "hybrid search",
    },

    "embedding models": {
        "sentence transformers",
        "sentence embeddings",
        "semantic search",
        "vector databases",
        "rag pipelines",
    },

    "sentence transformers": {
        "embedding models",
        "sentence embeddings",
        "semantic search",
        "vector databases",
    },

    "semantic search": {
        "embedding models",
        "vector databases",
        "sentence transformers",
        "information retrieval",
        "rag pipelines",
    },

    "vector databases": {
        "vector search",
        "semantic search",
        "embedding models",
        "rag pipelines",
        "information retrieval",
    },

    "vector search": {
        "vector databases",
        "semantic search",
        "embedding models",
        "rag pipelines",
    },

    "hybrid search": {
        "vector search",
        "semantic search",
        "bm25",
        "information retrieval",
        "reranking",
        "rag pipelines",
    },

    "reranking": {
        "cross encoder",
        "information retrieval",
        "semantic search",
        "hybrid search",
        "rag pipelines",
    },

    "chunking strategies": {
        "text chunking",
        "document chunking",
        "rag pipelines",
        "information retrieval",
    },

    "context engineering": {
        "prompt engineering",
        "prompt design",
        "rag pipelines",
        "llm applications",
    },

    "prompt engineering": {
        "prompt design",
        "context engineering",
        "llm applications",
        "rag pipelines",
    },

    # ----------------------------------------------------------------------
    # LLM development
    # ----------------------------------------------------------------------

    "llm fine-tuning": {
        "fine tuning",
        "fine-tuning",
        "lora",
        "qlora",
        "peft",
        "hugging face",
        "pytorch",
        "large language models",
    },

    "lora": {
        "peft",
        "qlora",
        "llm fine-tuning",
        "parameter efficient fine tuning",
    },

    "qlora": {
        "lora",
        "peft",
        "llm fine-tuning",
        "parameter efficient fine tuning",
    },

    "hugging face": {
        "transformers",
        "llm fine-tuning",
        "pytorch",
        "lora",
        "qlora",
    },

    "pytorch": {
        "deep learning",
        "neural networks",
        "machine learning",
        "llm fine-tuning",
    },

    # ----------------------------------------------------------------------
    # ML
    # ----------------------------------------------------------------------

    "deep learning": {
        "machine learning",
        "pytorch",
        "neural networks",
    },

    "machine learning": {
        "deep learning",
        "scikit-learn",
        "pytorch",
        "data science",
    },

    "natural language processing": {
        "machine learning",
        "deep learning",
        "transformers",
        "sentence transformers",
        "llm applications",
    },

    # ----------------------------------------------------------------------
    # Backend
    # ----------------------------------------------------------------------

    "fastapi": {
        "rest apis",
        "api development",
        "python",
        "backend development",
    },

    "flask": {
        "rest apis",
        "api development",
        "python",
        "backend development",
    },

    "express.js": {
        "node.js",
        "rest apis",
        "backend development",
        "api development",
    },

    "rest apis": {
        "api development",
        "backend development",
        "fastapi",
        "flask",
        "express.js",
    },

    # ----------------------------------------------------------------------
    # Cloud / DevOps
    # ----------------------------------------------------------------------

    "aws": {
        "cloud computing",
        "cloud deployment",
        "amazon web services",
    },

    "gcp": {
        "cloud computing",
        "cloud deployment",
        "google cloud",
    },

    "docker": {
        "containerization",
        "deployment",
        "devops",
        "kubernetes",
    },

    "kubernetes": {
        "docker",
        "containerization",
        "devops",
        "cloud deployment",
    },

    # ----------------------------------------------------------------------
    # Testing
    # ----------------------------------------------------------------------

    "pytest": {
        "unit testing",
        "python testing",
        "automated testing",
    },

    "unit testing": {
        "pytest",
        "automated testing",
        "software testing",
    },
}


# ============================================================================
# 4. SKILLS THAT SHOULD NEVER BE CONSIDERED EQUIVALENT
#
# These are related concepts but require genuinely different evidence.
# ============================================================================

DISTINCT_SKILL_PAIRS = {
    frozenset({"react", "react native"}),
    frozenset({"aws", "gcp"}),
    frozenset({"aws", "azure"}),
    frozenset({"gcp", "azure"}),
    frozenset({"python", "pytorch"}),
    frozenset({"machine learning", "deep learning"}),
    frozenset({"llm fine-tuning", "prompt engineering"}),
    frozenset({"rag pipelines", "embedding models"}),
    frozenset({"vector databases", "embedding models"}),
    frozenset({"docker", "kubernetes"}),
    frozenset({"java", "javascript"}),
    frozenset({"flask", "fastapi"}),
}


def _are_distinct(a: str, b: str) -> bool:
    pair = frozenset({_clean(a), _clean(b)})
    return pair in DISTINCT_SKILL_PAIRS


# ============================================================================
# 5. CANONICALIZATION HELPERS
# ============================================================================

def _canonical_name(value: str) -> str:
    """
    Best-effort canonical name.

    The normalize service remains the primary canonicalizer.
    This helper additionally handles phrases used frequently in AI job
    descriptions.
    """
    key = _clean(value)

    special_cases = {
        "rag": "RAG Pipelines",
        "retrieval augmented generation": "RAG Pipelines",
        "retrieval augmented generation system": "RAG System Design",
        "rag system design": "RAG System Design",

        "embedding model": "Embedding Models",
        "embedding models": "Embedding Models",
        "text embeddings": "Embedding Models",
        "sentence embeddings": "Embedding Models",

        "sentence transformer": "Sentence Transformers",
        "sentence transformers": "Sentence Transformers",

        "vector database": "Vector Databases",
        "vector databases": "Vector Databases",
        "vector db": "Vector Databases",
        "vector dbs": "Vector Databases",

        "hybrid retrieval": "Hybrid Search",
        "hybrid search": "Hybrid Search",

        "reranker": "Reranking",
        "reranking": "Reranking",
        "re ranking": "Reranking",

        "chunking": "Chunking Strategies",
        "chunking strategies": "Chunking Strategies",
        "document chunking": "Chunking Strategies",
        "text chunking": "Chunking Strategies",

        "prompt engineering": "Prompt Engineering",
        "prompt design": "Prompt Engineering",

        "context engineering": "Context Engineering",

        "llmops": "LLMOps",
        "llm ops": "LLMOps",

        "agentic ai": "Agentic Systems",
        "agentic systems": "Agentic Systems",
        "ai agents": "Agentic Systems",
        "llm agents": "Agentic Systems",

        "output parsing": "Output Parsing",
        "structured outputs": "Output Parsing",

        "aws": "AWS",
        "amazon web services": "AWS",

        "gcp": "GCP",
        "google cloud": "GCP",

        "kubernetes": "Kubernetes",
        "k8s": "Kubernetes",

        "docker": "Docker",

        "unit testing": "Unit Testing",
        "pytest": "Pytest",

        "machine learning": "Machine Learning",
        "deep learning": "Deep Learning",

        "llm fine tuning": "LLM Fine-tuning",
        "llm fine-tuning": "LLM Fine-tuning",
        "fine tuning": "LLM Fine-tuning",
        "fine-tuning": "LLM Fine-tuning",

        "lora": "LoRA",
        "qlora": "QLoRA",
        "peft": "PEFT",
    }

    return special_cases.get(key, value.strip() if value else "")


def _skill_key(value: str) -> str:
    return _clean(_canonical_name(value))


# ============================================================================
# 6. EXACT / EQUIVALENT MATCHING
# ============================================================================

def _equivalent_match(job_skill: str, resume_skill: str) -> bool:
    """
    Determine whether two skills are explicitly equivalent.

    This is deliberately conservative.
    """
    a = _skill_key(job_skill)
    b = _skill_key(resume_skill)

    if not a or not b:
        return False

    if a == b:
        return True

    if _are_distinct(a, b):
        return False

    # Check explicit equivalence groups.
    for canonical, aliases in EXACT_EQUIVALENTS.items():
        normalized_aliases = {_clean(x) for x in aliases}
        normalized_aliases.add(_clean(canonical))

        if a in normalized_aliases and b in normalized_aliases:
            return True

    return False


# ============================================================================
# 7. RELATED-SKILL MATCHING
# ============================================================================

def _related_match(job_skill: str, resume_skills: list[str]) -> tuple[bool, float, str]:
    """
    Find evidence that a resume skill is meaningfully related to the job skill.

    Returns:
        (matched, score, reason)
    """
    target = _skill_key(job_skill)

    if not target:
        return False, 0.0, ""

    target_related = {
        _clean(x)
        for x in RELATED_SKILLS.get(target, set())
    }

    best_score = 0.0
    best_resume_skill = None

    for resume_skill in resume_skills:
        candidate = _skill_key(resume_skill)

        if not candidate:
            continue

        if _are_distinct(target, candidate):
            continue

        # Direct related relationship.
        if candidate in target_related:
            # Strong evidence for closely related concepts.
            score = 0.78

            # RAG system design from actual RAG + vector DB + embeddings
            # is stronger than a single generic related skill.
            if target == "rag system design":
                if candidate in {
                    "rag pipelines",
                    "vector databases",
                    "embedding models",
                    "hybrid search",
                }:
                    score = 0.80

            best_score = max(best_score, score)

            if score == best_score:
                best_resume_skill = resume_skill

    if best_resume_skill:
        return (
            True,
            best_score,
            f"Related to resume skill '{best_resume_skill}'",
        )

    return False, 0.0, ""


# ============================================================================
# 8. MULTI-SKILL EVIDENCE
# ============================================================================

def _multi_skill_evidence(job_skill: str, resume_skills: list[str]) -> tuple[bool, float, str]:
    """
    Some job requirements are compound concepts.

    Example:

        RAG System Design

    can be supported by:

        RAG + Vector Databases + Embedding Models

    No single resume skill needs to be literally named "RAG System Design".
    """
    target = _skill_key(job_skill)

    resume_keys = {_skill_key(s) for s in resume_skills}

    if target == "rag system design":
        evidence = 0

        if any(
            _equivalent_match("RAG Pipelines", s)
            for s in resume_skills
        ):
            evidence += 2

        if any(
            _equivalent_match("Vector Databases", s)
            for s in resume_skills
        ):
            evidence += 1

        if any(
            _equivalent_match("Embedding Models", s)
            or _equivalent_match("Sentence Transformers", s)
            for s in resume_skills
        ):
            evidence += 1

        if any(
            _equivalent_match("Hybrid Search", s)
            for s in resume_skills
        ):
            evidence += 1

        if evidence >= 3:
            return (
                True,
                0.94,
                "Strong RAG evidence across multiple resume skills",
            )

        if evidence >= 2:
            return (
                True,
                0.87,
                "Multiple resume skills support RAG system design",
            )

        if evidence >= 1:
            return (
                True,
                0.80,
                "Resume contains direct RAG experience",
            )

    # Embedding models
    if target == "embedding models":
        if (
            "embedding models" in resume_keys
            or "sentence transformers" in resume_keys
        ):
            return (
                True,
                0.92,
                "Resume contains explicit embedding/Sentence Transformer experience",
            )

    # Hybrid search
    if target == "hybrid search":
        if "hybrid search" in resume_keys:
            return (
                True,
                0.95,
                "Resume explicitly contains hybrid search experience",
            )

    return False, 0.0, ""


# ============================================================================
# 9. OPTIONAL GEMINI AMBIGUITY CHECK
# ============================================================================

async def _llm_match_ambiguous(
    job_skills: list[str],
    resume_skills: list[str],
) -> dict[str, dict]:
    """
    Ask Gemini only about ambiguous requirements.

    The model is explicitly instructed NOT to infer skills merely because
    they are conceptually nearby.

    Returns:

    {
        "skill": {
            "status": "match|partial|missing",
            "confidence": 0.0,
            "reason": "..."
        }
    }
    """

    if not job_skills:
        return {}

    prompt = f"""
You are a conservative technical recruiting skill matcher.

Determine whether the candidate has enough evidence for each JOB SKILL.

CANDIDATE SKILLS:
{json.dumps(resume_skills, ensure_ascii=False)}

JOB SKILLS:
{json.dumps(job_skills, ensure_ascii=False)}

Abbreviation and synonym rules (these count as MATCH, not "related"):
- "RAG" matches any job-description phrasing: "RAG engineering", "RAG-based systems", "production RAG"
- "NLP" and "Natural Language Processing" are the same skill
- "ML" and "Machine Learning" are the same skill
- "CV" and "Computer Vision" are the same skill
- "k8s" and "Kubernetes" are the same skill
- Adding a role suffix like "engineering", "development", or "systems" to a technology
  does NOT create a different skill — it is the same capability rephrased for a job posting.

Rules:

1. EXACT or obvious aliases (including abbreviations and role-phrased forms) count as MATCH.
2. Closely RELATED but genuinely DIFFERENT skills do NOT automatically count as MATCH.
3. A broad skill does not automatically prove a highly specialized sub-skill.
4. Do not infer AWS from GCP.
5. Do not infer Kubernetes from Docker.
6. Do not infer React Native from React.
7. Do not infer LLM fine-tuning from simply knowing LLMs.
8. RAG + vector databases + embeddings is strong evidence for RAG system design.
9. Sentence Transformers or sentence embeddings are strong evidence for embedding models.
10. If evidence is related but incomplete, use PARTIAL.
11. If there is no meaningful evidence, use MISSING.
12. Be conservative. Never invent experience.

Return JSON only:

{{
  "results": [
    {{
      "skill": "exact job skill",
      "status": "match|partial|missing",
      "confidence": 0.0,
      "reason": "short explanation"
    }}
  ]
}}
"""

    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={
                "temperature": 0,
                "response_mime_type": "application/json",
            },
        )

        raw = (response.text or "").strip()

        if raw.startswith("```"):
            raw = raw.strip("`")

            if raw.startswith("json"):
                raw = raw[4:]

            raw = raw.strip()

        parsed = json.loads(raw)

        results = {}

        for item in parsed.get("results", []):
            skill = item.get("skill")

            if not skill:
                continue

            results[_skill_key(skill)] = {
                "status": item.get("status", "missing"),
                "confidence": float(item.get("confidence", 0.0)),
                "reason": item.get("reason", ""),
            }

        return results

    except Exception as exc:
        print(f"[skill_gap] LLM matching fallback failed: {exc}")
        return {}


# ============================================================================
# 9b. EMBEDDING-BASED SEMANTIC SKILL MATCHER
# ============================================================================

async def _embedding_semantic_match(
    job_skill: str,
    resume_skills: list[str],
    cache: dict,
    threshold: float = 0.80,
) -> tuple[bool, float, str]:
    """
    Use vector embeddings to generalize skill matching beyond static dictionaries.

    Handles any synonym pair automatically, including:
    - "RAG" ↔ "RAG engineering"               (same tech, JD suffix)
    - "NLP" ↔ "Natural Language Processing"    (abbreviation)
    - "CV"  ↔ "Computer Vision"                (abbreviation)
    - Any future pair not yet in EXACT_EQUIVALENTS

    The cache is a dict keyed by cleaned skill name.  Pass the same dict for
    all calls within one compute_skill_gap call so each unique string is
    embedded only once.

    Returns:
        (matched: bool, confidence: float, reason: str)
    """
    job_key = _clean(job_skill)
    if not job_key:
        return False, 0.0, ""

    if job_key not in cache:
        result = await asyncio.to_thread(create_embedding, job_skill)
        cache[job_key] = result.get("embedding", [])

    job_vec = cache[job_key]
    if not job_vec:
        return False, 0.0, ""

    best_score = 0.0
    best_skill = ""

    for resume_skill in resume_skills:
        rkey = _clean(resume_skill)
        if not rkey:
            continue

        # Never let embeddings bypass the explicit distinct-pairs blocklist.
        if _are_distinct(job_key, rkey):
            continue

        if rkey not in cache:
            result = await asyncio.to_thread(create_embedding, resume_skill)
            cache[rkey] = result.get("embedding", [])

        res_vec = cache[rkey]
        if not res_vec:
            continue

        sim = cosine_similarity(job_vec, res_vec)

        if sim > best_score:
            best_score = sim
            best_skill = resume_skill

    if best_score >= threshold and best_skill:
        return (
            True,
            round(best_score, 4),
            f"Semantically matched to resume skill '{best_skill}' "
            f"(embedding similarity {best_score:.2f})",
        )

    return False, 0.0, ""


# ============================================================================
# 10. MAIN MATCHING FUNCTION
# ============================================================================

async def _match_job_skill(
    job_skill: str,
    resume_skills: list[str],
    ambiguous_llm_results: dict[str, dict] | None = None,
    embedding_cache: dict | None = None,
) -> dict:
    """
    Match one job requirement against resume skills.
    """

    if not job_skill:
        return {
            "status": "missing",
            "confidence": 0.0,
            "reason": "Empty job requirement",
        }

    # ----------------------------------------------------------------------
    # Stage 1: exact / equivalent
    # ----------------------------------------------------------------------

    for resume_skill in resume_skills:
        if _equivalent_match(job_skill, resume_skill):
            return {
                "status": "match",
                "confidence": 1.0,
                "reason": f"Equivalent to resume skill '{resume_skill}'",
            }

    # ----------------------------------------------------------------------
    # Stage 2: multi-skill evidence
    # ----------------------------------------------------------------------

    matched, score, reason = _multi_skill_evidence(
        job_skill,
        resume_skills,
    )

    if matched:
        return {
            "status": "match",
            "confidence": score,
            "reason": reason,
        }

    # ----------------------------------------------------------------------
    # Stage 3: explicit related skills
    # ----------------------------------------------------------------------

    matched, score, reason = _related_match(
        job_skill,
        resume_skills,
    )

    if matched:
        return {
            "status": "partial",
            "confidence": score,
            "reason": reason,
        }

    # ----------------------------------------------------------------------
    # Stage 3.5: embedding semantic similarity
    #
    # Generalized catch-all for abbreviations, suffixed forms, and
    # semantic paraphrases not covered by any static dictionary.
    # Examples: "RAG" ↔ "RAG engineering", "NLP" ↔ "Natural Language Processing"
    # ----------------------------------------------------------------------

    if embedding_cache is not None:
        emb_matched, emb_score, emb_reason = await _embedding_semantic_match(
            job_skill, resume_skills, embedding_cache
        )
        if emb_matched:
            return {
                "status": "match" if emb_score >= 0.90 else "partial",
                "confidence": emb_score,
                "reason": emb_reason,
            }

    # ----------------------------------------------------------------------
    # Stage 4: LLM ambiguity resolution
    # ----------------------------------------------------------------------

    if ambiguous_llm_results:
        result = ambiguous_llm_results.get(_skill_key(job_skill))

        if result:
            return result

    # ----------------------------------------------------------------------
    # Stage 5: conservative missing
    # ----------------------------------------------------------------------

    return {
        "status": "missing",
        "confidence": 0.0,
        "reason": "No sufficient evidence found in resume skills",
    }


# ============================================================================
# 11. COMPUTE SKILL GAP FOR ONE JOB
# ============================================================================

async def compute_skill_gap(
    resume_skills: list[str],
    job: dict,
) -> dict:
    """
    Compare candidate skills against a single job.

    Results:

        matched_skills
        partial_skills
        missing_skills

    Required skills:
        MATCH    -> covered
        PARTIAL  -> not counted as fully covered
        MISSING  -> gap

    Preferred skills:
        MATCH    -> covered
        PARTIAL  -> useful gap
        MISSING  -> medium-priority gap
    """

    required = job.get("required_skills", []) or []
    preferred = job.get("preferred_skills", []) or []

    # Remove duplicates while preserving order.
    required = list(dict.fromkeys(
        str(x).strip() for x in required if str(x).strip()
    ))

    preferred = list(dict.fromkeys(
        str(x).strip() for x in preferred if str(x).strip()
    ))

    # Normalize all skills.
    resume_norm = await normalize_skills_async(resume_skills)
    required_norm = await normalize_skills_async(required)
    preferred_norm = await normalize_skills_async(preferred)

    # Canonical resume skills.
    normalized_resume_skills = []

    for item in resume_norm:
        skill = item.get("skill")

        if skill:
            normalized_resume_skills.append(skill)

    # Add original skills too.
    # This protects against normalization mistakes.
    all_resume_skills = list(dict.fromkeys(
        [
            *resume_skills,
            *normalized_resume_skills,
        ]
    ))

    # ----------------------------------------------------------------------
    # Identify ambiguous requirements.
    #
    # We only send skills to Gemini where deterministic matching doesn't
    # already give us a confident answer.
    # ----------------------------------------------------------------------

    # Shared embedding cache for this entire compute_skill_gap call.
    # Each unique skill string is embedded at most once.
    embedding_cache: dict = {}

    ambiguous = []

    all_job_skills = list(dict.fromkeys([
        *required,
        *preferred,
    ]))

    for job_skill in all_job_skills:

        deterministic = await _match_job_skill(
            job_skill,
            all_resume_skills,
            ambiguous_llm_results={},
            embedding_cache=embedding_cache,
        )

        # If we already have exact, multi-skill, or semantic evidence,
        # no LLM call is necessary.
        if deterministic["status"] in {"match", "partial"}:
            continue

        ambiguous.append(job_skill)

    llm_results = {}

    if ambiguous:
        llm_results = await _llm_match_ambiguous(
            ambiguous,
            all_resume_skills,
        )

    # ----------------------------------------------------------------------
    # Evaluate required skills.
    # ----------------------------------------------------------------------

    matched_required = []
    partial_required = []
    missing_required = []

    for original_skill, norm in zip(required, required_norm):

        result = await _match_job_skill(
            original_skill,
            all_resume_skills,
            ambiguous_llm_results=llm_results,
            embedding_cache=embedding_cache,
        )

        status = result["status"]

        entry = {
            "skill": original_skill,
            "priority": "HIGH",
            "resolved_skill": norm.get("skill", original_skill),
            "resolution_confidence": norm.get("confidence", 0.0),
            "resolution_method": norm.get("method", "none"),
            "match_confidence": result["confidence"],
            "match_status": status,
            "match_reason": result["reason"],
        }

        if status == "match":
            matched_required.append(entry)

        elif status == "partial":
            partial_required.append(entry)

        else:
            missing_required.append(entry)

    # ----------------------------------------------------------------------
    # Evaluate preferred skills.
    # ----------------------------------------------------------------------

    matched_preferred = []
    partial_preferred = []
    missing_preferred = []

    for original_skill, norm in zip(preferred, preferred_norm):

        result = await _match_job_skill(
            original_skill,
            all_resume_skills,
            ambiguous_llm_results=llm_results,
            embedding_cache=embedding_cache,
        )

        status = result["status"]

        entry = {
            "skill": original_skill,
            "priority": "MEDIUM",
            "resolved_skill": norm.get("skill", original_skill),
            "resolution_confidence": norm.get("confidence", 0.0),
            "resolution_method": norm.get("method", "none"),
            "match_confidence": result["confidence"],
            "match_status": status,
            "match_reason": result["reason"],
        }

        if status == "match":
            matched_preferred.append(entry)

        elif status == "partial":
            partial_preferred.append(entry)

        else:
            missing_preferred.append(entry)

    # ----------------------------------------------------------------------
    # Missing skills.
    #
    # We keep PARTIAL skills in the gap list because they are areas worth
    # strengthening, but they are explicitly marked PARTIAL rather than
    # pretending they are completely missing.
    # ----------------------------------------------------------------------

    gaps = [
        *missing_required,
        *partial_required,
        *missing_preferred,
        *partial_preferred,
    ]

    # Required coverage:
    #
    # Full match = 1.0
    # Partial = 0.5
    # Missing = 0.0
    #
    # This is much more informative than binary equality.
    required_score = (
        len(matched_required)
        + 0.5 * len(partial_required)
    )

    coverage_percent = (
        round((required_score / len(required)) * 100, 1)
        if required
        else 100.0
    )

    # Keep the old field so the frontend doesn't break.
    matched_skills = [
        item["skill"]
        for item in matched_required
    ]

    return {
        "job_id": job.get("id"),
        "job_title": job.get("title"),

        "matched_skills": matched_skills,

        "matched_required_skills": matched_required,
        "partial_required_skills": partial_required,
        "missing_required_skills": missing_required,

        "matched_preferred_skills": matched_preferred,
        "partial_preferred_skills": partial_preferred,
        "missing_preferred_skills": missing_preferred,

        "missing_skills": gaps,

        "total_required": len(required),
        "matched_required": len(matched_required),
        "partial_required": len(partial_required),
        "missing_required": len(missing_required),

        "coverage_percent": coverage_percent,
    }


# ============================================================================
# 12. PREPARATION RECOMMENDATIONS
# ============================================================================

async def generate_prep_recommendations(
    missing_skills: list[dict],
) -> list[dict]:

    if not missing_skills:
        return []

    # Only ask Gemini to prepare for actual missing/partial skills.
    skill_names = []

    for item in missing_skills:
        skill = item.get("skill")

        if not skill:
            continue

        if skill not in skill_names:
            skill_names.append(skill)

    if not skill_names:
        return missing_skills

    prompt = f"""
You are helping a candidate close technical skill gaps for software/AI jobs.

For each skill below, give ONE concrete and practical preparation action.

Skills:
{json.dumps(skill_names, ensure_ascii=False)}

Rules:

- Do not invent candidate experience.
- Do not say the candidate should "learn the basics" without specifying what to build.
- Prefer a small implementation/project.
- If the skill is an AI/RAG skill, recommend an implementation.
- If the skill is cloud/deployment, recommend deploying something.
- If the skill is testing, recommend adding tests to an existing project.
- If the skill is LLM evaluation, recommend building a small evaluation dataset/pipeline.
- Keep each recommendation to one concise sentence.

Examples:

Reranking:
"Add a cross-encoder reranker after vector retrieval and measure Recall@K and MRR before and after reranking."

Chunking Strategies:
"Implement fixed-size, recursive, and semantic chunking on the same document set and compare retrieval Recall@K."

AWS:
"Deploy the existing FastAPI application to AWS using Docker and configure environment-based secret management."

Return JSON only:

{{
  "recommendations": [
    {{
      "skill": "skill name",
      "action": "one concrete preparation action"
    }}
  ]
}}
"""

    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={
                "temperature": 0,
                "response_mime_type": "application/json",
            },
        )

        raw_text = (response.text or "").strip()

        if raw_text.startswith("```"):
            raw_text = raw_text.strip("`")

            if raw_text.startswith("json"):
                raw_text = raw_text[4:]

            raw_text = raw_text.strip()

        parsed = json.loads(raw_text)

        recs = parsed.get("recommendations", [])

    except Exception as exc:
        print(f"[skill_gap] Recommendation generation failed: {exc}")
        recs = []

    action_map = {}

    for item in recs:
        skill = item.get("skill")
        action = item.get("action")

        if skill and action:
            action_map[_skill_key(skill)] = action

    result = []

    for item in missing_skills:

        skill = item.get("skill", "")

        action = action_map.get(
            _skill_key(skill),
            "Build a small practical project using this skill.",
        )

        result.append({
            **item,
            "recommended_prep": action,
        })

    return result


# ============================================================================
# 13. SINGLE JOB API
# ============================================================================

async def get_skill_gap_for_job(
    user_id: str,
    job_id: str,
) -> dict:

    profile = get_user_latest_full_profile(user_id)

    if not profile:
        raise ValueError("No profile found for this user")

    job = get_job_by_id(job_id)

    if not job:
        raise ValueError("Job not found")

    resume_skills = extract_all_candidate_skills(profile)

    gap = await compute_skill_gap(
        resume_skills,
        job,
    )

    gap["missing_skills"] = await generate_prep_recommendations(
        gap["missing_skills"]
    )

    return gap


# ============================================================================
# 14. AGGREGATE SKILL GAP
# ============================================================================

async def get_aggregate_skill_gap(
    user_id: str,
    limit: int = 20,
) -> dict:
    """
    Find the skills that are most frequently missing across jobs.

    IMPORTANT:
    appears_in_jobs now means actual number of jobs, NOT weighted score.

    Required skills are weighted more heavily for ranking, but the displayed
    job count remains a real job count.
    """

    profile = get_user_latest_full_profile(user_id)

    if not profile:
        raise ValueError("No profile found for this user")

    resume_skills = extract_all_candidate_skills(profile)

    jobs = search_jobs(
        query=None,
        limit=limit,
    )

    if not jobs:
        return {
            "missing_skills": [],
            "jobs_analyzed": 0,
        }

    # ----------------------------------------------------------------------
    # Counters
    # ----------------------------------------------------------------------

    weighted_counter = defaultdict(float)
    job_counter = defaultdict(int)

    required_job_counter = defaultdict(int)
    preferred_job_counter = defaultdict(int)

    display_name = {}

    # ----------------------------------------------------------------------
    # Process each job independently.
    # ----------------------------------------------------------------------

    for job in jobs:

        gap = await compute_skill_gap(
            resume_skills,
            job,
        )

        # A set ensures a skill is counted at most once per job.
        seen_in_this_job = set()

        for item in gap.get("missing_skills", []):

            skill = item.get("skill")

            if not skill:
                continue

            key = _skill_key(skill)

            if not key:
                continue

            if key in seen_in_this_job:
                continue

            seen_in_this_job.add(key)

            display_name.setdefault(
                key,
                item.get("resolved_skill") or skill,
            )

            status = item.get("match_status", "missing")
            priority = item.get("priority", "MEDIUM")

            # PARTIAL is less severe than fully missing.
            if status == "partial":
                severity = 0.5
            else:
                severity = 1.0

            # Required skills are more important.
            if priority == "HIGH":
                weighted_counter[key] += 2.0 * severity
                required_job_counter[key] += 1
            else:
                weighted_counter[key] += 1.0 * severity
                preferred_job_counter[key] += 1

            job_counter[key] += 1

    if not weighted_counter:
        return {
            "missing_skills": [],
            "jobs_analyzed": len(jobs),
        }

    # ----------------------------------------------------------------------
    # Rank.
    #
    # Required frequency matters more than preferred frequency.
    # ----------------------------------------------------------------------

    ranked_keys = sorted(
        weighted_counter.keys(),
        key=lambda k: (
            weighted_counter[k],
            required_job_counter[k],
            job_counter[k],
        ),
        reverse=True,
    )

    ranked = []

    for key in ranked_keys[:10]:

        total_jobs = job_counter[key]
        required_jobs = required_job_counter[key]
        preferred_jobs = preferred_job_counter[key]

        # High priority if:
        # - appears as required in at least 2 jobs
        # OR
        # - appears as required in >= 30% of analyzed jobs
        # OR
        # - has a very high weighted score.
        required_ratio = (
            required_jobs / len(jobs)
            if jobs
            else 0
        )

        if (
            required_jobs >= 2
            or required_ratio >= 0.30
            or weighted_counter[key] >= 5
        ):
            priority = "HIGH"

        elif preferred_jobs >= 2:
            priority = "MEDIUM"

        else:
            priority = "LOW"

        ranked.append({
            "skill": display_name[key],
            "priority": priority,
            "appears_in_jobs": total_jobs,
            "required_in_jobs": required_jobs,
            "preferred_in_jobs": preferred_jobs,
            "weighted_gap_score": round(
                weighted_counter[key],
                2,
            ),
        })

    # ----------------------------------------------------------------------
    # Recommendations.
    # ----------------------------------------------------------------------

    ranked_with_prep = await generate_prep_recommendations(
        [
            {
                "skill": item["skill"],
                "priority": item["priority"],
                "appears_in_jobs": item["appears_in_jobs"],
                "required_in_jobs": item["required_in_jobs"],
                "preferred_in_jobs": item["preferred_in_jobs"],
                "weighted_gap_score": item["weighted_gap_score"],
            }
            for item in ranked
        ]
    )

    return {
        "missing_skills": ranked_with_prep,
        "jobs_analyzed": len(jobs),
    }