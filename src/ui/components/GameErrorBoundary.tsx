import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "./Button";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class GameErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("🔥 [GameErrorBoundary] Erro capturado:", error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleReset = () => {
        // TODO: Em produção, isso deve ser feito com mais cuidado via IPC
        if (confirm("Isso irá recarregar a aplicação. Se o erro persistir, seu save pode estar corrompido. Continuar?")) {
            window.location.reload();
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-screen w-full bg-background text-text-primary p-6 animate-in fade-in duration-300">
                    <div className="max-w-lg w-full bg-background-secondary border border-background-tertiary rounded-lg shadow-2xl p-8 text-center">

                        <div className="w-20 h-20 bg-status-danger/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={40} className="text-status-danger" />
                        </div>

                        <h1 className="text-2xl font-bold mb-2 tracking-wide">
                            Ocorreu um erro inesperado
                        </h1>

                        <p className="text-text-secondary text-sm mb-6 leading-relaxed">
                            O motor do jogo encontrou uma inconsistência crítica.
                            Isso geralmente ocorre devido a dados corrompidos ou falha lógica na renderização.
                        </p>

                        {this.state.error && (
                            <div className="bg-background-tertiary/50 p-4 rounded border border-background-tertiary mb-6 text-left overflow-auto max-h-40 custom-scrollbar">
                                <code className="text-xs font-mono text-status-danger block mb-2">
                                    {this.state.error.toString()}
                                </code>
                                {this.state.errorInfo && (
                                    <pre className="text-[10px] text-text-muted font-mono whitespace-pre-wrap">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Button
                                variant="primary"
                                icon={RefreshCw}
                                onClick={this.handleReload}
                                className="w-full sm:w-auto"
                            >
                                Tentar Recarregar
                            </Button>

                            <Button
                                variant="ghost"
                                icon={Home}
                                onClick={this.handleReset}
                                className="w-full sm:w-auto text-status-danger hover:bg-status-danger/10"
                            >
                                Reiniciar Forçado
                            </Button>
                        </div>

                        <div className="mt-6 pt-4 border-t border-background-tertiary">
                            <span className="text-xs text-text-muted">
                                Se o erro persistir, reporte-o com o código acima.
                            </span>
                        </div>

                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}