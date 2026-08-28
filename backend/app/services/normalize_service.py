"""
High-Performance In-Memory Skill Normalization Pipeline.

Resolves free-text skill strings into standardized canonical skill names
using multi-tier fast in-memory matching:
  Tier 1: Exact / Curated Dictionary lookup (0ms)
  Tier 2: RapidFuzz Token Match against canonical taxonomy (0ms)
  Tier 3: Smart Title Case & Punctuation Cleanup (0ms)

Zero network latency, zero DB blocking, and zero API quota consumption.
"""

import re
import asyncio
from rapidfuzz import process, fuzz


# ---------------------------------------------------------------------------
# 1. Comprehensive Canonical Skill Dictionary & Aliases
# ---------------------------------------------------------------------------

SKILL_ALIASES: dict[str, str] = {
    # --- Languages ---
    "js": "JavaScript", "javascript": "JavaScript", "es6": "JavaScript", "ecmascript": "JavaScript",
    "ts": "TypeScript", "typescript": "TypeScript",
    "py": "Python", "python": "Python", "python3": "Python", "python 3": "Python",
    "java": "Java", "core java": "Java", "java 8": "Java", "java 11": "Java", "java 17": "Java",
    "c++": "C++", "cpp": "C++", "c plus plus": "C++",
    "c#": "C#", "csharp": "C#", "c sharp": "C#", "dotnet": "C#", ".net": "C#", ".net core": ".NET Core",
    "golang": "Go", "go": "Go", "go lang": "Go",
    "rust": "Rust", "rustlang": "Rust",
    "kotlin": "Kotlin",
    "swift": "Swift",
    "php": "PHP",
    "ruby": "Ruby",
    "r lang": "R", "r programming": "R", "r": "R",
    "scala": "Scala",
    "matlab": "MATLAB",
    "sql": "SQL", "structured query language": "SQL",
    "bash": "Bash/Shell", "shell scripting": "Bash/Shell", "shell": "Bash/Shell", "zsh": "Bash/Shell", "powershell": "PowerShell",
    "perl": "Perl",
    "haskell": "Haskell",
    "julia": "Julia",
    "dart": "Dart",
    "c language": "C", "c programming": "C", "ansi c": "C", "c": "C",
    "assembly": "Assembly", "asm": "Assembly", "x86": "Assembly", "arm assembly": "Assembly",
    "cobol": "COBOL",
    "fortran": "Fortran",

    # --- Frontend ---
    "react": "React", "reactjs": "React", "react.js": "React",
    "vue": "Vue.js", "vuejs": "Vue.js", "vue.js": "Vue.js",
    "angular": "Angular", "angularjs": "Angular", "angular.js": "Angular",
    "next": "Next.js", "nextjs": "Next.js", "next.js": "Next.js",
    "svelte": "Svelte", "sveltekit": "Svelte",
    "html": "HTML", "html5": "HTML",
    "css": "CSS", "css3": "CSS",
    "sass": "Sass", "scss": "Sass", "less": "Less",
    "tailwind": "Tailwind CSS", "tailwindcss": "Tailwind CSS", "tailwind css": "Tailwind CSS",
    "bootstrap": "Bootstrap", "bootstrap 5": "Bootstrap", "bootstrap 4": "Bootstrap",
    "redux": "Redux", "redux toolkit": "Redux", "rtk": "Redux", "zustand": "Zustand", "mobx": "MobX",
    "vite": "Vite", "vitejs": "Vite",
    "webpack": "Webpack",
    "jquery": "jQuery",
    "three.js": "Three.js", "threejs": "Three.js",
    "d3": "D3.js", "d3.js": "D3.js",

    # --- Mobile ---
    "react native": "React Native", "reactnative": "React Native",
    "flutter": "Flutter",
    "android dev": "Android Development", "android development": "Android Development", "android": "Android Development",
    "ios dev": "iOS Development", "ios development": "iOS Development", "ios": "iOS Development",
    "swiftui": "SwiftUI",

    # --- Backend & Frameworks ---
    "node": "Node.js", "nodejs": "Node.js", "node.js": "Node.js",
    "express": "Express.js", "expressjs": "Express.js", "express.js": "Express.js",
    "fastapi": "FastAPI",
    "flask": "Flask",
    "django": "Django", "django rest framework": "Django", "drf": "Django",
    "spring": "Spring Boot", "springboot": "Spring Boot", "spring boot": "Spring Boot", "spring framework": "Spring Boot",
    "rails": "Ruby on Rails", "ruby on rails": "Ruby on Rails",
    "graphql": "GraphQL",
    "rest": "REST APIs", "rest api": "REST APIs", "restful": "REST APIs", "restful apis": "REST APIs", "rest apis": "REST APIs",
    "grpc": "gRPC",
    "websockets": "WebSockets", "websocket": "WebSockets",
    "microservices": "Microservices", "microservice architecture": "Microservices",
    "role based access control": "Role-Based Access Control", "role-based access control": "Role-Based Access Control",
    "role based authentication": "Role-Based Access Control", "role-based authentication": "Role-Based Access Control",
    "rbac": "Role-Based Access Control", "authentication": "Authentication & Security",

    # --- CS Fundamentals & Core Concepts ---
    "dsa": "Data Structures & Algorithms",
    "data structures": "Data Structures & Algorithms",
    "algorithms": "Data Structures & Algorithms",
    "data structures & algorithms": "Data Structures & Algorithms",
    "data structures and algorithms": "Data Structures & Algorithms",
    "oop": "Object-Oriented Programming (OOP)",
    "oops": "Object-Oriented Programming (OOP)",
    "object oriented programming": "Object-Oriented Programming (OOP)",
    "object-oriented programming": "Object-Oriented Programming (OOP)",
    "dbms": "Database Management Systems (DBMS)",
    "database management systems": "Database Management Systems (DBMS)",
    "database management": "Database Management Systems (DBMS)",
    "system design": "System Design", "low level design": "System Design", "high level design": "System Design",
    "distributed systems": "Distributed Systems",
    "operating systems": "Operating Systems", "os": "Operating Systems",
    "computer networks": "Computer Networks", "networking": "Computer Networks",

    # --- Data / ML / AI ---
    "ml": "Machine Learning", "machine learning": "Machine Learning",
    "dl": "Deep Learning", "deep learning": "Deep Learning",
    "nlp": "Natural Language Processing", "natural language processing": "Natural Language Processing",
    "cv": "Computer Vision", "computer vision": "Computer Vision", "object detection": "Computer Vision",
    "pytorch": "PyTorch", "torch": "PyTorch",
    "tensorflow": "TensorFlow", "tf": "TensorFlow",
    "keras": "Keras",
    "scikit-learn": "Scikit-learn", "sklearn": "Scikit-learn",
    "pandas": "Pandas",
    "numpy": "NumPy",
    "lora": "LoRA", "peft": "LoRA", "qlora": "LoRA",
    "llm": "Large Language Models", "llms": "Large Language Models",
    "large language model": "Large Language Models", "large language models": "Large Language Models",
    "fine-tuning": "Model Fine-Tuning", "finetuning": "Model Fine-Tuning", "model fine-tuning": "Model Fine-Tuning",
    "model fine tuning": "Model Fine-Tuning",
    "rag": "RAG Pipelines", "rag pipelines": "RAG Pipelines", "retrieval augmented generation": "RAG Pipelines",
    "prompt engineering": "Prompt Engineering",
    "genai": "Generative AI", "generative ai": "Generative AI",
    "sentence embeddings": "Sentence Embeddings", "text embeddings": "Sentence Embeddings", "embeddings": "Sentence Embeddings",
    "sentence transformers": "Sentence Transformers", "sentencetransformers": "Sentence Transformers",
    "semantic comparison": "Semantic Search", "semantic search": "Semantic Search", "semantic similarity": "Semantic Search",
    "vector search": "Semantic Search", "hybrid retrieval": "Hybrid Retrieval",
    "natural language querying": "Natural Language Querying", "nl querying": "Natural Language Querying",
    "langchain": "LangChain",
    "llamaindex": "LlamaIndex", "llama index": "LlamaIndex",
    "openai": "OpenAI API", "openai api": "OpenAI API", "chatgpt api": "OpenAI API",
    "gemini": "Gemini API", "gemini api": "Gemini API",
    "huggingface": "Hugging Face", "hugging face": "Hugging Face", "transformers": "Hugging Face",
    "reinforcement learning": "Reinforcement Learning", "rl": "Reinforcement Learning",
    "mlops": "MLOps",
    "data engineering": "Data Engineering",
    "etl": "ETL Pipelines", "etl pipelines": "ETL Pipelines",
    "data preprocessing": "Data Preprocessing", "data pre-processing": "Data Preprocessing", "data cleaning": "Data Preprocessing",
    "feature engineering": "Feature Engineering",
    "logistic regression": "Logistic Regression", "linear regression": "Linear Regression",
    "random forest": "Random Forest", "xgboost": "XGBoost",
    "spark": "Apache Spark", "pyspark": "Apache Spark", "apache spark": "Apache Spark",
    "airflow": "Apache Airflow", "apache airflow": "Apache Airflow",
    "kafka": "Apache Kafka", "apache kafka": "Apache Kafka",
    "data visualization": "Data Visualization", "dataviz": "Data Visualization",
    "statistics": "Statistics", "stats": "Statistics",
    "a/b testing": "A/B Testing", "ab testing": "A/B Testing",

    # --- Databases & Formats ---
    "postgres": "PostgreSQL", "postgresql": "PostgreSQL",
    "mysql": "MySQL",
    "mongo": "MongoDB", "mongodb": "MongoDB",
    "redis": "Redis",
    "sqlite": "SQLite",
    "supabase": "Supabase",
    "chroma": "ChromaDB", "chromadb": "ChromaDB", "chroma db": "ChromaDB",
    "qdrant": "Qdrant",
    "pinecone": "Pinecone",
    "elasticsearch": "Elasticsearch",
    "dynamodb": "DynamoDB",
    "firebase": "Firebase", "firestore": "Firestore", "google firestore": "Firestore",
    "parquet": "Parquet", "apache parquet": "Parquet",
    "avro": "Avro",
    "json": "JSON", "xml": "XML",
    "data lake": "Data Lake", "data warehouse": "Data Warehousing", "data warehousing": "Data Warehousing",
    "bigquery": "BigQuery", "snowflake": "Snowflake", "dbt": "dbt",
    "vector database": "Vector Databases", "vector db": "Vector Databases", "vector databases": "Vector Databases",

    # --- Hardware, VLSI & Embedded ---
    "hardware design": "Hardware Design", "digital design": "Hardware Design",
    "vlsi": "VLSI Design", "vlsi design": "VLSI Design",
    "verilog": "Verilog", "systemverilog": "SystemVerilog", "vhdl": "VHDL",
    "fpga": "FPGA",
    "embedded systems": "Embedded Systems", "embedded c": "Embedded Systems",
    "rtos": "RTOS", "real-time operating systems": "RTOS",
    "simulation testbenches": "Simulation & Testbenches", "testbenches": "Simulation & Testbenches", "simulation": "Simulation & Testbenches",
    "modular arithmetic": "Modular Arithmetic",
    "signal processing": "Signal Processing", "dsp": "Signal Processing",

    # --- Cloud, DevOps & Tools ---
    "aws": "AWS", "amazon web services": "AWS",
    "gcp": "GCP", "google cloud": "GCP", "google cloud platform": "GCP",
    "azure": "Azure", "microsoft azure": "Azure",
    "docker": "Docker",
    "k8s": "Kubernetes", "kubernetes": "Kubernetes",
    "ci/cd": "CI/CD", "cicd": "CI/CD", "github actions": "GitHub Actions",
    "git": "Git",
    "github": "GitHub", "gitlab": "GitLab", "bitbucket": "Bitbucket",
    "vs code": "VS Code", "vscode": "VS Code", "visual studio code": "VS Code",
    "terraform": "Terraform",
    "linux": "Linux", "unix": "Linux",
    "nginx": "Nginx",
    "serverless": "Serverless Architecture",

    # --- Testing & QA ---
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

    # --- Design & Collaboration ---
    "figma": "Figma",
    "ui/ux": "UI/UX Design", "ux": "UI/UX Design", "ui": "UI/UX Design",
    "wireframing": "Wireframing",
    "jira": "Jira",
    "agile": "Agile Methodology", "scrum": "Agile Methodology",
    "confluence": "Confluence",
    "communication": "Communication",
    "problem solving": "Problem Solving",
    "teamwork": "Teamwork",
    "leadership": "Leadership",
    "project management": "Project Management",
    "time management": "Time Management",
    "critical thinking": "Critical Thinking",
}

