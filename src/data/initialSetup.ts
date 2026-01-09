import { v4 as uuidv4 } from "uuid";
import { GameState } from "../core/models/gameState";
import { Nation } from "../core/models/geo";
import { Contract } from "../core/models/contract";
import { ClubFactory, PlayerFactory } from "../core/utils/generators";
import { ClubCompetitionSeason } from "../core/models/competition";
import { logger } from "../core/utils/Logger";

const BRAZIL_CLUBS_DATA = [
  {
    name: "Flamengo",
    reputation: 9500,
    colors: { primary: "#C4161C", secondary: "#000000" },
    badgeId: "fla",
  },
  {
    name: "Palmeiras",
    reputation: 9400,
    colors: { primary: "#006437", secondary: "#FFFFFF" },
    badgeId: "pal",
  },
  {
    name: "Atlético-MG",
    reputation: 8700,
    colors: { primary: "#000000", secondary: "#FFFFFF" },
    badgeId: "cam",
  },
  {
    name: "São Paulo",
    reputation: 8800,
    colors: { primary: "#C4161C", secondary: "#FFFFFF" },
    badgeId: "sao",
  },
  {
    name: "Fluminense",
    reputation: 8200,
    colors: { primary: "#8A1325", secondary: "#054F33" },
    badgeId: "flu",
  },
  {
    name: "Grêmio",
    reputation: 8300,
    colors: { primary: "#0D80BF", secondary: "#000000" },
    badgeId: "gre",
  },
  {
    name: "Red Bull Bragantino",
    reputation: 7400,
    colors: { primary: "#FFFFFF", secondary: "#C4161C" },
    badgeId: "rbb",
  },
  {
    name: "Athletico-PR",
    reputation: 7700,
    colors: { primary: "#C4161C", secondary: "#000000" },
    badgeId: "cap",
  },
  {
    name: "Botafogo",
    reputation: 8100,
    colors: { primary: "#000000", secondary: "#FFFFFF" },
    badgeId: "bot",
  },
  {
    name: "Internacional",
    reputation: 8400,
    colors: { primary: "#C4161C", secondary: "#FFFFFF" },
    badgeId: "int",
  },
  {
    name: "Fortaleza",
    reputation: 7600,
    colors: { primary: "#103176", secondary: "#C4161C" },
    badgeId: "for",
  },
  {
    name: "Corinthians",
    reputation: 8600,
    colors: { primary: "#FFFFFF", secondary: "#000000" },
    badgeId: "cor",
  },
  {
    name: "Cruzeiro",
    reputation: 7900,
    colors: { primary: "#00479C", secondary: "#FFFFFF" },
    badgeId: "cru",
  },
  {
    name: "Vasco da Gama",
    reputation: 7800,
    colors: { primary: "#000000", secondary: "#FFFFFF" },
    badgeId: "vas",
  },
  {
    name: "Bahia",
    reputation: 7500,
    colors: { primary: "#005BAA", secondary: "#C4161C" },
    badgeId: "bah",
  },
  {
    name: "Santos",
    reputation: 8000,
    colors: { primary: "#FFFFFF", secondary: "#000000" },
    badgeId: "san",
  },
  {
    name: "Sport",
    reputation: 7000,
    colors: { primary: "#C4161C", secondary: "#000000" },
    badgeId: "spt",
  },
  {
    name: "Ceará",
    reputation: 7100,
    colors: { primary: "#000000", secondary: "#FFFFFF" },
    badgeId: "cea",
  },
  {
    name: "Vitória",
    reputation: 6900,
    colors: { primary: "#C4161C", secondary: "#000000" },
    badgeId: "vit",
  },
  {
    name: "Juventude",
    reputation: 6800,
    colors: { primary: "#006437", secondary: "#FFFFFF" },
    badgeId: "juv",
  },
];

