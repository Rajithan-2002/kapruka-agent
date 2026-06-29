"use client";

import React, { useState } from "react";
import { Star, ShoppingCart, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, CheckCircle2 } from "lucide-react";
import { Product } from "./ChatMessage";

interface ProductCardProps {
    product: Product;
    isMobile?: boolean;
    compact?: boolean;
    onProductClick?: (productId: string) => void;
    onAddToBundle?: (product: Product) => void;
    userId?: string;
    sessionId?: string | null;
}

export default function ProductCard({ product, isMobile = false, compact = false, onProductClick, onAddToBundle, userId, sessionId }: ProductCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState<"RELEVANT" | "NOT_RELEVANT" | null>(null);

    const toggleExpand = () => {
        const nextState = !isExpanded;
        setIsExpanded(nextState);

        if (nextState) {
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
    };

    const submitFeedback = async (type: "RELEVANT" | "NOT_RELEVANT") => {
        try {
            setFeedbackSubmitted(type);
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

    const getReasoningBullets = (p: Product) => {
        if ((p as any).explanations && Array.isArray((p as any).explanations)) {
            return (p as any).explanations;
        }
        if (p.reason) {
            return [p.reason];
        }
        return [];
    };

    const reasoningBullets = getReasoningBullets(product);

    return (
        <div
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
                className={`${compact ? "h-32" : "h-44"} w-full bg-slate-50 overflow-hidden relative group cursor-pointer`}
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
            <div className={`flex-1 ${compact ? "p-3" : "p-4"} flex flex-col justify-between`}>
                <div>
                    <h4 
                        className={`font-bold text-slate-800 line-clamp-2 mb-1.5 leading-snug cursor-pointer hover:text-indigo-600 transition-colors ${compact ? "text-xs" : isMobile ? "text-sm" : "text-sm md:text-base"}`}
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

                    <p className={`${compact ? "text-sm" : "text-lg"} font-black text-rose-600 mb-3`}>
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
                            onClick={toggleExpand}
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
                            {!feedbackSubmitted ? (
                                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[10px] text-slate-400 font-bold">Helpful choice?</span>
                                    <div className="flex gap-1.5">
                                        <button 
                                            className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-600 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                            onClick={() => submitFeedback("RELEVANT")}
                                        >
                                            <ThumbsUp className="w-3 h-3 text-emerald-500" /> Yes
                                        </button>
                                        <button 
                                            className="px-2.5 py-1 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                            onClick={() => submitFeedback("NOT_RELEVANT")}
                                        >
                                            <ThumbsDown className="w-3 h-3 text-rose-500" /> No
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center p-2 bg-emerald-50/50 rounded-xl border border-emerald-100 text-[10px] text-emerald-700 font-bold gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Matches noted.
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
}
