# 05-psychology-engine.md

# KAPPY SHOPPING PSYCHOLOGY ENGINE V1

## Purpose of This Document

This document defines how Kappy understands the emotional and psychological motivations behind shopping behavior.

Most recommendation systems understand:

* Product
* Price
* Category

Very few understand:

* Emotion
* Motivation
* Intent
* Human psychology

The purpose of this engine is to answer:

**"Why is the user buying this?"**

not

**"What product are they asking for?"**

---

# Core Philosophy

People rarely buy products.

People buy emotional outcomes.

Examples:

Flowers are not flowers.

Flowers can mean:

* Love
* Apology
* Gratitude
* Sympathy
* Celebration

The product stays the same.

The psychology changes completely.

The psychology must drive recommendations.

---

# The Golden Rule

Never optimize for products.

Always optimize for desired emotional outcomes.

Bad:

User:
Need flowers.

↓

Show flowers.

---

Good:

User:
Need flowers.

↓

Why?

↓

Love?

Apology?

Sympathy?

Celebration?

↓

Recommend appropriately.

---

# Psychology Detection Framework

Every shopping situation should attempt to identify:

```json id="12kcpz"
{
  "primary_trigger": "",
  "secondary_trigger": "",
  "emotional_intensity": "",
  "confidence": 0.0
}
```

---

# Supported Psychological Triggers

## APPRECIATION

Purpose:

User wants to express gratitude.

Common Situations:

Mother's Day

Father's Day

Teacher Appreciation

Thank You Gifts

Mentor Gifts

Employee Recognition

Examples:

Need something special for mom.

---

Want to thank my teacher.

---

Need a gift for my father.

---

Desired Outcome:

Recipient feels appreciated.

---

# APOLOGY

Purpose:

Repair relationship damage.

Common Situations:

Arguments

Missed occasions

Relationship mistakes

Late gifts

Forgotten anniversaries

Examples:

My girlfriend is angry.

---

Forgot our anniversary.

---

Need to make it up to my wife.

---

Desired Outcome:

Reduce negative emotions.

Repair trust.

---

# LOVE

Purpose:

Express affection.

Common Situations:

Valentine's Day

Romantic Surprises

Dating Milestones

Relationship Gifts

Examples:

Need something romantic.

---

Want to surprise my girlfriend.

---

Looking for anniversary gifts.

---

Desired Outcome:

Strengthen emotional connection.

---

# CELEBRATION

Purpose:

Create happiness around positive events.

Common Situations:

Birthdays

Graduations

Promotions

Weddings

New Babies

Examples:

Birthday gift.

---

Graduation present.

---

Promotion celebration.

---

Desired Outcome:

Increase joy.

Create memorable moments.

---

# DUTY

Purpose:

Fulfill social obligation.

Common Situations:

Corporate gifts

Formal events

Expected occasions

Examples:

Need something for office event.

---

Need a gift for client.

---

Need a farewell gift for manager.

---

Desired Outcome:

Meet expectations.

Maintain relationships.

---

# CONVENIENCE

Purpose:

Reduce effort.

Common Situations:

Reorders

Groceries

Routine purchases

Examples:

Need water bottles again.

---

Order my usual cake.

---

Need tea again.

---

Desired Outcome:

Save time.

Reduce friction.

---

# URGENCY

Purpose:

Solve a time-sensitive problem.

Examples:

Forgot anniversary.

---

Need delivery today.

---

Birthday tomorrow.

---

Desired Outcome:

Prevent negative consequences.

---

# GUILT

Purpose:

Recover from a mistake.

Examples:

Forgot birthday.

---

Forgot anniversary.

---

Didn't buy anything yet.

---

Desired Outcome:

Reduce regret.

Repair damage.

---

# EXCITEMENT

Purpose:

Create anticipation and happiness.

Examples:

Surprise gift.

---

First anniversary.

---

Special celebration.

---

Desired Outcome:

Generate emotional impact.

---

# Emotional Intensity Levels

## VERY_HIGH

Examples:

Forgot anniversary

Wedding gift

Relationship repair

Retirement gift

---

## HIGH

Examples:

Birthday

Mother's Day

Father's Day

Graduation

---

## MEDIUM

Examples:

Thank you gifts

Farewell gifts

Teacher appreciation

---

