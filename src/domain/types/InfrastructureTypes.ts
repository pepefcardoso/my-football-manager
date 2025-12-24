export type FacilityType =
  | "stadium_capacity"
  | "stadium_quality"
  | "training_center_quality"
  | "youth_academy_quality"
  | "medical_center_quality"
  | "administrative_center_quality";

export interface TeamInfrastructure {
  stadiumCapacity: number;
  stadiumQuality: number;
  trainingCenterQuality: number;
  youthAcademyQuality: number;
  medicalCenterQuality: number;
  administrativeCenterQuality: number;
}

export interface ActiveConstruction {
  facilityType: FacilityType;
  startLevel: number;
  targetLevel: number;
  cost: number;
  startDate: string;
  endDate: string;
  daysRemaining: number;
}

export interface MedicalCenterBenefits {
  injuryChanceReduction: number;
  recoverySpeedBonus: number;
  description: string;
}

export interface AdminCenterBenefits {
  sponsorshipBonus: number;
  scoutingEfficiency: number;
  description: string;
}

export interface TrainingCenterBenefits {
  xpMultiplier: number;
  description: string;
}

export interface YouthAcademyBenefits {
  minPotentialBonus: number;
  maxPotentialBonus: number;
  description: string;
}

export interface StadiumBenefits {
  ticketPriceBonus: number;
  attendanceBonus: number;
  description: string;
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
}

export interface UpgradeValidationContext {
  upgradeType: string;
  currentValue: number;
  upgradeCost: number;
  currentBudget: number;
  hasActiveConstruction: boolean;
  teamReputation: number;
}

export interface UpgradeValidationResult {
  isValid: boolean;
  canAfford: boolean;
  meetsPrerequisites: boolean;
  withinLimits: boolean;
  errors: string[];
  warnings: string[];
}