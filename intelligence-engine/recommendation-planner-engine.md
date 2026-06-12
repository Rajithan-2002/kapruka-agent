# 08-recommendation-planner.md

# KAPPY RECOMMENDATION PLANNER V1

## Purpose of This Document

This document defines how Kappy converts intelligence into actionable recommendation instructions.

The Recommendation Planner is the final Intelligence Engine component before Recommendation Engine V3 begins product retrieval, filtering, ranking, and validation.

This module does NOT recommend products.

This module creates the recommendation blueprint.

The purpose of this engine is to answer:

**"Given everything we know, what should the recommendation engine optimize for?"**

---

# Position In Architecture

```text
Intent Understanding
↓
Situation Analysis
↓
Missing Information Detection
↓
Psychology Engine
↓
Relationship Intelligence
↓
Shopping Strategy Selector
↓
RECOMMENDATION PLANNER
↓
Recommendation Engine V3
↓
Decision Support
```

---

# Core Philosophy

Bad Recommendation Systems:

```text
User
↓
Search Products
↓
Recommend
```

Good Recommendation Systems:

```text
User
↓
Understand Context
↓
Create Recommendation Plan
↓
Search Products
↓
Recommend
```

Products should follow a plan.

Never the other way around.

---

# Core Mission

Transform intelligence outputs into a structured recommendation strategy.

Inputs:

* Situation Analysis
* Psychology Analysis
* Relationship Intelligence
* Shopping Strategy
* Memory Signals

Output:

A Recommendation Plan.

---

# Recommendation Plan Structure

Every recommendation session should generate:

```json
{
  "recipient": {},
  "occasion": {},
  "shopping_goal": {},
  "strategy": {},
  "preferred_categories": [],
  "secondary_categories": [],
  "avoid_categories": [],
  "hard_blocks": [],
  "budget_range": {},
  "delivery_requirements": {},
  "personalization_rules": [],
  "recommendation_priorities": []
}
```

This plan becomes the operating instructions for Recommendation Engine V3.

---

# Planning Principle 1

## Define Success First

Before recommendations begin:

Determine what success looks like.

Example:

User:

Need Father's Day gift.

Success:

```json
{
  "recipient_happiness": true,
  "budget_respected": true,
  "delivery_successful": true,
  "occasion_appropriate": true
}
```

Recommendation Engine should optimize for success criteria.

---

# Planning Principle 2

## Categories Must Follow Strategy

Example:

Strategy:

APPRECIATION

Preferred Categories:

```json
[
  "gift_hampers",
  "books",
  "watches",
  "gourmet_items",
  "personalized_gifts"
]
```

Not:

```json
[
  "all_products"
]
```

---

# Planning Principle 3

## Create Recommendation Priorities

Every plan should define ranking priorities.

Example:

Father's Day

```json
{
  "priority_1": "occasion_match",
  "priority_2": "recipient_match",
  "priority_3": "personalization",
  "priority_4": "budget",
  "priority_5": "delivery"
}
```

---

# Preferred Categories

Purpose:

Guide search space.

Example:

Father's Day

```json
[
  "watches",
  "electronics",
  "grooming",
  "books",
  "coffee",
  "gift_hampers"
]
```

---

Example:

Teacher Appreciation

```json
[
  "books",
  "gift_hampers",
  "stationery",
  "personalized_gifts"
]
```

---

Example:

Relationship Repair

```json
[
  "flowers",
  "chocolates",
  "personalized_items",
  "gift_sets"
]
```

---

# Secondary Categories

Purpose:

Backup recommendations.

Example:

Father's Day

```json
[
  "cakes",
  "snacks",
  "premium_food"
]
```

These appear if primary recommendations fail.

---

# Avoid Categories

Purpose:

Reduce recommendation confidence.

Example:

Father's Day

```json
[
  "romantic_gifts",
  "womens_beauty",
  "baby_products"
]
```

---

# Hard Block Categories

Purpose:

Never recommend.

Examples:

```json
[
  "adult_products",
  "sexual_wellness",
  "erotic_items"
]
```

Hard blocks override all scoring.

---

# Personalization Rules

Purpose:

Apply relationship intelligence.

Example:

Known Profile:

```json
{
  "interests": [
    "gardening",
    "tea"
  ]
}
```

Planner Output:

```json
{
  "personalization_rules": [
    "boost_gardening",
    "boost_tea",
    "reduce_generic_recommendations"
  ]
}
```

---

# Budget Planning

Purpose:

Convert budget into recommendation boundaries.

Example:

Budget:

Rs.5000

Planner:

