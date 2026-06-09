"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Trash2, Gift, CreditCard, ShoppingBag, X, Check, BrainCircuit } from "lucide-react";
import ChatInput from "./ChatInput";
import ChatMessage, { Message, Product, TrackingData } from "./ChatMessage";

export default function ChatWindow() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome-message",
            role: "assistant",
            content: "Ayubowan! 👋 I'm Kappy, your shopping friend. Let's find some awesome gifts on Kapruka today!",
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const [typingText, setTypingText] = useState("");
    
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
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    const addToBundle = (product: Product) => {
        if (!bundle.some(item => item.id === product.id)) {
            setBundle(prev => [...prev, product]);
            setIsBundleOpen(true);
            
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
        setMessages([
            {
                id: "welcome-message",
                role: "assistant",
                content: "Ayubowan! 👋 I'm Kappy, your shopping friend. Let's find some awesome gifts on Kapruka today!",
            }
        ]);
        setActiveMemories([]);
        setBundle([]);
    };

    const fetchGeneralResponse = async (text: string) => {
        setIsTyping(true);
        setTypingText("Thinking... 🧠");

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
                    history: chatHistory
                }),
            });

            const data = await response.json();
            
            setIsTyping(false);
            setMessages(prev => [
                ...prev,
                {
                    id: `kappy-${Date.now()}`,
                    role: "assistant",
                    content: data.content
                }
            ]);
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

    const handleSendMessage = (text: string) => {
        // 1. Add User Message
        const userMsgId = `user-${Date.now()}`;
        setMessages(prev => [...prev, { id: userMsgId, role: "user", content: text }]);

        const normalizedText = text.toLowerCase();

        // 2. Determine Intent and Simulate AI Flow
        if (normalizedText.includes("mom") || normalizedText.includes("gift") || normalizedText.includes("mother")) {
            simulateGiftFlow();
        } else if (normalizedText.includes("track") || normalizedText.includes("kp12")) {
            simulateTrackingFlow();
        } else if (normalizedText.includes("reorder") || normalizedText.includes("water bottle")) {
            simulateReorderFlow();
        } else {
            fetchGeneralResponse(text);
        }
    };

    const simulateGiftFlow = () => {
        setIsTyping(true);
        setTypingText("Retrieving memory & planning tools... 🧠");
        
        setTimeout(() => {
            setTypingText("Searching Kapruka for something special for Amma... 🔍");
        }, 1200);

        setTimeout(() => {
            setIsTyping(false);
            setActiveMemories(["Amma 👵", "Gardening 🌱", "Occasion: Birthday 🎂"]);
            
            const products: Product[] = [
                {
                    id: "gift_hamper_01",
                    name: "Mom's Gardening & Gourmet Tea Hamper",
                    price: 7500,
                    image_url: "/products/gift_hamper.png",
                    url: "https://www.kapruka.com/buyonline/gardening-treats-gift-basket",
                    isKappyPick: true,
                    reason: "Fits her interest in gardening, includes premium treats/tea, and fits your average LKR 5,000–8,000 budget range perfectly.",
                    delivery: "🚚 Tomorrow Delivery",
                    inStock: true
                },
                {
                    id: "bento_cake_01",
                    name: "Blueberry Bliss Bento Cake (300g)",
                    price: 4200,
                    image_url: "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/productImages/zoom/1763114612717_dsc04266.jpg",
                    url: "https://www.kapruka.com/buyonline/blueberry-bliss-bento-cheeseca/kid/cake00ka002034",
                    reason: "A cute, delicious birthday cake. Extremely popular choice for intimate family celebrations.",
                    delivery: "🚚 Tomorrow Delivery",
                    inStock: true
                },
                {
                    id: "roses_bouquet_01",
                    name: "Elegant Pink Roses and Carnations Bouquet",
                    price: 5800,
                    image_url: "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/pc_home/productImages/zoom/1726058145244_p1066497_m.jpg",
                    url: "https://www.kapruka.com/buyonline/candle-flower-bouquet-35-piece/kid/ef_pc_home0v4477p00022",
                    reason: "Beautiful fresh flowers wrapped in premium craft paper. Guaranteed to put a smile on her face.",
                    delivery: "🚚 Same Day Delivery",
                    inStock: true
                }
            ];

            setMessages(prev => [
                ...prev,
                {
                    id: `kappy-${Date.now()}`,
                    role: "assistant",
                    content: "Hari machan! I remember from last time that your mom likes gardening. 👵🌱\n\nI checked Kapruka's inventory and created a custom selection for her birthday. I highly recommend the Gardening Hamper as my top pick because it directly matches her hobbies! What do you think?",
                    products: products
                }
            ]);
        }, 2500);
    };

    const simulateTrackingFlow = () => {
        setIsTyping(true);
        setTypingText("Tracking your order... 📦");

        setTimeout(() => {
            setIsTyping(false);
            const trackingData: TrackingData = {
                orderNumber: "KP120349",
                statusText: "In Transit",
                estimatedArrival: "Tomorrow, by 4:00 PM",
                steps: [
                    { name: "Order Placed & Approved", status: "done", time: "June 08, 10:15 AM" },
                    { name: "Packed at Kapruka Center", status: "done", time: "June 08, 04:30 PM" },
                    { name: "Dispatched & In Transit", status: "active", time: "June 09, 08:00 AM" },
                    { name: "Out for Delivery", status: "pending" },
                    { name: "Delivered", status: "pending" }
                ]
            };

            setMessages(prev => [
                ...prev,
                {
                    id: `kappy-${Date.now()}`,
                    role: "assistant",
                    content: "Mama check karala baluwa machan. 😊\n\nYour order **KP120349** is in transit! The driver is on the route to Colombo. Here is the live tracking timeline:",
                    tracking: trackingData
                }
            ]);
        }, 1800);
    };

    const simulateReorderFlow = () => {
        setIsTyping(true);
        setTypingText("Scanning purchase history... 🔄");

        setTimeout(() => {
            setIsTyping(false);
            const products: Product[] = [
                {
                    id: "reorder_water_01",
                    name: "Aqua Sports Insulated Water Bottle (2L)",
                    price: 2900,
                    image_url: "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/pc_home/productImages/zoom/1703114612800_bottle.jpg",
                    url: "https://www.kapruka.com/buyonline/aqua-sports-bottle",
                    reason: "You ordered this 12 days ago. Perfect for gym and office use.",
                    delivery: "🚚 Next Day Delivery",
                    inStock: true
                }
            ];

            setMessages(prev => [
                ...prev,
                {
                    id: `kappy-${Date.now()}`,
                    role: "assistant",
                    content: "Ah, ow! I found your order from 12 days ago. You purchased the **Aqua Sports Water Bottle (2L)**. Would you like to add it back to your bundle?",
                    products: products
                }
            ]);
        }, 1500);
    };

    // Calculate bundle total
    const bundleTotal = bundle.reduce((sum, item) => sum + item.price, 0);

    const handleCheckoutSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setCheckoutStep("payment");
        
        setTimeout(() => {
            setCheckoutStep("success");
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

    return (
        <div className="relative flex flex-col md:flex-row flex-1 h-screen bg-[#090D16] overflow-hidden text-white font-sans">
            
            {/* Background Glow effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />

            {/* Main Chat Content Panel */}
            <div className="flex-1 flex flex-col h-full relative z-10 border-r border-white/5">
                
                {/* Header Widget */}
                <header className="flex items-center justify-between px-6 py-4 bg-slate-900/40 backdrop-blur-xl border-b border-white/5">
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

                    <div className="flex items-center gap-2">
                        <button
                            onClick={clearChat}
                            title="Reset Chat"
                            className="p-2.5 text-slate-400 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 rounded-xl transition-all active:scale-95"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        
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
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 scrollbar-thin">
                    
                    {messages.map((message) => (
                        <ChatMessage
                            key={message.id}
                            message={message}
                            onAddToBundle={addToBundle}
                        />
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

                    {/* Scroll anchor */}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Action Suggestion Chips */}
                {messages.length === 1 && !isTyping && (
                    <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/10 border-t border-white/5">
                        <button
                            onClick={() => handleSendMessage("🎂 Find a gift for mom's birthday")}
                            className="flex items-center justify-center gap-2 p-3 text-xs md:text-sm font-semibold text-slate-200 bg-slate-900/60 hover:bg-amber-500/10 active:scale-95 border border-white/10 hover:border-amber-400/40 rounded-xl shadow-lg transition-all duration-200"
                        >
                            🎂 Find Gift for Mom
                        </button>
                        <button
                            onClick={() => handleSendMessage("📦 Track my order KP120349")}
                            className="flex items-center justify-center gap-2 p-3 text-xs md:text-sm font-semibold text-slate-200 bg-slate-900/60 hover:bg-rose-500/10 active:scale-95 border border-white/10 hover:border-rose-400/40 rounded-xl shadow-lg transition-all duration-200"
                        >
                            📦 Track Order KP12
                        </button>
                        <button
                            onClick={() => handleSendMessage("🔄 Reorder previous water bottle")}
                            className="flex items-center justify-center gap-2 p-3 text-xs md:text-sm font-semibold text-slate-200 bg-slate-900/60 hover:bg-indigo-500/10 active:scale-95 border border-white/10 hover:border-indigo-400/40 rounded-xl shadow-lg transition-all duration-200"
                        >
                            🔄 Reorder Bottle
                        </button>
                        <button
                            onClick={() => handleSendMessage("Just chatting")}
                            className="flex items-center justify-center gap-2 p-3 text-xs md:text-sm font-semibold text-slate-200 bg-slate-900/60 hover:bg-slate-800 active:scale-95 border border-white/10 hover:border-white/20 rounded-xl shadow-lg transition-all duration-200"
                        >
                            💬 Just Chatting
                        </button>
                    </div>
                )}

                {/* Bottom Input Area */}
                <div className="p-6 bg-slate-900/30 backdrop-blur-xl border-t border-white/5">
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

        </div>
    );
}
