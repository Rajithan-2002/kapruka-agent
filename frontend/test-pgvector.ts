import { selectFewShots } from "./src/lib/fewShotLibrary";

async function testPgVector() {
    console.log("Testing PGVector dynamic caching...");
    try {
        const shots = await selectFewShots("Can you recommend a gift for my mother?");
        console.log(`Successfully retrieved ${shots.length} few-shots from PGVector.`);
        console.log("First match:", shots[0]);
    } catch (error) {
        console.error("PGVector test failed:", error);
    }
}
testPgVector();
