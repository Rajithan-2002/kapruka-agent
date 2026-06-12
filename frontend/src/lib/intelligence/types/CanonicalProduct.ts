export interface CanonicalProductV1 {
    id: string;
    name: string;
    price: number;
    currency: string;
    category: string;
    description?: string;
    imageUrl?: string;
    image_url?: string; // For UI compatibility
    inStock: boolean;
    url: string;
    score?: number; // Used during ranking
    source?: string;
    tags?: string;
}

export class SchemaValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SchemaValidationError";
    }
}
