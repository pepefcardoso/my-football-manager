export type FacilityType = "stadium" | "training" | "youth";

export type UpgradeType =
  | "expand_stadium"
  | "upgrade_stadium_quality"
  | "upgrade_training_quality"
  | "upgrade_youth_quality";

export interface InfrastructureStatus {
  stadium: {
    capacity: number;
    quality: number;
    utilizationRate: number;
    averageAttendance: number;
    revenuePerMatch: number;
    annualMaintenanceCost: number;
    monthlyMaintenanceCost: number;
    isPressured: boolean;
    expansionRecommended: boolean;
    nextExpansionCost: number;
    nextQualityUpgradeCost: number;
  };

  trainingCenter: {
    quality: number;
    injuryReductionRate: number;
    fitnessBonus: number;
    recoverySpeedMultiplier: number;
    developmentBonus: number;
    annualMaintenanceCost: number;
    monthlyMaintenanceCost: number;
    nextUpgradeCost: number;
    upgradeRecommended: boolean;
  };

  youthAcademy: {
    quality: number;
    intakeQualityBonus: number;
    intakeQuantityBonus: number;
    potentialBoost: number;
    developmentRate: number;
    currentYouthPlayers: number;
    annualMaintenanceCost: number;
    monthlyMaintenanceCost: number;
    nextUpgradeCost: number;
    upgradeRecommended: boolean;
  };

  totalAnnualCost: number;
  totalMonthlyCost: number;

  fanBase: {
    current: number;
    projected: number;
    growthRate: number;
    capacityRatio: number;
  };

  financialHealth: {
    canAffordUpgrades: boolean;
    recommendedReserve: number;
    availableBudget: number;
    infrastructureBudgetCap: number;
  };
}

export interface UpgradeResult {
  success: boolean;
  facilityType: FacilityType;
  upgradeType: UpgradeType;
  costPaid: number;
  newValue: number;
  previousValue: number;
  remainingBudget: number;
  message: string;
  warnings?: string[];
}

export interface UpgradeValidationContext {
  teamId: number;
  facilityType: FacilityType;
  upgradeType: UpgradeType;
  currentBudget: number;
  currentValue: number;
  upgradeCost: number;
  seasonId: number;
  annualRevenue?: number;
  monthlyOperatingCosts?: number;
}

export interface UpgradeValidationResult {
  isValid: boolean;
  canAfford: boolean;
  meetsPrerequisites: boolean;
  withinLimits: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export interface FanBaseProjection {
  currentFanBase: number;
  projectedFanBase: number;
  growthRate: number;
  factors: {
    organicGrowth: number;
    successBonus: number;
    satisfactionImpact: number;
    stadiumQualityBonus: number;
  };
  recommendations: string[];
}

export interface CapacityAnalysis {
  currentCapacity: number;
  averageAttendance: number;
  utilizationRate: number;
  isPressured: boolean;
  lostRevenue: number;
  satisfactionImpact: number;
  recommendedExpansion: number;
  expansionCost: number;
  projectedROI: {
    annualRevenueIncrease: number;
    paybackMonths: number;
    breakEvenDate: string;
  };
}

export interface InvestmentAnalysis {
  facilityType: FacilityType;
  investmentCost: number;
  annualBenefit: number;
  paybackPeriod: number;
  netPresentValue: number;
  internalRateOfReturn: number;
  recommendation:
    | "highly_recommended"
    | "recommended"
    | "neutral"
    | "not_recommended";
  reasoning: string[];
}

export interface MonthlyInfrastructureReport {
  reportDate: string;
  facilities: {
    stadium: {
      capacity: number;
      quality: number;
      attendance: number;
      revenue: number;
      maintenanceCost: number;
    };
    training: {
      quality: number;
      maintenanceCost: number;
      injuries: number;
      injuryReduction: number;
    };
    youth: {
      quality: number;
      maintenanceCost: number;
      activeYouthPlayers: number;
    };
  };
  totalCosts: number;
  totalRevenue: number;
  netImpact: number;
  alerts: string[];
  recommendations: string[];
}
