"use client";

import React, { useState, useEffect } from "react";
import { Star, Truck, ShoppingCart, ChevronDown, ChevronUp, Package, CheckCircle2, ThumbsUp, ThumbsDown, AlertCircle } from "lucide-react";
import TrackingTimeline from "./TrackingTimeline";
import ProductCard from "./ProductCard";

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
    isAllRequested?: boolean;
    initialVisibleCount?: number;
}

interface ChatMessageProps {
    message: Message;
    isGodMode?: boolean;
    userId?: string;
    sessionId?: string | null;
    onAddToBundle?: (product: Product) => void;
    onFollowUpClick?: (text: string) => void;
    onProductClick?: (productId: string) => void;
    isMobile?: boolean;
}

export default function ChatMessage({ message, isGodMode = false, userId, sessionId, onAddToBundle, onFollowUpClick, onProductClick, isMobile = false }: ChatMessageProps) {
    const { role, content, isLoading, loadingText, products, tracking, reassurances, transparencyMessage, followUpSuggestions } = message;
    const isAssistant = role === "assistant";

    // Track which products have expanded details inline
    const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});
    const [feedbackSubmitted, setFeedbackSubmitted] = useState<Record<string, "RELEVANT" | "NOT_RELEVANT">>({});
    const [copied, setCopied] = useState(false);

    const copyGodModeSummary = () => {
        if (!message.traceReport) return;
        const { trace_id, session_summary, confidence_explanation, engine_health } = message.traceReport;
        const summary = session_summary || {};
        const explanation = confidence_explanation || { positive: [], negative: [] };
        const health = engine_health || {};

        const md = `### Kappy God Mode Trace Report
- **Trace ID**: \`${trace_id || message.traceReport.trace_id}\`
- **Intent**: ${summary.intent || "unknown"}
- **Recipient**: ${summary.recipient || "unknown"}
- **Occasion**: ${summary.occasion || "unknown"}
- **Budget**: ${summary.budget ? `LKR ${summary.budget}` : "None"}
- **Confidence**: ${Math.round((summary.confidence || 0) * 100)}%
- **Winning Product**: ${summary.winningProductName || "None"}
- **Duration**: ${summary.durationMs || 0}ms

#### Engine Health
${Object.entries(health).map(([engine, status]) => `- **${engine}**: ${status}`).join("\n") || "No engines tracked."}

#### Confidence Checklist
- **Positive Factors**:
${(explanation.positive || []).map((p: string) => `  - [x] ${p}`).join("\n") || "  - None"}
- **Negative/Missing Factors**:
${(explanation.negative || []).map((n: string) => `  - [ ] ${n}`).join("\n") || "  - None"}
`;
        navigator.clipboard.writeText(md);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Pagination state
    const initialVisibleCount = message.isAllRequested ? (products?.length || 0) : (message.initialVisibleCount || 6);
    const [visibleCount, setVisibleCount] = useState<number>(initialVisibleCount);

    // Mobile Swiper State
    const [activeIdx, setActiveIdx] = useState(0);
    const [showAllGrid, setShowAllGrid] = useState(false);

    // Kappy Thinking Status Loop
    const [thinkingStep, setThinkingStep] = useState(0);
    const thinkingSteps = [
        "🧠 Understanding gifting intent...",
        "🔍 Querying Kapruka catalog...",
        "✨ Selecting best budget matches...",
        "😊 Formulating recommendations..."
    ];
    useEffect(() => {
        if (!isLoading) return;
        const interval = setInterval(() => {
            setThinkingStep(prev => (prev + 1) % thinkingSteps.length);
        }, 1500);
        return () => clearInterval(interval);
    }, [isLoading]);

    const END_OF_LIST_PHRASES = [
        "That's all the matching products we found!",
        "You've seen all the available recommendations.",
        "End of matching products.",
        "These are all the options matching your request."
    ];
    const phraseIndex = message.id ? Array.from(message.id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % END_OF_LIST_PHRASES.length : 0;
    const endOfListMessage = END_OF_LIST_PHRASES[phraseIndex];



    return (
        <div className={`flex flex-col w-full mb-6 ${role === "user" ? "items-end" : "items-start"}`}>
            {/* Avatar / Sender Name */}
            <div className="flex items-center gap-2 mb-1.5 px-1">
                {isAssistant ? (
                    <>
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 text-white font-bold text-[10px] shadow-sm">
                            K
                        </div>
                        <span className="text-xs font-semibold text-slate-500">Kappy</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </>
                ) : (
                    <span className="text-xs font-semibold text-slate-400">You</span>
                )}
            </div>

            {/* Bubble Container */}
            <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm border transition-all duration-300 ${
                    !isAssistant
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 border-indigo-700 text-white rounded-tr-none"
                        : "bg-white border-slate-100 text-slate-800 rounded-tl-none"
                }`}
            >
                {/* Text Content / Loading state */}
                {isLoading ? (
                    <div className="flex items-center gap-3 py-1">
                        <div className="flex gap-1">
                            <span className="w-2 h-2 rounded-full bg-violet-600 animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"></span>
                        </div>
                        <span className="text-xs text-slate-400 animate-pulse italic">
                            {thinkingSteps[thinkingStep]}
                        </span>
                    </div>
                ) : (
                    <p className={`leading-relaxed whitespace-pre-line font-medium ${isMobile ? "text-sm" : "text-sm md:text-base"}`}>{content}</p>
                )}

                {/* Kappy Reassurances (Confidence Builder) */}
                {!isLoading && reassurances && reassurances.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                        {reassurances.map((r, i) => (
                            <p key={i} className="text-[11px] text-indigo-600 italic flex items-center gap-1.5 font-medium">
                                <span>💝</span> {r}
                            </p>
                        ))}
                    </div>
                )}

                {/* Insights Copy Button (when God Mode active & traceReport is present) */}
                {isGodMode && message.traceReport && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex justify-end">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                copyGodModeSummary();
                            }}
                            className="text-[10px] font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-1 bg-cyan-50 hover:bg-cyan-100 px-2 py-1 rounded transition-colors"
                            title="Copy God Mode Markdown Summary"
                        >
                            {copied ? (
                                <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Copied!</span>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>Copy Trace Insights</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Product Recommendations Horizontal Cards */}
            {isAssistant && ((products && products.length > 0) || transparencyMessage || (followUpSuggestions && followUpSuggestions.length > 0)) && (
                <div className="w-full mt-4 pb-4 animate-fade-in">
                    
                    {/* Transparency Message & Follow Up Chips */}
                    {(transparencyMessage || followUpSuggestions) && (
                        <div className="mb-4 space-y-3 max-w-2xl">
                            {transparencyMessage && (
                                <div className="text-xs text-violet-700 bg-violet-50 border border-violet-200/60 rounded-xl px-4 py-2.5 flex items-start gap-2 shadow-sm animate-pulse-glow">
                                    <span className="text-violet-500 mt-0.5">🧠</span>
                                    <span className="font-bold">{transparencyMessage}</span>
                                </div>
                            )}
                            
                            {followUpSuggestions && followUpSuggestions.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {followUpSuggestions.map((suggestion, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => onFollowUpClick && onFollowUpClick(suggestion)}
                                            className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-violet-50 border border-slate-200/60 hover:border-violet-300 text-slate-600 hover:text-violet-700 rounded-full transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {products && products.length > 0 && (
                        /* Hybrid Swipeable Product swiper for mobile */
                        isMobile && !showAllGrid ? (
                            <div className="flex flex-col items-center w-full space-y-3">
                                <div className="flex items-center justify-between w-full gap-3">
                                    <button
                                        disabled={activeIdx === 0}
                                        onClick={() => setActiveIdx(prev => prev - 1)}
                                        className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed shadow-md active:scale-90 transition-all cursor-pointer text-slate-700 font-extrabold"
                                    >
                                        ←
                                    </button>
                                    
                                    <div className="flex-1 min-w-0">
                                        <ProductCard product={products[activeIdx]} isMobile={isMobile} onProductClick={onProductClick} onAddToBundle={onAddToBundle} userId={userId} sessionId={sessionId} />
                                    </div>
    
                                    <button
                                        disabled={activeIdx === Math.min(2, products.length - 1)}
                                        onClick={() => setActiveIdx(prev => prev + 1)}
                                        className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed shadow-md active:scale-90 transition-all cursor-pointer text-slate-700 font-extrabold"
                                    >
                                        →
                                    </button>
                                </div>
                                
                                <div className="flex items-center justify-between w-full px-2 text-xs font-bold">
                                    <span className="text-slate-400">
                                        🌟 Choice {activeIdx + 1} of {Math.min(3, products.length)}
                                    </span>
                                    {products.length > 3 && (
                                        <button
                                            onClick={() => setShowAllGrid(true)}
                                            className="text-violet-600 hover:text-violet-800 underline decoration-dotted cursor-pointer"
                                        >
                                            View All {products.length} Options
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Clean Product Grid */
                            <div className={`grid gap-4 w-full ${isMobile ? "grid-cols-1" : "hidden"}`}>
                                {products?.slice(0, visibleCount).map((product, index) => <ProductCard key={product.id} product={product} isMobile={isMobile} onProductClick={onProductClick} onAddToBundle={onAddToBundle} userId={userId} sessionId={sessionId} />)}
                            </div>
                        )
                    )}

                    {/* Pagination or End of List labels */}
                    {isMobile && showAllGrid && products && products.length > visibleCount && (
                        <div className="col-span-full flex flex-col items-center justify-center w-full mt-4 py-4 border-t border-slate-100 space-y-2.5">
                            <p className="text-xs text-slate-500 font-semibold">
                                We have more options waiting. Would you like to see?
                            </p>
                            <button
                                onClick={() => setVisibleCount(prev => Math.min(prev + 6, products?.length || 0))}
                                className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-95"
                            >
                                Show Next Options
                            </button>
                        </div>
                    )}

                    {isMobile && showAllGrid && products && products.length <= visibleCount && (
                        <div className="col-span-full flex flex-col items-center justify-center w-full mt-4 py-4 border-t border-slate-100">
                            <p className="text-xs text-slate-400 font-bold italic tracking-wide">
                                ✨ {endOfListMessage} ✨
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Tracking Card Timeline Widget */}
            {isAssistant && tracking && (
                <TrackingTimeline data={tracking as any} />
            )}
        </div>
    );
}
