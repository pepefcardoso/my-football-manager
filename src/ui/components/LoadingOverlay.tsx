import React from "react";
import { Loader2, CheckCircle } from "lucide-react";

interface LoadingOverlayProps {
    isVisible: boolean;
    message?: string | null;
    progress?: number;
    type?: "loading" | "success";
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    isVisible,
    message = "Processando...",
    progress,
    type = "loading",
}) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-background-secondary border border-background-tertiary p-6 rounded-lg shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 animate-in zoom-in-95 duration-300">

                <div className="mb-4">
                    {type === "success" ? (
                        <div className="p-3 bg-status-success/10 rounded-full animate-in zoom-in duration-300">
                            <CheckCircle size={48} className="text-status-success" />
                        </div>
                    ) : (
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Loader2 size={48} className="text-primary animate-spin" />
                        </div>
                    )}
                </div>

                <h3 className="text-lg font-bold text-text-primary text-center mb-2">
                    {type === "success" ? "Concluído" : "Aguarde"}
                </h3>

                {message && (
                    <p className="text-sm text-text-secondary text-center mb-4 leading-relaxed">
                        {message}
                    </p>
                )}

                {type === "loading" && progress !== undefined && (
                    <div className="w-full space-y-2 animate-in slide-in-from-bottom-2 duration-500">
                        <div className="h-2 w-full bg-background-tertiary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300 ease-out"
                                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-text-muted font-mono">
                            <span>Progresso</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};