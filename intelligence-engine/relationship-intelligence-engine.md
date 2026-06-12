# 06-relationship-intelligence-engine.md

# KAPPY RELATIONSHIP INTELLIGENCE ENGINE V1

## Purpose of This Document

This document defines how Kappy understands, stores, updates, and utilizes relationship knowledge to improve recommendation quality.

Most recommendation systems understand:

* Product
* Category
* Budget

Some systems understand:

* User preferences

Very few systems understand:

* Relationships

The Relationship Intelligence Engine exists to answer:

**"Who is this person really?"**

not

**"What relationship label was mentioned?"**

---

# Core Philosophy

Most systems think:

```text id="b38d4d"
Mother
↓
Recommend generic mother gifts
```

Kappy must think:

```text id="yqkk8g"
Mother
↓
Likes Gardening
↓
Loves Tea
↓
Dislikes Flowers
↓
Received Tea Hamper Last Year
↓
Recommend Premium Gardening Set
```

The difference is personalization.

---

# Golden Rule

Never treat recipients as categories.

Treat recipients as individuals.

Bad:

```text id="xybr2p"
Mother
↓
Flowers
```

Good:

```text id="9h8wkp"
Mother
↓
Known Preferences
↓
Relationship History
↓
Recommendation
```

---

# Relationship Profile Model

Every important recipient should have a relationship profile.

Example:

```json id="d7ehl5"
{
  "relationship_id": "mother",
  "name": "Mom",
  "relationship_type": "mother",
  "importance": "very_high",
  "interests": [
    "gardening",
    "tea"
  ],
  "dislikes": [
    "perfume"
  ],
  "past_gifts": [],
  "successful_gifts": [],
  "failed_gifts": [],
  "special_dates": [],
  "gift_history": [],
  "notes": []
}
```

---

# Relationship Types

Supported Relationships:

Mother

Father

Wife

Husband

Girlfriend

Boyfriend

Child

Teacher

Manager

Employee

Friend

Best Friend

Client

Grandmother

Grandfather

Brother

Sister

Other

---

# Relationship Importance

Purpose:

Estimate emotional significance.

Levels:

VERY_HIGH

HIGH

MEDIUM

LOW

---

Examples

Mother

VERY_HIGH

---

Father

VERY_HIGH

---

Wife

VERY_HIGH

---

Manager

MEDIUM

---

Client

MEDIUM

---

Casual Friend

LOW

---

Importance affects:

* Recommendation quality requirements
* Personalization depth
* Clarification thresholds
* Risk tolerance

---

# Relationship Memory Sources

The engine may learn from:

Purchases

Recommendations

Conversations

Preferences

Rejections

Feedback

Special occasions

User corrections

---

Example

User:

Mom loves gardening.

Store:

```json id="0eqj7m"
{
  "interest": "gardening"
}
```

---

Example

User:

Dad hates coffee.

Store:

```json id="j7a4q8"
{
  "dislike": "coffee"
}
```

---

# Interest Tracking

Purpose:

Understand recipient preferences.

Examples:

Gardening

Cooking

Technology

Gaming

Tea

Coffee

Travel

Books

Fitness

Fashion

Music

Art

Photography

Sports

Pets

Home Decor

---

Example

User:

My father loves cricket.

Store:

```json id="tzj7r6"
{
  "interest": "cricket"
}
```

Future recommendations should reflect this.

---

# Dislike Tracking

Purpose:

Avoid bad recommendations.

Examples:

Perfume

Flowers

Chocolate

Coffee

Jewelry

Alcohol

Specific Brands

---

Example

User:

Mom doesn't like flowers.

Store:

```json id="fcu6h7"
{
  "dislike": "flowers"
}
```

Future flower recommendations should receive heavy penalties.

---

# Gift History Tracking

Purpose:

Avoid repetition.

Bad Example:

2025:
Tea Hamper

2026:
Tea Hamper

2027:
Tea Hamper

---

Good Example:

2025:
Tea Hamper

2026:
Gardening Kit

2027:
Premium Tea Collection

The system should seek variety.

---

# Successful Gift Tracking

Purpose:

Learn what worked.

Examples:

