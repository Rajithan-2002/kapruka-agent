import fs from "fs";
import path from "path";

const targetFile = path.join(process.cwd(), "frontend", "src", "app", "api", "landing-products", "route.ts");
let content = fs.readFileSync(targetFile, "utf-8");

// 1. Remove EMERGENCY_FALLBACK_CATALOG
content = content.replace(/const EMERGENCY_FALLBACK_CATALOG = \[[\s\S]*?\];\n\n/m, "");

// 2. Change anonymous fetching to sequential
const anonymousOld = `            // 2. Fetch candidates from MCP for each category
            const fetchPromises = [
                mcpSearchProducts("electronics", 15).then(res => res.map(p => ({ ...p, sourceCategory: "ELECTRONICS" }))),
                mcpSearchProducts("grocery", 15).then(res => res.map(p => ({ ...p, sourceCategory: "GROCERY" }))),
                mcpSearchProducts("household appliances kitchen", 15).then(res => res.map(p => ({ ...p, sourceCategory: "HOUSEHOLD" }))),
                mcpSearchProducts("lifestyle", 15).then(res => res.map(p => ({ ...p, sourceCategory: "LIFESTYLE" }))),
                mcpSearchProducts("hamper bouquet chocolate combo", 15).then(res => res.map(p => ({ ...p, sourceCategory: "POPULAR_GIFTS" }))),
                mcpSearchProducts("popular", 15).then(res => res.map(p => ({ ...p, sourceCategory: "TRENDING" })))
            ];

            const fetchedResults = await Promise.all(fetchPromises).catch(() => [[], [], [], [], [], []]);
            // Randomly shuffle raw candidates to ensure refresh rotation
            const rawPool = fetchedResults.flat().sort(() => Math.random() - 0.5);`;

const anonymousNew = `            // 2. Fetch candidates from MCP sequentially
            const categoriesToFetch = [
                { query: "electronics", source: "ELECTRONICS" },
                { query: "grocery", source: "GROCERY" },
                { query: "household appliances kitchen", source: "HOUSEHOLD" },
                { query: "lifestyle", source: "LIFESTYLE" },
                { query: "hamper bouquet chocolate combo", source: "POPULAR_GIFTS" },
                { query: "popular", source: "TRENDING" }
            ];

            const fetchedResults = [];
            for (const cat of categoriesToFetch) {
                try {
                    const res = await mcpSearchProducts(cat.query, 15);
                    fetchedResults.push(res.map(p => ({ ...p, sourceCategory: cat.source })));
                    await new Promise(r => setTimeout(r, 200));
                } catch (e) {
                    console.error("Failed to fetch landing category", cat.query, e);
                }
            }
            // Randomly shuffle raw candidates to ensure refresh rotation
            const rawPool = fetchedResults.flat().sort(() => Math.random() - 0.5);`;

content = content.replace(anonymousOld, anonymousNew);

// 3. Change logged in fetching to sequential
const loggedInOld = `            const mcpPromises = Array.from(queries).map(q => 
                mcpSearchProducts(q, 10).then(res => res.map(p => ({ ...p, sourceCategory: q.toUpperCase() })))
            );
            const mcpResults = await Promise.all(mcpPromises).catch(() => []);
            const rawPool = mcpResults.flat();`;

const loggedInNew = `            const mcpResults = [];
            for (const q of Array.from(queries)) {
                try {
                    const res = await mcpSearchProducts(q, 10);
                    mcpResults.push(res.map(p => ({ ...p, sourceCategory: q.toUpperCase() })));
                    await new Promise(r => setTimeout(r, 200));
                } catch (e) {
                    console.error("Failed to fetch landing category", q, e);
                }
            }
            const rawPool = mcpResults.flat();`;

content = content.replace(loggedInOld, loggedInNew);

// 4. Remove fallback logic blocks
content = content.replace(/\/\/ If selection is too small or lacks 5 distinct categories, backfill with fallback catalog[\s\S]*?if \(finalSelected\.length >= 12 && Array\.from\(seenCategories\)\.length >= 5\) break;\n            }\n        }/m, "");

content = content.replace(/\/\/ Backfill popularBundles from fallback gift items if less than 5[\s\S]*?if \(popularBundlesMapped\.length >= 5\) break;\n            }\n        }/m, "");

content = content.replace(/\/\/ Backfill fastDelivery from fallback individual items if less than 6[\s\S]*?if \(fastDeliveryMapped\.length >= 6\) break;\n            }\n        }/m, "");

// 5. Simplify the global catch
const catchOldRegex = /} catch \(error: any\) {[\s\S]*?}\n}/;
const catchNew = `} catch (error: any) {
        console.error("Landing Products API exception:", error);
        
        return new NextResponse(
            JSON.stringify({ popularBundles: [], fastDelivery: [] }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                }
            }
        );
    }
}`;
content = content.replace(catchOldRegex, catchNew);

fs.writeFileSync(targetFile, content);
console.log("File updated successfully.");
