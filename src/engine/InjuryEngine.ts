import { RandomEngine } from "./RandomEngine";

export class InjuryEngine {
  static generateInjuryDuration(
    severity: "light" | "moderate" | "severe",
    medicalMultiplier: number = 1.0
  ): number {
    let baseDuration = 0;

    switch (severity) {
      case "light":
        baseDuration = RandomEngine.getInt(3, 10);
        break;
      case "moderate":
        baseDuration = RandomEngine.getInt(14, 35);
        break;
      case "severe":
        baseDuration = RandomEngine.getInt(60, 150);
        break;
    }

    return Math.max(1, Math.round(baseDuration * medicalMultiplier));
  }
}
