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
            <header className="flex-none p-6 border-b border-background-tertiary flex items-center bg-background-secondary shadow-md z-10">
                <Button variant="ghost" icon={ArrowLeft} onClick={() => setView("MAIN_MENU")}>Voltar</Button>
                <h2 className="ml-4 text-xl font-bold text-text-primary tracking-wide">Configuração de Novo Jogo</h2>
            </header>

            <div className="flex-1 overflow-hidden p-6 md:p-8">
                <div className="max-w-7xl mx-auto h-full grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">

                    <div className="md:col-span-4 flex flex-col space-y-6">
                        <div className="bg-background-secondary p-6 rounded-lg border border-background-tertiary shadow-lg">
                            <div className="flex items-center mb-6 text-primary border-b border-background-tertiary pb-4">
                                <User className="mr-2" size={24} />
                                <h3 className="font-bold uppercase tracking-wider text-lg">Treinador</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">Nome Completo</label>
                                    <input
                                        type="text"
                                        value={managerName}
                                        onChange={(e) => setManagerName(e.target.value)}
                                        className="w-full bg-background border border-background-tertiary rounded p-3 text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder-text-muted/50"
                                        placeholder="Ex: José Mourinho"
                                    />
                                </div>
                                <div className="p-4 bg-primary/5 rounded border border-primary/10 text-xs text-text-secondary">
                                    <p>A sua reputação inicial será definida com base no clube escolhido.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-8 h-full min-h-0">
                        <div className="bg-background-secondary p-6 rounded-lg border border-background-tertiary shadow-lg h-full flex flex-col">
                            <div className="flex items-center mb-4 text-primary border-b border-background-tertiary pb-4 flex-none">
                                <Shield className="mr-2" size={24} />
                                <h3 className="font-bold uppercase tracking-wider text-lg">Escolha seu Clube</h3>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                {Object.values(clubs).map((club) => (
                                    <button
                                        key={club.id}
                                        onClick={() => setSelectedClubId(club.id)}
                                        className={`w-full group flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${selectedClubId === club.id
                                            ? "bg-primary/10 border-primary text-text-primary shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                                            : "bg-background border-background-tertiary text-text-secondary hover:bg-background-tertiary hover:border-text-muted"
                                            }`}
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 rounded-full bg-background-tertiary flex items-center justify-center font-bold text-text-muted">
                                                {club.name.substring(0, 1)}
                                            </div>
                                            <div className="text-left">
                                                <div className={`font-bold ${selectedClubId === club.id ? 'text-primary' : 'text-text-primary'}`}>
                                                    {club.name}
                                                </div>
                                                <div className="text-xs text-text-muted">
                                                    Reputação: {club.reputation} | Estádio: {club.reputation}
                                                </div>
                                            </div>
                                        </div>

                                        {selectedClubId === club.id && (
                                            <CheckCircle size={20} className="text-primary animate-in zoom-in duration-200" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="flex-none p-6 border-t border-background-tertiary bg-background-secondary flex justify-end items-center space-x-4 z-20">
                <div className="text-sm text-text-muted mr-auto">
                    {selectedClubId ? `Clube selecionado: ${clubs[selectedClubId].name}` : "Nenhum clube selecionado"}
                </div>
                <Button
                    size="lg"
                    onClick={handleStart}
                    disabled={!managerName || !selectedClubId}
                    className="w-48 shadow-lg shadow-primary/20"
                >
                    Iniciar Carreira
                </Button>
            </footer>
        </div>
    );
};