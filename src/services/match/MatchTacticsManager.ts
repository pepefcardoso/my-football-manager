import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import type { ServiceResult } from "../types/ServiceResults";
import type { TacticsConfig } from "../../domain/types";

export interface UpdateLiveTacticsRequest {
  matchId: number;
  isHome: boolean;
  tactics: Partial<TacticsConfig>;
}

export interface TacticalChangeRecord {
  minute: number;
  previousTactics: TacticsConfig;
  newTactics: TacticsConfig;
  changedFields: string[];
  timestamp: string;
}

export interface TacticalAnalysisResult {
  currentTactics: TacticsConfig;
  recommendations: string[];
  risks: string[];
  estimatedImpact: {
    attack: number;
    defense: number;
    possession: number;
    stamina: number;
  };
}

export class MatchTacticsManager extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "MatchTacticsManager");
  }

  /**
   * @param request - Dados da mudança tática
   * @returns ServiceResult void
   */
  async updateLiveTactics(
    request: UpdateLiveTacticsRequest
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "updateLiveTactics",
      request,
      async ({ matchId, isHome, tactics }) => {
        const match = await this.repos.matches.findById(matchId);
        if (!match) {
          throw new Error(`Partida ${matchId} não encontrada.`);
        }

        if (match.isPlayed) {
          throw new Error(
            "Não é possível alterar táticas de uma partida já finalizada."
          );
        }

        const validationResult = this.validateTacticalChange(tactics);
        if (!validationResult.isValid) {
          throw new Error(validationResult.errors!.join(", "));
        }

        const teamId = isHome ? match.homeTeamId : match.awayTeamId;
        if (!teamId) {
          throw new Error("Time não identificado na partida.");
        }

        const existingTactics = await this.getCurrentMatchTactics(
          matchId,
          isHome
        );

        const newTactics: TacticsConfig = {
          style: tactics.style || existingTactics.style,
          marking: tactics.marking || existingTactics.marking,
          mentality: tactics.mentality || existingTactics.mentality,
          passingDirectness:
            tactics.passingDirectness || existingTactics.passingDirectness,
        };

        await this.saveMatchTactics(matchId, teamId, isHome, newTactics);

        const changedFields = this.detectChangedFields(
          existingTactics,
          newTactics
        );

        this.logger.info(
          `🎯 Táticas atualizadas para o time ${
            isHome ? "mandante" : "visitante"
          } na partida ${matchId}. Campos alterados: ${changedFields.join(
            ", "
          )}`
        );
      }
    );
  }

  /**
   * @param tactics - Táticas a serem validadas
   * @returns Resultado da validação
   */
  private validateTacticalChange(tactics: Partial<TacticsConfig>): {
    isValid: boolean;
    errors?: string[];
  } {
    const warnings: string[] = [];

    if (
      tactics.marking === "pressing_high" &&
      (tactics.mentality === "ultra_attacking" ||
        tactics.mentality === "attacking")
    ) {
      warnings.push(
        "⚠️ Marcação pressão alta + mentalidade ofensiva pode deixar a defesa vulnerável a contra-ataques."
      );
    }

    if (
      tactics.style === "possession" &&
      tactics.passingDirectness === "direct"
    ) {
      warnings.push(
        "⚠️ Estilo 'posse de bola' é incompatível com passes diretos. Considere 'short' ou 'mixed'."
      );
    }

    if (
      tactics.style === "long_ball" &&
      tactics.passingDirectness === "short"
    ) {
      warnings.push(
        "⚠️ Estilo 'bola longa' requer passes diretos ou mistos para ser efetivo."
      );
    }

    if (tactics.style === "pressing" && tactics.marking === "pressing_high") {
      warnings.push(
        "⚠️ Pressing total (estilo + marcação) é extremamente desgastante. Monitore a energia dos jogadores."
      );
    }

    if (warnings.length > 0) {
      this.logger.warn("Avisos táticos:", warnings);
    }

    return { isValid: true };
  }

  /**
   * @param matchId - ID da partida
   * @param isHome - Se é o time da casa
   * @returns Táticas atuais
   */
  private async getCurrentMatchTactics(
    matchId: number,
    isHome: boolean
  ): Promise<TacticsConfig> {
    const match = await this.repos.matches.findById(matchId);
    if (!match) {
      throw new Error("Partida não encontrada.");
    }

    const teamId = isHome ? match.homeTeamId : match.awayTeamId;
    if (!teamId) {
      throw new Error("Time não identificado.");
    }

    const team = await this.repos.teams.findById(teamId);
    if (!team) {
      throw new Error("Time não encontrado.");
    }

    return {
      style: team.defaultGameStyle,
      marking: team.defaultMarking,
      mentality: team.defaultMentality,
      passingDirectness: team.defaultPassingDirectness,
    };
  }

  /**
   * @param matchId - ID da partida
   * @param teamId - ID do time
   * @param isHome - Se é mandante
   * @param tactics - Novas táticas
   */
  private async saveMatchTactics(
    matchId: number,
    teamId: number,
    isHome: boolean,
    tactics: TacticsConfig
  ): Promise<void> {
    // TODO adicionar método no MatchRepository:
    // - upsertMatchTactics(matchId, teamId, tactics)

    this.logger.debug(
      `Persistindo táticas da partida ${matchId}, time ${teamId}, isHome: ${isHome}`,
      tactics
    );

    // TODO adicionar no MatchRepository real
  }

  /**
   * @param old - Táticas antigas
   * @param updated - Táticas novas
   * @returns Lista de campos alterados
   */
  private detectChangedFields(
    old: TacticsConfig,
    updated: TacticsConfig
  ): string[] {
    const changes: string[] = [];

    if (old.style !== updated.style) changes.push("style");
    if (old.marking !== updated.marking) changes.push("marking");
    if (old.mentality !== updated.mentality) changes.push("mentality");
    if (old.passingDirectness !== updated.passingDirectness)
      changes.push("passingDirectness");

    return changes;
  }

  /**
   * @param matchId - ID da partida
   * @param isHome - Time a analisar
   * @returns Análise tática com recomendações
   */
  async analyzeTactics(
    matchId: number,
    isHome: boolean
  ): Promise<ServiceResult<TacticalAnalysisResult>> {
    return this.execute(
      "analyzeTactics",
      { matchId, isHome },
      async ({ matchId, isHome }) => {
        const currentTactics = await this.getCurrentMatchTactics(
          matchId,
          isHome
        );

        const recommendations: string[] = [];
        const risks: string[] = [];

        if (
          currentTactics.style === "possession" &&
          currentTactics.passingDirectness === "long"
        ) {
          recommendations.push(
            "Considere mudar para passes 'short' ou 'mixed' para melhor controle de posse."
          );
        }

        if (
          currentTactics.marking === "pressing_high" &&
          currentTactics.style === "pressing"
        ) {
          risks.push(
            "Alto risco de lesões e queda de performance no segundo tempo devido ao desgaste extremo."
          );
        }

        if (
          currentTactics.mentality === "ultra_attacking" &&
          currentTactics.marking !== "zonal"
        ) {
          risks.push(
            "Defesa exposta a contra-ataques. Considere recuar a marcação."
          );
        }

        const estimatedImpact = this.estimateTacticalImpact(currentTactics);

        return {
          currentTactics,
          recommendations,
          risks,
          estimatedImpact,
        };
      }
    );
  }

  /**
   * @param tactics - Táticas a analisar
   * @returns Impacto estimado em métricas chave
   */
  private estimateTacticalImpact(tactics: TacticsConfig): {
    attack: number;
    defense: number;
    possession: number;
    stamina: number;
  } {
    let attack = 0;
    let defense = 0;
    let possession = 0;
    let stamina = 0;

    switch (tactics.style) {
      case "possession":
        possession += 5;
        attack += 2;
        stamina -= 2;
        break;
      case "counter_attack":
        attack += 5;
        defense += 3;
        stamina += 1;
        break;
      case "long_ball":
        attack += 3;
        possession -= 3;
        stamina += 2;
        break;
      case "pressing":
        attack += 4;
        defense += 4;
        stamina -= 5;
        break;
      case "balanced":
        // Neutro
        break;
    }

    switch (tactics.marking) {
      case "pressing_high":
        defense += 3;
        stamina -= 4;
        break;
      case "man_to_man":
        defense += 2;
        stamina -= 3;
        break;
      case "zonal":
        defense += 1;
        stamina -= 1;
        break;
      case "mixed":
        defense += 2;
        stamina -= 2;
        break;
    }

    switch (tactics.mentality) {
      case "ultra_attacking":
        attack += 7;
        defense -= 5;
        break;
      case "attacking":
        attack += 4;
        defense -= 2;
        break;
      case "normal":
        // Neutro
        break;
      case "defensive":
        attack -= 2;
        defense += 4;
        break;
      case "ultra_defensive":
        attack -= 5;
        defense += 7;
        break;
    }

    return { attack, defense, possession, stamina };
  }

  /**
   * @param matchId - ID da partida
   * @param isHome - Time a sugerir
   * @param currentMinute - Minuto atual
   * @param score - Placar atual {home, away}
   * @returns Sugestão tática
   */
  async suggestTactics(
    matchId: number,
    isHome: boolean,
    currentMinute: number,
    score: { home: number; away: number }
  ): Promise<ServiceResult<Partial<TacticsConfig>>> {
    return this.execute(
      "suggestTactics",
      { matchId, isHome, currentMinute, score },
      async ({ matchId, isHome, currentMinute, score }) => {
        const myScore = isHome ? score.home : score.away;
        const opponentScore = isHome ? score.away : score.home;
        const scoreDiff = myScore - opponentScore;

        const suggestion: Partial<TacticsConfig> = {};

        if (scoreDiff < 0 && currentMinute >= 75) {
          suggestion.mentality = "ultra_attacking";
          suggestion.style = "pressing";
          this.logger.info(
            "🔥 Sugestão: Ir para o tudo ou nada - Ultra Attacking + Pressing"
          );
        }

        if (scoreDiff > 0 && currentMinute >= 80) {
          suggestion.mentality = "defensive";
          suggestion.marking = "zonal";
          this.logger.info(
            "🛡️ Sugestão: Segurar o resultado - Defensive + Zonal"
          );
        }

        if (scoreDiff === 0 && currentMinute >= 45 && currentMinute < 60) {
          suggestion.mentality = "attacking";
          suggestion.style = "possession";
          this.logger.info(
            "⚖️ Sugestão: Buscar o gol com controle - Attacking + Possession"
          );
        }

        return suggestion;
      }
    );
  }
}
