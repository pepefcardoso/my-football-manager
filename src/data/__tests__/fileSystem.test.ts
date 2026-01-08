import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as FileSystem from "../fileSystem";
import { GameState } from "../../core/models/gameState";

const createMockGameState = (): GameState =>
  ({
    meta: {
      version: "2.0.0",
      saveName: "Test Save",
      currentDate: Date.now(),
      currentUserManagerId: "manager-1",
      userClubId: "club-1",
      activeSeasonId: "season-1",
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
      // Note o aninhamento: clubs.clubs
      clubs: { "club-1": { id: "club-1", name: "Test FC" } } as any,
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
      rules: { classification: {}, prizes: {} },
    },
    matches: {
      matches: {},
      events: {},
      playerStats: {},
      formations: {},
      positions: {},
      teamTactics: {},
    },
    market: {
      contracts: {},
      staffContracts: {},
      clubManagers: {},
      transferOffers: {},
      loans: {},
      scoutingKnowledge: {},
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
      stats: { playerSeason: {} },
    },
  } as GameState);

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    length: 0,
    key: vi.fn((i: number) => Object.keys(store)[i] || null),
  };
})();

const electronAPIMock = {
  saveGame: vi.fn(),
  loadGame: vi.fn(),
  listSaves: vi.fn(),
  deleteSave: vi.fn(),
  getSaveInfo: vi.fn(),
  openSavesFolder: vi.fn(),
};

describe("FileSystem Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("Web Mode (LocalStorage)", () => {
    beforeEach(() => {
      delete (window as any).electronAPI;
    });

    it("should save game correctly to localStorage", async () => {
      // Arrange
      const state = createMockGameState();
      const saveName = "web-save-01";

      // Act
      const result = await FileSystem.saveGameToDisk(saveName, state);

      // Assert
      expect(result.success).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        expect.stringContaining(saveName),
        expect.stringContaining("Test FC")
      );
    });

    it("should load game correctly from localStorage", async () => {
      // Arrange
      const state = createMockGameState();
      const saveName = "web-save-01";

      await FileSystem.saveGameToDisk(saveName, state);

      // Act
      const loadedState = await FileSystem.loadGameFromDisk(saveName);

      // Assert
      expect(loadedState).not.toBeNull();
      expect(loadedState?.meta.saveName).toBe("Test Save");
    });

    it("should return null when loading non-existent save", async () => {
      // Act
      const result = await FileSystem.loadGameFromDisk("ghost-save");

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("Electron Mode", () => {
    beforeEach(() => {
      (window as any).electronAPI = electronAPIMock;
    });

    it("should delegate save to electronAPI", async () => {
      // Arrange
      const state = createMockGameState();
      const saveName = "desktop-save";

      electronAPIMock.saveGame.mockResolvedValue({
        success: true,
        metadata: { size: 1024, checksum: "abc" },
      });

      // Act
      const result = await FileSystem.saveGameToDisk(saveName, state);

      // Assert
      expect(result.success).toBe(true);
      expect(electronAPIMock.saveGame).toHaveBeenCalledWith(
        saveName,
        expect.any(String)
      );
    });

    it("should handle save errors gracefully", async () => {
      // Arrange
      electronAPIMock.saveGame.mockRejectedValue(new Error("Disk full"));

      // Act
      const result = await FileSystem.saveGameToDisk(
        "fail-save",
        createMockGameState()
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Disk full");
    });

    it("should validate loaded data structure", async () => {
      // Arrange
      const invalidData = JSON.stringify({ foo: "bar" });

      electronAPIMock.loadGame.mockResolvedValue({
        success: true,
        data: invalidData,
      });

      // Act
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const result = await FileSystem.loadGameFromDisk("corrupted-save");

      // Assert
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
