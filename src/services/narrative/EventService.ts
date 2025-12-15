import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import type { ServiceResult } from "../types/ServiceResults";
import { RandomEngine } from "../../engine/RandomEngine";
import type {
  NarrativeEvent,
  EventTriggerContext,
} from "../../domain/narrative";
import { EventLibrary } from "../../domain/events/EventLibrary";

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
        const EVENT_CHANCE = 15;

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

    const takeoverEvent = EventLibrary.getClubTakeover(context);
    if (takeoverEvent) return takeoverEvent;

    const crisisEvent = EventLibrary.getDressingRoomCrisis(context);
    if (crisisEvent) possibleEvents.push(crisisEvent);

    const interviewEvent = EventLibrary.getMediaInterview(context);
    if (interviewEvent) possibleEvents.push(interviewEvent);

    if (context.budget > 50_000_000) {
      possibleEvents.push({
        id: `fin_surplus_${Date.now()}`,
        title: "Oportunidade de Investimento",
        description: "Com o caixa positivo, o diretor sugere melhorar a base.",
        category: "board",
        importance: "medium",
        date: context.currentDate,
        options: [
          { id: "invest_youth", label: "Investir na Base (-€2M)" },
          { id: "save", label: "Guardar Dinheiro" },
        ],
      });
    }

    if (context.fanSatisfaction < 30) {
      possibleEvents.push({
        id: `fan_protest_${Date.now()}`,
        title: "Protesto da Torcida",
        description: "Torcedores protestam no CT contra a má fase.",
        category: "fan",
        importance: "critical",
        date: context.currentDate,
      });
    }

    if (possibleEvents.length === 0) return null;

    return RandomEngine.pickOne(possibleEvents);
  }

  /**
   * Processa a escolha do jogador frente a um evento.
   * Aplica os efeitos (mudança de moral, dinheiro, reputação) baseados na opção.
   */
  async processEventResponse(
    eventId: string,
    optionId: string,
    teamId: number
  ): Promise<ServiceResult<string>> {
    return this.execute(
      "processEventResponse",
      { eventId, optionId },
      async () => {
        this.logger.info(
          `Processando resposta evento ${eventId}: opção ${optionId}`
        );

        const team = await this.repos.teams.findById(teamId);
        if (!team) throw new Error("Time não encontrado.");

        let effectMessage = "Nenhum efeito imediato.";

        if (optionId === "crisis_meeting") {
          const players = await this.repos.players.findByTeamId(teamId);
          const updates = players.map((p) => ({
            id: p.id,
            energy: Math.max(0, p.energy - 10),
            fitness: p.fitness,
            moral: Math.min(100, p.moral + 15),
          }));
          await this.repos.players.updateDailyStatsBatch(updates);
          effectMessage =
            "A reunião foi produtiva. A moral subiu (+15), mas o time perdeu energia de treino.";
        } else if (optionId === "crisis_hardline") {
          const players = await this.repos.players.findByTeamId(teamId);
          const updates = players.map((p) => ({
            id: p.id,
            energy: p.energy,
            fitness: Math.min(100, p.fitness + 5),
            moral: Math.max(0, p.moral - 5),
          }));
          await this.repos.players.updateDailyStatsBatch(updates);
          effectMessage =
            "Alguns jogadores reclamaram da cobrança (-5 Moral), mas o foco físico melhorou.";
        } else if (optionId === "crisis_ignore") {
          effectMessage = "Você ignorou o problema. O clima continua tenso.";
        } else if (optionId === "media_praise_players") {
          const players = await this.repos.players.findByTeamId(teamId);
          const updates = players.map((p) => ({
            id: p.id,
            energy: p.energy,
            fitness: p.fitness,
            moral: Math.min(100, p.moral + 5),
          }));
          await this.repos.players.updateDailyStatsBatch(updates);
          await this.repos.teams.update(teamId, {
            reputation: (team.reputation || 0) + 20,
          });
          effectMessage =
            "O elenco gostou da proteção pública (+5 Moral). Reputação subiu levemente.";
        } else if (optionId === "media_promise_title") {
          await this.repos.teams.update(teamId, {
            fanSatisfaction: Math.min(100, (team.fanSatisfaction || 0) + 10),
          });
          effectMessage =
            "A torcida está eufórica com a promessa! (+10 Satisfação). Não os decepcione.";
        } else if (optionId === "takeover_welcome") {
          const injection = 50_000_000;
          await this.repos.teams.updateBudget(
            teamId,
            (team.budget || 0) + injection
          );
          await this.repos.financial.addRecord({
            teamId,
            amount: injection,
            category: "sponsors",
            type: "income",
            seasonId: 1,
            date: new Date().toISOString().split("T")[0],
            description: "Injeção de Capital (Novos Donos)",
          });
          effectMessage =
            "O negócio foi fechado! €50.000.000 foram adicionados ao orçamento.";
        } else if (optionId === "takeover_cautious") {
          await this.repos.teams.update(teamId, {
            fanSatisfaction: (team.fanSatisfaction || 0) + 5,
          });
          effectMessage =
            "A torcida respeita sua postura de proteger a tradição do clube.";
        } else if (optionId === "invest_youth") {
          const investCost = 2000000;
          if (team.budget >= investCost) {
            await this.repos.teams.updateBudget(
              teamId,
              team.budget - investCost
            );
            await this.repos.teams.update(teamId, {
              youthAcademyQuality: Math.min(
                100,
                (team.youthAcademyQuality || 0) + 5
              ),
            });
            effectMessage =
              "Investimento realizado na base (+5 Qualidade Base, -€2M).";
          } else {
            effectMessage = "Saldo insuficiente para o investimento.";
          }
        } else if (optionId === "save") {
          effectMessage = "Dinheiro mantido em caixa.";
        }

        return effectMessage;
      }
    );
  }
}
