import { describe, it, expect, beforeEach, vi } from "vitest";
import { MatchSubstitutionManager } from "../../src/services/match/MatchSubstitutionManager";
import { MatchState } from "../../src/domain/enums";
import type { Player } from "../../src/domain/models";
import type { IRepositoryContainer } from "../../src/repositories/IRepositories";
import { Result } from "../../src/services/types/ServiceResults";

describe("MatchSubstitutionManager - Regras FIFA", () => {
  let manager: MatchSubstitutionManager;
  let mockRepos: IRepositoryContainer;

  const mockPlayerOnField: Player = {
    id: 1,
    teamId: 1,
    firstName: "John",
    lastName: "Doe",
    age: 25,
    nationality: "BRA",
    position: "MF",
    preferredFoot: "right",
    overall: 75,
    potential: 80,
    finishing: 70,
    passing: 75,
    dribbling: 72,
    defending: 50,
    shooting: 68,
    physical: 65,
    pace: 70,
    moral: 80,
    energy: 85,
    fitness: 90,
    form: 75,
    isYouth: false,
    isInjured: false,
    injuryType: null,
    injuryDaysRemaining: 0,
    isCaptain: false,
    suspensionGamesRemaining: 0,
  };

  const mockPlayerOnBench: Player = {
    ...mockPlayerOnField,
    id: 2,
    firstName: "Jane",
    lastName: "Smith",
  };

  const mockInjuredPlayer: Player = {
    ...mockPlayerOnField,
    id: 3,
    firstName: "Injured",
    lastName: "Player",
    isInjured: true,
    injuryDaysRemaining: 7,
  };

  const createOnFieldSquad = () => {
    const squad = [mockPlayerOnField];
    for (let i = 1; i < 11; i++) {
      squad.push({
        ...mockPlayerOnField,
        id: 100 + i,
        firstName: `Player ${i}`,
      });
    }
    return squad;
  };

  beforeEach(() => {
    mockRepos = {
      players: {
        findById: vi.fn((id: number) => {
          if (id === 1) return Promise.resolve(mockPlayerOnField);
          if (id === 2) return Promise.resolve(mockPlayerOnBench);
          if (id === 3) return Promise.resolve(mockInjuredPlayer);
          return Promise.resolve(undefined);
        }),
      },
      matches: {
        createMatchEvents: vi.fn().mockResolvedValue(undefined),
      },
    } as any;

    manager = new MatchSubstitutionManager(mockRepos);
  });

  it("deve REJEITAR substituição se partida não estiver pausada", async () => {
    const request = {
      matchId: 1,
      isHome: true,
      playerOutId: 1,
      playerInId: 2,
    };

    const result = await manager.validateSubstitution(
      request,
      MatchState.PLAYING,
      createOnFieldSquad(),
      [mockPlayerOnBench],
      0
    );

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.message).toContain("pausada");
    }
  });

  it("deve ACEITAR substituição se partida estiver pausada", async () => {
    const request = {
      matchId: 1,
      isHome: true,
      playerOutId: 1,
      playerInId: 2,
    };

    const result = await manager.validateSubstitution(
      request,
      MatchState.PAUSED,
      createOnFieldSquad(),
      [mockPlayerOnBench],
      0
    );

    expect(Result.isSuccess(result)).toBe(true);
  });

  it("deve ACEITAR substituição se partida não tiver iniciado", async () => {
    const request = {
      matchId: 1,
      isHome: true,
      playerOutId: 1,
      playerInId: 2,
    };

    const result = await manager.validateSubstitution(
      request,
      MatchState.NOT_STARTED,
      createOnFieldSquad(),
      [mockPlayerOnBench],
      0
    );

    expect(Result.isSuccess(result)).toBe(true);
  });

  it("deve REJEITAR substituição se limite de 5 foi atingido", async () => {
    const request = {
      matchId: 1,
      isHome: true,
      playerOutId: 1,
      playerInId: 2,
    };

    const result = await manager.validateSubstitution(
      request,
      MatchState.PAUSED,
      createOnFieldSquad(),
      [mockPlayerOnBench],
      5
    );

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.message).toContain("5 substituições");
    }
  });

  it("deve ACEITAR substituição 5/5 (última permitida)", async () => {
    const request = {
      matchId: 1,
      isHome: true,
      playerOutId: 1,
      playerInId: 2,
    };

    const result = await manager.validateSubstitution(
      request,
      MatchState.PAUSED,
      createOnFieldSquad(),
      [mockPlayerOnBench],
      4
    );

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.data.substitutionNumber).toBe(5);
    }
  });

  it("deve REJEITAR se jogador a sair não está em campo", async () => {
    const request = {
      matchId: 1,
      isHome: true,
      playerOutId: 1,
      playerInId: 2,
    };

    const squadWithoutTarget = createOnFieldSquad().filter((p) => p.id !== 1);

    const result = await manager.validateSubstitution(
      request,
      MatchState.PAUSED,
      squadWithoutTarget,
      [mockPlayerOnBench],
      0
    );

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.message).toContain("não está em campo");
    }
  });

  it("deve REJEITAR se jogador a entrar não está no banco", async () => {
    const request = {
      matchId: 1,
      isHome: true,
      playerOutId: 1,
      playerInId: 2,
    };

    const result = await manager.validateSubstitution(
      request,
      MatchState.PAUSED,
      createOnFieldSquad(),
      [],
      0
    );

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.message).toContain("banco de reservas");
    }
  });

  it("deve REJEITAR se jogador a entrar está lesionado", async () => {
    const request = {
      matchId: 1,
      isHome: true,
      playerOutId: 1,
      playerInId: 3,
    };

    const result = await manager.validateSubstitution(
      request,
      MatchState.PAUSED,
      createOnFieldSquad(),
      [mockInjuredPlayer],
      0
    );

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.message).toContain("lesionado");
    }
  });

  it("deve REJEITAR se tentar substituir jogador por ele mesmo", async () => {
    const request = {
      matchId: 1,
      isHome: true,
      playerOutId: 1,
      playerInId: 1,
    };

    const result = await manager.validateSubstitution(
      request,
      MatchState.PAUSED,
      createOnFieldSquad(),
      [mockPlayerOnField],
      0
    );

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.message).toContain("por ele mesmo");
    }
  });

  it("deve ACEITAR substituição válida com todos os dados corretos", async () => {
    const request = {
      matchId: 1,
      isHome: true,
      playerOutId: 1,
      playerInId: 2,
    };

    const result = await manager.validateSubstitution(
      request,
      MatchState.PAUSED,
      createOnFieldSquad(),
      [mockPlayerOnBench],
      2
    );

    expect(Result.isSuccess(result)).toBe(true);

    if (Result.isSuccess(result)) {
      expect(result.data.playerOut.id).toBe(1);
      expect(result.data.playerIn.id).toBe(2);
      expect(result.data.substitutionNumber).toBe(3);
      expect(result.data.playerOut.firstName).toBe("John");
      expect(result.data.playerIn.firstName).toBe("Jane");
    }
  });

  it("deve REJEITAR se jogador a sair não existe no banco de dados", async () => {
    const request = {
      matchId: 1,
      isHome: true,
      playerOutId: 999,
      playerInId: 2,
    };

    const result = await manager.validateSubstitution(
      request,
      MatchState.PAUSED,
      createOnFieldSquad(),
      [mockPlayerOnBench],
      0
    );

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.message).toContain("não encontrado");
    }
  });

  it("deve ACEITAR se time terá 7+ jogadores após substituição", async () => {
    const request = {
      matchId: 1,
      isHome: true,
      playerOutId: 1,
      playerInId: 2,
    };

    const sevenPlayers = [
      mockPlayerOnField,
      ...Array(6)
        .fill(null)
        .map((_, i) => ({ ...mockPlayerOnField, id: i + 10 })),
    ];

    expect(sevenPlayers.length).toBe(7);

    const result = await manager.validateSubstitution(
      request,
      MatchState.PAUSED,
      sevenPlayers,
      [mockPlayerOnBench],
      0
    );

    expect(Result.isSuccess(result)).toBe(true);
  });
});

