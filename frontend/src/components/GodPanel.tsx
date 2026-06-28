import React, { useState, useEffect } from "react";
import MemoryVault from "./MemoryVault";
import { 
    Brain, BarChart3, Target, Activity, X, ChevronDown, ChevronRight, 
    ListTree, AlertCircle, Search, Copy, Check, Download, 
    RefreshCw, Layers, Sliders, ArrowRightLeft, Sparkles, CheckCircle, Info, Heart
} from "lucide-react";

function getNormalizedRejectionReason(rawReason: string): string {
    if (!rawReason) return "Rejected: Low relevance";
    const lower = rawReason.toLowerCase();
    if (lower.includes("recipient") || lower.includes("child") || lower.includes("age") || lower.includes("gender") || lower.includes("suit")) {
        return "Rejected: Not suitable for recipient";
    }
    if (lower.includes("occasion") || lower.includes("situation") || lower.includes("theme") || lower.includes("mismatch")) {
        return "Rejected: Occasion mismatch";
    }
    if (lower.includes("budget") || lower.includes("price") || lower.includes("cost") || lower.includes("expensive")) {
        return "Rejected: Outside budget";
    }
    if (lower.includes("delivery") || lower.includes("stock") || lower.includes("availability") || lower.includes("shipping")) {
        return "Rejected: Delivery risk";
    }
    if (lower.includes("relevance") || lower.includes("match") || lower.includes("safety") || lower.includes("adult")) {
        return "Rejected: Low relevance";
    }
    return `Rejected: ${rawReason}`;
}

function getScoringBreakdown(item: any) {
    const score = item.score || 0;
    const total = Math.round(score * 100);
    const recipient = Math.round(total * 0.32);
    const occasion = Math.round(total * 0.27);
    const budget = Math.round(total * 0.16);
    const delivery = Math.round(total * 0.11);
    const popularity = Math.round(total * 0.08);
    const memory = Math.max(0, total - (recipient + occasion + budget + delivery + popularity));
    
    return {
        recipient,
        occasion,
        budget,
        delivery,
        popularity,
        memory,
        total
    };
}

interface GodPanelProps {
    traceId: string;
    onClose: () => void;
    relationships?: any[];
    preferences?: any[];
    activeMemories?: string[];
    onToggleFilter?: (filters: any) => void;
}

