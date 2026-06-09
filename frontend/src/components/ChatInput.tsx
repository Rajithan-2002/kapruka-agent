"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export default function ChatInput({ onSendMessage, disabled = false, placeholder = "Type a message..." }: ChatInputProps) {
    const [message, setMessage] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && !disabled) {
            onSendMessage(message.trim());
            setMessage("");
        }
    };

    useEffect(() => {
        if (!disabled && inputRef.current) {
            inputRef.current.focus();
        }
    }, [disabled]);

    return (
        <form
            onSubmit={handleSubmit}
            className="relative flex items-center w-full gap-2 p-2 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl transition-all duration-300 focus-within:border-amber-500/50 focus-within:ring-2 focus-within:ring-amber-500/20"
        >
            <div className="flex items-center justify-center pl-3 text-amber-500/70">
                <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            
            <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={disabled}
                placeholder={disabled ? "Kappy is thinking..." : placeholder}
                className="flex-1 px-2 py-3 bg-transparent text-white placeholder-slate-400 focus:outline-none disabled:opacity-50 text-sm md:text-base"
            />
            
            <button
                type="submit"
                disabled={!message.trim() || disabled}
                className="flex items-center justify-center p-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 active:scale-95 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:scale-100 text-white rounded-xl shadow-lg transition-all duration-200"
            >
                <Send className="w-4 h-4 md:w-5 h-5" />
            </button>
        </form>
    );
}
