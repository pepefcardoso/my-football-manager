import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createRepositoryContainer } from "../src/repositories/RepositoryContainer";
import { GameEventBus } from "../src/services/events/GameEventBus";
import { MatchService } from "../src/services/MatchService";
import { Logger } from "../src/lib/Logger";
import { Result } from "../src/services/types/ServiceResults";
import type { Match } from "../src/domain/models";

vi.mock("../src/lib/db", () => {
  const mockTransaction = <T>(callback: (tx: any) => T): T => {
    const mockTx = { rollback: vi.fn() };
    return callback(mockTx);
  };

  return {
    db: {
      transaction: vi.fn().mockImplementation(mockTransaction),
      run: vi.fn(),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      }),
    },
    DbInstance: {} as any,
    DbTransaction: {} as any,
  };
});

const logger = new Logger("SeasonStressTest");

interface StressTestMetrics {
  totalMatches: number;
  successfulSimulations: number;
  failedSimulations: number;
  averageSimulationTime: number;
  peakMemoryUsage: number;
  errors: string[];
  startTime: number;
  endTime: number;
}

describe("Teste de Stress: Simulação de Temporada Completa", () => {
  const STRESS_TEST_TIMEOUT = 180000;
  const TARGET_MATCHES = 1000;
  const SEASON_YEAR = 2025;

  let repos: ReturnType<typeof createRepositoryContainer>;
  let eventBus: GameEventBus;
  let matchService: MatchService;
  let metrics: StressTestMetrics;

  beforeAll(() => {
    logger.info("🔥 Iniciando Teste de Stress de Temporada Completa");

    repos = createRepositoryContainer();
    eventBus = new GameEventBus();

    matchService = new MatchService(repos, eventBus);

    metrics = {
      totalMatches: 0,
      successfulSimulations: 0,
      failedSimulations: 0,
      averageSimulationTime: 0,
      peakMemoryUsage: 0,
      errors: [],
      startTime: Date.now(),
      endTime: 0,
    };

    setupMockRepositories();
  });

  afterAll(() => {
    metrics.endTime = Date.now();
    const totalTime = (metrics.endTime - metrics.startTime) / 1000;

    logger.info("📊 RESULTADOS DO TESTE DE STRESS");
    logger.info(`⏱️  Tempo Total: ${totalTime.toFixed(2)}s`);
    logger.info(`⚽ Partidas Simuladas: ${metrics.totalMatches}`);
    logger.info(`✅ Sucessos: ${metrics.successfulSimulations}`);
    logger.info(`❌ Falhas: ${metrics.failedSimulations}`);
    logger.info(
      `📈 Tempo Médio por Partida: ${metrics.averageSimulationTime.toFixed(
        2
      )}ms`
    );
    logger.info(
      `💾 Pico de Memória: ${(metrics.peakMemoryUsage / 1024 / 1024).toFixed(
        2
      )}MB`
    );

    if (metrics.errors.length > 0) {
      logger.error("🚨 Erros Detectados:");
      metrics.errors.forEach((err, idx) => {
        logger.error(`  ${idx + 1}. ${err}`);
      });
    }
  });

  it(
    "deve simular uma temporada completa (1000+ partidas) sem erros fatais",
    async () => {
      logger.info("🎮 Iniciando simulação de temporada completa...");

      const allMatches = await generateSeasonMatches();

      expect(allMatches.length).toBeGreaterThanOrEqual(TARGET_MATCHES);

      logger.info(
        `📅 Temporada gerada: ${allMatches.length} partidas agendadas`
      );

      const simulationTimes: number[] = [];

      for (let i = 0; i < allMatches.length; i++) {
        const match = allMatches[i];

        if (i % 100 === 0) {
          const progress = ((i / allMatches.length) * 100).toFixed(1);
          logger.info(
            `⚙️  Progresso: ${progress}% (${i}/${allMatches.length})`
          );

          updateMemoryMetrics();
        }

        try {
          const startTime = performance.now();

          const result = await matchService.simulateFullMatch(match.id);

          const endTime = performance.now();
          const simTime = endTime - startTime;
          simulationTimes.push(simTime);

          if (Result.isSuccess(result)) {
            metrics.successfulSimulations++;
            validateMatchResult(result.data);
          } else {
            metrics.failedSimulations++;
            metrics.errors.push(
              `Match ${match.id} failed: ${result.error.message}`
            );
          }
        } catch (error) {
          metrics.failedSimulations++;
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          metrics.errors.push(`Match ${match.id} exception: ${errorMsg}`);
          logger.error(`Erro crítico na partida ${match.id}:`, error);
        }

        metrics.totalMatches++;
      }

      metrics.averageSimulationTime =
        simulationTimes.reduce((sum, t) => sum + t, 0) / simulationTimes.length;

      logger.info("✅ Simulação de temporada concluída!");

      expect(metrics.failedSimulations).toBe(0);

      expect(metrics.successfulSimulations).toBeGreaterThanOrEqual(
        TARGET_MATCHES
      );

      expect(metrics.errors.length).toBe(0);

      const memoryLeakThreshold = 500;
      const memoryUsageMB = metrics.peakMemoryUsage / 1024 / 1024;
      expect(memoryUsageMB).toBeLessThan(memoryLeakThreshold);
    },
    STRESS_TEST_TIMEOUT
  );

  it("deve manter integridade dos dados após simulação massiva", async () => {
    logger.info("🔍 Validando integridade dos dados pós-simulação...");

    const standingsCalls = (repos.competitions.updateStanding as any).mock.calls
      .length;
    expect(standingsCalls).toBeGreaterThan(0);

    const financialRecordCalls = (repos.financial.addRecord as any).mock.calls
      .length;
    expect(financialRecordCalls).toBeGreaterThan(0);

    const playerUpdateCalls = (repos.players.updateDailyStatsBatch as any).mock
      .calls.length;
    expect(playerUpdateCalls).toBeGreaterThan(0);

    const matchEventsCalls = (repos.matches.createMatchEvents as any).mock.calls
      .length;
    expect(matchEventsCalls).toBeGreaterThan(0);

    logger.info("✅ Integridade dos dados validada com sucesso!");
  });

  it("deve ter performance aceitável (< 100ms média por partida)", async () => {
    expect(metrics.averageSimulationTime).toBeLessThan(100);

    logger.info(
      `⚡ Performance: ${metrics.averageSimulationTime.toFixed(
        2
      )}ms por partida`
    );
  });

  function setupMockRepositories() {
    repos.teams.findById = vi.fn().mockImplementation(async (id: number) => ({
      id,
      name: `Team ${id}`,
      shortName: `T${id}`,
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
    }));

    repos.players.findByTeamId = vi
      .fn()
      .mockImplementation(async (teamId: number) => {
        const players = [];
        for (let i = 0; i < 11; i++) {
          players.push({
            id: teamId * 100 + i,
            teamId,
            firstName: `Player`,
            lastName: `${i}`,
            age: 25,
            nationality: "BRA",
            position: i === 0 ? "GK" : i <= 4 ? "DF" : i <= 8 ? "MF" : "FW",
            preferredFoot: "right",
            overall: 75,
            potential: 80,
            finishing: 70,
            passing: 75,
            dribbling: 70,
            defending: i <= 4 ? 80 : 60,
            shooting: 70,
            physical: 75,
            pace: 75,
            moral: 80,
            energy: 100,
            fitness: 100,
            form: 50,
            isYouth: false,
            isInjured: false,
            injuryType: null,
            injuryDaysRemaining: 0,
            isCaptain: i === 0,
            suspensionGamesRemaining: 0,
          });
        }
        return players;
      });

    repos.matches.findById = vi.fn().mockImplementation(async (id: number) => ({
      id,
      competitionId: 1,
      seasonId: 1,
      homeTeamId: (id % 20) + 1,
      awayTeamId: ((id + 1) % 20) + 1,
      date: "2025-01-15",
      round: 1,
      groupName: null,
      homeScore: null,
      awayScore: null,
      isPlayed: false,
      attendance: null,
      ticketRevenue: null,
      weather: "sunny",
    }));

    repos.matches.updateMatchResult = vi.fn().mockResolvedValue(undefined);
    repos.matches.createMatchEvents = vi.fn().mockResolvedValue(undefined);

    repos.competitions.getStandings = vi.fn().mockResolvedValue([]);
    repos.competitions.updateStanding = vi.fn().mockResolvedValue(undefined);
    repos.competitions.findAll = vi.fn().mockResolvedValue([
      {
        id: 1,
        name: "Liga Nacional",
        shortName: "LN",
        country: "BRA",
        tier: 1,
        type: "league",
        priority: 1,
        config: {},
        teams: 20,
        prize: 10000000,
        reputation: 1000,
        window: "national",
        startMonth: 1,
        endMonth: 12,
      },
    ]);
    repos.financial.addRecord = vi.fn().mockResolvedValue(undefined);
    repos.teams.updateBudget = vi.fn().mockResolvedValue(undefined);
    repos.players.updateDailyStatsBatch = vi.fn().mockResolvedValue(undefined);
    repos.seasons.findActiveSeason = vi.fn().mockResolvedValue({
      id: 1,
      year: 2025,
      startDate: "2025-01-15",
      endDate: "2025-12-15",
      isActive: true,
    });
  }

  async function generateSeasonMatches(): Promise<Match[]> {
    const matches: Match[] = [];
    const numTeams = 20;
    const roundsPerSeason = (numTeams - 1) * 2;
    const matchesPerRound = numTeams / 2;

    const numCompetitions = 3;

    let matchId = 1;

    for (let comp = 1; comp <= numCompetitions; comp++) {
      for (let round = 1; round <= roundsPerSeason; round++) {
        for (
          let matchInRound = 0;
          matchInRound < matchesPerRound;
          matchInRound++
        ) {
          const offset = (comp - 1) * numTeams;
          const homeTeamId = offset + (matchId % numTeams) + 1;
          const awayTeamId = offset + ((matchId + 1) % numTeams) + 1;

          matches.push({
            id: matchId,
            competitionId: comp,
            seasonId: 1,
            homeTeamId,
            awayTeamId,
            date: `2025-${String(Math.floor(round / 4) + 1).padStart(
              2,
              "0"
            )}-15`,
            round,
            groupName: null,
            homeScore: null,
            awayScore: null,
            isPlayed: false,
            attendance: null,
            ticketRevenue: null,
            weather: "sunny",
          } as Match);

          matchId++;
        }
      }
    }

    return matches;
  }

  function validateMatchResult(result: any) {
    expect(result).toBeDefined();
    expect(typeof result.homeScore).toBe("number");
    expect(typeof result.awayScore).toBe("number");
    expect(result.homeScore).toBeGreaterThanOrEqual(0);
    expect(result.awayScore).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.events)).toBe(true);
    expect(result.stats).toBeDefined();
    expect(Array.isArray(result.playerUpdates)).toBe(true);

    const goalEvents = result.events.filter((e: any) => e.type === "goal");
    const totalGoals = result.homeScore + result.awayScore;

    expect(goalEvents.length).toBe(totalGoals);
  }

  function updateMemoryMetrics() {
    if (typeof process !== "undefined" && process.memoryUsage) {
      const usage = process.memoryUsage();
      metrics.peakMemoryUsage = Math.max(
        metrics.peakMemoryUsage,
        usage.heapUsed
      );
    }
  }
});
