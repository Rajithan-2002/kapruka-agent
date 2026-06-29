import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const adminEmail = process.env.ADMIN_EMAIL || "rajipathman420@gmail.com";
        if (session.user.email !== adminEmail) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { id, action } = body;

        if (!id || !["APPROVED", "REJECTED"].includes(action)) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const { error } = await supabase
            .from("kappy_community_lexicon")
            .update({ status: action })
            .eq("id", id);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("Admin Lexicon Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
