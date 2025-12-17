import { describe, it, expect, beforeEach } from "vitest";
import { MatchEngine } from "../../src/engine/MatchEngine";
import type { Player, Team } from "../../src/domain/models";
import { Position } from "../../src/domain/enums";
import { MatchConfig } from "../../src/domain/types";

describe("MatchEngine - Sistema Dinâmico", () => {
  let mockHomeTeam: Team;
  let mockAwayTeam: Team;
  let mockHomePlayers: Player[];
  let mockAwayPlayers: Player[];
  let matchConfig: MatchConfig;

  beforeEach(() => {
    mockHomeTeam = {
      id: 1,
      name: "Home FC",
      shortName: "HOM",
      reputation: 5000,
      budget: 1000000,
      isHuman: true,
      stadiumCapacity: 20000,
      stadiumQuality: 70,
      trainingCenterQuality: 60,
      youthAcademyQuality: 50,
      fanSatisfaction: 75,
      fanBase: 15000,
      primaryColor: "#FF0000",
      secondaryColor: "#FFFFFF",
      headCoachId: null,
      footballDirectorId: null,
      executiveDirectorId: null,
      transferBudget: 500000,
      transferStrategy: "balanced",
      history: [],
      defaultFormation: "4-4-2",
      defaultGameStyle: "balanced",
      defaultMarking: "zonal",
      defaultMentality: "normal",
      defaultPassingDirectness: "mixed",
    };

    mockAwayTeam = {
      ...mockHomeTeam,
      id: 2,
      name: "Away FC",
      shortName: "AWY",
    };

    mockHomePlayers = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      teamId: 1,
      firstName: `Home`,
      lastName: `Player${i + 1}`,
      age: 25,
      birthDate: "2000-01-01",
      nationality: "BRA",
      position:
        i === 0
          ? Position.GK
          : i < 5
          ? Position.DF
          : i < 9
          ? Position.MF
          : Position.FW,
      preferredFoot: "right",
      overall: 70 - i,
      potential: 80,
      finishing: 60,
      passing: 65,
      dribbling: 60,
      defending: 55,
      shooting: 60,
      physical: 70,
      pace: 75,
      moral: 80,
      energy: 100,
      fitness: 90,
      form: 70,
      isYouth: false,
      isInjured: false,
      injuryType: null,
      injuryDaysRemaining: 0,
      isCaptain: i === 0,
      suspensionGamesRemaining: 0,
    }));

    mockAwayPlayers = mockHomePlayers.map((p, i) => ({
      ...p,
      id: i + 100,
      teamId: 2,
      firstName: "Away",
      lastName: `Player${i + 1}`,
    }));

    matchConfig = {
      homeTeam: mockHomeTeam,
      awayTeam: mockAwayTeam,
      homePlayers: JSON.parse(JSON.stringify(mockHomePlayers)),
      awayPlayers: JSON.parse(JSON.stringify(mockAwayPlayers)),
      homeTactics: {
        formation: "4-4-2",
        starters: [],
        bench: [],
        tactics: {
          style: "balanced",
          marking: "zonal",
          mentality: "normal",
          passingDirectness: "mixed",
        },
      },
      awayTactics: {
        formation: "4-4-2",
        starters: [],
        bench: [],
        tactics: {
          style: "balanced",
          marking: "zonal",
          mentality: "normal",
          passingDirectness: "mixed",
        },
      },
      weather: "sunny",
    };
  });

  describe("Inicialização de Jogadores", () => {
    it("deve selecionar 11 jogadores iniciais (melhores overall)", () => {
      const engine = new MatchEngine(matchConfig, false);

      const homeOnField = engine.getHomePlayersOnField();
      const awayOnField = engine.getAwayPlayersOnField();

      expect(homeOnField).toHaveLength(11);
      expect(awayOnField).toHaveLength(11);

      const homeIds = homeOnField.map((p) => p.id).sort((a, b) => a - b);
      expect(homeIds).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    });

    it("deve criar um banco com até 7 jogadores", () => {
      const engine = new MatchEngine(matchConfig, false);

      const homeBench = engine.getHomeBench();
      const awayBench = engine.getAwayBench();

      expect(homeBench.length).toBeLessThanOrEqual(7);
      expect(awayBench.length).toBeLessThanOrEqual(7);
    });

    it("deve excluir jogadores lesionados da escalação inicial", () => {
      matchConfig.homePlayers[0].isInjured = true;
      const engine = new MatchEngine(matchConfig, false);

      const homeOnField = engine.getHomePlayersOnField();
      const injuredPlayerInField = homeOnField.find((p) => p.id === 1);

      expect(injuredPlayerInField).toBeUndefined();
    });
  });

  describe("Recálculo de Força", () => {
    it("deve recalcular força ao chamar updateTeamStrengths()", () => {
      const engine = new MatchEngine(matchConfig, false);
      const initialAttack = engine.getHomeStrength().attack;

      engine.getHomePlayersOnField().forEach((p) => {
        p.energy = 5;
      });

      engine.updateTeamStrengths();
      const newAttack = engine.getHomeStrength().attack;
      expect(newAttack).toBeLessThan(initialAttack);
    });

    it("deve drenar mais energia com marcação pressing_high", () => {
      const pressingConfig = JSON.parse(JSON.stringify(matchConfig));
      pressingConfig.homeTactics.tactics.marking = "pressing_high";

      const enginePressing = new MatchEngine(pressingConfig, false);
      const engineZonal = new MatchEngine(matchConfig, false);

      enginePressing.start();
      engineZonal.start();

      for (let i = 0; i < 20; i++) {
        enginePressing.simulateMinute();
        engineZonal.simulateMinute();
      }

      const energyPressing = enginePressing.getHomePlayersOnField()[0].energy;
      const energyZonal = engineZonal.getHomePlayersOnField()[0].energy;

      expect(energyPressing).toBeLessThan(energyZonal);
    });
  });

  describe("Sistema de Substituições", () => {
    it("deve realizar uma substituição válida", () => {
      const engine = new MatchEngine(matchConfig, false);
      engine.start();

      const homeBench = engine.getHomeBench();
      const homeOnField = engine.getHomePlayersOnField();

      const playerOutId = homeOnField[10].id;
      const playerInId = homeBench[0].id;

      const success = engine.substitute(true, playerOutId, playerInId);

      expect(success).toBe(true);
      expect(engine.getSubstitutionsUsed(true)).toBe(1);

      const newOnField = engine.getHomePlayersOnField();
      const newBench = engine.getHomeBench();

      expect(newOnField.find((p) => p.id === playerInId)).toBeDefined();
      expect(newBench.find((p) => p.id === playerOutId)).toBeDefined();
    });

    it("deve rejeitar substituição de jogador não está em campo", () => {
      const engine = new MatchEngine(matchConfig, false);
      engine.start();

      const homeBench = engine.getHomeBench();
      const playerNotOnFieldId = homeBench[0].id;
      const playerInId = homeBench[1].id;

      const success = engine.substitute(true, playerNotOnFieldId, playerInId);

      expect(success).toBe(false);
      expect(engine.getSubstitutionsUsed(true)).toBe(0);
    });

    it("deve rejeitar substituição de jogador não está no banco", () => {
      const engine = new MatchEngine(matchConfig, false);
      engine.start();

      const homeOnField = engine.getHomePlayersOnField();
      const playerOutId = homeOnField[10].id;
      const playerNotOnBenchId = 999;

      const success = engine.substitute(true, playerOutId, playerNotOnBenchId);

      expect(success).toBe(false);
      expect(engine.getSubstitutionsUsed(true)).toBe(0);
    });

    it("deve respeitar o limite de 5 substituições", () => {
      const engine = new MatchEngine(matchConfig, false);
      engine.start();

      for (let i = 0; i < 5; i++) {
        const homeOnField = engine.getHomePlayersOnField();
        const homeBench = engine.getHomeBench();

        if (homeBench.length === 0) break;

        const playerOutId = homeOnField[10 - i].id;
        const playerInId = homeBench[0].id;

        const success = engine.substitute(true, playerOutId, playerInId);
        expect(success).toBe(true);
      }

      expect(engine.getSubstitutionsUsed(true)).toBe(5);

      const homeOnField = engine.getHomePlayersOnField();
      const homeBench = engine.getHomeBench();

      if (homeBench.length > 0) {
        const playerOutId = homeOnField[0].id;
        const playerInId = homeBench[0].id;

        const success = engine.substitute(true, playerOutId, playerInId);
        expect(success).toBe(false);
        expect(engine.getSubstitutionsUsed(true)).toBe(5);
      }
    });

    it("deve adicionar evento de substituição ao log", () => {
      const engine = new MatchEngine(matchConfig, false);
      engine.start();

      const homeBench = engine.getHomeBench();
      const homeOnField = engine.getHomePlayersOnField();

      const playerOutId = homeOnField[10].id;
      const playerInId = homeBench[0].id;

      engine.substitute(true, playerOutId, playerInId);

      const events = engine.getEvents();
      const subEvent = events.find((e) => e.type === "substitution");

      expect(subEvent).toBeDefined();
      expect(subEvent?.description).toContain("Substituição");
    });

    it("deve recalcular força após substituição", () => {
      const engine = new MatchEngine(matchConfig, false);
      engine.start();

      const initialStrength = engine.getHomeStrength().overall;

      const homeBench = engine.getHomeBench();
      const homeOnField = engine.getHomePlayersOnField();

      const playerOutId = homeOnField[0].id;
      const playerInId = homeBench[homeBench.length - 1].id;

      engine.substitute(true, playerOutId, playerInId);

      const newStrength = engine.getHomeStrength().overall;

      expect(newStrength).toBeLessThanOrEqual(initialStrength);
    });
  });

  describe("Drenagem de Energia", () => {
    it("deve reduzir energia dos jogadores em campo a cada minuto", () => {
      const engine = new MatchEngine(matchConfig, false);
      engine.start();

      const initialEnergy = engine.getHomePlayersOnField()[0].energy;

      for (let i = 0; i < 10; i++) {
        engine.simulateMinute();
      }

      const finalEnergy = engine.getHomePlayersOnField()[0].energy;

      expect(finalEnergy).toBeLessThan(initialEnergy);
    });

    it("deve drenar mais energia com marcação pressing_high", () => {
      const pressingConfig = JSON.parse(JSON.stringify(matchConfig));
      pressingConfig.homeTactics.tactics.marking = "pressing_high";

      const enginePressing = new MatchEngine(pressingConfig, false);
      const engineZonal = new MatchEngine(matchConfig, false);

      enginePressing.start();
      engineZonal.start();

      const initialEnergyPressing =
        enginePressing.getHomePlayersOnField()[0].energy;
      const initialEnergyZonal = engineZonal.getHomePlayersOnField()[0].energy;

      for (let i = 0; i < 30; i++) {
        enginePressing.simulateMinute();
        engineZonal.simulateMinute();
      }

      const finalEnergyPressing =
        enginePressing.getHomePlayersOnField()[0].energy;
      const finalEnergyZonal = engineZonal.getHomePlayersOnField()[0].energy;

      const drainPressing = initialEnergyPressing - finalEnergyPressing;
      const drainZonal = initialEnergyZonal - finalEnergyZonal;

      expect(drainPressing).toBeGreaterThan(drainZonal);
    });

    it("não deve permitir energia negativa", () => {
      const engine = new MatchEngine(matchConfig, false);
      engine.start();

      engine.getHomePlayersOnField().forEach((p) => {
        p.energy = 5;
      });

      for (let i = 0; i < 20; i++) {
        engine.simulateMinute();
      }

      engine.getHomePlayersOnField().forEach((p) => {
        expect(p.energy).toBeGreaterThanOrEqual(0);
      });
    });

    it("deve afetar apenas jogadores em campo, não o banco", () => {
      const engine = new MatchEngine(matchConfig, false);
      engine.start();

      const benchPlayerInitialEnergy = engine.getHomeBench()[0].energy;

      for (let i = 0; i < 30; i++) {
        engine.simulateMinute();
      }

      const benchPlayerFinalEnergy = engine.getHomeBench()[0].energy;

      expect(benchPlayerFinalEnergy).toBe(benchPlayerInitialEnergy);
    });
  });

  describe("Integração: Substituições + Drenagem", () => {
    it("deve permitir gerenciar fadiga através de substituições", () => {
      const engine = new MatchEngine(matchConfig, false);
      engine.start();

      for (let i = 0; i < 60; i++) {
        engine.simulateMinute();
      }

      const homeOnField = engine.getHomePlayersOnField();
      const homeBench = engine.getHomeBench();

      const tiredPlayer = homeOnField.find((p) => p.energy < 80);
      const freshPlayer = homeBench.find((p) => p.energy > 90);

      if (tiredPlayer && freshPlayer) {
        const success = engine.substitute(true, tiredPlayer.id, freshPlayer.id);

        expect(success).toBe(true);

        const newOnField = engine.getHomePlayersOnField();
        const freshInField = newOnField.find((p) => p.id === freshPlayer.id);

        expect(freshInField).toBeDefined();
        expect(freshInField!.energy).toBeGreaterThan(tiredPlayer.energy);
      }
    });
  });
});
