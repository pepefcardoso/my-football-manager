export type FacilityType =
  | "stadium"
  | "training"
  | "youth"
  | "medical"
  | "admin";

export type UpgradeType =
  | "expand_stadium"
  | "upgrade_stadium_quality"
  | "upgrade_training_quality"
  | "upgrade_youth_quality"
  | "upgrade_medical_quality"
  | "upgrade_admin_quality";

export interface InfrastructureStatus {
  stadium: {
    capacity: number;
    quality: number;
    monthlyMaintenanceCost: number;
    nextExpansionCost: number;
    nextQualityUpgradeCost: number;
  };

  trainingCenter: {
    quality: number;
    injuryReductionRate: number;
    fitnessBonus: number;
    recoverySpeedMultiplier: number;
    developmentBonus: number;
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
    monthlyMaintenanceCost: number;
    nextUpgradeCost: number;
    upgradeRecommended: boolean;
  };

  medicalCenter: {
    quality: number;
    injuryPreventionBonus: number;
    recoverySpeedBonus: number;
    monthlyMaintenanceCost: number;
    nextUpgradeCost: number;
    upgradeRecommended: boolean;
  };

  administrativeCenter: {
    quality: number;
    marketingBonus: number;
    scoutingSpeedBonus: number;
    monthlyMaintenanceCost: number;
    nextUpgradeCost: number;
    upgradeRecommended: boolean;
  };

  activeConstruction: {
    isBusy: boolean;
    facilityType?: FacilityType;
    targetLevel?: number;
    targetCapacity?: number;
    daysRemaining?: number;
    endDate?: string;
  } | null;

  totalAnnualCost: number;
  totalMonthlyCost: number;

  fanBase: {
    current: number;
    capacityRatio: number;
  };
}

export interface UpgradeResult {
  success: boolean;
  facilityType: FacilityType;
  upgradeType: UpgradeType;
  costPaid: number;
  newValue: number;
  previousValue: number;
  message: string;
  warnings?: string[];
  constructionStarted?: boolean;
  daysToComplete?: number;
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
  hasActiveConstruction?: boolean;
}

export interface UpgradeValidationResult {
  isValid: boolean;
  canAfford: boolean;
  meetsPrerequisites: boolean;
  withinLimits: boolean;
  errors: string[];
  warnings: string[];
}
