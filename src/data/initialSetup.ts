import { v4 as uuidv4 } from "uuid";
import { GameState } from "../core/models/gameState";
import { Club } from "../core/models/club";
import { Player } from "../core/models/people";
import { Nation } from "../core/models/geo";
import { ID } from "../core/models/types";

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

const generatePlayer = (
  clubId: ID,
  nationId: ID,
  positionId: string
): Player => {
  const id = uuidv4();
  return {
    id,
    name: `Player ${id.substring(0, 4)}`,
    nickname: "",
    nationId,
    birthDate: Date.now() - 630720000000,
    primaryPositionId: positionId,
    preferredFoot: Math.random() > 0.5 ? "RIGHT" : "LEFT",
    crossing: Math.floor(Math.random() * 100),
    finishing: Math.floor(Math.random() * 100),
    passing: Math.floor(Math.random() * 100),
    technique: Math.floor(Math.random() * 100),
    defending: Math.floor(Math.random() * 100),
    gkReflexes: 10,
    gkRushingOut: 10,
    gkDistribution: 10,
    speed: Math.floor(Math.random() * 100),
    force: Math.floor(Math.random() * 100),
    stamina: Math.floor(Math.random() * 100),
    intelligence: Math.floor(Math.random() * 100),
    determination: Math.floor(Math.random() * 100),
    potential: Math.floor(Math.random() * 100),
    proneToInjury: Math.floor(Math.random() * 20),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

export const createNewGame = (): GameState => {
  const state = createEmptyState();
  const portugalId = uuidv4();
  const portugal: Nation = { id: portugalId, name: "Portugal" };
  state.nations[portugalId] = portugal;
  const clubsData = [
    { name: "Red Eagles", color: "red" },
    { name: "Blue Dragons", color: "blue" },
    { name: "Green Lions", color: "green" },
    { name: "Braga Warriors", color: "red" },
  ];
  clubsData.forEach((c) => {
    const clubId = uuidv4();
    const club: Club = {
      id: clubId,
      name: c.name,
      nickname: c.name,
      dateFounded: Date.now(),
      cityId: uuidv4(),
      nationId: portugalId,
      primaryColor: c.color,
      secondaryColor: "white",
      badgePath: "",
      kitHomePath: "",
      kitAwayPath: "",
      fanBaseCurrent: 50000,
      fanBaseMax: 60000,
      fanBaseMin: 40000,
      reputation: 7000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    state.clubs[clubId] = club;

    for (let i = 0; i < 11; i++) {
      const player = generatePlayer(clubId, portugalId, "MIDFIELDER");
      state.players[player.id] = player;
    }
  });

  const firstClubId = Object.keys(state.clubs)[0];
  const humanManagerId = uuidv4();

  state.managers[humanManagerId] = {
    id: humanManagerId,
    name: "José Manager",
    nationId: portugalId,
    birthDate: Date.now() - 946080000000,
    isHuman: true,
    reputation: 1000,
    preferredStyle: "ATTACKING",
    preferredFormation: "4-3-3",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  state.meta.currentUserManagerId = humanManagerId;
  state.meta.userClubId = firstClubId;

  console.log(
    "New Game Created with:",
    Object.keys(state.clubs).length,
    "clubs"
  );
  return state;
};
