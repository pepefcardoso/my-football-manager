import React from "react";
import { Eye } from "lucide-react";
import { ClubBadge } from "../ClubBadge";
import { TableRowData } from "../../hooks/useCompetitionData";

interface CompetitionTableProps {
  data: TableRowData[];
  onClubClick: (clubId: string) => void;
}

export const CompetitionTable: React.FC<CompetitionTableProps> = ({
  data,
  onClubClick,
}) => {
  return (
    <div className="overflow-auto custom-scrollbar flex-1">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-background-secondary z-10 shadow-sm">
          <tr className="border-b border-background-tertiary text-text-secondary uppercase text-xs tracking-wider">
            <th className="p-4 w-16 text-center">Pos</th>
            <th className="p-4">Clube</th>
            <th className="p-4 w-16 text-center" title="Jogos">J</th>
            <th className="p-4 w-16 text-center" title="Vitórias">V</th>
            <th className="p-4 w-16 text-center" title="Empates">E</th>
            <th className="p-4 w-16 text-center" title="Derrotas">D</th>
            <th className="p-4 w-16 text-center hidden md:table-cell" title="Gols Pró">GP</th>
            <th className="p-4 w-16 text-center hidden md:table-cell" title="Gols Contra">GC</th>
            <th className="p-4 w-16 text-center" title="Saldo de Gols">SG</th>
            <th className="p-4 w-20 text-center font-bold text-text-primary">Pts</th>
            <th className="p-4 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-background-tertiary/30">
          {data.map((row, index) => (
            <tr
              key={row.id}
              onClick={() => row.clubId && onClubClick(row.clubId)}
              className={`
                cursor-pointer transition-all duration-200 group
                ${
                  row.isUser
                    ? "bg-primary/5 hover:bg-primary/10 border-l-4 border-l-primary"
                    : "hover:bg-background-tertiary/30 border-l-4 border-l-transparent"
                } 
              `}
            >
              <td className="p-4 text-center font-medium text-text-secondary">
                {index + 1}º
              </td>
              <td className="p-4 font-medium text-text-primary flex items-center">
                <div className="w-6 h-6 mr-3">
                  <ClubBadge
                    badgeId={row.clubBadgeId}
                    clubName={row.clubName}
                    className="w-full h-full"
                    size="sm"
                  />
                </div>
                {row.clubName}
                {row.isUser && (
                  <span className="ml-2 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded shadow-sm">
                    VOCÊ
                  </span>
                )}
              </td>
              <td className="p-4 text-center text-text-muted">{row.gamesPlayed}</td>
              <td className="p-4 text-center text-text-muted">{row.wins}</td>
              <td className="p-4 text-center text-text-muted">{row.draws}</td>
              <td className="p-4 text-center text-text-muted">{row.defeats}</td>
              <td className="p-4 text-center text-text-muted hidden md:table-cell">
                {row.goalsScored}
              </td>
              <td className="p-4 text-center text-text-muted hidden md:table-cell">
                {row.goalsConceded}
              </td>
              <td
                className={`p-4 text-center font-medium ${
                  row.goalsBalance > 0
                    ? "text-status-success"
                    : row.goalsBalance < 0
                    ? "text-status-danger"
                    : "text-text-muted"
                }`}
              >
                {row.goalsBalance > 0 ? `+${row.goalsBalance}` : row.goalsBalance}
              </td>
              <td className="p-4 text-center font-bold text-lg text-text-primary">
                {row.points}
              </td>
              <td className="p-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Eye size={16} className="text-text-muted hover:text-primary" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};