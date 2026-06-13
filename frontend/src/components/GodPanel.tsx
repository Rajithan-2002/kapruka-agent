import React, { useState, useEffect } from "react";
import MemoryVault from "./MemoryVault";
import { 
    Brain, BarChart3, Target, Activity, X, ChevronDown, ChevronRight, 
    ListTree, AlertCircle, Search, Copy, Check, Download, 
    RefreshCw, Layers, Sliders, ArrowRightLeft, Sparkles, CheckCircle, Info, Heart
} from "lucide-react";

interface GodPanelProps {
    traceId: string;
    onClose: () => void;
    relationships?: any[];
    preferences?: any[];
    activeMemories?: string[];
}

export default function GodPanel({ traceId, onClose, relationships = [], preferences = [], activeMemories = [] }: GodPanelProps) {
    const [activeTab, setActiveTab] = useState<"overview" | "funnel" | "memory" | "decisions" | "replay" | "compare">("overview");
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

    const handleExport = (format: "json" | "csv") => {
        const fullData = {
            traceId,
            timestamp: new Date().toISOString(),
            ...tabData
        };

        let fileContent = "";
        let fileName = `godmode-trace-${traceId}`;
        let mimeType = "application/json";

        if (format === "json") {
            fileContent = JSON.stringify(fullData, null, 2);
            fileName += ".json";
        } else {
            // Very simple CSV conversion of product lifecycles
            const lifecycles = tabData.funnel?.product_lifecycles || [];
            const rows = [
                ["Product ID", "Product Name", "Stage", "Status", "Reason", "Offset MS"]
            ];
            lifecycles.forEach((p: any) => {
                p.stages?.forEach((s: any) => {
                    rows.push([
                        p.productId,
                        p.productName,
                        s.stage,
                        s.status,
                        s.reason || "",
                        s.timestamp?.toString() || ""
                    ]);
                });
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

                <div className="flex items-center justify-between text-xs text-slate-500 font-mono bg-slate-950 p-2 rounded border border-white/5">
                    <span className="truncate">Trace: {traceId}</span>
                    <button 
                        onClick={() => handleCopy(traceId, "trace_id_copy")}
                        className="hover:text-cyan-400 transition-colors ml-2"
                        title="Copy Trace ID"
                    >
                        {copiedMap["trace_id_copy"] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                </div>
                
                {/* Tabs */}
                <div className="grid grid-cols-6 gap-1 border border-white/5 rounded-lg p-0.5 bg-slate-950/60 shadow-inner">
                    {(["overview", "funnel", "memory", "decisions", "replay", "compare"] as const).map(tab => (
                        <button 
                            key={tab}
                            onClick={() => handleTabChange(tab)}
                            className={`py-1 text-[10px] font-semibold rounded capitalize transition-all duration-150 ${activeTab === tab ? "bg-cyan-500/20 text-cyan-400 shadow-sm" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}
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
                {activeTab === "overview" && overview && (
                    <div className="flex flex-col gap-5 animate-fade-in">
                        {/* Session Analytics */}
                        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">Session Analytics</h3>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="bg-slate-950 p-2.5 rounded border border-white/5">
                                    <div className="text-slate-500 mb-1 font-mono uppercase text-[9px]">Detected Intent</div>
                                    <div className="font-bold text-slate-200 capitalize">
                                        {!summary.intent || summary.intent.toLowerCase() === "unknown" ? <span className="text-rose-500/80 text-[10px]">DATA NOT CAPTURED</span> : summary.intent}
                                    </div>
                                </div>
                                <div className="bg-slate-950 p-2.5 rounded border border-white/5">
                                    <div className="text-slate-500 mb-1 font-mono uppercase text-[9px]">Gifting Recipient</div>
                                    <div className="font-bold text-slate-200 capitalize">
                                        {!summary.recipient || summary.recipient.toLowerCase() === "unknown" ? <span className="text-rose-500/80 text-[10px]">DATA NOT CAPTURED</span> : summary.recipient}
                                    </div>
                                </div>
                                <div className="bg-slate-950 p-2.5 rounded border border-white/5">
                                    <div className="text-slate-500 mb-1 font-mono uppercase text-[9px]">Target Budget</div>
                                    <div className="font-bold text-slate-200">
                                        {!summary.budget || summary.budget === 0 ? <span className="text-rose-500/80 text-[10px]">DATA NOT CAPTURED</span> : `LKR ${summary.budget.toLocaleString()}`}
                                    </div>
                                </div>
                                <div className="bg-slate-950 p-2.5 rounded border border-white/5">
                                    <div className="text-slate-500 mb-1 font-mono uppercase text-[9px]">Decision Latency</div>
                                    <div className="font-bold text-slate-200">{summary.durationMs}ms</div>
                                </div>
                                <div className="bg-slate-950 p-2.5 rounded border border-white/5">
                                    <div className="text-slate-500 mb-1 font-mono uppercase text-[9px]">Confidence Score</div>
                                    <div className="font-bold text-slate-200 flex items-center gap-1">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ 
                                            backgroundColor: summary.confidence >= 0.8 ? "#10b981" : summary.confidence >= 0.5 ? "#f59e0b" : "#ef4444" 
                                        }} />
                                        <span>{Math.round(summary.confidence * 100)}%</span>
                                    </div>
                                </div>
                                <div className="bg-slate-950 p-2.5 rounded border border-white/5">
                                    <div className="text-slate-500 mb-1 font-mono uppercase text-[9px]">Occasion</div>
                                    <div className="font-bold text-slate-200 capitalize">
                                        {!summary.occasion || summary.occasion.toLowerCase() === "unknown" ? <span className="text-rose-500/80 text-[10px]">DATA NOT CAPTURED</span> : summary.occasion}
                                    </div>
                                </div>
                            </div>

                            {summary.winningProductName && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg flex items-center justify-between text-xs mt-1">
                                    <div>
                                        <div className="text-[10px] text-emerald-500/80 font-semibold font-mono uppercase">Winning Recommendation</div>
                                        <div className="font-bold text-slate-200 mt-0.5">{summary.winningProductName}</div>
                                    </div>
                                    <Sparkles className="w-5 h-5 text-emerald-400" />
                                </div>
                            )}
                        </div>

                        {/* Engine Health Monitor */}
                        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">Intelligence Engine Health</h3>
                            <div className="flex flex-col gap-2.5 text-xs font-mono">
                                {Object.keys(engineHealth).length === 0 ? (
                                    <div className="text-slate-500 italic text-center py-2">No engines logged telemetry for this interaction.</div>
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

                        {/* Telemetry Exporters */}
                        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">Diagnostic Data Export</h3>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => handleExport("json")}
                                    className="flex-1 py-2 bg-slate-850 hover:bg-slate-800 border border-white/10 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 text-slate-300"
                                >
                                    <Download className="w-3.5 h-3.5" /> Export JSON
                                </button>
                                <button 
                                    onClick={() => handleExport("csv")}
                                    className="flex-1 py-2 bg-slate-850 hover:bg-slate-800 border border-white/10 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 text-slate-300"
                                >
                                    <Download className="w-3.5 h-3.5" /> Export CSV
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 🧬 FUNNEL TAB */}
                {activeTab === "funnel" && tabData.funnel && (
                    <div className="flex flex-col gap-5 animate-fade-in">
                        {/* Visual Funnel Chart */}
                        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-4">
                            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">Recommendation Funnel</h3>
                            {(() => {
                                const lifecycles = tabData.funnel.product_lifecycles || [];
                                const total = lifecycles.length;
                                
                                // Calculate pass count for each stage
                                const stagesOrder = ["RETRIEVED", "DEDUPLICATED", "HARD_FILTER", "DELIVERY_FILTER", "RANKED", "SEMANTIC_FILTER"];
                                const stageLabels = ["Retrieved", "Deduplicated", "Hard Filtered", "Delivery Filtered", "Scored/Ranked", "Semantic Filtered"];
                                const stageCounts = stagesOrder.map(stage => {
                                    return lifecycles.filter((p: any) => {
                                        // Product passed if no REJECTED event exists at or before this stage
                                        const stageIndex = p.stages?.findIndex((s: any) => s.stage === stage);
                                        if (stageIndex === -1) return false;
                                        // Look for any reject in stages
                                        const hasRejected = p.stages.some((s: any, idx: number) => 
                                            idx <= stageIndex && s.status === "REJECTED"
                                        );
                                        return !hasRejected;
                                    }).length;
                                });

                                return (
                                    <div className="flex flex-col gap-3 font-mono text-[10px] text-slate-400">
                                        {stagesOrder.map((stage, index) => {
                                            const count = stageCounts[index]; // remaining count
                                            const percentRemaining = total > 0 ? (count / total) * 100 : 0;
                                            
                                            let numerator = count;
                                            let denominator = total;
                                            let displayPercent = percentRemaining;

                                            if (index === 0) {
                                                numerator = total;
                                                denominator = total;
                                                displayPercent = 100;
                                            } else {
                                                const prevRemaining = stageCounts[index - 1];
                                                const removed = prevRemaining - count;
                                                numerator = removed;
                                                denominator = prevRemaining;
                                                displayPercent = denominator > 0 ? (removed / denominator) * 100 : 0;
                                            }

                                            return (
                                                <div key={stage} className="flex flex-col gap-1">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-slate-300">{stageLabels[index]}</span>
                                                        <span className="font-bold text-slate-200">
                                                            {numerator} / {denominator}{" "}
                                                            <span className="text-[10px] font-normal text-slate-500">
                                                                ({Math.round(displayPercent)}% {index === 0 ? "total" : "removed"})
                                                            </span>
                                                            <span className="text-[10px] font-mono text-cyan-400 ml-2">
                                                                | Bal: {count}
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-slate-950 h-3 rounded overflow-hidden border border-white/5 flex items-center">
                                                        <div 
                                                            className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-r shadow-glow transition-all duration-300"
                                                            style={{ width: `${percentRemaining}%` }}
                                                        />
                                                    </div>
                                                </div>
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
                            <div className="flex flex-col gap-2.5 max-h-[400px] overflow-y-auto pr-1">
                                {(tabData.funnel.product_lifecycles || []).slice(0, 15).map((p: any) => {
                                    const lastStage = p.stages?.[p.stages.length - 1] || {};
                                    const isApproved = lastStage.status === "APPROVED" && p.stages?.every((s: any) => s.status !== "REJECTED");
                                    return (
                                        <div key={p.productId} className="bg-slate-950 p-3 rounded-lg border border-white/5 flex flex-col gap-1.5">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-bold text-slate-200 truncate pr-2">{p.productName}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                    isApproved ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                                                }`}>
                                                    {isApproved ? "Winner/Candidate" : "Rejected"}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-mono">Product ID: {p.productId}</div>
                                            
                                            {/* Stage transitions with offsets */}
                                            <div className="flex flex-col gap-1.5 border-t border-white/5 pt-2 mt-1">
                                                {p.stages?.map((s: any, idx: number) => {
                                                    const prevTimestamp = idx > 0 ? p.stages[idx - 1].timestamp : 0;
                                                    const diff = s.timestamp - prevTimestamp;
                                                    return (
                                                        <div key={idx} className="flex justify-between items-start text-[10px] font-mono leading-relaxed">
                                                            <span className="text-slate-400">
                                                                {s.stage} <span className="text-[9px] text-slate-500">+{diff}ms</span>
                                                            </span>
                                                            <span className={`text-right ${
                                                                s.status === "APPROVED" ? "text-emerald-400" : "text-rose-400"
                                                            } max-w-[200px] truncate`}>
                                                                {s.status === "REJECTED" ? `Rejected: ${s.reason}` : "Approved"}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
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
                        {/* Memory Vault Modal Trigger */}
                        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">Global Memory Vault</h3>
                            <p className="text-xs text-slate-400">View and manage long-term memories, relationships, and preferences that power Kappy's personalized intelligence.</p>
                            <button 
                                onClick={() => setIsMemoryVaultOpen(true)}
                                className="w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-xs font-bold text-cyan-400 transition-colors flex items-center justify-center gap-2"
                            >
                                <Brain className="w-4 h-4" /> Open Memory Vault
                            </button>
                        </div>
                        
                        {/* Memory Vault Modal */}
                        {isMemoryVaultOpen && typeof MemoryVault !== 'undefined' && (
                            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                                <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl animate-fade-in relative">
                                    <button 
                                        onClick={() => setIsMemoryVaultOpen(false)}
                                        className="absolute right-4 top-4 z-10 p-2 bg-slate-800/50 hover:bg-slate-800 rounded-full text-slate-300 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                    <div className="flex-1 overflow-hidden relative pt-2">
                                        <MemoryVault 
                                            relationships={relationships} 
                                            preferences={preferences} 
                                            activeMemories={activeMemories} 
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Memory Observatory */}
                        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2 flex items-center justify-between">
                                <span>Memory Observatory</span>
                            </h3>

                            {(() => {
                                // Extract memories from telemetryEvents where engine === "Memory"
                                const events = tabData.memory.telemetry_events || [];
                                const memoryLogs = events.filter((e: any) => e.engine === "Memory");

                                if (memoryLogs.length === 0) {
                                    return <div className="text-xs text-slate-500 italic text-center py-4">No user memories were retrieved or evaluated during this interaction.</div>;
                                }

                                return (
                                    <div className="flex flex-col gap-3">
                                        {memoryLogs.map((log: any, idx: number) => {
                                            const m = log.details || {};
                                            const isUsed = m.utilization === "USED";
                                            return (
                                                <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-white/5 flex flex-col gap-2">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-semibold text-slate-300 font-mono text-[10px]">Memory Block</span>
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                                            isUsed ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-400"
                                                        }`}>
                                                            {isUsed ? "Loaded & Used" : "Loaded but Ignored"}
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
                                        <div className="text-xs text-slate-500 italic text-center py-4">No ranking candidates scored.</div>
                                    </div>
                                );
                            }

                            return (
                                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">Scoring Leaderboard</h3>
                                    <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                                        {rankedList.map((item: any, index: number) => {
                                            const score = item.score || 0;
                                            return (
                                                <div key={item.id} className="bg-slate-950 p-2.5 rounded border border-white/5 flex flex-col gap-1.5 text-xs">
                                                    <div className="flex justify-between items-center font-semibold text-slate-200">
                                                        <span className="truncate max-w-[280px]">
                                                            {index + 1}. {item.name}
                                                        </span>
                                                        <span className="text-cyan-400 font-mono">{(score * 100).toFixed(1)}%</span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-mono">ID: {item.id}</div>
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
                                return <div className="text-xs text-slate-500 italic text-center py-4 bg-slate-900/50 border border-white/10 rounded-xl">No replay steps captured.</div>;
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
                                                <pre className="p-3 bg-slate-950 rounded border border-white/5 overflow-x-auto text-[10px] leading-relaxed max-h-[150px] custom-scrollbar text-slate-300">
                                                    {JSON.stringify(activeStep.inputSnapshot, null, 2)}
                                                </pre>
                                            </div>
                                            {/* Outputs snapshot */}
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-emerald-400 font-bold uppercase tracking-wider text-[9px]">Outputs / Decisions:</span>
                                                <pre className="p-3 bg-slate-950 rounded border border-white/5 overflow-x-auto text-[10px] leading-relaxed max-h-[150px] custom-scrollbar text-slate-300">
                                                    {JSON.stringify(activeStep.outputSnapshot, null, 2)}
                                                </pre>
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
                        {compareData && (
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
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
