"""Generate text embeddings using Google's Gemini embedding model with caching, rate limiting and backoff."""
import os
import time
from dotenv import load_dotenv
from google import genai

load_dotenv()

_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
_client = genai.Client(api_key=_api_key) if _api_key else None

EMBEDDING_MODEL = "gemini-embedding-001"
_EMBEDDING_CACHE: dict[str, list[float]] = {}


def create_embedding(text: str) -> dict:
    """
    Generate an embedding vector for the given text with local in-memory cache
    and automatic retry backoff on 429 / rate limits.
    """
    if not text or not text.strip():
        return {"embedding": []}

    cleaned_text = text.strip()
    if cleaned_text in _EMBEDDING_CACHE:
        return {"embedding": _EMBEDDING_CACHE[cleaned_text]}

    global _client
    if not _client:
        _key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if _key:
            _client = genai.Client(api_key=_key)
        else:
            print("[embedding_service] No GEMINI_API_KEY or GOOGLE_API_KEY configured.")
            return {"embedding": []}

    max_retries = 3
    for attempt in range(max_retries):
        try:
            result = _client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=cleaned_text,
            )
            embedding = result.embeddings[0].values
            _EMBEDDING_CACHE[cleaned_text] = embedding
            return {"embedding": embedding}
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "Quota" in err_str or "exhausted" in err_str:
                wait_time = 2 ** (attempt + 1)
                print(f"[embedding_service] Rate limit hit (429). Retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                time.sleep(wait_time)
            else:
                print(f"[embedding_service] Failed to generate embedding for {cleaned_text!r}: {e}")
                return {"embedding": []}

    print(f"[embedding_service] Exhausted retries for {cleaned_text!r}")
    return {"embedding": []}