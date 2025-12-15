import { useState } from "react";
import { Logger } from "../../lib/Logger";
import { useGameStore } from "../../store/useGameStore";
import { LoadGameModal } from "../features/save-load/LoadGameModal";
import { NewGameModal } from "../features/save-load/NewGameModal";

const logger = new Logger('StartPage');

function StartPage() {
    const setView = useGameStore((state) => state.setView);
    const setNewGameSetup = useGameStore((state) => state.setNewGameSetup);
    const setGameLoading = useGameStore((state) => state.setLoading);

    const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
    const [isNewGameModalOpen, setIsNewGameModalOpen] = useState(false);

    const handleNewGameClick = () => {
        setIsNewGameModalOpen(true);
    };

    const handleNewGameConfirm = (saveName: string, managerName: string) => {
        setNewGameSetup({ saveName, managerName });
        setIsNewGameModalOpen(false);
        setView('team_selection');
    };

    const handleLoadGameConfirm = async (filename: string) => {
        logger.info(`Iniciando carregamento do save: ${filename}`);
        setGameLoading(true);

        try {
            const result = await window.electronAPI.game.loadGame(filename);

            if (result.success) {
                logger.info("Save carregado com sucesso.");
                setIsLoadModalOpen(false);
                setView('game_loop');
            } else {
                alert(`Erro ao carregar: ${result.message}`);
            }
        } catch (error) {
            logger.error("Erro crítico ao carregar jogo:", error);
            alert("Erro crítico ao carregar o jogo.");
        } finally {
            setGameLoading(false);
        }
    };

    return (
        <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 z-0" />

            <div className="z-10 text-center space-y-12">
                <div className="space-y-4">
                    <h1 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
                        FOOTBALL MANAGER<br />2D
                    </h1>
                    <p className="text-slate-400 text-lg uppercase tracking-widest">
                        Simulador de Gestão Esportiva
                    </p>
                </div>

                <div className="flex flex-col gap-4 w-64 mx-auto">
                    <button
                        onClick={handleNewGameClick}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-900/20 transition-all transform hover:scale-105"
                    >
                        NOVO JOGO
                    </button>

                    <button
                        onClick={() => setIsLoadModalOpen(true)}
                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg border border-slate-700 transition-all hover:border-slate-600"
                    >
                        CARREGAR JOGO
                    </button>

                    <button
                        onClick={() => window.close()}
                        className="w-full py-3 text-slate-500 hover:text-red-400 text-sm font-medium transition-colors"
                    >
                        Sair para o Desktop
                    </button>
                </div>
            </div>

            <div className="absolute bottom-6 text-slate-600 text-xs">
                Versão Alpha 0.2.1 • Criação de Save
            </div>

            {isLoadModalOpen && (
                <LoadGameModal
                    onClose={() => setIsLoadModalOpen(false)}
                    onLoad={handleLoadGameConfirm}
                />
            )}

            {isNewGameModalOpen && (
                <NewGameModal
                    onClose={() => setIsNewGameModalOpen(false)}
                    onConfirm={handleNewGameConfirm}
                />
            )}
        </div>
    );
}

export default StartPage;