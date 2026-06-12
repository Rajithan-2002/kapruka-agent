import { ExtractionResult, EngineResult, RelationshipProfile } from "../types/intelligence.types";
import { IntelligenceTracer } from "../observability/tracer";
import { ProfileService } from "../services/profileService";

export class RelationshipEngine {
  constructor(private tracer: IntelligenceTracer) {}

  public async evaluate(userId: string | undefined, extraction: ExtractionResult): Promise<EngineResult<RelationshipProfile | undefined>> {
    const trace = this.tracer.startTrace("RelationshipEngine", { recipient: extraction.situation.recipient });

    if (!userId || !extraction.situation.recipient || extraction.situation.recipient === "UNKNOWN") {
      const result = undefined;
      return { result, trace: trace.end(result, 1.0, "No user ID or recipient known") };
    }

    // Call Supabase
    const profile = await ProfileService.getRelationshipProfile(userId, extraction.situation.recipient);

    if (profile) {
      return { result: profile, trace: trace.end(profile, 1.0, "Loaded profile from memory") };
    }

    // Default empty profile for new recipients
    const defaultProfile: RelationshipProfile = {
      id: "temp",
      recipient_name: extraction.situation.recipient,
      relationship_type: extraction.situation.recipient_type,
      interests: [],
      dislikes: [],
      successful_gifts: [],
      failed_gifts: [],
      relationship_strength: 5
    };

    return { result: defaultProfile, trace: trace.end(defaultProfile, 0.5, "Generated default profile, no DB record found") };
  }
}
