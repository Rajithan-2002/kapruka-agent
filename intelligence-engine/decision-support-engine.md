# 09-decision-support-engine.md

# KAPPY DECISION SUPPORT ENGINE V1

## Purpose of This Document

This document defines how Kappy helps users make confident decisions after recommendations have been generated.

Most ecommerce systems stop at:

Products
↓
User Chooses

Kappy should continue:

Products
↓
Decision Support
↓
Confidence Building
↓
Purchase Decision

The purpose of the Decision Support Engine is to answer:

**"How do we help the user choose the best option?"**

Not:

**"How do we show more products?"**

---

# Core Philosophy

Most users do not struggle because they cannot find products.

Most users struggle because:

* They are unsure
* They fear making the wrong decision
* They don't know which option is best
* They don't understand tradeoffs

Kappy should reduce uncertainty.

---

# The Shopping Friend Principle

Imagine shopping with a trusted friend.

You ask:

Which one should I buy?

A good friend does not reply:

Here are 20 more products.

A good friend replies:

I'd choose this one because...

The Decision Support Engine should behave like that friend.

---

# Core Mission

Convert recommendations into decisions.

The engine should:

* Explain recommendations
* Compare options
* Explain tradeoffs
* Reduce uncertainty
* Increase confidence
* Guide final selection

---

# Decision Confidence Framework

Every recommendation session should estimate:

```json id="0hyhse"
{
  "user_confidence": 0.0,
  "decision_complexity": 0.0,
  "decision_risk": 0.0
}
```

---

# User Confidence Levels

## VERY_LOW

Examples:

Which one should I buy?

---

I don't know.

---

Can you choose for me?

---

What do you think?

---

Behavior:

Provide strong guidance.

Recommend one option.

Explain reasoning.

---

## LOW

Examples:

Not sure.

---

Maybe this one?

---

Behavior:

Provide recommendation ranking.

Explain pros and cons.

---

## MEDIUM

Examples:

Comparing options.

---

Need help deciding.

---

Behavior:

Balanced guidance.

---

## HIGH

Examples:

Show me options.

---

I'll decide.

---

Behavior:

Provide information.

Avoid over-guiding.

---

# Decision Complexity

Purpose:

Estimate how difficult the decision is.

---

Low Complexity

Water bottles

Tea

Reorders

Groceries

---

Medium Complexity

Birthday gifts

Gift hampers

Cakes

Flowers

---

High Complexity

Anniversary gifts

Wedding gifts

Relationship repair gifts

Corporate gifting

Luxury purchases

---

Very High Complexity

High-value purchases

Emotionally important gifts

Time-critical gifting

---

# Decision Risk

Purpose:

Estimate consequences of making a bad recommendation.

---

Low Risk

Snacks

Groceries

Routine purchases

---

Medium Risk

Birthday gifts

Teacher gifts

---

High Risk

Anniversary gifts

Wedding gifts

Apology gifts

---

Very High Risk

Relationship recovery

Retirement gifts

Major celebrations

---

# Recommendation Explanation Framework

Every recommendation should answer:

Why this?

Why now?

Why for this recipient?

Why over alternatives?

---

Bad Example

Popular product.

---

Good Example

Recommended because:

* Matches Father's Day
* Fits your budget
* Your father likes gardening
* Available for tomorrow delivery

---

# Comparative Guidance

Purpose:

Help users compare options.

Example:

Option A

Premium Watch

Strengths:

* More premium
* Better presentation

Weaknesses:

* Higher price

---

Option B

Gift Hamper

Strengths:

* More variety
* Lower cost

Weaknesses:

* Less memorable

---

Kappy should explain these tradeoffs.

---

# Recommended Choice Logic

When confidence is high:

Kappy may recommend a specific option.

Example:

Out of these three, I'd personally choose Option 2 because it feels more appropriate for Father's Day and aligns with your father's interests.

---

Rule:

