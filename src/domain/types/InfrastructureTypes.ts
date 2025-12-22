export type FacilityType =
  | "stadium_capacity"
  | "stadium_quality"
  | "training"
  | "medical"
  | "youth"
  | "admin";

export interface ActiveConstruction {
  facilityType: FacilityType;
  startLevel: number;
  targetLevel: number;
  cost: number;
  startDate: string;
  endDate: string;
  daysRemaining: number;
}

export interface FacilityStatus {
  type: FacilityType;
  name: string;
  currentLevel: number;
  nextLevel: number;
  upgradeCost: number;
  monthlyMaintenance: number;
  constructionDuration: number;
  isMaxLevel: boolean;
  isUpgrading: boolean;
  currentBenefit: string;
  nextBenefit: string;
}

export interface InfrastructureOverview {
  teamId: number;
  budget: number;
  facilities: Record<FacilityType, FacilityStatus>;
  activeConstruction: ActiveConstruction | null;
  totalMaintenanceCost: number;
  projectedMaintenanceAfterUpgrade?: number;
}

export interface UpgradeValidationResult {
  allowed: boolean;
  reason?: string;
  cost: number;
  newBudget: number;
}
