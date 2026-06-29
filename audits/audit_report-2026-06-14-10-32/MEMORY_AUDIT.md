# KAPRUKA AI MEMORY VALIDATION

This document summarizes the validation of Kapruka AI's conversational memory system. It details our execution test where a memory was injected and retrieved, and reveals a critical gap in the memory relevance scoring engine.

---

## Memory Validation Test Run

A test case was programmatically run using `testMemory.js` to verify the memory lifecycle:

### Phase 1: Injection
- **User Input:** `"My father loves expensive watches. Remember this."`
- **Result:** **SUCCESS** — A memory was correctly extracted and persisted in the `memories` table:
  - **Category:** `"preference"`
  - **Key:** `"father"`
  - **Value:** `"likes expensive watches"`

### Phase 2: Retrieval
- **User Input:** `"I need a gift for my father"`
- **Result:** **SUCCESS** — The memory was loaded from the database (`loadedCount: 2`).
- **Verdict:** **FAIL** — The memory was not selected for active context (`selectedCount: 0`). It failed to influence recommendations.

---

## Technical Diagnostics (Why Memory Failed to Influence Output)

The memory was retrieved from the database, but was filtered out during scoring.

### 1. Relevance Scoring Breakdown
The Memory Relevance Engine (`relevanceEngine.ts`) scores memory candidates using four weighted components:
- **Semantic Overlap (40%)**
- **Context Boost (30%)**
- **Confidence/Importance (20%)**
- **Recency (10%)**

For the query `"I need a gift for my father"` and memory `"preference father likes expensive watches"`, the calculations yielded:
1. **Semantic Overlap:** `overlap = 1` ("father"), total words = 5. Score = `0.20`.
2. **Context Boost:** Context was classified as `"GENERAL"` inside the router. Boost = `0.20` (baseline).
3. **Confidence:** Default importance = `1.0`. Score = `1.0`.
4. **Recency:** Just created. Score = `1.0`.

**Total Score:**
`Score = (0.2 * 0.4) + (0.2 * 0.3) + (1.0 * 0.2) + (1.0 * 0.1) = 0.08 + 0.06 + 0.2 + 0.1 = 0.44`

Since the `MIN_SCORE_THRESHOLD` is set to **`0.45`**, this memory scored `0.44` and was ignored.

---

## Root Cause of Failure

### 1. Hardcoded General Context
In `frontend/src/app/api/chat/route.ts` line 364, the API route hardcodes the context type to `"GENERAL"` for memory retrieval:
```typescript
const contextType = "GENERAL";
const relevanceResult = MemoryRelevanceEngine.rankMemories(message, decayedMemories, contextType);
```
This bypasses `MemoryRelevanceEngine.classifyContext(query)` which would have correctly classified the query `"I need a gift for my father"` as context `"GIFT"`.

### 2. Preference Memory Boost Mismatch
Even if the context had been correctly passed as `"GIFT"`, the boost check in `relevanceEngine.ts` is:
```typescript
if (context === "GIFT" && "interest" in mem) return 1.0;
```
This check only boosts records from the `preferences` table (which use the `interest` key). Preference memories extracted from conversational turns are stored in the `memories` table (which has category `"preference"` but no `interest` key). So conversation preferences never receive the `1.0` gift boost.

---

## Fix Recommendations

1. **Remove hardcoded context:** In `route.ts`, pass `null` or let the relevance engine classify the context dynamically:
   ```typescript
   const relevanceResult = MemoryRelevanceEngine.rankMemories(message, decayedMemories);
   ```
2. **Expand the boost check:** Update `relevanceEngine.ts` to boost both structured preferences and preference memories:
   ```typescript
   if (context === "GIFT" && ("interest" in mem || (!("interest" in mem) && mem.category === "preference"))) return 1.0;
   ```
   *Estimated Fix Time:* 10 minutes.
   *Severity:* HIGH.
