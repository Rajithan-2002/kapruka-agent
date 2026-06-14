import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id?: string }> }) {
    const { id } = await params;
    const traceId = id;
    if (!traceId) {
        return NextResponse.json({ error: "Trace ID is required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "overview";

    try {
        const supabase = await createClient();

        // Selective loading of columns to minimize payload sizes
        let selectColumns = "trace_id, session_summary, engine_health, created_at, user_id";
        if (tab === "funnel") {
            selectColumns = "trace_id, product_lifecycles";
        } else if (tab === "memory") {
            selectColumns = "trace_id, learning_profile, confidence_explanation, telemetry_events";

        } else if (tab === "replay") {
            selectColumns = "trace_id, replay_steps, telemetry_events";
        } else if (tab === "decisions") {
            selectColumns = "trace_id, confidence_explanation, replay_steps";
        } else if (tab === "all") {
            selectColumns = "*";
        }

        const { data, error } = await supabase
            .from("godmode_traces")
            .select(selectColumns)
            .eq("trace_id", traceId)
            .single();

        if (error) {
            console.error(`Error loading trace details for ${traceId} (tab: ${tab}):`, error);
            return NextResponse.json({ error: "Trace not found or failed to load" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data });
    } catch (err: any) {
        console.error("GET godmode trace endpoint exception:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
