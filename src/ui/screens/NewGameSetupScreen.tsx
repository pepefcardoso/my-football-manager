import React, { useState } from "react";
import { User, Shield, CheckCircle, ArrowLeft } from "lucide-react";
import { useGameStore } from "../../state/useGameStore";
import { useUIStore } from "../../state/useUIStore";
import { Button } from "../components/Button";

export const NewGameSetupScreen: React.FC = () => {
    const { clubs, setState, meta, saveGame } = useGameStore();
    const { setView } = useUIStore();

    const [managerName, setManagerName] = useState("José Manager");
    const [selectedClubId, setSelectedClubId] = useState<string | null>(meta.userClubId);

    const handleStart = async () => {
        if (!managerName.trim() || !selectedClubId) return;

        setState((state) => {
            const humanId = state.meta.currentUserManagerId;
            if (state.managers[humanId]) {
                state.managers[humanId].name = managerName;
            }

            state.meta.userClubId = selectedClubId;
            state.meta.saveName = `${managerName} - ${state.clubs[selectedClubId].name}`;
        });

        await saveGame(`${managerName} - ${clubs[selectedClubId].name}`);

        setView("DASHBOARD");
    };

    return (
        <div className="h-full w-full bg-background flex flex-col">
            <header className="p-6 border-b border-background-tertiary flex items-center bg-background-secondary">
                <Button variant="ghost" icon={ArrowLeft} onClick={() => setView("MAIN_MENU")}>Voltar</Button>
                <h2 className="ml-4 text-xl font-bold text-text-primary">Configuração de Novo Jogo</h2>
            </header>

            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">

                    <div className="space-y-6">
                        <div className="bg-background-secondary p-6 rounded-lg border border-background-tertiary">
                            <div className="flex items-center mb-4 text-primary">
                                <User className="mr-2" />
                                <h3 className="font-bold uppercase tracking-wider">Perfil do Treinador</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">Nome Completo</label>
                                    <input
                                        type="text"
                                        value={managerName}
                                        onChange={(e) => setManagerName(e.target.value)}
                                        className="w-full bg-background border border-background-tertiary rounded p-2 text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-background-secondary p-6 rounded-lg border border-background-tertiary h-full flex flex-col">
                            <div className="flex items-center mb-4 text-primary">
                                <Shield className="mr-2" />
                                <h3 className="font-bold uppercase tracking-wider">Escolha seu Clube</h3>
                            </div>

                            <div className="flex-1 overflow-y-auto max-h-[400px] space-y-2 pr-2">
                                {Object.values(clubs).map((club) => (
                                    <button
                                        key={club.id}
                                        onClick={() => setSelectedClubId(club.id)}
                                        className={`w-full flex items-center justify-between p-4 rounded border transition-all ${selectedClubId === club.id
                                            ? "bg-primary/10 border-primary text-text-primary"
                                            : "bg-background border-background-tertiary text-text-secondary hover:bg-background-tertiary"
                                            }`}
                                    >
                                        <span className="font-medium">{club.name}</span>
                                        {selectedClubId === club.id && <CheckCircle size={16} className="text-primary" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="p-6 border-t border-background-tertiary bg-background-secondary flex justify-end">
                <Button
                    size="lg"
                    onClick={handleStart}
                    disabled={!managerName || !selectedClubId}
                >
                    Iniciar Carreira
                </Button>
            </footer>
        </div>
    );
};