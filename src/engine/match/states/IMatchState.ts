import { MatchState } from "../../../domain/enums";

/**
 * Interface que define o contrato para todos os estados da partida.
 * Cada estado concreto implementa este contrato de forma específica.
 */
export interface IMatchState {
  /**
   * Retorna o enum correspondente ao estado para consumo da UI/Banco de Dados
   */
  getStateEnum(): MatchState;

  /**
   * Inicia a partida (Válido apenas em NotStarted)
   */
  start(): void;

  /**
   * Pausa a simulação (Válido apenas em Playing)
   */
  pause(): void;

  /**
   * Retoma a simulação (Válido apenas em Paused)
   */
  resume(): void;

  /**
   * Executa a lógica de um minuto de jogo
   */
  simulateMinute(): void;
}
