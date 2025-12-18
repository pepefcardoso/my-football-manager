import type { MatchEventData } from "../../../domain/types";
import { getEventStyle } from "../../../utils/styleHelpers";

interface MatchEventsProps {
    events: MatchEventData[];
}

export function MatchEvents({ events }: MatchEventsProps) {
    return (
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
            <h3 className="text-xl font-semibold mb-4 text-emerald-400">📋 Narrativa da Partida</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {events.length === 0 ? (
                    <p className="text-slate-500 italic text-center py-4">Aguardando início da partida...</p>
                ) : (
                    [...events].reverse().map((event, index) => (
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
            </div>
        </div>
    );
}