"""
Supabase-backed persistence for the skill normalization pipeline.

- canonical_skill_embeddings: cached embeddings for canonical skills, so we
  don't re-call the Gemini embedding API on every process restart.
- skill_review_queue: raw skill strings the normalizer couldn't confidently
  resolve (or only resolved with a weak embedding match), for a human to
  review and fold into SKILL_ALIASES in normalize_service.py.

NOTE: this assumes app/database/supabase.py exports a ready-to-use client
named `supabase`. If yours is named differently, update the import below.
"""
from datetime import datetime, timezone

from app.database.supabase import supabase  # <-- adjust if your client export differs


# ---------------------------------------------------------------------------
# Canonical skill embeddings (Phase 3)
# ---------------------------------------------------------------------------

def get_all_canonical_embeddings() -> dict[str, list[float]]:
    """Load every persisted canonical skill embedding in one query."""
    response = (
        supabase.table("canonical_skill_embeddings")
        .select("skill, embedding")
        .execute()
    )
    rows = response.data or []
    return {row["skill"]: row["embedding"] for row in rows if row.get("embedding")}


def upsert_canonical_embedding(skill: str, embedding: list[float]) -> None:
    """Persist a newly-computed canonical skill embedding."""
    supabase.table("canonical_skill_embeddings").upsert(
        {
            "skill": skill,
            "embedding": embedding,
            "model": "gemini-embedding-001",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="skill",
    ).execute()


# ---------------------------------------------------------------------------
# Unknown-skill review queue (Phase 4)
# ---------------------------------------------------------------------------

def log_unknown_skill(
    raw_skill: str,
    method: str,
    confidence: float,
    best_guess: str | None = None,
) -> None:
    """
    Record a skill the normalizer couldn't confidently resolve.

    If the same raw skill has been seen before, bump seen_count and
    last_seen instead of creating a duplicate row.
    """
    key = raw_skill.strip().lower()
    if not key:
        return

    existing = (
        supabase.table("skill_review_queue")
        .select("id, seen_count")
        .eq("raw_skill", key)
        .execute()
    )

    now = datetime.now(timezone.utc).isoformat()

    if existing.data:
        row = existing.data[0]
        supabase.table("skill_review_queue").update(
            {
                "seen_count": row["seen_count"] + 1,
                "last_seen": now,
                "best_guess": best_guess,
                "confidence": confidence,
                "method": method,
            }
        ).eq("id", row["id"]).execute()
    else:
        supabase.table("skill_review_queue").insert(
            {
                "raw_skill": key,
                "best_guess": best_guess,
                "confidence": confidence,
                "method": method,
                "seen_count": 1,
                "first_seen": now,
                "last_seen": now,
                "reviewed": False,
            }
        ).execute()


def get_pending_review_skills(limit: int = 50) -> list[dict]:
    """Unresolved skills, most-frequently-seen first — for an admin/review view."""
    response = (
        supabase.table("skill_review_queue")
        .select("*")
        .eq("reviewed", False)
        .order("seen_count", desc=True)
        .limit(limit)
        .execute()
    )
    return response.data or []


def mark_skill_reviewed(raw_skill: str) -> None:
    """Call this once you've triaged an entry — either added it to
    SKILL_ALIASES or decided it's noise (typo, non-skill, etc.)."""
    supabase.table("skill_review_queue").update({"reviewed": True}).eq(
        "raw_skill", raw_skill.strip().lower()
    ).execute()
