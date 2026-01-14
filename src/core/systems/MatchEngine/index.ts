import { Match } from "../../models/match";
import { DetailedMatchStrategy } from "./DetailedMatchStrategy";
import {
  IMatchSimulationStrategy,
  MatchEngineResult,
  TeamMatchContext,
} from "./types";
import { logger } from "../../utils/Logger";

class MatchEngine {
  private strategy: IMatchSimulationStrategy;

  constructor() {
    this.strategy = new DetailedMatchStrategy();
  }

  public setStrategy(strategy: IMatchSimulationStrategy) {
    this.strategy = strategy;
  }

  public async simulate(
    match: Match,
    home: TeamMatchContext,
    away: TeamMatchContext
  ): Promise<MatchEngineResult> {
    logger.info(
      "MatchEngine",
      `Simulando ${home.clubName} vs ${away.clubName} com ${this.strategy.constructor.name}...`
    );
    return await this.strategy.simulate(match, home, away);
  }
}

export const matchEngine = new MatchEngine();
export * from "./types";
