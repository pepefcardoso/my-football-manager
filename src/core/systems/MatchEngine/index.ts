import { Match } from "../../models/match";
import { DetailedMatchStrategy } from "./DetailedMatchStrategy";
import {
  IMatchSimulationStrategy,
  MatchEngineResult,
  TeamMatchContext,
} from "./types";
import { logger } from "../../utils/logger";

class MatchEngine {
  private strategy: IMatchSimulationStrategy;

  constructor() {
    this.strategy = new DetailedMatchStrategy();
  }

  public setStrategy(strategy: IMatchSimulationStrategy) {
    this.strategy = strategy;
  }

  public simulate(
    match: Match,
    home: TeamMatchContext,
    away: TeamMatchContext
  ): MatchEngineResult {
    logger.info("MatchEngine",
      `Simulando ${home.clubName} vs ${away.clubName} com ${this.strategy.constructor.name}...`
    );
    return this.strategy.simulate(match, home, away);
  }
}

export const matchEngine = new MatchEngine();
export * from "./types";