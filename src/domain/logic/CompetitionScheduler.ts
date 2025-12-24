import { RandomEngine } from "../../engine/RandomEngine";
import type { Match } from "../models";

export interface MatchPair {
  homeTeamId: number;
  awayTeamId: number;
  round: number;
  groupName?: string;
}

export interface GroupStageStructure {
  groups: Record<string, number[]>;
  fixtures: MatchPair[];
}

export interface GroupStanding {
  teamId: number;
  groupName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export class CompetitionScheduler {
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

  static generateGroupStageFixtures(
    teamIds: number[],
    groupSize: number = 4,
    doubleRound: boolean = true
  ): GroupStageStructure {
    if (teamIds.length % groupSize !== 0) {
      throw new Error(
        `Número de times (${teamIds.length}) deve ser divisível pelo tamanho do grupo (${groupSize})`
      );
    }

    const shuffledTeams = [...teamIds].sort(() => Math.random() - 0.5);

    const numberOfGroups = Math.floor(shuffledTeams.length / groupSize);
    const groupNames = this.generateGroupNames(numberOfGroups);

    const groups: Record<string, number[]> = {};
    const fixtures: MatchPair[] = [];

    for (let i = 0; i < numberOfGroups; i++) {
      const groupName = groupNames[i];
      const startIdx = i * groupSize;
      const groupTeams = shuffledTeams.slice(startIdx, startIdx + groupSize);
      groups[groupName] = groupTeams;

      const groupFixtures = this.generateRoundRobinForGroup(
        groupTeams,
        groupName,
        doubleRound
      );

      fixtures.push(...groupFixtures);
    }

    return { groups, fixtures };
  }

  private static generateGroupNames(count: number): string[] {
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      names.push(String.fromCharCode(65 + i));
    }
    return names;
  }

  private static generateRoundRobinForGroup(
    teamIds: number[],
    groupName: string,
    doubleRound: boolean
  ): MatchPair[] {
    const fixtures: MatchPair[] = [];
    const n = teamIds.length;
    const rounds = n - 1;

    const teams = [...teamIds];

    for (let round = 0; round < rounds; round++) {
      for (let i = 0; i < n / 2; i++) {
        const home = teams[i];
        const away = teams[n - 1 - i];

        fixtures.push({
          homeTeamId: home,
          awayTeamId: away,
          round: round + 1,
          groupName,
        });
      }

      teams.splice(1, 0, teams.pop()!);
    }

    if (doubleRound) {
      const returnFixtures = fixtures.map((match) => ({
        homeTeamId: match.awayTeamId,
        awayTeamId: match.homeTeamId,
        round: match.round + rounds,
        groupName: match.groupName,
      }));
      return [...fixtures, ...returnFixtures];
    }

    return fixtures;
  }

  static getGroupStageQualifiers(
    matches: Match[],
    groupStructure: Record<string, number[]>,
    qualifiersPerGroup: number = 2
  ): number[] {
    const standings = this.calculateGroupStandings(matches, groupStructure);

    const sortedGroups: Record<string, GroupStanding[]> = {};

    for (const groupName of Object.keys(groupStructure)) {
      const groupStandings = standings.filter((s) => s.groupName === groupName);

      groupStandings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference)
          return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      });

      sortedGroups[groupName] = groupStandings;
    }

    const qualifiers: number[] = [];

    for (let position = 0; position < qualifiersPerGroup; position++) {
      for (const groupName of Object.keys(sortedGroups).sort()) {
        const group = sortedGroups[groupName];
        if (group[position]) {
          qualifiers.push(group[position].teamId);
        }
      }
    }

    return qualifiers;
  }

  static calculateGroupStandings(
    matches: Match[],
    groupStructure: Record<string, number[]>
  ): GroupStanding[] {
    const standings: GroupStanding[] = [];

    for (const [groupName, teamIds] of Object.entries(groupStructure)) {
      for (const teamId of teamIds) {
        standings.push({
          teamId,
          groupName,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        });
      }
    }

    for (const match of matches) {
      if (
        !match.isPlayed ||
        match.homeScore === null ||
        match.awayScore === null
      ) {
        continue;
      }

      const homeStanding = standings.find((s) => s.teamId === match.homeTeamId);
      const awayStanding = standings.find((s) => s.teamId === match.awayTeamId);

      if (!homeStanding || !awayStanding) continue;

      homeStanding.played++;
      awayStanding.played++;

      homeStanding.goalsFor += match.homeScore;
      homeStanding.goalsAgainst += match.awayScore;
      awayStanding.goalsFor += match.awayScore;
      awayStanding.goalsAgainst += match.homeScore;

      if (match.homeScore > match.awayScore) {
        homeStanding.wins++;
        homeStanding.points += 3;
        awayStanding.losses++;
      } else if (match.homeScore < match.awayScore) {
        awayStanding.wins++;
        awayStanding.points += 3;
        homeStanding.losses++;
      } else {
        homeStanding.draws++;
        awayStanding.draws++;
        homeStanding.points++;
        awayStanding.points++;
      }

      homeStanding.goalDifference =
        homeStanding.goalsFor - homeStanding.goalsAgainst;
      awayStanding.goalDifference =
        awayStanding.goalsFor - awayStanding.goalsAgainst;
    }

    return standings;
  }

  static generateNextRoundPairings(
    completedMatches: Match[],
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
