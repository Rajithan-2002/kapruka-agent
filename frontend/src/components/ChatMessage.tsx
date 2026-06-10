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
}

interface ChatMessageProps {
    message: Message;
    isDebugMode?: boolean;
    onAddToBundle?: (product: Product) => void;
}

export default function ChatMessage({ message, isDebugMode = false, onAddToBundle }: ChatMessageProps) {
    const { role, content, isLoading, loadingText, products, tracking, isCheckout, traceReport } = message;
    const isAssistant = role === "assistant";

    // Track which products have expanded details inline
    const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

    const toggleExpand = (productId: string) => {
        setExpandedProducts(prev => ({
            ...prev,
            [productId]: !prev[productId]
        }));
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
            </div>

            {/* Product Recommendations Horizontal Carousel (Mobile First) */}
            {isAssistant && products && products.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 w-full mt-4 pb-4 animate-fade-in">
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
                                                <p className="leading-relaxed mb-2">{product.reason || "Great quality product matching your requirements."}</p>
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

            {/* Debug UI Trace Report */}
            {isDebugMode && traceReport && (
                <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-purple-500/30 overflow-hidden text-xs font-mono text-purple-300 shadow-inner w-full max-w-2xl mx-auto md:mx-0">
                    <div className="flex items-center gap-2 mb-2 font-bold text-purple-400 border-b border-purple-500/20 pb-2">
                        <span>🔍 RECOMMENDATION TRACE DIAGNOSTIC</span>
                        <div className="ml-auto flex items-center gap-2">
                            {traceReport.context_override && (
                                <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded text-[10px] animate-pulse">
                                    CONTEXT OVERRIDE: REFRESHED
                                </span>
                            )}
                            <span className="bg-purple-500/20 px-2 py-0.5 rounded text-[10px]">
                                {traceReport.mode?.toUpperCase() || 'UNKNOWN'} MODE
                            </span>
                        </div>
                    </div>
                    {traceReport.context_override && (
                        <div className="mb-3 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded flex justify-between items-center text-[10px] text-rose-300">
                            <div><strong>Prev Budget:</strong> Rs. {traceReport.previous_budget || 'None'}</div>
                            <div>→</div>
                            <div><strong>New Budget:</strong> Rs. {traceReport.current_budget || 'None'}</div>
                            <div className="px-2 py-0.5 bg-rose-500/20 rounded">Cache Wiped</div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1 mb-4">
                        <div><span className="opacity-50">Query:</span> {traceReport.query}</div>
                        <div><span className="opacity-50">Trace ID:</span> {traceReport.trace_id?.split('-')[0]}</div>
                        <div className="text-emerald-400"><span className="opacity-50 text-purple-300">Retrieved:</span> {traceReport.raw_product_count}</div>
                        <div className="text-orange-400"><span className="opacity-50 text-purple-300">Deduped:</span> {traceReport.deduplicated_count || 0}</div>
                        <div className="text-rose-400"><span className="opacity-50 text-purple-300">Filtered:</span> {traceReport.filtered_count}</div>
                        <div className="text-blue-400"><span className="opacity-50 text-purple-300">Ranked:</span> {traceReport.ranked_count}</div>
                        <div className="text-amber-400"><span className="opacity-50 text-purple-300">Displayed:</span> {traceReport.displayed_count}</div>
                        <div className="text-indigo-400"><span className="opacity-50 text-purple-300">Cached:</span> {traceReport.cache_remaining || 0}</div>
                    </div>
                    
                    <div className="border border-purple-500/20 rounded overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-purple-900/30 border-b border-purple-500/20">
                                    <th className="p-2 font-semibold">Product</th>
                                    <th className="p-2 font-semibold">Stage</th>
                                    <th className="p-2 font-semibold">Status</th>
                                    <th className="p-2 font-semibold">Reason</th>
                                    <th className="p-2 font-semibold text-right">Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {traceReport.trace_data?.map((log: any, i: number) => (
                                    <tr key={i} className={`border-b border-purple-500/10 hover:bg-purple-900/20 ${log.status === 'FAILED' ? 'opacity-60' : ''}`}>
                                        <td className="p-2 truncate max-w-[150px]">{log.productName}</td>
                                        <td className="p-2 text-[10px]">{log.stage}</td>
                                        <td className="p-2">
                                            <span className={`px-1.5 py-0.5 rounded ${log.status === 'PASSED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                {log.status}
                                            </span>
                                            {log.isHighlighted && <span className="ml-1 text-amber-400">★</span>}
                                        </td>
                                        <td className="p-2 text-[10px] max-w-[150px] truncate" title={log.reason}>{log.reason || '-'}</td>
                                        <td className="p-2 text-right">{log.score || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
