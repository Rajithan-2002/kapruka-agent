import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
    getRelationships,
    getPreferences,
    getMemories,
    addRelationship,
    addPreference,
    addMemory
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

        if (action === "preload") {
            // Add Nethmi (Girlfriend)
            const nethmi = await addRelationship(userId, {
                relationship_type: "girlfriend",
                nickname: "Nethmi",
                birthday: "12 October",
                notes: "Likes Pink, chocolate, and flowers"
            });
            await addPreference(userId, nethmi.id, "Pink");
            await addPreference(userId, nethmi.id, "Chocolate");
            await addPreference(userId, nethmi.id, "Flowers");

            // Add Dad
            const dad = await addRelationship(userId, {
                relationship_type: "father",
                nickname: "Dad",
                birthday: "15 June",
                notes: "Likes books and technology"
            });
            await addPreference(userId, dad.id, "Books");
            await addPreference(userId, dad.id, "Technology");

            // Fetch final list
            const relationships = await getRelationships(userId);
            const preferences = await getPreferences(userId);

            return NextResponse.json({ success: true, relationships, preferences });
        }

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
