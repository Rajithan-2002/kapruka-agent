# 14-implementation-blueprint.md

# KAPPY INTELLIGENCE ENGINE V1 IMPLEMENTATION BLUEPRINT

## Purpose of This Document

This document translates the Intelligence Engine architecture into an implementation plan that can be executed by Antigravity.

Previous documents defined:

* Philosophy
* Reasoning
* Behavior
* Examples

This document defines:

* Files
* Modules
* Interfaces
* Data Flow
* Execution Order
* Integration Points

This document is implementation-focused.

---

# Architecture Position

Current Kappy Architecture:

```text
User
↓
Understanding Engine
↓
Recommendation Engine V3
↓
Response
```

Future Architecture:

```text
User
↓
Understanding Engine
↓
Intelligence Engine
↓
Recommendation Engine V3
↓
Decision Support
↓
Humanizer
↓
Response
```

The Intelligence Engine becomes the decision-making layer.

---

# High Level Flow

```text
User Message
↓
Intent Understanding
↓
Situation Analysis
↓
Missing Information Detection
↓
Psychology Analysis
↓
Relationship Intelligence
↓
Shopping Strategy Selection
↓
Recommendation Planning
↓
Recommendation Engine V3
↓
Decision Support
↓
Confidence Building
↓
Response
↓
Learning Engine
```

---

# Recommended Folder Structure

```text
src/

 intelligence/

   intent/
     intentEngine.ts

   situation/
     situationAnalyzer.ts

   missing/
     missingInfoDetector.ts

   psychology/
     psychologyEngine.ts

   relationship/
     relationshipEngine.ts

   strategy/
     strategySelector.ts

   planning/
     recommendationPlanner.ts

   decision/
     decisionSupport.ts

   confidence/
     confidenceBuilder.ts

   learning/
     learningEngine.ts

   types/
     intelligence.types.ts

   orchestrator/
     intelligenceOrchestrator.ts
```

---

# Phase 1

## Create Intelligence Types

File:

```text
src/intelligence/types/intelligence.types.ts
```

Purpose:

Single source of truth.

---

Example:

```typescript
export interface SituationContext {
  recipient?: string;
  occasion?: string;
  urgency?: string;
  budget?: number;
  location?: string;
  goal?: string;
}
```

---

Example:

```typescript
export interface IntelligenceOutput {
  readyForRecommendation: boolean;
  nextQuestion?: string;
  strategy?: string;
  recommendationPlan?: RecommendationPlan;
}
```

---

# Phase 2

## Build Intent Engine

File:

```text
intentEngine.ts
```

Input:

```typescript
message: string
```

Output:

```typescript
{
  intent: string;
  confidence: number;
}
```

Supported:

```text
SHOPPING
GIFTING
REORDER
BROWSING
TRACKING
DELIVERY
COMPLAINT
SMALL_TALK
UNKNOWN
```

---

# Phase 3

## Build Situation Analyzer

File:

```text
situationAnalyzer.ts
```

Input:

```typescript
message
memory
session
```

Output:

```typescript
{
  recipient,
  occasion,
  budget,
  urgency,
  location,
  constraints
}
```

This becomes the primary context object.

---

# Phase 4

## Build Missing Information Detector

File:

```text
missingInfoDetector.ts
```

Input:

Situation Context

Output:

```typescript
{
  recommendationReady: boolean;
  missingFields: string[];
  nextQuestion?: string;
}
```

---

Example:

```json
{
  "recipient": null,
  "occasion": null
}
```

Output:

```json
{
  "recommendationReady": false,
  "nextQuestion": "Who are we shopping for?"
}
```

---

# Phase 5

## Build Psychology Engine

File:

```text
psychologyEngine.ts
```

Input:

Situation Context

Output:

```typescript
{
  primaryTrigger,
  secondaryTrigger,
  emotionalIntensity
}
```

Examples:

```text
APPRECIATION
LOVE
GUILT
APOLOGY
CONVENIENCE
CELEBRATION
```

---

# Phase 6

## Build Relationship Engine

File:

```text
relationshipEngine.ts
```

Input:

Recipient

Memory

History

Output:

```typescript
{
  interests: [],
  dislikes: [],
  successfulGifts: [],
  failedGifts: []
}
```

---

Memory Sources:

* Supabase
* User Memory Service
* Purchase History

---

# Phase 7

## Build Strategy Selector

File:

```text
strategySelector.ts
```

Input:

All intelligence outputs.

Output:

```typescript
{
  primaryStrategy,
  secondaryStrategy,
  confidence
}
```

Supported:

