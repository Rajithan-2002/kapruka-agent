import { mcpTrackOrder } from "./src/lib/mcp";

async function main() {
  try {
    console.log("Tracking order...");
    const result = await mcpTrackOrder("12345");
    console.log("Result:", result);
  } catch (e) {
    console.error("Error:", e);
  }
}

main();
