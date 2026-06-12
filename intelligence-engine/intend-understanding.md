# 02-intent-understanding-engine.md

# KAPPY INTENT UNDERSTANDING ENGINE V1

## Purpose of This Document

This document defines how Kappy determines what the user is actually trying to accomplish before activating any intelligence, recommendation, search, memory, or personalization systems.

Intent Understanding is the first decision point in the Kappy Intelligence Engine.

A mistake at this stage propagates through the entire system.

Incorrect intent classification results in:

* Wrong questions
* Wrong recommendations
* Wrong memories
* Wrong strategy selection
* Poor user experience

Therefore intent classification should prioritize correctness over speed.

---

# Why Intent Understanding Matters

Many ecommerce assistants incorrectly assume:

User Message
↓
Recommendation Request

This assumption is dangerous.

Examples:

User:
Hi

Not shopping.

---

User:
Where is my order?

Not shopping.

---

User:
Do you deliver to Jaffna?

Not shopping.

---

User:
My package is late.

Not shopping.

---

User:
Need a Father's Day gift.

Shopping.

The system must identify these differences before proceeding.

---

# Intent Classification Architecture

Every user message must first pass through:

User Message
↓
Intent Understanding Engine
↓
Intent Confidence Scoring
↓
Intent Decision
↓
Next System

No recommendation logic should execute before intent determination.

---

# Supported Intent Types

## SHOPPING

Definition:

User wants to discover, evaluate, compare, or purchase products.

Examples:

Need a gift for my father.

---

Show me birthday gifts.

---

Looking for a watch.

---

Need flowers for my wife.

---

Need something under Rs.5000.

Action:

Activate Intelligence Engine.

---

## GIFTING

Definition:

Shopping specifically focused on another recipient.

Examples:

Need Father's Day gift.

---

Need something for my teacher.

---

My girlfriend's birthday is tomorrow.

---

Need anniversary present.

---

Need farewell gift.

Action:

Activate Intelligence Engine with Gifting Mode.

---

## REORDER

Definition:

User wants to repurchase previously purchased items.

Examples:

Need water bottles again.

---

Order the same cake.

---

Get me the same flowers as last time.

---

Need my usual tea.

---

Reorder last month's groceries.

Action:

Activate Reorder Strategy.

Bypass most discovery workflows.

---

## BROWSING

Definition:

User wants to explore.

No immediate purchase intent.

Examples:

Show trending gifts.

---

What's popular this week?

---

Show electronics.

---

Show categories.

---

What can I buy under Rs.10000?

Action:

Activate Discovery Mode.

---

## DELIVERY_QUERY

Definition:

User is asking about delivery capabilities.

Examples:

Do you deliver to Jaffna?

---

Can this arrive tomorrow?

---

Do you deliver on Sundays?

---

How long does delivery take?

---

Can I send this overseas?

Action:

Activate Delivery Information Flow.

Do not activate recommendations.

---

## ORDER_TRACKING

Definition:

User wants order status.

Examples:

Where is my order?

---

Track my package.

---

Has my cake shipped?

---

When will my order arrive?

---

Order status please.

Action:

Activate Tracking System.

---

## COMPLAINT

Definition:

User is unhappy.

Examples:

My order is late.

---

Wrong item received.

---

Delivery was terrible.

---

This is frustrating.

---

Your recommendation was bad.

Action:

Activate Support Flow.

Never recommend products.

Solve complaint first.

---

## SMALL_TALK

Definition:

Social interaction.

Examples:

Hi

---

Hello

---

Good morning

---

How are you?

---

What's up?

Action:

Respond naturally.

No recommendation activity.

---

## FEEDBACK

Definition:

User is discussing system quality.

Examples:

That recommendation was useful.

---

I didn't like those suggestions.

---

You misunderstood me.

---

Good job.

---

That was accurate.

Action:

Send signal to Learning Engine.

---

## UNKNOWN

Definition:

Intent cannot be determined confidently.

Examples:

Need something.

---

Help me.

---

Can you assist?

---

I don't know.

---

Maybe.

Action:

Clarification required.

---

# Intent Confidence Framework

Every intent receives a confidence score.

Example:

User:
Need something for him.

Possible intents:

Shopping = 0.85

Gifting = 0.82

Unknown Recipient = High

Result:

Intent accepted.

Context incomplete.

Proceed to Missing Information Detector.

---

Example:

User:
Maybe I need help.

Shopping = 0.25

Complaint = 0.30

Unknown = 0.45

Result:

Ask clarification.

Do not continue.

---

# Confidence Thresholds

## High Confidence

Confidence ≥ 0.80

Proceed automatically.

---

## Medium Confidence

0.60 - 0.79

Proceed cautiously.

Monitor for clarification opportunities.

---

## Low Confidence

Below 0.60

Do not assume.

Ask clarifying question.

---

# Intent Routing Table

| Intent         | Route                |
| -------------- | -------------------- |
| SHOPPING       | Intelligence Engine  |
| GIFTING        | Intelligence Engine  |
| REORDER        | Reorder Strategy     |
| BROWSING       | Discovery Mode       |
| DELIVERY_QUERY | Delivery Flow        |
| ORDER_TRACKING | Tracking Flow        |
| COMPLAINT      | Support Flow         |
| SMALL_TALK     | Conversational Layer |
| FEEDBACK       | Learning Engine      |
| UNKNOWN        | Clarification Flow   |

---

# Common Intent Classification Failures

## Failure 1

User:

Where is my order?

Wrong:

Show products.

Correct:

Track order.

---

## Failure 2

User:

Hi

Wrong:

How can I help you shop today?

Correct:

Greeting response.

---

## Failure 3

User:

My order arrived damaged.

Wrong:

Recommend products.

Correct:

Support workflow.

---

## Failure 4

User:

Need something for my dad.

Wrong:

Treat as generic search.

Correct:

Gifting workflow.

---

## Failure 5

User:

Order the same cake again.

Wrong:

Discovery workflow.

Correct:

Reorder workflow.

---

# Practical Examples

## Example 1

User:

Need Father's Day gift.

Intent:

GIFTING

Confidence:

0.98

Route:

Intelligence Engine

---

## Example 2

User:

Need water bottles again.

Intent:

REORDER

Confidence:

0.97

Route:

Reorder Strategy

---

## Example 3

User:

Do you deliver to Kandy?

Intent:

DELIVERY_QUERY

Confidence:

0.99

Route:

Delivery Flow

---

## Example 4

User:

My package is late.

Intent:

COMPLAINT

Confidence:

0.96

Route:

Support Flow

---

## Example 5

User:

Hello Kappy.

Intent:

SMALL_TALK

Confidence:

0.99

Route:

Conversation Layer

---

# Verification Checklist

Before leaving the Intent Understanding Engine verify:

✓ Intent identified

✓ Confidence calculated

✓ Correct route selected

✓ Recommendation engine not triggered unnecessarily

✓ Clarification requested when required

✓ User goal understood at high level

---

# Final Rule

The Intent Understanding Engine exists to answer one question:

"What is the user trying to accomplish right now?"

Until that question is answered with sufficient confidence, no recommendation, search, ranking, personalization, or memory logic should execute.
