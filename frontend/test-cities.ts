import { mcpListDeliveryCities } from "./src/lib/mcp";

async function findCities() {
  const cities = await mcpListDeliveryCities("colombo");
  console.log("Cities:", cities);
}
findCities();
