import { memo } from "react";
import type { Player } from "../../../domain/models";
import { formatCurrency } from "../../../utils/formatters";
import { getEnergyColorClass, getMoralColorClass, getPositionVariant } from "../../../utils/styleHelpers";
import Badge from "../../common/Badge";
import { EmptyState } from "../../common/EmptyState";

interface PlayerTableProps {
  players: Player[];
}

interface ProgressBarProps {
  value: number;
  label: string;
  colorClass: string;
}

const ProgressBar = ({ value, label, colorClass }: ProgressBarProps) => (
  <div className="flex items-center gap-2">
    <div
      className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full transition-all duration-300 ${colorClass}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  </div>
);

const PlayerStatusBadges = ({ player }: { player: Player }) => {
  const hasInjury = player.isInjured;
  const hasSuspension = player.suspensionGamesRemaining > 0;
  const isAvailable = !hasInjury && !hasSuspension;

  return (
    <div
      className="flex justify-center gap-1"
      role="group"
      aria-label="Status do jogador"
    >
      {hasInjury && (
        <Badge variant="danger" title="Jogador lesionado">
          LES
        </Badge>
      )}
      {hasSuspension && (
        <Badge
          variant="danger"
          title={`Suspenso por ${player.suspensionGamesRemaining} jogo(s)`}
        >
          SUS
        </Badge>
      )}
      {player.isYouth && (
        <Badge variant="info" title="Jogador da categoria de base">
          BASE
        </Badge>
      )}
      {isAvailable && (
        <Badge variant="success" title="Jogador disponível">
          OK
        </Badge>
      )}
    </div>
  );
};

const PlayerRow = ({ player }: { player: Player }) => {
  const fullName = `${player.firstName} ${player.lastName}`;
  const energyColor = getEnergyColorClass(player.energy);
  const moralColor = getMoralColorClass(player.moral);
  const positionVariant = getPositionVariant(player.position);

  return (
    <tr className="hover:bg-slate-800/50 transition-colors group">
      <td className="p-4 font-medium text-slate-200">
        <div className="flex items-center gap-2">
          <span>{fullName}</span>
          {player.isCaptain && (
            <span
              className="text-yellow-500 text-sm font-bold"
              title="Capitão da equipa"
              aria-label="Capitão"
            >
              ©
            </span>
          )}
        </div>
      </td>

      <td className="p-4">
        <Badge variant={positionVariant}>
          {player.position}
        </Badge>
      </td>

      <td className="p-4 text-center text-slate-400">{player.age}</td>

      <td className="p-4 text-center">
        <span
          className="inline-block px-2 py-0.5 rounded bg-slate-800 font-bold text-white text-xs border border-slate-700"
          aria-label={`Overall: ${player.overall}`}
        >
          {player.overall}
        </span>
      </td>

      <td className="p-4 text-center text-slate-400 opacity-70">
        <span aria-label={`Potencial: ${player.potential}`}>
          {player.potential}
        </span>
      </td>

      <td className="p-4">
        <div className="flex flex-col gap-1.5">
          <ProgressBar
            value={player.energy}
            label="Energia"
            colorClass={energyColor}
          />
          <ProgressBar
            value={player.fitness}
            label="Forma Física"
            colorClass="bg-blue-500"
          />
        </div>
      </td>

      <td className="p-4 text-center">
        <span
          className={`font-semibold ${moralColor}`}
          aria-label={`Moral: ${player.moral}%`}
        >
          {player.moral}%
        </span>
      </td>

      <td className="p-4 text-right text-slate-300 font-mono text-xs">
        <span aria-label={`Salário: ${formatCurrency(0)}`}>
          {formatCurrency(0)}
        </span>
      </td>

      <td className="p-4 text-center">
        <PlayerStatusBadges player={player} />
      </td>
    </tr>
  );
};

function PlayerTable({ players }: PlayerTableProps) {
  if (players.length === 0) {
    return (
      <div className="bg-slate-900/50 rounded-lg border border-slate-800">
        <EmptyState
          icon={<span className="text-4xl">🏃</span>}
          title="Nenhum jogador encontrado"
          description="A equipa não possui jogadores registados com os filtros atuais."
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-900 text-xs uppercase font-semibold text-slate-400">
          <tr>
            <th scope="col" className="p-4 min-w-[200px]">Nome</th>
            <th scope="col" className="p-4 min-w-[60px]">Pos</th>
            <th scope="col" className="p-4 text-center min-w-[70px]">Idade</th>
            <th scope="col" className="p-4 text-center min-w-[70px]">
              <abbr title="Overall - Qualidade Geral">OVR</abbr>
            </th>
            <th scope="col" className="p-4 text-center min-w-[70px]">
              <abbr title="Potencial">POT</abbr>
            </th>
            <th scope="col" className="p-4 min-w-[140px]">Condição</th>
            <th scope="col" className="p-4 text-center min-w-[80px]">Moral</th>
            <th scope="col" className="p-4 text-right min-w-[120px]">Salário</th>
            <th scope="col" className="p-4 text-center min-w-[120px]">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {players.map((player) => (
            <PlayerRow key={player.id} player={player} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(PlayerTable);