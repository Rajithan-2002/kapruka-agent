"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Trash2, Gift, CreditCard, ShoppingBag, X, Check, 
  BrainCircuit, Activity, Home as HomeIcon, MessageSquare, 
  Users, User as UserIcon, Mic, ArrowRight, ShieldCheck, 
  CheckCircle2, Plus, Calendar, Eye, RefreshCw, AlertCircle, Truck
} from "lucide-react";
import ChatInput from "./ChatInput";
import ChatMessage, { Message, Product } from "./ChatMessage";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import JudgePanel from "./JudgePanel";
import MemoryVault from "./MemoryVault";

const getUniqueId = (prefix: string): string => `${prefix}-${Date.now()}`;

// ALGORITHM 25 — WAITING STATE PERSONALITY: Pick loading messages
const LOADING_PHRASES: Record<string, string[]> = {
  tracking: [
    "Let me check where your parcel is right now... 📦",
    "Checking on it for you — give me a second 😊",
    "Checking the courier status... 🚚"
  ],
  delivery: [
    "Checking if we can get this to you in time... 🚚",
    "Just verifying delivery — won't take a second 😊",
    "Verifying Colombo delivery routes... 🗺️"
  ],
  search: [
    "Let me check what we've got for you... 🔍",
    "Searching through the catalog — one moment 😊",
    "Looking for the best gift options... ✨"
  ],
  default: [
    "Thinking... 🧠",
    "Give me a second — working on it 😊",
    "On it... 🧠"
  ]
};

