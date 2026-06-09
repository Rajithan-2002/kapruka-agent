import { NextResponse } from "next/server";
import { 
    readDB, 
    addMemory, 
    addPreference, 
    addRelationship, 
    getProfile, 
    updateProfile, 
    getRelationships, 
    getPreferences, 
    getMemories, 
    addOrder, 
    getOrders,
    useCloud
} from "@/lib/db";

export async function GET() {
    try {
        const results: Record<string, unknown> = {};
        results["useCloud"] = useCloud;

        console.log("Starting test-db script. useCloud =", useCloud);

        // 1. Profile tests
        const initialProfile = await getProfile();
        results["initialProfile"] = initialProfile;

        const updatedProfile = await updateProfile({ average_budget: 7500 });
        results["updatedProfile"] = updatedProfile;

        // Reset profile budget for other tests
        await updateProfile({ average_budget: 6000 });

        // 2. Relationship tests
        const testRel = await addRelationship({
            relationship_type: "friend",
            nickname: "Tester-" + Date.now(),
            birthday: "2000-01-01",
            notes: "Test notes"
        });
        results["testRel"] = testRel;

        const allRels = await getRelationships();
        results["allRelsCount"] = allRels.length;
        results["relExists"] = allRels.some(r => r.id === testRel.id);

        // 3. Preference tests
        const testPref = await addPreference(
            testRel.id,
            "baking",
            0.5
        );
        results["testPref"] = testPref;

        // Try adding the same preference again to test confidence score increment logic
        const updatedPref = await addPreference(
            testRel.id,
            "baking"
        );
        results["updatedPref"] = updatedPref;

        const allPrefs = await getPreferences(testRel.id);
        results["allPrefsCount"] = allPrefs.length;

        // 4. Memory tests
        const testMemory = await addMemory("context", "test_key", "test_value");
        results["testMemory"] = testMemory;

        const allMemories = await getMemories();
        results["memoriesCount"] = allMemories.length;

        // 5. Order tests
        const testOrder = await addOrder({
            orderNumber: "ORD-TEST-" + Date.now(),
            recipientName: "Test Recipient",
            totalAmount: 1500,
            items: ["Item A", "Item B"]
        });
        results["testOrder"] = testOrder;

        const allOrders = await getOrders();
        results["ordersCount"] = allOrders.length;

        // 6. Test readDB snapshot
        const dbSnapshot = await readDB();
        results["dbSnapshotKeys"] = Object.keys(dbSnapshot);
        results["dbSnapshotProfile"] = dbSnapshot.profile;

        return NextResponse.json({
            success: true,
            results
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Test DB Error:", error);
        return NextResponse.json({
            success: false,
            error: errorMessage
        }, { status: 500 });
    }
}
