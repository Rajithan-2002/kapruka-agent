# 03-situation-analysis-engine.md

# KAPPY SITUATION ANALYSIS ENGINE V1

## Purpose of This Document

This document defines how Kappy extracts, understands, structures, and validates the user's shopping situation before recommendations begin.

The Situation Analysis Engine is responsible for transforming natural language into structured decision-making context.

Without accurate situation understanding:

* Recommendations become generic
* Psychology detection fails
* Strategy selection fails
* Recipient understanding fails
* Recommendation quality collapses

This engine is the foundation of all downstream intelligence.

---

# Core Mission

The purpose of Situation Analysis is to answer:

"What is actually happening here?"

Not:

"What products can we show?"

---

# Why Situation Analysis Exists

Most recommendation systems extract:

```json
{
  "recipient": "father"
}
```

This is insufficient.

Kappy should extract:

```json
{
  "recipient": "father",
  "occasion": "birthday",
  "urgency": "critical",
  "budget": 5000,
  "location": "Colombo",
  "goal": "show appreciation",
  "relationship_importance": "high"
}
```

The richer the context, the better the recommendation.

---

# Situation Context Model

Every conversation should attempt to populate the following structure:

```json
{
  "recipient": null,
  "relationship_type": null,
  "occasion": null,
  "urgency": null,
  "budget": null,
  "delivery_location": null,
  "delivery_date": null,
  "shopping_goal": null,
  "event_importance": null,
  "constraints": [],
  "known_preferences": [],
  "confidence": 0.0
}
```

Not all fields must be known immediately.

Unknown fields should be handled by the Missing Information Detector.

---

# Context Attribute 1

## Recipient Detection

Purpose:

Identify who the recommendation is intended for.

Examples:

Father

Mother

Girlfriend

Boyfriend

Wife

Husband

Teacher

Friend

Boss

Employee

Client

Child

Baby

Self

Unknown

---

Example 1

User:

Need Father's Day gift.

Output:

```json
{
  "recipient": "father"
}
```

---

Example 2

User:

Need something for my wife.

Output:

```json
{
  "recipient": "wife"
}
```

---

Example 3

User:

Need a birthday gift for my manager.

Output:

```json
{
  "recipient": "manager"
}
```

---

# Context Attribute 2

## Occasion Detection

Purpose:

Determine why the purchase is happening.

Supported occasions:

Birthday

Anniversary

Wedding

Father's Day

Mother's Day

Graduation

Promotion

Retirement

Valentine's Day

Christmas

New Year

Baby Shower

Housewarming

Apology

Thank You

Corporate Event

General Shopping

Reorder

Unknown

---

Example 1

User:

My mom's birthday is tomorrow.

Output:

```json
{
  "occasion": "birthday"
}
```

---

Example 2

User:

Need something for Father's Day.

Output:

```json
{
  "occasion": "fathers_day"
}
```

---

Example 3

User:

Need flowers because I messed up.

Output:

```json
{
  "occasion": "apology"
}
```

---

# Context Attribute 3

## Urgency Detection

Purpose:

Determine how time-sensitive the situation is.

Levels:

CRITICAL

HIGH

NORMAL

LOW

---

Critical Examples

Forgot anniversary today.

Need cake in 3 hours.

Birthday is tomorrow.

Need delivery today.

---

High Examples

Event this weekend.

Need something by Friday.

---

Normal Examples

Planning next month.

Looking around.

Exploring ideas.

---

Low Examples

Just browsing.

Maybe later.

Thinking ahead.

---

Example

User:

Forgot my wife's birthday tomorrow.

Output:

```json
{
  "urgency": "critical"
}
```

---

# Context Attribute 4

## Budget Extraction

Purpose:

Determine financial constraints.

Examples:

Under Rs.5000

Budget 10000

Cheap gift

Premium gift

Luxury option

No budget restriction

---

Example 1

Need Father's Day gift under 5000.

Output:

```json
{
  "budget": 5000
}
```

---

Example 2

Need something premium.

Output:

```json
{
  "budget": "premium"
}
```

---

Example 3

Price doesn't matter.

Output:

```json
{
  "budget": "unrestricted"
}
```

---

# Context Attribute 5

## Delivery Context

Purpose:

Determine delivery constraints.

Fields:

Location

Date

Time

Special Requirements

---

Example

Need cake tomorrow in Jaffna.

Output:

