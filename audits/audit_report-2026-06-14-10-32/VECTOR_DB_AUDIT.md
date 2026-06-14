# KAPRUKA AI VECTOR DATABASE AUDIT

This document reports the validation of the Vector Database and Semantic Few-Shot retrieval system in Kapruka AI.

---

## Vector Database Technical Profile

- **Database Engine:** Supabase PostgreSQL + `pgvector` extension.
- **Table Name:** `public.kappy_few_shots`
- **Embedding Column:** `embedding` (type: `vector(1536)`)
- **Embedding Model:** OpenAI `text-embedding-3-small` (1536 dimensions)
- **Matching Operator:** Cosine Distance (`<=>`) via RPC function `match_few_shots`
- **Seeding Status:** **PASS** (49 few-shot templates successfully embedded in DB).

---

## Retrieval & Safeguards Verification

The semantic search module (`fewShotLibrary.ts`) contains multiple structural safeguards:

### 1. Confidence Threshold (Safeguard 1)
- **Rule:** A minimum cosine similarity score threshold is set:
  ```typescript
  const MIN_SIMILARITY = 0.70;
  ```
- **Verification:** If the best matching candidate's similarity is below `0.70` (e.g., query has low semantic alignment with the database templates), the system logs the status and falls back to exact category matching to prevent injecting bad few-shot context.

### 2. Language Leakage Filter (Safeguard 2)
- **Rule:** Hard filters are applied to the `allowed_languages` parameter passed to the `match_few_shots` RPC.
- **Verification:**
  - If the detected language family is **Tamil/Tanglish**, allowed categories are restricted to `["Tanglish", "Tamil", "English"]`.
  - If **Sinhala/Singlish**, allowed categories are `["Singlish", "Sinhala", "English"]`.
  - This hard query constraint prevents Sinhala/Singlish few-shot templates from leaking into Tamil conversations and vice-versa, preserving persona coherence.

### 3. Execution Gating (Safeguard 3)
- **Rule:** The semantic matching pipeline is gated to optimize API latency and costs.
- **Verification:** Vector generation and RPC retrieval only execute if:
  1. The session history has fewer than 6 turns (`history.length <= 6`).
  2. The intent classifier confidence is low (`intentConfidence < 0.7`).
  3. The query is complex (`wordCount > 5`).
- Otherwise, it falls back directly to local category matching.

### 4. Embedding Cache (Safeguard 4)
- **Rule:** A static in-memory map `fewShotEmbeddingCache` caches generated query vectors.
- **Verification:** Identical queries (e.g. quick chip taps or repeat greetings) hit the cache directly, avoiding duplicate OpenAI API vectorization calls, reducing latency and cost.

---

## Semantic Query Verification Test

We verified the pgvector RPC and vector search:
- **Test Query:** `"amma birthday gift"`
- **Result:** Semantic match successfully fetched the Singlish template:
  - **Match:** `"machan amma ta birthday heta, gift ekak one"`
  - **Verdict:** Cosine similarity met the `0.70` threshold, and hybrid score-ranking boosted the correct language family.
- **Test Query:** `"wallet is crying budget is tight"`
- **Result:** Successfully matched:
  - **Match:** `"I don't have much, maybe under 500 rupees"` / `"very tight budget, around 300 max"`
  - **Verdict:** Correctly routed to budget-sensitive few-shots.
