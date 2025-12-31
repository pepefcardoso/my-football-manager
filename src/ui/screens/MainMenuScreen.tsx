import React, { useState, useEffect } from "react";
import { Play, Download, Power, Trash2, HardDrive } from "lucide-react";
import { useUIStore } from "../../state/useUIStore";
import { useGameStore } from "../../state/useGameStore";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";

export const MainMenuScreen: React.FC = () => {
    const { setView } = useUIStore();
    const { listSaves, loadGame, deleteSave, newGame } = useGameStore();

    const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
    const [saveFiles, setSaveFiles] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isLoadModalOpen) {
            listSaves().then(setSaveFiles);
        }
    }, [isLoadModalOpen, listSaves]);

    const handleNewGame = () => {
        newGame();
        setView("NEW_GAME_SETUP");
    };

    const handleLoadGame = async (filename: string) => {
        setIsLoading(true);
        const success = await loadGame(filename);
        setIsLoading(false);
        if (success) {
            setView("DASHBOARD");
        }
    };

    const handleDeleteSave = async (filename: string) => {
        await deleteSave(filename);
        const newList = await listSaves();
        setSaveFiles(newList);
    };

    const handleExit = () => {
        if (window.confirm("Deseja realmente sair do jogo?")) {
            window.close();
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-background relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-background to-background z-0" />

            <div className="flex-1 flex flex-col items-center justify-center z-10 w-full p-8">
                <div className="text-center space-y-2 mb-12">
                    <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-primary-hover tracking-tighter">
                        MAESTRO
                    </h1>
                    <p className="text-text-secondary text-lg tracking-widest uppercase">Football Manager</p>
                </div>

                <div className="flex flex-col space-y-4 w-64">
                    <Button size="lg" icon={Play} onClick={handleNewGame}>
                        Novo Jogo
                    </Button>

                    <Button variant="secondary" size="lg" icon={Download} onClick={() => setIsLoadModalOpen(true)}>
                        Carregar Jogo
                    </Button>

                    <Button variant="ghost" size="lg" icon={Power} onClick={handleExit} className="text-status-danger hover:bg-status-danger/10">
                        Sair
                    </Button>
                </div>
            </div>

            <div className="z-10 py-4 text-center">
                <div className="text-xs text-text-muted">
                    Versão 1.0.0 Alpha | Electron + React
                </div>
            </div>

            <Modal
                isOpen={isLoadModalOpen}
                onClose={() => setIsLoadModalOpen(false)}
                title="Carregar Jogo Salvo"
            >
                {saveFiles.length === 0 ? (
                    <div className="text-center py-8 text-text-muted">
                        Nenhum save encontrado.
                    </div>
                ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {saveFiles.map((save) => (
                            <div key={save} className="flex items-center justify-between p-3 bg-background border border-background-tertiary rounded hover:border-primary/50 transition-colors group">
                                <div className="flex items-center space-x-3">
                                    <HardDrive size={18} className="text-primary" />
                                    <span className="text-text-primary font-medium">{save}</span>
                                </div>
                                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="sm" onClick={() => handleLoadGame(save)} disabled={isLoading}>
                                        {isLoading ? "..." : "Carregar"}
                                    </Button>
                                    <button
                                        onClick={() => handleDeleteSave(save)}
                                        className="p-2 text-text-secondary hover:text-status-danger transition-colors"
                                        title="Deletar Save"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>
        </div>
    );
};