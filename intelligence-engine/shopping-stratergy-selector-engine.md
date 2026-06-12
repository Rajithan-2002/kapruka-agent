# 07-shopping-strategy-selector.md

# KAPPY SHOPPING STRATEGY SELECTOR V1

## Purpose of This Document

This document defines how Kappy determines the optimal shopping strategy before recommendations begin.

Most recommendation systems assume:

User
↓
Products

Kappy must think:

User
↓
Situation
↓
Goal
↓
Strategy
↓
Products

The purpose of the Shopping Strategy Selector is to answer:

**"How should Kappy help in this situation?"**

not

**"What products should Kappy recommend?"**

---

# Core Philosophy

Two users may request identical products.

But require completely different assistance.

Example:

User A:

Need flowers.

Reason:

Anniversary.

Strategy:

Romantic Celebration.

---

User B:

Need flowers.

Reason:

Funeral.

Strategy:

Sympathy Support.

---

User C:

Need flowers.

Reason:

Apology.

Strategy:

Relationship Repair.

---

The product category is identical.

The shopping strategy is completely different.

Therefore strategy selection must happen before recommendations.

---

# Golden Rule

Recommendations should follow strategy.

Strategy should never follow recommendations.

Wrong:

Products
↓
Strategy

Correct:

Strategy
↓
Products

---

# Strategy Selection Inputs

The Strategy Selector receives:

```json
{
  "intent": {},
  "situation": {},
  "psychology": {},
  "relationship": {},
  "missing_information": {}
}
```

It then determines:

```json
{
  "selected_strategy": "",
  "strategy_confidence": 0.0,
  "reasoning": []
}
```

---

# Supported Shopping Strategies

## STRATEGY 1

### GUIDED_GIFTING

Purpose:

Help users find appropriate gifts.

Used When:

* Birthday
* Father's Day
* Mother's Day
* Teacher Gifts
* Farewell Gifts

Examples:

Need Father's Day gift.

---

Need birthday gift for wife.

---

Need something for my teacher.

---

Behavior:

Ask missing questions.

Understand recipient.

Recommend thoughtfully.

Explain recommendations.

---

# STRATEGY 2

### RELATIONSHIP_REPAIR

Purpose:

Repair emotional damage.

Used When:

* Arguments
* Forgotten occasions
* Apologies

Examples:

My girlfriend is angry.

---

Forgot anniversary.

---

Need apology gift.

---

Behavior:

Prioritize emotional impact.

Prioritize speed.

Avoid generic recommendations.

Recommend meaningful recovery options.

---

# STRATEGY 3

### CELEBRATION_PLANNING

Purpose:

Create memorable celebrations.

Used When:

* Birthdays
* Weddings
* Graduations
* Promotions

Examples:

Need cake for birthday.

---

Need graduation surprise.

---

Planning anniversary dinner.

---

Behavior:

Focus on experience.

Focus on emotional value.

Suggest complementary products.

---

# STRATEGY 4

### APPRECIATION_STRATEGY

Purpose:

Express gratitude.

Used When:

* Mother's Day
* Father's Day
* Teacher Appreciation
* Thank You Gifts

Examples:

Need gift for mom.

---

Need something for my mentor.

---

Need thank-you gift.

---

Behavior:

Focus on thoughtfulness.

Avoid generic products.

Use relationship memory heavily.

---

# STRATEGY 5

### REORDER_STRATEGY

Purpose:

Reduce effort.

Used When:

Repeat purchases.

Examples:

Need water bottles again.

---

Order same cake.

---

Need tea again.

---

Behavior:

Minimize conversation.

Use purchase history.

Prioritize convenience.

---

# STRATEGY 6

### DISCOVERY_STRATEGY

Purpose:

Explore options.

Used When:

Browsing.

Examples:

Show trending gifts.

---

What is popular?

---

Show electronics.

---

Behavior:

Show variety.

Educate user.

Allow exploration.

---

# STRATEGY 7

### BUDGET_OPTIMIZATION

Purpose:

Maximize value.

Used When:

Budget is primary constraint.

Examples:

Need best gift under Rs.3000.

---

Need cheap birthday gift.

---

Budget only Rs.2000.

---

Behavior:

Prioritize value.

Avoid unnecessary premium products.

Focus on impact per rupee.

---

# STRATEGY 8

### LAST_MINUTE_RESCUE

Purpose:

Solve urgent situations.

Used When:

Critical urgency detected.

Examples:

