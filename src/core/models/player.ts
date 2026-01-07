import { Player } from "./people";

export class PlayerCalculations {
  static calculateOverall(player: Player): number {
    const attrs = [
      player.crossing,
      player.finishing,
      player.passing,
      player.technique,
      player.defending,
      player.speed,
      player.force,
      player.stamina,
      player.intelligence,
      player.determination,
    ];

    if (player.primaryPositionId === "GK") {
      attrs.push(player.gkReflexes, player.gkRushingOut, player.gkDistribution);
    }

    attrs.sort((a, b) => b - a);
    const top5 = attrs.slice(0, 5);

    return Math.floor(top5.reduce((a, b) => a + b, 0) / 5);
  }
}
