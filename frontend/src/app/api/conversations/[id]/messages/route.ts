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

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const messages = await getSessionHistory(user.id, id);
        
        // Format to the message structure expected by the frontend ChatWindow component
        const formatted = messages.map(m => {
            let products: any[] = [];
            let tracking: any = null;

            let traceReport: any = null;
            let intelligenceTrace: any = null;

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
            }

            return {
                id: m.id,
                role: m.role,
                content: m.content,
                products: products.length > 0 ? products : undefined,
                tracking: tracking || undefined,
                traceReport: traceReport || undefined,
                intelligenceTrace: intelligenceTrace || undefined
            };
        });

        return NextResponse.json({ messages: formatted });
    } catch (error: any) {
        console.error("Messages GET Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
