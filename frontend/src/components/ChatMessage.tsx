"use client";

import React, { useState } from "react";
import { Star, Truck, ShoppingCart, ChevronDown, ChevronUp, Package, CheckCircle2 } from "lucide-react";

export interface Product {
    id: string;
    name: string;
    price: number;
    image_url: string;
    url: string;
    category?: string;
    isHighlighted?: boolean;
    reason?: string;
    delivery?: string;
    inStock?: boolean;
}

export interface TrackingStep {
    name: string;
    status: "done" | "active" | "pending";
    time?: string;
}

export interface TrackingData {
    orderNumber: string;
    statusText: string;
    estimatedArrival: string;
    steps: TrackingStep[];
}

export interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    isLoading?: boolean;
    loadingText?: string;
    products?: Product[];
    tracking?: TrackingData;
    isCheckout?: boolean;
    traceReport?: any;
    intelligenceTrace?: any[];
    judgeModeTrace?: any;
    decisionSupport?: any;
    reassurances?: string[];
    transparencyMessage?: string;
    followUpSuggestions?: string[];
}

interface ChatMessageProps {
    message: Message;
    isDebugMode?: boolean;
    userId?: string;
    sessionId?: string | null;
    onAddToBundle?: (product: Product) => void;
    onFollowUpClick?: (text: string) => void;
}