```text
GUIDED_GIFTING
APPRECIATION
RELATIONSHIP_REPAIR
CELEBRATION
REORDER
DISCOVERY
BUDGET_OPTIMIZATION
LAST_MINUTE_RESCUE
PROFESSIONAL_GIFTING
```

---

# Phase 8

## Build Recommendation Planner

File:

```text
recommendationPlanner.ts
```

Input:

All intelligence context.

Output:

Recommendation Plan.

---

Example:

```typescript
{
  preferredCategories: [],
  avoidCategories: [],
  hardBlocks: [],
  budgetRules: {},
  deliveryRules: {}
}
```

---

This becomes the input for Recommendation Engine V3.

---

# Phase 9

## Build Intelligence Orchestrator

File:

```text
intelligenceOrchestrator.ts
```

Purpose:

Run entire pipeline.

---

Pseudo Flow:

```typescript
intent
 ↓
situation
 ↓
missingInfo
 ↓
psychology
 ↓
relationship
 ↓
strategy
 ↓
planner
```

---

Output:

```typescript
IntelligenceOutput
```

---

# Phase 10

## Connect To Route

Current:

```typescript
route.ts
 ↓
recommendationEngine()
```

Replace:

```typescript
route.ts
 ↓
intelligenceOrchestrator()
 ↓
recommendationEngineV3()
```

---

Example:

```typescript
const intelligence =
 await intelligenceOrchestrator(context);

if (!intelligence.readyForRecommendation) {
   return askQuestion();
}

return recommendationEngineV3(
   intelligence.recommendationPlan
);
```

---

# Recommendation Engine V3 Integration

Current Recommendation Input:

```json
{
  "recipient": "father"
}
```

Weak.

---

Future Input:

```json
{
  "recipient": "father",
  "occasion": "fathers_day",
  "urgency": "normal",
  "goal": "appreciation",
  "interests": [
    "gardening"
  ],
  "preferredCategories": [
    "watches",
    "gift_hampers"
  ],
  "avoidCategories": [
    "romantic"
  ]
}
```

Much stronger.

---

# Memory Integration

Relationship Engine should read from:

```text
Memory Service
```

Learning Engine should write to:

```text
Memory Service
```

Architecture:

```text
Memory
↓
Relationship Engine

Learning Engine
↓
Memory
```

Closed loop learning.

---

# Database Additions

Recommended Tables:

```text
relationship_profiles

recipient_preferences

gift_history

recommendation_feedback

strategy_performance

learning_events
```

---

# Logging Requirements

Every intelligence stage should log:

```typescript
{
  stage,
  input,
  output,
  confidence,
  executionTime
}
```

Purpose:

Debugging

QA

Judge demonstrations

Analytics

---

# Feature Flags

Implement:

```typescript
INTELLIGENCE_ENGINE_ENABLED

PSYCHOLOGY_ENGINE_ENABLED

RELATIONSHIP_ENGINE_ENABLED

LEARNING_ENGINE_ENABLED
```

Allows safe rollout.

---

# Testing Strategy

Unit Tests:

Every module individually.

---

Integration Tests:

Entire intelligence pipeline.

---

Scenario Tests:

Father's Day

Birthday

Apology

Teacher Gift

Reorder

Corporate Gift

Urgent Delivery

Budget Shopping

---

Regression Tests:

Every failure listed in:

```text
12-failure-modes-and-anti-patterns.md
```

must become an automated test.

---

# Phase Rollout Plan

## Phase 1

Build:

```text
Intent Engine
Situation Analyzer
Missing Info Detector
```

Impact:

Very High

Complexity:

Low

---

## Phase 2

Build:

```text
Psychology Engine
Strategy Selector
```

Impact:

High

Complexity:

Medium

---

## Phase 3

Build:

```text
Relationship Engine
Recommendation Planner
```

Impact:

Very High

Complexity:

Medium

---

## Phase 4

Build:

```text
Decision Support
Confidence Builder
Learning Engine
```

Impact:

High

Complexity:

High

---

# Success Metrics

Track:

Recommendation Acceptance Rate

Click Through Rate

Purchase Rate

Question Completion Rate

Conversation Completion Rate

Recommendation Satisfaction

Relationship Memory Usage

Decision Confidence

---

# Final Rule

Implementation should follow this principle:

```text
Understand
↓
Plan
↓
Recommend
↓
Support
↓
Learn
```

Never:

```text
Recommend
↓
Hope
```

The Intelligence Engine exists to ensure Recommendation Engine V3 receives structured, validated, human-centered context instead of raw user messages.