Recommendations should be evidence-based.

Never arbitrary.

---

# Alternative Generation

Purpose:

Prevent recommendation dead-ends.

Example:

User:

I don't like that option.

Bad:

No alternatives.

---

Good:

Alternative A

Alternative B

Alternative C

---

Always provide a path forward.

---

# Tradeoff Explanation Framework

Every major recommendation should explain:

What is gained?

What is sacrificed?

---

Example

Watch

Gain:

More premium

Sacrifice:

Higher cost

---

Gift Hamper

Gain:

More variety

Sacrifice:

Less personal

---

Flowers

Gain:

Strong emotional impact

Sacrifice:

Short lifespan

---

# Constraint Conflict Support

Purpose:

Help users when requirements conflict.

Example:

Budget:

Rs.2000

Delivery:

Tomorrow

Location:

Remote area

---

Bad:

No results.

---

Good:

Nothing can arrive tomorrow within budget.

Alternative Options:

Option A

Increase budget slightly.

Option B

Accept delivery next day.

Option C

Choose available local products.

---

# Overchoice Protection

Purpose:

Prevent overwhelming users.

Bad:

50 recommendations.

---

Good:

Top 3 recommendations.

Explain each clearly.

---

Rule:

Quality > Quantity

---

# User Guidance Styles

## Advisor Mode

Used when confidence is low.

Example:

I'd choose Option 2.

Reason:

Better occasion fit.

---

## Consultant Mode

Used when confidence is medium.

Example:

Here are the tradeoffs.

---

## Explorer Mode

Used when confidence is high.

Example:

Here are your options.

---

# Failure Mode 1

Showing products without explanations.

Wrong.

Users need reasoning.

---

# Failure Mode 2

Too many options.

Wrong.

Decision paralysis.

---

# Failure Mode 3

No tradeoff explanation.

Wrong.

Users cannot compare.

---

# Failure Mode 4

Ignoring user uncertainty.

Wrong.

Treat all users the same.

---

# Failure Mode 5

No alternatives.

Wrong.

Always provide paths forward.

---

# Practical Examples

## Example 1

User:

Which Father's Day gift should I buy?

System:

I'd recommend the gardening gift set because your father enjoys gardening and it fits your budget.

---

## Example 2

User:

Watch or gift hamper?

System:

Watch is more memorable.

Gift hamper provides more variety.

If your goal is appreciation, I'd lean toward the watch.

---

## Example 3

User:

I don't like those recommendations.

System:

Let's try a different direction.

Here are three alternatives.

---

## Example 4

User:

Need anniversary gift.

System:

This is a high-importance occasion.

I'd prioritize thoughtful and personalized gifts over generic options.

---

## Example 5

User:

Need gift under Rs.3000.

System:

This option provides the strongest value while staying within budget.

---

## Example 6

User:

Can you pick one?

System:

Based on everything you've shared, I'd choose Option 2 because it best matches the recipient, occasion, and budget.

---

## Example 7

User:

Nothing here feels right.

System:

Let's adjust the strategy and explore a different recommendation category.

---

# Decision Support Output

```json id="3y0ndx"
{
  "recommended_option": "option_2",
  "confidence": 0.91,
  "reasoning": [
    "occasion_match",
    "recipient_match",
    "budget_match"
  ],
  "tradeoffs": [],
  "alternatives": []
}
```

---

# Verification Checklist

Before leaving Decision Support verify:

✓ Recommendations explained

✓ Tradeoffs explained

✓ Confidence estimated

✓ User uncertainty evaluated

✓ Alternatives available

✓ Overchoice prevented

✓ Recommended option identified

✓ Reasoning generated

✓ Constraint conflicts handled

---

# Final Rule

The Decision Support Engine exists to answer:

**"How do we help the user confidently choose?"**

The Recommendation Engine finds products.

The Decision Support Engine helps people make decisions.

A great recommendation is useless if the user still doesn't know what to buy.
