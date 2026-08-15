"""Generate text embeddings using Google's Gemini embedding model."""
import os
from google import genai

_client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

EMBEDDING_MODEL = "gemini-embedding-001"


def create_embedding(text: str) -> dict:
    """
    Generate an embedding vector for the given text.
    Returns {"embedding": [...]} or {"embedding": []} on empty input/failure.
    """
    if not text or not text.strip():
        return {"embedding": []}

    try:
        result = _client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text,
        )
        embedding = result.embeddings[0].values
        return {"embedding": embedding}
    except Exception as e:
        print(f"[embedding_service] Failed to generate embedding: {e}")
        return {"embedding": []}