function getLoadingPhrase(text: string): string {
  const normalized = text.toLowerCase();
  let pool = LOADING_PHRASES.default;
  if (normalized.includes("track") || normalized.includes("kp")) {
    pool = LOADING_PHRASES.tracking;
  } else if (normalized.includes("deliver") || normalized.includes("colombo")) {
    pool = LOADING_PHRASES.delivery;
  } else if (normalized.includes("gift") || normalized.includes("cake") || normalized.includes("flower") || normalized.includes("chocolate")) {
    pool = LOADING_PHRASES.search;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// Interfaces for Relationship state
interface LocalRelationship {
  id: string;
  relationship_type: string;
  nickname: string;
  birthday?: string;
  notes?: string;
}

interface LocalPreference {
  id: string;
  relationship_id?: string;
  interest: string;
}

interface LandingBundle {
  id: string;
  name: string;
  price: number;
  image: string;
  url: string;
  tag: string;
  delivery: string;
}

interface LandingFastItem {
  id: string;
  name: string;
  price: number;
  image: string;
  url: string;
  delay: string;
}

export default function ChatWindow() {
  const [activeTab, setActiveTab] = useState<"home" | "build-gift" | "chat" | "memory" | "profile">("home");
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const [userTone, setUserTone] = useState<string>("neutral");
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const supabase = createClient();

  // Active chat session variables
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<{ id: string; title: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState("");
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  // Hamper / Bundle details
  const [bundle, setBundle] = useState<Product[]>([]);
  const [isBundleOpen, setIsBundleOpen] = useState(false);
  const [activeMemories, setActiveMemories] = useState<string[]>([]);
  
  // Checkout details
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"summary" | "payment" | "success">("summary");
  const [recipientName, setRecipientName] = useState("Nethmi");
  const [recipientPhone, setRecipientPhone] = useState("+94771234567");
  const [deliveryAddress, setDeliveryAddress] = useState("No 12, Flower Rd");
  const [deliveryCity, setDeliveryCity] = useState("Colombo 03");
  const [senderName, setSenderName] = useState("Rajithan");
  const [giftMessageText, setGiftMessageText] = useState("Happy Birthday Nethmi! Hope you love this surprise package. - Raji");
  const [isAvailableToday, setIsAvailableToday] = useState(true);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [orderRef, setOrderRef] = useState("");

  // Judge panel / diagnostics
  const [isJudgeMode, setIsJudgeMode] = useState(false);
  const [selectedTraceData, setSelectedTraceData] = useState<any>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Product Detail Modal State
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [modalProductDetails, setModalProductDetails] = useState<any | null>(null);
  const [isProductModalLoading, setIsProductModalLoading] = useState(false);

  // Voice Simulation state
  const [isVoiceSimulating, setIsVoiceSimulating] = useState(false);
  const [voiceInputText, setVoiceInputText] = useState("");

  // Relationships tab state
  const [relationships, setRelationships] = useState<LocalRelationship[]>([]);
  const [preferences, setPreferences] = useState<LocalPreference[]>([]);
  const [isLoadingRelationships, setIsLoadingRelationships] = useState(false);
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonType, setNewPersonType] = useState("girlfriend");
  const [newPersonBirthday, setNewPersonBirthday] = useState("");
  const [newPersonInterests, setNewPersonInterests] = useState("");

  // Landing products state
  const [landingBundles, setLandingBundles] = useState<LandingBundle[]>([]);
  const [landingFastDelivery, setLandingFastDelivery] = useState<LandingFastItem[]>([]);
  const [isLoadingLandingProducts, setIsLoadingLandingProducts] = useState(false);

  const [editingRelationshipId, setEditingRelationshipId] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState("");
  const [editRelationshipType, setEditRelationshipType] = useState("");
  const [editBirthday, setEditBirthday] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [newInterestText, setNewInterestText] = useState<Record<string, string>>({});

  const handleDeleteRelationship = async (relId: string) => {
    if (!confirm("Are you sure you want to remove this person?")) return;
    try {
      const res = await fetch(`/api/relationships?relationshipId=${relId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await loadUserRelationships();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startEditingRelationship = (rel: LocalRelationship) => {
    setEditingRelationshipId(rel.id);
    setEditNickname(rel.nickname);
    setEditRelationshipType(rel.relationship_type);
    setEditBirthday(rel.birthday || "");
    setEditNotes(rel.notes || "");
  };

  const handleSaveRelationship = async (relId: string) => {
    try {
      const res = await fetch(`/api/relationships`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relationshipId: relId,
          updates: {
            nickname: editNickname,
            relationship_type: editRelationshipType,
            birthday: editBirthday,
            notes: editNotes
          }
        })
      });
      if (res.ok) {
        setEditingRelationshipId(null);
        await loadUserRelationships();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePreference = async (prefId: string) => {
    try {
      const res = await fetch(`/api/relationships?preferenceId=${prefId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await loadUserRelationships();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPreference = async (relId: string) => {
    const interest = newInterestText[relId]?.trim();
    if (!interest) return;

    try {
      const res = await fetch(`/api/relationships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_preference",
          relationshipId: relId,
          interest
        })
      });
      if (res.ok) {
        setNewInterestText(prev => ({ ...prev, [relId]: "" }));
        await loadUserRelationships();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // AI Bundle Builder state variables
  const [builderRecipient, setBuilderRecipient] = useState("girlfriend");
  const [builderOccasion, setBuilderOccasion] = useState("Birthday");
  const [builderBudget, setBuilderBudget] = useState(5000);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [builderItems, setBuilderItems] = useState<{ id: string; name: string; price: number; image: string; selected: boolean }[]>([
    { id: "roses", name: "Premium Red Roses Bouquet", price: 2200, image: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=200&q=80", selected: true },
    { id: "chocs", name: "Ferrero Rocher Box (16 Pcs)", price: 1800, image: "https://images.unsplash.com/photo-1549007994-cb92ca88806f?w=200&q=80", selected: true },
    { id: "card", name: "Custom Calligraphy Greeting Card", price: 500, image: "https://images.unsplash.com/photo-1512909006721-3d6018887383?w=200&q=80", selected: true },
  ]);
  const [optimizationReason, setOptimizationReason] = useState<string | null>(null);

  // Product detailed card viewer state
  const [selectedDetailsProduct, setSelectedDetailsProduct] = useState<Product | null>(null);

  const [sameDayTimeLeft, setSameDayTimeLeft] = useState("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const cutoff = new Date();
      cutoff.setHours(17, 30, 0, 0);

      if (now.getTime() > cutoff.getTime()) {
        return "Same-day delivery cutoff passed. Order now for tomorrow delivery.";
      }

      const diff = cutoff.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      return `Order within ${hours}h ${minutes}m for same-day delivery.`;
    };

    setSameDayTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setSameDayTimeLeft(calculateTimeLeft());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  function getDaysUntilBirthday(birthdayStr?: string): number | null {
    if (!birthdayStr) return null;
    const cleanStr = birthdayStr.trim();
    let day = 0;
    let month = -1;

    const isoMatch = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      month = parseInt(isoMatch[2]) - 1;
      day = parseInt(isoMatch[3]);
    } else {
      const parts = cleanStr.split(/\s+/);
      if (parts.length === 2) {
        const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
        const shortMonths = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const p0 = parts[0].toLowerCase();
        const p1 = parts[1].toLowerCase();
        let mIdx = months.indexOf(p0);
        if (mIdx === -1) mIdx = shortMonths.indexOf(p0);
        if (mIdx !== -1) {
          month = mIdx;
          day = parseInt(p1);
        } else {
          mIdx = months.indexOf(p1);
          if (mIdx === -1) mIdx = shortMonths.indexOf(p1);
          if (mIdx !== -1) {
            month = mIdx;
            day = parseInt(p0);
          }
        }
      }
    }

    if (day === 0 || isNaN(day) || month === -1) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const targetDate = new Date(currentYear, month, day);

    if (targetDate.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
      targetDate.setFullYear(currentYear + 1);
    }

    const diffTime = targetDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  const getForgottenEvents = () => {
    return relationships
      .map(r => {
        const days = getDaysUntilBirthday(r.birthday);
        return { ...r, daysRemaining: days };
      })
      .filter(r => r.daysRemaining !== null && r.daysRemaining <= 10)
      .filter(r => {
        const mentionsName = messages.some(m => 
          (m.content && m.content.toLowerCase().includes(r.nickname.toLowerCase())) || 
          (m.content && m.content.toLowerCase().includes(r.relationship_type.toLowerCase()))
        );
        return !mentionsName && bundle.length === 0;
      });
  };

  // Splash Screen Fade out
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashFading(true);
      const fadeTimer = setTimeout(() => {
        setShowSplash(false);
      }, 300);
      return () => clearTimeout(fadeTimer);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Fetch relationships and landing products on auth changes
  useEffect(() => {
    if (user) {
      loadUserRelationships();
    } else {
      loadLandingProducts();
    }
  }, [user]);

  const loadLandingProducts = async () => {
    setIsLoadingLandingProducts(true);
    try {
      const res = await fetch("/api/landing-products");
      const data = await res.json();
      if (data.popularBundles && data.popularBundles.length > 0) {
        setLandingBundles(data.popularBundles);
      }
      if (data.fastDelivery && data.fastDelivery.length > 0) {
        setLandingFastDelivery(data.fastDelivery);
      }
    } catch (e) {
      console.error("Failed to load landing products:", e);
    } finally {
      setIsLoadingLandingProducts(false);
    }
  };

  const loadUserRelationships = async () => {
    setIsLoadingRelationships(true);
    try {
      const res = await fetch("/api/relationships");
      const data = await res.json();
      if (data.relationships) setRelationships(data.relationships);
      if (data.preferences) setPreferences(data.preferences);
      // Reload personalized landing products immediately
      loadLandingProducts();
    } catch (e) {
      console.error("Failed to load relationships:", e);
    } finally {
      setIsLoadingRelationships(false);
    }
  };

  const handlePreloadDemoData = async () => {
    setIsLoadingRelationships(true);
    try {
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preload" })
      });
      const data = await res.json();
      if (data.relationships) setRelationships(data.relationships);
      if (data.preferences) setPreferences(data.preferences);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingRelationships(false);
    }
  };

  const handleAddRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;

    try {
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relationshipType: newPersonType,
          nickname: newPersonName,
          birthday: newPersonBirthday,
          notes: newPersonInterests
        })
      });
      const data = await res.json();
      if (data.relationship) {
        await loadUserRelationships();
        setNewPersonName("");
        setNewPersonBirthday("");
        setNewPersonInterests("");
        setShowAddPersonModal(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fix Supabase OAuth Redirect
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("code=")) {
      window.location.href = `/auth/callback${window.location.search}`;
    }
  }, []);

  // Auth initialization
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

  // Load conversation list
  useEffect(() => {
    if (!user) return;
    const fetchConversations = async () => {
      try {
        const res = await fetch("/api/conversations");
        const data = await res.json();
        if (data.conversations) setConversations(data.conversations);
      } catch (err) {
        console.error("Error loading conversations:", err);
      }
    };
    fetchConversations();
  }, [user, messages]);

  // Initialize session (always start a brand new chat on app load)
  useEffect(() => {
    if (!user || hasCheckedSession) return;
    const initSession = async () => {
      try {
        const res = await fetch("/api/conversations");
        const data = await res.json();
        if (data.conversations) {
          setConversations(data.conversations);
        }

        // Always start with a new, fresh conversation session on page load
        const newId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: newId, title: "New Chat" })
        });
        setActiveConversationId(newId);
        setHasCheckedSession(true);
      } catch (err) {
        console.error(err);
      }
    };
    initSession();
  }, [user, hasCheckedSession]);

  // Fetch messages on session switch
  useEffect(() => {
    if (!activeConversationId) return;
    localStorage.setItem("kappy_active_conv_id", activeConversationId);
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/conversations/${activeConversationId}/messages`);
        const data = await res.json();
        if (data.messages) setMessages(data.messages);
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
      await fetch(`/api/conversations?id=${id}`, { method: "DELETE" });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversationId === id) {
        const remaining = conversations.filter(c => c.id !== id);
        if (remaining.length > 0) {
          setActiveConversationId(remaining[0].id);
        } else {
          startNewChat();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Core messaging flow
  const handleSendMessage = async (text: string) => {
    const userMsgId = getUniqueId("user");
    setMessages(prev => [...prev, { id: userMsgId, role: "user", content: text }]);
    
    setIsTyping(true);
    setTypingText(getLoadingPhrase(text));

    try {
      const chatHistory = messages
        .filter(msg => msg.role === "user" || msg.role === "assistant")
        .map(msg => ({ role: msg.role, content: msg.content }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: chatHistory,
          sessionId: activeConversationId
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        setIsTyping(false);
        const aiMsgId = `kappy-${Date.now()}`;
        setMessages(prev => [...prev, {
          id: aiMsgId,
          role: "assistant",
          content: data.content || "",
          products: data.products || null,
          tracking: data.tracking || null,
          traceReport: data.traceReport || null,
          intelligenceTrace: data.intelligenceTrace || null,
          judgeModeTrace: data.judgeModeTrace || null,
          transparencyMessage: data.transparencyMessage || null,
          followUpSuggestions: data.followUpSuggestions || null,
          isAllRequested: data.isAllRequested,
          initialVisibleCount: data.initialVisibleCount
        }]);
        if (data.activeMemories && Array.isArray(data.activeMemories)) {
          setActiveMemories(data.activeMemories);
        }
        return;
      }

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      const aiMsgId = `kappy-${Date.now()}`;
      setMessages(prev => [...prev, { id: aiMsgId, role: "assistant", content: "" }]);
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
              if (customData) {
                setMessages(prev => prev.map(m => m.id === aiMsgId ? {
                  ...m,
                  products: customData.products || m.products,
                  tracking: customData.tracking || m.tracking,
                  traceReport: customData.traceReport || m.traceReport,
                  intelligenceTrace: customData.intelligenceTrace || m.intelligenceTrace,
                  judgeModeTrace: customData.judgeModeTrace || m.judgeModeTrace,
                  transparencyMessage: customData.transparencyMessage || m.transparencyMessage,
                  followUpSuggestions: customData.followUpSuggestions || m.followUpSuggestions,
                  isAllRequested: customData.isAllRequested !== undefined ? customData.isAllRequested : m.isAllRequested,
                  initialVisibleCount: customData.initialVisibleCount || m.initialVisibleCount
                } : m));
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
          followUpSuggestions: customData.followUpSuggestions || null,
          isAllRequested: customData.isAllRequested,
          initialVisibleCount: customData.initialVisibleCount
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

  // Keyboard shortcut listener for judge mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsJudgeMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto scroll
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isTyping]);

  const handleMicClick = () => {
    if (isVoiceSimulating) return;
    setIsVoiceSimulating(true);
    setVoiceInputText("");
    const targetQuery = "I need a birthday gift for my girlfriend under LKR 5000";
    let index = 0;
    
    const typingInterval = setInterval(() => {
      setVoiceInputText(prev => prev + targetQuery[index]);
      index++;
      if (index >= targetQuery.length) {
        clearInterval(typingInterval);
        setTimeout(() => {
          setIsVoiceSimulating(false);
          setActiveTab("chat");
          handleSendMessage(targetQuery);
        }, 800);
      }
    }, 45);
  };

  // AI Optimizer local algorithm
  const handleOptimizeHamper = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      if (builderBudget <= 3500) {
        setBuilderItems([
          { id: "roses", name: "Single Red Rose (Eco Pack)", price: 600, image: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=200&q=80", selected: true },
          { id: "chocs", name: "Cadbury Dairy Milk Tray", price: 900, image: "https://images.unsplash.com/photo-1549007994-cb92ca88806f?w=200&q=80", selected: true },
          { id: "card", name: "Classic Greeting Card", price: 300, image: "https://images.unsplash.com/photo-1512909006721-3d6018887383?w=200&q=80", selected: true }
        ]);
        setOptimizationReason("Swapped luxury chocolates for Cadbury & downsized rose arrangement to perfectly fit LKR 3,500 budget.");
      } else if (builderBudget <= 6000) {
        setBuilderItems([
          { id: "roses", name: "Premium Red Roses Bouquet", price: 2200, image: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=200&q=80", selected: true },
          { id: "chocs", name: "Ferrero Rocher Box (16 Pcs)", price: 1800, image: "https://images.unsplash.com/photo-1549007994-cb92ca88806f?w=200&q=80", selected: true },
          { id: "card", name: "Custom Calligraphy Greeting Card", price: 500, image: "https://images.unsplash.com/photo-1512909006721-3d6018887383?w=200&q=80", selected: true },
        ]);
        setOptimizationReason("Optimal arrangement matches LKR 5,000 budget with 16 Ferrero piece box.");
      } else {
        setBuilderItems([
          { id: "roses", name: "Premium 24 Roses Arrangement", price: 4500, image: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=200&q=80", selected: true },
          { id: "chocs", name: "Ferrero Rocher Gold Luxury Tin (24 Pcs)", price: 3200, image: "https://images.unsplash.com/photo-1549007994-cb92ca88806f?w=200&q=80", selected: true },
          { id: "card", name: "Deluxe Pop-up Keepsake Greeting Card", price: 800, image: "https://images.unsplash.com/photo-1512909006721-3d6018887383?w=200&q=80", selected: true },
        ]);
        setOptimizationReason("Upgraded package components to premium tiers and added pop-up gift card option.");
      }
    }, 1200);
  };

  const addToBundle = (product: Product) => {
    if (!bundle.some(item => item.id === product.id)) {
      setBundle(prev => [...prev, product]);
      setIsBundleOpen(true);
    }
  };

  const handleOpenProductModal = async (productId: string) => {
    setSelectedProductId(productId);
    setIsProductModalLoading(true);
    setModalProductDetails(null);
    try {
      const res = await fetch(`/api/product?productId=${productId}`);
      const data = await res.json();
      if (data.product) {
        setModalProductDetails(data.product);
      }
    } catch (e) {
      console.error("Failed to fetch product details:", e);
    } finally {
      setIsProductModalLoading(false);
    }
  };

  const removeFromBundle = (productId: string) => {
    setBundle(prev => prev.filter(item => item.id !== productId));
  };

  const bundleTotal = bundle.reduce((sum, item) => sum + item.price, 0);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutStep("payment");
    try {
      const formattedCart = bundle.map(item => ({
        product_id: item.id,
        quantity: 1
      }));

      // Set delivery date 3 days from now
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 3);
      const isoDate = targetDate.toISOString().split("T")[0];

      const checkoutPayload = {
        cart: formattedCart,
        recipient: {
          name: recipientName,
          phone: recipientPhone
        },
        delivery: {
          address: deliveryAddress,
          city: deliveryCity,
          date: isoDate
        },
        sender: {
          name: senderName
        },
        gift_message: giftMessageText
      };

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutPayload)
      });

      const data = await response.json();
      if (data.success && data.checkout_url) {
        setCheckoutUrl(data.checkout_url);
        setOrderRef(data.order_ref);
        setCheckoutStep("success");
      } else {
        alert("Checkout Failed: " + (data.error || "Unknown error"));
        setCheckoutStep("summary");
      }
    } catch (err: any) {
      console.error("Checkout Exception:", err);
      alert("Error initiating checkout: " + err.message);
      setCheckoutStep("summary");
    }
  };

  const handleCheckoutConfirm = () => {
    const confirmationMsg: Message = {
      id: `success-${Date.now()}`,
      role: "assistant",
      content: `Machan, checkout details are locked in! 🛒\n\n- **Order Reference:** ${orderRef}\n- **Recipient:** ${recipientName} (${recipientPhone})\n- **Delivery:** ${deliveryAddress}, ${deliveryCity}\n- **Gift Message:** "${giftMessageText}"\n- **Total Amount:** LKR ${bundleTotal.toLocaleString()}\n\nMake sure to complete the payment via the secure portal link. You can track this order later using the order number sent to your email! 💳`
    };
    setMessages(prev => [...prev, confirmationMsg]);
    setBundle([]);
    setIsCheckoutOpen(false);
    setCheckoutStep("summary");
  };

  if (isAuthLoading) {
    return (
      <div className="flex-1 h-screen bg-slate-50 flex flex-col items-center justify-center">
        <BrainCircuit className="w-12 h-12 text-violet-600 animate-pulse" />
        <span className="text-xs text-slate-400 font-bold mt-2">Loading Kappy...</span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col md:flex-row h-screen bg-slate-50 overflow-hidden text-slate-800 font-sans">
      
      {/* 1. Splash Screen Overlay */}
      {showSplash && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white transition-opacity duration-300 ${splashFading ? "opacity-0" : "opacity-100"}`}>
          <div className="flex flex-col items-center gap-4 animate-scale-up">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-rose-500 shadow-xl shadow-rose-100 flex items-center justify-center">
              <span className="font-black text-4xl text-white">K</span>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-black tracking-tight text-slate-800">Kappy</h1>
              <p className="text-xs text-slate-400 font-extrabold uppercase tracking-widest mt-1">Powered by Kapruka</p>
            </div>
          </div>
        </div>
      )}

      {/* Auth Screen Overlay */}
      {!user && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="relative z-10 flex flex-col items-center bg-white p-8 rounded-3xl border border-slate-100 shadow-2xl max-w-sm w-full text-center animate-scale-up">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 shadow-lg flex items-center justify-center mb-5">
              <span className="font-black text-2xl text-white">K</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-800 mb-2">Welcome to Kappy AI</h2>
            <p className="text-slate-400 text-xs mb-6 leading-relaxed">
              Sign in to sync your relationship memories, budget preferences, and access the secure Kapruka gateway.
            </p>
            <button
              onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })}
              className="w-full flex items-center justify-center gap-2.5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all cursor-pointer shadow-md active:scale-95 text-sm"
            >
              Sign in with Google
            </button>
            <button
              onClick={() => setUser({ id: "guest-123", email: "guest@kapruka.com" } as User)}
              className="mt-3.5 w-full py-3 bg-transparent border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all cursor-pointer active:scale-95 text-xs"
            >
              Continue as Guest
            </button>
          </div>
        </div>
      )}

      {/* 2. Side Navigation Panel (Tablet & Desktop Layout) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 h-full z-20">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center text-white font-black text-base shadow-sm">
              K
            </div>
            <div>
              <h1 className="font-extrabold text-slate-800 text-sm leading-none">Kappy</h1>
              <span className="text-[10px] text-slate-400 font-bold">Powered by Kapruka</span>
            </div>
          </div>
          <button
            onClick={() => setIsJudgeMode(!isJudgeMode)}
            className={`p-1.5 rounded-lg border transition-all ${isJudgeMode ? "bg-amber-500/10 border-amber-400 text-amber-500" : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600"}`}
            title="Judge Panel"
          >
            <Activity className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Items */}
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab("home")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "home" ? "bg-violet-50 text-violet-700 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
          >
            <HomeIcon className="w-4 h-4" /> Home
          </button>
          <button
            onClick={() => setActiveTab("build-gift")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "build-gift" ? "bg-violet-50 text-violet-700 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
          >
            <Gift className="w-4 h-4" /> Build Gift
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "chat" ? "bg-violet-50 text-violet-700 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
          >
            <MessageSquare className="w-4 h-4" /> Chat
          </button>
          <button
            onClick={() => setActiveTab("memory")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "memory" ? "bg-violet-50 text-violet-700 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
          >
            <Users className="w-4 h-4" /> Relationship Memory
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "profile" ? "bg-violet-50 text-violet-700 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
          >
            <UserIcon className="w-4 h-4" /> Profile
          </button>
        </nav>

        {/* Desktop Chat History List */}
        {activeTab === "chat" && conversations.length > 0 && (
          <div className="p-4 border-t border-slate-100 max-h-48 overflow-y-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Previous Chats</span>
            <div className="space-y-1">
              {conversations.map(c => (
                <div 
                  key={c.id}
                  onClick={() => setActiveConversationId(c.id)}
                  className={`group flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer ${activeConversationId === c.id ? "bg-slate-100 font-bold" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  <span className="truncate flex-1 pr-1">{c.title}</span>
                  <button
                    onClick={(e) => handleDeleteConversation(c.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-50 p-0.5 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <img 
              src={user?.user_metadata?.avatar_url || "https://www.gravatar.com/avatar/?d=mp"} 
              alt="Avatar" 
              className="w-8 h-8 rounded-full border border-slate-200" 
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-700 block truncate">{user?.email || "Guest"}</span>
              <button 
                onClick={() => supabase.auth.signOut()}
                className="text-[10px] text-slate-400 font-semibold hover:underline block text-left"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* 3. Main Screen View Shell */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Responsive Header Bar */}
        <header className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-400 to-rose-500 flex md:hidden items-center justify-center text-white font-black text-sm shadow-sm">
              K
            </div>
            <div>
              <span className="font-extrabold text-slate-800 text-sm md:text-base tracking-tight capitalize block md:inline">
                {activeTab === "build-gift" ? "🎁 Build Gift" : activeTab === "memory" ? "❤️ Relationship Memory" : activeTab}
              </span>
              <span className="text-[10px] text-slate-400 font-bold md:hidden block">Powered by Kapruka</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeMemories.length > 0 && activeTab === "chat" && (
              <div className="hidden lg:flex items-center gap-1 bg-violet-50 border border-violet-100 rounded-xl px-2.5 py-1">
                <span className="text-[10px] font-bold text-violet-700 flex items-center gap-1">
                  <BrainCircuit className="w-3 h-3" /> Context:
                </span>
                <span className="text-[10px] text-violet-600 font-bold truncate max-w-[120px]">
                  {activeMemories.join(", ")}
                </span>
              </div>
            )}

            <button
              onClick={() => setIsJudgeMode(!isJudgeMode)}
              className={`p-2 rounded-xl border transition-all ${isJudgeMode ? "bg-amber-500/10 border-amber-450 text-amber-500" : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600"}`}
              title="Judge Mode"
            >
              <Activity className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsDebugMode(!isDebugMode)}
              className={`p-2 rounded-xl border transition-all ${isDebugMode ? "bg-violet-50 text-violet-600 border-violet-200" : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600"}`}
              title="Dev Mode"
            >
              <BrainCircuit className="w-4 h-4" />
            </button>

            <button
              onClick={handlePreloadDemoData}
              className="px-2.5 py-1.5 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 active:scale-95 text-white font-extrabold text-[9px] uppercase rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer"
              title="Load Nethmi & Dad Demo Profile"
            >
              🎁 Demo Mode
            </button>

            {/* Hamper indicator toggler */}
            <button
              onClick={() => setIsBundleOpen(!isBundleOpen)}
              className="relative p-2 text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              {bundle.length > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white">
                  {bundle.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* 4. Tab Body Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          
          {/* HOME TAB VIEW */}
          {activeTab === "home" && (
            <div className="p-5 max-w-lg mx-auto space-y-6 animate-fade-in">
              {/* Header Profile Greeting */}
              <div className="pt-2">
                <h2 className="text-xl font-bold text-slate-400">👋 Hi {user?.email ? user.email.split('@')[0] : "Guest"}</h2>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mt-1">What are we shopping for today?</h1>
              </div>

              {/* Single Hero CTA Input */}
              <div className="relative">
                <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200/80 rounded-2xl shadow-sm focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-200/50 transition-all duration-300">
                  <div className="flex-1 px-3 py-2.5">
                    <input
                      type="text"
                      placeholder="Describe your situation... (e.g. birthday gift)"
                      className="w-full bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none text-sm md:text-base font-semibold"
                      value={voiceInputText}
                      onChange={(e) => setVoiceInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && voiceInputText.trim()) {
                          setActiveTab("chat");
                          handleSendMessage(voiceInputText);
                          setVoiceInputText("");
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={handleMicClick}
                    className={`p-3 rounded-xl transition-all ${isVoiceSimulating ? "bg-rose-500 text-white animate-pulse" : "bg-slate-100 hover:bg-slate-200 text-slate-500"}`}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (voiceInputText.trim()) {
                        setActiveTab("chat");
                        handleSendMessage(voiceInputText);
                        setVoiceInputText("");
                      }
                    }}
                    className="p-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-xl shadow-md transition-all active:scale-95"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Simulated Voice wave overlay */}
                {isVoiceSimulating && (
                  <div className="absolute inset-0 bg-white/95 flex items-center justify-center gap-3 rounded-2xl px-4 border border-rose-400 animate-fade-in">
                    <div className="flex gap-1 items-center justify-center">
                      <span className="w-1.5 h-6 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.4s]" />
                      <span className="w-1.5 h-9 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.2s]" />
                      <span className="w-1.5 h-7 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-4 bg-rose-500 rounded-full animate-bounce" />
                    </div>
                    <span className="text-xs text-rose-600 font-extrabold italic animate-pulse">
                      Dictating: "{voiceInputText || "..."}"
                    </span>
                  </div>
                )}
              </div>

              {/* Same-Day Countdown */}
              {sameDayTimeLeft && (
                <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50/30 border border-emerald-100/80 rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs text-emerald-800 font-bold">{sameDayTimeLeft}</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.5 rounded uppercase">Fast 🚚</span>
                </div>
              )}

              {/* Upcoming Events Countdown Pills */}
              {relationships.some(r => getDaysUntilBirthday(r.birthday) !== null) && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Upcoming events</span>
                  <div className="flex flex-wrap gap-2">
                    {relationships
                      .map(r => ({ ...r, daysRemaining: getDaysUntilBirthday(r.birthday) }))
                      .filter(r => r.daysRemaining !== null)
                      .sort((a, b) => (a.daysRemaining || 0) - (b.daysRemaining || 0))
                      .slice(0, 3)
                      .map(r => (
                        <span
                          key={r.id}
                          onClick={() => {
                            setActiveTab("chat");
                            handleSendMessage(`Find gift options for ${r.nickname}'s upcoming event`);
                          }}
                          className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-100 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                        >
                          📅 {r.nickname}'s {r.relationship_type === "girlfriend" ? "Birthday" : "Event"} - {r.daysRemaining} Days
                        </span>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Forgotten Event Detector */}
              {getForgottenEvents().map(event => (
                <div key={event.id} className="p-4 bg-rose-50 border border-rose-100 rounded-3xl flex flex-col gap-3 shadow-sm animate-slide-down">
                  <div className="flex gap-2.5 items-start">
                    <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                      <AlertCircle className="w-5 h-5 text-rose-500" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-rose-800 text-sm">Forgotten Event Warning</h4>
                      <p className="text-xs text-rose-600/90 font-medium mt-0.5 leading-relaxed">
                        {event.nickname}'s event is just {event.daysRemaining} days away! You haven't started a bundle or active chat for them. Let Kappy optimize a custom surprise.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setBuilderRecipient(event.relationship_type);
                      setBuilderOccasion("Birthday");
                      setActiveTab("build-gift");
                    }}
                    className="w-full py-2 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Gift className="w-3.5 h-3.5" /> Start Hamper Package
                  </button>
                </div>
              ))}

              {/* Occasion Quick Shortcuts */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Occasions</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => {
                      setActiveTab("chat");
                      handleSendMessage("🎂 Birthday gift options under LKR 5000");
                    }}
                    className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-violet-300 hover:bg-violet-50/20 text-slate-700 font-bold transition-all text-xs text-left shadow-sm active:scale-95"
                  >
                    <span className="text-lg">🎂</span> Birthday
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("chat");
                      handleSendMessage("❤️ Anniversary package for my spouse");
                    }}
                    className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-violet-300 hover:bg-violet-50/20 text-slate-700 font-bold transition-all text-xs text-left shadow-sm active:scale-95"
                  >
                    <span className="text-lg">❤️</span> Anniversary
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("chat");
                      handleSendMessage("🎓 Graduation congrats hamper");
                    }}
                    className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-violet-300 hover:bg-violet-50/20 text-slate-700 font-bold transition-all text-xs text-left shadow-sm active:scale-95"
                  >
                    <span className="text-lg">🎓</span> Graduation
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("chat");
                      handleSendMessage("👶 Baby Shower gift items list");
                    }}
                    className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-violet-300 hover:bg-violet-50/20 text-slate-700 font-bold transition-all text-xs text-left shadow-sm active:scale-95"
                  >
                    <span className="text-lg">👶</span> Baby Shower
                  </button>
                </div>
              </div>

              {/* Popular Bundles Section (Replaces Trending Products) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Popular Bundles</span>
                  <button onClick={() => setActiveTab("build-gift")} className="text-[10px] text-violet-600 font-bold hover:underline">Customize ✨</button>
                </div>
                <div className="space-y-3">
                  {(landingBundles.length > 0 ? landingBundles : [
                    { id: "mock-hamp-1", name: "Romantic Surprise Hamper", price: 4850, image: "https://images.unsplash.com/photo-1549007994-cb92ca88806f?w=400&q=80", tag: "Roses + Chocolate + Card", delivery: "🚚 Same Day Delivery", url: "https://www.kapruka.com/buyonline/romantic-surprise-hamper" },
                    { id: "mock-hamp-2", name: "Celebration Birthday Basket", price: 7200, image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80", tag: "Cake + Balloons + Toys", delivery: "🚚 Arrives Today", url: "https://www.kapruka.com/buyonline/celebration-birthday-basket" }
                  ]).map((hamp, idx) => (
                    <div 
                      key={hamp.id || idx} 
                      onClick={() => addToBundle({
                        id: hamp.id || `landing-hamp-${idx}`,
                        name: hamp.name,
                        price: hamp.price,
                        image_url: hamp.image,
                        url: hamp.url || ""
                      })}
                      className="flex gap-3 bg-white border border-slate-100 rounded-2xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-violet-300 hover:bg-violet-50/10 active:scale-[0.98]"
                      title="Click to add to your hamper package"
                    >
                      <img src={hamp.image} alt={hamp.name} className="w-16 h-16 object-cover rounded-xl border border-slate-100 bg-slate-50" />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs md:text-sm truncate">{hamp.name}</h4>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{hamp.tag}</p>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{hamp.delivery}</span>
                          <span className="text-xs font-black text-rose-600">LKR {hamp.price.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fast Delivery Today section */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Fast Delivery</span>
                <div className="grid grid-cols-2 gap-3">
                  {(landingFastDelivery.length > 0 ? landingFastDelivery : [
                    { id: "mock-fast-1", name: "Delicious Chocolate Gateau Cake", price: 3200, image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&q=80", delay: "2 Hours", url: "https://www.kapruka.com/buyonline/delicious-chocolate-gateau-cake" },
                    { id: "mock-fast-2", name: "Fresh Red Roses Bunch", price: 2200, image: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=300&q=80", delay: "3 Hours", url: "https://www.kapruka.com/buyonline/fresh-red-roses-bunch" }
                  ]).map((prod, idx) => (
                    <div 
                      key={prod.id || idx} 
                      onClick={() => addToBundle({
                        id: prod.id || `landing-fast-${idx}`,
                        name: prod.name,
                        price: prod.price,
                        image_url: prod.image,
                        url: prod.url || ""
                      })}
                      className="bg-white border border-slate-100 rounded-2xl p-2.5 shadow-sm cursor-pointer hover:border-violet-300 hover:shadow-md transition-all hover:bg-violet-50/10 active:scale-[0.98]"
                      title="Click to add to your hamper package"
                    >
                      <div className="relative h-28 w-full rounded-xl overflow-hidden bg-slate-50">
                        <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1.5 left-1.5 bg-emerald-500 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow-sm">
                          ⚡ {prod.delay}
                        </span>
                      </div>
                      <h5 className="font-bold text-slate-800 text-xs mt-2 truncate">{prod.name}</h5>
                      <p className="text-xs font-extrabold text-slate-500 mt-0.5">LKR {prod.price.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust badges footer */}
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center gap-2 text-[10px] text-slate-400 font-bold text-center">
                <div className="flex-1 flex flex-col items-center gap-1">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span>100% Delivery Certainty</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <Truck className="w-5 h-5 text-indigo-500" />
                  <span>Real-time Tracking</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>AI Selection Verified</span>
                </div>
              </div>
            </div>
          )}

          {/* BUILD GIFT TAB VIEW */}
          {activeTab === "build-gift" && (
            <div className="p-5 max-w-lg mx-auto space-y-5 animate-fade-in">
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5">
                  <span className="p-1 bg-gradient-to-tr from-amber-400 to-rose-500 text-white rounded-lg"><Gift className="w-4 h-4" /></span>
                  AI Hamper Package Optimizer
                </h3>

                {/* Recipient selectors */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Recipient</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["girlfriend", "father", "mother", "friend"].map(type => (
                      <button
                        key={type}
                        onClick={() => setBuilderRecipient(type)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border ${builderRecipient === type ? "bg-violet-600 text-white border-violet-600" : "bg-slate-50 border-slate-200 text-slate-600"}`}
                      >
                        {type === "girlfriend" ? "Girlfriend (Nethmi)" : type === "father" ? "Dad" : type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Occasion selectors */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Occasion</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Birthday", "Anniversary", "General"].map(occ => (
                      <button
                        key={occ}
                        onClick={() => setBuilderOccasion(occ)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${builderOccasion === occ ? "bg-violet-600 text-white border-violet-600" : "bg-slate-50 border-slate-200 text-slate-600"}`}
                      >
                        {occ}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Target Budget</label>
                    <span className="text-base font-black text-rose-600">LKR {builderBudget.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="1500"
                    max="15000"
                    step="500"
                    value={builderBudget}
                    onChange={(e) => setBuilderBudget(parseInt(e.target.value))}
                    className="w-full accent-rose-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>LKR 1,500</span>
                    <span>LKR 15,000</span>
                  </div>
                </div>

                {/* Optimiser Actions */}
                <button
                  onClick={handleOptimizeHamper}
                  disabled={isOptimizing}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-700 active:scale-95 disabled:bg-slate-200 text-white font-extrabold text-sm rounded-2xl shadow-md cursor-pointer transition-all"
                >
                  {isOptimizing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Kappy is balancing weights...
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="w-4 h-4" />
                      Kappy Optimize Bundle
                    </>
                  )}
                </button>

                {optimizationReason && (
                  <div className="p-3 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl text-xs text-emerald-700 font-medium animate-slide-down flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{optimizationReason}</span>
                  </div>
                )}
              </div>

              {/* Hamper Package Contents */}
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Optimized Package Contents</span>
                <div className="space-y-3">
                  {builderItems.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-center justify-between p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl">
                      <div className="flex gap-2 items-center">
                        <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded-lg border border-slate-100 bg-white" />
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 text-xs truncate max-w-[180px]">{item.name}</h4>
                          <span className="text-[10px] text-slate-400 font-bold">LKR {item.price.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">🚚 Today</span>
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => {
                            setBuilderItems(prev => prev.map((itm, i) => i === idx ? { ...itm, selected: e.target.checked } : itm));
                          }}
                          className="w-4.5 h-4.5 accent-violet-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-bold">Total Bundle Price</span>
                  <span className="text-lg font-black text-rose-600">
                    LKR {builderItems.filter(i => i.selected).reduce((sum, i) => sum + i.price, 0).toLocaleString()}
                  </span>
                </div>

                <button
                  disabled={builderItems.filter(i => i.selected).length === 0}
                  onClick={() => {
                    const selected = builderItems.filter(i => i.selected);
                    // Add items to checkout bundle state
                    setBundle(selected.map(item => ({
                      id: item.id,
                      name: item.name,
                      price: item.price,
                      image_url: item.image,
                      url: "#",
                      delivery: "Today"
                    })));
                    setIsCheckoutOpen(true);
                    setCheckoutStep("summary");
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 active:scale-95 disabled:from-slate-200 text-white font-extrabold text-sm rounded-2xl shadow-md transition-all cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  Proceed to Secure Checkout
                </button>
              </div>
            </div>
          )}

          {/* CHAT TAB VIEW */}
          {activeTab === "chat" && (
            <div className="flex h-full bg-slate-50 relative overflow-hidden">
              <div className="flex-1 flex flex-col h-full relative">
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4 scrollbar-thin">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center text-white font-black text-lg mb-3 shadow-md">K</div>
                      <h3 className="font-bold text-sm text-slate-700">Chat with Kappy</h3>
                      <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
                        Describe your gifting requirement, budget, or enter tracking details. E.g. "Gift for Nethmi under 5000"
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, i) => (
                      <div 
                        key={msg.id}
                        onClick={() => {
                          if (isJudgeMode) {
                            setSelectedTraceData({
                              traceReport: msg.traceReport,
                              intelligenceTrace: msg.judgeModeTrace,
                              message: msg.content
                            });
                          }
                        }}
                        className={isJudgeMode ? "cursor-pointer hover:bg-slate-100/50 rounded-xl p-1 -mx-1" : ""}
                      >
                        <ChatMessage
                          message={msg}
                          isDebugMode={isDebugMode}
                          userId={user?.id}
                          sessionId={activeConversationId}
                          onAddToBundle={addToBundle}
                          onFollowUpClick={(text) => handleSendMessage(text)}
                          onProductClick={handleOpenProductModal}
                        />
                      </div>
                    ))
                  )}

                  {isTyping && (
                    <ChatMessage
                      message={{
                        id: "typing",
                        role: "assistant",
                        content: "",
                        isLoading: true,
                        loadingText: typingText
                      }}
                    />
                  )}
                </div>

                {/* Chat tab bottom input */}
                <div className="p-4 bg-white border-t border-slate-100">
                  <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} placeholder="Ask Kappy..." />
                </div>
              </div>

              {/* Memory Vault Sidebar (Desktop View / Toggleable) */}
              {isDebugMode && (
                <div className="hidden lg:block">
                  <MemoryVault
                    relationships={relationships}
                    preferences={preferences}
                    activeMemories={activeMemories}
                  />
                </div>
              )}
            </div>
          )}

          {/* RELATIONSHIP MEMORY TAB VIEW */}
          {activeTab === "memory" && (
            <div className="p-5 max-w-lg mx-auto space-y-5 animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">My Relationships</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Kappy's relational memory system</p>
                </div>
                <button
                  onClick={() => setShowAddPersonModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Person
                </button>
              </div>

              {/* Loading indicator */}
              {isLoadingRelationships && (
                <div className="flex justify-center py-6 text-slate-400 text-xs font-bold gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-violet-600" />
                  Updating relationship vault...
                </div>
              )}

              {/* Empty state & Demo preloader */}
              {!isLoadingRelationships && relationships.length === 0 && (
                <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center space-y-4 shadow-sm">
                  <Users className="w-12 h-12 mx-auto opacity-20 text-violet-600" />
                  <div>
                    <h4 className="font-bold text-slate-700 text-sm">No Relationships Saved Yet</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                      Saving relationships allows Kappy to remember birthdays, favorite colors, and likes for personalized recommendations.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={handlePreloadDemoData}
                      className="w-full py-2.5 bg-violet-50 hover:bg-violet-100 text-violet-700 font-extrabold text-xs rounded-xl border border-violet-200 transition-all cursor-pointer"
                    >
                      🎁 Load Demo Data (Nethmi & Dad)
                    </button>
                    <button
                      onClick={() => setShowAddPersonModal(true)}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      + Add Someone Custom
                    </button>
                  </div>
                </div>
              )}

              {/* Relationships grid list */}
              {!isLoadingRelationships && relationships.length > 0 && (
                <div className="space-y-4">
                  {relationships.map(rel => {
                    const relPrefs = preferences.filter(p => p.relationship_id === rel.id);
                    const isEditing = editingRelationshipId === rel.id;
                    return (
                      <div key={rel.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3 relative group">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Nickname</label>
                                <input
                                  type="text"
                                  className="w-full text-xs font-semibold p-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                                  value={editNickname}
                                  onChange={e => setEditNickname(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Relationship</label>
                                <select
                                  className="w-full text-xs font-semibold p-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                                  value={editRelationshipType}
                                  onChange={e => setEditRelationshipType(e.target.value)}
                                >
                                  <option value="girlfriend">Girlfriend</option>
                                  <option value="boyfriend">Boyfriend</option>
                                  <option value="mother">Mother</option>
                                  <option value="father">Father</option>
                                  <option value="friend">Friend</option>
                                  <option value="other">Other</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Birthday</label>
                              <input
                                type="text"
                                placeholder="e.g. 12 October or YYYY-MM-DD"
                                className="w-full text-xs font-semibold p-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                                value={editBirthday}
                                onChange={e => setEditBirthday(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Insights / Notes</label>
                              <textarea
                                className="w-full text-xs font-semibold p-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                                rows={2}
                                value={editNotes}
                                onChange={e => setEditNotes(e.target.value)}
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setEditingRelationshipId(null)}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold rounded-lg transition-all"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveRelationship(rel.id)}
                                className="px-3 py-1 bg-violet-600 hover:bg-violet-750 text-white text-[11px] font-bold rounded-lg transition-all"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Header details with action buttons */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">
                                  {rel.relationship_type === "girlfriend" ? "❤️" : rel.relationship_type === "father" ? "👨" : "👤"}
                                </span>
                                <div>
                                  <h4 className="font-extrabold text-slate-800 text-sm">{rel.nickname}</h4>
                                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">{rel.relationship_type}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {rel.birthday && (
                                  <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {rel.birthday}
                                  </span>
                                )}
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => startEditingRelationship(rel)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                                    title="Edit Profile"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRelationship(rel.id)}
                                    className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                                    title="Delete Profile"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Interests / Preferences list */}
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Preferences Vault</span>
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {relPrefs.map(pref => (
                                  <span key={pref.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded">
                                    {pref.interest}
                                    <button
                                      onClick={() => handleDeletePreference(pref.id)}
                                      className="hover:text-rose-500 font-black text-[9px] cursor-pointer"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                                {/* Inline Add preference form */}
                                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/50 rounded-lg pl-1.5 pr-0.5 py-0.5">
                                  <input
                                    type="text"
                                    placeholder="+ Add Interest"
                                    className="bg-transparent text-[10px] focus:outline-none w-16 text-slate-600 placeholder-slate-400 font-bold"
                                    value={newInterestText[rel.id] || ""}
                                    onChange={e => setNewInterestText(prev => ({ ...prev, [rel.id]: e.target.value }))}
                                    onKeyDown={e => {
                                      if (e.key === "Enter") handleAddPreference(rel.id);
                                    }}
                                  />
                                  <button
                                    onClick={() => handleAddPreference(rel.id)}
                                    className="px-1 text-[11px] font-bold text-violet-600 hover:text-violet-800"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>

                            {rel.notes && (
                              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                                <span className="font-bold text-slate-700">Insights:</span> {rel.notes}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PROFILE TAB VIEW */}
          {activeTab === "profile" && (
            <div className="p-5 max-w-lg mx-auto space-y-5 animate-fade-in">
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2">Shopping Profile</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tone Selection</label>
                    <div className="flex gap-2">
                      {["neutral", "singlish", "casual"].map(tone => (
                        <button
                          key={tone}
                          onClick={() => setUserTone(tone)}
                          className={`flex-1 py-1.5 rounded-lg border text-xs font-bold capitalize transition-all ${userTone === tone ? "bg-violet-600 text-white border-violet-600" : "bg-slate-50 border-slate-200 text-slate-600"}`}
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Preferred Language</label>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">English / Singlish</span>
                  </div>
                </div>
              </div>

              {/* Order logs */}
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2">Recent Orders</h4>
                <div className="text-xs text-slate-400 text-center py-6 font-bold">
                  No orders logged in this session yet. Build a bundle to place an order.
                </div>
              </div>
            </div>
          )}

        </div>

        {/* 5. Bottom Navigation Bar (Mobile / Tablet Layout) */}
        <footer className="shrink-0 md:hidden bg-white border-t border-slate-100 flex justify-between items-center px-4 py-2.5 z-20">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 ${activeTab === "home" ? "text-violet-600 font-extrabold" : "text-slate-400"}`}
          >
            <HomeIcon className="w-5 h-5" />
            <span className="text-[10px] font-bold">Home</span>
          </button>
          <button
            onClick={() => setActiveTab("build-gift")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 ${activeTab === "build-gift" ? "text-violet-600 font-extrabold" : "text-slate-400"}`}
          >
            <Gift className="w-5 h-5" />
            <span className="text-[10px] font-bold">Build Gift</span>
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 ${activeTab === "chat" ? "text-violet-600 font-extrabold" : "text-slate-400"}`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-bold">Chat</span>
          </button>
          <button
            onClick={() => setActiveTab("memory")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 ${activeTab === "memory" ? "text-violet-600 font-extrabold" : "text-slate-400"}`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-bold">Memory</span>
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 ${activeTab === "profile" ? "text-violet-600 font-extrabold" : "text-slate-400"}`}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px] font-bold">Profile</span>
          </button>
        </footer>
      </div>

      {/* 6. Bundle / Hamper Sidebar Drawer (Desktop View / Collapsible) */}
      <aside
        className={`h-full bg-white border-l border-slate-100 flex flex-col transition-all duration-500 relative z-20 ${
          isBundleOpen 
            ? "w-full md:w-[350px] fixed inset-y-0 right-0 md:relative md:flex" 
            : "w-0 md:w-0 overflow-hidden border-none fixed inset-y-0 right-[-100%] md:relative"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-gradient-to-tr from-amber-400 to-rose-500 text-white rounded-lg"><Gift className="w-4 h-4" /></span>
            <h2 className="font-extrabold text-slate-800 text-sm">Hamper Package Details</h2>
          </div>
          <button
            onClick={() => setIsBundleOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {bundle.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
              <ShoppingBag className="w-10 h-10 mb-2.5 opacity-20 text-rose-500 animate-pulse" />
              <h4 className="font-bold text-xs text-slate-700">Hamper Package is Empty</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mt-1 leading-relaxed">
                Add recommended products or custom items to pack into a surprise hamper box.
              </p>
            </div>
          ) : (
            bundle.map(item => (
              <div
                key={item.id}
                className="flex gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl relative group transition-all"
              >
                <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded-lg border border-slate-200 bg-white" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 text-xs truncate">{item.name}</h4>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-rose-600 font-extrabold">LKR {item.price.toLocaleString()}</span>
                    <button
                      onClick={() => removeFromBundle(item.id)}
                      className="text-[10px] text-rose-500 font-bold hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {bundle.length > 0 && (
          <div className="p-5 bg-slate-50 border-t border-slate-100 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">Hamper Subtotal</span>
              <span className="text-base font-black text-rose-600">LKR {bundleTotal.toLocaleString()}</span>
            </div>
            <button
              onClick={() => {
                setIsCheckoutOpen(true);
                setCheckoutStep("summary");
              }}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" /> Proceed to Checkout
            </button>
          </div>
        )}
      </aside>

      {/* 7. Relationship Manager Modal */}
      {showAddPersonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <form onSubmit={handleAddRelationship} className="w-full max-w-sm bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm">Add Someone Important</h3>
              <button type="button" onClick={() => setShowAddPersonModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Relationship Profile</label>
                <select
                  value={newPersonType}
                  onChange={(e) => setNewPersonType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 text-slate-700 font-bold"
                >
                  <option value="girlfriend">Girlfriend</option>
                  <option value="boyfriend">Boyfriend</option>
                  <option value="mother">Mother</option>
                  <option value="father">Father</option>
                  <option value="spouse">Spouse</option>
                  <option value="friend">Friend</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nickname / Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nethmi, Dad"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Birthday</label>
                <input
                  type="text"
                  placeholder="e.g. 12 October, 15 June"
                  value={newPersonBirthday}
                  onChange={(e) => setNewPersonBirthday(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Likes / Preferences (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Pink, Chocolate, Technology"
                  value={newPersonInterests}
                  onChange={(e) => setNewPersonInterests(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 text-slate-800 font-bold"
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddPersonModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs"
              >
                Save Vault
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 8. Checkout Dialog Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden animate-scale-up text-slate-800">
            
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">Secure Kapruka Gateway</h3>
                <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 256-Bit SSL Encryption
                </span>
              </div>
              {checkoutStep !== "payment" && (
                <button onClick={() => setIsCheckoutOpen(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              )}
            </div>

            {checkoutStep === "summary" && (
              <form onSubmit={handleCheckoutSubmit} className="p-5 space-y-4">
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delivery Destination</span>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Recipient Name</label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 text-slate-800 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Recipient Phone</label>
                    <input
                      type="text"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 text-slate-800 font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Delivery Address</label>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 text-slate-800 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Delivery City</label>
                      <input
                        type="text"
                        value={deliveryCity}
                        onChange={(e) => setDeliveryCity(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 text-slate-800 font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sender Name</label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 text-slate-800 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gift Card Greeting Message</label>
                    <textarea
                      value={giftMessageText}
                      onChange={(e) => setGiftMessageText(e.target.value)}
                      required
                      rows={2}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 text-slate-800 font-medium leading-relaxed"
                    />
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex justify-between items-center text-xs">
                  <div className="flex gap-1.5 items-center">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-800 font-bold">Delivery Estimate:</span>
                  </div>
                  <span className="font-extrabold text-emerald-700">🚚 Sandbox: 3 Days</span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">Total Amount</span>
                  <span className="text-base font-black text-rose-600">LKR {bundleTotal.toLocaleString()}</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Generate Kapruka Order
                </button>
              </form>
            )}

            {checkoutStep === "payment" && (
              <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Authorizing Gateway...</h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold">Connecting to Kapruka MCP Server...</p>
                </div>
              </div>
            )}

            {checkoutStep === "success" && (
              <div className="p-6 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 shadow-sm animate-scale-up">
                  <Check className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Order Created Successfully!</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">
                    Reference: <span className="text-slate-800 font-black">{orderRef}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-2">
                    Click the payment button below to complete checkout on the official Kapruka portal.
                  </p>
                </div>
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black rounded-xl text-center shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  💳 Complete Payment (Kapruka Link)
                </a>
                <button
                  onClick={handleCheckoutConfirm}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  Close & Return
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden animate-scale-up flex flex-col md:flex-row h-[500px] md:h-[450px]">
            {/* Left/Top: Image */}
            <div className="w-full md:w-1/2 bg-slate-50 relative h-[200px] md:h-full flex items-center justify-center">
              <img
                src={modalProductDetails?.images?.[0] || modalProductDetails?.image_url || "https://images.unsplash.com/photo-1549007994-cb92ca88806f?w=400&q=80"}
                alt={modalProductDetails?.name || "Product"}
                className="w-full h-full object-cover"
              />
              <button 
                onClick={() => setSelectedProductId(null)}
                className="absolute top-4 left-4 p-2 bg-white/80 hover:bg-white text-slate-800 rounded-full shadow-md md:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Right/Bottom: Description & Info */}
            <div className="w-full md:w-1/2 p-6 flex flex-col h-[300px] md:h-full relative overflow-hidden bg-white">
              <button 
                onClick={() => setSelectedProductId(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg hidden md:block z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {isProductModalLoading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
                  <span className="text-xs font-bold text-slate-400">Loading catalog specifications...</span>
                </div>
              ) : (
                <div className="flex flex-col h-full overflow-hidden">
                  {/* Scrollable details wrapper */}
                  <div className="flex-1 overflow-y-auto pr-1 pb-4 space-y-4 scrollbar-thin">
                    <div>
                      <span className="text-[9px] font-black bg-rose-100 text-rose-600 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {modalProductDetails?.category?.name || modalProductDetails?.category || "Exclusive Curation"}
                      </span>
                      <h3 className="font-extrabold text-slate-800 text-base md:text-lg leading-snug mt-2">
                        {modalProductDetails?.name}
                      </h3>
                      <p className="text-lg font-black text-rose-600 mt-1">
                        LKR {Number(modalProductDetails?.price?.amount || modalProductDetails?.price || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Details & Curation</span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {modalProductDetails?.description || "This exclusive catalog item is picked directly from Kapruka's premium collections. Verified for high-quality components, hand-delivered with care, and fully eligible for local gift-wrapping options."}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 flex items-center gap-1">
                        🚚 {modalProductDetails?.in_stock ? "Available for Same-Day Delivery" : "Ships in 2-3 days"}
                      </span>
                      {modalProductDetails?.stock_level === "low" && (
                        <span className="text-[10px] font-bold px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg border border-amber-100 animate-pulse">
                          ⚠️ Limited Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sticky Footer Button */}
                  <div className="pt-4 border-t border-slate-100 flex gap-2 shrink-0">
                    <button
                      onClick={() => {
                        addToBundle({
                          id: modalProductDetails.id || modalProductDetails.product_id,
                          name: modalProductDetails.name,
                          price: modalProductDetails.price?.amount || modalProductDetails.price,
                          image_url: modalProductDetails.images?.[0] || modalProductDetails.image_url,
                          url: modalProductDetails.url || "#"
                        });
                        setSelectedProductId(null);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add to Hamper Package
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 9. Judge Wow Panel Sidebar Drawer */}
      {isJudgeMode && (
        <JudgePanel 
          data={selectedTraceData} 
          onClose={() => setIsJudgeMode(false)} 
        />
      )}
    </div>
  );
}
