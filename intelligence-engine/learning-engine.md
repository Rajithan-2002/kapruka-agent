# 11-learning-engine.md

# KAPPY LEARNING ENGINE V1

## Purpose of This Document

This document defines how Kappy continuously improves its understanding of users, recipients, shopping behavior, recommendation quality, and decision outcomes over time.

Most recommendation systems are static.

They make the same mistakes repeatedly.

Kappy should behave differently.

Every interaction should improve future decisions.

The purpose of the Learning Engine is to answer:

**"What did we learn from this interaction?"**

and

**"How should future recommendations improve?"**

---

# Core Philosophy

Every user action is feedback.

Users teach Kappy continuously through:

* Purchases
* Clicks
* Views
* Rejections
* Feedback
* Corrections
* Conversations

The Learning Engine converts these signals into intelligence.

---

# Core Mission

Observe behavior.

Extract signals.

Update memory.

Improve future recommendations.

Improve future conversations.

Improve future decision support.

---

# Learning Sources

The engine learns from:

## Explicit Feedback

User directly tells Kappy something.

Example:

I don't like flowers.

---

My dad loves gardening.

---

Those recommendations were terrible.

---

This gift worked perfectly.

---

High confidence learning.

---

## Implicit Feedback

User behavior reveals preferences.

Example:

Clicked gardening products.

Ignored flowers.

Viewed tea hampers repeatedly.

Purchased gardening kit.

---

Medium confidence learning.

---

## Outcome Feedback

The result of a recommendation.

Example:

Purchased recommendation.

Positive outcome.

---

Ignored recommendation.

Potential negative signal.

---

Requested alternatives.

Potential dissatisfaction signal.

---

# Learning Signal Types

## Positive Signals

Examples:

Purchase

Add to cart

Bundle creation

Saved item

Positive feedback

Repeated purchases

---

These increase confidence.

---

## Negative Signals

Examples:

Ignored recommendations

Rejected products

Negative feedback

Repeated skipping

Abandoned carts

---

These decrease confidence.

---

## Neutral Signals

Examples:

Browsing

Quick views

Category exploration

---

Used carefully.

Do not overinterpret.

---

# User Preference Learning

Purpose:

Understand the user's own preferences.

Example:

User repeatedly buys:

Coffee

Tea

Books

---

Store:

```json
{
  "preferences": [
    "coffee",
    "tea",
    "books"
  ]
}
```

Future recommendations receive boosts.

---

# Recipient Preference Learning

Purpose:

Understand recipients.

Example:

User:

My father loved the gardening set.

Store:

```json
{
  "recipient": "father",
  "successful_interest": "gardening"
}
```

Future Father's Day recommendations improve.

---

# Gift Success Learning

Purpose:

Understand which gifts work.

Examples:

Successful Gifts:

Purchased

Positive feedback

Repeated categories

---

Failed Gifts:

Negative feedback

Ignored gifts

Returned products

---

Example:

```json
{
  "successful_gifts": [
    "gardening_kit"
  ]
}
```

---

# Relationship Learning

Purpose:

Improve relationship profiles.

Example:

Year 1

Known:

Tea

---

Year 2

Learned:

Gardening

---

Year 3

Learned:

Travel

---

Relationship profile becomes richer.

---

# Occasion Learning

Purpose:

Understand occasion preferences.

Example:

Father's Day

Past Success:

Books

Gardening

Coffee

---

Future Father's Day recommendations receive boosts.

---

# Strategy Learning

Purpose:

Understand which shopping strategies work.

Example:

Relationship Repair

Flowers repeatedly ignored.

Personalized gifts repeatedly purchased.

---

Result:

Increase personalization weight.

Decrease flower weight.

---

# Recommendation Performance Tracking

Every recommendation should generate:

```json
{
  "recommended": true,
  "clicked": false,
  "purchased": false,
  "ignored": true
}
```

---

