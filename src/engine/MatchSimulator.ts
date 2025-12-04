import { MatchEngine } from "./MatchEngine";
import type { MatchConfig, MatchResult, SimTeam } from "../domain/types";
import type { Player } from "../domain/models";

export class MatchSimulator {
  static simulate(homeTeam: SimTeam, awayTeam: SimTeam): MatchResult {
    const config: MatchConfig = {
      homeTeam: homeTeam as any,
      awayTeam: awayTeam as any,
      homePlayers: homeTeam.players as unknown as Player[],
      awayPlayers: awayTeam.players as unknown as Player[],
      weather: "cloudy"
    };

    const engine = new MatchEngine(config);

    engine.start();

    while (engine.getCurrentMinute() < 90) {
      engine.simulateMinute();
    }

    return engine.getMatchResult();
  }
}
