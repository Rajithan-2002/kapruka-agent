# KAPPY MASTER SYSTEM AUDIT INSTRUCTIONS

When the user requests a **"full audit"**, the agent must act as a Principal QA Engineer, Senior Solution Architect, Reliability Engineer, AI Systems Auditor, Security Auditor, Database Engineer, and Production Readiness Reviewer to aggressively test, verify, challenge, break, and validate the entire Kapruka AI system.

Do not assume any feature works because code exists. Verify actual execution, query database states programmatically, run test calls, and perform the audit across the 13 phases.

---

## Output Archive & Folder Structure Requirement

Whenever a full audit is initiated:
1. Create an `audits` directory in the root of the workspace if it does not already exist.
2. Create a nested, timestamped folder inside it named:
   `audit_report-YYYY-MM-DD-HH-MM` (using the current date and time).
3. Save all 13 output markdown audit files (e.g., `SYSTEM_MAP.md`, `ENGINE_AUDIT.md`, etc.) directly inside this timestamped folder.
4. Also write them to the subagent's conversation brain/artifact directory, but the primary long-term archive must reside in this local workspace `audits` sub-folder.

---

## 13 Audit Phases & Target Filenames

All of the following files must be written under the `audits/audit_report-YYYY-MM-DD-HH-MM/` directory:

### PHASE 1 — SYSTEM DISCOVERY
Scan the codebase, compile the dependency graph of engines/services/databases, and determine criticality and risk parameters.
- **Filename:** `SYSTEM_MAP.md` (Module, Purpose, Dependencies, Criticality, Risk, Status)

### PHASE 2 — UNIT TEST AUDIT
Verify type-checking (`npx tsc --noEmit`), import resolution, circular dependency absence, runtime crashes, and edge cases.
- **Filename:** `UNIT_TEST_AUDIT.md` (PASS/FAIL/WARNING for each module)

### PHASE 3 — FULL ENGINE VALIDATION
Verify if all 16 cognitive engines (Intent, Emotion, Memory, Relationship, Community, Recommendation, Ranking, Learning, God Mode, Trust & Safety, Language, Context, Session, Reasoning, Decision, Personalization) are:
1. Initialized
2. Called
3. Affecting output
4. Persisting output
5. Reusing output
6. Measurable
Identify `DEAD CODE`, `UNUSED INTELLIGENCE`, or `UNUSED STORAGE`.
- **Filename:** `ENGINE_AUDIT.md`

### PHASE 4 — API VALIDATION
Check all endpoints (`/api/chat`, `/api/checkout`, etc.). Verify registration, validation, timeout/retry handling, authentication, and error recovery.
- **Filename:** `API_AUDIT.md`

### PHASE 5 — MCP TOOL VALIDATION
Verify all Model Context Protocol tools (product search, order tracking, categories, etc.) connect and return valid structures. Simulate tool calls and measure latencies.
- **Filename:** `MCP_AUDIT.md`

### PHASE 6 — DATABASE AUDIT
Check table row counts, indexes, foreign keys, and write/read operations across all tables.
- **Filename:** `DATABASE_AUDIT.md`

### PHASE 7 — MEMORY VALIDATION
Test conversational memory persistence and retrieval. Verify if preference memories actively boost recommendations and reasoning during follow-up turns.
- **Filename:** `MEMORY_AUDIT.md`

### PHASE 8 — GOD MODE VALIDATION
Verify God Mode trace generation, persistence, retrieval, and complete telemetry logging.
- **Filename:** `GODMODE_AUDIT.md`

### PHASE 9 — VECTOR DATABASE VALIDATION
Verify PGVector database similarity searches, cosine distance threshold checks, leakage safeguards, and embedding cache hits.
- **Filename:** `VECTOR_DB_AUDIT.md`

### PHASE 10 — MULTILINGUAL INTELLIGENCE TESTING
Check dialect detection, intent parsing, and adapted instructions for English, Sinhala, Tamil, Singlish, Tanglish, and Mixed inputs.
- **Filename:** `LANGUAGE_AUDIT.md`

### PHASE 11 — RECOMMENDATION QUALITY TEST
Compare recommendations with vs. without personalization signals (Memory, Relationships, Behavior, Budget) and calculate **Recommendation Quality Gain %**.
- **Filename:** `INTELLIGENCE_IMPACT_REPORT.md`

### PHASE 12 — SECURITY & FAILURE TESTING
Test resilience against prompt injection, memory poisoning, SQL injection, and database/API/vector outages. Verify graceful degradation (e.g. circuit breakers).
- **Filename:** `SECURITY_AND_FAILURE_AUDIT.md`

### PHASE 13 — FINAL SCORECARD
Synthesize overall health scores (0-100) and list all warnings and failures, detailing:
- Root Cause
- Severity
- Fix Recommendation
- Estimated Fix Time
- **Filename:** `FINAL_SCORECARD.md`
