import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionHistory } from "@/lib/services/chatHistoryService";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const userId = user ? user.id : "00000000-0000-0000-0000-000000000000";
        const { id } = await params;
        const messages = await getSessionHistory(userId, id);
        
        // Format to the message structure expected by the frontend ChatWindow component
        const formatted = messages.map(m => {
            let products: any[] = [];
            let tracking: any = null;

            let traceReport: any = null;
            let intelligenceTrace: any = null;
            let isAllRequested: boolean | undefined = undefined;
            let initialVisibleCount: number | undefined = undefined;

            let activeMemories: string[] = [];

            if (m.metadata) {
                if (m.metadata.products_list) {
                    products = m.metadata.products_list as any[];
                }
                if (m.metadata.tracking_data) {
                    tracking = m.metadata.tracking_data;
                }
                if (m.metadata.traceReport) {
                    traceReport = m.metadata.traceReport;
                }
                if (m.metadata.intelligenceTrace) {
                    intelligenceTrace = m.metadata.intelligenceTrace;
                }
                if (m.metadata.activeMemories) {
                    activeMemories = m.metadata.activeMemories as string[];
                }
                if (m.metadata.isAllRequested !== undefined && m.metadata.isAllRequested !== null) {
                    isAllRequested = m.metadata.isAllRequested as boolean;
                }
                if (m.metadata.initialVisibleCount !== undefined && m.metadata.initialVisibleCount !== null) {
                    initialVisibleCount = m.metadata.initialVisibleCount as number;
                }
            }

            return {
                id: m.id,
                role: m.role,
                content: m.content,
                products: products.length > 0 ? products : undefined,
                tracking: tracking || undefined,
                traceReport: traceReport || undefined,
                intelligenceTrace: intelligenceTrace || undefined,
                judgeModeTrace: intelligenceTrace || undefined,
                activeMemories,
                isAllRequested,
                initialVisibleCount
            };
        });

        return NextResponse.json({ messages: formatted });
    } catch (error: any) {
        console.error("Messages GET Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
