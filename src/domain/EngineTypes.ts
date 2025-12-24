export type EnginePosition = "GK" | "DF" | "MF" | "FW";

export interface EngineAttributes {
  finishing: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  pace: number;
  shooting: number;
}

export interface EngineCondition {
  energy: number;
  fitness: number;
  moral: number;
}

export interface EnginePlayer {
  id: string;
  position: EnginePosition;
  overall: number;
  skills: EngineAttributes;
  condition: EngineCondition;
}

export interface EngineTeam {
  id: string;
  tacticalBonus: number;
  players: EnginePlayer[];
}

export interface EngineEnvironment {
  weather: "sunny" | "rainy" | "cloudy" | "windy" | "snowy";
  isHomeGame: boolean;
}
