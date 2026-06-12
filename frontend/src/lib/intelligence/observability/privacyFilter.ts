export class PrivacyFilter {
    private static readonly REDACTED_STRING = "[REDACTED]";

    // Simple regex for PII detection
    private static readonly EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    private static readonly PHONE_REGEX = /(\+94|0)[0-9]{9}/g;
    // Credit cards, etc.

    public static sanitize(data: any): any {
        if (!data) return data;

        if (typeof data === "string") {
            let sanitized = data.replace(this.EMAIL_REGEX, this.REDACTED_STRING);
            sanitized = sanitized.replace(this.PHONE_REGEX, this.REDACTED_STRING);
            return sanitized;
        }

        if (Array.isArray(data)) {
            return data.map(item => this.sanitize(item));
        }

        if (typeof data === "object") {
            const sanitizedObj: any = {};
            for (const [key, value] of Object.entries(data)) {
                // Hard filter specific keys
                if (["email", "phone", "address", "payment", "password", "token"].includes(key.toLowerCase())) {
                    sanitizedObj[key] = this.REDACTED_STRING;
                } else {
                    sanitizedObj[key] = this.sanitize(value);
                }
            }
            return sanitizedObj;
        }

        return data;
    }
}