export default function ChatMessage({ message, isDebugMode = false, userId, sessionId, onAddToBundle, onFollowUpClick }: ChatMessageProps) {
    const { role, content, isLoading, loadingText, products, tracking, isCheckout, traceReport, intelligenceTrace, decisionSupport, reassurances, transparencyMessage, followUpSuggestions } = message;
    const isAssistant = role === "assistant";

    // Track which products have expanded details inline
    const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

    const toggleExpand = (productId: string) => {
        setExpandedProducts(prev => ({
            ...prev,
            [productId]: !prev[productId]
        }));
    };

    const [feedbackSubmitted, setFeedbackSubmitted] = useState<Record<string, "RELEVANT" | "NOT_RELEVANT">>({});

    const submitFeedback = async (product: Product, type: "RELEVANT" | "NOT_RELEVANT") => {
        try {
            setFeedbackSubmitted(prev => ({ ...prev, [product.id]: type }));
            const safeTrace = Array.isArray(intelligenceTrace) ? intelligenceTrace : [];
            const extractionTrace = safeTrace.find((t: any) => t.engine === "IntelligenceExtraction")?.outputs || {};
            const strategyTrace = safeTrace.find((t: any) => t.engine === "StrategySelector")?.outputs || {};
            
            await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: product.id,
                    feedbackType: type,
                    userId: userId || "guest",
                    sessionId: sessionId || "unknown",
                    context: {
                        recipient: extractionTrace.situation?.recipient || "unknown",
                        occasion: extractionTrace.situation?.occasion || "unknown",
                        category: product.category || "unknown",
                        strategy: strategyTrace.strategy || "unknown"
                    }
                })
            });
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className={`flex flex-col w-full mb-6 ${role === "user" ? "items-end" : "items-start"}`}>
            {/* Avatar / Sender Name */}
            <div className="flex items-center gap-2 mb-1.5 px-1">
                {isAssistant ? (
                    <>
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 text-white font-bold text-xs shadow-md">
                            K
                        </div>
                        <span className="text-xs font-semibold text-slate-400">Kappy</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    </>
                ) : (
                    <span className="text-xs font-semibold text-slate-500">You</span>
                )}
            </div>

            {/* Bubble Container */}
            <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-lg transition-all duration-300 ${
                    !isAssistant
                        ? "bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-tr-none"
                        : "bg-slate-900/50 backdrop-blur-md border border-white/10 text-slate-100 rounded-tl-none"
                }`}
            >
                {/* Text Content / Loading state */}
                {isLoading ? (
                    <div className="flex items-center gap-3 py-1">
                        <div className="flex gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce"></span>
                        </div>
                        <span className="text-sm text-slate-400 animate-pulse italic">
                            {loadingText || "Thinking..."}
                        </span>
                    </div>
                ) : (
                    <p className="text-sm md:text-base leading-relaxed whitespace-pre-line">{content}</p>
                )}

                {/* Kappy Reassurances (Confidence Builder) */}
                {!isLoading && reassurances && reassurances.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-white/10">
                        {reassurances.map((r, i) => (
                            <p key={i} className="text-[11px] text-amber-300 italic flex items-center gap-1.5">
                                <span>💝</span> {r}
                            </p>
                        ))}
                    </div>
                )}
            </div>

            {/* Kappy Decision Support Top Pick Highlight */}
            {!isLoading && decisionSupport?.topPick && (
                 <div className="w-full max-w-lg mt-3 p-3 bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl animate-slide-down">
                     <p className="text-xs text-amber-100 flex items-start gap-2">
                         <span className="text-amber-400 mt-0.5"><Star className="w-4 h-4 fill-current"/></span>
                         <span>{decisionSupport.reasoning} <br/><span className="opacity-70 mt-1 block">{decisionSupport.tradeoffs}</span></span>
                     </p>
                 </div>
            )}

            {/* Product Recommendations Horizontal Carousel (Mobile First) */}
            {isAssistant && products && products.length > 0 && (
                <div className="w-full mt-4 pb-4 animate-fade-in">
                    
                    {/* Transparency Message & Follow Up Chips */}
                    {(transparencyMessage || followUpSuggestions) && (
                        <div className="mb-4 space-y-3">
                            {transparencyMessage && (
                                <div className="text-[13px] text-slate-300 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 flex items-center gap-2">
                                    <span className="text-sky-400">🔍</span>
                                    <span>{transparencyMessage}</span>
                                </div>
                            )}
                            
                            {followUpSuggestions && followUpSuggestions.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {followUpSuggestions.map((suggestion, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => onFollowUpClick && onFollowUpClick(suggestion)}
                                            className="text-xs font-semibold px-3 py-1.5 bg-slate-900 border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/10 text-slate-300 hover:text-amber-400 rounded-full transition-all"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 w-full">
                    {products.map((product, index) => {
                        const isExpanded = !!expandedProducts[product.id];
                        return (
                            <div
                                key={`${product.id}-${index}`}
                                className={`relative flex flex-col rounded-2xl bg-slate-900/70 border overflow-hidden transition-all duration-300 hover:scale-[1.02] shadow-xl w-full ${
                                    product.isHighlighted
                                        ? "border-amber-400/80 shadow-amber-950/20 shadow-xl"
                                        : "border-white/10"
                                }`}
                            >
                                {/* Recommended Glow Badge */}
                                {product.isHighlighted && (
                                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-950 bg-gradient-to-r from-amber-300 to-yellow-500 rounded-full shadow-md animate-pulse">
                                        <Star className="w-3.5 h-3.5 fill-current" />
                                        <span>Recommended For You</span>
                                    </div>
                                )}

                                {/* Product Image */}
                                <div className="h-44 w-full bg-slate-950 overflow-hidden relative group">
                                    <img
                                        src={product.image_url}
                                        alt={product.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute bottom-2 right-2 flex flex-col gap-1">
                                        {product.delivery && (
                                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-950/80 text-emerald-400 backdrop-blur-sm rounded-md border border-emerald-500/20">
                                                {product.delivery}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Product Info */}
                                <div className="flex-1 p-4 flex flex-col justify-between">
                                    <div>
                                        <h4 className="font-semibold text-white text-sm md:text-base line-clamp-2 mb-1.5">
                                            {product.name}
                                        </h4>
                                        <p className="text-lg font-bold text-amber-400 mb-2">
                                            Rs. {product.price.toLocaleString()}
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-2 mt-2">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => toggleExpand(product.id)}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-lg transition-all"
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        Hide Details <ChevronUp className="w-3.5 h-3.5" />
                                                    </>
                                                ) : (
                                                    <>
                                                        Details <ChevronDown className="w-3.5 h-3.5" />
                                                    </>
                                                )}
                                            </button>
                                            
                                            {onAddToBundle && (
                                                <button
                                                    onClick={() => {
                                                        // Ping analytics asynchronously
                                                        fetch('/api/analytics', { method: 'POST', body: JSON.stringify({ sessionId: 'chat-session', productId: product.id, action: 'add_to_cart' }) }).catch(e => console.error(e));
                                                        onAddToBundle(product);
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 active:scale-95 rounded-lg shadow-md transition-all"
                                                >
                                                    <ShoppingCart className="w-3.5 h-3.5" />
                                                    Add Package
                                                </button>
                                            )}
                                        </div>

                                        {/* Inline Expansion (Why Kappy Picked This) */}
                                        {isExpanded && (
                                            <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/5 text-xs text-slate-300 animate-slide-down">
                                                <h5 className="font-bold text-amber-400 mb-1 flex items-center gap-1">
                                                    <span>💡</span> Why Kappy Recommends This:
                                                </h5>
                                                <p className="leading-relaxed mb-3">{product.reason || "Great quality product matching your requirements."}</p>
                                                
                                                {/* COMMUNITY FEEDBACK BUTTONS */}
                                                {!feedbackSubmitted[product.id] ? (
                                                    <div className="flex items-center gap-2 mb-3 mt-1 bg-slate-950/30 p-2 rounded-lg border border-white/5">
                                                        <span className="text-[10px] text-slate-400 mr-1">Relevant?</span>
                                                        <button 
                                                            className="flex-1 px-2 py-1 bg-white/5 hover:bg-emerald-500/20 text-emerald-400 border border-white/10 rounded transition-colors text-[10px] font-bold"
                                                            onClick={() => submitFeedback(product, "RELEVANT")}
                                                        >👍 Yes</button>
                                                        <button 
                                                            className="flex-1 px-2 py-1 bg-white/5 hover:bg-rose-500/20 text-rose-400 border border-white/10 rounded transition-colors text-[10px] font-bold"
                                                            onClick={() => submitFeedback(product, "NOT_RELEVANT")}
                                                        >👎 No</button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-2 mb-3 mt-1 bg-slate-950/50 p-2 rounded-lg border border-white/5">
                                                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Feedback saved. Kappy will learn from this.
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-white/5">
                                                    <span>Status: {product.inStock ? "✅ In Stock" : "❌ Out of Stock"}</span>
                                                    <a
                                                        href={product.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={() => {
                                                            fetch('/api/analytics', { method: 'POST', body: JSON.stringify({ sessionId: 'chat-session', productId: product.id, action: 'click' }) }).catch(e => console.error(e));
                                                        }}
                                                        className="text-rose-400 hover:underline"
                                                    >
                                                        View on Kapruka Website →
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            )}

            {/* Tracking Card Timeline (If Available) */}
            {isAssistant && tracking && (
                <div className="w-full max-w-lg mt-4 p-5 bg-slate-900/70 border border-white/10 rounded-2xl shadow-xl animate-fade-in">
                    <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                        <div>
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Active Track</span>
                            <h4 className="font-bold text-white text-sm md:text-base">Order #{tracking.orderNumber}</h4>
                        </div>
                        <span className="px-2.5 py-1 text-xs font-bold bg-amber-500/15 text-amber-400 rounded-full border border-amber-500/30">
                            {tracking.statusText}
                        </span>
                    </div>

                    {/* Timeline progress indicator */}
                    <div className="relative flex flex-col gap-6 pl-6 border-l-2 border-slate-700/60 ml-2 py-1">
                        {tracking.steps.map((step, idx) => {
                            const isDone = step.status === "done";
                            const isActive = step.status === "active";
                            return (
                                <div key={idx} className="relative">
                                    {/* Indicator Dot */}
                                    <div
                                        className={`absolute -left-[31px] top-0.5 flex items-center justify-center w-4 h-4 rounded-full border shadow-sm transition-all duration-300 ${
                                            isDone
                                                ? "bg-emerald-500 border-emerald-500 text-white"
                                                : isActive
                                                ? "bg-amber-500 border-amber-400 animate-pulse"
                                                : "bg-slate-950 border-slate-800"
                                        }`}
                                    >
                                        {isDone && <CheckCircle2 className="w-3 h-3 text-white" />}
                                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                                    </div>

                                    {/* Step details */}
                                    <div>
                                        <h5
                                            className={`text-xs md:text-sm font-semibold ${
                                                isDone ? "text-emerald-400" : isActive ? "text-amber-400 font-bold" : "text-slate-500"
                                            }`}
                                        >
                                            {step.name}
                                        </h5>
                                        {step.time && <span className="text-[10px] text-slate-500">{step.time}</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5" /> Est. Arrival:
                        </span>
                        <strong className="text-white">{tracking.estimatedArrival}</strong>
                    </div>
                </div>
            )}

            {/* Legacy Developer Mode Trace View */}
            {isDebugMode && message.traceReport && (
                <div className="mt-4 p-4 rounded-xl bg-[#0B0D17] border border-purple-500/30 overflow-hidden text-[10px] font-mono relative">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 border-b border-purple-500/20 pb-3">
                        <div className="flex items-center gap-2 text-purple-400 font-bold uppercase tracking-wider">
                            <span>🔍</span> RECOMMENDATION TRACE DIAGNOSTIC
                        </div>
                        <div className="px-2 py-1 bg-purple-900/30 text-purple-400 rounded uppercase font-bold text-[9px]">
                            {message.traceReport.mode || "RECOMMENDATION MODE"}
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-4 gap-4 mb-4 text-slate-300 border-b border-purple-500/20 pb-4">
                        <div className="col-span-1 border-r border-white/5 pr-2 whitespace-normal break-words">
                            <span className="text-slate-500">Query: </span> 
                            <span className="text-white">{message.traceReport.query}</span>
                        </div>
                        <div className="col-span-1 flex flex-col gap-2 pl-2">
                            <div><span className="text-slate-500">Trace ID: </span> <span className="text-blue-300">{message.traceReport.trace_id}</span></div>
                            <div><span className="text-slate-500">Ranked: </span> <span className="text-blue-400">{message.traceReport.ranked_count}</span></div>
                        </div>
                        <div className="col-span-1 flex flex-col gap-2">
                            <div><span className="text-slate-500">Retrieved: </span> <span className="text-emerald-400">{message.traceReport.raw_product_count}</span></div>
                            <div><span className="text-slate-500">Displayed: </span> <span className="text-amber-400">{message.traceReport.displayed_count}</span></div>
                        </div>
                        <div className="col-span-1 flex flex-col gap-2">
                            <div><span className="text-slate-500">Deduped: </span> <span className="text-amber-500">{message.traceReport.deduplicated_count}</span></div>
                            <div><span className="text-slate-500">Filtered: </span> <span className="text-rose-400">{message.traceReport.filtered_count}</span></div>
                            <div><span className="text-slate-500">Semantic Drop: </span> <span className="text-orange-400">{message.traceReport.semantic_removed_count || 0}</span></div>
                            <div><span className="text-slate-500">Cached: </span> <span className="text-purple-400">{message.traceReport.cache_remaining}</span></div>
                        </div>
                    </div>

                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-2 text-purple-300 font-bold uppercase pb-2 border-b border-white/10">
                        <div className="col-span-3">Product</div>
                        <div className="col-span-3">Stage</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-3">Reason</div>
                        <div className="col-span-1 text-right">Score</div>
                    </div>

                    {/* Table Rows */}
                    <div className="flex flex-col">
                        {message.traceReport.trace_data?.map((prod: any, idx: number) => {
                            const isFailed = prod.status === "rejected";
                            const stageStr = isFailed && prod.reasons?.[0]?.includes("Price") ? "Budget Filter" : "Scoring Engine V2";
                            const scoreStr = prod.score && prod.score > 0 ? prod.score.toFixed(2) : "-";

                            return (
                                <div key={idx} className="grid grid-cols-12 gap-2 py-2 border-b border-white/5 items-center text-slate-300 hover:bg-white/5 transition-colors">
                                    <div className="col-span-3 truncate pr-2" title={prod.productName}>{prod.productName}</div>
                                    <div className="col-span-3 text-slate-400">{stageStr}</div>
                                    <div className="col-span-2 flex items-center gap-1">
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${isFailed ? "bg-rose-950/50 text-rose-500" : "bg-emerald-950/50 text-emerald-500"}`}>
                                            {isFailed ? "FAILED" : "PASSED"}
                                        </span>
                                        {prod.isHighlighted && <span className="text-amber-500">⭐</span>}
                                    </div>
                                    <div className="col-span-3 truncate text-slate-400 text-[9px]" title={prod.reasons?.[0] || "-"}>{prod.reasons?.[0] || "-"}</div>
                                    <div className="col-span-1 text-right text-slate-200">{scoreStr}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

        </div>
    );
}
