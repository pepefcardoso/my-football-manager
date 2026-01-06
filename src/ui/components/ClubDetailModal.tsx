import React, { useState, useMemo } from "react";
import { useGameStore } from "../../state/useGameStore";
import { Modal } from "./Modal";
import { Button } from "./Button";
import {
    Trophy, MapPin, Calendar, Users,
    History, Info, Search, Shield
} from "lucide-react";
import { calculateOverall, getAttributeColorClass } from "../../core/utils/playerUtils";

interface ClubDetailModalProps {
    clubId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

type TabType = "INFO" | "HISTORY" | "SQUAD";

export const ClubDetailModal: React.FC<ClubDetailModalProps> = ({ clubId, isOpen, onClose }) => {
    const {
        clubs, clubInfras, stadiums, nations, cities,
        contracts, players, meta, scoutingKnowledge
    } = useGameStore();

    const [activeTab, setActiveTab] = useState<TabType>("INFO");

    const club = useMemo(() => clubId ? clubs[clubId] : null, [clubId, clubs]);

    const infra = useMemo(() => clubId ? clubInfras[clubId] : null, [clubId, clubInfras]);
    const stadium = useMemo(() => infra ? stadiums[infra.stadiumId] : null, [infra, stadiums]);
    const nation = useMemo(() => club ? nations[club.nationId] : null, [club, nations]);
    const city = useMemo(() => club ? cities[club.cityId] : null, [club, cities]);

    const squad = useMemo(() => {
        if (!clubId) return [];
        return Object.values(contracts)
            .filter(c => c.clubId === clubId && c.active)
            .map(c => players[c.playerId])
            .filter(Boolean)
            .sort((a, b) => {
                const posOrder: Record<string, number> = { GK: 0, DEF: 1, MID: 2, ATT: 3 };
                return (posOrder[a.primaryPositionId] || 4) - (posOrder[b.primaryPositionId] || 4);
            });
    }, [clubId, contracts, players]);

    const isUserClub = clubId === meta.userClubId;

    if (!club) return null;

    const renderInfoTab = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="bg-background p-4 rounded border border-background-tertiary">
                        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center">
                            <Info size={14} className="mr-2" /> Dados Gerais
                        </h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-text-muted">Fundação</span>
                                <span className="text-text-primary">{new Date(club.dateFounded).getFullYear()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-muted">Reputação</span>
                                <div className="flex items-center">
                                    <div className="w-20 h-1.5 bg-background-tertiary rounded-full mr-2 overflow-hidden">
                                        <div
                                            className="h-full bg-primary"
                                            style={{ width: `${(club.reputation / 10000) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-text-primary font-mono">{club.reputation}</span>
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-muted">Localização</span>
                                <span className="text-text-primary text-right">
                                    {city?.name}, {nation?.name}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-background p-4 rounded border border-background-tertiary">
                        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center">
                            <Shield size={14} className="mr-2" /> Cores do Clube
                        </h4>
                        <div className="flex space-x-4">
                            <div className="text-center">
                                <div
                                    className="w-12 h-12 rounded-full border-2 border-background-tertiary shadow-sm mb-1 mx-auto"
                                    style={{ backgroundColor: club.primaryColor }}
                                />
                                <span className="text-xs text-text-muted">Primária</span>
                            </div>
                            <div className="text-center">
                                <div
                                    className="w-12 h-12 rounded-full border-2 border-background-tertiary shadow-sm mb-1 mx-auto"
                                    style={{ backgroundColor: club.secondaryColor }}
                                />
                                <span className="text-xs text-text-muted">Secundária</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-background p-4 rounded border border-background-tertiary h-full">
                        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center">
                            <MapPin size={14} className="mr-2" /> Estádio
                        </h4>
                        {stadium ? (
                            <div className="space-y-3">
                                <div>
                                    <div className="text-lg font-bold text-text-primary">{stadium.name}</div>
                                    <div className="text-xs text-text-muted">{stadium.nickname}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                                    <div>
                                        <span className="block text-text-muted text-xs">Capacidade</span>
                                        <span className="font-mono font-bold text-text-primary">
                                            {stadium.capacity.toLocaleString()}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-text-muted text-xs">Qualidade</span>
                                        <div className="flex items-center space-x-1">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <div
                                                    key={star}
                                                    className={`w-2 h-2 rounded-full ${star * 20 <= stadium.quality ? 'bg-primary' : 'bg-background-tertiary'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-text-muted italic">Informações não disponíveis</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderHistoryTab = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-background p-6 rounded border border-background-tertiary text-center text-text-muted italic">
                <History size={48} className="mx-auto mb-4 opacity-20" />
                <p>Histórico de temporadas anteriores não disponível neste save.</p>
                <p className="text-xs mt-2">Os dados serão populados ao final da temporada atual.</p>
            </div>
        </div>
    );

    const renderSquadTab = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-text-secondary">
                    {squad.length} Jogadores Registrados
                </span>
                {!isUserClub && (
                    <Button size="sm" variant="secondary" icon={Search} className="opacity-50 cursor-not-allowed" title="Em breve">
                        Escalar Scout
                    </Button>
                )}
            </div>

            <div className="bg-background rounded border border-background-tertiary overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-sm">
                    <thead className="bg-background-tertiary/50 sticky top-0 backdrop-blur-sm">
                        <tr>
                            <th className="p-3 font-semibold text-text-secondary w-16">Pos</th>
                            <th className="p-3 font-semibold text-text-secondary">Nome</th>
                            <th className="p-3 font-semibold text-text-secondary text-center w-16">Idade</th>
                            <th className="p-3 font-semibold text-text-secondary text-center w-16">OVR</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-background-tertiary/30">
                        {squad.map(player => {
                            const knowledge = scoutingKnowledge[`${meta.userClubId}_${player.id}`];
                            const isKnown = isUserClub || (knowledge && knowledge.knowledgeLevel >= 50);

                            const overall = calculateOverall(player);

                            return (
                                <tr key={player.id} className="hover:bg-background-tertiary/20 transition-colors">
                                    <td className="p-3">
                                        <span className="inline-block px-1.5 py-0.5 bg-background-secondary border border-background-tertiary rounded text-[10px] font-bold text-text-secondary w-10 text-center">
                                            {player.primaryPositionId}
                                        </span>
                                    </td>
                                    <td className="p-3 font-medium text-text-primary">
                                        {player.name}
                                    </td>
                                    <td className="p-3 text-center text-text-muted">
                                        {isKnown ? (
                                            new Date().getFullYear() - new Date(player.birthDate).getFullYear()
                                        ) : (
                                            "?"
                                        )}
                                    </td>
                                    <td className="p-3 text-center font-bold font-mono">
                                        {isKnown ? (
                                            <span className={getAttributeColorClass(overall)}>{overall}</span>
                                        ) : (
                                            <span className="text-text-muted">??</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={club.name}
        >
            <div className="flex flex-col h-[600px] max-h-[80vh]">
                <div className="flex items-center space-x-6 mb-6 p-4 bg-background-secondary rounded-lg border border-background-tertiary">
                    <div
                        className="w-24 h-24 rounded-full bg-white flex items-center justify-center border-4 shadow-lg p-2"
                        style={{ borderColor: club.primaryColor }}
                    >
                        {club.badgePath ? (
                            <img src={club.badgePath} alt={club.name} className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-3xl font-bold text-black">{club.nickname.substring(0, 2)}</span>
                        )}
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-text-primary tracking-tight">{club.name}</h2>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-text-secondary">
                            <span className="flex items-center">
                                <Calendar size={14} className="mr-1" /> Fundado em {new Date(club.dateFounded).getFullYear()}
                            </span>
                            <span className="flex items-center">
                                <MapPin size={14} className="mr-1" /> {city?.name}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex border-b border-background-tertiary mb-6">
                    <button
                        className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === "INFO" ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
                            }`}
                        onClick={() => setActiveTab("INFO")}
                    >
                        <div className="flex items-center"><Info size={16} className="mr-2" /> Informações</div>
                    </button>
                    <button
                        className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === "HISTORY" ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
                            }`}
                        onClick={() => setActiveTab("HISTORY")}
                    >
                        <div className="flex items-center"><Trophy size={16} className="mr-2" /> Histórico</div>
                    </button>
                    <button
                        className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === "SQUAD" ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
                            }`}
                        onClick={() => setActiveTab("SQUAD")}
                    >
                        <div className="flex items-center"><Users size={16} className="mr-2" /> Elenco</div>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {activeTab === "INFO" && renderInfoTab()}
                    {activeTab === "HISTORY" && renderHistoryTab()}
                    {activeTab === "SQUAD" && renderSquadTab()}
                </div>
            </div>
        </Modal>
    );
};