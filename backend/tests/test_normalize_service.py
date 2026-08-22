import asyncio
from app.services.normalize_service import normalize_skill, normalize_skills_async

# Tier 1 — dictionary
print(normalize_skill("reactjs"))        # {'skill': 'React', 'confidence': 1.0, 'method': 'dictionary'}
print(normalize_skill("JS"))             # {'skill': 'JavaScript', ...}

# Tier 2 — fuzzy (typo/variant, not in dictionary verbatim)
print(normalize_skill("Djnago"))         # should still resolve to 'Django' via fuzzy

# Tier 3 — embedding fallback (semantically related, no string overlap)
print(normalize_skill("neural network training"))  # should land near 'Deep Learning' or 'Machine Learning'

# batch/async, as used in skill_gap_service
print(asyncio.run(normalize_skills_async(["reactjs", "Postgre SQL", "k8s", "some totally novel skill xyz"])))