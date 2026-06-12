import { BehaviorProfile } from "../../services/behaviorProfileService";
import { UserProfile } from "../../db";

export interface NormalizedUserContext {
  userProfile: {
    primary_language: string;
    communication_style: string;
    average_budget: number;
  };
  behaviorProfile: {
    user_id: string;
    favorite_categories: string[];
    favorite_price_range: { min: number; max: number; avg: number };
    total_purchases: number;
    total_interactions: number;
    relationship_strength: number;
    personality_stage: 'new_acquaintance' | 'familiar' | 'trusted_friend' | 'best_friend';
  };
  relationships: Array<{
    id: string;
    relationship_type: string;
    nickname: string;
    birthday?: string;
    notes?: string;
  }>;
  preferences: Array<{
    id: string;
    relationship_id?: string;
    interest: string;
    preference_type?: string;
  }>;
  memories: Array<{
    id: string;
    category: string;
    relationship_type: string;
    memory_text: string;
    created_at?: string;
  }>;
}

// Simple prompt injection detection and sanitization helper
export function sanitizeString(text: string | null | undefined, maxLength = 200): string {
  if (!text) return "";
  
  let sanitized = String(text);
  
  // Remove known prompt injection phrases case-insensitively
  const injectionPatterns = [
    /ignore\s+all\s+instructions/gi,
    /ignore\s+previous\s+instructions/gi,
    /system:\s*reveal\s*secrets/gi,
    /system\s*:/gi,
    /\[system\]/gi,
    /system\s+message/gi,
    /reveal\s+secrets/gi,
    /bypass\s+instructions/gi,
    /delete\s+all\s+data/gi
  ];

  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, "[CLEANED]");
  }

  // Trim and truncate to safe boundaries
  sanitized = sanitized.trim();
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + "...";
  }

  return sanitized;
}

export function normalizeUserContext(raw: {
  userProfile?: any;
  behaviorProfile?: any;
  relationships?: any[];
  preferences?: any[];
  memories?: any[];
}): NormalizedUserContext {
  
  // 1. Normalize User Profile
  const rawProfile = raw.userProfile || {};
  const userProfile = {
    primary_language: sanitizeString(rawProfile.primary_language || "singlish", 50),
    communication_style: sanitizeString(rawProfile.communication_style || "casual", 50),
    average_budget: typeof rawProfile.average_budget === "number" ? rawProfile.average_budget : 6000
  };

  // 2. Normalize Behavior Profile
  const rawBehavior = raw.behaviorProfile || {};
  const favoriteCategoriesRaw = Array.isArray(rawBehavior.favorite_categories)
    ? rawBehavior.favorite_categories
    : [];
  
  // Sanitize and cap categories to 5 items max
  const favorite_categories = favoriteCategoriesRaw
    .map((c: any) => sanitizeString(c, 50))
    .filter(Boolean)
    .slice(0, 5);

  const rawRange = rawBehavior.favorite_price_range || {};
  const favorite_price_range = {
    min: typeof rawRange.min === "number" ? rawRange.min : 0,
    max: typeof rawRange.max === "number" ? rawRange.max : 0,
    avg: typeof rawRange.avg === "number" ? rawRange.avg : 0
  };

  const behaviorProfile = {
    user_id: sanitizeString(rawBehavior.user_id || "", 100),
    favorite_categories,
    favorite_price_range,
    total_purchases: typeof rawBehavior.total_purchases === "number" ? rawBehavior.total_purchases : 0,
    total_interactions: typeof rawBehavior.total_interactions === "number" ? rawBehavior.total_interactions : 0,
    relationship_strength: typeof rawBehavior.relationship_strength === "number" ? rawBehavior.relationship_strength : 0.0,
    personality_stage: (rawBehavior.personality_stage === 'familiar' || rawBehavior.personality_stage === 'trusted_friend' || rawBehavior.personality_stage === 'best_friend')
      ? rawBehavior.personality_stage
      : 'new_acquaintance'
  };

  // 3. Normalize Relationships (limit to 10)
  const rawRelationships = Array.isArray(raw.relationships) ? raw.relationships : [];
  const relationships = rawRelationships
    .filter((r: any) => r && typeof r === "object")
    .map((r: any) => ({
      id: sanitizeString(r.id || "", 100),
      relationship_type: sanitizeString(r.relationship_type || "UNKNOWN", 50),
      nickname: sanitizeString(r.nickname || r.relationship_type || "friend", 50),
      birthday: r.birthday ? sanitizeString(r.birthday, 50) : undefined,
      notes: r.notes ? sanitizeString(r.notes, 200) : undefined
    }))
    .slice(0, 10);

  // 4. Normalize Preferences (limit to 20)
  const rawPreferences = Array.isArray(raw.preferences) ? raw.preferences : [];
  const preferences = rawPreferences
    .filter((p: any) => p && typeof p === "object")
    .map((p: any) => ({
      id: sanitizeString(p.id || "", 100),
      relationship_id: p.relationship_id ? sanitizeString(p.relationship_id, 100) : undefined,
      interest: sanitizeString(p.interest || p.preference_value || "UNKNOWN", 100),
      preference_type: p.preference_type ? sanitizeString(p.preference_type, 50) : undefined
    }))
    .slice(0, 20);

  // 5. Normalize Memories (limit to 20)
  const rawMemories = Array.isArray(raw.memories) ? raw.memories : [];
  const memories = rawMemories
    .filter((m: any) => m && typeof m === "object")
    .map((m: any) => ({
      id: sanitizeString(m.id || "", 100),
      category: sanitizeString(m.category || "general", 50),
      relationship_type: sanitizeString(m.relationship_type || "user", 50),
      memory_text: sanitizeString(m.memory_text || m.text || m.memory || "", 200),
      created_at: m.created_at ? sanitizeString(m.created_at, 50) : undefined
    }))
    .slice(0, 20);

  return {
    userProfile,
    behaviorProfile,
    relationships,
    preferences,
    memories
  };
}