```json
{
  "target_budget": 5000,
  "acceptable_min": 3500,
  "acceptable_max": 5500
}
```

---

# Delivery Planning

Purpose:

Create delivery constraints.

Example:

Need tomorrow in Jaffna.

Planner Output:

```json
{
  "delivery_required": true,
  "latest_date": "tomorrow",
  "city": "jaffna"
}
```

Recommendation Engine V3 must obey these constraints.

---

# Strategy-Specific Plans

## Father's Day

Input:

```json
{
  "recipient": "father",
  "occasion": "fathers_day"
}
```

Output:

```json
{
  "strategy": "APPRECIATION",
  "preferred_categories": [
    "watches",
    "electronics",
    "books",
    "gift_hampers"
  ],
  "avoid_categories": [
    "romantic_gifts"
  ]
}
```

---

## Relationship Repair

Input:

```json
{
  "trigger": "apology"
}
```

Output:

```json
{
  "strategy": "RELATIONSHIP_REPAIR",
  "preferred_categories": [
    "flowers",
    "chocolates",
    "personalized_gifts"
  ]
}
```

---

## Reorder

Input:

```json
{
  "intent": "reorder"
}
```

Output:

```json
{
  "strategy": "CONVENIENCE",
  "priority": "previous_purchases"
}
```

---

# Recommendation Diversity Planning

Purpose:

Prevent repetitive recommendations.

Bad:

```text
Watch
Watch
Watch
```

Good:

```text
Watch
Gift Hamper
Coffee Set
```

The planner should define diversity targets.

Example:

```json
{
  "diversity_required": true,
  "max_same_category": 1
}
```

---

# Recommendation Confidence Planning

Purpose:

Determine confidence expectations.

Example:

High Context Available

```json
{
  "minimum_confidence": 0.85
}
```

---

Example:

Limited Context

```json
{
  "minimum_confidence": 0.70
}
```

---

# Failure Mode 1

No Recommendation Plan.

Wrong:

Search immediately.

Correct:

Generate plan first.

---

# Failure Mode 2

No Category Guidance.

Wrong:

Search entire catalog.

Correct:

Search preferred categories first.

---

# Failure Mode 3

Ignoring Memory.

Wrong:

Generic recommendations.

Correct:

Apply personalization rules.

---

# Failure Mode 4

No Diversity Targets.

Wrong:

Three identical recommendations.

Correct:

Multiple recommendation angles.

---

# Failure Mode 5

No Success Definition.

Wrong:

Highest score wins.

Correct:

Optimize for user outcome.

---

# Practical Examples

## Example 1

Need Father's Day gift under Rs.5000.

Planner Output:

```json
{
  "strategy": "APPRECIATION",
  "preferred_categories": [
    "watches",
    "books",
    "gift_hampers"
  ],
  "budget": 5000
}
```

---

## Example 2

Forgot anniversary tomorrow.

Planner Output:

```json
{
  "strategy": "RELATIONSHIP_REPAIR",
  "urgency": "critical",
  "delivery_required": true
}
```

---

## Example 3

Need gift for teacher.

Planner Output:

```json
{
  "strategy": "APPRECIATION",
  "preferred_categories": [
    "books",
    "stationery",
    "gift_hampers"
  ]
}
```

---

## Example 4

Need water bottles again.

Planner Output:

```json
{
  "strategy": "REORDER",
  "priority": "purchase_history"
}
```

---

## Example 5

Need gift for father who likes gardening.

Planner Output:

```json
{
  "personalization_rules": [
    "boost_gardening"
  ]
}
```

---

# Output Structure

```json
{
  "strategy": "APPRECIATION",
  "preferred_categories": [],
  "secondary_categories": [],
  "avoid_categories": [],
  "hard_blocks": [],
  "budget_rules": {},
  "delivery_rules": {},
  "personalization_rules": [],
  "recommendation_priorities": [],
  "diversity_rules": {},
  "confidence_rules": {}
}
```

---

# Verification Checklist

Before Recommendation Engine V3 receives a request verify:

✓ Strategy selected

✓ Success criteria defined

✓ Preferred categories generated

✓ Avoid categories generated

✓ Hard blocks generated

✓ Personalization rules applied

✓ Budget rules created

✓ Delivery rules created

✓ Diversity rules created

✓ Confidence thresholds created

✓ Recommendation priorities created

---

# Final Rule

The Recommendation Planner exists to answer:

**"What should Recommendation Engine V3 optimize for?"**

The Recommendation Engine ranks products.

The Recommendation Planner decides what "good" looks like.

Without a recommendation plan, the engine searches.

With a recommendation plan, the engine solves problems.
