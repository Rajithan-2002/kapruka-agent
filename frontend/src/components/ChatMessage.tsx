"use client";

import React, { useState, useEffect } from "react";
import { Star, Truck, ShoppingCart, ChevronDown, ChevronUp, Package, CheckCircle2, ThumbsUp, ThumbsDown, AlertCircle } from "lucide-react";
import TrackingTimeline from "./TrackingTimeline";

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

    const toggleExpand = (productId: string) => {
        const nextState = !expandedProducts[productId];
        setExpandedProducts(prev => ({
            ...prev,
            [productId]: nextState
        }));

        if (nextState) {
            const product = products?.find(p => p.id === productId);
            if (product) {
                fetch("/api/track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        product: {
                            id: product.id,
                            name: product.name,
                            category: product.category || "General",
                            price: product.price
                        },
                        action: "expand",
                        sessionContext: { sessionId }
                    })
                }).catch(err => console.error("Error tracking expand:", err));
            }
        }
    };

    const submitFeedback = async (product: Product, type: "RELEVANT" | "NOT_RELEVANT") => {
        try {
            setFeedbackSubmitted(prev => ({ ...prev, [product.id]: type }));
            await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: product.id,
                    feedbackType: type,
                    userId: userId || "guest",
                    sessionId: sessionId || "unknown",
                    context: {
                        recipient: "gift",
                        occasion: "occasion",
                        category: product.category || "unknown",
                        strategy: "default"
                    }
                })
            });
        } catch (e) {
            console.error("Error submitting feedback:", e);
        }
    };

    const getReasoningBullets = (product: Product) => {
        // Only return real explanations if provided by the intelligence layer
        if ((product as any).explanations && Array.isArray((product as any).explanations)) {
            return (product as any).explanations;
        }
        if (product.reason) {
            return [product.reason];
        }
        return [];
    };

    const renderProductCard = (product: Product, index: number) => {
        const isExpanded = !!expandedProducts[product.id];
        const reasoningBullets = getReasoningBullets(product);

        return (
            <div
                key={`${product.id}-${index}`}
                className={`relative flex flex-col rounded-2xl bg-white border overflow-hidden transition-all duration-300 hover:shadow-lg shadow-sm w-full ${
                    (product as any).isKappysPick
                        ? "border-rose-450 shadow-md ring-1 ring-rose-450/25"
                        : product.isHighlighted
                        ? "border-amber-450 shadow-md ring-1 ring-amber-450/25"
                        : "border-slate-100"
                }`}
            >
                {/* Recommended Glow Badge */}
                {(product as any).isKappysPick ? (
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold text-white bg-gradient-to-r from-rose-500 to-amber-500 rounded-full shadow-sm animate-pulse">
                        <Star className="w-3 h-3 fill-current text-white" />
                        <span>KAPPY'S PICK</span>
                    </div>
                ) : product.isHighlighted ? (
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold text-slate-900 bg-gradient-to-r from-amber-300 to-yellow-400 rounded-full shadow-sm">
                        <Star className="w-3 h-3 fill-current text-slate-900" />
                        <span>TOP PICK</span>
                    </div>
                ) : null}

                {/* Product Image */}
                <div 
                    className="h-44 w-full bg-slate-50 overflow-hidden relative group cursor-pointer"
                    onClick={() => onProductClick && onProductClick(product.id)}
                >
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {product.delivery && (
                        <div className="absolute bottom-2.5 right-2.5 flex flex-col gap-1">
                            {/* Delivery Intelligence Tag */}
                            <span className={`px-2 py-1 text-[10px] font-bold text-white rounded-lg shadow-sm border ${
                                product.delivery?.toLowerCase().includes("today") || product.delivery?.toLowerCase().includes("tomorrow")
                                    ? "bg-emerald-500 border-emerald-450"
                                    : product.delivery?.toLowerCase().includes("confirmation")
                                    ? "bg-amber-500 border-amber-450"
                                    : "bg-indigo-500 border-indigo-450"
                            }`}>
                                🚚 {product.delivery}
                            </span>
                        </div>
                    )}
                </div>

                {/* Product Info */}
                <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                        <h4 
                            className={`font-bold text-slate-800 line-clamp-2 mb-1.5 leading-snug cursor-pointer hover:text-indigo-600 transition-colors ${isMobile ? "text-sm" : "text-sm md:text-base"}`}
                            onClick={() => onProductClick && onProductClick(product.id)}
                        >
                            {product.name}
                        </h4>
                        
                        {/* Rating Stars */}
                        {(product as any).rating && (
                            <div className="flex items-center gap-1 mb-2">
                                <div className="flex text-amber-400">
                                    <Star className="w-3 h-3 fill-current" />
                                    <Star className="w-3 h-3 fill-current" />
                                    <Star className="w-3 h-3 fill-current" />
                                    <Star className="w-3 h-3 fill-current" />
                                    <Star className="w-3 h-3 fill-current" />
                                </div>
                                <span className="text-[10px] text-slate-400 font-bold">({(product as any).rating})</span>
                            </div>
                        )}

                        <p className="text-lg font-black text-rose-600 mb-3">
                            LKR {product.price.toLocaleString()}
                        </p>

                        {/* Why Kappy Chose This Section */}
                        {reasoningBullets.length > 0 && (
                            <div className="bg-amber-50/50 border border-amber-100/70 p-3 rounded-xl text-[11px] text-slate-700 mb-3 shadow-sm">
                                <span className="font-bold text-amber-800 flex items-center gap-1.5 mb-1.5">
                                    ✨ {(product as any).isKappysPick ? "Kappy's Pick Reason" : "Why Kappy Chose This"}
                                </span>
                                <ul className="space-y-1">
                                    {reasoningBullets.map((bullet: string, bIdx: number) => (
                                        <li key={bIdx} className="flex items-start gap-1 font-medium">
                                            <span className="text-emerald-500 font-bold">✓</span>
                                            <span className="leading-tight">{bullet}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 mt-2">
                        <div className="flex gap-2">
                            <button
                                onClick={() => toggleExpand(product.id)}
                                className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200/80 rounded-xl transition-all duration-200"
                            >
                                {isExpanded ? (
                                    <>Hide <ChevronUp className="w-3.5 h-3.5" /></>
                                ) : (
                                    <>Details <ChevronDown className="w-3.5 h-3.5" /></>
                                )}
                            </button>
                            
                            {onAddToBundle && (
                                <button
                                    onClick={() => onAddToBundle(product)}
                                    className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-black text-white bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 active:scale-95 rounded-xl shadow-md transition-all duration-200 cursor-pointer"
                                >
                                    <ShoppingCart className="w-3.5 h-3.5" />
                                    Add Package
                                </button>
                            )}
                        </div>

                        {/* Details drawer */}
                        {isExpanded && (
                            <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-xs text-slate-600 animate-slide-down space-y-2">
                                {product.reason && (
                                    <p className="leading-relaxed font-medium">
                                        {product.reason}
                                    </p>
                                )}
                                
                                {/* Thumbs Feedback */}
                                {!feedbackSubmitted[product.id] ? (
                                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="text-[10px] text-slate-400 font-bold">Helpful choice?</span>
                                        <div className="flex gap-1.5">
                                            <button 
                                                className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-600 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                                onClick={() => submitFeedback(product, "RELEVANT")}
                                            >
                                                <ThumbsUp className="w-3 h-3 text-emerald-500" /> Yes
                                            </button>
                                            <button 
                                                className="px-2.5 py-1 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                                onClick={() => submitFeedback(product, "NOT_RELEVANT")}
                                            >
                                                <ThumbsDown className="w-3 h-3 text-rose-500" /> No
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center p-2 bg-emerald-50/50 rounded-xl border border-emerald-100 text-[10px] text-emerald-700 font-bold gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Matches noted. Kappy has updated preferences.
                                    </div>
                                )}

                                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                                    <span>Status: {product.inStock ? "✅ In Stock" : "❌ Out of Stock"}</span>
                                    <a
                                        href={product.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-rose-500 hover:underline font-bold"
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
    };

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
                                        {renderProductCard(products[activeIdx], activeIdx)}
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
                            <div className={`grid gap-4 w-full ${isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}>
                                {products?.slice(0, visibleCount).map((product, index) => renderProductCard(product, index))}
                            </div>
                        )
                    )}

                    {/* Pagination or End of List labels */}
                    {(!isMobile || showAllGrid) && products && products.length > visibleCount && (
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

                    {(!isMobile || showAllGrid) && products && products.length <= visibleCount && (
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
