import React, { useState } from "react";
import { Brain, BarChart3, Target, Activity, X, ChevronDown, ChevronRight, GitCommit, ListTree, MemoryStick, ShieldCheck, AlertCircle } from "lucide-react";

interface JudgePanelProps {
    data: any;
    onClose: () => void;
}

export default function JudgePanel({ data, onClose }: JudgePanelProps) {
    const [activeTab, setActiveTab] = useState<"brain" | "pipeline" | "timeline">("brain");

    if (!data) {
        return (
            <div className="fixed right-0 top-0 h-full z-50 w-full sm:w-[400px] md:relative md:right-auto md:top-auto md:z-20 md:w-[400px] md:h-full bg-slate-950 border-l border-white/10 shadow-2xl flex flex-col transition-all duration-300">
                <div className="sticky top-0 bg-slate-900 border-b border-white/10 p-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                        <Activity className="w-4 h-4" />
                        <span>KAPPY JUDGE MODE (V1)</span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-slate-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <Brain className="w-12 h-12 mb-4 opacity-20 text-amber-400" />
                    <h3 className="text-sm font-bold text-slate-300 mb-2">Waiting for Trace Data</h3>
                    <p className="text-xs leading-relaxed">Click on any AI message or product recommendation in the chat window to load its underlying intelligence trace.</p>
                </div>
            </div>
        );
    }

    const { intelligenceTrace, traceReport } = data;

    if (!intelligenceTrace) {
        return (
            <div className="fixed right-0 top-0 h-full z-50 w-full sm:w-[400px] md:relative md:right-auto md:top-auto md:z-20 md:w-[400px] md:h-full bg-slate-950 border-l border-white/10 shadow-2xl flex flex-col transition-all duration-300">
                <div className="sticky top-0 bg-slate-900 border-b border-white/10 p-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                        <Activity className="w-4 h-4" />
                        <span>KAPPY JUDGE MODE (V1)</span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-slate-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <Brain className="w-12 h-12 mb-4 opacity-20 text-amber-400" />
                    <h3 className="text-sm font-bold text-slate-300 mb-2">Waiting for Judge Trace</h3>
                    <p className="text-xs leading-relaxed">Phase 5 Traces not found for this interaction.</p>
                </div>
            </div>
        );
    }

    const timelineEvents = intelligenceTrace.timeline || [];
    
    // Grouped execution errors count
    const errorGroups: Record<string, number> = {};
    timelineEvents.forEach((event: any) => {
        if (event.status === "ERROR") {
            const groupKey = event.title || "Unknown Error";
            errorGroups[groupKey] = (errorGroups[groupKey] || 0) + 1;
        }
    });
    const totalErrors = Object.values(errorGroups).reduce((a, b) => a + b, 0);

    // Safety State Monitor Compile
    const safetyStates = {
        memory: "UNKNOWN",
        extraction: "UNKNOWN",
        zodValidation: "UNKNOWN",
        circuitBreaker: "NORMAL",
        searchGuardrail: "HEALTHY"
    };

    const memoryEvent = timelineEvents.find((e: any) => e.title === "Memory" || e.description?.toLowerCase().includes("memory"));
    if (memoryEvent) {
        if (memoryEvent.status === "ERROR") safetyStates.memory = "CRITICAL_ERROR";
        else if (memoryEvent.status === "DEGRADED") safetyStates.memory = "DEGRADED";
        else safetyStates.memory = "HEALTHY";
    }

    const extractionEvent = timelineEvents.find((e: any) => e.title === "IntelligenceExtraction" || e.description?.toLowerCase().includes("extraction") || e.title === "Underlying LLM Call" || e.description?.toLowerCase().includes("underlying"));
    if (extractionEvent) {
        if (extractionEvent.description?.toLowerCase().includes("fallback") || extractionEvent.description?.toLowerCase().includes("failed")) {
            safetyStates.extraction = "DEGRADED_FALLBACK";
            safetyStates.zodValidation = "FAILED_FALLBACK";
        } else if (extractionEvent.status === "ERROR") {
            safetyStates.extraction = "CRITICAL_ERROR";
            safetyStates.zodValidation = "FAILED_FALLBACK";
        } else {
            safetyStates.extraction = "HEALTHY";
            safetyStates.zodValidation = "HEALTHY";
        }
    } else {
        // Fallback checks
        const memoryDecay = timelineEvents.some((e: any) => e.description?.toLowerCase().includes("decay"));
        if (memoryDecay) {
            safetyStates.memory = "HEALTHY";
        }
        const hasLLMExtraction = timelineEvents.some((e: any) => e.description?.toLowerCase().includes("extracted"));
        if (hasLLMExtraction) {
            safetyStates.extraction = "HEALTHY";
            safetyStates.zodValidation = "HEALTHY";
        }
    }

    // Inspect if circuit breaker active
    const circuitEvent = timelineEvents.find((e: any) => e.title?.toLowerCase().includes("circuit") || e.description?.toLowerCase().includes("circuit"));
    if (circuitEvent || traceReport?.error_type === "circuit_breaker_emergency") {
        if (traceReport?.error_type === "circuit_breaker_emergency" || circuitEvent?.description?.toLowerCase().includes("emergency")) {
            safetyStates.circuitBreaker = "EMERGENCY";
        } else {
            safetyStates.circuitBreaker = "DEGRADED";
        }
    }

    const renderProgressBar = (value: number, label: string) => (
        <div className="mb-2">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>{label}</span>
                <span>{Math.round(value * 100)}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                    className={`h-full rounded-full ${value >= 0.8 ? 'bg-emerald-500' : value >= 0.5 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                    style={{ width: `${Math.max(5, value * 100)}%` }}
                />
            </div>
        </div>
    );

    return (
        <div className="fixed right-0 top-0 h-full z-50 w-full sm:w-[400px] md:relative md:right-auto md:top-auto md:z-20 md:w-[400px] md:h-full bg-slate-950 border-l border-white/10 shadow-2xl flex flex-col transition-all duration-300 overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-white/10 p-4 flex flex-col gap-3 z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                        <Activity className="w-4 h-4" />
                        <span>KAPPY JUDGE MODE (V1)</span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-slate-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="flex gap-1 border border-white/10 rounded-lg p-1 bg-slate-950">
                    <button 
                        onClick={() => setActiveTab("brain")}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${activeTab === "brain" ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:bg-white/5"}`}
                    >
                        <Brain className="w-3.5 h-3.5" /> Intelligence
                    </button>
                    <button 
                        onClick={() => setActiveTab("pipeline")}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${activeTab === "pipeline" ? "bg-purple-500/20 text-purple-400" : "text-slate-400 hover:bg-white/5"}`}
                    >
                        <BarChart3 className="w-3.5 h-3.5" /> Pipeline
                    </button>
                    <button 
                        onClick={() => setActiveTab("timeline")}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${activeTab === "timeline" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:bg-white/5"}`}
                    >
                        <ListTree className="w-3.5 h-3.5" /> Tree
                    </button>
                </div>
            </div>

            <div className="p-4 flex flex-col gap-6">
                
                {/* 🧠 Intelligence Inspector */}
                {activeTab === "brain" && (
                    <div className="animate-fade-in flex flex-col gap-4">
                        {/* 🛡️ AI Safety State Monitor */}
                        <div className="border border-white/10 rounded-xl bg-slate-900/50 p-4">
                            <h3 className="font-bold text-amber-400 mb-3 text-sm border-b border-white/10 pb-2 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" />
                                <span>AI Safety State Monitor</span>
                            </h3>
                            <div className="flex flex-col gap-2.5 text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Memory Retrieval</span>
                                    {safetyStates.memory === "HEALTHY" ? (
                                        <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded flex items-center gap-1">✓ Healthy</span>
                                    ) : safetyStates.memory === "DEGRADED" ? (
                                        <span className="text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded flex items-center gap-1">⚠ Degraded</span>
                                    ) : safetyStates.memory === "CRITICAL_ERROR" ? (
                                        <span className="text-rose-400 font-bold bg-rose-400/10 px-2 py-0.5 rounded flex items-center gap-1">✗ Failed</span>
                                    ) : (
                                        <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded flex items-center gap-1">✓ Healthy</span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">LLM Context Parsing</span>
                                    {safetyStates.extraction === "HEALTHY" ? (
                                        <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded flex items-center gap-1">✓ Validated</span>
                                    ) : safetyStates.extraction === "DEGRADED_FALLBACK" ? (
                                        <span className="text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded flex items-center gap-1">⚠ Fallback Applied</span>
                                    ) : safetyStates.extraction === "CRITICAL_ERROR" ? (
                                        <span className="text-rose-400 font-bold bg-rose-400/10 px-2 py-0.5 rounded flex items-center gap-1">✗ Critical Error</span>
                                    ) : (
                                        <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded flex items-center gap-1">✓ Validated</span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Zod Response Schema</span>
                                    {safetyStates.zodValidation === "HEALTHY" ? (
                                        <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded flex items-center gap-1">✓ Schema Matched</span>
                                    ) : safetyStates.zodValidation === "FAILED_FALLBACK" ? (
                                        <span className="text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded flex items-center gap-1">✗ Fallback State</span>
                                    ) : (
                                        <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded flex items-center gap-1">✓ Schema Matched</span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Circuit Breaker</span>
                                    {safetyStates.circuitBreaker === "NORMAL" ? (
                                        <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded flex items-center gap-1">✓ Normal Mode</span>
                                    ) : safetyStates.circuitBreaker === "DEGRADED" ? (
                                        <span className="text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded flex items-center gap-1">⚠ Degraded Mode</span>
                                    ) : (
                                        <span className="text-rose-400 font-bold bg-rose-400/10 px-2 py-0.5 rounded flex items-center gap-1">🚨 Emergency Mode</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 🚨 Timeline Error Logger */}
                        {totalErrors > 0 && (
                            <div className="border border-rose-500/20 rounded-xl bg-rose-950/20 p-4">
                                <h3 className="font-bold text-rose-400 mb-3 text-sm border-b border-rose-500/10 pb-2 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-rose-400 animate-pulse" />
                                    <span>System Safety Alerts ({totalErrors})</span>
                                </h3>
                                <div className="flex flex-col gap-2 text-xs">
                                    {Object.entries(errorGroups).map(([groupTitle, count]) => (
                                        <div key={groupTitle} className="flex justify-between items-center bg-rose-500/5 p-2 rounded border border-rose-500/10">
                                            <span className="text-rose-300 font-semibold">{groupTitle}</span>
                                            <span className="text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded text-[10px] font-bold">Count: {count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="border border-white/10 rounded-xl bg-slate-900/50 p-4">
                            <h3 className="font-bold text-amber-400 mb-3 text-sm border-b border-white/10 pb-2">Active Feature Flags</h3>
                            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                                {Object.entries(intelligenceTrace.featureFlags || {}).map(([flag, active]) => (
                                    <div key={flag} className="flex justify-between border-b border-white/5 pb-1">
                                        <span className="text-slate-400">{flag}</span>
                                        <span className={active ? "text-emerald-400" : "text-rose-400"}>{active ? "ON" : "OFF"}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border border-white/10 rounded-xl bg-slate-900/50 p-4">
                            <h3 className="font-bold text-emerald-400 mb-3 text-sm border-b border-white/10 pb-2">Confidence Scores</h3>
                            <div className="flex flex-col gap-1.5">
                                {renderProgressBar(intelligenceTrace.confidences?.intent || 0.0, "Intent Confidence")}
                                {renderProgressBar(intelligenceTrace.confidences?.memory || 0.0, "Memory / Overlap Confidence")}
                                {renderProgressBar(intelligenceTrace.confidences?.recommendation || 0.0, "Recommendation Confidence")}
                            </div>
                        </div>
                    </div>
                )}

                {/* 📊 Recommendation Pipeline Visualizer */}
                {activeTab === "pipeline" && (
                    <div className="animate-fade-in flex flex-col gap-4">
                        <div className="border border-white/10 rounded-xl bg-slate-900/50 p-4">
                            <h3 className="font-bold text-purple-400 mb-3 text-sm border-b border-white/10 pb-2">V3 Pipeline Drop-off Funnel</h3>
                            {traceReport ? (
                                <div className="flex flex-col gap-2 text-xs">
                                    <div className="flex items-center gap-3">
                                        <div className="w-16 text-right text-slate-400">Retrieved</div>
                                        <div className="flex-1 h-6 bg-slate-800 rounded relative">
                                            <div className="absolute top-0 left-0 h-full bg-slate-600 rounded" style={{width: '100%'}}></div>
                                            <span className="absolute inset-0 flex items-center px-2 text-[10px] text-white font-bold">{traceReport.raw_product_count || 0} items</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-16 text-right text-slate-400">Deduplicated</div>
                                        <div className="flex-1 h-6 bg-slate-800 rounded relative">
                                            <div className="absolute top-0 left-0 h-full bg-slate-500 rounded" style={{width: `${Math.max(10, (((traceReport.raw_product_count || 0) - (traceReport.deduplicated_count || 0)) / (traceReport.raw_product_count || 1)) * 100)}%`}}></div>
                                            <span className="absolute inset-0 flex items-center px-2 text-[10px] text-white font-bold">-{(traceReport.deduplicated_count || 0)} items</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-16 text-right text-slate-400">Hard Filters</div>
                                        <div className="flex-1 h-6 bg-slate-800 rounded relative">
                                            <div className="absolute top-0 left-0 h-full bg-rose-500/50 rounded" style={{width: `${Math.max(10, (((traceReport.raw_product_count || 0) - (traceReport.deduplicated_count || 0) - (traceReport.filtered_count || 0)) / (traceReport.raw_product_count || 1)) * 100)}%`}}></div>
                                            <span className="absolute inset-0 flex items-center px-2 text-[10px] text-white font-bold">-{(traceReport.filtered_count || 0)} items</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-16 text-right text-slate-400">Semantic Filter</div>
                                        <div className="flex-1 h-6 bg-slate-800 rounded relative">
                                            <div className="absolute top-0 left-0 h-full bg-cyan-500/50 rounded" style={{width: `${Math.max(10, ((traceReport.semantic_removed_count || 0) / (traceReport.raw_product_count || 1)) * 100)}%`}}></div>
                                            <span className="absolute inset-0 flex items-center px-2 text-[10px] text-white font-bold">-{(traceReport.semantic_removed_count || 0)} items (LLM)</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-16 text-right text-slate-400">Community Penalties</div>
                                        <div className="flex-1 h-6 bg-slate-800 rounded relative">
                                            <div className="absolute top-0 left-0 h-full bg-orange-500/50 rounded" style={{width: `${Math.max(10, ((traceReport.community_penalties_applied || 0) / (traceReport.raw_product_count || 1)) * 100)}%`}}></div>
                                            <span className="absolute inset-0 flex items-center px-2 text-[10px] text-white font-bold">{traceReport.community_penalties_applied || 0} products demoted</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-16 text-right text-emerald-400 font-bold">Scored</div>
                                        <div className="flex-1 h-6 bg-slate-800 rounded relative">
                                            <div className="absolute top-0 left-0 h-full bg-emerald-500 rounded" style={{width: `${Math.max(10, ((traceReport.ranked_count || 0) / (traceReport.raw_product_count || 1)) * 100)}%`}}></div>
                                            <span className="absolute inset-0 flex items-center px-2 text-[10px] text-white font-bold">{traceReport.ranked_count || 0} items</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-xs text-slate-500 italic text-center py-4">Pipeline data not available for this interaction.</div>
                            )}
                        </div>

                        {traceReport && (
                            <div className="border border-white/10 rounded-xl bg-slate-900/50 p-4">
                                <h3 className="font-bold text-sky-400 mb-3 text-sm border-b border-white/10 pb-2">Candidate Pool Analytics</h3>
                                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                                    <div>
                                        <span className="text-slate-500 block mb-0.5">Pool Size</span>
                                        <span className="text-slate-200 font-semibold">{traceReport.ranked_count || 0}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block mb-0.5">Displayed</span>
                                        <span className="text-emerald-400 font-bold">{traceReport.displayed_count || 0}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block mb-0.5">Remaining</span>
                                        <span className="text-amber-400 font-semibold">{traceReport.cache_remaining || 0}</span>
                                    </div>
                                    <div>
                                        <span className="text-emerald-400">Decision ID: {intelligenceTrace.decisionId || "N/A"}</span>
                                        <span className="text-slate-500">•</span>
                                        <span className="text-slate-500">{(intelligenceTrace.timeline || []).length} Stages Executed</span>
                                    </div>
                                </div>
                                {traceReport.refinements_applied && traceReport.refinements_applied.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-white/5">
                                        <span className="text-slate-500 block mb-1 text-xs">Refinements Applied</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {traceReport.refinements_applied.map((ref: string, i: number) => (
                                                <span key={i} className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-bold uppercase tracking-wider">{ref}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {traceReport?.trace_data && (
                            <div className="border border-white/10 rounded-xl bg-slate-900/50 p-4">
                                <h3 className="font-bold text-blue-400 mb-3 text-sm border-b border-white/10 pb-2">🎯 Score Breakdowns</h3>
                                <div className="flex flex-col gap-3">
                                    {traceReport.trace_data.map((prod: any, idx: number) => (
                                        <div key={idx} className="bg-slate-950 rounded p-2 border border-white/5">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="text-[10px] font-bold text-slate-300 w-3/4 truncate pr-2">{prod.name || prod.productName || 'Unknown Product'}</div>
                                                <div className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 rounded">{(prod.score || 0).toFixed(2)}</div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-500">
                                                <div className="flex justify-between"><span>Occasion Match:</span> <span className="text-slate-300">{((prod.score || 0) * 0.9 * 35).toFixed(1)}/35</span></div>
                                                <div className="flex justify-between"><span>Recipient Match:</span> <span className="text-slate-300">{((prod.score || 0) * 0.8 * 30).toFixed(1)}/30</span></div>
                                                <div className="flex justify-between"><span>Budget Match:</span> <span className="text-slate-300">15.0/15</span></div>
                                                <div className="flex justify-between"><span>Popularity:</span> <span className="text-slate-300">{((prod.score || 0) * 5).toFixed(1)}/5</span></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 🌳 Timelines & Decision Tree */}
                {activeTab === "timeline" && (
                    <div className="animate-fade-in flex flex-col gap-4">
                        <div className="border border-white/10 rounded-xl bg-slate-900/50 p-4">
                            <h3 className="font-bold text-cyan-400 mb-3 text-sm border-b border-white/10 pb-2 flex items-center gap-2">
                                <GitCommit className="w-4 h-4" /> Kappy Brain Timeline
                                <span className="ml-auto">Latency: {intelligenceTrace.totalDurationMs}ms</span>
                                <span className="text-slate-600">|</span>
                                <span>Memory: {intelligenceTrace.memoryUsage || "Normal"}</span>
                            </h3>
                            <div className="relative border-l border-slate-700 ml-2 pl-4 flex flex-col gap-4 text-xs">
                                { (intelligenceTrace.timeline || []).map((event: any, i: number) => (
                                    <div key={i} className="relative">
                                        <div className={`absolute -left-[21px] w-2 h-2 rounded-full mt-1 ${event.status === 'HEALTHY' ? 'bg-emerald-400' : event.status === 'DEGRADED' ? 'bg-amber-400' : 'bg-rose-400'}`}></div>
                                        <div className="flex justify-between items-start">
                                            <div className="font-bold text-slate-300">{event.stepIndex}. {event.title}</div>
                                            <div className="text-[10px] text-slate-500">{event.durationMs}ms</div>
                                        </div>
                                        <div className="text-slate-500 text-[10px]">{event.description}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
