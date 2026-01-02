import { v4 as uuidv4 } from "uuid";
import { GameState } from "../core/models/gameState";
import { Nation } from "../core/models/geo";
import { Contract } from "../core/models/contract";
import { ClubFactory, PlayerFactory } from "../core/utils/generators";

const BRAZIL_CLUBS_DATA = [
  {
    name: "Flamengo",
    reputation: 9500,
    colors: { primary: "#C4161C", secondary: "#000000" },
    badge: "/badges/fla.png",
  },
  {
    name: "Palmeiras",
    reputation: 9400,
    colors: { primary: "#006437", secondary: "#FFFFFF" },
    badge: "/badges/pal.png",
  },
  {
    name: "Atlético-MG",
    reputation: 8700,
    colors: { primary: "#000000", secondary: "#FFFFFF" },
    badge: "/badges/cam.png",
  },
  {
    name: "São Paulo",
    reputation: 8800,
    colors: { primary: "#C4161C", secondary: "#FFFFFF" },
    badge: "/badges/sao.png",
  },
  {
    name: "Fluminense",
    reputation: 8200,
    colors: { primary: "#8A1325", secondary: "#054F33" },
    badge: "/badges/flu.png",
  },
  {
    name: "Grêmio",
    reputation: 8300,
    colors: { primary: "#0D80BF", secondary: "#000000" },
    badge: "/badges/gre.png",
  },
  {
    name: "Red Bull Bragantino",
    reputation: 7400,
    colors: { primary: "#FFFFFF", secondary: "#C4161C" },
    badge: "/badges/rbb.png",
  },
  {
    name: "Athletico-PR",
    reputation: 7700,
    colors: { primary: "#C4161C", secondary: "#000000" },
    badge: "/badges/cap.png",
  },
  {
    name: "Botafogo",
    reputation: 8100,
    colors: { primary: "#000000", secondary: "#FFFFFF" },
    badge: "/badges/bot.png",
  },
  {
    name: "Internacional",
    reputation: 8400,
    colors: { primary: "#C4161C", secondary: "#FFFFFF" },
    badge: "/badges/int.png",
  },
  {
    name: "Fortaleza",
    reputation: 7600,
    colors: { primary: "#103176", secondary: "#C4161C" },
    badge: "/badges/for.png",
  },
  {
    name: "Corinthians",
    reputation: 8600,
    colors: { primary: "#FFFFFF", secondary: "#000000" },
    badge: "/badges/cor.png",
  },
  {
    name: "Cruzeiro",
    reputation: 7900,
    colors: { primary: "#00479C", secondary: "#FFFFFF" },
    badge: "/badges/cru.png",
  },
  {
    name: "Vasco da Gama",
    reputation: 7800,
    colors: { primary: "#000000", secondary: "#FFFFFF" },
    badge: "/badges/vas.png",
  },
  {
    name: "Bahia",
    reputation: 7500,
    colors: { primary: "#005BAA", secondary: "#C4161C" },
    badge: "/badges/bah.png",
  },
  {
    name: "Santos",
    reputation: 8000,
    colors: { primary: "#FFFFFF", secondary: "#000000" },
    badge: "/badges/san.png",
  },
  {
    name: "Sport",
    reputation: 7000,
    colors: { primary: "#C4161C", secondary: "#000000" },
    badge: "/badges/spt.png",
  },
  {
    name: "Ceará",
    reputation: 7100,
    colors: { primary: "#000000", secondary: "#FFFFFF" },
    badge: "/badges/cea.png",
  },
  {
    name: "Vitória",
    reputation: 6900,
    colors: { primary: "#C4161C", secondary: "#000000" },
    badge: "/badges/vit.png",
  },
  {
    name: "Juventude",
    reputation: 6800,
    colors: { primary: "#006437", secondary: "#FFFFFF" },
    badge: "/badges/juv.png",
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

  BRAZIL_CLUBS_DATA.forEach((clubData, index) => {
    const bundle = ClubFactory.createClub(
      clubData.name,
      brazilId,
      clubData.reputation,
      clubData.colors,
      clubData.badge
    );

    if (index === 0) firstClubId = bundle.club.id;

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
      `   - Contratos: ${Object.keys(state.contracts).length}`
  );

  return state;
};