## LOW

Examples:

Browsing

Routine shopping

Reorders

---

# Psychology Extraction Examples

## Example 1

User:

Forgot my wife's anniversary.

Output:

```json id="0yhy6v"
{
  "primary_trigger": "guilt",
  "secondary_trigger": "urgency",
  "emotional_intensity": "very_high"
}
```

---

## Example 2

User:

Need something special for mom.

Output:

```json id="e6jz2x"
{
  "primary_trigger": "appreciation",
  "emotional_intensity": "high"
}
```

---

## Example 3

User:

Need flowers for my girlfriend.

Output:

```json id="9x7mvh"
{
  "primary_trigger": "love"
}
```

Confidence medium.

May require clarification.

---

## Example 4

User:

Need flowers because I messed up.

Output:

```json id="grkxyi"
{
  "primary_trigger": "apology",
  "secondary_trigger": "guilt"
}
```

---

## Example 5

User:

Need water bottles again.

Output:

```json id="7mvv9f"
{
  "primary_trigger": "convenience"
}
```

---

# Trigger → Strategy Mapping

| Trigger      | Strategy                   |
| ------------ | -------------------------- |
| Appreciation | Thoughtful Recommendations |
| Love         | Romantic Recommendations   |
| Apology      | Relationship Repair        |
| Celebration  | Celebration Strategy       |
| Duty         | Professional Strategy      |
| Convenience  | Reorder Strategy           |
| Urgency      | Fast Decision Strategy     |
| Guilt        | Recovery Strategy          |
| Excitement   | Surprise Strategy          |

---

# Failure Mode 1

Treating all flowers equally.

Wrong.

Flowers for apology ≠ flowers for romance.

---

# Failure Mode 2

Ignoring urgency.

Forgot anniversary.

Wrong:

Normal recommendations.

Correct:

Urgent recovery strategy.

---

# Failure Mode 3

Ignoring emotional importance.

Wedding gift.

Wrong:

Generic suggestions.

Correct:

Premium thoughtful suggestions.

---

# Failure Mode 4

Ignoring guilt.

Forgot birthday.

Wrong:

Generic gift.

Correct:

Recovery-focused recommendation.

---

# Failure Mode 5

Ignoring convenience.

Reorder request.

Wrong:

Discovery process.

Correct:

Quick reorder flow.

---

# Psychology Confidence Framework

High Confidence

0.85+

Proceed.

---

Medium Confidence

0.60-0.84

Proceed cautiously.

Potential clarification.

---

Low Confidence

Below 0.60

Clarify.

---

Example:

Need flowers.

Possible:

Love

Apology

Celebration

Sympathy

Confidence:

Low.

Ask:

What is the occasion?

---

# Practical Examples

## Example 1

Need Father's Day gift.

Output:

```json id="g03zgz"
{
  "primary_trigger": "appreciation",
  "emotional_intensity": "high"
}
```

---

## Example 2

Forgot anniversary tomorrow.

Output:

```json id="j0x3rb"
{
  "primary_trigger": "guilt",
  "secondary_trigger": "urgency",
  "emotional_intensity": "very_high"
}
```

---

## Example 3

Need flowers for apology.

Output:

```json id="z0jq91"
{
  "primary_trigger": "apology"
}
```

---

## Example 4

Need gift for graduation.

Output:

```json id="t0m0wp"
{
  "primary_trigger": "celebration"
}
```

---

## Example 5

Need water bottles again.

Output:

```json id="8yceui"
{
  "primary_trigger": "convenience"
}
```

---

# Output Structure

```json id="p2sglx"
{
  "primary_trigger": "appreciation",
  "secondary_trigger": null,
  "emotional_intensity": "high",
  "confidence": 0.91
}
```

---

# Verification Checklist

Before leaving Psychology Engine verify:

✓ Primary trigger identified

✓ Secondary trigger identified

✓ Emotional intensity calculated

✓ Confidence assigned

✓ Strategy mapping completed

✓ Recommendation context enriched

✓ Psychological goal understood

---

# Final Rule

The Psychology Engine exists to answer:

**"Why is the user buying?"**

The recommendation engine answers:

**"What should we recommend?"**

The psychology engine answers:

**"What emotional outcome are we trying to create?"**

The emotional outcome should always guide the recommendation strategy.
    