const createEmptyState = (): GameState => ({
  meta: {
    version: "2.0.0",
    saveName: "New Game",
    currentDate: Date.now(),
    currentUserManagerId: "",
    userClubId: null,
    activeSeasonId: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  people: {
    managers: {},
    players: {},
    staff: {},
    playerStates: {},
    playerInjuries: {},
    playerSecondaryPositions: {},
  },
  clubs: {
    clubs: {},
    infras: {},
    finances: {},
    relationships: {},
    rivalries: {},
    stadiums: {},
    sponsorships: {},
  },
  competitions: {
    seasons: {},
    competitions: {},
    competitionSeasons: {},
    clubCompetitionSeasons: {},
    fases: {},
    groups: {},
    standings: {},
    standingsLookup: {},
    rules: {
      classification: {},
      prizes: {},
    },
  },
  matches: {
    matches: {},
    events: {},
    playerStats: {},
    formations: {},
    positions: {},
    teamTactics: {},
    tempLineup: null,
  },
  market: {
    contracts: {},
    staffContracts: {},
    clubManagers: {},
    transferOffers: {},
    loans: {},
    scoutingKnowledge: {},
    playerContractIndex: {},
    clubSquadIndex: {},
  },
  world: {
    nations: {},
    cities: {},
  },
  system: {
    news: {},
    notifications: {},
    scheduledEvents: {},
    financialEntries: {},
    stats: {
      playerSeason: {},
    },
  },
});

const generateRoundRobinSchedule = (
  teamIds: string[]
): { round: number; matches: { home: string; away: string }[] }[] => {
  const n = teamIds.length;
  const rounds: { round: number; matches: { home: string; away: string }[] }[] =
    [];
  const teams = [...teamIds];

  if (n % 2 !== 0) teams.push("bye");

  const numRounds = teams.length - 1;
  const halfSize = teams.length / 2;

  for (let r = 0; r < numRounds; r++) {
    const roundMatches: { home: string; away: string }[] = [];

    for (let i = 0; i < halfSize; i++) {
      const home = teams[i];
      const away = teams[teams.length - 1 - i];

      if (r % 2 === 0) {
        roundMatches.push({ home, away });
      } else {
        roundMatches.push({ home: away, away: home });
      }
    }

    rounds.push({ round: r + 1, matches: roundMatches });

    const rotated = teams.slice(1);
    const last = rotated.pop();
    if (last) rotated.unshift(last);
    teams.splice(1, teams.length - 1, ...rotated);
  }

  const returnRounds = rounds.map((r) => ({
    round: r.round + numRounds,
    matches: r.matches.map((m) => ({ home: m.away, away: m.home })),
  }));

  return [...rounds, ...returnRounds];
};

export const createNewGame = (): GameState => {
  return logger.time("InitialSetup", "Criação de Novo Jogo", () => {
    logger.info(
      "InitialSetup",
      "🚀 Iniciando processo de geração procedural..."
    );

    const state = createEmptyState();

    const brazilId = uuidv4();
    const brazil: Nation = { id: brazilId, name: "Brasil" };
    state.world.nations[brazilId] = brazil;

    let firstClubId = "";
    let totalPlayers = 0;
    const createdClubIds: string[] = [];

    BRAZIL_CLUBS_DATA.forEach((clubData, index) => {
      const bundle = ClubFactory.createClub(
        clubData.name,
        brazilId,
        clubData.reputation,
        clubData.colors,
        clubData.badgeId
      );

      if (index === 0) firstClubId = bundle.club.id;
      createdClubIds.push(bundle.club.id);

      state.clubs.clubs[bundle.club.id] = bundle.club;
      state.clubs.infras[bundle.club.id] = bundle.infra;
      state.clubs.finances[bundle.club.id] = bundle.finances;

      bundle.players.forEach((player) => {
        state.people.players[player.id] = player;
        totalPlayers++;

        const wage = PlayerFactory.calculateWage(70);
        const contractId = uuidv4();
        const contract: Contract = {
          id: contractId,
          playerId: player.id,
          clubId: bundle.club.id,
          startDate: state.meta.currentDate,
          endDate:
            state.meta.currentDate +
            Math.floor(Math.random() * 4 + 1) * 31536000000,
          monthlyWage: wage,
          releaseClause: player.marketValue * 1.5,
          isLoaned: false,
          active: true,
        };

        state.market.contracts[contractId] = contract;

        state.market.playerContractIndex[player.id] = contractId;
        if (!state.market.clubSquadIndex[bundle.club.id]) {
          state.market.clubSquadIndex[bundle.club.id] = [];
        }
        state.market.clubSquadIndex[bundle.club.id].push(player.id);

        state.people.playerStates[player.id] = {
          playerId: player.id,
          fitness: 100,
          morale: 80,
          matchReadiness: 100,
        };
      });
    });

    const currentYear = new Date().getFullYear();
    const seasonId = uuidv4();
    const competitionId = uuidv4();
    const compSeasonId = uuidv4();
    const faseId = uuidv4();
    const groupId = uuidv4();

    state.competitions.seasons[seasonId] = {
      id: seasonId,
      year: currentYear,
      beginning: state.meta.currentDate,
      ending: state.meta.currentDate + 1000 * 60 * 60 * 24 * 30 * 10,
      active: true,
    };
    state.meta.activeSeasonId = seasonId;

    state.competitions.competitions[competitionId] = {
      id: competitionId,
      name: "Brasileirão Série A",
      nickname: "Brasileirão",
      type: "LEAGUE",
      hierarchyLevel: 1,
      standardFormatType: "LEAGUE",
      standingsPriority: "POINTS",
    };

    state.competitions.competitionSeasons[compSeasonId] = {
      id: compSeasonId,
      competitionId,
      seasonId,
      tieBreakingCriteria1: "WINS",
      tieBreakingCriteria2: "GOAL_DIFFERENCE",
      tieBreakingCriteria3: "GOALS_SCORED",
      tieBreakingCriteria4: "HEAD_TO_HEAD",
    };

    state.competitions.fases[faseId] = {
      id: faseId,
      competitionSeasonId: compSeasonId,
      name: "Temporada Regular",
      orderIndex: 1,
      type: "LEAGUE",
      isTwoLeggedKnockout: false,
      isFinalSingleGame: false,
    };

    state.competitions.groups[groupId] = {
      id: groupId,
      competitionFaseId: faseId,
      name: "Série A",
    };

    createdClubIds.forEach((clubId) => {
      const ccsId = uuidv4();
      const ccs: ClubCompetitionSeason = {
        id: ccsId,
        competitionSeasonId: compSeasonId,
        clubId: clubId,
      };
      state.competitions.clubCompetitionSeasons[ccsId] = ccs;

      const standingId = uuidv4();
      state.competitions.standings[standingId] = {
        id: standingId,
        competitionGroupId: groupId,
        clubCompetitionSeasonId: ccsId,
        points: 0,
        gamesPlayed: 0,
        wins: 0,
        draws: 0,
        defeats: 0,
        goalsScored: 0,
        goalsConceded: 0,
        goalsBalance: 0,
      };

      const lookupKey = `${groupId}_${clubId}`;
      state.competitions.standingsLookup[lookupKey] = standingId;
    });

    const schedule = generateRoundRobinSchedule(createdClubIds);
    const ONE_DAY = 24 * 60 * 60 * 1000;

    const roundDate = new Date();
    roundDate.setDate(roundDate.getDate() + ((7 - roundDate.getDay()) % 7));
    roundDate.setHours(16, 0, 0, 0);

    schedule.forEach((roundData) => {
      const isWednesday = roundDate.getDay() === 3;
      roundDate.setTime(roundDate.getTime() + (isWednesday ? 4 : 3) * ONE_DAY);

      if (roundDate.getTime() <= state.meta.currentDate) {
        roundDate.setTime(state.meta.currentDate + ONE_DAY);
      }

      roundData.matches.forEach((matchPair) => {
        const matchId = uuidv4();

        const matchTime = new Date(roundDate);
        if (Math.random() > 0.7) matchTime.setHours(20, 0, 0, 0);

        state.matches.matches[matchId] = {
          id: matchId,
          competitionGroupId: groupId,
          stadiumId: state.clubs.infras[matchPair.home].stadiumId,
          homeClubId: matchPair.home,
          awayClubId: matchPair.away,
          homeGoals: 0,
          awayGoals: 0,
          homePenalties: null,
          awayPenalties: null,
          roundNumber: roundData.round,
          datetime: matchTime.getTime(),
          status: "SCHEDULED",
          attendance: 0,
          ticketRevenue: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      });
    });

    const humanManagerId = uuidv4();
    const userClubId = firstClubId;

    state.people.managers[humanManagerId] = {
      id: humanManagerId,
      name: "Treinador (Você)",
      nationId: brazilId,
      birthDate: Date.now() - 946080000000,
      isHuman: true,
      reputation: 5000,
      careerHistory: [],
      titles: [],
      preferredStyle: "ATTACKING",
      preferredFormation: "4-3-3",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    state.meta.currentUserManagerId = humanManagerId;
    state.meta.userClubId = userClubId;
    state.meta.saveName = "Novo Jogo - Brasileiro";

    logger.info("InitialSetup", "Geração de Entidades Concluída", {
      clubs: Object.keys(state.clubs.clubs).length,
      players: totalPlayers,
      competitions: Object.keys(state.competitions.competitions).length,
      matches: Object.keys(state.matches.matches).length,
    });

    return state;
  });
};
