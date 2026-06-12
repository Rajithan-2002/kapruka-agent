import { IntelligenceOutput } from "../types/intelligence.types";

export interface RankedProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  score: number;
  reasons: string[];
}

export class CommonSenseValidator {
  /**
   * Evaluates scored products and removes those that violate common sense.
   */
  public static evaluate(
    products: RankedProduct[],
    intelligence: IntelligenceOutput
  ): { approved: RankedProduct[]; rejected: { product: RankedProduct; reason: string }[] } {
    const approved: RankedProduct[] = [];
    const rejected: { product: RankedProduct; reason: string }[] = [];

    const { situation, plan } = intelligence;

    for (const product of products) {
      let isRejected = false;
      let rejectReason = "";

      // Rule 1: Hard blocks from Planner
      if (plan && plan.hardBlocks) {
        const matchesBlock = plan.hardBlocks.some(block => 
          product.category.toLowerCase().includes(block.toLowerCase()) || 
          product.name.toLowerCase().includes(block.toLowerCase())
        );

        if (matchesBlock) {
          isRejected = true;
          rejectReason = "Violates Planner Hard Block";
        }
      }

      // Rule 2: Adult products for Father's Day (Anti-Pattern)
      if (!isRejected && situation?.occasion?.toLowerCase().includes("father") && 
          (product.name.toLowerCase().includes("dildo") || product.category.toLowerCase().includes("adult"))) {
        isRejected = true;
        rejectReason = "Anti-Pattern: Adult products for Father's Day";
      }

      // Rule 3: Romantic items for non-romantic recipients
      if (!isRejected && situation?.recipient_type && situation.recipient_type !== "ROMANTIC" && situation.recipient_type !== "UNKNOWN") {
        if (product.name.toLowerCase().includes("lingerie") || product.name.toLowerCase().includes("romantic bundle")) {
          isRejected = true;
          rejectReason = "Common Sense: Romantic item for non-romantic recipient";
        }
      }

      // Rule 4: Over Budget (Strict)
      if (!isRejected && plan?.priceTarget?.max && product.price > plan.priceTarget.max * 1.5) {
         // Allow up to 50% buffer max, otherwise reject
         isRejected = true;
         rejectReason = "Common Sense: Severely over budget";
      }

      if (isRejected) {
        rejected.push({ product, reason: rejectReason });
      } else {
        approved.push(product);
      }
    }

    return { approved, rejected };
  }
}
