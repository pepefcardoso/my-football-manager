import { describe, it, expect, beforeEach, vi } from "vitest";
import { SeasonTransitionManager } from "../../src/services/season/SeasonTransitionManager";
import { PromotionRelegationService } from "../../src/services/season/PromotionRelegationService";
import { SeasonService } from "../../src/services/SeasonService";
import { createRepositoryContainer } from "../../src/repositories/RepositoryContainer";
import { Result } from "../../src/services/types/ServiceResults";

vi.mock("../../src/lib/db", () => {
  return {
    db: {},
  };
});

const mockRepos = createRepositoryContainer();

const mockPromoService = {
  calculateOutcome: vi.fn(),
} as unknown as PromotionRelegationService;

const mockSeasonService = {
  startNewSeason: vi.fn(),
} as unknown as SeasonService;

const transitionManager = new SeasonTransitionManager(
  mockRepos,
  mockPromoService,
  mockSeasonService
);

describe("SeasonTransitionManager Integration", () => {
  const CURRENT_SEASON_ID = 1;
  const CURRENT_YEAR = 2025;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepos.seasons.findActiveSeason = vi.fn().mockResolvedValue({
      id: CURRENT_SEASON_ID,
      year: CURRENT_YEAR,
      isActive: true,
    });

    mockPromoService.calculateOutcome = vi.fn().mockResolvedValue(
      Result.success({
        championName: "Botafogo",
        promotedTeams: [101, 102, 103, 104],
        relegatedTeams: [10, 11, 12, 13],
      })
    );

    mockRepos.teams.findById = vi.fn().mockImplementation(async (id) => ({
      id,
      name: `Team ${id}`,
      shortName: `T${id}`,
      reputation: 5000,
      budget: 10000000,
    }));

    mockRepos.teams.update = vi.fn().mockResolvedValue(undefined);
    mockRepos.teams.findAll = vi.fn().mockResolvedValue([
      { id: 1, name: "Team 1" },
      { id: 2, name: "Team 2" },
    ]);

    mockRepos.players.findByTeamId = vi.fn().mockResolvedValue([
      { id: 1, age: 20, physical: 80, pace: 80 },
      { id: 2, age: 32, physical: 70, pace: 70 },
      { id: 3, age: 38, physical: 50, pace: 40 },
    ]);

    mockRepos.players.update = vi.fn().mockResolvedValue(undefined);

    mockRepos.clubInterests.deleteOlderThan = vi.fn().mockResolvedValue(50);

    mockSeasonService.startNewSeason = vi
      .fn()
      .mockResolvedValue(Result.success(undefined));
  });

  it("deve executar o fluxo completo de fim de temporada com sucesso", async () => {
    const result = await transitionManager.processEndOfSeason(
      CURRENT_SEASON_ID
    );

    expect(Result.isSuccess(result)).toBe(true);
    const data = Result.unwrap(result);

    expect(data.seasonYear).toBe(CURRENT_YEAR);
    expect(data.championName).toBe("Botafogo");
  });

  it("deve aplicar bônus aos times promovidos", async () => {
    await transitionManager.processEndOfSeason(CURRENT_SEASON_ID);

    expect(mockRepos.teams.update).toHaveBeenCalledWith(
      101,
      expect.objectContaining({
        reputation: 6000,
        budget: 20000000,
      })
    );
  });

  it("deve aplicar penalidade aos times rebaixados", async () => {
    await transitionManager.processEndOfSeason(CURRENT_SEASON_ID);

    expect(mockRepos.teams.update).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        reputation: 4000,
      })
    );
  });

  it("deve envelhecer os jogadores corretamente", async () => {
    await transitionManager.processEndOfSeason(CURRENT_SEASON_ID);

    expect(mockRepos.players.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ age: 21 })
    );

    expect(mockRepos.players.update).toHaveBeenCalledWith(
      2,
      expect.objectContaining({
        age: 33,
        physical: 68,
        pace: 67,
      })
    );
  });

  it("deve aposentar jogadores muito velhos", async () => {
    await transitionManager.processEndOfSeason(CURRENT_SEASON_ID);

    expect(mockRepos.players.update).toHaveBeenCalledWith(
      3,
      expect.objectContaining({
        teamId: null,
        moral: 0,
      })
    );
  });

  it("deve iniciar a nova temporada via SeasonService", async () => {
    await transitionManager.processEndOfSeason(CURRENT_SEASON_ID);

    expect(mockSeasonService.startNewSeason).toHaveBeenCalledWith(
      CURRENT_YEAR + 1
    );
  });

  it("deve falhar se não houver temporada ativa", async () => {
    mockRepos.seasons.findActiveSeason = vi.fn().mockResolvedValue(undefined);

    const result = await transitionManager.processEndOfSeason(
      CURRENT_SEASON_ID
    );

    expect(Result.isFailure(result)).toBe(true);
  });
});
