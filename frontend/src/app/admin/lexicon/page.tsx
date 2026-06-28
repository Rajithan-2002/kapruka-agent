"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";

interface LexiconEntry {
    id: number;
    slang_word: string;
    standard_english: string;
    category: string;
    votes: number;
    status: string;
    created_at: string;
}

export default function LexiconAdminPage() {
    const [entries, setEntries] = useState<LexiconEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                redirect("/");
            }
            
            // Check admin email
            const res = await fetch("/api/admin/lexicon/auth");
            const data = await res.json();
            
            if (!data.isAdmin) {
                redirect("/");
            }
            
            setIsAdmin(true);
            fetchEntries();
        };
        
        checkAuth();
    }, [supabase]);

    const fetchEntries = async () => {
        const { data, error } = await supabase
            .from("kappy_community_lexicon")
            .select("*")
            .eq("status", "PENDING")
            .order("votes", { ascending: false });

        if (!error && data) {
            setEntries(data);
        }
        setLoading(false);
    };

    const handleAction = async (id: number, action: "APPROVED" | "REJECTED") => {
        try {
            await fetch("/api/admin/lexicon", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, action })
            });
            // Remove from list
            setEntries(entries.filter(e => e.id !== id));
        } catch (err) {
            console.error("Action failed:", err);
        }
    };

    if (loading || !isAdmin) {
        return <div className="p-8 text-white">Loading Admin Dashboard...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8 font-sans">
            <div className="max-w-5xl mx-auto">
                <header className="mb-8 border-b border-slate-800 pb-6">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        Kapruka Community Lexicon Moderation
                    </h1>
                    <p className="text-slate-400 mt-2">
                        Review slang words taught by users to Kappy. Items with 7+ votes are auto-approved.
                    </p>
                </header>

                {entries.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-xl font-medium text-slate-300">No Pending Items</h3>
                        <p className="mt-2">The community lexicon queue is completely clear!</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {entries.map((entry) => (
                            <div key={entry.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between hover:border-slate-700 transition-colors">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-bold text-emerald-400">{entry.slang_word}</h2>
                                        <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                        <h2 className="text-xl font-medium text-slate-200">{entry.standard_english}</h2>
                                    </div>
                                    <div className="flex items-center gap-4 mt-3 text-sm">
                                        <span className="bg-slate-800 px-3 py-1 rounded-full text-slate-300 font-mono text-xs border border-slate-700">
                                            {entry.category}
                                        </span>
                                        <span className="flex items-center gap-1 text-amber-400 font-medium">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            {entry.votes} {entry.votes === 1 ? 'Vote' : 'Votes'}
                                        </span>
                                        <span className="text-slate-500 text-xs">
                                            Added {new Date(entry.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => handleAction(entry.id, "REJECTED")}
                                        className="px-4 py-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40 transition-all font-medium flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Reject
                                    </button>
                                    <button 
                                        onClick={() => handleAction(entry.id, "APPROVED")}
                                        className="px-4 py-2 rounded-lg bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:bg-emerald-400 transition-all font-medium flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Approve Word
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
