import React, { useState } from "react";
import { User, Shield, CheckCircle, ArrowLeft } from "lucide-react";
import { useGameStore } from "../../state/useGameStore";
import { useUIStore } from "../../state/useUIStore";
import { Button } from "../components/Button";
import { ClubBadge } from "../components/ClubBadge";

export const NewGameSetupScreen: React.FC = () => {
    const { setState, meta, saveGame } = useGameStore();
    const { clubs } = useGameStore(s => s.clubs);
    const { setView } = useUIStore();

    const [managerName, setManagerName] = useState("José Manager");
    const [selectedClubId, setSelectedClubId] = useState<string | null>(meta.userClubId);

    const handleStart = async () => {
        if (!managerName.trim() || !selectedClubId) return;

        setState((state) => {
            const humanId = state.meta.currentUserManagerId;
            if (state.people.managers[humanId]) {
                state.people.managers[humanId].name = managerName;
            }

            state.meta.userClubId = selectedClubId;
            state.meta.saveName = `${managerName} - ${state.clubs.clubs[selectedClubId].name}`;
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
                                {Object.values(clubs).map((club) => {
                                    const isSelected = selectedClubId === club.id;

                                    return (
                                        <button
                                            key={club.id}
                                            onClick={() => setSelectedClubId(club.id)}
                                            className={`w-full group flex items-center justify-between p-4 rounded-lg border transition-all duration-200 relative overflow-hidden ${isSelected
                                                ? "bg-primary/10 border-primary text-text-primary shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                                                : "bg-background border-background-tertiary text-text-secondary hover:bg-background-tertiary hover:border-text-muted"
                                                }`}
                                        >
                                            {isSelected && (
                                                <div
                                                    className="absolute left-0 top-0 bottom-0 w-1"
                                                    style={{ backgroundColor: club.secondaryColor }}
                                                />
                                            )}

                                            <div className="flex items-center space-x-4 pl-2">
                                                <div
                                                    className="w-12 h-12 rounded-full bg-white flex items-center justify-center border-2 shadow-sm overflow-hidden p-1 transition-transform group-hover:scale-110"
                                                    style={{ borderColor: club.primaryColor }}
                                                >
                                                    <ClubBadge
                                                        badgeId={club.badgeId}
                                                        clubName={club.name}
                                                        className="w-full h-full"
                                                    />
                                                </div>

                                                <div className="text-left">
                                                    <div className={`font-bold text-lg ${isSelected ? 'text-primary' : 'text-text-primary'}`}>
                                                        {club.name}
                                                    </div>
                                                    <div className="text-xs text-text-muted flex items-center space-x-2">
                                                        <span>Reputação: <span className="text-text-secondary">{club.reputation}</span></span>
                                                        <span>•</span>
                                                        <span>Torcida: <span className="text-text-secondary">{(club.fanBaseCurrent / 1000).toFixed(0)}k</span></span>
                                                    </div>
                                                </div>
                                            </div>

                                            {isSelected && (
                                                <CheckCircle size={24} className="text-primary animate-in zoom-in duration-200" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="flex-none p-6 border-t border-background-tertiary bg-background-secondary flex justify-end items-center space-x-4 z-20">
                <div className="text-sm text-text-muted mr-auto flex items-center">
                    {selectedClubId ? (
                        <>
                            <span className="mr-2">Clube selecionado:</span>
                            <span className="font-bold text-text-primary" style={{ color: clubs[selectedClubId].primaryColor }}>
                                {clubs[selectedClubId].name}
                            </span>
                        </>
                    ) : (
                        "Nenhum clube selecionado"
                    )}
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