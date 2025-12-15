import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import type { ServiceResult } from "../types/ServiceResults";
import { RandomEngine } from "../../engine/RandomEngine";
import type {
  NarrativeEvent,
  EventTriggerContext,
} from "../../domain/narrative";

export class EventService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "EventService");
  }

  /**
   * Avalia o estado atual do clube e decide se um evento narrativo deve ocorrer.
   * Deve ser chamado uma vez por dia durante o processamento diário.
   */
  async generateDailyEvent(
    teamId: number,
    currentDate: string
  ): Promise<ServiceResult<NarrativeEvent | null>> {
    return this.execute(
      "generateDailyEvent",
      { teamId, currentDate },
      async () => {
        const EVENT_CHANCE = 5;

        if (!RandomEngine.chance(EVENT_CHANCE)) {
          return null;
        }

        const context = await this.buildContext(teamId, currentDate);
        if (!context) return null;

        const event = this.selectRandomEvent(context);

        if (event) {
          this.logger.info(`Evento gerado para time ${teamId}: ${event.title}`);
        }

        return event;
      }
    );
  }

  private async buildContext(
    teamId: number,
    currentDate: string
  ): Promise<EventTriggerContext | null> {
    const team = await this.repos.teams.findById(teamId);
    if (!team) return null;

    const players = await this.repos.players.findByTeamId(teamId);
    const avgMorale =
      players.length > 0
        ? players.reduce((sum, p) => sum + p.moral, 0) / players.length
        : 50;

    // TODO: Buscar posição na liga (requer query complexa ou cache)

    return {
      teamId,
      currentDate,
      budget: team.budget || 0,
      fanSatisfaction: team.fanSatisfaction || 50,
      teamReputation: team.reputation || 0,
      averageMorale: avgMorale,
    };
  }

  private selectRandomEvent(
    context: EventTriggerContext
  ): NarrativeEvent | null {
    const possibleEvents: NarrativeEvent[] = [];

    if (context.budget < 0) {
      possibleEvents.push({
        id: `fin_crisis_${Date.now()}`,
        title: "Crise Financeira",
        description:
          "O conselho está preocupado com as dívidas recentes. Precisamos cortar gastos imediatamente.",
        category: "board",
        importance: "high",
        date: context.currentDate,
        options: [
          { id: "acknowledge", label: "Entendido, vou vender jogadores." },
          { id: "ignore", label: "Os resultados em campo pagarão as contas." },
        ],
      });
    }

    if (context.budget > 50_000_000) {
      possibleEvents.push({
        id: `fin_surplus_${Date.now()}`,
        title: "Oportunidade de Investimento",
        description:
          "Com o caixa positivo, o diretor de futebol sugere melhorar as instalações da base.",
        category: "board",
        importance: "medium",
        date: context.currentDate,
        options: [
          { id: "invest_youth", label: "Investir na Base" },
          { id: "save", label: "Guardar para transferências" },
        ],
      });
    }

    if (context.fanSatisfaction < 30) {
      possibleEvents.push({
        id: `fan_protest_${Date.now()}`,
        title: "Protesto da Torcida",
        description:
          "Um grupo de torcedores organizados está protestando em frente ao CT contra a má gestão.",
        category: "fan",
        importance: "critical",
        date: context.currentDate,
      });
    } else if (context.fanSatisfaction > 80) {
      possibleEvents.push({
        id: `fan_praise_${Date.now()}`,
        title: "Elogios nas Redes Sociais",
        description:
          "A torcida está eufórica com o desempenho recente do time. A venda de camisas aumentou.",
        category: "fan",
        importance: "low",
        date: context.currentDate,
      });
    }

    if (context.averageMorale < 40) {
      possibleEvents.push({
        id: `player_unrest_${Date.now()}`,
        title: "Clima Tenso no Vestiário",
        description:
          "Alguns líderes do elenco questionam seus métodos de treinamento.",
        category: "player",
        importance: "high",
        date: context.currentDate,
        options: [
          { id: "meeting", label: "Convocar reunião de time" },
          { id: "discipline", label: "Exigir profissionalismo" },
        ],
      });
    }

    possibleEvents.push({
      id: `media_interview_${Date.now()}`,
      title: "Solicitação de Entrevista",
      description:
        "Um jornal local gostaria de fazer uma matéria sobre sua filosofia de jogo.",
      category: "media",
      importance: "low",
      date: context.currentDate,
      options: [
        { id: "accept", label: "Aceitar (+Reputação)" },
        { id: "decline", label: "Recusar (Focar no trabalho)" },
      ],
    });

    possibleEvents.push({
      id: `sponsor_event_${Date.now()}`,
      title: "Evento do Patrocinador",
      description:
        "O patrocinador master exige a presença de alguns jogadores em um evento comercial.",
      category: "sponsor",
      importance: "low",
      date: context.currentDate,
      options: [
        { id: "send_reserves", label: "Enviar reservas" },
        { id: "send_stars", label: "Enviar estrelas (-Energia, +Receita)" },
      ],
    });

    if (possibleEvents.length === 0) return null;

    return RandomEngine.pickOne(possibleEvents);
  }
}
