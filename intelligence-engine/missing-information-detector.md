# 04-missing-information-detector.md

# KAPPY MISSING INFORMATION DETECTOR V1

## Purpose of This Document

This document defines how Kappy identifies missing information before recommendations begin.

The Missing Information Detector is one of the most important components in the Intelligence Engine.

Its primary responsibility is preventing premature recommendations.

Most recommendation systems fail because they recommend too early.

This module prevents that failure.

---

# Core Mission

The purpose of this engine is to answer:

"Do we know enough to make a good recommendation?"

If the answer is:

NO

The system must gather information before continuing.

---

# Why This Engine Exists

Bad Recommendation Systems:

User:
Need gift

System:
Shows products

---

Good Recommendation Systems:

User:
Need gift

System:
Who are we shopping for?

The difference is information quality.

---

# Golden Rule

Never search products when critical information is missing.

Always collect the minimum required context first.

---

# Recommendation Readiness Framework

Before recommendations begin, Kappy should evaluate:

```json
{
  "recipient": null,
  "occasion": null,
  "budget": null,
  "delivery_context": null,
  "confidence": 0
}
```

The detector determines whether recommendation readiness has been achieved.

---

# Recommendation Readiness States

## READY

Enough information exists.

Recommendations may proceed.

Example:

Need Father's Day gift under Rs.5000 for delivery tomorrow.

Known:

Recipient ✓

Occasion ✓

Budget ✓

Delivery ✓

Status:

READY

---

## PARTIALLY_READY

Some information exists.

More information required.

Example:

Need Father's Day gift.

Known:

Recipient ✓

Occasion ✓

Budget ✗

Status:

PARTIALLY_READY

Ask:

What's your budget?

---

## NOT_READY

Insufficient information.

Recommendations blocked.

Example:

Need gift.

Known:

Nothing meaningful.

Status:

NOT_READY

Ask:

Who are we shopping for?

---

# Information Priority Framework

Not all missing information is equally important.

The detector must prioritize.

---

Priority 1

Recipient

Without recipient:

Recommendations are unreliable.

---

Priority 2

Occasion

Without occasion:

Recommendations are generic.

---

Priority 3

Budget

Without budget:

Recommendations may be irrelevant.

---

Priority 4

Delivery Constraints

Without delivery constraints:

Recommendations may be impossible.

---

Priority 5

Preferences

Helpful but optional.

---

# Question Selection Rule

Never ask multiple questions simultaneously.

Bad:

Who is it for?
What's your budget?
When do you need it?
Where are you delivering?

---

Good:

Ask only the highest-value missing question.

Example:

Need gift.

Ask:

Who are we shopping for?

Wait.

---

After answer:

My father.

Ask:

What's the occasion?

Wait.

---

After answer:

Father's Day.

Ask:

What's your budget?

This feels natural.

---

# Missing Information Categories

## Recipient Missing

Example:

Need gift.

Missing:

Recipient

Question:

Who are we shopping for?

---

Example:

Need something special.

Missing:

Recipient

Question:

Who is this for?

---

Example:

Need flowers.

Missing:

Recipient

Question:

Who are the flowers for?

---

# Occasion Missing

Example:

Need gift for my father.

Missing:

Occasion

Question:

What's the occasion?

---

Example:

Need something for my wife.

Missing:

Occasion

Question:

What are we celebrating?

---

Example:

Need flowers for my girlfriend.

Missing:

Occasion

Question:

Is this for a birthday, anniversary, apology, or something else?

---

# Budget Missing

Example:

Need Father's Day gift.

Missing:

Budget

Question:

What's your budget?

---

Example:

Need anniversary gift.

Missing:

Budget

Question:

How much would you like to spend?

---

Example:

Need something premium.

Missing:

Actual spending range.

Question:

Do you have a budget range in mind?

---

# Delivery Missing

Example:

Need cake tomorrow.

Missing:

Location

Question:

Which city should we deliver to?

---

Example:

Need flowers urgently.

Missing:

Location and deadline.

Question:

Where should the flowers be delivered?

---

# Preference Missing

Example:

Need gift for father.

Known:

Father

Birthday

Budget

Unknown:

Preferences

Question:

What does he enjoy?

Only ask if recommendation quality benefits significantly.

---

# Smart Question Selection

The detector should always ask the question that provides the highest recommendation improvement.

---

Example 1

Input:

Need gift.

Missing:

Recipient

Occasion

Budget

Question:

Who are we shopping for?

Not:

What's your budget?

---

Example 2

Input:

Need Father's Day gift.

Missing:

Budget

Question:

What's your budget?

---

Example 3

Input:

Need gift for father under Rs.5000.

Missing:

Occasion

Question:

What's the occasion?

---

# Question Necessity Test

Before asking a question:

Ask:

Will this answer meaningfully improve recommendations?

If NO:

Don't ask.

---

Example

Need Father's Day gift under Rs.5000.

Known:

Recipient

Occasion

Budget

Question:

What's your favorite color?

Unnecessary.

Do not ask.

---

# Clarification Confidence Framework

If confidence falls below threshold:

Clarify.

---

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

Clarification mandatory.

---

Example

Need something for him.

Recipient Confidence:

0.40

Action:

Clarify.

Do not recommend.

---

# Failure Mode 1

Premature Recommendations

User:

Need gift.

Wrong:

Recommend products.

Correct:

Ask recipient.

---

# Failure Mode 2

Asking Too Many Questions

Wrong:

Ask 5 questions simultaneously.

Correct:

Ask one question at a time.

---

# Failure Mode 3

Asking Low-Value Questions

Wrong:

Favorite color?

Before knowing recipient.

Correct:

Ask recipient first.

---

# Failure Mode 4

Ignoring Missing Information

User:

Need something for him.

Wrong:

Assume father.

Correct:

Clarify recipient.

---

# Failure Mode 5

Infinite Question Loops

Wrong:

Keep asking.

Correct:

Collect minimum viable context.

Then recommend.

---

# Minimum Viable Recommendation Context

For gifting:

Required:

Recipient

Occasion

Budget

Recommended:

Delivery

Preferences

---

For reordering:

Required:

Previous purchase

Recommended:

Delivery

---

For browsing:

Required:

Category

Budget (optional)

---

# Practical Examples

## Example 1

User:

Need gift.

Missing:

Recipient

Occasion

Budget

Question:

Who are we shopping for?

---

## Example 2

User:

Need something for dad.

Missing:

Occasion

Budget

Question:

What's the occasion?

---

## Example 3

User:

Need Father's Day gift.

Missing:

Budget

Question:

What's your budget?

---

## Example 4

User:

Need cake tomorrow.

Missing:

Location

Question:

Which city should we deliver to?

---

## Example 5

User:

Need anniversary gift under Rs.10000.

Missing:

Nothing critical.

Status:

READY

Proceed to Strategy Selection.

---

# Output Structure

```json
{
  "recommendationReadiness": false,
  "missingFields": [
    "recipient",
    "occasion"
  ],
  "nextQuestion": "Who are we shopping for?"
}
```

OR

```json
{
  "recommendationReadiness": true,
  "missingFields": [],
  "nextQuestion": null
}
```

---

# Verification Checklist

Before leaving this engine verify:

✓ Missing fields identified

✓ Information priority calculated

✓ Highest-value question selected

✓ Recommendation readiness calculated

✓ Confidence evaluated

✓ No unnecessary questions generated

✓ No premature recommendation allowed

---

# Final Rule

The Missing Information Detector exists to answer:

"Do we know enough to help the user properly?"

If the answer is no:

Ask.

If the answer is yes:

Proceed.

Recommendations should never compensate for missing understanding.