describe("MatchSubstitutionManager - Elegibilidade de Jogadores", () => {
  let manager: MatchSubstitutionManager;
  let mockRepos: IRepositoryContainer;

  beforeEach(() => {
    mockRepos = {
      players: {
        findById: vi.fn(),
      },
    } as any;

    manager = new MatchSubstitutionManager(mockRepos);
  });

  it("deve ALERTAR se substituir o único goleiro em campo", async () => {
    const goalkeeper: Player = {
      id: 1,
      position: "GK",
      firstName: "Manuel",
      lastName: "Neuer",
    } as Player;

    const onFieldPlayers = [goalkeeper];

    const result = await manager.canPlayerBeSubstituted(1, onFieldPlayers);

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.data.allowed).toBe(true);
      expect(result.data.warnings.length).toBeGreaterThan(0);
      expect(result.data.warnings[0]).toContain("único goleiro");
    }
  });

  it("deve ALERTAR se substituir o capitão", async () => {
    const captain: Player = {
      id: 1,
      isCaptain: true,
      position: "MF",
      firstName: "Captain",
      lastName: "Leader",
    } as Player;

    const onFieldPlayers = [captain];

    const result = await manager.canPlayerBeSubstituted(1, onFieldPlayers);

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.data.warnings.some((w) => w.includes("capitão"))).toBe(
        true
      );
    }
  });

  it("deve ALERTAR se substituir o último jogador da posição", async () => {
    const onlyForward: Player = {
      id: 1,
      position: "FW",
      firstName: "Lone",
      lastName: "Striker",
    } as Player;

    const onFieldPlayers = [
      onlyForward,
      { id: 2, position: "MF" } as Player,
      { id: 3, position: "MF" } as Player,
    ];

    const result = await manager.canPlayerBeSubstituted(1, onFieldPlayers);

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.data.warnings.some((w) => w.includes("último"))).toBe(true);
    }
  });
});
