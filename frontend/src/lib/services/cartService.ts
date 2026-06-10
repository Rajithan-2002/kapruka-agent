export interface CartItem {
    productId: string;
    quantity: number;
    price: number;
}

export interface CartSession {
    userId: string;
    sessionId: string;
    items: CartItem[];
}

/**
 * Adds an item to the user's cart session.
 * STUB: In production, this would call Kapruka's real cart API.
 */
export async function addToCart(userId: string, sessionId: string, productId: string, price: number, quantity: number = 1): Promise<CartSession> {
    console.log(`[CartService] Added item ${productId} to cart for user ${userId} in session ${sessionId}`);
    // Simulated mock response
    return {
        userId,
        sessionId,
        items: [{ productId, quantity, price }]
    };
}

/**
 * Generates a checkout link for the current session.
 * STUB: In production, this generates a secure Kapruka payment gateway link.
 */
export async function generateCheckoutLink(userId: string, sessionId: string): Promise<string> {
    console.log(`[CartService] Generating checkout link for user ${userId} in session ${sessionId}`);
    // Simulated checkout link
    return `https://www.kapruka.com/checkout?session=${sessionId}&user=${userId}`;
}
