"use client";

import React, { useState } from "react";
import { Star, Truck, ShoppingCart, ChevronDown, ChevronUp, Package, CheckCircle2 } from "lucide-react";

export interface Product {
    id: string;
    name: string;
    price: number;
    image_url: string;
    url: string;
    isKappyPick?: boolean;
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
}

interface ChatMessageProps {
    message: Message;
    onAddToBundle?: (product: Product) => void;
}

export default function ChatMessage({ message, onAddToBundle }: ChatMessageProps) {
    const { role, content, isLoading, loadingText, products, tracking, isCheckout } = message;
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

            {/* Product Recommendations Grid (If Available) */}
            {isAssistant && products && products.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full mt-4 animate-fade-in">
                    {products.map((product) => {
                        const isExpanded = !!expandedProducts[product.id];
                        return (
                            <div
                                key={product.id}
                                className={`relative flex flex-col rounded-2xl bg-slate-900/70 border overflow-hidden transition-all duration-300 hover:scale-[1.02] shadow-xl ${
                                    product.isKappyPick
                                        ? "border-amber-400/80 shadow-amber-950/20 shadow-xl"
                                        : "border-white/10"
                                }`}
                            >
                                {/* Kappy's Pick Glow Badge */}
                                {product.isKappyPick && (
                                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-950 bg-gradient-to-r from-amber-300 to-yellow-500 rounded-full shadow-md animate-pulse">
                                        <Star className="w-3.5 h-3.5 fill-current" />
                                        <span>Kappy&apos;s Pick</span>
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
                                                    onClick={() => onAddToBundle(product)}
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
        </div>
    );
}
