# 16-intelligence-engine-evaluation-and-testing-framework.md

# KAPPY INTELLIGENCE ENGINE EVALUATION & TESTING FRAMEWORK V1

## Purpose of This Document

This document defines how Kappy Intelligence Engine performance is measured, validated, tested, benchmarked, and continuously improved.

The purpose of this framework is to answer:

```text
How do we know Kappy is actually intelligent?
```

not

```text
How do we know the code runs?
```

A functioning system is not necessarily an intelligent system.

The Intelligence Engine must be evaluated continuously.

---

# Core Philosophy

Every intelligence decision should be measurable.

Every recommendation should be testable.

Every reasoning step should be auditable.

Every improvement should be verifiable.

---

# Evaluation Layers

Kappy Intelligence Engine should be evaluated at 6 levels.

```text
Level 1
Intent Understanding

Level 2
Situation Analysis

Level 3
Strategy Selection

Level 4
Recommendation Planning

Level 5
Recommendation Quality

Level 6
Decision Support Quality
```

Failure at any level impacts everything downstream.

---

# LEVEL 1

# Intent Understanding Accuracy

Purpose:

Measure whether Kappy correctly understands user intent.

---

Example

User:

Need Father's Day gift.

Expected:

```json
{
  "intent": "GIFTING"
}
```

---

Example

User:

Where is my order?

Expected:

```json
{
  "intent": "TRACKING"
}
```

---

Metric

```text
Intent Accuracy %

Correct Intents
÷
Total Tests
```

---

Target

```text
95%+
```

Minimum

```text
90%
```

---

# LEVEL 2

# Situation Understanding Accuracy

Purpose:

Measure extraction quality.

---

Attributes Tested

```text
Recipient

Occasion

Budget

Urgency

Location

Delivery Date

Shopping Goal
```

---

Example

User:

Need Father's Day gift under Rs.5000.

Expected:

```json
{
  "recipient":"father",
  "occasion":"fathers_day",
  "budget":5000
}
```

---

Metric

```text
Correct Fields
÷
Expected Fields
```

---

Target

```text
95%+
```

---

# LEVEL 3

# Missing Information Accuracy

Purpose:

Measure whether Kappy asks the correct next question.

---

Example

User:

Need gift.

Expected:

```text
Who are we shopping for?
```

---

Wrong

```text
What's your budget?
```

---

Metric

```text
Correct Clarification Question %
```

---

Target

```text
90%+
```

---

# LEVEL 4

# Psychology Detection Accuracy

Purpose:

Measure emotional understanding.

---

Example

User:

Forgot anniversary tomorrow.

Expected:

```json
{
  "trigger":"guilt",
  "secondary":"urgency"
}
```

---

Example

User:

Need something for mom.

Expected:

```json
{
  "trigger":"appreciation"
}
```

---

Metric

```text
Psychology Accuracy %
```

---

Target

```text
85%+
```

Psychology is inherently less deterministic.

---

# LEVEL 5

# Strategy Selection Accuracy

Purpose:

Measure whether correct strategy is selected.

---

Example

User:

Need Father's Day gift.

Expected:

```text
APPRECIATION_STRATEGY
```

---

Example

User:

Need water bottles again.

Expected:

```text
REORDER_STRATEGY
```

---

Metric

```text
Strategy Accuracy %
```

---

Target

```text
95%+
```

---

# LEVEL 6

# Recommendation Quality Score

Purpose:

Measure recommendation relevance.

---

Human evaluators score:

```text
Occasion Fit

Recipient Fit

Budget Fit

Common Sense

Deliverability

Personalization
```

---

Scale

```text
1–10
```

---

Final Metric

```text
Average Recommendation Score
```

---

Target

```text
8.5+/10
```

---

# Common Sense Benchmark

Purpose:

Prevent absurd recommendations.

---

Test Cases

Father's Day

Teacher Gift

Manager Gift

Wedding Gift

Funeral Flowers

Apology Gift

Birthday Gift

Corporate Gift

---

Example

Father's Day

Wrong:

Adult Product

ICT Textbook

Women's Makeup

---

Correct:

Watch

Gift Hamper

Gardening Set

---

Metric

```text
Common Sense Pass Rate
```

---

Target

```text
99%
```

---

# Hard Filter Benchmark

Purpose:

Verify prohibited items never survive.

---

Tests

Adult Products

Erotic Wellness

Sex Toys

Illegal Products

Undeliverable Products

Out-of-Stock Products

---

Expected

```text
100% rejection
```

---

Target

```text
100%
```

Non-negotiable.

---

# Relationship Intelligence Benchmark

Purpose:

Verify memory usage quality.

---

Example

Memory

```json
{
 "interest":"gardening"
}
```

---

Request

Father's Day gift

---

Expected

Gardening recommendations boosted.

---

Metric

```text
Memory Utilization Score
```

---

Target

```text
85%+
```

---

# Memory Safety Benchmark

Purpose:

Ensure memory never overrides reality.

---

Example

Memory:

Likes books

Current Request:

Need headphones

---

Expected

Current request wins.

---

Metric

```text
Memory Override Failure Rate
```

---

Target

```text
<1%
```

---

# Recommendation Diversity Benchmark

Purpose:

Avoid clone recommendations.

---

Bad

```text
Watch
Watch
Watch
```

---

Good

```text
Watch
Gift Hamper
Coffee Set
```

---

Metric

```text
Category Diversity Score
```

---

Target

```text
80%+
```

---

# Delivery Accuracy Benchmark

Purpose:

Prevent impossible recommendations.

---

Example

Need tomorrow delivery.

Product arrives next week.

---

Expected

Rejected.

---

Target

```text
100%
```

---

# Decision Support Benchmark

Purpose:

Measure advisory quality.

---

Evaluation

Can Kappy explain:

Why recommended?

Why not alternatives?

Tradeoffs?

Best option?

---

Target

```text
90%+
```

---

# Confidence Building Benchmark

Purpose:

Measure reassurance quality.

---

Can Kappy:

Reduce uncertainty?

Provide evidence?

Avoid overconfidence?

---

Target

```text
85%+
```

---

# End-To-End User Success Score

Most Important Metric.

Formula:

```text
Situation Understanding

+
Recommendation Relevance

+
Decision Confidence

+
User Satisfaction

=
User Success Score
```

---

Target

```text
90%+
```

---

# Judge Evaluation Suite

Mandatory Demo Scenarios

1. Father's Day Gift

2. Anniversary Forgotten

3. Teacher Appreciation

4. Corporate Gift

5. Reorder Water Bottles

6. Budget Rs.2000

7. Same Day Delivery

8. Mother's Birthday

9. Apology Gift

10. Unknown Recipient

---

Every release must pass all scenarios.

---

# Regression Testing Framework

Every failure from:

```text
12-failure-modes-and-anti-patterns.md
```

must become a test.

---

Example

Failure:

Teacher Gift → Romantic Bundle

Test:

Must Fail

---

Example

Failure:

Father's Day → Adult Product

Test:

Must Fail

---

# Release Gate

Before deployment:

Must satisfy:

Intent Accuracy ≥ 95%

Situation Accuracy ≥ 95%

Strategy Accuracy ≥ 95%

Recommendation Score ≥ 8.5/10

Common Sense ≥ 99%

Hard Filter = 100%

User Success ≥ 90%

---

If any fail:

Release blocked.

---

# Final Rule

The Intelligence Engine should never be evaluated by:

```text
Does it work?
```

It should be evaluated by:

```text
How often does it make the right decision?
```

Intelligence without measurement is opinion.

Intelligence with measurement becomes engineering.
