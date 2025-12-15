import { describe, it, expect, beforeEach } from "vitest";
import { MatchEventType, MatchState, Position } from "../../src/domain/enums";
import { Player, Team } from "../../src/domain/models";
import { MatchConfig } from "../../src/domain/types";
import { MatchEngine } from "../../src/engine/MatchEngine";

const createMockPlayer = (
  id: number,
  position: Position,
  overall: number
): Player => ({
  id,
  teamId: 1,
  firstName: `Player`,
  lastName: `${id}`,
  age: 25,
  nationality: "BRA",
  position,
  preferredFoot: "right",
  overall,
  potential: overall + 5,
  finishing: overall,
  passing: overall,
  dribbling: overall,
  defending: overall,
  shooting: overall,
  physical: overall,
  pace: overall,
  moral: 80,
  energy: 100,
  fitness: 100,
  form: 50,
  isYouth: false,
  isInjured: false,
  injuryType: null,
  injuryDaysRemaining: 0,
  isCaptain: false,
  suspensionGamesRemaining: 0,
});

const createMockTeam = (id: number, name: string): Team => ({
  id,
  name,
  shortName: name.substring(0, 3).toUpperCase(),
  primaryColor: "#000000",
  secondaryColor: "#ffffff",
  reputation: 5000,
  budget: 10000000,
  isHuman: false,
  stadiumCapacity: 50000,
  stadiumQuality: 50,
  trainingCenterQuality: 50,
  youthAcademyQuality: 50,
  fanSatisfaction: 50,
  fanBase: 100000,
  headCoachId: null,
  footballDirectorId: null,
  executiveDirectorId: null,
  transferBudget: 5000000,
  transferStrategy: "balanced",
  history: [],
});

const createBalancedSquad = (startId: number): Player[] => {
  const players: Player[] = [];
  players.push(createMockPlayer(startId, Position.GK, 80));
  for (let i = 1; i <= 4; i++)
    players.push(createMockPlayer(startId + i, Position.DF, 80));
  for (let i = 5; i <= 8; i++)
    players.push(createMockPlayer(startId + i, Position.MF, 80));
  for (let i = 9; i <= 10; i++)
    players.push(createMockPlayer(startId + i, Position.FW, 80));
  return players;
};

describe("MatchEngine Core Logic", () => {
  let homeTeam: Team;
  let awayTeam: Team;
  let homePlayers: Player[];
  let awayPlayers: Player[];
  let matchConfig: MatchConfig;

  beforeEach(() => {
    homeTeam = createMockTeam(1, "Home FC");
    awayTeam = createMockTeam(2, "Away FC");
    homePlayers = createBalancedSquad(100);
    awayPlayers = createBalancedSquad(200);

    matchConfig = {
      homeTeam,
      awayTeam,
      homePlayers,
      awayPlayers,
      weather: "sunny",
      homeTacticalBonus: 0,
      awayTacticalBonus: 0,
    };
  });

  it("deve inicializar com o estado correto (NOT_STARTED, 0-0, minuto 0)", () => {
    const engine = new MatchEngine(matchConfig, false);

    expect(engine.getState()).toBe(MatchState.NOT_STARTED);
    expect(engine.getCurrentMinute()).toBe(0);
    expect(engine.getCurrentScore()).toEqual({ home: 0, away: 0 });
    expect(engine.getEvents()).toHaveLength(0);
  });

  it("deve transitar para PLAYING ao iniciar", () => {
    const engine = new MatchEngine(matchConfig, false);
    engine.start();

    expect(engine.getState()).toBe(MatchState.PLAYING);
    expect(engine.getEvents().length).toBeGreaterThan(0);
  });

  it("deve simular minuto a minuto corretamente", () => {
    const engine = new MatchEngine(matchConfig, false);
    engine.start();

    engine.simulateMinute();
    expect(engine.getCurrentMinute()).toBe(1);

    engine.simulateMinute();
    expect(engine.getCurrentMinute()).toBe(2);
  });

  it("deve completar a partida e atingir 90 minutos ao simular tudo", () => {
    const engine = new MatchEngine(matchConfig, false);

    engine.simulateToCompletion();

    expect(engine.getState()).toBe(MatchState.FINISHED);
    expect(engine.getCurrentMinute()).toBeGreaterThanOrEqual(90);

    const result = engine.getMatchResult();
    expect(result).toBeDefined();
    expect(result.events.some((e) => e.type === MatchEventType.FINISHED)).toBe(
      true
    );
  });

  it("deve garantir consistência estatística: Gols no Placar vs Eventos de Gol", () => {
    const engine = new MatchEngine(matchConfig, false);
    engine.simulateToCompletion();

    const result = engine.getMatchResult();
    const score = engine.getCurrentScore();

    expect(result.homeScore).toBe(score.home);
    expect(result.awayScore).toBe(score.away);

    const homeGoalsEvents = result.events.filter(
      (e) => e.type === MatchEventType.GOAL && e.teamId === homeTeam.id
    ).length;

    const awayGoalsEvents = result.events.filter(
      (e) => e.type === MatchEventType.GOAL && e.teamId === awayTeam.id
    ).length;

    expect(homeGoalsEvents).toBe(score.home);
    expect(awayGoalsEvents).toBe(score.away);
  });

  it("não deve permitir simular minutos após o término", () => {
    const engine = new MatchEngine(matchConfig, false);
    engine.simulateToCompletion();

    const minuteAfterFinish = engine.getCurrentMinute();

    engine.simulateMinute();

    expect(engine.getCurrentMinute()).toBe(minuteAfterFinish);
  });

  it("deve pausar e retomar corretamente", () => {
    const engine = new MatchEngine(matchConfig, false);
    engine.start();
    engine.simulateMinute();

    engine.pause();
    expect(engine.getState()).toBe(MatchState.PAUSED);

    engine.simulateMinute();
    expect(engine.getCurrentMinute()).toBe(1);

    engine.resume();
    expect(engine.getState()).toBe(MatchState.PLAYING);

    engine.simulateMinute();
    expect(engine.getCurrentMinute()).toBe(2);
  });
});
