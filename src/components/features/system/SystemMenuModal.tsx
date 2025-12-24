import { useState, useEffect } from "react";
import { useGameStore } from "../../../store/useGameStore";
import { Logger } from "../../../lib/Logger";

const logger = new Logger("SystemMenuModal");

interface SystemMenuModalProps {
    onClose: () => void;
}

export function SystemMenuModal({ onClose }: SystemMenuModalProps) {
    const resetGame = useGameStore((state) => state.resetGame);
    const [saveName, setSaveName] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        const loadCurrentSaveName = async () => {
            try {
                const state = await window.electronAPI.game.getGameState();
                if (state && state.saveId) {
                    const name = state.saveId.replace('.json', '');
                    setSaveName(name);
                } else {
                    const date = new Date().toISOString().split('T')[0];
                    setSaveName(`save_${date}`);
                }
            } catch (error) {
                logger.error("Erro ao buscar nome do save", error);
            }
        };
        loadCurrentSaveName();
    }, []);

    const handleSaveGame = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!saveName.trim() || isProcessing) return;

        setIsProcessing(true);
        setMessage(null);

        try {
            logger.info(`Salvando jogo como: ${saveName}`);
            const result = await window.electronAPI.game.saveGame(saveName);

            if (result.success) {
                setMessage({ text: "Jogo salvo com sucesso!", type: 'success' });
                setTimeout(() => {
                    onClose();
                }, 1500);
            } else {
                setMessage({ text: `Erro: ${result.message}`, type: 'error' });
            }
        } catch (error) {
            logger.error("Erro crítico ao salvar:", error);
            setMessage({ text: "Erro crítico ao salvar o jogo.", type: 'error' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleQuit = () => {
        if (confirm("Tem certeza que deseja sair? O progresso não salvo será perdido.")) {
            resetGame();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">

                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                    <h2 className="text-xl font-light text-white flex items-center gap-2">
                        <span>⚙️</span> Menu do Sistema
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-8">

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Salvar Progresso</h3>
                        <form onSubmit={handleSaveGame} className="flex flex-col gap-3">
                            <input
                                type="text"
                                value={saveName}
                                onChange={(e) => setSaveName(e.target.value)}
                                placeholder="Nome do arquivo..."
                                className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={isProcessing || !saveName}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {isProcessing ? (
                                    <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                ) : "💾 Salvar Jogo"}
                            </button>
                        </form>

                        {message && (
                            <div className={`p-3 rounded text-sm text-center ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                                {message.text}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-800 pt-6">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Opções de Saída</h3>
                        <button
                            onClick={handleQuit}
                            className="w-full py-3 bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 text-red-400 hover:text-red-300 font-bold rounded-lg transition-all"
                        >
                            🚪 Sair para o Menu Principal
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}