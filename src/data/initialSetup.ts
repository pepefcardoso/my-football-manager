import { v4 as uuidv4 } from "uuid";
import { GameState } from "../core/models/gameState";
import { Nation } from "../core/models/geo";
import { Contract } from "../core/models/contract";
import { ClubFactory, PlayerFactory, rng } from "../core/utils/generators";
import {
  ClubCompetitionSeason,
} from "../core/models/competition";

const BRAZIL_CLUBS_DATA = [
  {
    name: "Flamengo",
    reputation: 9500,
    colors: { primary: "#C4161C", secondary: "#000000" },
    badgeId: "/badges/fla.png",
  },
  {
    name: "Palmeiras",
    reputation: 9400,
    colors: { primary: "#006437", secondary: "#FFFFFF" },
    badgeId: "/badges/pal.png",
  },
  {
    name: "Atlético-MG",
    reputation: 8700,
    colors: { primary: "#000000", secondary: "#FFFFFF" },
    badgeId: "/badges/cam.png",
  },
  {
    name: "São Paulo",
    reputation: 8800,
    colors: { primary: "#C4161C", secondary: "#FFFFFF" },
    badgeId: "/badges/sao.png",
  },
  {
    name: "Fluminense",
    reputation: 8200,
    colors: { primary: "#8A1325", secondary: "#054F33" },
    badgeId: "/badges/flu.png",
  },
  {
    name: "Grêmio",
    reputation: 8300,
    colors: { primary: "#0D80BF", secondary: "#000000" },
    badgeId: "/badges/gre.png",
  },
  {
    name: "Red Bull Bragantino",
    reputation: 7400,
    colors: { primary: "#FFFFFF", secondary: "#C4161C" },
    badgeId: "/badges/rbb.png",
  },
  {
    name: "Athletico-PR",
    reputation: 7700,
    colors: { primary: "#C4161C", secondary: "#000000" },
    badgeId: "/badges/cap.png",
  },
  {
    name: "Botafogo",
    reputation: 8100,
    colors: { primary: "#000000", secondary: "#FFFFFF" },
    badgeId: "/badges/bot.png",
  },
  {
    name: "Internacional",
    reputation: 8400,
    colors: { primary: "#C4161C", secondary: "#FFFFFF" },
    badgeId: "/badges/int.png",
  },
  {
    name: "Fortaleza",
    reputation: 7600,
    colors: { primary: "#103176", secondary: "#C4161C" },
    badgeId: "/badges/for.png",
  },
  {
    name: "Corinthians",
    reputation: 8600,
    colors: { primary: "#FFFFFF", secondary: "#000000" },
    badgeId: "/badges/cor.png",
  },
  {
    name: "Cruzeiro",
    reputation: 7900,
    colors: { primary: "#00479C", secondary: "#FFFFFF" },
    badgeId: "/badges/cru.png",
  },
  {
    name: "Vasco da Gama",
    reputation: 7800,
    colors: { primary: "#000000", secondary: "#FFFFFF" },
    badgeId: "/badges/vas.png",
  },
  {
    name: "Bahia",
    reputation: 7500,
    colors: { primary: "#005BAA", secondary: "#C4161C" },
    badgeId: "/badges/bah.png",
  },
  {
    name: "Santos",
    reputation: 8000,
    colors: { primary: "#FFFFFF", secondary: "#000000" },
    badgeId: "/badges/san.png",
  },
  {
    name: "Sport",
    reputation: 7000,
    colors: { primary: "#C4161C", secondary: "#000000" },
    badgeId: "/badges/spt.png",
  },
  {
    name: "Ceará",
    reputation: 7100,
    colors: { primary: "#000000", secondary: "#FFFFFF" },
    badgeId: "/badges/cea.png",
  },
  {
    name: "Vitória",
    reputation: 6900,
    colors: { primary: "#C4161C", secondary: "#000000" },
    badgeId: "/badges/vit.png",
  },
  {
    name: "Juventude",
    reputation: 6800,
    colors: { primary: "#006437", secondary: "#FFFFFF" },
    badgeId: "/badges/juv.png",
  },
];

