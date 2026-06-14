# KAPRUKA AI DATABASE AUDIT

This document reports the live verification of Kapruka AI's Supabase PostgreSQL database schemas, indexes, foreign keys, row counts, and storage patterns.

---

## Database Schema Table Verification

A live programmatic database check was run on 16 active tables using the Supabase Service client:

| Table Name | Active Rows | Reads OK? | Inserts OK? | Indexing Status | Audit Verdict / Status |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **user_profiles** | 18 | Yes | Yes | Primary key indexed | **ACTIVE** — Stores user language and budget preferences. |
| **relationships** | 14 | Yes | Yes | Primary key indexed | **ACTIVE** — Nickname and relation metadata. |
| **preferences** | 25 | Yes | Yes | `relationship_id` indexed | **ACTIVE** — Tracks user interests. |
| **memories** | 16 | Yes | Yes | Primary key indexed | **ACTIVE** — Chat memories. |
| **orders** | 5 | Yes | Yes | `user_id` indexed | **ACTIVE** — Confirmed checkouts. |
| **recommendation_traces**| 316 | Yes | Yes | Multi-column indexed | **ACTIVE** — Records recommendation pipelines. |
| **search_sessions** | 105 | Yes | Yes | Primary key indexed | **ACTIVE** — Caches raw pagination data. |
| **stored_conversations**| 3 | Yes | Yes | `session_id` indexed | **ACTIVE** — Scenario turn metrics. |
| **kappy_vocabulary** | 92 | Yes | Yes | Word text indexed | **ACTIVE** — Language family words. |
| **kappy_few_shots** | 49 | Yes | Yes | Embedding vector indexed | **ACTIVE** — pgvector few-shots. |
| **godmode_traces** | 144 | Yes | Yes | `trace_id` indexed | **ACTIVE** — God Mode telemetry JSON logs. |
| **community_analytics** | 2766 | Yes | Yes | Group index active | **ACTIVE** — Community analytics. |
| **intelligence_traces** | 3658 | Yes | Yes | Multi-column indexed | **ACTIVE** — Debug traces. |
| **community_relevance_scores**| 7 | Yes | Yes | Primary key indexed | **ACTIVE** — Trending calculations. |
| **user_affinities** | 0 | Yes | No | None | **UNUSED STORAGE** — Table is completely empty and no writes are ever executed. |
| **learning_events** | 0 | Yes | No | None | **UNUSED STORAGE** — Table is completely empty and no writes are ever executed. |

---

## Detailed Constraint & Index Audit

### 1. Foreign Key Integrity
- `relationships.user_id` references `user_profiles.id`. Verified: Orphaned inserts are blocked by the database.
- `preferences.relationship_id` references `relationships.id` with `ON DELETE CASCADE` constraint. Verified: Deleting a relationship automatically purges all connected preference rows.

### 2. Indexes and Performance
- **Primary Indexes:** All tables use standard B-Tree indexing on primary keys.
- **Secondary Indexes:**
  - `idx_recommendation_traces_user_id` on `recommendation_traces(user_id)` (B-Tree)
  - `idx_recommendation_traces_trace_id` on `recommendation_traces(trace_id)` (B-Tree)
  - `idx_search_sessions_user_id` on `search_sessions(user_id)` (B-Tree)
  - `idx_stored_conversations_session_id` on `stored_conversations(session_id)` (B-Tree)
  - `idx_godmode_traces_trace_id` on `godmode_traces(trace_id)` (B-Tree)
- **Vector Indexes:** `kappy_few_shots` supports vector similarity querying via `match_few_shots` using a Cosine Distance operator (`<=>`).

---

## Database Gaps (Unused Storage)

### 1. `user_affinities`
- **Purpose:** Intended to track brand and category affinities to influence scoring.
- **State:** `0` rows.
- **Diagnostics:** The table is completely unused by the Next.js API. No database calls write to or read from it.
- **Status:** **UNUSED STORAGE**.

### 2. `learning_events`
- **Purpose:** Intended to capture user corrections and rating clicks.
- **State:** `0` rows.
- **Diagnostics:** The table is completely unused by the Next.js API. No database calls write to or read from it.
- **Status:** **UNUSED STORAGE**.
