import { Logger } from "../../lib/Logger";
import { useGameStore } from "../../store/useGameStore";

function StartPage() {
    const setView = useGameStore((state) => state.setView);
    const isLoading = useGameStore((state) => state.isLoading);

    const handleNewGame = () => {
        setView('team_selection');
    };
    const logger = new Logger('StartPage');

    const handleLoadGame = async () => {
        logger.info("Abrir modal de load...");
        const success = await window.electronAPI.game.loadGame();
        if (success) {
            alert("Funcionalidade de Load em desenvolvimento!");
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
                        onClick={handleNewGame}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-900/20 transition-all transform hover:scale-105"
                    >
                        NOVO JOGO
                    </button>

                    <button
                        onClick={handleLoadGame}
                        disabled={isLoading}
                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg border border-slate-700 transition-all disabled:opacity-50"
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
                Versão Alpha 0.1.0 • FASE 1
            </div>
        </div>
    );
}

export default StartPage;