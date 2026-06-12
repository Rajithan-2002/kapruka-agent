"use client";

import React, { useEffect, useState } from "react";
import { BrainCircuit, Heart, Gift, DollarSign, Award, X, Sparkles, Trash2 } from "lucide-react";

interface MemoryVaultProps {
    relationships: any[];
    preferences: any[];
    activeMemories: string[];
    onClose?: () => void;
}

export default function MemoryVault({ relationships, preferences, activeMemories, onClose }: MemoryVaultProps) {
    const [highlightedPrefId, setHighlightedPrefId] = useState<string | null>(null);

    // Extract active context from memories array
    const recipientMemory = activeMemories.find(m => m.toLowerCase().includes("recipient:"));
    const occasionMemory = activeMemories.find(m => m.toLowerCase().includes("occasion:"));
    const budgetMemory = activeMemories.find(m => m.toLowerCase().includes("budget:"));
    const targetProductMemory = activeMemories.find(m => m.toLowerCase().includes("looking for:"));

    const activeRecipient = recipientMemory ? recipientMemory.split(":")[1].trim() : null;
    const activeOccasion = occasionMemory ? occasionMemory.split(":")[1].trim() : null;
    const activeBudget = budgetMemory ? budgetMemory.split(":")[1].trim() : null;
    const activeProduct = targetProductMemory ? targetProductMemory.split(":")[1].trim() : null;

    // Find nickname and preferences for the active recipient
    const activeRel = activeRecipient
        ? relationships.find(r => r.relationship_type?.toLowerCase() === activeRecipient.toLowerCase())
        : null;

    const recipientPrefs = activeRel
        ? preferences.filter(p => p.relationship_id === activeRel.id)
        : [];

    // Trigger flash animation when a new preference is registered
    useEffect(() => {
        if (preferences.length > 0) {
            const latestPref = preferences[preferences.length - 1];
            setHighlightedPrefId(latestPref.id);
            const timer = setTimeout(() => {
                setHighlightedPrefId(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [preferences.length]);

    return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-100 border-l border-slate-800 w-full md:w-[320px] shrink-0 overflow-y-auto font-sans relative shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-violet-500 rounded-lg text-white">
                        <BrainCircuit className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="font-extrabold text-sm tracking-wide text-white flex items-center gap-1.5">
                            MEMORY VAULT
                            <span className="text-[9px] font-black bg-emerald-500 text-white px-1 py-0.5 rounded uppercase tracking-widest">Live</span>
                        </h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Kappy cognitive context</p>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            <div className="p-5 space-y-6">
                {/* Section 1: Active Context */}
                <div className="space-y-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Active Search Context</span>
                    <div className="grid grid-cols-1 gap-2.5">
                        <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-3 flex.col space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" /> Recipient:
                                </span>
                                <span className="font-extrabold text-white bg-slate-800 px-2.5 py-0.5 rounded-full capitalize">
                                    {activeRel ? `${activeRel.nickname} (${activeRel.relationship_type})` : activeRecipient || "General / Self"}
                                </span>
                            </div>
                            
                            <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800/40">
                                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                                    <Gift className="w-3.5 h-3.5 text-amber-500" /> Occasion:
                                </span>
                                <span className="font-extrabold text-white capitalize">
                                    {activeOccasion || "Any Occasion"}
                                </span>
                            </div>

                            {activeBudget && (
                                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800/40">
                                    <span className="text-slate-400 font-bold flex items-center gap-1.5">
                                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Budget Limit:
                                    </span>
                                    <span className="font-black text-rose-400">
                                        {activeBudget}
                                    </span>
                                </div>
                            )}

                            {activeProduct && (
                                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800/40">
                                    <span className="text-slate-400 font-bold flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-violet-400" /> Searching for:
                                    </span>
                                    <span className="font-bold text-violet-300 capitalize">
                                        {activeProduct}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 2: Relational Preferences */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Relational Memory</span>
                        {activeRel && (
                            <span className="text-[10px] font-extrabold text-violet-400 bg-violet-950 px-2 py-0.5 rounded-full">
                                Nickname: {activeRel.nickname}
                            </span>
                        )}
                    </div>

                    {activeRel ? (
                        <div className="space-y-2">
                            {recipientPrefs.length === 0 ? (
                                <div className="bg-slate-950/30 border border-slate-850 rounded-2xl p-4 text-center text-slate-500 text-xs font-bold leading-normal">
                                    No specific preferences stored for {activeRel.nickname} yet. Chat to build memory!
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {recipientPrefs.map(pref => {
                                        const isNew = pref.id === highlightedPrefId;
                                        const isDislike = pref.interest?.toLowerCase().startsWith("dislikes:");
                                        return (
                                            <span
                                                key={pref.id}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-500 flex items-center gap-1 ${
                                                    isNew
                                                        ? "text-white border-amber-400 animate-pulse-glow scale-105"
                                                        : isDislike
                                                        ? "bg-rose-950/40 text-rose-300 border-rose-900/50 hover:bg-rose-900/30"
                                                        : "bg-slate-950/50 text-slate-200 border-slate-800 hover:border-slate-700"
                                                }`}
                                            >
                                                {isDislike ? "⚠️" : "💖"} {pref.interest}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                            {activeRel.notes && (
                                <div className="bg-slate-950/30 border border-slate-850/60 rounded-2xl p-3 text-[11px] text-slate-400 font-medium">
                                    <span className="font-extrabold text-slate-300 block mb-1">Curation Insights:</span>
                                    {activeRel.notes}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-slate-950/30 border border-slate-850 rounded-2xl p-4 text-center text-slate-500 text-xs font-bold leading-normal">
                            Identify a recipient in the chat (e.g. "for my mother", "Surprise my dad") to pull their memory profile.
                        </div>
                    )}
                </div>

                {/* Section 3: Learned Preferences / Active Memories list */}
                <div className="space-y-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Active Session Variables</span>
                    {activeMemories.length === 0 ? (
                        <div className="text-slate-500 text-xs font-bold text-center py-4">
                            No active context variables extracted.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {activeMemories.map((m, idx) => (
                                <div
                                    key={idx}
                                    className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2 px-3 text-xs text-slate-300 font-semibold flex items-center gap-2 hover:border-slate-700 hover:text-white transition-all shadow-sm"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                                    <span>{m}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
