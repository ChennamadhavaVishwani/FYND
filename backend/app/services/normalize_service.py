"""
Skill normalization pipeline.

normalize_skill(raw_skill) resolves a raw, free-text skill string (as it
might appear on a resume or in a job posting) to one of a fixed set of
canonical skill names, using three tiers of increasing cost:

  1. Dictionary lookup   - exact match against a curated alias table
  2. Fuzzy matching      - rapidfuzz string similarity against canonical names
  3. Embedding fallback  - cosine similarity using gemini-embedding-001,
                            cached in Postgres via skill_knowledge_store

Each tier only runs if the previous tier failed to find a confident match.
If nothing resolves confidently, the raw skill is logged to the
skill_review_queue table (Phase 4) instead of being forced into a match —
so the vocabulary grows from real usage instead of requiring every skill
to be predicted upfront.
"""

import re
import asyncio

from rapidfuzz import process, fuzz

from app.services.embedding_service import create_embedding

# ---------------------------------------------------------------------------
# 1. Canonical skill dictionary
# ---------------------------------------------------------------------------
# Map of alias (any casing/spacing) -> canonical skill name.
# This is the cheapest and most reliable tier. Grow it over time by reviewing
# skill_review_queue (see skill_knowledge_store.get_pending_review_skills).

SKILL_ALIASES: dict[str, str] = {
    # --- Languages ---
    "js": "JavaScript", "javascript": "JavaScript", "es6": "JavaScript",
    "ts": "TypeScript", "typescript": "TypeScript",
    "py": "Python", "python": "Python", "python3": "Python",
    "java": "Java",
    "c++": "C++", "cpp": "C++",
    "c#": "C#", "csharp": "C#", "dotnet": "C#", ".net": "C#",
    "golang": "Go", "go": "Go",
    "rust": "Rust",
    "kotlin": "Kotlin",
    "swift": "Swift",
    "php": "PHP",
    "ruby": "Ruby",
    "r lang": "R", "r programming": "R",
    "scala": "Scala",
    "matlab": "MATLAB",
    "sql": "SQL",
    "bash": "Bash/Shell", "shell scripting": "Bash/Shell", "shell": "Bash/Shell",
    "perl": "Perl",
    "haskell": "Haskell",
    "julia": "Julia",
    "dart": "Dart",

    # --- Frontend ---
    "react": "React", "reactjs": "React", "react.js": "React",
    "vue": "Vue.js", "vuejs": "Vue.js", "vue.js": "Vue.js",
    "angular": "Angular", "angularjs": "Angular",
    "next": "Next.js", "nextjs": "Next.js", "next.js": "Next.js",
    "svelte": "Svelte",
    "html": "HTML", "html5": "HTML",
    "css": "CSS", "css3": "CSS",
    "sass": "Sass", "scss": "Sass",
    "tailwind": "Tailwind CSS", "tailwindcss": "Tailwind CSS",
    "redux": "Redux",
    "vite": "Vite",
    "webpack": "Webpack",
    "jquery": "jQuery",
    "three.js": "Three.js", "threejs": "Three.js",
    "d3": "D3.js", "d3.js": "D3.js",

    # --- Mobile ---
    "react native": "React Native", "reactnative": "React Native",
    "flutter": "Flutter",
    "android dev": "Android Development", "android development": "Android Development",
    "ios dev": "iOS Development", "ios development": "iOS Development",
    "swiftui": "SwiftUI",

    # --- Backend / frameworks ---
    "node": "Node.js", "nodejs": "Node.js", "node.js": "Node.js",
    "express": "Express.js", "expressjs": "Express.js",
    "fastapi": "FastAPI",
    "flask": "Flask",
    "django": "Django",
    "spring": "Spring Boot", "springboot": "Spring Boot", "spring boot": "Spring Boot",
    "rails": "Ruby on Rails", "ruby on rails": "Ruby on Rails",
    "graphql": "GraphQL",
    "rest": "REST APIs", "rest api": "REST APIs", "restful": "REST APIs",
    "grpc": "gRPC",
    "websockets": "WebSockets", "websocket": "WebSockets",
    "microservices": "Microservices",

    # --- Data / ML / AI ---
    "ml": "Machine Learning", "machine learning": "Machine Learning",
    "dl": "Deep Learning", "deep learning": "Deep Learning",
    "nlp": "Natural Language Processing", "natural language processing": "Natural Language Processing",
    "cv": "Computer Vision", "computer vision": "Computer Vision",
    "pytorch": "PyTorch", "torch": "PyTorch",
    "tensorflow": "TensorFlow", "tf": "TensorFlow",
    "keras": "Keras",
    "scikit-learn": "Scikit-learn", "sklearn": "Scikit-learn",
    "pandas": "Pandas",
    "numpy": "NumPy",
    "lora": "LoRA", "peft": "LoRA", "qlora": "LoRA",
    "llm": "LLM Fine-tuning", "llm fine-tuning": "LLM Fine-tuning",
    "fine-tuning": "LLM Fine-tuning", "finetuning": "LLM Fine-tuning",
    "rag": "RAG Pipelines", "retrieval augmented generation": "RAG Pipelines",
    "prompt engineering": "Prompt Engineering",
    "huggingface": "Hugging Face", "hugging face": "Hugging Face", "transformers": "Hugging Face",
    "reinforcement learning": "Reinforcement Learning", "rl": "Reinforcement Learning",
    "mlops": "MLOps",
    "data engineering": "Data Engineering",
    "etl": "ETL Pipelines", "etl pipelines": "ETL Pipelines",
    "spark": "Apache Spark", "pyspark": "Apache Spark", "apache spark": "Apache Spark",
    "airflow": "Apache Airflow", "apache airflow": "Apache Airflow",
    "kafka": "Apache Kafka", "apache kafka": "Apache Kafka",
    "data visualization": "Data Visualization", "dataviz": "Data Visualization",
    "statistics": "Statistics", "stats": "Statistics",
    "a/b testing": "A/B Testing", "ab testing": "A/B Testing",

    # --- Databases ---
    "postgres": "PostgreSQL", "postgresql": "PostgreSQL",
    "mysql": "MySQL",
    "mongo": "MongoDB", "mongodb": "MongoDB",
    "redis": "Redis",
    "sqlite": "SQLite",
    "supabase": "Supabase",
    "qdrant": "Qdrant",
    "pinecone": "Pinecone",
    "elasticsearch": "Elasticsearch",
    "dynamodb": "DynamoDB",
    "vector database": "Vector Databases", "vector db": "Vector Databases",

    # --- Cloud / DevOps ---
    "aws": "AWS", "amazon web services": "AWS",
    "gcp": "GCP", "google cloud": "GCP", "google cloud platform": "GCP",
    "azure": "Azure",
    "docker": "Docker",
    "k8s": "Kubernetes", "kubernetes": "Kubernetes",
    "ci/cd": "CI/CD", "cicd": "CI/CD", "github actions": "CI/CD",
    "git": "Git",
    "terraform": "Terraform",
    "linux": "Linux",
    "nginx": "Nginx",
    "serverless": "Serverless Architecture",

    # --- Testing / QA ---
    "unit testing": "Unit Testing",
    "pytest": "Pytest",
    "jest": "Jest",
    "selenium": "Selenium",
    "cypress": "Cypress",
    "tdd": "Test-Driven Development", "test driven development": "Test-Driven Development",

    # --- Security ---
    "cybersecurity": "Cybersecurity", "infosec": "Cybersecurity",
    "penetration testing": "Penetration Testing", "pentesting": "Penetration Testing",
    "oauth": "OAuth", "oauth2": "OAuth",
    "jwt": "JWT Authentication", "jwt auth": "JWT Authentication",

    # --- Formal methods / compilers (relevant to your own research) ---
    "antlr": "ANTLR", "antlr4": "ANTLR",
    "formal verification": "Formal Verification",
    "ltl": "Linear Temporal Logic", "linear temporal logic": "Linear Temporal Logic",
    "compiler design": "Compiler Design",
    "parsing": "Parsing & Grammars", "grammar design": "Parsing & Grammars",

    # --- Design / product ---
    "figma": "Figma",
    "ui/ux": "UI/UX Design", "ux": "UI/UX Design", "ui": "UI/UX Design",
    "wireframing": "Wireframing",

    # --- Project management / collaboration ---
    "jira": "Jira",
    "agile": "Agile Methodology", "scrum": "Agile Methodology",
    "confluence": "Confluence",

    # --- Misc tools ---
    "tkinter": "Tkinter",
    "matplotlib": "Matplotlib",
    "plotly": "Plotly",
}

