import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// MCP client singleton connection logic
let mcpClientInstance: Client | null = null;
let connectionPromise: Promise<Client> | null = null;

async function getMCPClient(): Promise<Client> {
    if (mcpClientInstance) {
        return mcpClientInstance;
    }

    if (connectionPromise) {
        return connectionPromise;
    }

    connectionPromise = (async () => {
        try {
            const transport = new StreamableHTTPClientTransport(
                new URL("https://mcp.kapruka.com/mcp")
            );

            const client = new Client({
                name: "kappy-orchestrator",
                version: "1.0.0",
            });

            await client.connect(transport);
            mcpClientInstance = client;
            return client;
        } catch (error) {
            connectionPromise = null; // Reset promise so we can retry on next call
            console.error("Failed to connect to Kapruka MCP server:", error);
            throw error;
        }
    })();

    return connectionPromise;
}

export interface MCPProduct {
    id: string;
    name: string;
    summary?: string;
    price: {
        amount: number;
        currency: string;
    };
    in_stock: boolean;
    stock_level?: string;
    image_url: string;
    category?: {
        id: string;
        name: string;
    };
    rating?: number | null;
    ships_internationally?: boolean;
    url: string;
}

// Wrap search products tool
export async function mcpSearchProducts(query: string, limit = 40, inStockOnly = true): Promise<MCPProduct[]> {
    try {
        const client = await getMCPClient();
        const response = await client.callTool({
            name: "kapruka_search_products",
            arguments: {
                params: {
                    q: query,
                    limit,
                    in_stock_only: inStockOnly,
                    response_format: "json"
                }
            }
        });

        const res = response as unknown as {
            structuredContent?: { result?: string };
            content?: Array<{ text?: string }>;
        };
        if (res.structuredContent?.result) {
            const parsed = JSON.parse(res.structuredContent.result);
            return (parsed.results || []) as MCPProduct[];
        }

        if (res.content && res.content[0]?.text) {
            const parsed = JSON.parse(res.content[0].text);
            return (parsed.results || []) as MCPProduct[];
        }

        return [];
    } catch (error) {
        console.error("Error calling kapruka_search_products tool:", error);
        return []; // Return empty on error so backend reasoning doesn't crash
    }
}

// Wrap track order tool
export async function mcpTrackOrder(orderNumber: string): Promise<Record<string, unknown> | null> {
    try {
        const client = await getMCPClient();
        const response = await client.callTool({
            name: "kapruka_track_order",
            arguments: {
                order_number: orderNumber
            }
        });

        const res = response as unknown as {
            structuredContent?: { result?: string };
            content?: Array<{ text?: string }>;
        };
        if (res.structuredContent?.result) {
            return JSON.parse(res.structuredContent.result) as Record<string, unknown>;
        }

        if (res.content && res.content[0]?.text) {
            return JSON.parse(res.content[0].text) as Record<string, unknown>;
        }

        return null;
    } catch (error) {
        console.error("Error calling kapruka_track_order tool:", error);
        return null;
    }
}

// Wrap check delivery tool
export async function mcpCheckDelivery(city: string): Promise<Record<string, unknown> | null> {
    try {
        const client = await getMCPClient();
        const response = await client.callTool({
            name: "kapruka_check_delivery",
            arguments: {
                city
            }
        });

        const res = response as unknown as {
            structuredContent?: { result?: string };
            content?: Array<{ text?: string }>;
        };
        if (res.structuredContent?.result) {
            return JSON.parse(res.structuredContent.result) as Record<string, unknown>;
        }

        if (res.content && res.content[0]?.text) {
            return JSON.parse(res.content[0].text) as Record<string, unknown>;
        }

        return null;
    } catch (error) {
        console.error("Error calling kapruka_check_delivery tool:", error);
        return null;
    }
}

// Stub for kapruka_get_product (Master Prompt Tool 2)
export async function mcpGetProduct(productId: string): Promise<Record<string, unknown> | null> {
    console.log(`[MCP Stub] kapruka_get_product called for ${productId}`);
    // Fallback mock since this MCP endpoint might not exist yet
    return {
        id: productId,
        description: "This is a detailed description retrieved from the Kapruka product database. It includes specifications, dimensions, and warranty information.",
        available_options: ["Standard", "Premium"],
        images: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
    };
}

// Stub for kapruka_list_categories (Master Prompt Tool 3)
export async function mcpListCategories(): Promise<string[]> {
    console.log(`[MCP Stub] kapruka_list_categories called`);
    return [
        "Cakes & Bakery",
        "Flowers",
        "Chocolates",
        "Hampers & Gift Sets",
        "Electronics & Gadgets",
        "Soft Toys",
        "Clothing & Fashion",
        "Beauty & Grooming",
        "Grocery",
        "Baby Products"
    ];
}

// Stub for kapruka_list_delivery_cities (Master Prompt Tool 4)
export async function mcpListDeliveryCities(): Promise<string[]> {
    console.log(`[MCP Stub] kapruka_list_delivery_cities called`);
    return [
        "Colombo (1-15)",
        "Gampaha",
        "Kandy",
        "Galle",
        "Kurunegala",
        "Negombo",
        "Jaffna",
        "Matara",
        "Nuwara Eliya",
        "Island-wide delivery available for non-perishable items."
    ];
}
