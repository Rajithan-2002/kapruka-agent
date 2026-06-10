import { NextResponse } from "next/server";
import { processDailyReminders } from "@/lib/services/remindersService";

export async function GET(request: Request) {
    try {
        // Basic security check to ensure it's a cron hit
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'dev-secret'}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await processDailyReminders();
        
        return NextResponse.json({ success: true, message: "Reminders processed" });
    } catch (error) {
        console.error("Cron Error:", error);
        return NextResponse.json({ error: "Failed to process reminders" }, { status: 500 });
    }
}