# Canonical skill universe = every distinct value in the alias table.
CANONICAL_SKILLS: list[str] = sorted(set(SKILL_ALIASES.values()))

# Make every canonical skill resolvable to itself too (e.g. "PostgreSQL" -> "PostgreSQL").
for _canon in CANONICAL_SKILLS:
    SKILL_ALIASES.setdefault(_canon.lower(), _canon)


# ---------------------------------------------------------------------------
# Text cleanup
# ---------------------------------------------------------------------------

_PUNCT_RE = re.compile(r"[_/,]+")
_WS_RE = re.compile(r"\s+")


def _clean(text: str) -> str:
    text = text.strip().lower()
    text = _PUNCT_RE.sub(" ", text)
    text = _WS_RE.sub(" ", text)
    return text.strip()


# ---------------------------------------------------------------------------
# Tier 1: dictionary
# ---------------------------------------------------------------------------

def _dictionary_match(raw: str) -> dict | None:
    key = _clean(raw)
    canonical = SKILL_ALIASES.get(key)
    if canonical:
        return {"skill": canonical, "confidence": 1.0, "method": "dictionary"}
    return None


# ---------------------------------------------------------------------------
# Tier 2: fuzzy matching
# ---------------------------------------------------------------------------

FUZZY_THRESHOLD = 87  # 0-100 scale; raise if you see false positives, lower if misses


