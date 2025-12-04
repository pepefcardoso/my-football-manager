import type { MatchEvent } from "../../../domain/models";
import { getEventStyle } from "../../../utils/styleHelpers";

interface MatchEventsProps {
    events: MatchEvent[];
}

export function MatchEvents({ events }: MatchEventsProps) {
    return (
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
            <h3 className="text-xl font-semibold mb-4">📋 Narrativa da Partida</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.length === 0 ? (
                    <p className="text-slate-500 italic">Aguardando eventos...</p>
                ) : (
                    events.map((event, index) => (
                        <div
                            key={index}
                            className={`p-3 rounded-lg border ${getEventStyle(event.type)}`}
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-slate-400 font-mono text-sm">
                                    {event.minute}'
                                </span>
                                <span className="flex-1">{event.description}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}