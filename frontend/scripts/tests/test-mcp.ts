import { mcpCreateOrder } from "@/lib/mcp";

async function testMCP() {
  console.log("Testing kapruka_create_order via HTTP...");
  try {
      const payload = {
        cart: [
          { product_id: "FLOWERS00T2010", quantity: 1 },
          { product_id: "EF_PC_CHOC0V571POD00076", quantity: 1 },
          { product_id: "EF_PC_GREE0V699P00080", quantity: 1 }
        ],
        recipient: { name: "Test User", phone: "0771234567" },
        delivery: { address: "123 Galle Road", city: "Colombo 03", date: "2026-07-01" },
        sender: { name: "Test Sender" },
        gift_message: "Happy Birthday!"
      };
      const result = await mcpCreateOrder(payload);
      console.log("Result:", result);
  } catch (error) {
      console.error("Error:", error);
  }
}
testMCP();
