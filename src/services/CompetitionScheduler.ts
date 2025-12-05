import { RandomEngine } from "../engine/RandomEngine";
import type { MatchSelect } from "../repositories/MatchRepository";

export interface MatchPair {
  homeTeamId: number;
  awayTeamId: number;
  round: number;
}

export class CompetitionScheduler {
  /**
   * Algoritmo Round-Robin (Todos contra todos)
   * Usa o método do "Círculo" para rotacionar os times.
   */
  static generateLeagueFixtures(
    teamIds: number[],
    doubleRound: boolean = true
  ): MatchPair[] {
    if (teamIds.length % 2 !== 0) {
      teamIds.push(-1);
    }

    const numTeams = teamIds.length;
    const numRounds = numTeams - 1;
    const halfSize = numTeams / 2;
    const fixtures: MatchPair[] = [];

    const teams = [...teamIds];

    for (let round = 0; round < numRounds; round++) {
      for (let i = 0; i < halfSize; i++) {
        const teamA = teams[i];
        const teamB = teams[numTeams - 1 - i];

        if (teamA !== -1 && teamB !== -1) {
          if (round % 2 === 0) {
            fixtures.push({
              homeTeamId: teamA,
              awayTeamId: teamB,
              round: round + 1,
            });
          } else {
            fixtures.push({
              homeTeamId: teamB,
              awayTeamId: teamA,
              round: round + 1,
            });
          }
        }
      }

      teams.splice(1, 0, teams.pop()!);
    }

    if (doubleRound) {
      const returnLegs = fixtures.map((match) => ({
        homeTeamId: match.awayTeamId,
        awayTeamId: match.homeTeamId,
        round: match.round + numRounds,
      }));
      return [...fixtures, ...returnLegs];
    }

    return fixtures;
  }

  /**
   * Gera confrontos de Mata-mata (Sorteio Simples)
   */
  static generateKnockoutPairings(
    teamIds: number[],
    roundNumber: number
  ): MatchPair[] {
    const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
    const fixtures: MatchPair[] = [];

    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        fixtures.push({
          homeTeamId: shuffled[i],
          awayTeamId: shuffled[i + 1],
          round: roundNumber,
        });
      }
    }
    return fixtures;
  }

  /**
   * Gera os confrontos da próxima fase baseados nos vencedores da fase anterior.
   * Assume jogo único. Se houve empate, simula um vencedor (pênaltis técnicos).
   */
  static generateNextRoundPairings(
    completedMatches: MatchSelect[],
    nextRoundNumber: number
  ): MatchPair[] {
    const winners: number[] = [];

    for (const match of completedMatches) {
      if (match.homeScore === null || match.awayScore === null) continue;

      if (match.homeScore > match.awayScore) {
        winners.push(match.homeTeamId!);
      } else if (match.awayScore > match.homeScore) {
        winners.push(match.awayTeamId!);
      } else {
        const homeWin = RandomEngine.chance(50);
        winners.push(homeWin ? match.homeTeamId! : match.awayTeamId!);
      }
    }

    const fixtures: MatchPair[] = [];
    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        fixtures.push({
          homeTeamId: winners[i],
          awayTeamId: winners[i + 1],
          round: nextRoundNumber,
        });
      }
    }

    return fixtures;
  }
}
