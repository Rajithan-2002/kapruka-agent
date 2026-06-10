import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserConversations, createConversation, deleteConversation } from "@/lib/services/conversationsService";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const conversations = await getUserConversations(user.id);
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

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id, title } = await request.json();
        if (!id) {
            return NextResponse.json({ error: "Missing conversation ID" }, { status: 400 });
        }

        const conv = await createConversation(user.id, id, title);
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

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Missing conversation ID" }, { status: 400 });
        }

        await deleteConversation(user.id, id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Conversations DELETE Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
