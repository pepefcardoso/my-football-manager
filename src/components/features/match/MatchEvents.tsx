import { useEffect, useRef } from "react";
import type { MatchEventData } from "../../../domain/types";
import { getEventStyle } from "../../../utils/styleHelpers";

interface MatchEventsProps {
    events: MatchEventData[];
}

export function MatchEvents({ events }: MatchEventsProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [events.length]);

    return (
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800 flex flex-col h-96">
            <h3 className="text-xl font-semibold mb-4 text-primary">📋 Narrativa da Partida</h3>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                {events.length === 0 ? (
                    <p className="text-slate-500 italic text-center py-4">Aguardando início da partida...</p>
                ) : (
                    events.map((event, index) => (
                        <div
                            key={index}
                            className={`p-3 rounded-lg border-l-4 animate-in slide-in-from-left duration-300 ${getEventStyle(event.type)}`}
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-slate-400 font-mono text-sm font-bold bg-slate-950 px-2 py-1 rounded">
                                    {event.minute}'
                                </span>
                                <span className="flex-1 text-slate-200 text-sm leading-relaxed">
                                    {event.description}
                                </span>
                            </div>
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}