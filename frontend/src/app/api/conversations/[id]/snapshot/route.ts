import { NextResponse } from "next/server";
import { SessionSnapshotEngine } from "@/lib/intelligence/state/sessionSnapshot";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const snapshot = await SessionSnapshotEngine.loadSnapshot(id);
        return NextResponse.json({ snapshot });
    } catch (error: any) {
        console.error("Snapshot GET Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
