import { selectFewShots } from "./src/lib/fewShotLibrary";

async function main() {
    console.log("==========================================");
    console.log("TESTING SEMANTIC FEW-SHOT RETRIEVAL");
    console.log("==========================================");
    
    // "amma birthday gift" should match "mother birthday present" or "amma ku birthday gift venum" semantically
    const matches = await selectFewShots(
        "amma birthday gift",
        "GIFTING",
        "Singlish",
        "playful",
        1.0,
        [] // empty history (forces semantic query)
    );
    
    console.log("\nMatches for 'amma birthday gift' (Singlish/GIFTING):");
    console.log(JSON.stringify(matches, null, 2));
    
    // Let's do another one
    const matches2 = await selectFewShots(
        "wallet is crying budget is tight",
        "BUDGET_SENSITIVE",
        "English",
        "casual",
        0.5, // low confidence (forces semantic query)
        []
    );
    
    console.log("\nMatches for 'wallet is crying budget is tight' (English/BUDGET_SENSITIVE):");
    console.log(JSON.stringify(matches2, null, 2));
}

main().catch(console.error);
