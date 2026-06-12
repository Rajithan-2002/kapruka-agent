import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserConversations, createConversation, deleteConversation } from "@/lib/services/conversationsService";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const userId = user ? user.id : "00000000-0000-0000-0000-000000000000";
        const conversations = await getUserConversations(userId);
        return NextResponse.json({ conversations });
    } catch (error: any) {
        console.error("Conversations GET Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const userId = user ? user.id : "00000000-0000-0000-0000-000000000000";
        const { id, title } = await request.json();
        if (!id) {
            return NextResponse.json({ error: "Missing conversation ID" }, { status: 400 });
        }

        const conv = await createConversation(userId, id, title);
        return NextResponse.json({ conversation: conv });
    } catch (error: any) {
        console.error("Conversations POST Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const userId = user ? user.id : "00000000-0000-0000-0000-000000000000";
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Missing conversation ID" }, { status: 400 });
        }

        await deleteConversation(userId, id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Conversations DELETE Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
