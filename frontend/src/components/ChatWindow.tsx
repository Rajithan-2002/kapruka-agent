"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Trash2, Gift, CreditCard, ShoppingBag, X, Check, BrainCircuit, Activity } from "lucide-react";
import ChatInput from "./ChatInput";
import ChatMessage, { Message, Product } from "./ChatMessage";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import JudgePanel from "./JudgePanel";

const getUniqueId = (prefix: string): string => `${prefix}-${Date.now()}`;

// ALGORITHM 25 — WAITING STATE PERSONALITY: Varied loading messages per context
const LOADING_PHRASES: Record<string, string[]> = {
    tracking: [
        "Let me check where your parcel is right now... 📦",
        "Checking on it for you — give me a second 😊",
        "Mama balanna — parcel eka koheda kiyala... 📦",
    ],
    delivery: [
        "Checking if we can get this to you in time... 🚚",
        "Just verifying delivery — won't take a second 😊",
        "Checking if [city] delivery is doable... 🗺️",
    ],
    search: [
        "Let me check what we've got for you... 🔍",
        "Machan hold on, let me find the right one for you... 🔍",
        "Searching through the good stuff — one moment 😊",
        "Looking for the best option in the catalog... ✨",
    ],
    reorder: [
        "Scanning your purchase history... 🔄",
        "Finding what you ordered before... 🔄",
    ],
    order: [
        "Putting this together now... ✍️",
        "Almost done — setting up your order...",
        "Creating your order — just a moment ⏳",
    ],
    default: [
        "Thinking... 🧠",
        "Give me a second — working on it 😊",
        "On it... 🧠",
    ],
};

function getLoadingPhrase(text: string): string {
    const normalized = text.toLowerCase();
    let pool = LOADING_PHRASES.default;
    if (normalized.includes("track") || normalized.includes("kp")) {
        pool = LOADING_PHRASES.tracking;
    } else if (normalized.includes("deliver") || normalized.includes("jaffna") || normalized.includes("kandy") || normalized.includes("colombo") || normalized.includes("place")) {
        pool = LOADING_PHRASES.delivery;
    } else if (normalized.includes("gift") || normalized.includes("cake") || normalized.includes("flower") || normalized.includes("chocolate") || normalized.includes("buy") || normalized.includes("find")) {
        pool = LOADING_PHRASES.search;
    } else if (normalized.includes("reorder") || normalized.includes("same as last") || normalized.includes("order again")) {
        pool = LOADING_PHRASES.reorder;
    } else if (normalized.includes("checkout") || normalized.includes("order") || normalized.includes("confirm")) {
        pool = LOADING_PHRASES.order;
    }
    return pool[Math.floor(Math.random() * pool.length)];
}