```json
{
  "delivery_location": "Jaffna",
  "delivery_date": "tomorrow"
}
```

---

Example

Need flowers delivered before 5 PM.

Output:

```json
{
  "delivery_time": "before_5pm"
}
```

---

# Context Attribute 6

## Shopping Goal Detection

Purpose:

Understand what outcome the user wants.

This is more important than products.

Examples:

Celebrate

Appreciate

Repair Relationship

Surprise

Convenience

Obligation

Corporate Courtesy

Luxury Experience

---

Example

Need something special for my mother.

Likely Goal:

```json
{
  "shopping_goal": "appreciation"
}
```

---

Example

Forgot anniversary.

Likely Goal:

```json
{
  "shopping_goal": "relationship_repair"
}
```

---

Example

Need water bottles again.

Likely Goal:

```json
{
  "shopping_goal": "convenience"
}
```

---

# Context Attribute 7

## Event Importance Detection

Purpose:

Estimate emotional importance.

Levels:

VERY_HIGH

HIGH

MEDIUM

LOW

---

Very High

Wedding

Anniversary

Retirement

Mother's Birthday

Father's Birthday

---

High

Graduation

Promotion

Valentine's Day

---

Medium

Thank You Gift

Office Event

---

Low

Casual Shopping

Routine Purchases

---

Example

User:

Need anniversary gift.

Output:

```json
{
  "event_importance": "very_high"
}
```

---

# Context Attribute 8

## Constraint Extraction

Purpose:

Capture hard limitations.

Examples:

Budget

Delivery Deadline

Specific Brand

Dietary Restrictions

Location Restrictions

Recipient Preferences

---

Example

Need vegan cake tomorrow.

Output:

```json
{
  "constraints": [
    "vegan",
    "tomorrow_delivery"
  ]
}
```

---

# Context Confidence Scoring

Every extracted field should receive confidence.

Example:

```json
{
  "recipient": {
    "value": "father",
    "confidence": 0.97
  }
}
```

---

Confidence Guidelines

High Confidence

0.85 - 1.00

---

Medium Confidence

0.60 - 0.84

---

Low Confidence

Below 0.60

Requires clarification.

---

# Common Failure Modes

## Failure 1

User:

Need something for him.

Wrong:

```json
{
  "recipient": "father"
}
```

Correct:

```json
{
  "recipient": "unknown"
}
```

---

## Failure 2

User:

Need flowers.

Wrong:

Assume romance.

Correct:

Occasion unknown.

---

## Failure 3

User:

Need cake.

Wrong:

Assume birthday.

Correct:

Occasion unknown.

---

## Failure 4

User:

Need gift tomorrow.

Wrong:

Assume recipient.

Correct:

Recipient unknown.

---

## Failure 5

User:

Need something premium.

Wrong:

Assume budget amount.

Correct:

Budget category only.

---

# Practical Examples

## Example 1

User:

Need Father's Day gift under Rs.5000.

Output:

```json
{
  "recipient": "father",
  "occasion": "fathers_day",
  "budget": 5000
}
```

---

## Example 2

User:

Forgot my wife's birthday tomorrow.

Output:

```json
{
  "recipient": "wife",
  "occasion": "birthday",
  "urgency": "critical",
  "event_importance": "very_high"
}
```

---

## Example 3

User:

Need flowers because I messed up.

Output:

```json
{
  "occasion": "apology",
  "shopping_goal": "relationship_repair"
}
```

---

## Example 4

User:

Need vegan cake in Colombo tomorrow.

Output:

```json
{
  "occasion": "unknown",
  "constraints": [
    "vegan"
  ],
  "delivery_location": "Colombo",
  "delivery_date": "tomorrow"
}
```

---

## Example 5

User:

Need something special for my mom.

Output:

```json
{
  "recipient": "mother",
  "shopping_goal": "appreciation"
}
```

---

# Verification Checklist

Before exiting Situation Analysis verify:

✓ Recipient extracted

✓ Occasion extracted

✓ Urgency identified

✓ Budget identified

✓ Delivery constraints extracted

✓ Shopping goal estimated

✓ Event importance estimated

✓ Confidence assigned

✓ Unknown fields identified

✓ Missing information list generated

---

# Final Rule

The Situation Analysis Engine exists to answer:

"What exactly is happening in this shopping situation?"

The recommendation engine should never receive raw user messages.

It should only receive structured situation context generated by this engine.
