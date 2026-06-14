# KAPRUKA AI FULL ENGINE VALIDATION

This document tracks the execution verification of Kapruka AI's 16 cognitive engines. It identifies whether each engine is initialized, called, affects output, persists output, reuses output, and is measurable, flagging dead code or unused intelligence signals.

---

## Engine Audit Scorecard

| Engine | Initialized? | Called? | Affects Output? | Output Stored? | Output Reused? | Measurable? | Audit Verdict / Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Intent Engine** | Yes | Yes | Yes | Yes | Yes | Yes | **PASS** — Standard LLM classification with Pre-Intent Parser. |
| **Language Detection** | Yes | Yes | Yes | Yes | Yes | Yes | **PASS** — Detects Singlish/Tanglish/Tamil/Sinhala to adapt persona. |
| **Emotion Engine** | Yes | Yes | Yes | Yes | Yes | Yes | **PASS** — Detects primary triggers (sarcastic, low_budget, etc.). |
| **Memory Engine** | Yes | Yes | Yes | Yes | **PARTIAL** | Yes | **WARNING (UNUSED INTEL)** — Conversational preference memories are saved, but ignored in scoring due to relevance engine boost key mismatches. |
| **Relationship Engine**| Yes | Yes | Yes | Yes | Yes | Yes | **PASS** — Links nicknames to relationships and fetches profile contexts. |
| **Community Intel** | Yes | Yes | Yes | Yes | Yes | Yes | **PASS** — Queries community relevance table and boosts trending products. |
| **Recommendation Engine**| Yes | Yes | Yes | Yes | Yes | Yes | **PASS** — Invokes MCP retrieval and merges catalog queries. |
| **Ranking Engine** | Yes | Yes | Yes | Yes | Yes | Yes | **PASS** — Computes custom scores via user parameters and affinities. |
| **Reasoning Engine** | Yes | Yes | Yes | Yes | Yes | Yes | **PASS** — Formulates explanations of why items fit the recipient. |
| **Decision Engine** | Yes | Yes | Yes | Yes | Yes | Yes | **PASS** — Rules engine evaluates best actions (checkout, clarification). |
| **Personalization** | Yes | Yes | Yes | Yes | Yes | Yes | **PASS** — Dynamically constructs system instructions from user profiles. |
| **God Mode Engine** | Yes | Yes | Yes | Yes | Yes | Yes | **PASS** — Gathers and saves telemetry contexts. |
| **Trust & Safety** | Yes | Yes | Yes | Yes | Yes | Yes | **PASS** — Intercepts out-of-domain prompts (academic/programming). |
| **Context Engine** | Yes | Yes | Yes | Yes | Yes | Yes | **PASS** — Manages session states and search pagination. |
| **Session Engine** | Yes | Yes | Yes | Yes | Yes | Yes | **PASS** — Session snapshots handle state overrides. |
| **Learning Engine** | Yes | No | No | No | No | No | **DEAD CODE / FAIL** — `user_affinities` and `learning_events` tables are empty and never called by the pipeline. |

---

## Detailed Findings

### 1. UNUSED INTELLIGENCE: Conversational Memory Ignored
- **Symptom:** User says "My father likes expensive watches. Remember this." The memory is correctly saved to the `memories` table as `category: "preference"`, `key: "father"`, `value: "likes expensive watches"`.
- **Failure:** On the next turn, when the user asks "Suggest anniversary gifts", the memory is loaded from the database but ignored (relevance score: `0.44`, threshold: `0.45`).
- **Root Cause:** `MemoryRelevanceEngine.calculateContextBoost` only applies a `1.0` boost to items in the `preferences` table (checking `"interest" in mem`). It ignores preference memories stored in the `memories` table, giving them a default baseline boost of `0.2`.
- **Impact:** Genuinely extracted preference memories fail to influence product recommendations.

### 2. DEAD CODE: Learning Engine & Brand Affinities
- **Symptom:** The Supabase schema contains tables `user_affinities` (intended to store user category/brand affinity ratios) and `learning_events` (intended to store user feedback and learning telemetry).
- **Failure:** The row counts for both tables are `0`. There is no code in the Next.js API router or personalization layer that performs inserts, updates, or reads on these tables.
- **Impact:** System does not currently learn or update brand affinity percentages over time.
- **Verdict:** Mark as `DEAD CODE` / `UNUSED STORAGE`.