Birthday tomorrow.

---

Forgot anniversary.

---

Need same-day delivery.

---

Behavior:

Prioritize availability.

Prioritize delivery.

Reduce unnecessary choices.

Focus on successful execution.

---

# STRATEGY 9

### PROFESSIONAL_GIFTING

Purpose:

Corporate gifting situations.

Used When:

Managers

Employees

Clients

Corporate events

Examples:

Need gift for client.

---

Need farewell gift for manager.

---

Need employee appreciation gift.

---

Behavior:

Professional recommendations.

Avoid inappropriate products.

Maintain professional boundaries.

---

# Strategy Selection Logic

Example:

```json
{
  "occasion": "birthday",
  "recipient": "wife",
  "urgency": "normal"
}
```

Selected Strategy:

```json
{
  "strategy": "GUIDED_GIFTING"
}
```

---

Example:

```json
{
  "occasion": "anniversary",
  "urgency": "critical",
  "psychology": "guilt"
}
```

Selected Strategy:

```json
{
  "strategy": "RELATIONSHIP_REPAIR"
}
```

---

Example:

```json
{
  "intent": "reorder"
}
```

Selected Strategy:

```json
{
  "strategy": "REORDER_STRATEGY"
}
```

---

# Strategy Priority Framework

Sometimes multiple strategies are possible.

Example:

Forgot anniversary tomorrow.

Possible:

Relationship Repair

Last Minute Rescue

Rule:

Select primary and secondary strategy.

Example:

```json
{
  "primary_strategy": "RELATIONSHIP_REPAIR",
  "secondary_strategy": "LAST_MINUTE_RESCUE"
}
```

---

# Strategy Confidence

Every strategy receives confidence.

High:

0.85+

---

Medium:

0.60-0.84

---

Low:

Below 0.60

Requires clarification.

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

Clarify.

---

# Failure Mode 1

Treating every gift the same.

Wrong.

Birthday gift ≠ apology gift.

---

# Failure Mode 2

Ignoring urgency.

Forgot anniversary.

Wrong:

Normal gift strategy.

Correct:

Last-minute rescue strategy.

---

# Failure Mode 3

Ignoring relationship type.

Manager gift.

Wrong:

Romantic recommendations.

Correct:

Professional gifting.

---

# Failure Mode 4

Ignoring budget goals.

Budget Rs.2000.

Wrong:

Premium recommendations.

Correct:

Budget optimization.

---

# Failure Mode 5

Using discovery flow for reorders.

Wrong:

Show hundreds of products.

Correct:

Suggest previous purchase.

---

# Practical Examples

## Example 1

User:

Need Father's Day gift.

Strategy:

APPRECIATION_STRATEGY

---

## Example 2

User:

Forgot anniversary tomorrow.

Strategy:

RELATIONSHIP_REPAIR

Secondary:

LAST_MINUTE_RESCUE

---

## Example 3

User:

Need water bottles again.

Strategy:

REORDER_STRATEGY

---

## Example 4

User:

Need gift under Rs.3000.

Strategy:

BUDGET_OPTIMIZATION

---

## Example 5

User:

Need gift for my manager.

Strategy:

PROFESSIONAL_GIFTING

---

## Example 6

User:

Show trending gifts.

Strategy:

DISCOVERY_STRATEGY

---

## Example 7

User:

Need graduation surprise.

Strategy:

CELEBRATION_PLANNING

---

## Example 8

User:

Need thank-you gift for teacher.

Strategy:

APPRECIATION_STRATEGY

---

# Output Structure

```json
{
  "primary_strategy": "APPRECIATION_STRATEGY",
  "secondary_strategy": null,
  "confidence": 0.94,
  "reasoning": [
    "recipient_is_father",
    "occasion_is_fathers_day",
    "goal_is_appreciation"
  ]
}
```

---

# Verification Checklist

Before exiting Strategy Selector verify:

✓ Strategy selected

✓ Confidence calculated

✓ Reasoning generated

✓ Primary strategy assigned

✓ Secondary strategy assigned if needed

✓ Strategy aligns with psychology

✓ Strategy aligns with situation

✓ Strategy aligns with recipient

✓ Strategy aligns with urgency

---

# Final Rule

The Shopping Strategy Selector exists to answer:

**"What kind of help does this user actually need?"**

Not:

**"What products should we show?"**

Products are recommendations.

Strategies are decisions.

Kappy should decide on the strategy before it decides on the products.
