/**
 * Posições entendidas pelo motor de jogo.
 * String literal type para fácil comparação.
 */
export type EnginePosition = "GK" | "DF" | "MF" | "FW";

/**
 * Atributos técnicos e físicos utilizados nos cálculos.
 */
export interface EngineAttributes {
  finishing: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  pace: number;
  shooting: number;
}

/**
 * Estado atual do jogador relevante para uma partida ou treino.
 */
export interface EngineCondition {
  energy: number;
  fitness: number;
  moral: number;
}

/**
 * Representação puramente numérica de um jogador para o motor.
 * Sem nomes, fotos ou dados biográficos.
 */
export interface EnginePlayer {
  id: string;
  position: EnginePosition;
  overall: number;
  skills: EngineAttributes;
  condition: EngineCondition;
}

/**
 * Representação de um time para o motor.
 */
export interface EngineTeam {
  id: string;
  tacticalBonus: number;
  players: EnginePlayer[];
}

/**
 * Configuração de ambiente para cálculos.
 */
export interface EngineEnvironment {
  weather: "sunny" | "rainy" | "cloudy" | "windy" | "snowy";
  isHomeGame: boolean;
}
