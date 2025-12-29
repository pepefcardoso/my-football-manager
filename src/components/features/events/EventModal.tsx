import { useEffect, useState, useCallback } from "react";
import { Logger } from "../../../lib/Logger";
import type { NarrativeEvent } from "../../../domain/narrative";
import Badge from "../../common/Badge";
import { Modal, type ModalVariant } from "../../common/Modal";

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

    const getModalVariant = (importance: string): ModalVariant => {
        switch (importance) {
            case "critical": return "danger";
            case "high": return "warning";
            case "medium": return "info";
            default: return "default";
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

            if (event.options && event.options.length > 0) {
                const key = parseInt(e.key);
                if (!isNaN(key) && key >= 1 && key <= event.options.length) {
                    handleOptionClick(event.options[key - 1].id);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [event, isProcessing, handleOptionClick]);

    const headerContent = (
        <div className="flex gap-4 items-center">
            <div className="text-3xl bg-slate-800 w-12 h-12 rounded-lg flex items-center justify-center border border-slate-700">
                {getCategoryIcon(event.category)}
            </div>
            <div>
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                        {event.category} News
                    </span>
                    {event.importance === "critical" && (
                        <Badge variant="danger" size="sm">URGENTE</Badge>
                    )}
                </div>
                <span className="text-xl font-bold text-white leading-tight block">
                    {event.title}
                </span>
            </div>
        </div>
    );

    const footerContent = (
        <span className="text-xs text-slate-600 font-mono w-full text-right">
            {new Date(event.date).toLocaleDateString()}
        </span>
    );

    return (
        <Modal
            isOpen={true}
            onClose={onResolve}
            title={headerContent}
            variant={getModalVariant(event.importance)}
            size="lg"
            footer={footerContent}
        >
            <div className="space-y-6">
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
                                Continuar
                            </button>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}