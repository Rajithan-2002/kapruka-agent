import React from "react";
import { Package, Truck, CheckCircle2, Clock, MapPin, User, DollarSign } from "lucide-react";

interface TrackingStep {
    name: string;
    status: "done" | "active" | "pending";
    time: string;
}

interface TrackingData {
    orderNumber: string;
    statusText: string;
    estimatedArrival: string;
    recipientName?: string;
    recipientCity?: string;
    grandTotal?: string;
    steps: TrackingStep[];
}

interface TrackingTimelineProps {
    data: TrackingData;
}

export default function TrackingTimeline({ data }: TrackingTimelineProps) {
    if (!data || !data.steps || data.steps.length === 0) {
        return (
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 text-center text-slate-400 text-xs">
                No tracking timeline details available for this order.
            </div>
        );
    }

    const { orderNumber, statusText, estimatedArrival, recipientName, recipientCity, grandTotal, steps } = data;

    return (
        <div className="bg-slate-950 border border-white/10 rounded-2xl shadow-xl overflow-hidden text-slate-200 w-full max-w-md my-2">
            {/* Header info */}
            <div className="bg-slate-900/50 border-b border-white/10 p-4">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Order Reference</span>
                        <h4 className="text-sm font-black text-amber-400">{orderNumber}</h4>
                    </div>
                    <span className="px-2 py-0.5 text-[9px] font-black rounded uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/35">
                        {statusText}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5 text-[10px] text-slate-300">
                    <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-slate-500" />
                        <span>Rec: <strong className="text-white truncate max-w-[80px] inline-block align-bottom">{recipientName || "N/A"}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>City: <strong className="text-white">{recipientCity || "N/A"}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Est: <strong className="text-white">{estimatedArrival || "N/A"}</strong></span>
                    </div>
                    {grandTotal && (
                        <div className="flex items-center gap-1.5 justify-end">
                            <DollarSign className="w-3 h-3 text-slate-500" />
                            <span>Total: <strong className="text-rose-400">{grandTotal}</strong></span>
                        </div>
                    )}
                </div>
            </div>

            {/* Timeline Steps */}
            <div className="p-5 flex flex-col gap-4 relative">
                {/* Connecting line */}
                <div className="absolute left-[29px] top-[32px] bottom-[32px] w-[2px] bg-slate-800" />

                {steps.map((step, idx) => {
                    const isLatest = idx === steps.length - 1;

                    return (
                        <div key={idx} className="flex gap-4 items-start relative z-10">
                            {/* Icon Circle */}
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 border border-white/10 text-slate-400 shrink-0">
                                {isLatest && step.status === "done" ? (
                                    <div className="relative flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        <span className="absolute -inset-1 rounded-full bg-emerald-400/20 animate-ping" />
                                    </div>
                                ) : step.status === "done" ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                ) : step.status === "active" ? (
                                    <Clock className="w-4 h-4 text-amber-500" />
                                ) : (
                                    <Package className="w-4 h-4 text-slate-600" />
                                )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0 pt-0.5">
                                <h5 className={`text-xs font-bold ${isLatest ? "text-amber-400" : "text-slate-200"}`}>
                                    {step.name}
                                </h5>
                                <span className="text-[9px] text-slate-500 block mt-0.5 font-mono">
                                    {step.time}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
