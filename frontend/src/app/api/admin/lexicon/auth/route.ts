import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user) {
        return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    const adminEmail = process.env.ADMIN_EMAIL || "rajipathman420@gmail.com";

    if (session.user.email === adminEmail) {
        return NextResponse.json({ isAdmin: true });
    }

    return NextResponse.json({ isAdmin: false }, { status: 403 });
}
