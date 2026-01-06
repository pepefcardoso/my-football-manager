import React, { useMemo, useState } from "react";
import { useGameStore } from "../../state/useGameStore";
import { useUIStore } from "../../state/useUIStore";
import { formatDate, formatMoney } from "../../core/utils/formatters";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import {
    User, Briefcase, Trophy, History,
    Award, ChevronDown, ChevronUp, AlertTriangle, LogOut
} from "lucide-react";

const Section: React.FC<{
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
}> = ({ title, icon: Icon, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-background-secondary rounded-lg border border-background-tertiary overflow-hidden shadow-sm mb-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-background-tertiary/20 hover:bg-background-tertiary/40 transition-colors"
            >
                <div className="flex items-center space-x-2 text-primary font-bold uppercase tracking-wider text-sm">
                    <Icon size={18} />
                    <span>{title}</span>
                </div>
                {isOpen ? <ChevronUp size={18} className="text-text-secondary" /> : <ChevronDown size={18} className="text-text-secondary" />}
            </button>
            {isOpen && (
                <div className="p-4 animate-in slide-in-from-top-2 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
};

export const ManagerProfileScreen: React.FC = () => {
    const {
        meta,
        managers,
        clubManagers,
        clubs,
        clubRelationships,
        nations,
        setState
    } = useGameStore();
    const { setView } = useUIStore();

    const [isResignModalOpen, setIsResignModalOpen] = useState(false);

    const manager = useMemo(() =>
        meta.currentUserManagerId ? managers[meta.currentUserManagerId] : null
        , [meta.currentUserManagerId, managers]);

    const currentContract = useMemo(() => {
        if (!manager || !meta.userClubId) return null;
        return Object.values(clubManagers).find(
            c => c.managerId === manager.id && c.clubId === meta.userClubId
        ) || null;
    }, [manager, meta.userClubId, clubManagers]);

    const relationship = useMemo(() =>
        meta.userClubId ? clubRelationships[meta.userClubId] : null
        , [meta.userClubId, clubRelationships]);

    const currentClub = useMemo(() =>
        meta.userClubId ? clubs[meta.userClubId] : null
        , [meta.userClubId, clubs]);

    const nation = useMemo(() =>
        manager ? nations[manager.nationId] : null
        , [manager, nations]);

    const handleResign = () => {
        setState(state => {
            state.meta.userClubId = null;
        });
        setIsResignModalOpen(false);
        alert("Você pediu demissão e agora está desempregado.");
        setView("DASHBOARD");
    };

    if (!manager) return <div className="p-8">Gerente não encontrado.</div>;

    const age = new Date().getFullYear() - new Date(manager.birthDate).getFullYear();

    return (
        <div className="max-w-6xl mx-auto p-2 md:p-0 animate-in fade-in duration-300">
            <div className="bg-background-secondary p-6 rounded-lg border border-background-tertiary shadow-lg mb-6 flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
                <div className="w-24 h-24 bg-background-tertiary rounded-full flex items-center justify-center border-4 border-background">
                    <User size={48} className="text-text-secondary" />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h1 className="text-3xl font-bold text-text-primary">{manager.name}</h1>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2 text-sm text-text-secondary">
                        <span className="flex items-center">
                            <span className="mr-2">🏳️</span>
                            {nation?.name || "Desconhecido"}
                        </span>
                        <span>•</span>
                        <span>{age} anos</span>
                        <span>•</span>
                        <span className="flex items-center">
                            <Award size={14} className="mr-1 text-yellow-500" />
                            Reputação: <span className="text-text-primary font-mono ml-1">{manager.reputation}</span>
                        </span>
                    </div>
                </div>
                {currentClub && (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-white rounded-full p-1 border-2 border-background-tertiary mb-1">
                            {currentClub.badgePath ? (
                                <img src={currentClub.badgePath} className="w-full h-full object-contain" alt={currentClub.name} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-black">
                                    {currentClub.nickname.substring(0, 2)}
                                </div>
                            )}
                        </div>
                        <span className="text-xs font-bold text-text-primary">{currentClub.name}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <Section title="Contrato Atual" icon={Briefcase}>
                        {currentContract && currentClub ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-background p-3 rounded border border-background-tertiary">
                                        <div className="text-xs text-text-muted uppercase">Salário Mensal</div>
                                        <div className="text-lg font-mono font-bold text-status-success">
                                            {formatMoney(currentContract.monthlyWage)}
                                        </div>
                                    </div>
                                    <div className="bg-background p-3 rounded border border-background-tertiary">
                                        <div className="text-xs text-text-muted uppercase">Expiração</div>
                                        <div className="text-lg font-mono font-bold text-text-primary">
                                            {formatDate(currentContract.expirationDate)}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <h4 className="text-xs font-bold text-text-secondary uppercase mb-2">Objetivos da Diretoria</h4>
                                    {relationship ? (
                                        <ul className="space-y-2 text-sm">
                                            <li className="flex items-center justify-between bg-background p-2 rounded border border-background-tertiary">
                                                <span>Liga Nacional</span>
                                                <span className="font-bold text-primary">{relationship.leagueObjective}</span>
                                            </li>
                                            <li className="flex items-center justify-between bg-background p-2 rounded border border-background-tertiary">
                                                <span>Copa Nacional</span>
                                                <span className="font-bold text-primary">{relationship.nationalCupObjective}</span>
                                            </li>
                                        </ul>
                                    ) : (
                                        <p className="text-text-muted italic">Objetivos não definidos.</p>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-background-tertiary flex justify-end">
                                    <Button
                                        variant="ghost"
                                        className="text-status-danger hover:bg-status-danger/10 hover:text-status-danger"
                                        onClick={() => setIsResignModalOpen(true)}
                                    >
                                        Pedir Demissão
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-text-muted">
                                <Briefcase size={32} className="mx-auto mb-2 opacity-50" />
                                <p>Você está atualmente desempregado.</p>
                            </div>
                        )}
                    </Section>

                    <Section title="Galeria de Troféus" icon={Trophy}>
                        {manager.titles.length === 0 ? (
                            <div className="text-center py-6 text-text-muted italic text-sm">
                                Nenhum título conquistado... ainda.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {manager.titles.map((title) => (
                                    <div key={title.id} className="flex items-center bg-background p-2 rounded border border-background-tertiary">
                                        <Trophy size={16} className="text-yellow-500 mr-3" />
                                        <div>
                                            <div className="text-sm font-bold text-text-primary">Campeão</div>
                                            <div className="text-xs text-text-muted">Temporada {title.seasonId}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>
                </div>

                <div>
                    <Section title="Histórico de Clubes" icon={History}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-background-tertiary/30 text-xs uppercase text-text-secondary">
                                    <tr>
                                        <th className="p-2">Clube</th>
                                        <th className="p-2 text-center">Jogos</th>
                                        <th className="p-2 text-center">V-E-D</th>
                                        <th className="p-2 text-center">Apr %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-background-tertiary/30">
                                    {currentClub && (
                                        <tr className="bg-primary/5">
                                            <td className="p-3 font-bold text-primary flex items-center">
                                                {currentClub.name} <span className="ml-2 text-[10px] bg-primary text-white px-1 rounded">ATUAL</span>
                                            </td>
                                            <td className="p-3 text-center">-</td>
                                            <td className="p-3 text-center">-</td>
                                            <td className="p-3 text-center">-</td>
                                        </tr>
                                    )}
                                    {manager.careerHistory.map((record) => {
                                        const total = record.wins + record.draws + record.losses;
                                        const winRate = total > 0 ? ((record.wins / total) * 100).toFixed(1) : "0.0";
                                        return (
                                            <tr key={record.id} className="hover:bg-background-tertiary/10">
                                                <td className="p-3 font-medium">{record.clubName}</td>
                                                <td className="p-3 text-center">{record.gamesManaged}</td>
                                                <td className="p-3 text-center text-xs">
                                                    <span className="text-status-success">{record.wins}</span>-
                                                    <span className="text-text-secondary">{record.draws}</span>-
                                                    <span className="text-status-danger">{record.losses}</span>
                                                </td>
                                                <td className="p-3 text-center font-mono">{winRate}%</td>
                                            </tr>
                                        );
                                    })}
                                    {manager.careerHistory.length === 0 && !currentClub && (
                                        <tr>
                                            <td colSpan={4} className="p-4 text-center text-text-muted italic">
                                                Sem histórico registrado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Section>
                </div>
            </div>

            <Modal
                isOpen={isResignModalOpen}
                onClose={() => setIsResignModalOpen(false)}
                title="Confirmar Demissão"
            >
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-status-danger/10 rounded-full flex items-center justify-center mx-auto">
                        <AlertTriangle size={32} className="text-status-danger" />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary">Tem certeza que deseja sair?</h3>
                    <p className="text-text-secondary text-sm">
                        Você deixará o comando do <strong>{currentClub?.name}</strong> imediatamente.
                        Esta ação não pode ser desfeita e você ficará desempregado até receber uma nova proposta.
                    </p>
                    <div className="flex space-x-3 pt-4 justify-center">
                        <Button variant="secondary" onClick={() => setIsResignModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button variant="danger" icon={LogOut} onClick={handleResign}>
                            Confirmar Saída
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};