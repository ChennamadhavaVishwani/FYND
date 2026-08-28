"""
FYND Resources Service

Returns curated learning resources for skill gap items.
Uses a static map for well-known skills, with a Gemini fallback for
skills not in the static map.

Each resource has:
    title       – display name for the resource
    url         – external link
    type        – "course" | "video" | "docs" | "interactive" | "article"
    platform    – "Coursera" | "YouTube" | "freeCodeCamp" | "Udemy" | "Official Docs" | etc.
    duration    – human-readable e.g. "8 hours", "4 weeks"
    is_free     – bool
"""

import json
from app.services.llm_service import client

# ---------------------------------------------------------------------------
# Static curated resource map
# Key: lowercase canonical skill name (or alias)
# ---------------------------------------------------------------------------

RESOURCE_MAP: dict[str, list[dict]] = {
    # ── Python ──────────────────────────────────────────────────────────────
    "python": [
        {
            "title": "Python for Everybody – Full Course",
            "url": "https://www.youtube.com/watch?v=8DvywoWv6fI",
            "type": "video",
            "platform": "YouTube / freeCodeCamp",
            "duration": "14 hours",
            "is_free": True,
        },
        {
            "title": "Python 3 Official Tutorial",
            "url": "https://docs.python.org/3/tutorial/",
            "type": "docs",
            "platform": "Official Docs",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "Python Crash Course – Automate the Boring Stuff",
            "url": "https://automatetheboringstuff.com/",
            "type": "article",
            "platform": "Free Book",
            "duration": "20+ hours",
            "is_free": True,
        },
        {
            "title": "Python Bootcamp – Udemy",
            "url": "https://www.udemy.com/course/complete-python-bootcamp/",
            "type": "course",
            "platform": "Udemy",
            "duration": "22 hours",
            "is_free": False,
        },
    ],
    # ── JavaScript ──────────────────────────────────────────────────────────
    "javascript": [
        {
            "title": "JavaScript Algorithms and Data Structures",
            "url": "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/",
            "type": "interactive",
            "platform": "freeCodeCamp",
            "duration": "300 hours",
            "is_free": True,
        },
        {
            "title": "The Modern JavaScript Tutorial",
            "url": "https://javascript.info/",
            "type": "article",
            "platform": "javascript.info",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "JavaScript Full Course – freeCodeCamp",
            "url": "https://www.youtube.com/watch?v=jS4aFq5-91M",
            "type": "video",
            "platform": "YouTube / freeCodeCamp",
            "duration": "7 hours",
            "is_free": True,
        },
    ],
    # ── TypeScript ───────────────────────────────────────────────────────────
    "typescript": [
        {
            "title": "TypeScript Official Handbook",
            "url": "https://www.typescriptlang.org/docs/handbook/intro.html",
            "type": "docs",
            "platform": "Official Docs",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "TypeScript Full Course for Beginners",
            "url": "https://www.youtube.com/watch?v=30LWjhZzg50",
            "type": "video",
            "platform": "YouTube / freeCodeCamp",
            "duration": "3 hours",
            "is_free": True,
        },
        {
            "title": "Understanding TypeScript – Udemy",
            "url": "https://www.udemy.com/course/understanding-typescript/",
            "type": "course",
            "platform": "Udemy",
            "duration": "15 hours",
            "is_free": False,
        },
    ],
    # ── React ────────────────────────────────────────────────────────────────
    "react": [
        {
            "title": "React Official Docs & Tutorial",
            "url": "https://react.dev/learn",
            "type": "docs",
            "platform": "Official Docs",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "Full Stack Open – React",
            "url": "https://fullstackopen.com/en/",
            "type": "interactive",
            "platform": "University of Helsinki",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "React – The Complete Guide – Udemy",
            "url": "https://www.udemy.com/course/react-the-complete-guide-incl-redux/",
            "type": "course",
            "platform": "Udemy",
            "duration": "49 hours",
            "is_free": False,
        },
    ],
    # ── Node.js ──────────────────────────────────────────────────────────────
    "node.js": [
        {
            "title": "Node.js Official Docs",
            "url": "https://nodejs.org/en/docs",
            "type": "docs",
            "platform": "Official Docs",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "Node.js and Express.js – Full Course",
            "url": "https://www.youtube.com/watch?v=Oe421EPjeBE",
            "type": "video",
            "platform": "YouTube / freeCodeCamp",
            "duration": "8 hours",
            "is_free": True,
        },
    ],
    # ── Next.js ──────────────────────────────────────────────────────────────
    "next.js": [
        {
            "title": "Next.js Official Learn Course",
            "url": "https://nextjs.org/learn",
            "type": "interactive",
            "platform": "Official Docs",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "Next.js 14 Full Course",
            "url": "https://www.youtube.com/watch?v=ZjAqacIC_3c",
            "type": "video",
            "platform": "YouTube",
            "duration": "5 hours",
            "is_free": True,
        },
    ],
    # ── SQL / PostgreSQL ─────────────────────────────────────────────────────
    "sql": [
        {
            "title": "SQL for Data Science – Coursera",
            "url": "https://www.coursera.org/learn/sql-for-data-science",
            "type": "course",
            "platform": "Coursera",
            "duration": "4 weeks",
            "is_free": False,
        },
        {
            "title": "SQLZoo – Interactive SQL Tutorial",
            "url": "https://sqlzoo.net/",
            "type": "interactive",
            "platform": "SQLZoo",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "PostgreSQL Tutorial",
            "url": "https://www.postgresqltutorial.com/",
            "type": "article",
            "platform": "postgresqltutorial.com",
            "duration": "Self-paced",
            "is_free": True,
        },
    ],
    "postgresql": [
        {
            "title": "PostgreSQL Official Tutorial",
            "url": "https://www.postgresql.org/docs/current/tutorial.html",
            "type": "docs",
            "platform": "Official Docs",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "PostgreSQL Full Course",
            "url": "https://www.youtube.com/watch?v=qw--VYLpxG4",
            "type": "video",
            "platform": "YouTube / freeCodeCamp",
            "duration": "4 hours",
            "is_free": True,
        },
    ],
    # ── Docker ───────────────────────────────────────────────────────────────
    "docker": [
        {
            "title": "Docker Official Get Started Guide",
            "url": "https://docs.docker.com/get-started/",
            "type": "docs",
            "platform": "Official Docs",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "Docker Tutorial for Beginners – Full Course",
            "url": "https://www.youtube.com/watch?v=fqMOX6JJhGo",
            "type": "video",
            "platform": "YouTube / freeCodeCamp",
            "duration": "2.5 hours",
            "is_free": True,
        },
        {
            "title": "Docker & Kubernetes – Udemy",
            "url": "https://www.udemy.com/course/docker-kubernetes-the-practical-guide/",
            "type": "course",
            "platform": "Udemy",
            "duration": "23 hours",
            "is_free": False,
        },
    ],
    # ── Kubernetes ───────────────────────────────────────────────────────────
    "kubernetes": [
        {
            "title": "Kubernetes Official Interactive Tutorial",
            "url": "https://kubernetes.io/docs/tutorials/",
            "type": "docs",
            "platform": "Official Docs",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "Kubernetes Course – Full Beginners Tutorial",
            "url": "https://www.youtube.com/watch?v=d6WC5n9G_sM",
            "type": "video",
            "platform": "YouTube / freeCodeCamp",
            "duration": "4 hours",
            "is_free": True,
        },
    ],
    # ── AWS ──────────────────────────────────────────────────────────────────
    "aws": [
        {
            "title": "AWS Cloud Practitioner – Official Training",
            "url": "https://aws.amazon.com/training/digital/aws-cloud-practitioner-essentials/",
            "type": "course",
            "platform": "AWS",
            "duration": "6 hours",
            "is_free": True,
        },
        {
            "title": "AWS Certified Solutions Architect – Udemy",
            "url": "https://www.udemy.com/course/aws-certified-solutions-architect-associate-saa-c03/",
            "type": "course",
            "platform": "Udemy",
            "duration": "27 hours",
            "is_free": False,
        },
    ],
    # ── Machine Learning ─────────────────────────────────────────────────────
    "machine learning": [
        {
            "title": "Machine Learning Specialization – Coursera (Andrew Ng)",
            "url": "https://www.coursera.org/specializations/machine-learning-introduction",
            "type": "course",
            "platform": "Coursera",
            "duration": "3 months",
            "is_free": False,
        },
        {
            "title": "fast.ai Practical Deep Learning",
            "url": "https://course.fast.ai/",
            "type": "interactive",
            "platform": "fast.ai",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "ML Crash Course – Google",
            "url": "https://developers.google.com/machine-learning/crash-course",
            "type": "interactive",
            "platform": "Google",
            "duration": "15 hours",
            "is_free": True,
        },
    ],
    # ── Deep Learning / PyTorch / TensorFlow ─────────────────────────────────
    "deep learning": [
        {
            "title": "Deep Learning Specialization – Coursera (Andrew Ng)",
            "url": "https://www.coursera.org/specializations/deep-learning",
            "type": "course",
            "platform": "Coursera",
            "duration": "5 months",
            "is_free": False,
        },
        {
            "title": "fast.ai Practical Deep Learning",
            "url": "https://course.fast.ai/",
            "type": "interactive",
            "platform": "fast.ai",
            "duration": "Self-paced",
            "is_free": True,
        },
    ],
    "pytorch": [
        {
            "title": "PyTorch Official Tutorials",
            "url": "https://pytorch.org/tutorials/",
            "type": "docs",
            "platform": "Official Docs",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "PyTorch for Deep Learning – Full Course",
            "url": "https://www.youtube.com/watch?v=V_xro1bcAuA",
            "type": "video",
            "platform": "YouTube / freeCodeCamp",
            "duration": "25 hours",
            "is_free": True,
        },
    ],
    "tensorflow": [
        {
            "title": "TensorFlow Official Tutorials",
            "url": "https://www.tensorflow.org/tutorials",
            "type": "docs",
            "platform": "Official Docs",
            "duration": "Self-paced",
            "is_free": True,
        },
    ],
    # ── LLM / GenAI ──────────────────────────────────────────────────────────
    "llm": [
        {
            "title": "LLM University – Cohere",
            "url": "https://docs.cohere.com/docs/llmu",
            "type": "interactive",
            "platform": "Cohere",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "Generative AI for Beginners – Microsoft",
            "url": "https://github.com/microsoft/generative-ai-for-beginners",
            "type": "interactive",
            "platform": "Microsoft / GitHub",
            "duration": "Self-paced",
            "is_free": True,
        },
    ],
    "langchain": [
        {
            "title": "LangChain Official Docs",
            "url": "https://python.langchain.com/docs/get_started/introduction",
            "type": "docs",
            "platform": "Official Docs",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "LangChain – Full Tutorial",
            "url": "https://www.youtube.com/watch?v=nAmC7SoVLd8",
            "type": "video",
            "platform": "YouTube",
            "duration": "3 hours",
            "is_free": True,
        },
    ],
    # ── Data Science ──────────────────────────────────────────────────────────
    "pandas": [
        {
            "title": "Pandas Official Getting Started",
            "url": "https://pandas.pydata.org/docs/getting_started/index.html",
            "type": "docs",
            "platform": "Official Docs",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "Data Analysis with Python – freeCodeCamp",
            "url": "https://www.freecodecamp.org/learn/data-analysis-with-python/",
            "type": "interactive",
            "platform": "freeCodeCamp",
            "duration": "Self-paced",
            "is_free": True,
        },
    ],
    # ── Go ────────────────────────────────────────────────────────────────────
    "go": [
        {
            "title": "A Tour of Go – Official",
            "url": "https://go.dev/tour/welcome/1",
            "type": "interactive",
            "platform": "Official Docs",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "Go / Golang Full Course",
            "url": "https://www.youtube.com/watch?v=un6ZyFkqFKo",
            "type": "video",
            "platform": "YouTube / freeCodeCamp",
            "duration": "7 hours",
            "is_free": True,
        },
    ],
    # ── Rust ──────────────────────────────────────────────────────────────────
    "rust": [
        {
            "title": "The Rust Programming Language – Official Book",
            "url": "https://doc.rust-lang.org/book/",
            "type": "docs",
            "platform": "Official Docs",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "Rust Full Course for Beginners",
            "url": "https://www.youtube.com/watch?v=BpPEoZW5IiY",
            "type": "video",
            "platform": "YouTube / freeCodeCamp",
            "duration": "14 hours",
            "is_free": True,
        },
    ],
    # ── Java ──────────────────────────────────────────────────────────────────
    "java": [
        {
            "title": "Java Programming – University of Helsinki MOOC",
            "url": "https://java-programming.mooc.fi/",
            "type": "interactive",
            "platform": "University of Helsinki",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "Java Full Course – Amigoscode",
            "url": "https://www.youtube.com/watch?v=Qgl81fPcLc8",
            "type": "video",
            "platform": "YouTube",
            "duration": "4 hours",
            "is_free": True,
        },
    ],
    # ── C++ ───────────────────────────────────────────────────────────────────
    "c++": [
        {
            "title": "C++ Full Course – freeCodeCamp",
            "url": "https://www.youtube.com/watch?v=8jLOx1hD3_o",
            "type": "video",
            "platform": "YouTube / freeCodeCamp",
            "duration": "31 hours",
            "is_free": True,
        },
        {
            "title": "LearnCpp.com – Comprehensive C++ Tutorial",
            "url": "https://www.learncpp.com/",
            "type": "article",
            "platform": "learncpp.com",
            "duration": "Self-paced",
            "is_free": True,
        },
    ],
    # ── Git / GitHub ─────────────────────────────────────────────────────────
    "git": [
        {
            "title": "Pro Git – Free Book",
            "url": "https://git-scm.com/book/en/v2",
            "type": "docs",
            "platform": "git-scm.com",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "Git and GitHub for Beginners – Crash Course",
            "url": "https://www.youtube.com/watch?v=RGOj5yH7evk",
            "type": "video",
            "platform": "YouTube / freeCodeCamp",
            "duration": "1 hour",
            "is_free": True,
        },
    ],
    # ── GraphQL ───────────────────────────────────────────────────────────────
    "graphql": [
        {
            "title": "How to GraphQL – Full Tutorial",
            "url": "https://www.howtographql.com/",
            "type": "interactive",
            "platform": "howtographql.com",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "GraphQL Official Docs",
            "url": "https://graphql.org/learn/",
            "type": "docs",
            "platform": "Official Docs",
            "duration": "Self-paced",
            "is_free": True,
        },
    ],
    # ── Redis ─────────────────────────────────────────────────────────────────
    "redis": [
        {
            "title": "Redis University – Free Courses",
            "url": "https://university.redis.com/",
            "type": "course",
            "platform": "Redis",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "Redis Official Docs",
            "url": "https://redis.io/docs/",
            "type": "docs",
            "platform": "Official Docs",
            "duration": "Self-paced",
            "is_free": True,
        },
    ],
    # ── System Design ─────────────────────────────────────────────────────────
    "system design": [
        {
            "title": "System Design Primer – GitHub",
            "url": "https://github.com/donnemartin/system-design-primer",
            "type": "article",
            "platform": "GitHub",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "Grokking the System Design Interview – Educative",
            "url": "https://www.educative.io/courses/grokking-modern-system-design-interview-for-engineers-managers",
            "type": "course",
            "platform": "Educative",
            "duration": "Self-paced",
            "is_free": False,
        },
    ],
    # ── CI/CD ─────────────────────────────────────────────────────────────────
    "ci/cd": [
        {
            "title": "GitHub Actions – Official Quickstart",
            "url": "https://docs.github.com/en/actions/quickstart",
            "type": "docs",
            "platform": "GitHub",
            "duration": "Self-paced",
            "is_free": True,
        },
        {
            "title": "GitHub Actions Full Course",
            "url": "https://www.youtube.com/watch?v=R8_veQiYBjI",
            "type": "video",
            "platform": "YouTube",
            "duration": "2 hours",
            "is_free": True,
        },
    ],
}