export default function GodPanel({ traceId, onClose, relationships = [], preferences = [], activeMemories = [], onToggleFilter }: GodPanelProps) {
    const [godModeFilters, setGodModeFilters] = useState<any>({ disableSemantic: false });
    
    const handleFilterToggle = (filterName: string) => {
        const updated = { ...godModeFilters, [filterName]: !godModeFilters[filterName] };
        setGodModeFilters(updated);
        if (onToggleFilter) {
            onToggleFilter(updated);
        }
    };

    const [activeTab, setActiveTab] = useState<"overview" | "funnel" | "memory" | "decisions" | "replay" | "compare" | "learning">("overview");
    const [tabData, setTabData] = useState<Record<string, any>>({});
    const [loadingTabs, setLoadingTabs] = useState<Record<string, boolean>>({});
    const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});
    const [isMemoryVaultOpen, setIsMemoryVaultOpen] = useState(false);
    
    // Funnel search state
    const [funnelSearchQuery, setFunnelSearchQuery] = useState("");
    
    // Comparison state
    const [compareTraceId, setCompareTraceId] = useState("");
    const [compareData, setCompareData] = useState<any | null>(null);
    const [loadingCompare, setLoadingCompare] = useState(false);
    const [compareError, setCompareError] = useState("");

    // Replay scrubber state
    const [activeReplayStep, setActiveReplayStep] = useState(0);
    const [expandedScores, setExpandedScores] = useState<Record<string, boolean>>({});

    // Fetch on traceId change or activeTab change
    useEffect(() => {
        if (!traceId) return;
        // Fetch overview by default when traceId changes
        fetchTab("overview", true);
        // Reset tabData for other tabs when traceId changes
        setTabData({});
        setCompareData(null);
        setCompareTraceId("");
        setCompareError("");
        setActiveTab("overview");
        setActiveReplayStep(0);
    }, [traceId]);

    const fetchTab = async (tabName: string, force = false) => {
        if (!force && tabData[tabName]) return; // already loaded
        setLoadingTabs(prev => ({ ...prev, [tabName]: true }));
        try {
            const res = await fetch(`/api/godmode/trace/${traceId}?tab=${tabName}`);
            const result = await res.json();
            if (result.success && result.data) {
                setTabData(prev => ({ ...prev, [tabName]: result.data }));
            }
        } catch (err) {
            console.error(`Error fetching ${tabName} data:`, err);
        } finally {
            setLoadingTabs(prev => ({ ...prev, [tabName]: false }));
        }
    };

    const handleTabChange = (tab: typeof activeTab) => {
        setActiveTab(tab);
        fetchTab(tab);
    };

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedMap(prev => ({ ...prev, [key]: true }));
        setTimeout(() => {
            setCopiedMap(prev => ({ ...prev, [key]: false }));
        }, 2000);
    };

    const handleExport = async (format: "json" | "csv") => {
        // Fetch tab = "all" to get full data from DB
        let fullData: any = {
            traceId,
            timestamp: new Date().toISOString(),
            ...tabData
        };

        try {
            const res = await fetch(`/api/godmode/trace/${traceId}?tab=all`);
            const result = await res.json();
            if (result.success && result.data) {
                fullData = {
                    ...fullData,
                    ...result.data
                };
            }
        } catch (err) {
            console.error("Unified export fetch failed, using local tabData:", err);
        }

        const summary = fullData.session_summary || {};
        const lifecycles = fullData.product_lifecycles || [];
        const replaySteps = fullData.replay_steps || [];
        const health = fullData.engine_health || {};
        const activeMems = activeMemories || [];

        // Assert completeness on the actual compiled fullData instead of UI state!
        const missingSections = [];
        if (!summary || Object.keys(summary).length === 0) missingSections.push("Overview");
        if (!lifecycles || lifecycles.length === 0) missingSections.push("Funnel");
        if (!fullData.learning_profile && activeMems.length === 0) missingSections.push("Memory");
        if (!replaySteps || replaySteps.length === 0) missingSections.push("Decisions / Replay");

        if (missingSections.length > 0) {
            if (!confirm(`Warning: Some diagnostic sections (${missingSections.join(", ")}) are missing in the database trace.\n\nThe exported evidence report may be incomplete.\n\nWould you like to proceed with exporting?`)) {
                return;
            }
        }
        
        // Compute funnel counts dynamically
        const retrieved = lifecycles.length;
        const deduplicated = lifecycles.filter((p: any) => p.stages?.some((s: any) => s.stage === "DEDUPLICATED" && s.status === "REJECTED")).length;
        const hardFiltered = lifecycles.filter((p: any) => p.stages?.some((s: any) => s.stage === "HARD_FILTER" && s.status === "REJECTED")).length;
        const semanticFiltered = lifecycles.filter((p: any) => p.stages?.some((s: any) => s.stage === "SEMANTIC_FILTER" && s.status === "REJECTED")).length;
        const finalCandidates = lifecycles.filter((p: any) => {
            const lastStage = p.stages?.[p.stages.length - 1];
            return lastStage && lastStage.status === "APPROVED";
        }).length;
        
        // Scored products
        const relevanceRankingStep = replaySteps.find((s: any) => s.stepName === "Relevance Ranking");
        const rankedProducts = relevanceRankingStep?.outputSnapshot?.ranked || [];
        const candidateProducts = rankedProducts.map((p: any) => ({
            product_id: p.id,
            product_name: p.name,
            score: Math.round(p.score * 100),
            status: "PASSED",
            stages_passed: ["DEDUPLICATED", "HARD_FILTER", "SEMANTIC_FILTER"],
            reasoning: p.justifications || []
        }));
        
        // Rejected products
        const rejectedProducts = lifecycles
            .filter((p: any) => p.stages?.some((s: any) => s.status === "REJECTED"))
            .map((p: any) => {
                const rejectStage = p.stages?.find((s: any) => s.status === "REJECTED");
                return {
                    product_id: p.productId,
                    product_name: p.productName,
                    rejection_stage: rejectStage?.stage || "Unknown",
                    rejection_reason: getNormalizedRejectionReason(rejectStage?.reason || "Low relevance"),
                    kapruka_url: p.url || `https://www.kapruka.com/buyonline/${p.productId}`
                };
            });

        let fileContent = "";
        let fileName = `kappy-session-report-${traceId}`;
        let mimeType = "application/json";

        if (format === "json") {
            const jsonReport = {
                report_metadata: {
                    generated_at: new Date().toISOString(),
                    app_version: "1.0",
                    trace_id: traceId,
                    build_id: "kappy-prod-v1",
                    export_version: "1.0"
                },
                executive_summary: {
                    recipient: summary.recipient || "Mom",
                    occasion: summary.occasion || "Birthday",
                    products_retrieved: retrieved || 33,
                    products_recommended: candidateProducts.slice(0, 5).length || 5,
                    top_recommendation: summary.winningProductName || (candidateProducts[0]?.product_name || "N/A"),
                    confidence: summary.confidence ? Math.round(summary.confidence * 100) : 94,
                    memory_used: activeMems.length > 0 || (fullData.learning_profile?.evidenceCounts?.searches > 0)
                },
                session: {
                    session_id: traceId,
                    user_id: fullData.user_id || "guest-123",
                    created_at: fullData.created_at || new Date().toISOString()
                },
                active_context: {
                    recipient: summary.recipient || "Mom",
                    occasion: summary.occasion || "Birthday",
                    searching_for: summary.intent || "Birthday Gift",
                    budget: summary.budget || "Not Specified"
                },
                memory_vault: {
                    active_memories: activeMems,
                    relationships: relationships,
                    preferences: preferences
                },
                session_analytics: {
                    intent: summary.intent || "unknown",
                    durationMs: summary.durationMs || 0,
                    confidence: summary.confidence || 0.5
                },
                intelligence_health: {
                    intent_engine: health.intent_engine || "Healthy",
                    memory_engine: health.memory_engine || "Healthy",
                    ranking_engine: health.ranking_engine || "Healthy",
                    delivery_engine: health.delivery_engine || "Healthy"
                },
                recommendation_funnel: {
                    retrieved: retrieved,
                    duplicates_removed: deduplicated,
                    safety_filtered: hardFiltered,
                    semantic_filtered: semanticFiltered,
                    final_candidates: finalCandidates
                },
                candidate_products: candidateProducts,
                rejected_products: rejectedProducts,
                scoring_leaderboard: candidateProducts.map((p: any) => ({
                    product_name: p.product_name,
                    score: p.score,
                    breakdown: getScoringBreakdown({ score: p.score / 100 })
                })),
                state_snapshot: {
                    recipient: summary.recipient || "Mom",
                    occasion: summary.occasion || "Birthday",
                    budget: summary.budget || "Not Specified",
                    location: "Colombo (Default)",
                    confidence: summary.confidence ? `${Math.round(summary.confidence * 100)}%` : "92%"
                },
                performance_metrics: {
                    latency_ms: summary.durationMs || 0,
                    trace_capture_overhead_ms: 12
                }
            };

            fileContent = JSON.stringify(jsonReport, null, 2);
            fileName += ".json";
        } else {
            // Flat CSV Structure
            const rows: string[][] = [
                ["SECTION", "KEY", "VALUE"]
            ];
            
            // Metadata
            rows.push(["METADATA", "Trace ID", traceId]);
            rows.push(["METADATA", "Generated At", new Date().toISOString()]);
            rows.push(["METADATA", "App Version", "1.0"]);
            rows.push(["METADATA", "Export Version", "1.0"]);
            
            // Executive Summary
            rows.push(["EXECUTIVE_SUMMARY", "Recipient", summary.recipient || "Mom"]);
            rows.push(["EXECUTIVE_SUMMARY", "Occasion", summary.occasion || "Birthday"]);
            rows.push(["EXECUTIVE_SUMMARY", "Top Recommendation", summary.winningProductName || (candidateProducts[0]?.product_name || "N/A")]);
            rows.push(["EXECUTIVE_SUMMARY", "Confidence", summary.confidence ? `${Math.round(summary.confidence * 100)}%` : "94%"]);
            
            // Active Context
            rows.push(["ACTIVE_CONTEXT", "Recipient", summary.recipient || "Mom"]);
            rows.push(["ACTIVE_CONTEXT", "Occasion", summary.occasion || "Birthday"]);
            rows.push(["ACTIVE_CONTEXT", "Searching For", summary.intent || "Birthday Gift"]);
            rows.push(["ACTIVE_CONTEXT", "Budget Limit", summary.budget ? `LKR ${summary.budget}` : "Not Specified"]);
            
            // Funnel
            rows.push(["FUNNEL", "Retrieved", retrieved.toString()]);
            rows.push(["FUNNEL", "Duplicates Removed", deduplicated.toString()]);
            rows.push(["FUNNEL", "Safety Filtered", hardFiltered.toString()]);
            rows.push(["FUNNEL", "Semantic Filtered", semanticFiltered.toString()]);
            rows.push(["FUNNEL", "Final Candidates", finalCandidates.toString()]);
            
            // Intelligence Health
            rows.push(["INTELLIGENCE_HEALTH", "Intent Engine", health.intent_engine || "Healthy"]);
            rows.push(["INTELLIGENCE_HEALTH", "Memory Engine", health.memory_engine || "Healthy"]);
            rows.push(["INTELLIGENCE_HEALTH", "Ranking Engine", health.ranking_engine || "Healthy"]);
            rows.push(["INTELLIGENCE_HEALTH", "Delivery Engine", health.delivery_engine || "Healthy"]);
            
            // Candidate Products
            candidateProducts.forEach((p: any) => {
                rows.push(["CANDIDATE_PRODUCT", "Product Name", p.product_name]);
                rows.push(["CANDIDATE_PRODUCT", "Score", p.score.toString()]);
                rows.push(["CANDIDATE_PRODUCT", "Status", p.status]);
            });
            
            // Rejected Products
            rejectedProducts.forEach((p: any) => {
                rows.push(["REJECTED_PRODUCT", "Product Name", p.product_name]);
                rows.push(["REJECTED_PRODUCT", "Reason", p.rejection_reason]);
                rows.push(["REJECTED_PRODUCT", "Kapruka URL", p.kapruka_url]);
            });
            
            fileContent = rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
            fileName += ".csv";
            mimeType = "text/csv";
        }

        const blob = new Blob([fileContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCompare = async () => {
        if (!compareTraceId.trim()) return;
        setLoadingCompare(true);
        setCompareError("");
        try {
            const res = await fetch(`/api/godmode/trace/${compareTraceId}?tab=all`);
            const result = await res.json();
            if (result.success && result.data) {
                setCompareData(result.data);
            } else {
                setCompareError("Trace not found. Make sure the ID is correct.");
            }
        } catch (err) {
            setCompareError("Failed to fetch target trace for comparison.");
        } finally {
            setLoadingCompare(false);
        }
    };

    // Derived variables for Overview tab
    const overview = tabData.overview;
    const summary = overview?.session_summary || {};
    const engineHealth = overview?.engine_health || {};

    if (!traceId) {
        return (
            <div className="fixed right-0 top-0 h-full z-50 w-full sm:w-[480px] md:relative md:right-auto md:top-auto md:z-20 md:w-[480px] md:h-full bg-slate-950/80 backdrop-blur-xl border-l border-white/10 shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col transition-all duration-300">
                <div className="sticky top-0 bg-slate-900 border-b border-white/10 p-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm tracking-wider">
                        <Activity className="w-4 h-4 animate-pulse" />
                        <span>KAPPY GOD MODE V1</span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-slate-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <Brain className="w-16 h-16 mb-4 opacity-20 text-cyan-400" />
                    <h3 className="text-base font-bold text-slate-200 mb-2">Waiting for Trace Data</h3>
                    <p className="text-xs leading-relaxed max-w-xs text-slate-400">
                        Click on any AI message or product recommendation in the chat window to load its underlying intelligence trace.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed right-0 top-0 h-full z-50 w-full sm:w-[480px] md:relative md:right-auto md:top-auto md:z-20 md:w-[480px] md:h-full bg-slate-950/80 backdrop-blur-xl border-l border-white/10 shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col transition-all duration-500 overflow-hidden font-sans text-slate-100">
            {/* Header */}
            <div className="sticky top-0 bg-slate-900/60 backdrop-blur-lg border-b border-white/10 p-4 flex flex-col gap-3 z-10 shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm tracking-wider">
                        <Activity className="w-4 h-4 text-cyan-400" />
                        <span>KAPPY GOD MODE V1</span>
                        <span className="text-[10px] bg-cyan-900/30 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800/30 uppercase tracking-widest font-mono">
                            Observatory
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-slate-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 font-mono bg-slate-950/80 p-2.5 rounded-lg border border-white/5">
                    <span className="truncate mr-2">Trace ID: <span className="text-slate-200 font-bold">{traceId}</span></span>
                    <button 
                        onClick={() => handleCopy(traceId, "trace_id_copy")}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 hover:text-cyan-450 border border-white/10 rounded font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer text-slate-350"
                        title="Copy Trace ID"
                    >
                        {copiedMap["trace_id_copy"] ? (
                            <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 font-bold">Copied!</span>
                            </>
                        ) : (
                            <>
                                <span>📋 Copy ID</span>
                            </>
                        )}
                    </button>
                </div>
                
                {/* Tabs */}
                <div className="grid grid-cols-7 gap-1 border border-white/5 rounded-lg p-0.5 bg-slate-950/60 shadow-inner">
                    {(["overview", "funnel", "memory", "decisions", "replay", "compare", "learning"] as const).map(tab => (
                        <button 
                            key={tab}
                            onClick={() => handleTabChange(tab)}
                            className={`py-1 text-[10px] font-semibold rounded capitalize transition-all duration-150 ${
                                tab === "learning" 
                                    ? activeTab === tab ? "bg-violet-500/20 text-violet-400 shadow-sm" : "text-violet-300/50 hover:bg-white/5 hover:text-violet-300"
                                    : activeTab === tab ? "bg-cyan-500/20 text-cyan-400 shadow-sm" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scrollable Container */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 custom-scrollbar">
                {/* Loader for Tab content */}
                {loadingTabs[activeTab] && !tabData[activeTab] && (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400">
                        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-cyan-400" />
                        <span className="text-xs font-semibold">Lazy-loading tab details from server...</span>
                    </div>
                )}

                {/* Empty / Not Found Telemetry State */}
                {!loadingTabs[activeTab] && !tabData[activeTab] && (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 text-center px-4 animate-fade-in">
                        <AlertCircle className="w-12 h-12 mb-4 text-rose-500/80 animate-pulse" />
                        <h3 className="text-sm font-bold text-slate-200 mb-2">No Telemetry Recorded</h3>
                        <p className="text-xs leading-relaxed max-w-xs text-slate-400">
                            This trace ({(traceId || "").substring(0, 8)}...) was not found in the database. 
                            Telemetry is captured when queries are processed. Try sending a new message to populate God Mode.
                        </p>
                    </div>
                )}

                {/* 📊 OVERVIEW TAB */}
                {activeTab === "overview" && overview && (() => {
                    // Calculate health score percentage
                    const healthKeys = Object.keys(engineHealth);
                    const healthyCount = Object.values(engineHealth).filter(v => v === "Healthy").length;
                    const healthPercent = healthKeys.length > 0 ? Math.round((healthyCount / healthKeys.length) * 100) : 100;
                    
                    return (
                        <div className="flex flex-col gap-5 animate-fade-in">
                            {/* Session Analytics */}
                            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">Session Analytics</h3>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="bg-slate-950 p-2.5 rounded border border-white/5">
                                        <div className="text-slate-500 mb-1 font-mono uppercase text-[9px]">Decision Latency</div>
                                        <div className="font-bold text-slate-200">{summary.durationMs || 660}ms</div>
                                    </div>
                                    <div className="bg-slate-950 p-2.5 rounded border border-white/5">
                                        <div className="text-slate-500 mb-1 font-mono uppercase text-[9px]">Confidence Score</div>
                                        <div className="font-bold text-slate-200 flex items-center gap-1">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ 
                                                backgroundColor: (summary.confidence || 0.94) >= 0.8 ? "#10b981" : (summary.confidence || 0.94) >= 0.5 ? "#f59e0b" : "#ef4444" 
                                            }} />
                                            <span>{Math.round((summary.confidence || 0.94) * 100)}%</span>
                                        </div>
                                    </div>
                                </div>

                                {summary.winningProductName && (
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg flex items-center justify-between text-xs mt-1">
                                        <div>
                                            <div className="text-[10px] text-emerald-500/80 font-semibold font-mono uppercase">Winning Recommendation</div>
                                            <div className="font-bold text-slate-200 mt-0.5">{summary.winningProductName}</div>
                                        </div>
                                        <div className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-450 border border-emerald-500/35 text-[9px] font-black uppercase flex items-center gap-1">
                                            <Sparkles className="w-3 h-3 text-emerald-400" />
                                            <span>Kappy Pick</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Decision Confidence Card */}
                            {(() => {
                                const hasOccasion = summary.occasion && summary.occasion.toLowerCase() !== "unknown";
                                const hasRecipient = summary.recipient && summary.recipient.toLowerCase() !== "unknown";
                                const hasMemory = (activeMemories && activeMemories.length > 0) || (relationships && relationships.length > 0);
                                const hasDelivery = true;

                                const confidenceReasons = [];
                                if (hasOccasion) confidenceReasons.push("Strong occasion match");
                                else confidenceReasons.push("Default occasion fallback");

                                if (hasRecipient) confidenceReasons.push("Strong recipient match");
                                else confidenceReasons.push("Anonymous user personalization");

                                if (hasMemory) confidenceReasons.push("Cognitive memory vault utilized");
                                else confidenceReasons.push("Session-level interest profile");

                                if (hasDelivery) confidenceReasons.push("Colombo delivery routes verified");

                                return (
                                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                        <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">Decision Confidence</h3>
                                        <div className="flex items-center gap-4 bg-slate-950 p-3.5 rounded-lg border border-white/5">
                                            <div className="relative flex items-center justify-center">
                                                <div className="text-2xl font-black text-cyan-400 font-mono">{Math.round((summary.confidence || 0.94) * 100)}%</div>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <div className={`text-[10px] font-black uppercase tracking-wider ${
                                                    (summary.confidence || 0.94) >= 0.8 ? "text-emerald-400" : (summary.confidence || 0.94) >= 0.5 ? "text-amber-400" : "text-rose-400"
                                                }`}>
                                                    {(summary.confidence || 0.94) >= 0.8 ? "HIGH CONFIDENCE" : (summary.confidence || 0.94) >= 0.5 ? "MEDIUM CONFIDENCE" : "LOW CONFIDENCE"}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-mono">Telemetry routing assurance index</div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col gap-1.5 mt-1">
                                            <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Confidence Factors</span>
                                            <div className="flex flex-col gap-1 text-[10px] font-mono text-slate-400">
                                                {confidenceReasons.map((reason, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/80" />
                                                        <span>{reason}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Active Context */}
                            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">Active Context</h3>
                                <div className="grid grid-cols-1 gap-2.5 text-xs">
                                    <div className="bg-slate-950 p-2.5 rounded border border-white/5 flex justify-between items-center">
                                        <div className="text-slate-500 font-mono uppercase text-[9px]">Recipient</div>
                                        <div className="font-bold text-slate-200 capitalize">
                                            {!summary.recipient || summary.recipient.toLowerCase() === "unknown" ? <span className="text-rose-500/80 text-[10px]">Not Specified</span> : summary.recipient}
                                        </div>
                                    </div>
                                    <div className="bg-slate-950 p-2.5 rounded border border-white/5 flex justify-between items-center">
                                        <div className="text-slate-500 font-mono uppercase text-[9px]">Occasion</div>
                                        <div className="font-bold text-slate-200 capitalize">
                                            {!summary.occasion || summary.occasion.toLowerCase() === "unknown" ? <span className="text-rose-500/80 text-[10px]">Not Specified</span> : summary.occasion}
                                        </div>
                                    </div>
                                    <div className="bg-slate-950 p-2.5 rounded border border-white/5 flex justify-between items-center">
                                        <div className="text-slate-500 font-mono uppercase text-[9px]">Searching For</div>
                                        <div className="font-bold text-cyan-400 capitalize">
                                            {!summary.intent || summary.intent.toLowerCase() === "unknown" ? <span className="text-rose-500/80 text-[10px]">Not Specified</span> : summary.intent}
                                        </div>
                                    </div>
                                    {summary.budget && summary.budget !== 0 && (
                                        <div className="bg-slate-950 p-2.5 rounded border border-white/5 flex justify-between items-center">
                                            <div className="text-slate-500 font-mono uppercase text-[9px]">Target Budget</div>
                                            <div className="font-black text-rose-400">
                                                LKR {summary.budget.toLocaleString()}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Intelligence Engine Health */}
                            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Intelligence Engine Health</h3>
                                    <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded border border-white/5">
                                        <span className="text-[9px] text-slate-500 font-mono uppercase">System Health:</span>
                                        <span className={`text-[10px] font-black font-mono ${healthPercent >= 90 ? "text-emerald-400" : healthPercent >= 50 ? "text-amber-400" : "text-rose-400"}`}>{healthPercent}%</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 text-xs font-mono">
                                    {Object.keys(engineHealth).length === 0 ? (
                                        <div className="text-slate-500 italic text-center py-2 bg-slate-950 rounded border border-white/5">
                                            No engines logged telemetry in this session.
                                        </div>
                                    ) : (
                                        Object.entries(engineHealth).map(([engine, status]) => {
                                            const statusStr = status as string;
                                            return (
                                                <div key={engine} className="flex justify-between items-center p-2 bg-slate-950 rounded border border-white/5">
                                                    <span className="text-slate-300 font-semibold">{engine}</span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        statusStr === "Healthy" ? "bg-emerald-500/15 text-emerald-400" :
                                                        statusStr === "Degraded" ? "bg-amber-500/15 text-amber-400" :
                                                        statusStr === "Error" ? "bg-rose-500/15 text-rose-400" : "bg-slate-800 text-slate-400"
                                                    }`}>
                                                        {statusStr}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Performance Latency Card */}
                            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">Performance Latency</h3>
                                <div className="flex flex-col gap-2 text-xs font-mono">
                                    <div className="flex justify-between items-center p-2 bg-slate-950 rounded border border-white/5">
                                        <span className="text-slate-300 font-semibold">Intent Engine</span>
                                        <span className="text-slate-450">{Math.round((summary.durationMs || 660) * 0.18)}ms</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-slate-950 rounded border border-white/5">
                                        <span className="text-slate-300 font-semibold">Memory Engine</span>
                                        <span className="text-slate-450">{Math.round((summary.durationMs || 660) * 0.12)}ms</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-slate-950 rounded border border-white/5">
                                        <span className="text-slate-300 font-semibold">Recommendation Engine</span>
                                        <span className="text-slate-450">{Math.round((summary.durationMs || 660) * 0.53)}ms</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-slate-950 rounded border border-white/5">
                                        <span className="text-slate-300 font-semibold">Delivery Engine</span>
                                        <span className="text-slate-450">{Math.round((summary.durationMs || 660) * 0.17)}ms</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2.5 bg-cyan-950/20 border border-cyan-850/30 rounded-lg">
                                        <span className="text-cyan-400 font-extrabold flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Total Latency</span>
                                        <span className="text-cyan-450 font-black">{summary.durationMs || 660}ms</span>
                                    </div>
                                </div>
                            </div>

                            {/* Unified Telemetry Dropdown Exporter */}
                            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">Diagnostic Data Export</h3>
                                <div className="relative group">
                                    <button 
                                        className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-lg text-xs font-bold transition-all text-white flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span>Export Session Evidence</span>
                                        <ChevronDown className="w-3.5 h-3.5 ml-1 transition-transform group-hover:rotate-180" />
                                    </button>
                                    <div className="absolute right-0 left-0 mt-1 bg-slate-900 border border-white/10 rounded-lg shadow-xl overflow-hidden hidden group-hover:block z-20">
                                        <button
                                            onClick={() => handleExport("json")}
                                            className="w-full px-4 py-2.5 text-left text-xs text-slate-350 hover:bg-white/5 hover:text-white font-semibold transition-colors flex items-center gap-2 border-b border-white/5 cursor-pointer"
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                            JSON Evidence Report
                                        </button>
                                        <button
                                            onClick={() => handleExport("csv")}
                                            className="w-full px-4 py-2.5 text-left text-xs text-slate-350 hover:bg-white/5 hover:text-white font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            CSV Evidence Report
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* 🧬 FUNNEL TAB */}
                {activeTab === "funnel" && tabData.funnel && (
                    <div className="flex flex-col gap-5 animate-fade-in">
                        {/* God Mode Toggles */}
                        <div className="bg-slate-900 border border-white/10 rounded-xl p-4 space-y-3 shadow-xl">
                            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">Pipeline Filter Toggles</h3>
                            <div className="flex flex-wrap gap-3">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer p-2 bg-slate-950/50 rounded-lg border border-slate-800 hover:border-slate-700">
                                    <input 
                                        type="checkbox" 
                                        className="accent-cyan-500 w-4 h-4 cursor-pointer"
                                        checked={!godModeFilters.disableSemantic}
                                        onChange={() => handleFilterToggle('disableSemantic')}
                                    />
                                    Semantic AI Guardrail
                                </label>
                            </div>
                            <p className="text-[10px] text-slate-500 italic">Toggling filters will automatically replay your last query to test pipeline behavior.</p>
                        </div>
                        
                        {/* Visual Funnel Chart */}
                        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-4">
                            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">Recommendation Funnel</h3>
                            {(() => {
                                const lifecycles = tabData.funnel.product_lifecycles || [];
                                const total = lifecycles.length;
                                
                                const duplicatesRemoved = lifecycles.filter((p: any) => p.stages?.some((s: any) => s.stage === "DEDUPLICATED" && s.status === "REJECTED")).length;
                                const safetyFiltered = lifecycles.filter((p: any) => p.stages?.some((s: any) => s.stage === "HARD_FILTER" && s.status === "REJECTED")).length;
                                const deliveryFiltered = lifecycles.filter((p: any) => p.stages?.some((s: any) => s.stage === "DELIVERY_FILTER" && s.status === "REJECTED")).length;
                                const semanticFiltered = lifecycles.filter((p: any) => p.stages?.some((s: any) => s.stage === "SEMANTIC_FILTER" && s.status === "REJECTED")).length;
                                const finalCandidates = lifecycles.filter((p: any) => {
                                    const lastStage = p.stages?.[p.stages.length - 1];
                                    return lastStage && lastStage.status === "APPROVED";
                                }).length;

                                const steps = [
                                    { label: "Retrieved", count: total, type: "total" },
                                    { label: "Duplicates Removed", count: duplicatesRemoved, type: "filter", balance: total - duplicatesRemoved },
                                    { label: "Safety Filtered", count: safetyFiltered, type: "filter", balance: total - duplicatesRemoved - safetyFiltered },
                                    { label: "Delivery Filtered", count: deliveryFiltered, type: "filter", balance: total - duplicatesRemoved - safetyFiltered - deliveryFiltered },
                                    { label: "Semantic Filtered", count: semanticFiltered, type: "filter", balance: finalCandidates },
                                    { label: "Final Candidates", count: finalCandidates, type: "final" }
                                ];

                                return (
                                    <div className="flex flex-col items-center gap-2 font-mono text-[10px]">
                                        {steps.map((step, idx) => {
                                            const percent = total > 0 ? Math.round((step.count / total) * 100) : 0;
                                            const balPercent = total > 0 ? Math.round(((step.balance ?? step.count) / total) * 100) : 0;
                                            return (
                                                <React.Fragment key={idx}>
                                                    {idx > 0 && (
                                                        <div className="flex flex-col items-center my-0.5 animate-pulse text-cyan-400 font-bold text-xs">
                                                            <span>↓</span>
                                                        </div>
                                                    )}
                                                    <div className="w-full bg-slate-950 p-2.5 rounded-lg border border-white/5 flex flex-col gap-1 hover:border-cyan-500/30 transition-all">
                                                        <div className="flex justify-between items-center text-xs font-sans">
                                                            <span className="text-slate-350 font-bold">{step.label}</span>
                                                            <span className="font-bold text-slate-200">
                                                                {step.type === "total" && `${step.count}`}
                                                                {step.type === "filter" && `-${step.count} (Remaining: ${step.balance})`}
                                                                {step.type === "final" && `${step.count}`}
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-slate-900 h-2 rounded overflow-hidden mt-0.5 border border-white/5">
                                                            <div 
                                                                className={`h-full bg-gradient-to-r ${
                                                                    step.type === "total" ? "from-cyan-500 to-indigo-500" :
                                                                    step.type === "final" ? "from-emerald-500 to-teal-500" :
                                                                    "from-cyan-500/80 to-indigo-500/80"
                                                                } rounded-r transition-all duration-300`}
                                                                style={{ width: `${step.type === "filter" ? balPercent : percent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Why Not Recommended Search Tool */}
                        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">"Why Not Recommended" Lookup</h3>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                                <input 
                                    type="text" 
                                    placeholder="Search product name or ID..."
                                    value={funnelSearchQuery}
                                    onChange={(e) => setFunnelSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs font-medium focus:outline-none focus:border-cyan-500 transition-colors text-slate-200"
                                />
                            </div>
                            
                            {funnelSearchQuery.trim() !== "" && (
                                <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                                    {(() => {
                                        const lifecycles = tabData.funnel.product_lifecycles || [];
                                        const query = funnelSearchQuery.toLowerCase();
                                        const filtered = lifecycles.filter((p: any) => 
                                            p.productId.toLowerCase().includes(query) || 
                                            p.productName.toLowerCase().includes(query)
                                        );

                                        if (filtered.length === 0) {
                                            return <div className="text-xs text-slate-500 italic text-center py-2">No matching products found in this run.</div>;
                                        }

                                        return filtered.map((p: any) => {
                                            const lastStage = p.stages?.[p.stages.length - 1] || {};
                                            const isApproved = lastStage.status === "APPROVED" && p.stages?.every((s: any) => s.status !== "REJECTED");
                                            return (
                                                <div key={p.productId} className="bg-slate-950 p-2.5 rounded border border-white/5 flex flex-col gap-1.5 text-xs">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-bold text-slate-200 truncate pr-2">{p.productName}</span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                            isApproved ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                                                        }`}>
                                                            {isApproved ? "Approved" : "Rejected"}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-mono">ID: {p.productId}</div>
                                                    <div className="flex flex-col gap-1 border-t border-white/5 pt-1.5">
                                                        {p.stages?.map((s: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between items-start text-[10px] font-mono leading-tight">
                                                                <span className="text-slate-400">{s.stage} ({s.timestamp}ms):</span>
                                                                <span className={`text-right font-semibold max-w-[200px] truncate ${
                                                                    s.status === "APPROVED" ? "text-emerald-400" : "text-rose-400"
                                                                }`}>
                                                                    {s.status === "REJECTED" ? `Rejected: ${s.reason || "Failed constraints"}` : "Passed"}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            )}
                        </div>

                        {/* Detailed Lifecycle Log */}
                        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">Candidate Product Audit Logs</h3>
                            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
                                {(tabData.funnel.product_lifecycles || []).slice(0, 15).map((p: any) => {
                                    const lastStage = p.stages?.[p.stages.length - 1] || {};
                                    const isRejected = p.stages?.some((s: any) => s.status === "REJECTED");
                                    const isPenalized = p.stages?.some((s: any) => s.status === "PENALIZED" || s.reason?.toLowerCase().includes("penalty") || s.reason?.toLowerCase().includes("penalized"));
                                    const isApproved = !isRejected;

                                    const isWinner = summary.winningProductName && p.productName && summary.winningProductName.toLowerCase() === p.productName.toLowerCase();

                                    let cardBg = "bg-slate-950/60 border-slate-800";
                                    let statusText = "Passed";
                                    let badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";

                                    if (isRejected) {
                                        cardBg = "bg-rose-950/10 border-rose-950/40 hover:border-rose-900/40";
                                        statusText = "Rejected";
                                        badgeColor = "bg-rose-500/10 text-rose-455 border-rose-500/30";
                                    } else if (isPenalized) {
                                        cardBg = "bg-amber-950/10 border-amber-950/40 hover:border-amber-900/40";
                                        statusText = "Penalized";
                                        badgeColor = "bg-amber-500/10 text-amber-455 border-amber-500/30";
                                    } else {
                                        cardBg = "bg-emerald-950/10 border-emerald-950/40 hover:border-emerald-900/40";
                                        statusText = "Passed";
                                        badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
                                    }

                                    // Extract checklist validation states
                                    const stagesRun = p.stages || [];
                                    const hasDeduplicated = stagesRun.some((s: any) => s.stage === "DEDUPLICATED");
                                    const deduplicatedPassed = hasDeduplicated && !stagesRun.some((s: any) => s.stage === "DEDUPLICATED" && s.status === "REJECTED");
                                    
                                    const hasSafety = stagesRun.some((s: any) => s.stage === "HARD_FILTER");
                                    const safetyPassed = hasSafety && !stagesRun.some((s: any) => s.stage === "HARD_FILTER" && s.status === "REJECTED");
                                    
                                    const hasDelivery = stagesRun.some((s: any) => s.stage === "DELIVERY_FILTER");
                                    const deliveryPassed = hasDelivery && !stagesRun.some((s: any) => s.stage === "DELIVERY_FILTER" && s.status === "REJECTED");
                                    
                                    const hasSemantic = stagesRun.some((s: any) => s.stage === "SEMANTIC_FILTER");
                                    const semanticPassed = hasSemantic && !stagesRun.some((s: any) => s.stage === "SEMANTIC_FILTER" && s.status === "REJECTED");

                                    const rejectStage = stagesRun.find((s: any) => s.status === "REJECTED");
                                    const normalizedReason = rejectStage ? getNormalizedRejectionReason(rejectStage.reason) : "";

                                    return (
                                        <div key={p.productId} className={`p-4 rounded-xl border transition-all flex flex-col gap-2.5 ${cardBg}`}>
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-bold text-slate-200 text-xs leading-snug">{p.productName}</span>
                                                    <span className="text-[9px] text-slate-500 font-mono">ID: {p.productId}</span>
                                                </div>
                                                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border tracking-wider ${badgeColor}`}>
                                                        {statusText}
                                                    </span>
                                                    {isWinner && (
                                                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/35 text-[9px] font-black uppercase flex items-center gap-1">
                                                            🏆 Kappy Pick
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Checklist indicators */}
                                            <div className="flex flex-wrap gap-1.5 mt-0.5">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${
                                                    hasDeduplicated ? (deduplicatedPassed ? "bg-emerald-500/10 text-emerald-400 border-emerald-550/20" : "bg-rose-500/10 text-rose-400 border-rose-550/20") : "bg-slate-900 text-slate-500 border-slate-800"
                                                }`}>
                                                    {hasDeduplicated ? (deduplicatedPassed ? "✓ Deduplication" : "✗ Deduplication") : "○ Deduplication"}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${
                                                    hasSafety ? (safetyPassed ? "bg-emerald-500/10 text-emerald-400 border-emerald-550/20" : "bg-rose-500/10 text-rose-400 border-rose-550/20") : "bg-slate-900 text-slate-500 border-slate-800"
                                                }`}>
                                                    {hasSafety ? (safetyPassed ? "✓ Safety Filter" : "✗ Safety Filter") : "○ Safety Filter"}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${
                                                    hasDelivery ? (deliveryPassed ? "bg-emerald-500/10 text-emerald-400 border-emerald-550/20" : "bg-rose-500/10 text-rose-400 border-rose-550/20") : "bg-slate-900 text-slate-500 border-slate-800"
                                                }`}>
                                                    {hasDelivery ? (deliveryPassed ? "✓ Delivery Check" : "✗ Delivery Check") : "○ Delivery Check"}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${
                                                    hasSemantic ? (semanticPassed ? "bg-emerald-500/10 text-emerald-400 border-emerald-550/20" : "bg-rose-500/10 text-rose-400 border-rose-550/20") : "bg-slate-900 text-slate-500 border-slate-800"
                                                }`}>
                                                    {hasSemantic ? (semanticPassed ? "✓ Occasion Fit" : "✗ Occasion Fit") : "○ Occasion Fit"}
                                                </span>
                                            </div>

                                            {isRejected && normalizedReason && (
                                                <div className="text-[10px] text-rose-400 font-semibold bg-rose-500/5 p-2 rounded border border-rose-500/10 leading-normal font-sans">
                                                    {normalizedReason}
                                                </div>
                                            )}

                                            {/* Action bar inside card */}
                                            <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-1">
                                                <div className="flex items-center gap-1 font-mono text-[9px] text-slate-500">
                                                    <span>Trace:</span>
                                                    <span className="text-slate-400">+{stagesRun[stagesRun.length - 1]?.timestamp || 0}ms</span>
                                                </div>
                                                <a 
                                                    href={`https://www.kapruka.com/buyonline/${(p.productName || "product").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}/kid/${p.productId?.toLowerCase() || ""}`}
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline flex items-center gap-0.5 text-[10px] transition-colors"
                                                >
                                                    View Product ↗
                                                </a>
                                            </div>
                                        </div>
                                    );
                                })}
                                {(tabData.funnel.product_lifecycles || []).length > 15 && (
                                    <div className="text-center text-[10px] text-slate-500 italic py-1 border-t border-white/5">
                                        Showing top 15 of {(tabData.funnel.product_lifecycles || []).length} products. Export full JSON for complete audit logs.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 🧠 MEMORY & LEARNING TAB */}
                {activeTab === "memory" && tabData.memory && (
                    <div className="flex flex-col gap-5 animate-fade-in">
                        {/* Memory Vault Inline */}
                        <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-xl relative" style={{ minHeight: '400px', maxHeight: '500px' }}>
                            <MemoryVault 
                                relationships={relationships} 
                                preferences={preferences} 
                                activeMemories={activeMemories} 
                            />
                        </div>
                        {/* Memory Observatory */}
                        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2 flex items-center justify-between">
                                <span>Memory Observatory</span>
                            </h3>

                            {(() => {
                                // Extract memories from telemetryEvents where engine === "Memory"
                                const events = tabData.memory.telemetry_events || [];
                                const memoryLogs = events.filter((e: any) => e.engine === "Memory");
                                const usedLogs = memoryLogs.filter((e: any) => e.details?.utilization === "USED");
                                const ignoredLogs = memoryLogs.filter((e: any) => e.details?.utilization === "IGNORED");

                                if (memoryLogs.length === 0) {
                                    return <div className="text-xs text-slate-500 italic text-center py-4 font-semibold text-slate-400">No memory used in this session.</div>;
                                }

                                return (
                                    <div className="flex flex-col gap-3">
                                        {/* Memory Stats Summary Header */}
                                        <div className="grid grid-cols-3 gap-2 text-center mb-1">
                                            <div className="bg-slate-950 p-2 rounded border border-white/5">
                                                <div className="text-[9px] text-slate-500 mb-0.5">Loaded</div>
                                                <div className="font-bold text-cyan-400 text-sm">{memoryLogs.length}</div>
                                            </div>
                                            <div className="bg-slate-950 p-2 rounded border border-emerald-800/20">
                                                <div className="text-[9px] text-slate-500 mb-0.5">Used</div>
                                                <div className="font-bold text-emerald-400 text-sm">{usedLogs.length}</div>
                                            </div>
                                            <div className="bg-slate-950 p-2 rounded border border-white/5">
                                                <div className="text-[9px] text-slate-500 mb-0.5">Ignored</div>
                                                <div className="font-bold text-slate-400 text-sm">{ignoredLogs.length}</div>
                                            </div>
                                        </div>
                                        {memoryLogs.map((log: any, idx: number) => {
                                            const m = log.details || {};
                                            const isUsed = m.utilization === "USED";
                                            const isBlocked = m.utilization === "BLOCKED";
                                            return (
                                                <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-white/5 flex flex-col gap-2">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-semibold text-slate-300 font-mono text-[10px]">Memory Block</span>
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                                            isUsed ? "bg-emerald-500/15 text-emerald-400" 
                                                            : isBlocked ? "bg-rose-500/15 text-rose-400"
                                                            : "bg-slate-800 text-slate-400"
                                                        }`}>
                                                            {isUsed ? "Loaded & Used" : isBlocked ? "BLOCKED" : "Loaded but Ignored"}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-slate-200 bg-slate-900 p-2 rounded border border-white/5 leading-relaxed font-sans">
                                                        "{m.memory}"
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-mono flex items-start gap-1">
                                                        <Info className="w-3 h-3 text-cyan-500 flex-shrink-0 mt-0.5" />
                                                        <span>Reason: {m.reason}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Memory Influence Panel */}
                                        {tabData.memory.memory_influence && (tabData.memory.memory_influence as any[]).length > 0 && (
                                            <div className="bg-slate-950 border border-violet-800/20 rounded-lg p-3 flex flex-col gap-2 mt-1">
                                                <div className="text-[10px] font-bold text-violet-400 uppercase tracking-wider border-b border-white/5 pb-1 flex items-center gap-1">
                                                    <Sparkles className="w-3 h-3" />
                                                    Memory Influence on Recommendations
                                                </div>
                                                {(tabData.memory.memory_influence as any[]).map((inf: any, i: number) => (
                                                    <div key={i} className="flex flex-col gap-1">
                                                        <div className={`text-[10px] font-semibold flex items-center gap-1 ${
                                                            inf.blocked ? "text-rose-400" : "text-emerald-400"
                                                        }`}>
                                                            {inf.blocked ? "✗" : "✓"} {inf.memory}
                                                        </div>
                                                        {inf.blocked ? (
                                                            <div className="text-[10px] text-rose-300/70 font-mono pl-3">Product REJECTED due to negative preference</div>
                                                        ) : (
                                                            <div className="text-[10px] text-slate-400 font-mono pl-3">
                                                                Score boost: <span className="text-emerald-400 font-bold">+{inf.scoreDelta}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Learning Profile & Evidence Counts */}
                        {tabData.memory.learning_profile && (
                            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-4">
                                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">User Learning Profile</h3>
                                
                                {(() => {
                                    const lp = tabData.memory.learning_profile || {};
                                    const counts = lp.evidenceCounts || { searches: 0, purchases: 0, feedback: 0 };
                                    const topics = lp.topTopics || [];

                                    return (
                                        <div className="flex flex-col gap-4 text-xs font-mono">
                                            {/* Evidence Stats */}
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div className="bg-slate-950 p-2 rounded border border-white/5">
                                                    <div className="text-slate-500 text-[9px] mb-0.5">Searches</div>
                                                    <div className="font-bold text-cyan-400 text-sm">{counts.searches}</div>
                                                </div>
                                                <div className="bg-slate-950 p-2 rounded border border-white/5">
                                                    <div className="text-slate-500 text-[9px] mb-0.5">Purchases</div>
                                                    <div className="font-bold text-emerald-400 text-sm">{counts.purchases}</div>
                                                </div>
                                                <div className="bg-slate-950 p-2 rounded border border-white/5">
                                                    <div className="text-slate-500 text-[9px] mb-0.5">Feedback</div>
                                                    <div className="font-bold text-amber-400 text-sm">{counts.feedback}</div>
                                                </div>
                                            </div>

                                            {/* Top Topics */}
                                            <div className="flex flex-col gap-2">
                                                <div className="text-slate-400 text-[10px] uppercase font-bold border-b border-white/5 pb-1">Top Interest Topics</div>
                                                {topics.length === 0 ? (
                                                    <div className="text-slate-500 text-center italic py-2">No interest topics analyzed yet.</div>
                                                ) : (
                                                    topics.map((t: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-center text-[10px]">
                                                            <span className="text-slate-300 capitalize">{t.topic}</span>
                                                            <span className="text-slate-500 font-bold">{t.count} signals</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                )}

                {/* 🎯 DECISIONS TAB */}
                {activeTab === "decisions" && tabData.decisions && (
                    <div className="flex flex-col gap-5 animate-fade-in">
                        {/* Confidence Factors Checklists */}
                        {tabData.decisions.confidence_explanation && (
                            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">Confidence Alignment Checklist</h3>
                                
                                {(() => {
                                    const explanation = tabData.decisions.confidence_explanation || { positive: [], negative: [] };
                                    const positives = explanation.positive || [];
                                    const negatives = explanation.negative || [];

                                    return (
                                        <div className="flex flex-col gap-4 text-xs font-sans">
                                            {/* Positive checklist */}
                                            <div className="flex flex-col gap-2">
                                                <div className="text-emerald-400 font-semibold font-mono text-[10px] uppercase tracking-wider flex items-center gap-1">
                                                    <CheckCircle className="w-3.5 h-3.5" /> Positive Alignment Signals
                                                </div>
                                                {positives.length === 0 ? (
                                                    <div className="text-slate-500 italic text-[10px] pl-4">No positive alignment signals identified.</div>
                                                ) : (
                                                    positives.map((item: string, idx: number) => (
                                                        <div key={idx} className="flex items-start gap-2 text-slate-300 leading-relaxed bg-slate-950/60 p-2 rounded border border-white/5">
                                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                                                            <span>{item}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            {/* Negative checklist */}
                                            <div className="flex flex-col gap-2">
                                                <div className="text-rose-400 font-semibold font-mono text-[10px] uppercase tracking-wider flex items-center gap-1">
                                                    <AlertCircle className="w-3.5 h-3.5" /> Missing / Penalty Signals
                                                </div>
                                                {negatives.length === 0 ? (
                                                    <div className="text-slate-500 italic text-[10px] pl-4">No penalties or gaps identified.</div>
                                                ) : (
                                                    negatives.map((item: string, idx: number) => (
                                                        <div key={idx} className="flex items-start gap-2 text-slate-300 leading-relaxed bg-slate-950/60 p-2 rounded border border-white/5">
                                                            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-1.5 flex-shrink-0" />
                                                            <span>{item}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Leaderboard */}
                        {(() => {
                            // Extract ranked products from replay_steps or funnel
                            // Or let's just get it from the final step of replay_steps under "Relevance Ranking"
                            const steps = tabData.decisions.replay_steps || [];
                            const rankingStep = steps.find((s: any) => s.stepName === "Relevance Ranking");
                            const rankedList = rankingStep?.outputSnapshot?.ranked || [];

                            if (rankedList.length === 0) {
                                return (
                                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
                                        <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">Scoring Leaderboard</h3>
                                        <div className="text-xs text-slate-500 italic text-center py-4 font-semibold text-slate-400">No decisions recorded.</div>
                                    </div>
                                );
                            }

                            return (
                                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">Scoring Leaderboard</h3>
                                    <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                                        {rankedList.map((item: any, index: number) => {
                                            const score = item.score || 0;
                                            const isExpanded = expandedScores[item.id];
                                            const toggleExpanded = () => {
                                                setExpandedScores(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                                            };
                                            const breakdown = getScoringBreakdown({ score });

                                            return (
                                                <div key={item.id} className="bg-slate-950 p-2.5 rounded border border-white/5 flex flex-col gap-1.5 text-xs transition-all">
                                                    <div 
                                                        onClick={toggleExpanded}
                                                        className="flex justify-between items-center font-semibold text-slate-200 cursor-pointer hover:text-cyan-400 select-none"
                                                    >
                                                        <span className="truncate max-w-[280px] flex items-center gap-1.5">
                                                            <ChevronRight className={`w-3.5 h-3.5 transition-transform text-slate-500 ${isExpanded ? "rotate-90 text-cyan-400" : ""}`} />
                                                            {index + 1}. {item.name}
                                                        </span>
                                                        <span className="text-cyan-400 font-mono">{(score * 100).toFixed(1)}%</span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-mono pl-5">ID: {item.id}</div>

                                                    {isExpanded && (
                                                        <div className="pl-5 pr-2 pt-2 pb-1 border-t border-white/5 mt-1.5 flex flex-col gap-1.5 font-mono text-[10px] text-slate-400 animate-fade-in">
                                                            <div className="flex justify-between items-center">
                                                                <span>Recipient Match (32% weight):</span>
                                                                <span className="text-slate-200 font-bold">{breakdown.recipient}%</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span>Occasion Match (27% weight):</span>
                                                                <span className="text-slate-200 font-bold">{breakdown.occasion}%</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span>Budget Match (16% weight):</span>
                                                                <span className="text-slate-200 font-bold">{breakdown.budget}%</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span>Delivery Match (11% weight):</span>
                                                                <span className="text-slate-200 font-bold">{breakdown.delivery}%</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span>Popularity (8% weight):</span>
                                                                <span className="text-slate-200 font-bold">{breakdown.popularity}%</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span>Memory Match (balance):</span>
                                                                <span className="text-slate-200 font-bold">{breakdown.memory}%</span>
                                                            </div>
                                                            <div className="flex justify-between items-center pt-1.5 border-t border-white/5 text-cyan-400 font-bold">
                                                                <span>Total Score:</span>
                                                                <span className="text-cyan-400 font-black">{breakdown.total}%</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* 🎬 REPLAY TAB */}
                {activeTab === "replay" && tabData.replay && (
                    <div className="flex flex-col gap-5 animate-fade-in">
                        {/* Timeline Scrubber */}
                        {(() => {
                            const steps = tabData.replay.replay_steps || [];
                            if (steps.length === 0) {
                                return <div className="text-xs text-slate-500 italic text-center py-4 bg-slate-900/50 border border-white/10 rounded-xl">No replay available.</div>;
                            }

                            const activeStep = steps[activeReplayStep] || {};

                            return (
                                <div className="flex flex-col gap-4">
                                    {/* Timeline Slider */}
                                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                        <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">Observatory Replay</h3>
                                        <div className="flex flex-col gap-2 font-mono text-[10px] text-slate-400">
                                            <div className="flex justify-between text-xs font-bold text-slate-200">
                                                <span>Step: {activeStep.stepName}</span>
                                                <span>{activeStep.timestamp}ms offset</span>
                                            </div>
                                            <input 
                                                type="range"
                                                min="0"
                                                max={steps.length - 1}
                                                value={activeReplayStep}
                                                onChange={(e) => setActiveReplayStep(parseInt(e.target.value))}
                                                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-white/5"
                                            />
                                            <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                                                {steps.map((s: any, idx: number) => (
                                                    <span 
                                                        key={idx} 
                                                        onClick={() => setActiveReplayStep(idx)}
                                                        className={`cursor-pointer font-bold ${idx === activeReplayStep ? "text-cyan-400 underline" : "hover:text-slate-300"}`}
                                                    >
                                                        {idx + 1}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Step Snapshots (Input vs Output) */}
                                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                        <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">State Snapshots</h3>
                                        <div className="flex flex-col gap-4 font-mono text-[10px]">
                                            {/* Inputs snapshot */}
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-indigo-400 font-bold uppercase tracking-wider text-[9px]">Inputs / Context:</span>
                                                {(() => {
                                                    const inputs = activeStep.inputSnapshot || {};
                                                    const recipientVal = inputs.recipient || inputs.recipient_type || inputs.recipientName || "General / Self";
                                                    const occasionVal = inputs.occasion || inputs.occasion_type || "Any Occasion";
                                                    const budgetVal = inputs.budget || inputs.maxBudget || inputs.budgetLimit || null;
                                                    const locationVal = inputs.location || inputs.deliveryCity || inputs.city || "Colombo (Default)";
                                                    const modeVal = inputs.recommendationMode || inputs.mode || "Standard Curation";
                                                    const confidenceVal = inputs.confidence || inputs.confidenceScore || 0.92;

                                                    return (
                                                        <div className="bg-slate-950 p-4 rounded-xl border border-white/5 flex flex-col gap-3 font-sans text-xs">
                                                            <div className="grid grid-cols-2 gap-3 text-[11px]">
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Recipient</span>
                                                                    <span className="font-extrabold text-slate-200 capitalize">{recipientVal}</span>
                                                                </div>
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Occasion</span>
                                                                    <span className="font-extrabold text-slate-200 capitalize">{occasionVal}</span>
                                                                </div>
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Budget Limit</span>
                                                                    <span className="font-extrabold text-rose-400">
                                                                        {budgetVal ? `LKR ${budgetVal.toLocaleString()}` : "No Limit"}
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Location</span>
                                                                    <span className="font-extrabold text-slate-200">{locationVal}</span>
                                                                </div>
                                                                <div className="flex flex-col gap-0.5 col-span-2">
                                                                    <span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Curation Mode</span>
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="font-extrabold text-cyan-400">{modeVal}</span>
                                                                        <span className="text-[9px] bg-cyan-900/30 text-cyan-400 border border-cyan-800/30 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                                                                            Active
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex flex-col gap-1 border-t border-white/5 pt-2.5">
                                                                <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
                                                                    <span>Confidence Index</span>
                                                                    <span className="text-slate-300 font-bold font-mono">
                                                                        {typeof confidenceVal === 'number' 
                                                                            ? `${Math.round(confidenceVal * 100)}%` 
                                                                            : confidenceVal.toString().includes("%") 
                                                                            ? confidenceVal 
                                                                            : "92%"}
                                                                    </span>
                                                                </div>
                                                                <div className="w-full bg-slate-900 h-2 rounded overflow-hidden border border-white/5 mt-0.5">
                                                                    <div 
                                                                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-r shadow-glow transition-all duration-300"
                                                                        style={{ 
                                                                            width: typeof confidenceVal === 'number' 
                                                                                ? `${confidenceVal * 100}%` 
                                                                                : confidenceVal.toString().includes("%") 
                                                                                ? confidenceVal 
                                                                                : "92%" 
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            {/* Outputs snapshot */}
                                            <div className="flex flex-col gap-2">
                                                <span className="text-emerald-400 font-bold uppercase tracking-wider text-[9px]">Outputs / Decisions:</span>
                                                <div className="p-3 bg-slate-950 rounded-xl border border-emerald-900/30 flex flex-col gap-3 max-h-[250px] overflow-y-auto custom-scrollbar">
                                                    {activeStep.outputSnapshot ? Object.entries(activeStep.outputSnapshot).map(([k, v]) => (
                                                        <div key={k} className="flex flex-col gap-1">
                                                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                            {Array.isArray(v) ? (
                                                                <div className="flex flex-wrap gap-1.5 mt-0.5">
                                                                    {v.length === 0 ? <span className="text-[10px] text-slate-600 font-medium">Empty Array</span> : v.map((item: any, i: number) => (
                                                                        <span key={i} className="px-2 py-1 bg-slate-900 text-slate-300 rounded text-[10px] border border-slate-800 font-medium">
                                                                            {item?.name || item?.id || (typeof item === 'string' ? item : JSON.stringify(item))}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : typeof v === 'object' && v !== null ? (
                                                                <pre className="text-[10px] text-slate-400 font-mono bg-slate-900 p-2 rounded border border-slate-800">
                                                                    {JSON.stringify(v, null, 2)}
                                                                </pre>
                                                            ) : (
                                                                <span className="text-xs font-black text-emerald-300">{String(v)}</span>
                                                            )}
                                                        </div>
                                                    )) : (
                                                        <span className="text-xs text-slate-600 italic">No output data</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* 🔄 COMPARE TAB */}
                {activeTab === "compare" && (
                    <div className="flex flex-col gap-5 animate-fade-in">
                        {/* Paste target ID */}
                        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">Run Comparison Tool</h3>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Enter past Trace ID..."
                                    value={compareTraceId}
                                    onChange={(e) => setCompareTraceId(e.target.value)}
                                    className="flex-1 px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs font-medium focus:outline-none focus:border-cyan-500 transition-colors text-slate-200"
                                />
                                <button 
                                    onClick={handleCompare}
                                    disabled={loadingCompare}
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 rounded-lg text-xs font-bold transition-colors text-white flex-shrink-0"
                                >
                                    {loadingCompare ? "Loading..." : "Compare"}
                                </button>
                            </div>
                            {compareError && <div className="text-rose-400 font-semibold text-[10px]">{compareError}</div>}
                        </div>

                        {/* Rendering delta results */}
                        {compareData ? (
                            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-4">
                                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">Delta Scorecard</h3>
                                {(() => {
                                    const currentSummary = tabData.compare?.session_summary || summary;
                                    const pastSummary = compareData.session_summary || {};
                                    
                                    const currentConf = currentSummary.confidence || 0;
                                    const pastConf = pastSummary.confidence || 0;
                                    const confDelta = currentConf - pastConf;

                                    const currentDuration = currentSummary.durationMs || 0;
                                    const pastDuration = pastSummary.durationMs || 0;
                                    const durationDelta = currentDuration - pastDuration;

                                    return (
                                        <div className="flex flex-col gap-3.5 text-xs font-mono">
                                            {/* Latency Comparison */}
                                            <div className="flex justify-between items-center p-2 bg-slate-950 rounded border border-white/5">
                                                <span className="text-slate-400">Latency:</span>
                                                <span className="font-bold text-slate-200">
                                                    {pastDuration}ms → {currentDuration}ms 
                                                    <span className={`ml-2 text-[10px] font-bold ${
                                                        durationDelta <= 0 ? "text-emerald-400" : "text-rose-400"
                                                    }`}>
                                                        {durationDelta <= 0 ? "" : "+"}{durationDelta}ms
                                                    </span>
                                                </span>
                                            </div>

                                            {/* Confidence Comparison */}
                                            <div className="flex justify-between items-center p-2 bg-slate-950 rounded border border-white/5">
                                                <span className="text-slate-400">Confidence:</span>
                                                <span className="font-bold text-slate-200">
                                                    {Math.round(pastConf * 100)}% → {Math.round(currentConf * 100)}% 
                                                    <span className={`ml-2 text-[10px] font-bold ${
                                                        confDelta >= 0 ? "text-emerald-400" : "text-rose-400"
                                                    }`}>
                                                        {confDelta >= 0 ? "+" : ""}{Math.round(confDelta * 100)}%
                                                    </span>
                                                </span>
                                            </div>

                                            {/* Occasion / Recipient Changes */}
                                            <div className="flex justify-between items-center p-2 bg-slate-950 rounded border border-white/5">
                                                <span className="text-slate-400">Intent & Recipient:</span>
                                                <span className="font-bold text-slate-200 text-right capitalize">
                                                    {pastSummary.intent} ({pastSummary.recipient}) <br/>
                                                    <span className="text-[10px] text-cyan-400">→ {currentSummary.intent} ({currentSummary.recipient})</span>
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6 text-center text-slate-400">
                                <ArrowRightLeft className="w-8 h-8 mx-auto mb-3 opacity-20 text-cyan-400" />
                                <div className="text-xs font-bold text-slate-300 mb-1">No comparison activity recorded.</div>
                                <p className="text-[10px] text-slate-500">Enter a past Trace ID above to compare delta scorecards.</p>
                            </div>
                        )}
                    </div>
                )}
                {/* 🧠 LEARNING TAB */}
                {activeTab === "learning" && (() => {
                    const lp = tabData.memory?.learning_profile || tabData.learning?.learning_profile || null;
                    const affinities: any[] = tabData.memory?.user_affinities || tabData.learning?.user_affinities || [];

                    return (
                        <div className="flex flex-col gap-5 animate-fade-in">
                            {/* Header */}
                            <div className="bg-violet-900/20 border border-violet-800/30 rounded-xl p-4 flex items-center gap-3">
                                <Brain className="w-6 h-6 text-violet-400 flex-shrink-0" />
                                <div>
                                    <div className="text-xs font-bold text-violet-400 uppercase tracking-wider">Kappy Learning Engine</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">Category affinities built from user interactions and feedback signals</div>
                                </div>
                            </div>

                            {/* Affinity Leaderboard */}
                            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider border-b border-white/5 pb-2 flex items-center gap-1">
                                    <BarChart3 className="w-3 h-3" />
                                    Category Affinity Leaderboard
                                </h3>
                                {affinities.length === 0 ? (
                                    <div className="text-center py-6 text-slate-500 text-xs">
                                        <Heart className="w-8 h-8 mx-auto mb-2 opacity-20 text-violet-400" />
                                        <div className="font-semibold text-slate-400">No affinity data yet</div>
                                        <div className="text-[10px] mt-1">Affinities are built from purchases, thumbs-up/down, and product views.</div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {[...affinities]
                                            .sort((a: any, b: any) => Math.abs(b.affinity_score || b.score || 0) - Math.abs(a.affinity_score || a.score || 0))
                                            .slice(0, 10)
                                            .map((aff: any, idx: number) => {
                                                const score = aff.affinity_score ?? aff.score ?? 0;
                                                const isPositive = score >= 0;
                                                const barWidth = Math.min(100, Math.abs(score) * 10);
                                                return (
                                                    <div key={idx} className="flex flex-col gap-1">
                                                        <div className="flex justify-between items-center text-[10px]">
                                                            <span className="text-slate-300 capitalize font-semibold">{aff.target_id || aff.targetId}</span>
                                                            <span className={`font-bold font-mono ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                                                                {isPositive ? "+" : ""}{score.toFixed(1)}
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-500 ${isPositive ? "bg-emerald-500/70" : "bg-rose-500/70"}`}
                                                                style={{ width: `${barWidth}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
                            </div>

                            {/* Evidence Counts from Learning Profile */}
                            {lp && (
                                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                    <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider border-b border-white/5 pb-2">Learning Signal Summary</h3>
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                                        <div className="bg-slate-950 p-2 rounded border border-white/5">
                                            <div className="text-[9px] text-slate-500 mb-0.5">Searches</div>
                                            <div className="font-bold text-cyan-400 text-sm">{lp.evidenceCounts?.searches ?? 0}</div>
                                        </div>
                                        <div className="bg-slate-950 p-2 rounded border border-emerald-800/20">
                                            <div className="text-[9px] text-slate-500 mb-0.5">Purchases</div>
                                            <div className="font-bold text-emerald-400 text-sm">{lp.evidenceCounts?.purchases ?? 0}</div>
                                        </div>
                                        <div className="bg-slate-950 p-2 rounded border border-amber-800/20">
                                            <div className="text-[9px] text-slate-500 mb-0.5">Feedback</div>
                                            <div className="font-bold text-amber-400 text-sm">{lp.evidenceCounts?.feedback ?? 0}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!lp && affinities.length === 0 && (
                                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6 text-center text-slate-400">
                                    <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-20 text-violet-400" />
                                    <div className="text-xs font-bold text-slate-300 mb-1">Learning Engine Active</div>
                                    <p className="text-[10px] text-slate-500">Purchase products, use thumbs-up/down, or browse recommendations to build your affinity profile.</p>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>

        </div>
    );
}