export default function ChatWindow() {
    const [userTone, setUserTone] = useState<string>("neutral");
    
    // Fix for Supabase OAuth Redirects when the whitelist lacks a wildcard (*)
    // If Supabase redirects to /?code=... instead of /auth/callback?code=...
    useEffect(() => {
        if (typeof window !== "undefined" && window.location.search.includes("code=")) {
            window.location.href = `/auth/callback${window.location.search}`;
        }
    }, []);

    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const supabase = createClient();

    const [messages, setMessages] = useState<Message[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [conversations, setConversations] = useState<{ id: string; title: string; updated_at?: string }[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [typingText, setTypingText] = useState("");
    const [hasCheckedSession, setHasCheckedSession] = useState(false);

    // Bundle state
    const [bundle, setBundle] = useState<Product[]>([]);
    const [isBundleOpen, setIsBundleOpen] = useState(false);

    // Active memory states shown in header
    const [activeMemories, setActiveMemories] = useState<string[]>([]);
    
    // Checkout states
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState<"summary" | "payment" | "success">("summary");
    const [recipientName, setRecipientName] = useState("Amma");
    const [deliveryAddress, setDeliveryAddress] = useState("No 12, Flower Rd, Colombo 03");
    
    const [isJudgeMode, setIsJudgeMode] = useState(false);
    const [selectedTraceData, setSelectedTraceData] = useState<any>(null);
    const [isDebugMode, setIsDebugMode] = useState(false);
    
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Toggle Judge Mode with Ctrl+Shift+D
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                setIsJudgeMode(prev => !prev);
                if (isJudgeMode) setSelectedTraceData(null); // Clear selection on close
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isJudgeMode]);

    // Auto-scroll to bottom of messages safely (prevents layout shift bugs)
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: "smooth"
            });
        }
    }, [messages, isTyping]);

    // Auth Setup
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setIsAuthLoading(false);
        };
        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user || null);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    // Fetch conversation list whenever active user exists or messages update (captures title generation updates)
    useEffect(() => {
        if (!user) return;
        
        const fetchConversations = async () => {
            try {
                const res = await fetch("/api/conversations");
                const data = await res.json();
                if (data.conversations) {
                    setConversations(data.conversations);
                }
            } catch (err) {
                console.error("Error loading conversations:", err);
            }
        };

        fetchConversations();
    }, [user, messages]);

    // Initialize or load latest conversation on mount/login
    useEffect(() => {
        if (!user || hasCheckedSession) return;

        const initSession = async () => {
            try {
                const res = await fetch("/api/conversations");
                const data = await res.json();
                if (data.conversations && data.conversations.length > 0) {
                    // Try to restore last active conversation from localStorage
                    const savedActiveId = localStorage.getItem("kappy_active_conv_id");
                    const stillExists = data.conversations.some((c: any) => c.id === savedActiveId);
                    if (savedActiveId && stillExists) {
                        setActiveConversationId(savedActiveId);
                    } else {
                        setActiveConversationId(data.conversations[0].id);
                    }
                } else {
                    // Create first conversation
                    const newId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                    await fetch("/api/conversations", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: newId, title: "New Chat" })
                    });
                    setActiveConversationId(newId);
                }
                setHasCheckedSession(true);
            } catch (err) {
                console.error(err);
            }
        };
        initSession();
    }, [user, hasCheckedSession]);

    // Fetch messages when active conversation switches
    useEffect(() => {
        if (!activeConversationId) return;
        localStorage.setItem("kappy_active_conv_id", activeConversationId);

        const loadMessages = async () => {
            try {
                const res = await fetch(`/api/conversations/${activeConversationId}/messages`);
                const data = await res.json();
                if (data.messages) {
                    setMessages(data.messages);
                }
            } catch (err) {
                console.error("Error loading messages:", err);
            }
        };

        loadMessages();
    }, [activeConversationId]);

    const startNewChat = async () => {
        const newId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        try {
            await fetch("/api/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: newId, title: "New Chat" })
            });
            setActiveConversationId(newId);
            setMessages([]);
            setBundle([]);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await fetch(`/api/conversations?id=${id}`, {
                method: "DELETE"
            });
            
            // Update the local state list immediately
            setConversations(prev => prev.filter(c => c.id !== id));
            
            if (activeConversationId === id) {
                const remaining = conversations.filter(c => c.id !== id);
                if (remaining.length > 0) {
                    setActiveConversationId(remaining[0].id);
                } else {
                    // Initialize a fresh chat session
                    const newId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                    await fetch("/api/conversations", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: newId, title: "New Chat" })
                    });
                    setActiveConversationId(newId);
                    setMessages([]);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const addToBundle = (product: Product) => {
        if (!bundle.some(item => item.id === product.id)) {
            setBundle(prev => [...prev, product]);
            setIsBundleOpen(true);
            
            // Track in purchase history
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
                    action: "added_to_bundle",
                    sessionContext: { sessionId: activeConversationId }
                })
            }).catch(err => console.error("Error tracking add to bundle:", err));

            // Add a temporary system message to indicate item was added
            const systemMsg: Message = {
                id: `system-add-${Date.now()}`,
                role: "assistant",
                content: `Added "${product.name}" to your bundle! 🎁`
            };
            setMessages(prev => [...prev, systemMsg]);
        }
    };

    const removeFromBundle = (productId: string) => {
        setBundle(prev => prev.filter(item => item.id !== productId));
    };

    const clearChat = () => {
        setMessages([]);
        setActiveMemories([]);
        setBundle([]);
        const newSessionId = getUniqueId("conv");
        setActiveConversationId(newSessionId);
    };

    const fetchGeneralResponse = async (text: string) => {
        setIsTyping(true);
        // ALGORITHM 25 — WAITING STATE PERSONALITY: Pick a varied, personality-driven loading phrase
        setTypingText(getLoadingPhrase(text));

        try {
            const chatHistory = messages
                .filter(msg => msg.role === "user" || msg.role === "assistant")
                .map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: text,
                    history: chatHistory,
                    sessionId: activeConversationId
                }),
            });

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            const aiMsgId = `kappy-${Date.now()}`;
            setMessages(prev => [
                ...prev,
                { id: aiMsgId, role: "assistant", content: "" }
            ]);
            setIsTyping(false);

            let accumulatedText = "";
            let customData: any = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(Boolean);
                
                for (const line of lines) {
                    if (line.startsWith('0:')) {
                        try {
                            const textPart = JSON.parse(line.substring(2));
                            accumulatedText += textPart;
                            setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: accumulatedText } : m));
                        } catch (e) {}
                    } else if (line.startsWith('2:') || line.startsWith('8:') || line.startsWith('data:')) {
                        try {
                            const dataStr = line.startsWith('data:') ? line.substring(5) : line.substring(2);
                            const parsed = JSON.parse(dataStr);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                customData = { ...customData, ...parsed[0] };
                            } else if (parsed && typeof parsed === 'object') {
                                customData = { ...customData, ...parsed };
                            }
                            // Update UI immediately with products
                            if (customData) {
                                setMessages(prev => prev.map(m => m.id === aiMsgId ? {
                                    ...m,
                                    products: customData.products || m.products,
                                    tracking: customData.tracking || m.tracking,
                                    traceReport: customData.traceReport || m.traceReport,
                                    intelligenceTrace: customData.intelligenceTrace || m.intelligenceTrace,
                                    judgeModeTrace: customData.judgeModeTrace || m.judgeModeTrace,
                                    transparencyMessage: customData.transparencyMessage || m.transparencyMessage,
                                    followUpSuggestions: customData.followUpSuggestions || m.followUpSuggestions
                                } : m));
                            }
                        } catch (e) {}
                    } else if (line.startsWith('{')) {
                        try {
                            const parsedData = JSON.parse(line);
                            if (parsedData.role === "assistant") {
                                accumulatedText = parsedData.content;
                                customData = { ...customData, ...parsedData };
                                setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: accumulatedText } : m));
                            }
                        } catch (e) {}
                    }
                }
            }

            if (customData) {
                setMessages(prev => prev.map(m => m.id === aiMsgId ? {
                    ...m,
                    products: customData.products,
                    tracking: customData.tracking,
                    traceReport: customData.traceReport || null,
                    intelligenceTrace: customData.intelligenceTrace || null,
                    judgeModeTrace: customData.judgeModeTrace || null,
                    transparencyMessage: customData.transparencyMessage || null,
                    followUpSuggestions: customData.followUpSuggestions || null
                } : m));
                
                if (customData.activeMemories && Array.isArray(customData.activeMemories)) {
                    setActiveMemories(customData.activeMemories);
                }
            }
        } catch (error) {
            console.error(error);
            setIsTyping(false);
            setMessages(prev => [
                ...prev,
                {
                    id: `kappy-${Date.now()}`,
                    role: "assistant",
                    content: "Machan, sorry, I couldn't connect to my brain. Let's try again in a bit! 😕"
                }
            ]);
        }
    };

    const handleSendMessage = async (text: string) => {
        // 1. Add User Message
        const userMsgId = getUniqueId("user");
        setMessages(prev => [...prev, { id: userMsgId, role: "user", content: text }]);

        // 2. Call AI Backend
        fetchGeneralResponse(text);
    };



    // Calculate bundle total
    const bundleTotal = bundle.reduce((sum, item) => sum + item.price, 0);

    const handleCheckoutSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setCheckoutStep("payment");
        
        setTimeout(() => {
            setCheckoutStep("success");
            
            // Track the purchased items
            bundle.forEach(item => {
                fetch("/api/track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        product: {
                            id: item.id,
                            name: item.name,
                            category: item.category || "General",
                            price: item.price
                        },
                        action: "purchased",
                        sessionContext: { sessionId: activeConversationId, recipientName, deliveryAddress }
                    })
                }).catch(err => console.error("Error tracking purchase:", err));
            });

            setBundle([]); // Clear bundle on successful payment
            
            // Add a success confirmation to chat
            const confirmationMsg: Message = {
                id: `success-${Date.now()}`,
                role: "assistant",
                content: `Machan, everything is set! 🎉\n\nYour order has been created. I've sent a confirmation to your email. I'll monitor the delivery and let you know when the courier is nearby! Order details:\n\n- **Recipient:** ${recipientName}\n- **Delivery Address:** ${deliveryAddress}\n- **Total Paid:** Rs. ${(bundleTotal).toLocaleString()}\n\nThank you for shopping with your friend Kappy! 😊`
            };
            setMessages(prev => [...prev, confirmationMsg]);
        }, 2000);
    };

    if (isAuthLoading) {
        return (
            <div className="flex-1 h-screen bg-[#090D16] flex items-center justify-center">
                <BrainCircuit className="w-12 h-12 text-amber-400 animate-pulse" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#090D16] text-white p-6 relative overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[150px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />
                
                <div className="relative z-10 flex flex-col items-center bg-slate-900/50 backdrop-blur-2xl p-10 rounded-3xl border border-white/10 shadow-2xl max-w-md w-full text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 shadow-lg shadow-rose-950/40 flex items-center justify-center mb-6">
                        <span className="font-black text-3xl text-slate-950">K</span>
                    </div>
                    <h2 className="text-2xl font-extrabold mb-2">Welcome to Kappy AI</h2>
                    <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                        Sign in to sync your preferences, remember relationships, and get truly personalized Kapruka recommendations.
                    </p>
                    <button
                        onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })}
                        className="w-full flex items-center justify-center gap-3 py-3.5 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition-all active:scale-95 shadow-lg"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Sign in with Google
                    </button>
                    
                    <button
                        onClick={() => setUser({ id: "guest-123", email: "guest@kapruka.com" } as User)}
                        className="mt-4 w-full py-3.5 bg-transparent border border-white/20 text-white/70 font-medium rounded-xl hover:bg-white/5 hover:text-white transition-all active:scale-95"
                    >
                        Continue as Guest
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex flex-col md:flex-row flex-1 h-screen bg-[#090D16] overflow-hidden text-white font-sans">
            
            {/* Sidebar history */}
            <div className="w-full md:w-64 bg-slate-950/80 backdrop-blur-xl border-r border-white/5 flex flex-col h-[30vh] md:h-full z-20">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="font-extrabold text-sm tracking-wide text-slate-200">Chat History</span>
                    </div>
                    <button 
                        onClick={startNewChat}
                        className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all flex items-center justify-center"
                        title="New Chat"
                    >
                        <span className="text-xs px-1">New Chat</span>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {conversations.length === 0 ? (
                        <div className="text-xs text-slate-500 text-center py-6">No previous chats.</div>
                    ) : (
                        conversations.map((conv) => (
                            <div
                                key={conv.id}
                                onClick={() => setActiveConversationId(conv.id)}
                                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                                    activeConversationId === conv.id
                                        ? "bg-white/10 text-white font-semibold border border-white/10"
                                        : "hover:bg-white/5 text-slate-400 hover:text-slate-200"
                                }`}
                            >
                                <span className="text-xs truncate flex-1 pr-2">{conv.title}</span>
                                <button
                                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded-md text-rose-400 transition-opacity"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Judge Mode Toggle */}
                <div className="p-4 border-t border-white/5 bg-slate-900/50">
                    <button
                        onClick={() => setIsJudgeMode(!isJudgeMode)}
                        className={`w-full py-2.5 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all active:scale-95 ${
                            isJudgeMode 
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                                : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                        <Activity className="w-4 h-4" />
                        {isJudgeMode ? "Judge Mode Active" : "Enable Judge Mode"}
                    </button>
                </div>
            </div>

            {/* Background Glow effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />

            {/* Main Chat Content Panel */}
            <div className="flex-1 flex flex-col h-full relative z-10 border-r border-white/5">
                
                {/* Header Widget */}
                <header className="shrink-0 flex items-center justify-between px-6 py-4 bg-slate-900/40 backdrop-blur-xl border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 shadow-lg shadow-rose-950/20">
                            <span className="font-black text-lg text-slate-950">K</span>
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#090D16] rounded-full" />
                        </div>
                        <div>
                            <h1 className="font-extrabold text-white text-base leading-tight">Kappy</h1>
                            <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                                Your Shopping Friend <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            </p>
                        </div>
                    </div>

                    {/* Active Memory Context indicator */}
                    {activeMemories.length > 0 && (
                        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl">
                            <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                                <BrainCircuit className="w-3.5 h-3.5" /> Active Context:
                            </span>
                            <div className="flex gap-1.5">
                                {activeMemories.map((mem, i) => (
                                    <span key={i} className="px-2 py-0.5 text-[10px] font-semibold bg-white/10 text-white rounded-md">
                                        {mem}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsDebugMode(!isDebugMode)}
                            title="Toggle Developer Trace View"
                            className={`p-2.5 rounded-xl border transition-all active:scale-95 ${isDebugMode ? "bg-purple-500/20 text-purple-400 border-purple-500/50" : "bg-white/5 text-slate-400 hover:text-purple-400 border-white/5 hover:border-purple-500/20"}`}
                        >
                            <BrainCircuit className="w-4 h-4" />
                        </button>

                        <button
                            onClick={clearChat}
                            title="Reset Chat"
                            className="p-2.5 text-slate-400 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 rounded-xl transition-all active:scale-95"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        
                        {user && (
                            <div className="flex items-center gap-2 pl-3 border-l border-white/10">
                                <img 
                                    src={user.user_metadata?.avatar_url || "https://www.gravatar.com/avatar/?d=mp"} 
                                    alt="Avatar" 
                                    className="w-8 h-8 rounded-full border border-white/10" 
                                />
                                <button 
                                    onClick={() => supabase.auth.signOut()}
                                    className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                                >
                                    Log out
                                </button>
                            </div>
                        )}
                        
                        
                        {/* Bundle Sidebar Toggle (Mobile only) */}
                        <button
                            onClick={() => setIsBundleOpen(!isBundleOpen)}
                            className="md:hidden relative p-2.5 text-slate-300 bg-white/5 border border-white/5 rounded-xl active:scale-95"
                        >
                            <ShoppingBag className="w-4 h-4" />
                            {bundle.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-rose-500 text-[10px] font-bold rounded-full border-2 border-[#090D16]">
                                    {bundle.length}
                                </span>
                            )}
                        </button>
                    </div>
                </header>

                {/* Chat Message Box Container */}
                <div 
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto px-6 py-6 space-y-4 scrollbar-thin relative"
                >
                    {messages.map((msg, i) => (
                            <div 
                                key={msg.id} 
                                className={`transition-all duration-300 ${isJudgeMode ? 'cursor-pointer hover:opacity-80 hover:bg-white/5 rounded-2xl p-2 -mx-2' : ''}`}
                                onClick={() => {
                                    if (isJudgeMode) {
                                        setSelectedTraceData({
                                            traceReport: msg.traceReport,
                                            intelligenceTrace: msg.judgeModeTrace,
                                            message: msg.content
                                        });
                                    }
                                }}
                            >
                                <ChatMessage 
                                    message={msg} 
                                    isDebugMode={isDebugMode}
                                    userId={user?.id}
                                    sessionId={activeConversationId}
                                    onAddToBundle={addToBundle}
                                    onFollowUpClick={(text) => handleSendMessage(text)}
                                />
                            </div>
                    ))}

                    {/* Simulated assistant typing indicator */}
                    {isTyping && (
                        <ChatMessage
                            message={{
                                id: "typing-indicator",
                                role: "assistant",
                                content: "",
                                isLoading: true,
                                loadingText: typingText
                            }}
                        />
                    )}

                    {/* Scroll anchor padding */}
                    <div className="h-2" />
                </div>

                {/* ALGORITHM 20 — COLD START: Quick-tap chips to remove "what do I even type?" paralysis */}
                {messages.length <= 1 && !isTyping && (
                    <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/10 border-t border-white/5">
                        <button
                            id="chip-gift-for-someone"
                            onClick={() => handleSendMessage("🎂 Gift for someone")}
                            className="flex items-center justify-center gap-2 p-3 text-xs md:text-sm font-semibold text-slate-200 bg-slate-900/60 hover:bg-amber-500/10 active:scale-95 border border-white/10 hover:border-amber-400/40 rounded-xl shadow-lg transition-all duration-200"
                        >
                            🎁 Gift for Someone
                        </button>
                        <button
                            id="chip-track-order"
                            onClick={() => handleSendMessage("📦 Track my order")}
                            className="flex items-center justify-center gap-2 p-3 text-xs md:text-sm font-semibold text-slate-200 bg-slate-900/60 hover:bg-rose-500/10 active:scale-95 border border-white/10 hover:border-rose-400/40 rounded-xl shadow-lg transition-all duration-200"
                        >
                            📦 Track my Order
                        </button>
                        <button
                            id="chip-reorder"
                            onClick={() => handleSendMessage("🔄 Reorder something")}
                            className="flex items-center justify-center gap-2 p-3 text-xs md:text-sm font-semibold text-slate-200 bg-slate-900/60 hover:bg-indigo-500/10 active:scale-95 border border-white/10 hover:border-indigo-400/40 rounded-xl shadow-lg transition-all duration-200"
                        >
                            🔄 Reorder Something
                        </button>
                        <button
                            id="chip-just-browsing"
                            onClick={() => handleSendMessage("Just browsing")}
                            className="flex items-center justify-center gap-2 p-3 text-xs md:text-sm font-semibold text-slate-200 bg-slate-900/60 hover:bg-slate-800 active:scale-95 border border-white/10 hover:border-white/20 rounded-xl shadow-lg transition-all duration-200"
                        >
                            🛒 Just Browsing
                        </button>
                    </div>
                )}

                {/* Bottom Input Area */}
                <div className="shrink-0 p-6 bg-slate-900/30 backdrop-blur-xl border-t border-white/5">
                    <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
                </div>
            </div>

            {/* Persistent Right Panel: Bundle Builder (Desktop View / Collapsible Drawer) */}
            <aside
                className={`w-full md:w-[360px] h-full bg-slate-950/70 backdrop-blur-2xl border-l border-white/5 flex flex-col transition-all duration-500 relative z-20 ${
                    isBundleOpen
                        ? "fixed inset-y-0 right-0 md:relative"
                        : "fixed inset-y-0 right-[-100%] md:relative md:right-0 md:flex"
                }`}
            >
                <div className="flex items-center justify-between px-6 py-5 bg-slate-900/40 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-tr from-amber-400 to-rose-500 text-slate-950 rounded-lg">
                            <Gift className="w-4 h-4" />
                        </div>
                        <h2 className="font-extrabold text-white text-base">Your Bundle Package</h2>
                    </div>
                    
                    {/* Close drawer (Mobile only) */}
                    <button
                        onClick={() => setIsBundleOpen(false)}
                        className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Package item list */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {bundle.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500">
                            <ShoppingBag className="w-12 h-12 mb-3 opacity-30 animate-pulse text-amber-400" />
                            <h3 className="font-semibold text-sm text-slate-400 mb-1">Create Your Custom Bundle</h3>
                            <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                                Add recommended cakes, flowers, and hampers to pack them into a single surprise package.
                            </p>
                        </div>
                    ) : (
                        bundle.map((item) => (
                            <div
                                key={item.id}
                                className="flex gap-3 p-3 bg-white/5 border border-white/5 rounded-xl hover:border-white/10 group transition-all"
                            >
                                <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-14 h-14 object-cover rounded-lg bg-slate-900 border border-white/5"
                                />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-white text-xs md:text-sm truncate">{item.name}</h4>
                                    <p className="text-xs text-amber-400 font-semibold mt-0.5">
                                        Rs. {item.price.toLocaleString()}
                                    </p>
                                    <button
                                        onClick={() => removeFromBundle(item.id)}
                                        className="text-[10px] text-rose-400 hover:underline mt-1 font-medium block"
                                    >
                                        Remove Item
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Subtotal & Checkout Section */}
                {bundle.length > 0 && (
                    <div className="p-6 bg-slate-900/60 border-t border-white/5 space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400 font-medium">Bundle Subtotal</span>
                            <span className="text-lg font-black text-white">Rs. {bundleTotal.toLocaleString()}</span>
                        </div>
                        
                        <button
                            onClick={() => {
                                setIsCheckoutOpen(true);
                                setCheckoutStep("summary");
                            }}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 active:scale-95 text-white font-extrabold text-sm rounded-xl shadow-lg transition-all"
                        >
                            <CreditCard className="w-4 h-4" />
                            Proceed to Checkout
                        </button>
                    </div>
                )}
            </aside>

            {/* Checkout Dialog Modal */}
            {isCheckoutOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                    <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/15 bg-slate-950/40">
                            <div>
                                <h3 className="font-extrabold text-white text-base">Kapruka Secure Checkout</h3>
                                <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Encrypted Session
                                </p>
                            </div>
                            {checkoutStep !== "payment" && (
                                <button
                                    onClick={() => setIsCheckoutOpen(false)}
                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        {/* Modal Body */}
                        {checkoutStep === "summary" && (
                            <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-4">
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recipient Details</h4>
                                    
                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Recipient Name</label>
                                        <input
                                            type="text"
                                            value={recipientName}
                                            onChange={(e) => setRecipientName(e.target.value)}
                                            required
                                            className="w-full px-3.5 py-2 text-sm bg-slate-950 border border-white/10 rounded-xl focus:outline-none focus:border-amber-500 text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Delivery Address</label>
                                        <input
                                            type="text"
                                            value={deliveryAddress}
                                            onChange={(e) => setDeliveryAddress(e.target.value)}
                                            required
                                            className="w-full px-3.5 py-2 text-sm bg-slate-950 border border-white/10 rounded-xl focus:outline-none focus:border-amber-500 text-white"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Package Contents</h4>
                                    <div className="max-h-28 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                                        {bundle.map((item) => (
                                            <div key={item.id} className="flex justify-between items-center text-xs py-1.5 border-b border-white/5">
                                                <span className="text-slate-300 truncate max-w-[280px]">{item.name}</span>
                                                <span className="font-semibold text-slate-100">Rs. {item.price.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                                    <span className="text-sm text-slate-400 font-semibold">Total Amount</span>
                                    <span className="text-xl font-black text-amber-400">Rs. {bundleTotal.toLocaleString()}</span>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 active:scale-95 text-white font-extrabold text-sm rounded-xl shadow-lg transition-all"
                                >
                                    Proceed to Payment
                                </button>
                            </form>
                        )}

                        {checkoutStep === "payment" && (
                            <div className="p-8 text-center flex flex-col items-center justify-center space-y-4">
                                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                <div>
                                    <h4 className="font-bold text-white text-base">Processing Payment...</h4>
                                    <p className="text-xs text-slate-400 mt-1">Contacting Kapruka checkout gateway securely.</p>
                                </div>
                            </div>
                        )}

                        {checkoutStep === "success" && (
                            <div className="p-8 text-center flex flex-col items-center justify-center space-y-4">
                                <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                    <Check className="w-8 h-8" />
                                </div>
                                <div>
                                    <h4 className="font-extrabold text-white text-base">Payment Completed Successfully!</h4>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Your order has been authorized and dispatched to packing.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsCheckoutOpen(false)}
                                    className="px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 text-xs font-bold rounded-lg transition-all"
                                >
                                    Return to Chat
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            )}

            {/* Right Sliding Panel for Judge Mode */}
            {isJudgeMode && (
                <JudgePanel 
                    data={selectedTraceData} 
                    onClose={() => setIsJudgeMode(false)} 
                />
            )}
        </div>
    );
}

