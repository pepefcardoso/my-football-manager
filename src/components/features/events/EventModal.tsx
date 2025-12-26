import { useEffect, useState, useCallback } from "react";
import { Logger } from "../../../lib/Logger";
import type { NarrativeEvent } from "../../../domain/narrative";
import Badge from "../../common/Badge";

const logger = new Logger("EventModal");

interface EventModalProps {
    event: NarrativeEvent;
    teamId: number;
    onResolve: () => void;
}

export function EventModal({ event, teamId, onResolve }: EventModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultMessage, setResultMessage] = useState<string | null>(null);

    const handleOptionClick = useCallback(async (optionId: string) => {
        setIsProcessing(true);
        try {
            const response = await window.electronAPI.game.respondToEvent({
                eventId: event.id,
                optionId,
                teamId
            });

            if (response.success) {
                setResultMessage(response.message);
                setTimeout(() => {
                    onResolve();
                }, 2500);
            } else {
                logger.error("Erro ao processar evento:", response.message);
                onResolve();
            }
        } catch (error) {
            logger.error("Erro crítico ao responder evento:", error);
            onResolve();
        } finally {
            setIsProcessing(false);
        }
    }, [event.id, teamId, onResolve]);

    const getImportanceColor = (imp: string) => {
        switch (imp) {
            case "critical": return "border-red-500 shadow-red-900/20";
            case "high": return "border-orange-500 shadow-orange-900/20";
            case "medium": return "border-yellow-500 shadow-yellow-900/20";
            default: return "border-slate-600 shadow-slate-900/20";
        }
    };

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case "media": return "📰";
            case "board": return "👔";
            case "player": return "⚽";
            case "fan": return "📢";
            case "sponsor": return "💰";
            default: return "📩";
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isProcessing) return;

            if (e.key === "Escape" && (!event.options || event.options.length === 0)) {
                onResolve();
            }

            if (event.options && event.options.length > 0) {
                const key = parseInt(e.key);
                if (!isNaN(key) && key >= 1 && key <= event.options.length) {
                    handleOptionClick(event.options[key - 1].id);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [event, isProcessing, onResolve, handleOptionClick]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className={`
                bg-slate-900 border-2 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden relative
                ${getImportanceColor(event.importance)}
            `}>

                <div className="bg-slate-950 p-6 border-b border-slate-800 flex justify-between items-start">
                    <div className="flex gap-4">
                        <div className="text-4xl bg-slate-800 w-16 h-16 rounded-lg flex items-center justify-center border border-slate-700">
                            {getCategoryIcon(event.category)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                                    {event.category} News
                                </span>
                                {event.importance === "critical" && (
                                    <Badge variant="danger">URGENTE</Badge>
                                )}
                            </div>
                            <h2 className="text-2xl font-bold text-white leading-tight">
                                {event.title}
                            </h2>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="prose prose-invert">
                        <p className="text-lg text-slate-300 leading-relaxed">
                            {event.description}
                        </p>
                    </div>

                    {resultMessage ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/50 p-4 rounded-lg animate-in fade-in zoom-in duration-300">
                            <p className="text-emerald-400 font-medium text-center">
                                {resultMessage}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-3 pt-4">
                            {event.options && event.options.length > 0 ? (
                                event.options.map((opt, index) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleOptionClick(opt.id)}
                                        disabled={isProcessing}
                                        className="w-full p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 text-left rounded-lg transition-all group disabled:opacity-50 disabled:cursor-wait relative"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="bg-slate-950 px-2 py-0.5 rounded text-xs text-slate-500 border border-slate-700 font-mono">
                                                {index + 1}
                                            </span>
                                            <div>
                                                <span className="block font-bold text-slate-200 group-hover:text-white">
                                                    {opt.label}
                                                </span>
                                                {opt.effectDescription && (
                                                    <span className="text-xs text-slate-500 group-hover:text-slate-400">
                                                        {opt.effectDescription}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <button
                                    onClick={() => onResolve()}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors"
                                >
                                    Continuar (ESC)
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-6 py-3 bg-slate-950/50 border-t border-slate-800 text-right">
                    <span className="text-xs text-slate-600 font-mono">
                        {new Date(event.date).toLocaleDateString()}
                    </span>
                </div>
            </div>
        </div>
    );
}