# Canonical skill universe = every distinct value in the alias table.
CANONICAL_SKILLS: list[str] = sorted(set(SKILL_ALIASES.values()))

# Make every canonical skill resolvable to itself.
for _canon in CANONICAL_SKILLS:
    SKILL_ALIASES.setdefault(_canon.lower(), _canon)


# ---------------------------------------------------------------------------
# Text Cleanup & Matching Tiers
# ---------------------------------------------------------------------------

_PUNCT_RE = re.compile(r"[_/,]+")
_WS_RE = re.compile(r"\s+")


def _clean(text: str) -> str:
    text = text.strip().lower()
    text = _PUNCT_RE.sub(" ", text)
    text = _WS_RE.sub(" ", text)
    return text.strip()


def _dictionary_match(raw: str) -> dict | None:
    """Tier 1: Exact alias match."""
    key = _clean(raw)
    canonical = SKILL_ALIASES.get(key)
    if canonical:
        return {"skill": canonical, "confidence": 1.0, "method": "dictionary"}
    return None


FUZZY_THRESHOLD = 84  # 0-100 token similarity


def _fuzzy_match(raw: str) -> dict | None:
    """Tier 2: Fast In-Memory Fuzzy matching using token sort ratio."""
    key = _clean(raw)
    if not key or len(key) < 3:
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


