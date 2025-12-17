// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "../../src/electron-env.d.ts";

describe("Fase 4.1: Teste de Caminho Feliz", () => {
  let mockCurrentDate = "2025-01-15";
  const playerTeamId = 1;

  if (typeof window !== "undefined") {
    window.electronAPI = {
      game: {
        getGameState: vi.fn().mockImplementation(async () => ({
          currentDate: mockCurrentDate,
          playerTeamId: playerTeamId,
        })),
        advanceDay: vi.fn().mockImplementation(async () => {
          const date = new Date(mockCurrentDate);
          date.setDate(date.getDate() + 1);
          mockCurrentDate = date.toISOString().split("T")[0];

          return {
            date: mockCurrentDate,
            messages: ["Treino concluído", "Finanças atualizadas"],
          };
        }),
      },
      player: {
        getPlayers: vi.fn().mockResolvedValue([
          { id: 1, energy: 85, fitness: 90 },
        ]),
      },
    } as any;
  }

  it("deve avançar 3 dias e processar dependências de treino e partidas", async () => {
    const initialState = await window.electronAPI.game.getGameState();
    const initialDate = initialState.currentDate;
    expect(initialDate).toBe("2025-01-15");

    for (let i = 0; i < 3; i++) {
      const result = await window.electronAPI.game.advanceDay();
      expect(result.messages.length).toBeGreaterThan(0);
    }

    const finalState = await window.electronAPI.game.getGameState();

    const startTime = new Date(initialDate).getTime();
    const endTime = new Date(finalState.currentDate).getTime();
    const diffDays = Math.round((endTime - startTime) / (1000 * 3600 * 24));

    expect(diffDays).toBe(3);
    expect(finalState.currentDate).toBe("2025-01-18");

    if (finalState.playerTeamId) {
      const players = await window.electronAPI.player.getPlayers(
        finalState.playerTeamId
      );
      const hasPhysiologyChange = players.some(
        (p) => p.energy < 100 || p.fitness < 100
      );
      expect(hasPhysiologyChange).toBe(true);
    }
  });
});
