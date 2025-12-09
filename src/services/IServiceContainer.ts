import type { CalendarService } from "./CalendarService";
import type { ContractService } from "./ContractService";
import type { DailySimulationService } from "./DailySimulationService";
import type { FinanceService } from "./FinanceService";
import type { InfrastructureService } from "./InfrastructureService";
import type { MarketingService } from "./MarketingService";
import type { MatchService } from "./MatchService";
import type { PlayerService } from "./PlayerService";
import type { ScoutingService } from "./ScoutingService";
import type { SeasonService } from "./SeasonService";
import type { StaffService } from "./StaffService";
import type { StatsService } from "./StatsService";

export interface IServiceContainer {
  calendar: CalendarService;
  contract: ContractService;
  dailySimulation: DailySimulationService;
  finance: FinanceService;
  infrastructure: InfrastructureService;
  marketing: MarketingService;
  match: MatchService;
  player: PlayerService;
  scouting: ScoutingService;
  season: SeasonService;
  staff: StaffService;
  stats: StatsService;
}