This allows performance evaluation.

---

# Recommendation Success Score

Example:

```json
{
  "impression": 1,
  "click": 1,
  "purchase": 1
}
```

High success.

---

Example:

```json
{
  "impression": 1,
  "click": 0,
  "purchase": 0
}
```

Low success.

---

# Memory Update Rules

High Confidence Signals:

Explicit user statements.

---

Medium Confidence Signals:

Repeated behavior.

---

Low Confidence Signals:

Single interaction.

---

Rule:

Never create strong memories from weak signals.

---

# Memory Decay

Purpose:

Prevent stale assumptions.

People change.

Example:

Five years ago:

User liked gaming.

---

Today:

User shops for gardening.

---

Old preferences should gradually lose influence.

---

Rule:

Recent signals matter more.

---

# Contradiction Handling

Example:

Memory:

User dislikes flowers.

---

Current Message:

Need flowers.

---

Rule:

Current conversation wins.

Memory assists.

Memory does not override.

---

# Learning Confidence Framework

Every learned fact should contain:

```json
{
  "fact": "likes_gardening",
  "confidence": 0.92,
  "source": "explicit_user_statement"
}
```

---

Possible Sources:

Explicit Statement

Purchase History

Recommendation Outcome

Repeated Behavior

Feedback

---

# Learning Categories

## User Preferences

Example:

Likes coffee.

---

## Recipient Preferences

Example:

Father likes gardening.

---

## Occasion Preferences

Example:

Mother's Day → Tea Hampers.

---

## Delivery Preferences

Example:

Prefers morning delivery.

---

## Budget Preferences

Example:

Usually spends Rs.5000–10000.

---

## Decision Style

Example:

Frequently asks for guidance.

---

## Communication Style

Example:

Prefers concise explanations.

---

# Failure Mode 1

Learning too quickly.

Wrong:

One click = permanent preference.

---

Correct:

Require repeated evidence.

---

# Failure Mode 2

Ignoring explicit feedback.

Wrong.

Explicit feedback is strongest signal.

---

# Failure Mode 3

Never forgetting.

Wrong.

Preferences evolve.

---

# Failure Mode 4

Treating weak signals as facts.

Wrong.

Confidence scoring required.

---

# Failure Mode 5

Overriding current context.

Wrong.

Current conversation always wins.

---

# Practical Examples

## Example 1

User:

My father loves gardening.

Action:

Create gardening preference.

Confidence:

High.

---

## Example 2

User purchases gardening gifts three times.

Action:

Increase gardening confidence.

---

## Example 3

User repeatedly ignores flowers.

Action:

Reduce flower affinity.

---

## Example 4

User says:

I hate coffee gifts.

Action:

Store dislike.

Confidence:

Very High.

---

## Example 5

User buys books every Father's Day.

Action:

Boost books for future Father's Day recommendations.

---

## Example 6

User repeatedly asks:

Which one should I buy?

Action:

Learn preference for advisor-style guidance.

---

## Example 7

User frequently compares options.

Action:

Learn preference for decision-support mode.

---

# Learning Output Structure

```json
{
  "new_learnings": [],
  "updated_preferences": [],
  "updated_relationships": [],
  "confidence_changes": [],
  "memory_updates": []
}
```

---

# Verification Checklist

Before leaving Learning Engine verify:

✓ Signals collected

✓ Signal confidence evaluated

✓ Memory updated

✓ Relationships updated

✓ Preferences updated

✓ Recommendation performance tracked

✓ Contradictions handled

✓ Current context prioritized

✓ Memory decay applied

✓ Learning stored safely

---

# Final Rule

The Learning Engine exists to answer:

**"What should Kappy know tomorrow that it did not know today?"**

Every conversation should leave Kappy slightly smarter.

Every recommendation should improve future recommendations.

Every relationship should become more understood over time.

A truly intelligent shopping assistant does not just help.

It learns.
