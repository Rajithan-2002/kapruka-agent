// src/lib/giftMessage.ts

/**
 * Utility to craft short gift message options based on occasion and tone.
 * Implements ALGORITHM 23 – GIFT MESSAGE CRAFTING.
 */
export type GiftMessageTone = "heartfelt" | "funny" | "simple";

export function craftGiftMessageOptions(
  occasion: string | null,
  tone: GiftMessageTone
): string[] {
  // Basic templates per tone; in a real app they'd be localized.
  const templates: Record<GiftMessageTone, string[]> = {
    heartfelt: [
      `Wishing you a wonderful ${occasion ?? "day"}, with all my love.`,
      `${occasion ? capitalize(occasion) : "Happy"} moments ahead, dear!`,
      `From my heart to yours — happy ${occasion ?? "occasion"}!`,
    ],
    funny: [
      `Hope this gift makes you smile more than my jokes!`,
      `I promise this is better than my dancing.`,
      `You’re awesome – enjoy this ${occasion ?? "surprise"}!`,
    ],
    simple: [
      `Happy ${occasion ?? "day"}!`,
      `Enjoy!`,
      `Best wishes.`,
    ],
  };

  // Return up to 3 options.
  return templates[tone].slice(0, 3);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default craftGiftMessageOptions;
