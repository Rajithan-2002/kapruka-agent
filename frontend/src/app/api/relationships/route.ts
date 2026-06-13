import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
    getRelationships,
    getPreferences,
    getMemories,
    addRelationship,
    addPreference,
    addMemory,
    deleteRelationship,
    updateRelationship,
    deletePreference
} from "@/lib/services/memoryService";

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const userId = user ? user.id : "00000000-0000-0000-0000-000000000000";
        const relationships = await getRelationships(userId);
        const preferences = await getPreferences(userId);
        const memories = await getMemories(userId);

        return NextResponse.json({ relationships, preferences, memories });
    } catch (error: any) {
        console.error("Relationships GET error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const userId = user ? user.id : "00000000-0000-0000-0000-000000000000";
        const body = await request.json();
        const { action } = body;


        if (action === "add_preference") {
            const { relationshipId, interest } = body;
            if (!interest) {
                return NextResponse.json({ error: "Missing interest text" }, { status: 400 });
            }
            const preference = await addPreference(userId, relationshipId || undefined, interest);
            return NextResponse.json({ success: true, preference });
        }

        // Default action: add relationship
        const { relationshipType, nickname, birthday, notes } = body;
        if (!relationshipType || !nickname) {
            return NextResponse.json({ error: "Missing type or nickname" }, { status: 400 });
        }

        const rel = await addRelationship(userId, {
            relationship_type: relationshipType,
            nickname,
            birthday,
            notes
        });

        // Also add notes as preference interests if any
        if (notes) {
            const interests = notes.split(",").map((i: string) => i.trim()).filter(Boolean);
            for (const interest of interests) {
                await addPreference(userId, rel.id, interest);
            }
        }

        return NextResponse.json({ success: true, relationship: rel });
    } catch (error: any) {
        console.error("Relationships POST error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user ? user.id : "00000000-0000-0000-0000-000000000000";

        const body = await request.json();
        const { relationshipId, updates } = body;

        if (!relationshipId || !updates) {
            return NextResponse.json({ error: "Missing relationshipId or updates" }, { status: 400 });
        }

        const updatedRel = await updateRelationship(userId, relationshipId, updates);
        return NextResponse.json({ success: true, relationship: updatedRel });
    } catch (error: any) {
        console.error("Relationships PUT error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user ? user.id : "00000000-0000-0000-0000-000000000000";

        const { searchParams } = new URL(request.url);
        const relationshipId = searchParams.get("relationshipId");
        const preferenceId = searchParams.get("preferenceId");

        if (relationshipId) {
            await deleteRelationship(userId, relationshipId);
            return NextResponse.json({ success: true, message: "Relationship deleted successfully" });
        }

        if (preferenceId) {
            await deletePreference(userId, preferenceId);
            return NextResponse.json({ success: true, message: "Preference deleted successfully" });
        }

        return NextResponse.json({ error: "Missing relationshipId or preferenceId" }, { status: 400 });
    } catch (error: any) {
        console.error("Relationships DELETE error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

