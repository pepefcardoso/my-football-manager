import { describe, it, expect, beforeEach, vi } from "vitest";
import { InfrastructureService } from "../services/InfrastructureService";
import {
  InfrastructureCalculator,
  InfrastructureEconomics,
} from "../engine/InfrastructureEconomics";
import { InfrastructureValidator } from "../domain/validators/InfrastructureValidator";
import { Result } from "../domain/ServiceResults";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import type { Team } from "../domain/models";

describe("InfrastructureService", () => {
  let service: InfrastructureService;
  let mockRepos: IRepositoryContainer;

  const mockTeam: Team = {
    id: 1,
    name: "Test FC",
    shortName: "TFC",
    budget: 10000000,
    stadiumCapacity: 15000,
    stadiumQuality: 60,
    trainingCenterQuality: 55,
    youthAcademyQuality: 50,
    fanBase: 50000,
    fanSatisfaction: 70,
    reputation: 5000,
  } as Team;

  beforeEach(() => {
    mockRepos = {
      teams: {
        findById: vi.fn().mockResolvedValue(mockTeam),
        update: vi.fn().mockResolvedValue(undefined),
      },
      players: {
        findByTeamId: vi.fn().mockResolvedValue([]),
      },
      financial: {
        addRecord: vi.fn().mockResolvedValue(undefined),
      },
    } as any;

    service = new InfrastructureService(mockRepos);
  });

  describe("InfrastructureCalculator", () => {
    it("should calculate expansion cost correctly", () => {
      const cost = InfrastructureCalculator.calculateExpansionCost(
        15000,
        1000,
        60
      );

      expect(cost).toBeGreaterThan(0);
      expect(cost).toBe(Math.round(cost)); // Should be integer
    });

    it("should calculate higher cost for larger stadiums", () => {
      const smallStadiumCost = InfrastructureCalculator.calculateExpansionCost(
        10000,
        1000,
        50
      );

      const largeStadiumCost = InfrastructureCalculator.calculateExpansionCost(
        40000,
        1000,
        50
      );

      expect(largeStadiumCost).toBeGreaterThan(smallStadiumCost);
    });

    it("should calculate quality upgrade cost with exponential scaling", () => {
      const lowQualityCost =
        InfrastructureCalculator.calculateQualityUpgradeCost("stadium", 40);

      const highQualityCost =
        InfrastructureCalculator.calculateQualityUpgradeCost("stadium", 80);

      expect(highQualityCost).toBeGreaterThan(lowQualityCost);
      expect(highQualityCost / lowQualityCost).toBeGreaterThan(2); // Exponential growth
    });

    it("should calculate annual maintenance correctly", () => {
      const maintenance = InfrastructureCalculator.calculateAnnualMaintenance(
        "stadium",
        20000,
        70,
        { matchesPlayed: 19 }
      );

      expect(maintenance).toBeGreaterThan(0);

      // Should be reasonable (not astronomical)
      expect(maintenance).toBeLessThan(5000000);
    });

    it("should project fan base growth correctly", () => {
      const currentFanBase = 30000;
      const projectedFanBase = InfrastructureCalculator.projectFanBaseGrowth(
        currentFanBase,
        15000,
        70,
        80,
        1 // Champion
      );

      expect(projectedFanBase).toBeGreaterThan(currentFanBase);

      // Growth should be reasonable (not 10x in one year)
      expect(projectedFanBase / currentFanBase).toBeLessThan(1.3);
    });

    it("should project negative growth for relegation teams", () => {
      const currentFanBase = 30000;
      const projectedFanBase = InfrastructureCalculator.projectFanBaseGrowth(
        currentFanBase,
        15000,
        50,
        30, // Low satisfaction
        18 // Relegation zone
      );

      expect(projectedFanBase).toBeLessThan(currentFanBase);
    });

    it("should detect capacity pressure correctly", () => {
      const result = InfrastructureCalculator.calculateCapacityPressure(
        14500, // 96.67% utilization
        15000
      );

      expect(result.utilizationRate).toBeCloseTo(0.9667, 2);
      expect(result.isPressured).toBe(true);
      expect(result.satisfactionImpact).toBeLessThan(0);
    });

    it("should not flag pressure for lower utilization", () => {
      const result = InfrastructureCalculator.calculateCapacityPressure(
        12000, // 80% utilization
        15000
      );

      expect(result.isPressured).toBe(false);
      expect(result.satisfactionImpact).toBe(0);
    });
  });

  describe("InfrastructureValidator", () => {
    it("should reject upgrade when budget insufficient", () => {
      const context = {
        teamId: 1,
        facilityType: "stadium" as const,
        upgradeType: "expand_stadium" as const,
        currentBudget: 100000,
        currentValue: 15000,
        upgradeCost: 1000000,
        seasonId: 1,
      };

      const result = InfrastructureValidator.validateUpgrade(context);

      expect(result.isValid).toBe(false);
      expect(result.canAfford).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining("Orçamento insuficiente")
      );
    });

    it("should warn about low reserves", () => {
      const context = {
        teamId: 1,
        facilityType: "stadium" as const,
        upgradeType: "expand_stadium" as const,
        currentBudget: 1200000,
        currentValue: 15000,
        upgradeCost: 1000000,
        seasonId: 1,
        monthlyOperatingCosts: 100000,
      };

      const result = InfrastructureValidator.validateUpgrade(context);

      // Should have warnings about low reserve
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.warnings.some((w) => w.includes("meses de custos operacionais"))
      ).toBe(true);
    });

    it("should reject expansion beyond max capacity", () => {
      const context = {
        teamId: 1,
        facilityType: "stadium" as const,
        upgradeType: "expand_stadium" as const,
        currentBudget: 10000000,
        currentValue: 74500, // Near max
        upgradeCost: 1000000,
        seasonId: 1,
      };

      const result = InfrastructureValidator.validateUpgrade(context);

      expect(result.isValid).toBe(false);
      expect(result.withinLimits).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining("Capacidade máxima")
      );
    });

    it("should reject quality upgrade at max level", () => {
      const context = {
        teamId: 1,
        facilityType: "training" as const,
        upgradeType: "upgrade_training_quality" as const,
        currentBudget: 5000000,
        currentValue: 100, // Already max
        upgradeCost: 500000,
        seasonId: 1,
      };

      const result = InfrastructureValidator.validateUpgrade(context);

      expect(result.isValid).toBe(false);
      expect(result.withinLimits).toBe(false);
    });

    it("should provide recommendations for stadium expansion", () => {
      const result = InfrastructureValidator.validateExpansion(
        15000,
        5000000,
        14200, // 94.67% utilization
        1000000
      );

      expect(result.isValid).toBe(true);
      expect(result.isRecommended).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should warn against expansion with low utilization", () => {
      const result = InfrastructureValidator.validateExpansion(
        20000,
        5000000,
        12000, // 60% utilization
        1000000
      );

      expect(
        result.warnings.some((w) => w.includes("Taxa de ocupação baixa"))
      ).toBe(true);
      expect(result.isRecommended).toBe(false);
    });
  });

  describe("InfrastructureService Integration", () => {
    it("should get comprehensive infrastructure status", async () => {
      const result = await service.getInfrastructureStatus(1);

      expect(Result.isSuccess(result)).toBe(true);

      if (Result.isSuccess(result)) {
        const status = result.data;

        expect(status.stadium).toBeDefined();
        expect(status.trainingCenter).toBeDefined();
        expect(status.youthAcademy).toBeDefined();
        expect(status.fanBase).toBeDefined();
        expect(status.financialHealth).toBeDefined();

        expect(status.stadium.capacity).toBe(15000);
        expect(status.stadium.quality).toBe(60);
        expect(status.totalMonthlyCost).toBeGreaterThan(0);
      }
    });

    it("should successfully expand stadium with sufficient budget", async () => {
      const result = await service.expandStadium(1, 1);

      expect(Result.isSuccess(result)).toBe(true);

      if (Result.isSuccess(result)) {
        const upgrade = result.data;

        expect(upgrade.success).toBe(true);
        expect(upgrade.newValue).toBe(
          mockTeam.stadiumCapacity +
            InfrastructureEconomics.STADIUM.EXPANSION.SEATS_PER_BLOCK
        );
        expect(upgrade.costPaid).toBeGreaterThan(0);
        expect(mockRepos.teams.update).toHaveBeenCalled();
        expect(mockRepos.financial.addRecord).toHaveBeenCalled();
      }
    });

    it("should reject expansion with insufficient budget", async () => {
      mockRepos.teams.findById = vi.fn().mockResolvedValue({
        ...mockTeam,
        budget: 100000, // Too low
      });

      const result = await service.expandStadium(1, 1);

      expect(Result.isFailure(result)).toBe(true);

      if (Result.isFailure(result)) {
        expect(result.error.message).toContain("Orçamento insuficiente");
      }
    });

    it("should upgrade facility quality correctly", async () => {
      const result = await service.upgradeFacilityQuality(1, 1, "training");

      expect(Result.isSuccess(result)).toBe(true);

      if (Result.isSuccess(result)) {
        const upgrade = result.data;

        expect(upgrade.success).toBe(true);
        expect(upgrade.facilityType).toBe("training");
        expect(upgrade.newValue).toBeGreaterThan(upgrade.previousValue);
        expect(mockRepos.teams.update).toHaveBeenCalled();
      }
    });

    it("should analyze capacity and provide recommendations", async () => {
      const result = await service.analyzeCapacity(1);

      expect(Result.isSuccess(result)).toBe(true);

      if (Result.isSuccess(result)) {
        const analysis = result.data;

        expect(analysis.currentCapacity).toBe(15000);
        expect(analysis.utilizationRate).toBeGreaterThan(0);
        expect(analysis.projectedROI).toBeDefined();
        expect(analysis.projectedROI.paybackMonths).toBeGreaterThan(0);
      }
    });

    it("should project fan base with growth factors", async () => {
      const result = await service.projectFanBase(1, 3); // Top 3 finish

      expect(Result.isSuccess(result)).toBe(true);

      if (Result.isSuccess(result)) {
        const projection = result.data;

        expect(projection.projectedFanBase).toBeGreaterThan(
          projection.currentFanBase
        );
        expect(projection.growthRate).toBeGreaterThan(0);
        expect(projection.factors.successBonus).toBeGreaterThan(0);
      }
    });
  });

  describe("Economics Validation", () => {
    it("should have realistic maintenance costs", () => {
      const smallStadium = InfrastructureCalculator.calculateAnnualMaintenance(
        "stadium",
        10000,
        50
      );

      const largeStadium = InfrastructureCalculator.calculateAnnualMaintenance(
        "stadium",
        50000,
        80
      );

      // Small stadium: ~€500k-1M per year
      expect(smallStadium).toBeGreaterThan(200000);
      expect(smallStadium).toBeLessThan(2000000);

      // Large stadium: ~€2-5M per year
      expect(largeStadium).toBeGreaterThan(1000000);
      expect(largeStadium).toBeLessThan(10000000);
    });

    it("should have balanced expansion costs", () => {
      const tier2Cost = InfrastructureCalculator.calculateExpansionCost(
        20000,
        1000,
        60
      );

      // Should be €500k-2M for mid-tier expansion
      expect(tier2Cost).toBeGreaterThan(400000);
      expect(tier2Cost).toBeLessThan(3000000);
    });

    it("should enforce FFP-compliant spending limits", () => {
      const annualRevenue = 20000000; // €20M
      const maxInfraSpend =
        annualRevenue *
        InfrastructureEconomics.VALIDATION.MAX_ANNUAL_INFRASTRUCTURE_SPEND;

      // Max should be 25% of revenue = €5M
      expect(maxInfraSpend).toBe(5000000);
    });
  });
});
