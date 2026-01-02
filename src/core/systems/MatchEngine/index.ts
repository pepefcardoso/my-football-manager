import { Match } from "../../models/match";
import { QuickMatchStrategy } from "./QuickMatchStrategy";
import {
  IMatchSimulationStrategy,
  MatchEngineResult,
  TeamMatchContext,
} from "./types";

class MatchEngine {
  private strategy: IMatchSimulationStrategy;

  constructor() {
    // TODO: Futuramente podemos ler de Settings: if (settings.fullSim) use DetailedStrategy
    this.strategy = new QuickMatchStrategy();
  }

  public setStrategy(strategy: IMatchSimulationStrategy) {
    this.strategy = strategy;
  }

  public simulate(
    match: Match,
    home: TeamMatchContext,
    away: TeamMatchContext
  ): MatchEngineResult {
    console.log(
      `[MatchEngine] Simulando ${home.clubName} vs ${away.clubName}...`
    );
    return this.strategy.simulate(match, home, away);
  }
}

export const matchEngine = new MatchEngine();
export * from "./types";