const createEmptyState = (): GameState => ({
  meta: {
    version: "1.0.0",
    saveName: "New Game",
    currentDate: Date.now(),
    currentUserManagerId: "",
    userClubId: null,
    activeSeasonId: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  managers: {},
  players: {},
  staff: {},
  scoutingKnowledge: {},
  clubs: {},
  clubInfras: {},
  clubFinances: {},
  clubRelationships: {},
  clubRivalries: {},
  financialEntries: {},
  stadiums: {},
  sponsorships: {},
  nations: {},
  cities: {},
  seasons: {},
  competitions: {},
  competitionSeasons: {},
  clubCompetitionSeasons: {},
  competitionFases: {},
  competitionGroups: {},
  classificationRules: {},
  prizeRules: {},
  standings: {},
  matches: {},
  matchEvents: {},
  contracts: {},
  clubManagers: {},
  staffContracts: {},
  transferOffers: {},
  playerLoans: {},
  playerStates: {},
  playerInjuries: {},
  playerSeasonStats: {},
  playerMatchStats: {},
  playerSecondaryPositions: {},
  formations: {},
  positions: {},
  teamTactics: {},
  news: {},
  scheduledEvents: {},
  gameEvents: {},
  notifications: {},
});

export const createNewGame = (): GameState => {
  console.log("🚀 Iniciando criação de Novo Jogo...");
  const state = createEmptyState();
  const startTime = Date.now();

  const brazilId = uuidv4();
  const brazil: Nation = { id: brazilId, name: "Brasil" };
  state.nations[brazilId] = brazil;

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

    state.clubs[bundle.club.id] = bundle.club;
    state.clubInfras[bundle.club.id] = bundle.infra;
    state.clubFinances[bundle.club.id] = bundle.finances;

    bundle.players.forEach((player) => {
      state.players[player.id] = player;
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
      state.contracts[contractId] = contract;

      state.playerStates[player.id] = {
        playerId: player.id,
        fitness: 100,
        morale: 80,
        matchReadiness: 100,
      };
    });
  });

  const seasonId = uuidv4();
  const competitionId = uuidv4();
  const compSeasonId = uuidv4();
  const faseId = uuidv4();
  const groupId = uuidv4();

  const currentYear = new Date().getFullYear();

  state.seasons[seasonId] = {
    id: seasonId,
    year: currentYear,
    beginning: state.meta.currentDate,
    ending: state.meta.currentDate + 1000 * 60 * 60 * 24 * 30 * 6,
    active: true,
  };
  state.meta.activeSeasonId = seasonId;

  state.competitions[competitionId] = {
    id: competitionId,
    name: "Brasileirão Série A",
    nickname: "Brasileirão",
    type: "LEAGUE",
    hierarchyLevel: 1,
    standardFormatType: "LEAGUE",
    standingsPriority: "POINTS",
  };

  state.competitionSeasons[compSeasonId] = {
    id: compSeasonId,
    competitionId,
    seasonId,
    tieBreakingCriteria1: "WINS",
    tieBreakingCriteria2: "GOAL_DIFFERENCE",
    tieBreakingCriteria3: "GOALS_SCORED",
    tieBreakingCriteria4: "HEAD_TO_HEAD",
  };

  state.competitionFases[faseId] = {
    id: faseId,
    competitionSeasonId: compSeasonId,
    name: "Temporada Regular",
    orderIndex: 1,
    type: "LEAGUE",
    isTwoLeggedKnockout: false,
    isFinalSingleGame: false,
  };

  state.competitionGroups[groupId] = {
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
    state.clubCompetitionSeasons[ccsId] = ccs;

    const standingId = uuidv4();
    state.standings[standingId] = {
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
  });

  const ONE_DAY = 24 * 60 * 60 * 1000;

  for (let i = 0; i < 5; i++) {
    const clubsShuffled = [...createdClubIds].sort(() => 0.5 - Math.random());

    for (let j = 0; j < clubsShuffled.length; j += 2) {
      if (j + 1 >= clubsShuffled.length) break;

      const homeId = clubsShuffled[j];
      const awayId = clubsShuffled[j + 1];
      const matchId = uuidv4();

      const homeGoals = Math.floor(rng.normal(1.5, 1));
      const awayGoals = Math.floor(rng.normal(1.0, 1));
      const finalHome = Math.max(0, homeGoals);
      const finalAway = Math.max(0, awayGoals);

      const matchDate = state.meta.currentDate - (5 - i) * ONE_DAY * 7;

      state.matches[matchId] = {
        id: matchId,
        competitionGroupId: groupId,
        stadiumId: state.clubInfras[homeId].stadiumId,
        homeClubId: homeId,
        awayClubId: awayId,
        homeGoals: finalHome,
        awayGoals: finalAway,
        homePenalties: null,
        awayPenalties: null,
        roundNumber: i + 1,
        datetime: matchDate,
        status: "FINISHED",
        attendance: rng.range(10000, 50000),
        ticketRevenue: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const updateStanding = (cId: string, gp: number, gc: number) => {
        const s = Object.values(state.standings).find((st) => {
          const ccs = state.clubCompetitionSeasons[st.clubCompetitionSeasonId];
          return ccs.clubId === cId;
        });
        if (s) {
          s.gamesPlayed++;
          s.goalsScored += gp;
          s.goalsConceded += gc;
          s.goalsBalance += gp - gc;
          if (gp > gc) {
            s.wins++;
            s.points += 3;
          } else if (gp === gc) {
            s.draws++;
            s.points += 1;
          } else {
            s.defeats++;
          }
        }
      };

      updateStanding(homeId, finalHome, finalAway);
      updateStanding(awayId, finalAway, finalHome);
    }
  }

  for (let i = 0; i < 3; i++) {
    const clubsShuffled = [...createdClubIds].sort(() => 0.5 - Math.random());
    for (let j = 0; j < clubsShuffled.length; j += 2) {
      if (j + 1 >= clubsShuffled.length) break;
      const homeId = clubsShuffled[j];
      const awayId = clubsShuffled[j + 1];
      const matchId = uuidv4();

      const matchDate = state.meta.currentDate + (i + 1) * ONE_DAY * 3;

      state.matches[matchId] = {
        id: matchId,
        competitionGroupId: groupId,
        stadiumId: state.clubInfras[homeId].stadiumId,
        homeClubId: homeId,
        awayClubId: awayId,
        homeGoals: 0,
        awayGoals: 0,
        homePenalties: null,
        awayPenalties: null,
        roundNumber: 6 + i,
        datetime: matchDate,
        status: "SCHEDULED",
        attendance: 0,
        ticketRevenue: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }
  }

  const humanManagerId = uuidv4();
  const userClubId = firstClubId;

  state.managers[humanManagerId] = {
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

  const endTime = Date.now();
  console.log(
    `✅ Novo Jogo Criado em ${endTime - startTime}ms\n` +
      `   - Clubes: ${Object.keys(state.clubs).length}\n` +
      `   - Jogadores: ${totalPlayers}\n` +
      `   - Competições: ${Object.keys(state.competitions).length}\n` +
      `   - Partidas Geradas: ${Object.keys(state.matches).length}`
  );

  return state;
};
