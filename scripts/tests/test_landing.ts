async function testLandingAPI() {
    try {
        console.log("Fetching /api/landing-products...");
        const res = await fetch("http://localhost:3000/api/landing-products");
        if (!res.ok) {
            console.error("HTTP Error:", res.status, res.statusText);
            return;
        }
        const data = await res.json();
        
        console.log("=== POPULAR BUNDLES ===");
        if (data.popularBundles && data.popularBundles.length > 0) {
            data.popularBundles.forEach((b: any, i: number) => {
                console.log(`[${i+1}] ${b.name} (LKR ${b.price})`);
            });
        } else {
            console.log("No popular bundles found.");
        }
        
        console.log("\n=== FAST DELIVERY ===");
        if (data.fastDelivery && data.fastDelivery.length > 0) {
            data.fastDelivery.forEach((f: any, i: number) => {
                console.log(`[${i+1}] ${f.name} (LKR ${f.price})`);
            });
        } else {
            console.log("No fast delivery items found.");
        }
        
    } catch (error) {
        console.error("Test failed:", error);
    }
}
testLandingAPI();