Purchased

Positive Feedback

Repeat Purchases

Explicit Praise

---

Example

User:

Mom loved the gardening kit.

Store:

```json id="wykhhk"
{
  "successful_gift": "gardening_kit"
}
```

Future gardening-related gifts receive positive boosts.

---

# Failed Gift Tracking

Purpose:

Learn what did not work.

Examples:

Ignored

Rejected

Negative Feedback

---

Example

User:

Dad didn't like the coffee set.

Store:

```json id="rw0kio"
{
  "failed_gift": "coffee_set"
}
```

Future similar recommendations should be penalized.

---

# Special Date Memory

Purpose:

Reduce user effort.

Store:

Birthdays

Anniversaries

Retirements

Important Milestones

---

Example

```json id="hmm6vl"
{
  "recipient": "mother",
  "birthday": "May 10"
}
```

Future proactive assistance becomes possible.

---

# Relationship Confidence

Not all relationship data is equally reliable.

Every fact should have confidence.

Example:

```json id="gtmfpz"
{
  "interest": "gardening",
  "confidence": 0.95
}
```

---

High Confidence

Explicitly stated by user.

---

Medium Confidence

Observed multiple times.

---

Low Confidence

Single weak signal.

---

# Relationship Profile Evolution

Profiles should evolve.

Example:

Year 1

```json id="tmz3wg"
{
  "interests": ["tea"]
}
```

Year 2

```json id="tt2h31"
{
  "interests": [
    "tea",
    "gardening"
  ]
}
```

Year 3

```json id="5g6a9q"
{
  "interests": [
    "tea",
    "gardening",
    "travel"
  ]
}
```

The profile should become richer over time.

---

# Memory Usage Rules

Relationship memory should:

Influence recommendations.

Not override reality.

---

Example

Memory:

Dad likes books.

Current User Request:

Dad wants headphones.

Do not force books.

Current context wins.

Memory assists.

Memory does not control.

---

# Failure Mode 1

Treating all mothers the same.

Wrong.

Every mother is different.

---

# Failure Mode 2

Ignoring relationship memory.

Wrong.

Known preferences should influence recommendations.

---

# Failure Mode 3

Repeating gifts forever.

Wrong.

Use gift history.

---

# Failure Mode 4

Assuming preferences permanently.

People change.

Profiles must evolve.

---

# Failure Mode 5

Overriding current requests.

Current context is more important than old memory.

---

# Practical Examples

## Example 1

User:

Need gift for mom.

Memory:

Gardening

Tea

Result:

Boost:

Gardening gifts

Tea hampers

Garden decor

---

## Example 2

User:

Need Father's Day gift.

Memory:

Father likes cricket.

Result:

Boost:

Cricket merchandise

Sports gifts

---

## Example 3

User:

Need gift for wife.

Memory:

Dislikes perfume.

Result:

Penalize perfume.

---

## Example 4

User:

Need anniversary gift.

Memory:

Previous jewelry gift was successful.

Result:

Jewelry receives positive boost.

---

## Example 5

User:

Need something for manager.

No profile exists.

Result:

Create new relationship profile.

Proceed normally.

---

# Relationship Intelligence Output

```json id="4ewodv"
{
  "relationship_type": "mother",
  "importance": "very_high",
  "known_interests": [
    "gardening",
    "tea"
  ],
  "known_dislikes": [
    "perfume"
  ],
  "successful_gifts": [
    "gardening_kit"
  ],
  "failed_gifts": [],
  "confidence": 0.92
}
```

---

# Verification Checklist

Before exiting Relationship Intelligence verify:

✓ Relationship identified

✓ Importance assigned

✓ Known interests loaded

✓ Known dislikes loaded

✓ Gift history loaded

✓ Successful gifts loaded

✓ Failed gifts loaded

✓ Confidence calculated

✓ Memory integrated

✓ Current context prioritized

---

# Final Rule

The Relationship Intelligence Engine exists to answer:

**"What do we know about this person?"**

Not:

**"What relationship category do they belong to?"**

The better Kappy understands the recipient, the more personal, relevant, and thoughtful recommendations become.

Relationships are not labels.

Relationships are people.
