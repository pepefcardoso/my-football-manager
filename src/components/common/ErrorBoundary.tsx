import { Component, } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { globalLogger } from "../../lib/Logger";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        globalLogger.error("Uncaught UI Error captured by Boundary:", {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack
        });

        this.setState({ errorInfo });
    }

    handleRestart = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                    <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl shadow-red-900/10">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                            <span className="text-3xl">⚠️</span>
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-2">Erro Crítico Encontrado</h1>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                            Ocorreu um problema inesperado que impediu o funcionamento correto do jogo.
                            Os detalhes foram registados para análise.
                        </p>

                        {this.state.error && (
                            <div className="bg-slate-950 rounded-lg p-4 mb-6 border border-slate-800 text-left overflow-auto max-h-40 custom-scrollbar">
                                <p className="text-red-400 font-mono text-xs font-bold mb-1">
                                    {this.state.error.name}
                                </p>
                                <p className="text-slate-500 font-mono text-xs break-words">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={this.handleRestart}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span>🔄</span> Reiniciar Aplicação
                        </button>
                    </div>

                    <p className="mt-8 text-slate-600 text-xs font-mono">
                        Football Manager 2D • Error Recovery System
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}