def _format_skill_title(raw: str) -> str:
    """Clean fallback formatting for non-cataloged skills."""
    raw_clean = raw.strip()
    # Keep uppercase acronyms like AWS, NLP, CSS intact
    if raw_clean.isupper() and len(raw_clean) <= 5:
        return raw_clean
    # Capitalize words neatly
    words = raw_clean.split()
    return " ".join(w.capitalize() if not w.isupper() else w for w in words)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def normalize_skill(raw: str) -> dict:
    """
    Resolve a raw skill string to a canonical skill name in sub-millisecond
    in-memory time. Never blocks or throws network exceptions.
    """
    if not raw or not raw.strip():
        return {"skill": "", "confidence": 0.0, "method": "none"}

    # Tier 1: Exact Dictionary
    res = _dictionary_match(raw)
    if res:
        return res

    # Tier 2: Fuzzy String Distance
    res = _fuzzy_match(raw)
    if res:
        return res

    # Tier 3: Clean Fallback
    formatted = _format_skill_title(raw)
    return {"skill": formatted, "confidence": 0.9, "method": "cleaned"}


async def normalize_skill_async(raw: str) -> dict:
    """Async wrapper for non-blocking execution in event loops."""
    return normalize_skill(raw)


def normalize_skills(raw_skills: list[str]) -> list[dict]:
    """Batch synchronous normalization."""
    return [normalize_skill(s) for s in raw_skills if s]


async def normalize_skills_async(raw_skills: list[str]) -> list[dict]:
    """Batch async normalization."""
    if not raw_skills:
        return []
    return [normalize_skill(s) for s in raw_skills if s]