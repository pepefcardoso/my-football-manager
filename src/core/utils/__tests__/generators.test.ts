import { describe, it, expect } from "vitest";
import { PlayerFactory } from "../generators";

describe("PlayerFactory", () => {
  it("should create a player with valid attributes range (1-99)", () => {
    // Arrange & Act
    const players = Array.from({ length: 50 }).map(() =>
      PlayerFactory.createPlayer("club-1", "nation-1", "ATT", 80)
    );

    // Assert
    players.forEach((player) => {
      expect(player.id).toBeDefined();
      expect(typeof player.id).toBe("string");

      const attributes = [
        player.finishing,
        player.passing,
        player.speed,
        player.stamina,
        player.determination,
      ];

      attributes.forEach((attr) => {
        expect(attr).toBeGreaterThanOrEqual(1);
        expect(attr).toBeLessThanOrEqual(99);
      });
    });
  });

  it("should generate unique IDs", () => {
    const player1 = PlayerFactory.createPlayer("c1", "n1", "GK");
    const player2 = PlayerFactory.createPlayer("c1", "n1", "GK");

    expect(player1.id).not.toBe(player2.id);
  });

  it("should calculate appropriate wages based on overall", () => {
    const wageLow = PlayerFactory.calculateWage(55);
    expect(wageLow).toBeLessThan(30000);

    const wageHigh = PlayerFactory.calculateWage(95);
    expect(wageHigh).toBeGreaterThan(1000000);
  });

  it("should boost relevant attributes based on position", () => {
    const striker = PlayerFactory.createPlayer("c1", "n1", "ATT", 80);
    const defender = PlayerFactory.createPlayer("c1", "n1", "DEF", 80);

    expect(striker.finishing).toBeGreaterThan(50);
    expect(defender.defending).toBeGreaterThan(50);
  });
});
