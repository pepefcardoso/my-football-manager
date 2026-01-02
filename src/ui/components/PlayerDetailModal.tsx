import React from "react";
import { Player } from "../../core/models/people";
import { PlayerState } from "../../core/models/stats";
import { Modal } from "./Modal";
import { getAttributeColorClass, calculateOverall, formatPosition } from "../../core/utils/playerUtils";
import { Activity, Heart } from "lucide-react";

interface PlayerDetailModalProps {
    player: Player | null;
    playerState: PlayerState | null;
    isOpen: boolean;
    onClose: () => void;
}

const AttributeRow: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <div className="flex justify-between items-center py-1 border-b border-background-tertiary/50 last:border-0">
        <span className="text-text-secondary text-sm">{label}</span>
        <span className={`text-sm ${getAttributeColorClass(value)}`}>{value}</span>
    </div>
);

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({ player, playerState, isOpen, onClose }) => {
    if (!player) return null;

    const overall = calculateOverall(player);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ficha do Jogador">
            <div className="space-y-6">
                <div className="flex items-start justify-between bg-background-tertiary/30 p-4 rounded-lg border border-background-tertiary">
                    <div>
                        <h2 className="text-2xl font-bold text-text-primary">{player.name}</h2>
                        <div className="flex items-center space-x-2 text-text-secondary mt-1">
                            <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-bold border border-primary/20">
                                {formatPosition(player.primaryPositionId)}
                            </span>
                            <span className="text-sm">• {new Date().getFullYear() - new Date(player.birthDate).getFullYear()} anos</span>
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-text-muted uppercase tracking-wider">Overall</div>
                        <div className={`text-3xl font-bold ${getAttributeColorClass(overall)}`}>{overall}</div>
                    </div>
                </div>

                {playerState && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-background p-3 rounded border border-background-tertiary flex items-center justify-between">
                            <div className="flex items-center text-text-secondary">
                                <Activity size={16} className="mr-2" /> Condição
                            </div>
                            <span className={getAttributeColorClass(playerState.fitness)}>{playerState.fitness}%</span>
                        </div>
                        <div className="bg-background p-3 rounded border border-background-tertiary flex items-center justify-between">
                            <div className="flex items-center text-text-secondary">
                                <Heart size={16} className="mr-2" /> Moral
                            </div>
                            <span className={getAttributeColorClass(playerState.morale)}>{playerState.morale}%</span>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider border-b border-background-tertiary pb-1 mb-2">Técnicos</h4>
                        <AttributeRow label="Finalização" value={player.finishing} />
                        <AttributeRow label="Passe" value={player.passing} />
                        <AttributeRow label="Cruzamento" value={player.crossing} />
                        <AttributeRow label="Técnica" value={player.technique} />
                        <AttributeRow label="Desarme" value={player.defending} />
                    </div>

                    <div className="space-y-1">
                        <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider border-b border-background-tertiary pb-1 mb-2">Físicos & Mentais</h4>
                        <AttributeRow label="Velocidade" value={player.speed} />
                        <AttributeRow label="Força" value={player.force} />
                        <AttributeRow label="Resistência" value={player.stamina} />
                        <AttributeRow label="Inteligência" value={player.intelligence} />
                        <AttributeRow label="Determinação" value={player.determination} />
                    </div>

                    {player.primaryPositionId === 'GK' && (
                        <div className="col-span-1 md:col-span-2 space-y-1">
                            <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider border-b border-background-tertiary pb-1 mb-2">Goleiro</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                <AttributeRow label="Reflexos" value={player.gkReflexes} />
                                <AttributeRow label="Saída de Gol" value={player.gkRushingOut} />
                                <AttributeRow label="Distribuição" value={player.gkDistribution} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};