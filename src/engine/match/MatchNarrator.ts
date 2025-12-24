import { MatchEventType } from "../../domain/enums";
import type { Player, Team } from "../../domain/models";

export interface NarratorContext {
  player?: Player;
  team?: Team;
  opponent?: Team;
  minute?: number;
  score?: { home: number; away: number };
  isHomeTeam?: boolean;
  additionalInfo?: Record<string, any>;
}

export class MatchNarrator {
  static getEventDescription(
    type: MatchEventType | string,
    context: NarratorContext = {}
  ): string {
    const { player, team, opponent, score, additionalInfo } = context;

    switch (type) {
      case MatchEventType.GOAL:
        return this.narrateGoal(player, team);

      case MatchEventType.ASSIST:
        return this.narrateAssist(player);

      case MatchEventType.SAVE:
        return this.narrateSave(player);

      case MatchEventType.SHOT:
        return this.narrateShot(player, additionalInfo?.outcome);

      case MatchEventType.YELLOW_CARD:
        return this.narrateYellowCard(player);

      case MatchEventType.RED_CARD:
        return this.narrateRedCard(player);

      case MatchEventType.INJURY:
        return this.narrateInjury(player);

      case MatchEventType.FOUL:
        return this.narrateFoul(player);

      case MatchEventType.CORNER:
        return this.narrateCorner(team);

      case MatchEventType.OFFSIDE:
        return this.narrateOffside(player);

      case MatchEventType.VAR_CHECK:
        return this.narrateVAR(additionalInfo?.result);

      case MatchEventType.PENALTY:
        return this.narratePenalty(player, team, additionalInfo?.converted);

      case MatchEventType.PENALTY_SHOOTOUT:
        return this.narratePenaltyShootout(additionalInfo);

      case MatchEventType.FINISHED:
        return this.narrateMatchEnd(team, opponent, score);

      case MatchEventType.SUBSTITUTION:
        return this.narrateSubstitution(
          additionalInfo?.playerOut,
          additionalInfo?.playerIn
        );

      default:
        return `⚽ Evento: ${type}`;
    }
  }

  private static narrateGoal(player?: Player, team?: Team): string {
    if (!player) return "⚽ GOOOL!";

    const playerName = `${player.firstName} ${player.lastName}`;

    const celebrations = [
      `⚽ GOOOL! ${playerName} marca para o ${team?.shortName || "time"}!`,
      `⚽ É DELE! ${playerName} balança as redes para o ${
        team?.shortName || "time"
      }!`,
      `⚽ QUE GOLAÇO! ${playerName} abre o placar para o ${
        team?.shortName || "time"
      }!`,
      `⚽ FANTÁSTICO! ${playerName} coloca no ângulo para o ${
        team?.shortName || "time"
      }!`,
      `⚽ NÃO DÁ PRA ACREDITAR! ${playerName} faz um golaço para o ${
        team?.shortName || "time"
      }!`,
    ];

    return celebrations[Math.floor(Math.random() * celebrations.length)];
  }

  private static narrateAssist(player?: Player): string {
    if (!player) return "🎯 Assistência!";

    return `🎯 Passe perfeito de ${player.firstName} para o gol!`;
  }

  private static narrateSave(player?: Player): string {
    if (!player) return "🧤 Grande defesa do goleiro!";

    const saves = [
      `🧤 Grande defesa de ${player.firstName}!`,
      `🧤 INCRÍVEL! ${player.firstName} salva o time!`,
      `🧤 ${player.firstName} fecha o gol!`,
      `🧤 Defesaça de ${player.firstName}!`,
    ];

    return saves[Math.floor(Math.random() * saves.length)];
  }

  private static narrateShot(player?: Player, outcome?: string): string {
    if (!player) return "📉 Chute para fora.";

    if (outcome === "miss") {
      return `📉 ${player.firstName} chuta para fora.`;
    }

    if (outcome === "blocked") {
      return `🚫 Chute de ${player.firstName} bloqueado pela defesa!`;
    }

    return `⚽ ${player.firstName} arrisca de longe!`;
  }

  private static narrateYellowCard(player?: Player): string {
    if (!player) return "🟨 Cartão amarelo!";

    return `🟨 Cartão amarelo para ${player.firstName} ${player.lastName}!`;
  }

  private static narrateRedCard(player?: Player): string {
    if (!player) return "🟥 EXPULSÃO!";

    return `🟥 EXPULSÃO! ${player.firstName} ${player.lastName} está fora do jogo!`;
  }

  private static narrateInjury(player?: Player): string {
    if (!player) return "🩹 Jogador lesionado.";

    return `🩹 ${player.firstName} ${player.lastName} sente uma lesão e precisa de atendimento médico.`;
  }

  private static narrateFoul(player?: Player): string {
    if (!player) return "🟨 Falta cometida.";

    return `🟨 Falta cometida por ${player.firstName} ${player.lastName}.`;
  }

  private static narrateCorner(team?: Team): string {
    if (!team) return "🚩 Escanteio!";

    return `🚩 Escanteio para o ${team.shortName}.`;
  }

  private static narrateOffside(player?: Player): string {
    if (!player) return "🚫 Impedimento!";

    return `🚫 Impedimento! ${player.firstName} estava em posição irregular.`;
  }

  private static narrateVAR(result?: string): string {
    if (result === "overturned") {
      return "❌ GOL ANULADO! O VAR identificou irregularidade.";
    }

    if (result === "confirmed") {
      return "✅ Gol confirmado após revisão do VAR.";
    }

    return "🖥️ VAR em ação! Analisando possível irregularidade...";
  }

  private static narratePenalty(
    player?: Player,
    team?: Team,
    converted?: boolean
  ): string {
    if (converted === true) {
      return `⚽ GOOOOL DE PÊNALTI! ${
        player?.firstName || "Jogador"
      } converte!`;
    }

    if (converted === false) {
      return `❌ PERDEU! ${
        player?.firstName || "Jogador"
      } desperdiça o pênalti!`;
    }

    return `⚠️ PÊNALTI para o ${team?.shortName || "time"}!`;
  }

  private static narratePenaltyShootout(info?: Record<string, any>): string {
    if (info?.round) {
      return `🥅 Disputa de Pênaltis - Rodada ${info.round}: ${
        info.homeScore || 0
      }-${info.awayScore || 0}`;
    }

    return "🥅 DISPUTA DE PÊNALTIS! A decisão será nos pênaltis.";
  }

  private static narrateMatchEnd(
    homeTeam?: Team,
    awayTeam?: Team,
    score?: { home: number; away: number }
  ): string {
    if (!homeTeam || !awayTeam || !score) {
      return "🏁 FIM DE JOGO!";
    }

    return `🏁 FIM DE JOGO! ${homeTeam.shortName} ${score.home} x ${score.away} ${awayTeam.shortName}`;
  }

  private static narrateSubstitution(
    playerOut?: Player,
    playerIn?: Player
  ): string {
    if (!playerOut || !playerIn) return "🔄 Substituição.";

    return `🔄 Substituição: Sai ${playerOut.firstName}, entra ${playerIn.firstName}.`;
  }

  static narrateKickOff(homeTeam: Team, awayTeam: Team): string {
    return `⚽ A partida começou! ${homeTeam.shortName} vs ${awayTeam.shortName}`;
  }

  static narrateExtraTime(): string {
    return "⏰ PRORROGAÇÃO! A partida vai para os 30 minutos extras.";
  }

  static narrateCustom(template: string, context: Record<string, any>): string {
    let result = template;

    Object.entries(context).forEach(([key, value]) => {
      result = result.replace(`{${key}}`, String(value));
    });

    return result;
  }
}
