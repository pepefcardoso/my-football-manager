import { describe, it, expect, beforeEach, vi } from "vitest";
import { PlayerFactory, setGlobalRNG, IRNG, SeededRNG } from "../generators";

class MockRNG implements IRNG {
  next = vi.fn(() => 0.5);
  range = vi.fn((min, max) => Math.floor(0.5 * (max - min + 1)) + min);
  pick = vi.fn((arr) => arr[0]);
  normal = vi.fn((mean) => mean);
  setSeed = vi.fn();
}

describe("Generators System", () => {
  
  beforeEach(() => {
    setGlobalRNG(new SeededRNG(12345));
  });

  describe("SeededRNG (Real Implementation)", () => {
    it("should be deterministic with same seed", () => {
      const rng1 = new SeededRNG(999);
      const rng2 = new SeededRNG(999);

      expect(rng1.next()).toBe(rng2.next());
      expect(rng1.range(1, 100)).toBe(rng2.range(1, 100));
    });

    it("should diverge with different seeds", () => {
      const rng1 = new SeededRNG(1);
      const rng2 = new SeededRNG(2);

      expect(rng1.next()).not.toBe(rng2.next());
    });
  });

  describe("PlayerFactory (Using Global RNG)", () => {
    it("should use the injected RNG mechanism", () => {
      const mockRNG = new MockRNG();
      setGlobalRNG(mockRNG);

      mockRNG.range.mockReturnValue(20);
      mockRNG.normal.mockReturnValue(75);
      
      const player = PlayerFactory.createPlayer("c1", "n1", "ATT", 70);

      expect(mockRNG.range).toHaveBeenCalled();
      expect(player.id).toBeDefined();
    });

    it("should create valid players under normal seeded conditions", () => {
        const player = PlayerFactory.createPlayer("c1", "n1", "MID", 80);
        
        expect(player.overall).toBeGreaterThan(0);
        expect(player.overall).toBeLessThan(100);
        expect(player.primaryPositionId).toBe("MID");
    });
  });
});