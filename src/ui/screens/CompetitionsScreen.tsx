import React, { useMemo } from "react";
import { useGameStore } from "../../state/useGameStore";
import { Trophy } from "lucide-react";

export const CompetitionsScreen: React.FC = () => {
    const {
        meta,
        standings,
        clubCompetitionSeasons,
        clubs,
        competitionGroups
    } = useGameStore();

    const userClubId = meta.userClubId;

    const activeCompetitionData = useMemo(() => {
        if (!userClubId) return null;

        const userCcs = Object.values(clubCompetitionSeasons).find(
            ccs => ccs.clubId === userClubId
        );

        if (!userCcs) return null;

        const userStanding = Object.values(standings).find(
            s => s.clubCompetitionSeasonId === userCcs.id
        );

        if (!userStanding) return null;

        const groupId = userStanding.competitionGroupId;
        const group = competitionGroups[groupId];

        const groupStandings = Object.values(standings).filter(
            s => s.competitionGroupId === groupId
        );

        return {
            groupName: group?.name || "Liga Nacional",
            standings: groupStandings
        };
    }, [userClubId, standings, clubCompetitionSeasons, competitionGroups]);

    const tableData = useMemo(() => {
        if (!activeCompetitionData) return [];

        return activeCompetitionData.standings
            .map(standing => {
                const ccs = clubCompetitionSeasons[standing.clubCompetitionSeasonId];
                const club = clubs[ccs?.clubId];
                return {
                    ...standing,
                    clubName: club?.name || "Desconhecido",
                    clubId: club?.id,
                    isUser: club?.id === userClubId
                };
            })
            .sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.wins !== a.wins) return b.wins - a.wins;
                if (b.goalsBalance !== a.goalsBalance) return b.goalsBalance - a.goalsBalance;
                return b.goalsScored - a.goalsScored;
            });
    }, [activeCompetitionData, clubCompetitionSeasons, clubs, userClubId]);

    if (!activeCompetitionData) {
        return <div className="p-8 text-text-muted">Nenhuma competição ativa encontrada para o seu clube.</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center bg-background-secondary p-6 rounded-lg border border-background-tertiary shadow-sm">
                <div className="p-3 bg-primary/10 rounded-full mr-4 text-primary">
                    <Trophy size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">
                        {activeCompetitionData.groupName}
                    </h1>
                    <p className="text-text-secondary text-sm">
                        Temporada Atual
                    </p>
                </div>
            </div>

            <div className="bg-background-secondary rounded-lg border border-background-tertiary shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-background-tertiary/50 border-b border-background-tertiary text-text-secondary uppercase text-xs tracking-wider">
                                <th className="p-4 w-16 text-center">Pos</th>
                                <th className="p-4">Clube</th>
                                <th className="p-4 w-16 text-center" title="Jogos">J</th>
                                <th className="p-4 w-16 text-center" title="Vitórias">V</th>
                                <th className="p-4 w-16 text-center" title="Empates">E</th>
                                <th className="p-4 w-16 text-center" title="Derrotas">D</th>
                                <th className="p-4 w-16 text-center" title="Gols Pró">GP</th>
                                <th className="p-4 w-16 text-center" title="Gols Contra">GC</th>
                                <th className="p-4 w-16 text-center" title="Saldo de Gols">SG</th>
                                <th className="p-4 w-20 text-center font-bold text-text-primary">Pts</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-background-tertiary/30">
                            {tableData.map((row, index) => (
                                <tr
                                    key={row.id}
                                    className={`
                                        ${row.isUser ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-background-tertiary/20'} 
                                        transition-colors
                                    `}
                                >
                                    <td className="p-4 text-center font-medium text-text-secondary">
                                        {index + 1}º
                                    </td>
                                    <td className="p-4 font-medium text-text-primary">
                                        {row.clubName}
                                        {row.isUser && <span className="ml-2 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded">VOCÊ</span>}
                                    </td>
                                    <td className="p-4 text-center text-text-muted">{row.gamesPlayed}</td>
                                    <td className="p-4 text-center text-text-muted">{row.wins}</td>
                                    <td className="p-4 text-center text-text-muted">{row.draws}</td>
                                    <td className="p-4 text-center text-text-muted">{row.defeats}</td>
                                    <td className="p-4 text-center text-text-muted hidden md:table-cell">{row.goalsScored}</td>
                                    <td className="p-4 text-center text-text-muted hidden md:table-cell">{row.goalsConceded}</td>
                                    <td className={`p-4 text-center font-medium ${row.goalsBalance > 0 ? 'text-status-success' : row.goalsBalance < 0 ? 'text-status-danger' : 'text-text-muted'}`}>
                                        {row.goalsBalance > 0 ? `+${row.goalsBalance}` : row.goalsBalance}
                                    </td>
                                    <td className="p-4 text-center font-bold text-lg text-text-primary">
                                        {row.points}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};