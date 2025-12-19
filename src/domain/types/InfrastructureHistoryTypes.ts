export interface InfrastructureSnapshot {
  id: number;
  teamId: number;
  date: string;
  seasonId: number;
  stadiumCapacity: number;
  stadiumQuality: number;
  trainingQuality: number;
  youthQuality: number;
  fanBase: number;
  monthlyMaintenanceCost: number;
  averageAttendance: number;
  utilizationRate: number;
}

export interface InfrastructureEvolutionData {
  snapshots: InfrastructureSnapshot[];
  trends: {
    stadiumCapacity: TrendAnalysis;
    stadiumQuality: TrendAnalysis;
    trainingQuality: TrendAnalysis;
    youthQuality: TrendAnalysis;
    fanBase: TrendAnalysis;
    utilizationRate: TrendAnalysis;
  };
  milestones: InfrastructureMilestone[];
}

export interface TrendAnalysis {
  direction: "increasing" | "stable" | "decreasing";
  changePercent: number;
  startValue: number;
  endValue: number;
  averageValue: number;
}

export interface InfrastructureMilestone {
  date: string;
  type: "expansion" | "upgrade" | "milestone";
  facilityType: "stadium" | "training" | "youth";
  description: string;
  value: number;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}