# Aliases to map variant names to the canonical static map key
ALIASES: dict[str, str] = {
    "js": "javascript",
    "ts": "typescript",
    "reactjs": "react",
    "react.js": "react",
    "nodejs": "node.js",
    "node": "node.js",
    "nextjs": "next.js",
    "postgres": "postgresql",
    "k8s": "kubernetes",
    "golang": "go",
    "ml": "machine learning",
    "dl": "deep learning",
    "c#": "c++",  # separate, but use gemini fallback for C#
    "github actions": "ci/cd",
    "jenkins": "ci/cd",
}


def _normalize_key(skill: str) -> str:
    """Return the lookup key for the static map."""
    key = skill.strip().lower()
    return ALIASES.get(key, key)


async def _gemini_resources(skill: str) -> list[dict]:
    """Generate resources for an unknown skill via Gemini."""
    prompt = f"""You are a career learning advisor. Suggest exactly 3 high-quality learning resources
for someone who needs to learn: {skill}

Return ONLY a JSON object with this exact schema (no markdown, no preamble):
{{
  "resources": [
    {{
      "title": "Resource name",
      "url": "https://...",
      "type": "course|video|docs|interactive|article",
      "platform": "Platform name",
      "duration": "X hours or Self-paced",
      "is_free": true
    }}
  ]
}}

Prioritize free, high-quality resources. Only include real URLs that exist.
"""
    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={
                "temperature": 0.1,
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
        return parsed.get("resources", [])
    except Exception as exc:
        print(f"[resources_service] Gemini fallback failed for '{skill}': {exc}")
        return []


async def get_resources_for_skills(skills: list[str]) -> list[dict]:
    """
    Returns resources grouped by skill.

    Returns:
        [
            {
                "skill": "React",
                "resources": [ { title, url, type, platform, duration, is_free }, ... ]
            },
            ...
        ]
    """
    import asyncio

    results = []

    async def _fetch_one(skill: str) -> dict:
        key = _normalize_key(skill)
        resources = RESOURCE_MAP.get(key)
        if not resources:
            resources = await _gemini_resources(skill)
        return {"skill": skill, "resources": resources or []}

    tasks = [_fetch_one(s) for s in skills]
    results = await asyncio.gather(*tasks)
    return list(results)
