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
                params: {
                    order_number: orderNumber,
                    response_format: "json"
                }
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
export async function mcpCheckDelivery(city: string, deliveryDate?: string | null, productId?: string | null): Promise<Record<string, unknown> | null> {
    try {
        const client = await getMCPClient();
        const response = await client.callTool({
            name: "kapruka_check_delivery",
            arguments: {
                params: {
                    city,
                    delivery_date: deliveryDate || null,
                    product_id: productId || null,
                    response_format: "json"
                }
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

// Wrap get product tool (Master Prompt Tool 2)
export async function mcpGetProduct(productId: string): Promise<Record<string, unknown> | null> {
    try {
        const client = await getMCPClient();
        const response = await client.callTool({
            name: "kapruka_get_product",
            arguments: {
                params: {
                    product_id: productId,
                    response_format: "json"
                }
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
        console.error("Error calling kapruka_get_product tool:", error);
        return null;
    }
}

// Wrap list categories tool (Master Prompt Tool 3)
export async function mcpListCategories(depth = 1): Promise<any[]> {
    try {
        const client = await getMCPClient();
        const response = await client.callTool({
            name: "kapruka_list_categories",
            arguments: {
                params: {
                    depth,
                    response_format: "json"
                }
            }
        });

        const res = response as unknown as {
            structuredContent?: { result?: string };
            content?: Array<{ text?: string }>;
        };
        let categoriesData: any = null;
        if (res.structuredContent?.result) {
            categoriesData = JSON.parse(res.structuredContent.result);
        } else if (res.content && res.content[0]?.text) {
            categoriesData = JSON.parse(res.content[0].text);
        }

        if (categoriesData && Array.isArray(categoriesData.categories)) {
            return categoriesData.categories;
        }

        return [];
    } catch (error) {
        console.error("Error calling kapruka_list_categories tool:", error);
        return [];
    }
}

// Wrap list delivery cities tool (Master Prompt Tool 4)
export async function mcpListDeliveryCities(query = ""): Promise<any[]> {
    try {
        const client = await getMCPClient();
        const response = await client.callTool({
            name: "kapruka_list_delivery_cities",
            arguments: {
                params: {
                    query,
                    response_format: "json"
                }
            }
        });

        const res = response as unknown as {
            structuredContent?: { result?: string };
            content?: Array<{ text?: string }>;
        };
        let citiesData: any = null;
        if (res.structuredContent?.result) {
            citiesData = JSON.parse(res.structuredContent.result);
        } else if (res.content && res.content[0]?.text) {
            citiesData = JSON.parse(res.content[0].text);
        }

        if (citiesData && Array.isArray(citiesData.cities)) {
            return citiesData.cities;
        }

        return [];
    } catch (error) {
        console.error("Error calling kapruka_list_delivery_cities tool:", error);
        return [];
    }
}

// Wrap create order tool
export async function mcpCreateOrder(params: any): Promise<Record<string, any> | null> {
    try {
        const client = await getMCPClient();
        const response = await client.callTool({
            name: "kapruka_create_order",
            arguments: {
                params: {
                    ...params,
                    response_format: "json"
                }
            }
        });

        const res = response as unknown as {
            structuredContent?: { result?: string };
            content?: Array<{ text?: string }>;
        };
        if (res.structuredContent?.result) {
            return JSON.parse(res.structuredContent.result) as Record<string, any>;
        }

        if (res.content && res.content[0]?.text) {
            return JSON.parse(res.content[0].text) as Record<string, any>;
        }

        return null;
    } catch (error) {
        console.error("Error calling kapruka_create_order tool:", error);
        return null;
    }
}
