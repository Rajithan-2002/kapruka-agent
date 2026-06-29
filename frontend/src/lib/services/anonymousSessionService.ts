export interface AnonymousSession {
    sessionId: string;
    categoryInteractions: Record<string, number>;
    productInteractions: string[]; // List of product IDs interacted
    lastActivity: number;
}

export class AnonymousSessionService {
    private static sessions = new Map<string, AnonymousSession>();

    public static getSession(sessionId: string): AnonymousSession {
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, {
                sessionId,
                categoryInteractions: {},
                productInteractions: [],
                lastActivity: Date.now()
            });
        }
        const session = this.sessions.get(sessionId)!;
        session.lastActivity = Date.now();
        return session;
    }

    public static recordInteraction(sessionId: string, category: string, productId: string) {
        if (!sessionId) return;
        const session = this.getSession(sessionId);
        
        // Normalize category (e.g. "Electronics" -> "ELECTRONICS")
        const cat = category.toUpperCase().trim();
        session.categoryInteractions[cat] = (session.categoryInteractions[cat] || 0) + 1;
        
        if (!session.productInteractions.includes(productId)) {
            session.productInteractions.push(productId);
            if (session.productInteractions.length > 30) {
                session.productInteractions.shift();
            }
        }
        
        this.cleanup();
    }

    private static cleanup() {
        const now = Date.now();
        // Clear sessions older than 2 hours
        for (const [sid, sess] of this.sessions.entries()) {
            if (now - sess.lastActivity > 2 * 60 * 60 * 1000) {
                this.sessions.delete(sid);
            }
        }
    }
}