def _fuzzy_match(raw: str) -> dict | None:
    key = _clean(raw)
    if not key:
        return None

    match = process.extractOne(
        key,
        CANONICAL_SKILLS,
        scorer=fuzz.token_sort_ratio,
        processor=str.lower,
    )
    if match is None:
        return None

    canonical, score, _ = match
    if score >= FUZZY_THRESHOLD:
        return {"skill": canonical, "confidence": round(score / 100, 3), "method": "fuzzy"}
    return None


# ---------------------------------------------------------------------------
# Tier 3: embedding fallback (Phase 3: DB-persisted cache)
# ---------------------------------------------------------------------------

EMBEDDING_THRESHOLD = 0.80  # cosine similarity, 0-1 scale, below which we don't force a match

# In-memory cache: canonical skill -> embedding vector. Seeded from Postgres
# on first use each process, then kept warm for the process lifetime.
_canonical_embedding_cache: dict[str, list[float]] = {}
_db_cache_loaded = False


def _ensure_db_cache_loaded() -> None:
    """Load persisted canonical embeddings from Postgres once per process."""
    global _db_cache_loaded
    if _db_cache_loaded:
        return
    try:
        from app.services.skill_knowledge_store import get_all_canonical_embeddings
        _canonical_embedding_cache.update(get_all_canonical_embeddings())
    except Exception as e:
        print(f"[normalize_service] Could not load embedding cache from DB: {e}")
    _db_cache_loaded = True


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(y * y for y in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _get_canonical_embedding(skill: str) -> list[float]:
    _ensure_db_cache_loaded()

    if skill not in _canonical_embedding_cache:
        result = create_embedding(skill)
        vector = result.get("embedding", [])
        _canonical_embedding_cache[skill] = vector
        if vector:
            try:
                from app.services.skill_knowledge_store import upsert_canonical_embedding
                upsert_canonical_embedding(skill, vector)
            except Exception as e:
                print(f"[normalize_service] Could not persist embedding for {skill!r}: {e}")

    return _canonical_embedding_cache[skill]


def _log_unknown(raw: str, method: str, confidence: float, best_guess: str | None = None) -> None:
    """Best-effort logging to skill_review_queue. Never breaks the caller."""
    try:
        from app.services.skill_knowledge_store import log_unknown_skill
        log_unknown_skill(raw_skill=raw, method=method, confidence=confidence, best_guess=best_guess)
    except Exception as e:
        print(f"[normalize_service] Could not log unknown skill {raw!r}: {e}")


def _embedding_match(raw: str) -> dict | None:
    raw_embedding = create_embedding(raw).get("embedding", [])
    if not raw_embedding:
        return None

    best_skill = None
    best_score = 0.0

    for skill in CANONICAL_SKILLS:
        canon_embedding = _get_canonical_embedding(skill)
        if not canon_embedding:
            continue
        score = _cosine_similarity(raw_embedding, canon_embedding)
        if score > best_score:
            best_score = score
            best_skill = skill

    if best_skill and best_score >= EMBEDDING_THRESHOLD:
        return {"skill": best_skill, "confidence": round(best_score, 3), "method": "embedding"}

    # Phase 4: low-confidence, even at the embedding tier — don't force a
    # match. Log the raw skill plus our best (rejected) guess so a human can
    # review it and decide whether it belongs in SKILL_ALIASES.
    _log_unknown(raw, method="embedding_below_threshold", confidence=round(best_score, 3), best_guess=best_skill)
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def normalize_skill(raw: str) -> dict:
    """
    Resolve a raw skill string to a canonical skill name.

    Returns:
        {"skill": <canonical or original>, "confidence": float, "method": str}
        method is one of "dictionary", "fuzzy", "embedding", "none".
        "none" means no confident match was found anywhere in the pipeline;
        the original (cleaned) string is returned as a best-effort fallback
        so downstream code always has *something* to display/compare, and
        the raw string is queued in skill_review_queue for vocabulary growth.
    """
    if not raw or not raw.strip():
        return {"skill": raw, "confidence": 0.0, "method": "none"}

    result = _dictionary_match(raw)
    if result:
        return result

    result = _fuzzy_match(raw)
    if result:
        return result

    result = _embedding_match(raw)
    if result:
        return result

    _log_unknown(raw.strip(), method="none", confidence=0.0)
    return {"skill": raw.strip(), "confidence": 0.0, "method": "none"}


async def normalize_skill_async(raw: str) -> dict:
    """
    Async wrapper for normalize_skill. Use this from async service code so
    the (potentially network-bound) embedding tier and DB logging don't
    block the event loop.
    """
    return await asyncio.to_thread(normalize_skill, raw)


def normalize_skills(raw_skills: list[str]) -> list[dict]:
    """Batch, synchronous convenience wrapper."""
    return [normalize_skill(s) for s in raw_skills]


async def normalize_skills_async(raw_skills: list[str]) -> list[dict]:
    """Batch, async convenience wrapper. Runs normalizations concurrently."""
    if not raw_skills:
        return []
    return await asyncio.gather(*(normalize_skill_async(s) for s in raw_skills))