"""
One-time (or run-after-editing-SKILL_ALIASES) backfill script.

Precomputes and persists embeddings for every canonical skill in
normalize_service.CANONICAL_SKILLS, so the embedding tier never has to call
Gemini on a live user request for a skill that's already in the dictionary.

Run from backend/:
    python -m scripts.backfill_skill_embeddings
"""
import os
import time

from app.services.normalize_service import CANONICAL_SKILLS, _get_canonical_embedding
from app.services.skill_knowledge_store import get_all_canonical_embeddings


def main():
    already_cached = get_all_canonical_embeddings()
    to_process = [s for s in CANONICAL_SKILLS if s not in already_cached]

    print(f"{len(CANONICAL_SKILLS)} canonical skills total, "
          f"{len(already_cached)} already persisted, "
          f"{len(to_process)} to embed now.")

    for i, skill in enumerate(to_process, start=1):
        vector = _get_canonical_embedding(skill)  # embeds + persists internally
        status = "ok" if vector else "FAILED (empty embedding)"
        print(f"[{i}/{len(to_process)}] {skill}: {status}")
        time.sleep(0.05)  # light throttle, avoid hammering the embedding API

    print("Done.")


if __name__ == "__main__":
    main()
    os._exit(0)  # avoid the same lingering-thread hang as the test script