import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import type { ServiceResult } from "../../domain/ServiceResults";
import { MatchState } from "../../domain/enums";
import type { Player } from "../../domain/models";

export interface SubstitutionRequest {
  matchId: number;
  isHome: boolean;
  playerOutId: number;
  playerInId: number;
}

export interface ValidatedSubstitution extends SubstitutionRequest {
  playerOut: Player;
  playerIn: Player;
  substitutionNumber: number;
}

export interface MatchSubstitutionState {
  matchId: number;
  homeSubstitutionsUsed: number;
  awaySubstitutionsUsed: number;
  homeSubstitutions: SubstitutionRecord[];
  awaySubstitutions: SubstitutionRecord[];
}

export interface SubstitutionRecord {
  minute: number;
  playerOutId: number;
  playerInId: number;
  timestamp: string;
}

export const FIFA_SUBSTITUTION_RULES = {
  MAX_SUBSTITUTIONS: 5,
  ALLOWED_STATES: [MatchState.PAUSED, MatchState.NOT_STARTED] as const,
  REQUIRES_PAUSE: true,
  MIN_PLAYERS_ON_FIELD: 7,
} as const;

export class MatchSubstitutionManager extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "MatchSubstitutionManager");
  }

  /**
   * @param request - Dados da substituição solicitada
   * @param currentState - Estado atual da partida
   * @param onFieldPlayers - Jogadores atualmente em campo
   * @param benchPlayers - Jogadores no banco
   * @param substitutionsUsed - Número de substituições já realizadas
   * @returns ServiceResult com substituição validada ou erro detalhado
   */
  async validateSubstitution(
    request: SubstitutionRequest,
    currentState: MatchState,
    onFieldPlayers: Player[],
    benchPlayers: Player[],
    substitutionsUsed: number
  ): Promise<ServiceResult<ValidatedSubstitution>> {
    return this.execute(
      "validateSubstitution",
      request,
      async ({ matchId, isHome, playerOutId, playerInId }) => {
        const isValidState = FIFA_SUBSTITUTION_RULES.ALLOWED_STATES.some(
          (state) => state === currentState
        );

        if (!isValidState) {
          throw new Error(
            `Substituições só podem ser realizadas com a partida pausada. Estado atual: ${currentState}`
          );
        }

        if (substitutionsUsed >= FIFA_SUBSTITUTION_RULES.MAX_SUBSTITUTIONS) {
          throw new Error(
            `Limite de ${
              FIFA_SUBSTITUTION_RULES.MAX_SUBSTITUTIONS
            } substituições atingido para o time ${
              isHome ? "mandante" : "visitante"
            }.`
          );
        }

        const playerOut = await this.repos.players.findById(playerOutId);
        if (!playerOut) {
          throw new Error(`Jogador #${playerOutId} não encontrado.`);
        }

        const playerIn = await this.repos.players.findById(playerInId);
        if (!playerIn) {
          throw new Error(`Jogador #${playerInId} não encontrado.`);
        }

        const isOnField = onFieldPlayers.some((p) => p.id === playerOutId);
        if (!isOnField) {
          throw new Error(
            `${playerOut.firstName} ${playerOut.lastName} não está em campo.`
          );
        }

        const isOnBench = benchPlayers.some((p) => p.id === playerInId);
        if (!isOnBench) {
          throw new Error(
            `${playerIn.firstName} ${playerIn.lastName} não está no banco de reservas.`
          );
        }

        if (playerIn.isInjured) {
          throw new Error(
            `${playerIn.firstName} ${playerIn.lastName} está lesionado e não pode entrar.`
          );
        }

        if (playerOutId === playerInId) {
          throw new Error(
            "Não é possível substituir um jogador por ele mesmo."
          );
        }

        const playersAfterSub = onFieldPlayers.length - 1 + 1;
        if (playersAfterSub < FIFA_SUBSTITUTION_RULES.MIN_PLAYERS_ON_FIELD) {
          throw new Error(
            `Time precisa ter no mínimo ${FIFA_SUBSTITUTION_RULES.MIN_PLAYERS_ON_FIELD} jogadores em campo.`
          );
        }

        this.logger.info(
          `✅ Substituição validada: ${playerOut.firstName} ➡️ ${
            playerIn.firstName
          } (${substitutionsUsed + 1}/${
            FIFA_SUBSTITUTION_RULES.MAX_SUBSTITUTIONS
          })`
        );

        return {
          matchId,
          isHome,
          playerOutId,
          playerInId,
          playerOut,
          playerIn,
          substitutionNumber: substitutionsUsed + 1,
        };
      }
    );
  }

  /**
   * @param matchId - ID da partida
   * @param validated - Dados validados da substituição
   * @param currentMinute - Minuto atual da partida
   */
  async recordSubstitution(
    matchId: number,
    validated: ValidatedSubstitution,
    currentMinute: number
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "recordSubstitution",
      { matchId, validated, currentMinute },
      async ({ matchId, validated, currentMinute }) => {
        await this.repos.matches.createMatchEvents([
          {
            matchId,
            minute: currentMinute,
            type: "substitution",
            teamId: null, // TODO INSERIR O teamId
            playerId: validated.playerInId,
            description: `🔄 Substituição: Sai ${validated.playerOut.firstName} ${validated.playerOut.lastName}, entra ${validated.playerIn.firstName} ${validated.playerIn.lastName}.`,
          },
        ]);

        this.logger.info(
          `📝 Substituição registrada na base de dados: Match ${matchId}, Minuto ${currentMinute}`
        );
      }
    );
  }

  /**
   * @param matchId - ID da partida
   * @returns Lista de substituições realizadas
   */
  async getSubstitutionHistory(
    matchId: number
  ): Promise<ServiceResult<SubstitutionRecord[]>> {
    return this.execute("getSubstitutionHistory", matchId, async (matchId) => {
      const match = await this.repos.matches.findById(matchId);
      if (!match) {
        throw new Error(`Partida ${matchId} não encontrada.`);
      }

      // TODO índice otimizado para isso
      // TODO adicionar tabela `match_substitutions`

      this.logger.debug(
        `Histórico de substituições da partida ${matchId} recuperado.`
      );

      return []; // Placeholder
    });
  }

  /**
   * @param teamId - ID do time para análise
   * @param seasonId - ID da temporada
   * @returns Estatísticas agregadas
   */
  async analyzeSubstitutionImpact(
    teamId: number,
    seasonId: number
  ): Promise<ServiceResult<any>> {
    return this.execute(
      "analyzeSubstitutionImpact",
      { teamId, seasonId },
      async ({ teamId, seasonId }) => {
        this.logger.info(
          `📊 Análise de impacto de substituições: Time ${teamId}, Temporada ${seasonId}`
        );

        return {
          averageSubstitutionsPerMatch: 0,
          averageSubstitutionMinute: 0,
          impactScore: 0,
        };
      }
    );
  }

  /**
   * @param playerId - ID do jogador
   * @param onFieldPlayers - Jogadores atualmente em campo
   * @returns ServiceResult com warnings/bloqueios
   */
  async canPlayerBeSubstituted(
    playerId: number,
    onFieldPlayers: Player[]
  ): Promise<ServiceResult<{ allowed: boolean; warnings: string[] }>> {
    return this.execute(
      "canPlayerBeSubstituted",
      { playerId, onFieldPlayers },
      async ({ playerId, onFieldPlayers }) => {
        const warnings: string[] = [];
        const allowed = true;

        const player = onFieldPlayers.find((p) => p.id === playerId);
        if (!player) {
          throw new Error("Jogador não está em campo.");
        }

        if (player.position === "GK") {
          const otherGoalkeepers = onFieldPlayers.filter(
            (p) => p.position === "GK" && p.id !== playerId
          );

          if (otherGoalkeepers.length === 0) {
            warnings.push(
              "⚠️ ATENÇÃO: Este é o único goleiro em campo. Certifique-se de que o substituto seja um goleiro."
            );
          }
        }

        if (player.isCaptain) {
          warnings.push(
            "⚠️ ATENÇÃO: Você está substituindo o capitão do time. A braçadeira será automaticamente transferida."
          );
        }

        const samePositionCount = onFieldPlayers.filter(
          (p) => p.position === player.position
        ).length;

        if (samePositionCount === 1) {
          warnings.push(
            `⚠️ ATENÇÃO: ${player.firstName} é o último ${player.position} em campo. Isso pode desbalancear a formação.`
          );
        }

        return { allowed, warnings };
      }
    );
  }
}
